const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();
const Event = require('./models/Event');

// Normalizare text românesc - elimină diacritice din ambele forme (ș/ş, ț/ţ etc.)
const normalizeText = (text) => {
    if (!text) return '';
    return text
        .toLowerCase()
        .replace(/[ăâ]/g, 'a')
        .replace(/î/g, 'i')
        .replace(/[șş]/g, 's')
        .replace(/[țţ]/g, 't');
};

// Mapare luni RO -> cod EN 3 litere
const mapLuni = {
    'ian': 'JAN', 'ianuarie': 'JAN',
    'feb': 'FEB', 'februarie': 'FEB',
    'mar': 'MAR', 'martie': 'MAR',
    'apr': 'APR', 'aprilie': 'APR',
    'mai': 'MAY',
    'iun': 'JUN', 'iunie': 'JUN',
    'iul': 'JUL', 'iulie': 'JUL',
    'aug': 'AUG', 'august': 'AUG',
    'sep': 'SEP', 'sept': 'SEP', 'septembrie': 'SEP',
    'oct': 'OCT', 'octombrie': 'OCT',
    'nov': 'NOV', 'noiembrie': 'NOV',
    'dec': 'DEC', 'decembrie': 'DEC',
};

const getMonthCode = (mon) => {
    if (!mon) return 'JAN';
    return mapLuni[normalizeText(mon.replace(/\./g, ''))] || 'JAN';
};

// Detectare categorie robustă cu normalizare diacritice
// Ordinea priorităților contează: Festival > Sport > Teatru > Concerte > Social > Altele
const ghicesteCategoria = (titlu, locatie) => {
    const t = normalizeText(titlu || '');
    const l = normalizeText(locatie || '');

    // 1. Festival (outdoor, multi-zi, street food etc.)
    if (/festival|fest\b|carnival|carnaval|street food|food festival|beer fest|wine fest|targul|targ de/.test(t))
        return 'Festival';

    // 2. Sport (meciuri, competiții, alergări)
    if (/\bmeci\b|fotbal|baschet|\btenis\b|maraton|alergare|running|campionat|handbal|volei|rugby|triatlon|natatie|fitness|ciclism|turneu sportiv|cupa de tenis|cursa/.test(t) ||
        /stadion|baza sportiva|sala polivalenta|teren sport|piscina|velodrom/.test(l))
        return 'Sport';

    // 3. Teatru (spectacole, film, balet, operă, stand-up)
    if (/\bteatru\b|spectacol|stand.?up|piesa\b|balet|opera|drama|musical|impro|cabaret|\bfilm\b|proiectie|cinema|tragedie|comedie de teatru/.test(t) ||
        /\bteatrul\b|filarmonic|casa de cultura|centrul cultural|merlin|sala national|sala mica|sala mare/.test(l))
        return 'Teatru';

    // 4. Concerte (muzică live, DJ, recitaluri)
    if (/\bconcert\b|recital|\bband\b|trupa|simfonic|filarmonic|\bdj\b|\brock\b|\bjazz\b|blues|electronic|rap|hip.?hop|\bfolk\b|acoustic|orchestra|\bpiano\b|muzica live|\blive\b|vinil|vinyl|pop music/.test(t) ||
        /\bclub\b|discoteca|beraria|sala de concerte|amfiteatru/.test(l))
        return 'Concerte';

    // 5. Social (ateliere, networking, jocuri de societate, expoziții)
    if (/workshop|atelier|seminar|conferinta|networking|meetup|\bquiz\b|trivia|karaoke|board.?game|joc de masa|\bremi\b|rummy|\bcatan\b|\bsah\b|degustare|expozitie|vernisaj|lansare|targ de carte|job.?fair|targ de cariere|speed dating/.test(t))
        return 'Social';

    return 'Altele';
};

