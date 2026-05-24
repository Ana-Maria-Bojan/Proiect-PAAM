// Script unic: re-categorizează cu AI toate evenimentele existente care sunt pe "Altele".
// Pentru fiecare, cere AI-ului să sugereze una din cele 5 categorii valide.
// Dacă AI nu poate decide → rămâne "Altele".
//
// Folosire: cd backend && node backfill-categories.js
//
// Se rulează O SINGURĂ DATĂ după ce ai pus GEMINI_API_KEY în .env.
// Evenimentele noi scrapate vor primi automat acest tratament la save (în scraper.js).

const mongoose = require('mongoose');
require('dotenv').config();
const Event = require('./models/Event');
const { categorizeWithAI } = require('./gemini-helper');

(async () => {
    if (!process.env.GEMINI_API_KEY) {
        console.error('✗ GEMINI_API_KEY lipsă în .env.');
        process.exit(1);
    }
    if (!process.env.MONGODB_URI) {
        console.error('✗ MONGODB_URI lipsă în .env.');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Conectat la MongoDB\n');

    const altele = await Event.find({ category: 'Altele' });
    console.log(`Evenimente pe categoria "Altele": ${altele.length}\n`);

    if (altele.length === 0) {
        console.log('Nimic de făcut — nicio categorie "Altele" în DB.');
        await mongoose.connection.close();
        process.exit(0);
    }

    let updated = 0;
    let stillAltele = 0;
    const distribution = { Sport: 0, Festival: 0, Teatru: 0, Concerte: 0, Social: 0 };

    for (let i = 0; i < altele.length; i++) {
        const e = altele[i];
        const ai = await categorizeWithAI(e.title, e.location);
        if (ai && ai !== 'Altele') {
            await Event.updateOne({ _id: e._id }, { $set: { category: ai } });
            updated++;
            distribution[ai] = (distribution[ai] || 0) + 1;
            console.log(`  [${i + 1}/${altele.length}] 🧠 "${e.title.substring(0, 45)}" → ${ai}`);
        } else {
            stillAltele++;
            console.log(`  [${i + 1}/${altele.length}] ─ "${e.title.substring(0, 45)}" → rămâne Altele`);
        }
        // mic delay între cereri pentru a respecta rate limit-ul free tier al Gemini 2.5 Flash
        await new Promise(r => setTimeout(r, 500));
    }

    console.log(`\n══ REZULTAT FINAL ══`);
    console.log(`Re-categorizate: ${updated} / ${altele.length}`);
    console.log(`Rămân "Altele": ${stillAltele}`);
    console.log(`\nDistribuție categorii noi:`);
    for (const [cat, count] of Object.entries(distribution)) {
        if (count > 0) console.log(`  ${cat}: ${count}`);
    }

    await mongoose.connection.close();
    process.exit(0);
})().catch(err => {
    console.error('\n✗ Eroare:', err);
    process.exit(1);
});
