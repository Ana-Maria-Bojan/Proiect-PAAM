const mongoose = require('mongoose');
const Event = require('./models/Event');
require('dotenv').config();

const EVENTS_DATA = {
  'Fluxul meu': [
    {
      title: 'Festivalul JazzTM',
      location: 'Piața Victoriei, Timișoara',
      date: '05',
      month: 'Iul',
      time: '19:00',
      price: 'Gratuit',
      image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80',
    },
    {
      title: 'Teatru în Parc',
      location: 'Parcul Rozelor, Timișoara',
      date: '12',
      month: 'Aug',
      time: '20:30',
      price: '30 RON',
      image: 'https://loremflickr.com/400/300/theater,park?lock=2',
    },
    {
      title: 'Street Food Festival',
      location: 'Iulius Town, Timișoara',
      date: '15',
      month: 'Aug',
      time: '12:00',
      price: 'Gratuit',
      image: 'https://loremflickr.com/400/300/streetfood,burger?lock=3',
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
      image: 'https://loremflickr.com/400/300/musicfestival,party?lock=4',
    },
    {
      title: 'Codru Festival',
      location: 'Pădurea Bistra, Timișoara',
      date: '25',
      month: 'Aug',
      time: '14:00',
      price: '200 RON',
      image: 'https://loremflickr.com/400/300/forest,festival?lock=5',
    },
    {
      title: 'Plai Festival',
      location: 'Muzeul Satului, Timișoara',
      date: '10',
      month: 'Sep',
      time: '10:00',
      price: '150 RON',
      image: 'https://loremflickr.com/400/300/art,culture?lock=6',
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
      image: 'https://loremflickr.com/400/300/orchestra,classical?lock=7',
    },
    {
      title: 'Rock la Casă',
      location: 'Casa Tineretului, Timișoara',
      date: '15',
      month: 'Sep',
      time: '20:00',
      price: '40 RON',
      image: 'https://loremflickr.com/400/300/rockband,concert?lock=8',
    },
    {
      title: 'Piano Night',
      location: 'Sala Barocă, Timișoara',
      date: '20',
      month: 'Sep',
      time: '18:30',
      price: '60 RON',
      image: 'https://loremflickr.com/400/300/piano,music?lock=9',
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
      image: 'https://loremflickr.com/400/300/theater,stage?lock=10',
    },
    {
      title: 'Impro Show',
      location: 'Scârț Loc Lejer, Timișoara',
      date: '22',
      month: 'Sep',
      time: '21:00',
      price: '35 RON',
      image: 'https://loremflickr.com/400/300/comedy,microphone?lock=11',
    },
    {
      title: 'Lacul Lebedelor',
      location: 'Opera Națională, Timișoara',
      date: '01',
      month: 'Oct',
      time: '18:30',
      price: '100 RON',
      image: 'https://loremflickr.com/400/300/ballet,dance?lock=12',
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
      image: 'https://loremflickr.com/400/300/soccer,stadium?lock=13',
    },
    {
      title: 'Maraton Timișoara',
      location: 'Piața Libertății, Timișoara',
      date: '02',
      month: 'Oct',
      time: '08:00',
      price: '100 RON',
      image: 'https://loremflickr.com/400/300/marathon,running?lock=14',
    },
    {
      title: 'Cupa de Tenis',
      location: 'Baza Sportivă 2',
      date: '05',
      month: 'Oct',
      time: '10:00',
      price: 'Gratuit',
      image: 'https://loremflickr.com/400/300/tennis,court?lock=15',
    },
  ],
};

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    await Event.deleteMany({});
    console.log('Cleared existing events');

    const events = [];
    for (const [category, categoryEvents] of Object.entries(EVENTS_DATA)) {
      categoryEvents.forEach(event => {
        events.push({ ...event, category });
      });
    }

    await Event.insertMany(events);
    console.log('Database seeded successfully');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedDB();