// Escape special chars pentru regex
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Salvare în DB cu deduplicare case-insensitive pe titlu
// $setOnInsert = inserăm doar dacă NU există deja (nu suprascrie date manuale)
const saveEvent = async (evt, source) => {
    const cleanTitle = (evt.title || '').trim();
    if (cleanTitle.length < 4) return;

    try {
        await Event.findOneAndUpdate(
            { title: { $regex: new RegExp('^' + escapeRegex(cleanTitle) + '$', 'i') } },
            { $setOnInsert: { ...evt, title: cleanTitle } },
            { upsert: true, new: true }
        );
        console.log(`[${source}] ✓ ${cleanTitle} -> ${evt.category}`);
    } catch (err) {
        if (err.code !== 11000) {
            console.error(`[${source}] ✗ "${cleanTitle}": ${err.message}`);
        }
    }
};

const httpConfig = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ro-RO,ro;q=0.9,en-US;q=0.8',
    },
    timeout: 15000,
};

// Extrage prima imagine găsită dintr-un element cheerio (suport lazy loading, background-image, srcset)
const extractImage = ($, el) => {
    const imgEl = $(el).find('img').first();
    let img = imgEl.attr('data-src') || imgEl.attr('data-lazy-src') || imgEl.attr('data-original') || imgEl.attr('src') || '';

    if (!img) {
        const style = $(el).find('[style*="background-image"]').first().attr('style') || '';
        const m = style.match(/url\(['"]?(.*?)['"]?\)/);
        if (m) img = m[1];
    }

    if (!img) {
        const srcset = imgEl.attr('srcset') || '';
        if (srcset) img = srcset.split(',')[0].trim().split(' ')[0];
    }

    return img || '';
};

// Parsare dată din text liber (ex: "15 Decembrie", "15 dec 2025")
const parseDateText = (dateText) => {
    const m = (dateText || '').match(/(\d{1,2})\s+([a-zA-ZăâîșțĂÂÎȘȚ]+)/);
    return {
        zi: m ? m[1].padStart(2, '0') : '01',
        luna: m ? m[2] : 'Ian',
    };
};

// --- 1. IABILET.RO ---
const scrapeIaBilet = async () => {
    try {
        console.log('\n[IABILET.RO] Scraping...');
        const { data } = await axios.get('https://www.iabilet.ro/bilete-in-timisoara/', httpConfig);
        const $ = cheerio.load(data);
        const evenimenteNoi = [];

        // Încearcă selectori posibili în ordine (structura site-ului poate varia)
        const containerSels = [
            '.event-card', '.event-item', '.event-list-item',
            '[class*="EventCard"]', '[class*="event-card"]',
            'article[class*="event"]', '.listing-item', '.item',
        ];

        let eventEls = $();
        for (const sel of containerSels) {
            const els = $(sel);
            if (els.length > 1) { eventEls = els; break; }
        }

        // Fallback: link-uri spre pagini de bilet
        if (eventEls.length === 0) {
            $('a[href*="/bilet"], a[href*="/concert"], a[href*="/spectacol"]').each((i, el) => {
                const titlu = $(el).find('h2,h3,h4,.title,strong').first().text().trim() || $(el).attr('title') || '';
                if (!titlu || titlu.length < 4) return;
                const dateText = $(el).find('.date,time,[class*="date"]').first().text().trim();
                const { zi, luna } = parseDateText(dateText);
                evenimenteNoi.push({
                    title: titlu,
                    location: 'Timișoara',
                    date: zi,
                    month: getMonthCode(luna),
                    time: '20:00',
                    price: 'Vezi detalii',
                    image: extractImage($, el),
                    category: ghicesteCategoria(titlu, ''),
                });
            });
        } else {
            eventEls.each((i, el) => {
                const titlu = $(el).find('h2,h3,h4,.title,.name,[class*="title"]').first().text().trim();
                if (!titlu || titlu.length < 4) return;
                const dateText = $(el).find('.date,time,[class*="date"],[class*="Date"]').first().text().trim();
                const { zi, luna } = parseDateText(dateText);
                const locatie = $(el).find('.venue,.location,[class*="venue"],[class*="location"]').first().text().trim();
                evenimenteNoi.push({
                    title: titlu,
                    location: locatie || 'Timișoara',
                    date: zi,
                    month: getMonthCode(luna),
                    time: '20:00',
                    price: 'Vezi detalii',
                    image: extractImage($, el),
                    category: ghicesteCategoria(titlu, locatie),
                });
            });
        }

        console.log(`[IABILET.RO] Găsite: ${evenimenteNoi.length} evenimente.`);
        for (const evt of evenimenteNoi) await saveEvent(evt, 'IABILET');
    } catch (err) {
        console.error('[IABILET.RO] Eroare:', err.message);
    }
};

// --- 2. TIMISORENI.RO ---
const scrapeTimisoreni = async () => {
    try {
        console.log('\n[TIMISORENI.RO] Scraping...');
        const { data } = await axios.get('https://www.timisoreni.ro/evenimente/', httpConfig);
        const $ = cheerio.load(data);
        const evenimenteNoi = [];

        // Caută containere de articole/carduri cu suficient conținut
        const containerSels = ['.event', '.entry', '.post', '.card', 'article', '.list-item', '.item-event'];
        let eventEls = $();
        for (const sel of containerSels) {
            const els = $(sel).filter((i, el) => $(el).text().length > 20 && $(el).find('a').length > 0);
            if (els.length > 2) { eventEls = els; break; }
        }

        if (eventEls.length > 0) {
            eventEls.each((i, el) => {
                const titlu = $(el).find('h2,h3,h4,.title,.entry-title').first().text().trim() ||
                              $(el).find('a').first().text().trim();
                if (!titlu || titlu.length < 4) return;

                const dateText = $(el).find('.date,.data-eveniment,time,[class*="date"]').first().text().trim();
                const { zi, luna } = parseDateText(dateText);
                const locatie = $(el).find('.location,.venue,[class*="location"]').first().text().trim();

                let imagine = extractImage($, el);
                if (imagine && !imagine.startsWith('http'))
                    imagine = `https://www.timisoreni.ro${imagine.startsWith('/') ? '' : '/'}${imagine}`;

                evenimenteNoi.push({
                    title: titlu,
                    location: locatie || 'Timișoara',
                    date: zi,
                    month: getMonthCode(luna),
                    time: '19:00',
                    price: 'Vezi site',
                    image: imagine,
                    category: ghicesteCategoria(titlu, locatie),
                });
            });
        } else {
            // Fallback: link-uri cu /despre/ (pagini de eveniment individuale)
            $('a[href*="/despre/"]').each((i, el) => {
                const titlu = $(el).text().trim();
                if (!titlu || titlu.length < 5) return;

                let imagine = extractImage($, $(el).closest('div'));
                if (imagine && !imagine.startsWith('http'))
                    imagine = `https://www.timisoreni.ro${imagine.startsWith('/') ? '' : '/'}${imagine}`;

                evenimenteNoi.push({
                    title: titlu,
                    location: 'Timișoara',
                    date: '01',
                    month: 'JAN',
                    time: '19:00',
                    price: 'Vezi site',
                    image: imagine,
                    category: ghicesteCategoria(titlu, 'timisoara'),
                });
            });
        }

        console.log(`[TIMISORENI.RO] Găsite: ${evenimenteNoi.length} evenimente.`);
        for (const evt of evenimenteNoi) await saveEvent(evt, 'TIMISORENI');
    } catch (err) {
        console.error('[TIMISORENI.RO] Eroare:', err.message);
    }
};

// --- 3. ONEVENT.RO ---
const scrapeOnEvent = async () => {
    try {
        console.log('\n[ONEVENT.RO] Scraping...');
        const { data } = await axios.get('https://www.onevent.ro/evenimente-in-orasul/timisoara/', httpConfig);
        const $ = cheerio.load(data);
        const evenimenteNoi = [];

        $('a[href*="/evenimente/"]').each((i, el) => {
            // Adăugăm spațiu după fiecare element copil pentru a separa textul concatenat
            const clonedEl = $(el).clone();
            clonedEl.find('*').each((j, child) => $(child).after(' '));
            const rawText = clonedEl.text().replace(/\s+/g, ' ').trim();

            // Format: "ZiSapt ZiNumar Luna ..."
            const dateRegex = /^(Lun|Mar|Mie|Joi|Vin|Sam|Sâm|Dum)[a-z]*\s*(\d{1,2})\s*([a-zA-ZăâîșțĂÂÎȘȚ]+)/i;
            const match = rawText.match(dateRegex);
            if (!match) return;

            const zi = match[2].replace(/\D/g, '').padStart(2, '0');
            const lunaRaw = match[3];

            let titlu = rawText.replace(match[0], '').trim();
            let locatie = 'Timișoara';

            // Separăm locația de titlu dacă apare "Timisoara" în text
            if (titlu.includes('Timisoara')) {
                const parts = titlu.split('Timisoara');
                titlu = parts[0].trim();
                locatie = 'Timișoara ' + (parts[1] || '').trim();
                // Scoate etichete de categorie reziduale din locație
                ['Concert', 'Teatru', 'Stand-up', 'Party', 'Festival', 'Sport', 'Altele', 'Social'].forEach(cat => {
                    if (locatie.includes(cat)) locatie = locatie.split(cat)[0].trim();
                });
            }

            // Curăță artefacte de dată rămase la începutul titlului
            let prev = '';
            while (titlu !== prev) {
                prev = titlu;
                [
                    /^(Lun|Mar|Mie|Joi|Vin|Sam|Sâm|Dum)[a-z]*\.?\s*\d{1,2}\s*/i,
                    /^[\(\[]?(Ian|Feb|Mar|Apr|Mai|Iun|Iul|Aug|Sep|Oct|Nov|Dec|Jan)[a-z]*\.?\s*\d{1,2}[\)\]\.\,\-\:\s]*/i,
                    /^\d{2}:\d{2}\s*/,
                    /^\d{1,2}\)\s*/,
                    /^[\s\)\(\-\.\,]+/,
                ].forEach(p => { titlu = titlu.replace(p, '').trim(); });
            }

            if (!titlu || titlu.length < 4) return;

            let time = '19:00';
            const timeMatch = rawText.match(/(\d{2}:\d{2})/);
            if (timeMatch) time = timeMatch[1];

            let imagine = extractImage($, el);
            if (!imagine) imagine = extractImage($, $(el).closest('div').parent());
            if (imagine && !imagine.startsWith('http') && !imagine.startsWith('data:'))
                imagine = 'https://www.onevent.ro' + (imagine.startsWith('/') ? '' : '/') + imagine;

            evenimenteNoi.push({
                title: titlu.substring(0, 100),
                location: locatie.substring(0, 100).trim(),
                date: zi,
                month: getMonthCode(lunaRaw),
                time,
                price: 'Vezi detalii',
                image: imagine,
                category: ghicesteCategoria(titlu, locatie),
            });
        });

        console.log(`[ONEVENT.RO] Găsite: ${evenimenteNoi.length} evenimente.`);
        for (const evt of evenimenteNoi) await saveEvent(evt, 'ONEVENT');
    } catch (err) {
        console.error('[ONEVENT.RO] Eroare:', err.message);
    }
};

// --- 4. AGENDATM.RO ---
const scrapeAgendaTM = async () => {
    try {
        console.log('\n[AGENDATM.RO] Scraping...');
        const { data } = await axios.get('https://www.agendatm.ro/evenimente', httpConfig);
        const $ = cheerio.load(data);
        const evenimenteNoi = [];

        const containerSels = [
            '.event-card', '.event', '.event-item', 'article',
            '[class*="event"]', '.card', '.post',
        ];

        let eventEls = $();
        for (const sel of containerSels) {
            const els = $(sel).filter((i, el) => $(el).text().length > 15);
            if (els.length > 1) { eventEls = els; break; }
        }

        eventEls.each((i, el) => {
            const titlu = $(el).find('h2,h3,h4,.title,.name,[class*="title"]').first().text().trim();
            if (!titlu || titlu.length < 4) return;

            const dateText = $(el).find('.date,time,[class*="date"]').first().text().trim();
            const { zi, luna } = parseDateText(dateText);
            const locatie = $(el).find('.venue,.location,[class*="venue"],[class*="location"]').first().text().trim();

            evenimenteNoi.push({
                title: titlu,
                location: locatie || 'Timișoara',
                date: zi,
                month: getMonthCode(luna),
                time: '19:00',
                price: 'Vezi detalii',
                image: extractImage($, el),
                category: ghicesteCategoria(titlu, locatie),
            });
        });

        console.log(`[AGENDATM.RO] Găsite: ${evenimenteNoi.length} evenimente.`);
        for (const evt of evenimenteNoi) await saveEvent(evt, 'AGENDATM');
    } catch (err) {
        console.error('[AGENDATM.RO] Eroare:', err.message);
    }
};

// --- 5. CONCERT.RO ---
const scrapeConcertRo = async () => {
    try {
        console.log('\n[CONCERT.RO] Scraping...');
        const { data } = await axios.get('https://www.concert.ro/timisoara', httpConfig);
        const $ = cheerio.load(data);
        const evenimenteNoi = [];

        const containerSels = [
            '.event-card', '.concert-item', '.event-item', '.listing',
            'article', '[class*="event"]', '[class*="concert"]', '.item',
        ];

        let eventEls = $();
        for (const sel of containerSels) {
            const els = $(sel).filter((i, el) => $(el).text().length > 15);
            if (els.length > 1) { eventEls = els; break; }
        }

        eventEls.each((i, el) => {
            const titlu = $(el).find('h2,h3,h4,.title,.name,[class*="title"]').first().text().trim();
            if (!titlu || titlu.length < 4) return;

            const dateText = $(el).find('.date,time,[class*="date"],[class*="Date"]').first().text().trim();
            const { zi, luna } = parseDateText(dateText);
            const locatie = $(el).find('.venue,.location,[class*="venue"],[class*="location"]').first().text().trim();

            evenimenteNoi.push({
                title: titlu,
                location: locatie || 'Timișoara',
                date: zi,
                month: getMonthCode(luna),
                time: '20:00',
                price: 'Vezi detalii',
                image: extractImage($, el),
                category: ghicesteCategoria(titlu, locatie),
            });
        });

        console.log(`[CONCERT.RO] Găsite: ${evenimenteNoi.length} evenimente.`);
        for (const evt of evenimenteNoi) await saveEvent(evt, 'CONCERT');
    } catch (err) {
        console.error('[CONCERT.RO] Eroare:', err.message);
    }
};

// --- 6. BILET.RO ---
const scrapeBiletRo = async () => {
    try {
        console.log('\n[BILET.RO] Scraping...');
        const { data } = await axios.get('https://www.bilet.ro/timisoara', httpConfig);
        const $ = cheerio.load(data);
        const evenimenteNoi = [];

        const containerSels = [
            '.event-card', '.event-item', '.product-item', '.event',
            'article', '[class*="event"]', '.item',
        ];

        let eventEls = $();
        for (const sel of containerSels) {
            const els = $(sel).filter((i, el) => $(el).text().length > 15);
            if (els.length > 1) { eventEls = els; break; }
        }

        eventEls.each((i, el) => {
            const titlu = $(el).find('h2,h3,h4,.title,.name,[class*="title"]').first().text().trim();
            if (!titlu || titlu.length < 4) return;

            const dateText = $(el).find('.date,time,[class*="date"]').first().text().trim();
            const { zi, luna } = parseDateText(dateText);
            const locatie = $(el).find('.venue,.location,[class*="venue"]').first().text().trim();

            evenimenteNoi.push({
                title: titlu,
                location: locatie || 'Timișoara',
                date: zi,
                month: getMonthCode(luna),
                time: '20:00',
                price: 'Vezi detalii',
                image: extractImage($, el),
                category: ghicesteCategoria(titlu, locatie),
            });
        });

        console.log(`[BILET.RO] Găsite: ${evenimenteNoi.length} evenimente.`);
        for (const evt of evenimenteNoi) await saveEvent(evt, 'BILET');
    } catch (err) {
        console.error('[BILET.RO] Eroare:', err.message);
    }
};

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Scraper conectat la MongoDB\n');

        await scrapeIaBilet();
        await scrapeTimisoreni();
        await scrapeOnEvent();
        await scrapeAgendaTM();
        await scrapeConcertRo();
        await scrapeBiletRo();

        console.log('\n✓ Scraping finalizat.');
        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('Eroare generală:', err);
        process.exit(1);
    }
};

run();
