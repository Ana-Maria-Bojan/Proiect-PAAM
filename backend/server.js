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

// Routes
app.get('/', (req, res) => {
  res.send('Backend API is running');
});

// Get all events
app.get('/api/events', async (req, res) => {
  try {
    const events = await Event.find();
    res.json(events);
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
      contactEmail,
      contactPhone,
      maxAttendees,
      currentAttendees,
      tags,
      website,
    } = req.body;

    // Validate required fields (imaginea NU mai este obligatorie)
    if (!title || !location || !date || !month || !time || !price || !category) {
      return res.status(400).json({ message: 'Toate câmpurile obligatorii trebuie completate' });
    }

    // Check if event with same title already exists
    const existingEvent = await Event.findOne({ title });
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
      contactEmail: contactEmail || '',
      contactPhone: contactPhone || '',
      maxAttendees: maxAttendees || 0,
      currentAttendees: currentAttendees || 0,
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

// Get events by category
app.get('/api/events/:category', async (req, res) => {
  try {
    const events = await Event.find({ category: req.params.category });
    res.json(events);
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

// Seed database (temporary route to populate data)
app.post('/api/seed', async (req, res) => {
  try {
    await Event.deleteMany({});
    
    const EVENTS_DATA = {
      'Fluxul meu': [
        {
          title: 'Festivalul JazzTM',
          location: 'Piața Victoriei, Timișoara',
          date: '05',
          month: 'Iul',
          time: '19:00',
          price: 'Gratuit',
          image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        },
        {
          title: 'Teatru în Parc',
          location: 'Parcul Rozelor, Timișoara',
          date: '12',
          month: 'Aug',
          time: '20:30',
          price: '30 RON',
          image: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        },
        {
          title: 'Street Food Festival',
          location: 'Iulius Town, Timișoara',
          date: '15',
          month: 'Aug',
          time: '12:00',
          price: 'Gratuit',
          image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        },
      ],
      'Festival': [
        {
          title: 'Flight Festival',
          location: 'Aerodrom Cioca, Timișoara',
          date: '26',
          month: 'Aug',
          time: '16:00',
          price: '250 RON',
          image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        },
        {
          title: 'Codru Festival',
          location: 'Pădurea Bistra, Timișoara',
          date: '25',
          month: 'Aug',
          time: '14:00',
          price: '200 RON',
          image: 'https://images.unsplash.com/photo-1533174072545-e8d4aa97d848?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        },
        {
          title: 'Plai Festival',
          location: 'Muzeul Satului, Timișoara',
          date: '10',
          month: 'Sep',
          time: '10:00',
          price: '150 RON',
          image: 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        },
      ],
      'Concerte': [
        {
          title: 'Concert Filarmonică',
          location: 'Sala Capitol, Timișoara',
          date: '10',
          month: 'Sep',
          time: '19:00',
          price: '50 RON',
          image: 'https://images.unsplash.com/photo-1465847899078-b413929f7120?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        },
        {
          title: 'Rock la Casă',
          location: 'Casa Tineretului, Timișoara',
          date: '15',
          month: 'Sep',
          time: '20:00',
          price: '40 RON',
          image: 'https://images.unsplash.com/photo-1459749411177-29432dc29afa?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        },
        {
          title: 'Piano Night',
          location: 'Sala Barocă, Timișoara',
          date: '20',
          month: 'Sep',
          time: '18:30',
          price: '60 RON',
          image: 'https://images.unsplash.com/photo-1552422535-c45813c61732?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        },
      ],
      'Teatru': [
        {
          title: 'O noapte furtunoasă',
          location: 'Teatrul Național, Timișoara',
          date: '20',
          month: 'Sep',
          time: '19:00',
          price: '60 RON',
          image: 'https://images.unsplash.com/photo-1507676184212-d03ab07a11d0?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        },
        {
          title: 'Impro Show',
          location: 'Scârț Loc Lejer, Timișoara',
          date: '22',
          month: 'Sep',
          time: '21:00',
          price: '35 RON',
          image: 'https://images.unsplash.com/photo-1503095392237-59855b70af76?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        },
        {
          title: 'Lacul Lebedelor',
          location: 'Opera Națională, Timișoara',
          date: '01',
          month: 'Oct',
          time: '18:30',
          price: '100 RON',
          image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        },
      ],
      'Sport': [
        {
          title: 'Meci Poli Timișoara',
          location: 'Stadion Dan Păltinișanu',
          date: '30',
          month: 'Sep',
          time: '17:00',
          price: '20 RON',
          image: 'https://images.unsplash.com/photo-1504454136457-1d2395baefbe?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        },
        {
          title: 'Maraton Timișoara',
          location: 'Piața Libertății, Timișoara',
          date: '02',
          month: 'Oct',
          time: '08:00',
          price: '100 RON',
          image: 'https://images.unsplash.com/photo-1552674605-46d536d2f6d1?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        },
        {
          title: 'Cupa de Tenis',
          location: 'Baza Sportivă 2',
          date: '05',
          month: 'Oct',
          time: '10:00',
          price: 'Gratuit',
          image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        },
      ],
    };

    const events = [];
    for (const [category, categoryEvents] of Object.entries(EVENTS_DATA)) {
      categoryEvents.forEach(event => {
        events.push({ 
          ...event, 
          category,
          description: event.description || `Vino și descoperă o experiență unică la ${event.title}! Acest eveniment promite să fie memorabil cu activități interactive, muzică live și multe surprize. Bucură-te de o atmosferă specială în centrul Timișoarei!`,
          organizer: event.organizer || 'Events Team Timișoara',
          contactEmail: event.contactEmail || 'contact@eventstm.ro',
          contactPhone: event.contactPhone || '+40 256 123 456',
          maxAttendees: event.maxAttendees || Math.floor(Math.random() * 500) + 100,
          currentAttendees: event.currentAttendees || Math.floor(Math.random() * 200),
          tags: event.tags || ['Timișoara', 'Entertainment', category],
          website: event.website || 'https://www.eventstimisoara.ro',
        });
      });
    }

    await Event.insertMany(events);
    res.json({ message: 'Database seeded successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
