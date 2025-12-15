const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config(); // Încărcăm variabilele din .env
const Event = require('./models/Event'); // Asigură-te că ai modelul Event definit corect

// Funcție pentru a determina categoria bazată pe titlu ȘI locație
const ghicesteCategoria = (titlu, locatie) => {
    const t = titlu.toLowerCase();
    const l = locatie ? locatie.toLowerCase() : '';
    
    // 1. Festivaluri (prioritate mare)
    if (t.includes('festival') || t.includes('fest ')) return 'Festival';
    
    // 2. Sport (verificăm și locații specifice)
    if (t.includes('sport') || t.includes('alergare') || t.includes('meci') || t.includes('campionat') || t.includes('cupa') || t.includes('fotbal') || t.includes('baschet') ||
        l.includes('stadion') || l.includes('baza sportiva') || l.includes('sala polivalenta')) {
        return 'Sport';
    }

    // 3. Teatru & Film (verificăm locații culturale)
    if (t.includes('teatru') || t.includes('spectacol') || t.includes('stand-up') || t.includes('film') || t.includes('piesa') || t.includes('balet') || t.includes('comedie') || t.includes('opera') || t.includes('drama') ||
        l.includes('teatru') || l.includes('opera') || l.includes('cinema') || l.includes('merlin') || l.includes('national') || l.includes('filarmonica') || l.includes('cultura')) {
        return 'Teatru';
    }
    
    // 4. Concerte (Default, dar verificăm și locații de club/party)
    // Orice altceva legat de muzică, party, sau eveniment generic punem la Concerte
    return 'Concerte'; 
};

// Funcția principală de scraping (Exemplu pentru iabilet - Timisoara)
// NOTA: Selectorii CSS (.event-list-item, .title, etc.) trebuie actualizați constant dacă site-ul își schimbă designul
const scrapeIaBilet = async () => {
    try {
        console.log('Începem scanarea iabilet.ro pentru Timișoara...');
        // URL-ul de unde luăm datele
        const { data } = await axios.get('https://www.iabilet.ro/bilete-in-timisoara/');
        const $ = cheerio.load(data);

        const evenimenteNoi = [];

        // Iterăm prin elementele HTML care conțin evenimente
        // Aici trebuie să te uiți în "Inspect Element" pe site-ul respectiv să vezi clasele
        $('.event-list-item').each((index, element) => {
            const titlu = $(element).find('.title').text().trim();
            const dataText = $(element).find('.date').text().trim(); // Ex: "15 Decembrie"
            const locatie = $(element).find('.venue').text().trim();
            const imagine = $(element).find('img').attr('src');
            const link = 'https://www.iabilet.ro' + $(element).find('a').attr('href');

            if (titlu && dataText) {
                // Parsare simplă a datei (Ex: "15 Decembrie")
                const parts = dataText.split(' ');
                const zi = parts[0] || '1';
                const luna = parts[1] || 'Ian';
                
                // Construim obiectul exact cum îl cere modelul Event.js
                evenimenteNoi.push({
                    title: titlu,
                    location: locatie || 'Timișoara',
                    date: zi,
                    month: luna.substring(0, 3).toUpperCase(), // Ex: DEC
                    time: '20:00', // Ora default, greu de extras fără parsing complex
                    price: 'Vezi detalii', // Preț default
                    image: imagine || 'https://via.placeholder.com/300',
                    category: ghicesteCategoria(titlu, locatie)
                });
            }
        });

        console.log(`Am găsit ${evenimenteNoi.length} evenimente potențiale.`);

        // Salvare sau Actualizare în baza de date
        for (const evt of evenimenteNoi) {
            try {
                // Folosim findOneAndUpdate pentru a actualiza categoria chiar dacă evenimentul există deja
                const result = await Event.findOneAndUpdate(
                    { title: evt.title },
                    evt,
                    { upsert: true, new: true }
                );
                console.log(`[PROCESAT] ${evt.title} -> Categorie: ${result.category}`);
            } catch (err) {
                console.error(`Eroare la salvarea evenimentului ${evt.title}:`, err.message);
            }
        }

    } catch (error) {
        console.error('Eroare la scraping:', error);
    }
};

const run = async () => {
    try {
        // Conectare la baza de date
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Scraper conectat la MongoDB');
        
        // Rulăm scraping-ul
        await scrapeIaBilet();
        
        console.log('Scraping finalizat.');
        await mongoose.connection.close();
        console.log('Conexiune închisă.');
        process.exit(0);
    } catch (err) {
        console.error('Eroare generală:', err);
        process.exit(1);
    }
};

run();
