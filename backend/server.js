const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

const Event = require('./models/Event');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const cheerio = require('cheerio');
const { chatWithEvents } = require('./gemini-helper');

// Map cod lună -> index numeric (acceptă atât EN cât și RO, capitalizat sau nu)
const MONTH_INDEX = {
  jan: 0, ian: 0, ianuarie: 0,
  feb: 1, februarie: 1,
  mar: 2, martie: 2,
  apr: 3, aprilie: 3,
  may: 4, mai: 4,
  jun: 5, iun: 5, iunie: 5,
  jul: 6, iul: 6, iulie: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, septembrie: 8,
  oct: 9, octombrie: 9,
  nov: 10, noiembrie: 10,
  dec: 11, decembrie: 11,
};

const isEventInFuture = (evt) => {
  const monthKey = (evt.month || '').toLowerCase().replace(/\./g, '').trim();
  const mIdx = MONTH_INDEX[monthKey];
  if (mIdx === undefined) return true; // dacă nu putem parsa luna, includem (safer)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = parseInt(evt.date) || 1;
  const eventDate = new Date(today.getFullYear(), mIdx, day);
  return eventDate >= today;
};

// Routes
app.get('/', (req, res) => {
  res.send('Backend API is running');
});

// Get all events (filtrate – doar cele care urmează)
app.get('/api/events', async (req, res) => {
  try {
    const allEvents = await Event.find();
    const futureEvents = allEvents.filter(isEventInFuture);
    res.json(futureEvents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Șterge din DB toate evenimentele cu data în trecut.
// Idempotent – e safe de apelat de oricâte ori.
app.delete('/api/events/cleanup', async (req, res) => {
  try {
    const allEvents = await Event.find();
    const pastIds = allEvents.filter(e => !isEventInFuture(e)).map(e => e._id);
    if (pastIds.length > 0) {
      await Event.deleteMany({ _id: { $in: pastIds } });
    }
    res.json({ deleted: pastIds.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Curăță imaginile duplicate / generice. Dacă același URL apare la ≥2 evenimente,
// păstrăm imaginea doar la primul, iar restul primesc image='' (evenimentele rămân).
const isGenericImageURL = (url) => {
  if (!url) return true;
  const u = url.toLowerCase();
  return /\blogo\b|\bbanner\b|header|cover[-_]default|cover[-_]image|placeholder|via\.placeholder|no[-_]image|noimage|sprite|favicon|icon[-_]|default[-_]event|default\.(jpg|png|svg|webp)|loading\.gif/.test(u)
    || u.endsWith('.svg')
    || /\b(50x50|100x100|150x150|32x32|16x16)\b/.test(u);
};

app.delete('/api/events/cleanup-images', async (req, res) => {
  try {
    const all = await Event.find({ image: { $exists: true, $ne: '' } });
    const map = {};
    for (const e of all) {
      if (!map[e.image]) map[e.image] = [];
      map[e.image].push(e._id);
    }
    let cleared = 0;
    for (const [img, ids] of Object.entries(map)) {
      if (isGenericImageURL(img)) {
        await Event.updateMany({ _id: { $in: ids } }, { $set: { image: '' } });
        cleared += ids.length;
      } else if (ids.length > 1) {
        const toUpdate = ids.slice(1);
        await Event.updateMany({ _id: { $in: toUpdate } }, { $set: { image: '' } });
        cleared += toUpdate.length;
      }
    }
    res.json({ cleared });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Helper: descarcă pagina și extrage o descriere scurtă
const fetchEventDescription = async (url) => {
  if (!url || !/^https?:\/\//i.test(url)) return '';
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ro-RO,ro;q=0.9,en-US;q=0.8',
      },
      timeout: 8000,
      maxRedirects: 5,
    });
    const $ = cheerio.load(data);
    const clean = (t) => (t || '').replace(/\s+/g, ' ').replace(/\b(read more|citeste mai mult|vezi mai mult|cumpara bilet|cumpără bilet)\.{0,3}/gi, '').trim();
    const truncate = (t, max = 400) => {
      if (!t || t.length <= max) return t;
      const cut = t.substring(0, max);
      const sp = cut.lastIndexOf(' ');
      return (sp > max * 0.7 ? cut.substring(0, sp) : cut) + '...';
    };

    let desc = clean(
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') || ''
    );
    if (desc.length > 40) return truncate(desc);

    const sels = ['.event-description', '.description', '.entry-content', '.post-content', '.event-content', 'article', 'main', '.tribe-events-single-event-description', '[itemprop="description"]'];
    for (const sel of sels) {
      const container = $(sel).first();
      if (!container.length) continue;
      const paras = [];
      container.find('p').each((i, p) => {
        if (paras.length >= 3) return;
        const t = clean($(p).text());
        if (t.length > 30) paras.push(t);
      });
      if (paras.length > 0) {
        const combined = paras.join(' ');
        if (combined.length > 40) return truncate(combined);
      }
    }
    return '';
  } catch {
    return '';
  }
};

// Completează descrierile lipsă pentru evenimentele cu website salvat
app.post('/api/events/enrich-descriptions', async (req, res) => {
  try {
    const toEnrich = await Event.find({
      website: { $exists: true, $ne: '' },
      $or: [{ description: '' }, { description: { $exists: false } }],
    });

    let updated = 0;
    const concurrency = 5;
    for (let i = 0; i < toEnrich.length; i += concurrency) {
      const batch = toEnrich.slice(i, i + concurrency);
      await Promise.all(batch.map(async (evt) => {
        const d = await fetchEventDescription(evt.website);
        if (d) {
          await Event.updateOne({ _id: evt._id }, { $set: { description: d } });
          updated++;
        }
      }));
    }
    res.json({ total: toEnrich.length, updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new event
app.post('/api/events', async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      date,
      month,
      time,
      price,
      image,
      category,
      organizer,
      tags,
      website,
    } = req.body;

    // Validate required fields (imaginea NU mai este obligatorie)
    if (!title || !location || !date || !month || !time || !price || !category) {
      return res.status(400).json({ message: 'Toate câmpurile obligatorii trebuie completate' });
    }

    // Check if event with same title already exists (case-insensitive)
    const existingEvent = await Event.findOne({
      title: { $regex: new RegExp('^' + title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
    });
    if (existingEvent) {
      return res.status(400).json({ message: 'Există deja un eveniment cu acest titlu' });
    }

    // Create new event
    const newEvent = new Event({
      title,
      description: description || '',
      location,
      date,
      month,
      time,
      price,
      image: image || '',
      category,
      organizer: organizer || '',
      tags: tags || [],
      website: website || '',
    });

    const savedEvent = await newEvent.save();
    res.status(201).json(savedEvent);
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get single event by ID
app.get('/api/event/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Evenimentul nu a fost găsit' });
    }
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get events by category (filtrate – doar cele care urmează)
app.get('/api/events/:category', async (req, res) => {
  try {
    const events = await Event.find({ category: req.params.category });
    res.json(events.filter(isEventInFuture));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// FAVORITE ROUTES

// Get user's favorite events
app.get('/api/favorites/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate('favoriteEvents');
    if (!user) {
      return res.status(404).json({ message: 'Utilizatorul nu a fost găsit' });
    }
    res.json(user.favoriteEvents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add event to favorites
app.post('/api/favorites/:userId/:eventId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilizatorul nu a fost găsit' });
    }

    // Check if event exists
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ message: 'Evenimentul nu a fost găsit' });
    }

    // Check if already in favorites
    if (user.favoriteEvents.includes(req.params.eventId)) {
      return res.status(400).json({ message: 'Evenimentul este deja în favorite' });
    }

    user.favoriteEvents.push(req.params.eventId);
    await user.save();

    res.json({ message: 'Eveniment adăugat la favorite', favoriteEvents: user.favoriteEvents });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Remove event from favorites
app.delete('/api/favorites/:userId/:eventId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilizatorul nu a fost găsit' });
    }

    user.favoriteEvents = user.favoriteEvents.filter(
      id => id.toString() !== req.params.eventId
    );
    await user.save();

    res.json({ message: 'Eveniment șters din favorite', favoriteEvents: user.favoriteEvents });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CHATBOT ROUTE
//
// Pattern RAG: filtrăm evenimentele relevante pe baza mesajului (keyword match
// pe categorie / locație / cuvinte din titlu), apoi trimitem un context compact
// + întrebarea utilizatorului la Gemini, care răspunde natural.

const CATEGORY_KEYWORDS = {
  Sport: ['sport', 'meci', 'fotbal', 'baschet', 'tenis', 'alergare', 'maraton', 'yoga', 'fitness', 'ciclism'],
  Festival: ['festival', 'targ', 'târg', 'fest'],
  Teatru: ['teatru', 'piesa', 'piesă', 'opera', 'operă', 'balet', 'film', 'stand-up', 'standup', 'musical'],
  Concerte: ['concert', 'concerte', 'live', 'dj', 'recital', 'orchestra', 'orchestră', 'simfonie', 'jazz', 'rock', 'muzica', 'muzică'],
  Social: ['atelier', 'workshop', 'networking', 'expozitie', 'expoziție', 'vernisaj', 'lansare', 'petrecere', 'conferinta', 'conferință'],
};

const filterRelevantEvents = (allEvents, message) => {
  const msg = (message || '').toLowerCase();
  if (!msg.trim()) return allEvents.slice(0, 40);

  // 1. Caută categorii menționate în mesaj
  const matchedCategories = [];
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => msg.includes(k))) matchedCategories.push(cat);
  }

  // 2. Filtrare după categorie sau cuvinte din titlu/locație
  const filtered = allEvents.filter(e => {
    const inCategory = matchedCategories.length > 0 && matchedCategories.includes(e.category);
    const titleHit = (e.title || '').toLowerCase().split(/\s+/).some(w => w.length > 3 && msg.includes(w));
    const locHit = (e.location || '').toLowerCase().split(/[\s,]+/).some(w => w.length > 3 && msg.includes(w));
    return inCategory || titleHit || locHit;
  });

  // Dacă filtrul a tăiat prea mult, întoarcem primele 40 ca să avem context
  return filtered.length >= 5 ? filtered.slice(0, 40) : allEvents.slice(0, 40);
};

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: 'Mesaj invalid' });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ message: 'Chatbot indisponibil — API key lipsă pe server.' });
    }

    const allEvents = (await Event.find()).filter(isEventInFuture);
    const relevantEvents = filterRelevantEvents(allEvents, message);

    const reply = await chatWithEvents(message, relevantEvents, Array.isArray(history) ? history : []);
    if (!reply) {
      return res.status(502).json({ message: 'Asistentul nu a putut răspunde. Încearcă din nou.' });
    }
    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ message: err.message });
  }
});

// AUTH ROUTES

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, preferences } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      preferences: preferences || []
    });

    await user.save();

    // Create token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret_key_123', { expiresIn: '1h' });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        preferences: user.preferences
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret_key_123', { expiresIn: '1h' });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        preferences: user.preferences
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
