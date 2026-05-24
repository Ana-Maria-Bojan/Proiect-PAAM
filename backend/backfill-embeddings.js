// Script unic: generează embeddings pentru toate evenimentele existente în DB
// care nu au încă unul. Se rulează O SINGURĂ DATĂ, după ce instalezi @google/generative-ai
// și pui GEMINI_API_KEY în .env.
//
// Folosire: cd backend && node backfill-embeddings.js
//
// După ce a rulat cu succes o dată, NU mai e nevoie să-l rulezi. Scraperul normal
// va genera embeddings pentru fiecare eveniment nou la momentul salvării.
// În plus, dacă găsește evenimente vechi fără embedding și le detectează ca duplicate
// semantice ale unora noi, le populează cu embedding atunci.

const mongoose = require('mongoose');
require('dotenv').config();
const Event = require('./models/Event');
const { generateEmbedding, cosineSimilarity } = require('./gemini-helper');

const SIMILARITY_THRESHOLD = 0.85;

(async () => {
    if (!process.env.GEMINI_API_KEY) {
        console.error('✗ GEMINI_API_KEY lipsă în .env. Adaugă-o și reîncearcă.');
        process.exit(1);
    }
    if (!process.env.MONGODB_URI) {
        console.error('✗ MONGODB_URI lipsă în .env.');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Conectat la MongoDB\n');

    // Selectăm toate evenimentele și includem embedding (default e select:false)
    const all = await Event.find().select('+embedding');
    const toBackfill = all.filter(e => !e.embedding || e.embedding.length === 0);

    console.log(`Total evenimente: ${all.length}`);
    console.log(`Fără embedding: ${toBackfill.length}\n`);

    if (toBackfill.length === 0) {
        console.log('Nimic de făcut — toate evenimentele au deja embeddings.');
        await mongoose.connection.close();
        process.exit(0);
    }

    // Pas 1: generăm embeddings pentru fiecare eveniment fără
    console.log('── PAS 1: Generare embeddings ──');
    let success = 0, failed = 0;
    for (let i = 0; i < toBackfill.length; i++) {
        const e = toBackfill[i];
        const text = `${e.title} | ${e.location || ''} | ${e.date || ''} ${e.month || ''}`;
        const emb = await generateEmbedding(text);
        if (emb) {
            await Event.updateOne({ _id: e._id }, { $set: { embedding: emb } });
            e.embedding = emb; // update local pentru pasul 2
            success++;
            process.stdout.write(`\r  [${i + 1}/${toBackfill.length}] ✓ ${success} reușite, ${failed} eșuate`);
        } else {
            failed++;
            console.log(`\n  ✗ [${e.title.substring(0, 50)}] — embedding eșuat`);
        }
        // mic delay între cereri pentru a respecta rate limit-ul free tier (1500 RPM)
        await new Promise(r => setTimeout(r, 100));
    }
    console.log(`\n✓ Pas 1 complet: ${success} embeddings generate, ${failed} eșecuri.\n`);

    // Pas 2: detectăm și fuzionăm duplicatele semantice deja existente în DB
    console.log('── PAS 2: Detectare și fuziune duplicate semantice existente ──');
    const allWithEmb = all.filter(e => e.embedding && e.embedding.length > 0);
    // Grupăm pe (date, month) pentru a compara doar în interiorul aceleiași zile
    const byDay = {};
    for (const e of allWithEmb) {
        const key = `${e.date}-${e.month}`;
        if (!byDay[key]) byDay[key] = [];
        byDay[key].push(e);
    }

    let duplicatesFound = 0;
    let duplicatesMerged = 0;
    const deletedIds = new Set();

    for (const [day, evts] of Object.entries(byDay)) {
        if (evts.length < 2) continue;
        // Comparăm fiecare pereche (i, j) cu i < j
        for (let i = 0; i < evts.length; i++) {
            if (deletedIds.has(evts[i]._id.toString())) continue;
            for (let j = i + 1; j < evts.length; j++) {
                if (deletedIds.has(evts[j]._id.toString())) continue;
                const sim = cosineSimilarity(evts[i].embedding, evts[j].embedding);
                if (sim >= SIMILARITY_THRESHOLD) {
                    duplicatesFound++;
                    // Păstrăm i (mai vechi/primul), îl completăm cu câmpurile din j, apoi ștergem j
                    const keep = evts[i], drop = evts[j];
                    const updates = {};
                    if (!keep.image && drop.image) updates.image = drop.image;
                    if (!keep.description && drop.description) updates.description = drop.description;
                    if (!keep.website && drop.website) updates.website = drop.website;
                    if (Object.keys(updates).length > 0) {
                        await Event.updateOne({ _id: keep._id }, { $set: updates });
                    }
                    await Event.deleteOne({ _id: drop._id });
                    deletedIds.add(drop._id.toString());
                    duplicatesMerged++;
                    console.log(`  ⊕ (${sim.toFixed(3)}) "${drop.title.substring(0,40)}" → "${keep.title.substring(0,40)}"`);
                }
            }
        }
    }

    console.log(`\n✓ Pas 2 complet: ${duplicatesFound} perechi duplicate detectate, ${duplicatesMerged} fuzionate/șterse.`);

    const finalCount = await Event.countDocuments();
    console.log(`\n══ REZULTAT FINAL ══`);
    console.log(`Înainte:  ${all.length} evenimente`);
    console.log(`După:     ${finalCount} evenimente`);
    console.log(`Reducere: ${all.length - finalCount} duplicate eliminate (${Math.round((all.length - finalCount) / all.length * 100)}%)`);

    await mongoose.connection.close();
    process.exit(0);
})().catch(err => {
    console.error('\n✗ Eroare:', err);
    process.exit(1);
});
