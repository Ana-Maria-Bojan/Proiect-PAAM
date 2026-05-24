const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  location: { type: String, required: true },
  date: { type: String, required: true },
  month: { type: String, required: true },
  time: { type: String, required: true },
  price: { type: String, required: true },
  image: { type: String, default: '' },
  category: { type: String, required: true }, // 'Fluxul meu', 'Festival', 'Concerte', etc.
  description: { type: String, default: '' },
  organizer: { type: String, default: '' },
  contactEmail: { type: String, default: '' },
  contactPhone: { type: String, default: '' },
  maxAttendees: { type: Number, default: 0 },
  currentAttendees: { type: Number, default: 0 },
  tags: { type: [String], default: [] },
  website: { type: String, default: '' },
  // Vector embedding pentru deduplicare semantică (Gemini gemini-embedding-001 = 3072 dim).
  // select: false → nu e încărcat în queries normale (economie de bandă pentru /api/events)
  embedding: { type: [Number], default: [], select: false },
}, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema);
