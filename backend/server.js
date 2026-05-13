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

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
