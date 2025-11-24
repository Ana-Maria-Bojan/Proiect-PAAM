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
