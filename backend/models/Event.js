const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  location: { type: String, required: true },
  date: { type: String, required: true },
  month: { type: String, required: true },
  time: { type: String, required: true },
  price: { type: String, required: true },
  image: { type: String, required: true },
  category: { type: String, required: true }, // 'Fluxul meu', 'Festival', 'Concerte', etc.
});

module.exports = mongoose.model('Event', EventSchema);
