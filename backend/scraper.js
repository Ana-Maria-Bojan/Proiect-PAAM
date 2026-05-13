const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();
const Event = require('./models/Event');

// ─── UTILITARE ────────────────────────────────────────────────────────────────

const normalizeText = (text) => {
    if (!text) return '';
    return text.toLowerCase()
        .replace(/[ăâ]/g, 'a').replace(/î/g, 'i')
        .replace(/[șş]/g, 's').replace(/[țţ]/g, 't');
};

// Luni RO (ambele forme: Ian/IAN/ianuarie) → cod EN 3 litere
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
    return mapLuni[normalizeText(mon.replace(/[.\s]/g, ''))] || 'JAN';
};

// Map lună -> index, acceptă toate variantele (EN/RO, scurt/lung, lower/upper)
const monthToIndex = {
    jan: 0, ian: 0, ianuarie: 0,
    feb: 1, februarie: 1,
    mar: 2, martie: 2,
    apr: 3, aprilie: 3,
    may: 4, mai: 4,
    jun: 5, iun: 5, iunie: 5,
    jul: 6, iul: 6, iulie: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, septembrie: 8,
    oct: 9, octombrie: 9,
    nov: 10, noiembrie: 10,
    dec: 11, decembrie: 11,
};

// Returnează true dacă evenimentul e azi sau în viitor
// year = opțional; dacă e trecut (ex: 2022) întoarce false imediat
const isFutureEvent = (date, month, year = null) => {
    const key = (month || '').toLowerCase().replace(/\./g, '').trim();
    const mIdx = monthToIndex[key];
    if (mIdx === undefined) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yr = year ? parseInt(year) : today.getFullYear();
    if (yr < today.getFullYear()) return false; // an trecut → trecut sigur
    const eventDate = new Date(yr, mIdx, parseInt(date) || 1);
    return eventDate >= today;
};

// Parsare dată cu an opțional: "13 mai 2026", "13 mai", "13/05"
const parseDateText = (dateText) => {
    const t = (dateText || '').trim();
    // "13 mai 2026"
    const m1 = t.match(/(\d{1,2})\s+([a-zA-ZăâîșțĂÂÎȘȚ]+)\s+(\d{4})/);
    if (m1) return { zi: m1[1].padStart(2,'0'), luna: m1[2], year: parseInt(m1[3]) };
    // "13 mai"
    const m2 = t.match(/(\d{1,2})\s+([a-zA-ZăâîșțĂÂÎȘȚ]+)/);
    if (m2) return { zi: m2[1].padStart(2,'0'), luna: m2[2], year: null };
    // "13/05" sau "13.05"
    const m3 = t.match(/(\d{1,2})[\/.](\d{2})/);
    if (m3) {
        const monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
        return { zi: m3[1].padStart(2,'0'), luna: monthNames[parseInt(m3[2])-1] || 'JAN', year: null };
    }
    return { zi: '01', luna: 'Ian', year: null };
};

// ─── CATEGORIE ────────────────────────────────────────────────────────────────

const ghicesteCategoria = (titlu, locatie) => {
    const t = normalizeText(titlu || '');
    const l = normalizeText(locatie || '');
    const tl = `${t} ${l}`; // combinăm titlu + locație pentru semnale mai bune

    // ═══ 1. SPORT (verificat PRIMUL pentru a evita ca "meci de teatru" să cadă pe Teatru) ═══
    const sportKeywords = /\bmeci\b|\bmeciu(l|ri|rile)?\b|\bvs\.?\b|\bfotbal\b|\bbaschet\b|\bbasket\b|\btenis\b|maraton|semimaraton|alergar(e|i)|\brunning\b|\bjogging\b|crosfit|crossfit|\bgym\b|campionat|cupa\s+(romaniei|ligii)|liga\s+\d|handbal|volei|\brugby\b|triatlon|natatie|\bnot\b|inot|fitness|ciclism|\bbike\b|biciclet|\bpolo\b|hochei|\bbox\b|boxing|karate|judo|kickboxing|atletism|\bturneu\b|\bcursa\b|fitness|yoga|pilates|skateboard|\bskate\b|\bsah\b\s+(turneu|simultan)|gimnastica|inotat|inot|hoche|patinaj|schi|snowboard|surfing|paintball|airsoft|escalada|alpinism/;
    const sportVenues = /\bstadion(ul)?\b|stadium|\bbaza\s+sportiv|sala\s+polivalent|teren\s+(de\s+)?sport|piscina|velodrom|palatul\s+sporturilor|sala\s+de\s+fitness|sala\s+de\s+yoga|patinoar|complex\s+sportiv|\barena\b/;
    const sportTeams = /\b(scm|acs|fc|cs|ks|cska|csm)\s+(timi|poli|politehnic)|\bpoli\s+timisoara\b|\bscm\s+timisoara\b|politehnica\s+timi|hermannstadt|cfr|fcsb|dinamo|rapid\s+bucuresti|steaua/;
    if (sportKeywords.test(tl) || sportVenues.test(l) || sportTeams.test(tl))
        return 'Sport';

    // ═══ 2. FESTIVAL (multi-zi, outdoor, food) ═══
    if (/festival|fest\b|fest\s+\d{4}|carnival|carnaval|street\s*food|food\s+fest|beer\s+fest|wine\s+fest|\btargul\b|targ\s+(de|gastronomic|de\s+craciun|de\s+pasti)|romanian\s+fest|cinemobil|untold|electric\s+castle|plai\s+festival|codru\s+festival|flight\s+festival|jazztm|banaton/.test(tl))
        return 'Festival';

    // ═══ 3. TEATRU (operă, balet, film, stand-up) ═══
    const teatruKeywords = /\bteatru\b|teatral|spectacol|stand.?up|piesa\b|piese\b|\bbalet\b|\bopera\b|operet[aă]|drama\b|musical|impro|cabaret|\bfilm\b|filme\b|proiectie|cinema|cinemato|tragedie|comedie|recital\s+dramatic|monolog|monodrama|premiera/;
    const teatruVenues = /\bteatrul\b|teatru(l)?\s+(national|german|maghiar|de\s+stat|merlin|csiky)|opera\s+nationala|opera\s+romana|opera\s+tm|sala\s+(capitol|merlin|2|3)|casa\s+de\s+cultur|centrul\s+cultural|cinema\s+timis|cinema\s+citadel|cinema\s+studio|cinema\s+iulius|filarmonica|filarmonic/;
    if (teatruKeywords.test(t) || teatruVenues.test(l))
        return 'Teatru';

    // ═══ 4. CONCERTE (live, DJ, orchestre) ═══
    const concertKeywords = /\bconcert(e|ul|ele)?\b|recital(uri)?|\bband\b|trupa\b|trupe\b|simfonic|filarmonic|\bdj\b|\brock\b|\bjazz\b|\bblues\b|electronic|reggae|\brap\b|hip.?hop|\bfolk\b|acoustic|acustic|orchestra|orchestral|\bpiano\b|pian\b|muzica\s+(live|clasica|populara|electronica)|\blive\s+music\b|vinil|vinyl|pop\s+music|metal|punk|techno|house\b|trance|edm|dance|disco|\bgala\b|gala\s+lirica|kpop|k-pop|karaoke\s+live/;
    const concertVenues = /\bclub\b|discoteca|beraria|sala\s+de\s+concerte|amfiteatru|filarmonica\s+banatul|sala\s+capitol|berarie|pub\b|sala\s+de\s+spectacole/;
    if (concertKeywords.test(t) || concertVenues.test(l))
        return 'Concerte';

    // ═══ 5. SOCIAL (ateliere, networking, expoziții, târguri non-food) ═══
    const socialKeywords = /workshop|atelier|seminar|conferinta|conference|simpozion|networking|meetup|\bquiz\b|trivia|\bkaraoke\b|board.?game|joc\s+de\s+masa|jocuri\s+de\s+masa|\bremi\b|rummy|\bcatan\b|sah\s+(seara|club|partida)|degustare|expozitie|expo\b|vernisaj|lansare\s+(carte|album|carti)|targ\s+de\s+carte|job.?fair|targ\s+de\s+cariere|speed\s+dating|networking|\bpetrecere\b|after.?work|\bparty\b|brunch|book\s+club|club\s+de\s+lectur/;
    if (socialKeywords.test(t))
        return 'Social';

    // ═══ Fallback prin locație – instituții culturale → Teatru/Concerte ═══
    if (/\bteatr|opera|filarmonic|casa\s+de\s+cultur/.test(l)) return 'Teatru';
    if (/club|pub|beraria/.test(l)) return 'Concerte';

    return 'Altele';
};

// ─── DEDUPLICARE ──────────────────────────────────────────────────────────────

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Set cu URL-urile de imagini deja folosite în rularea curentă
let usedImages = new Set();

// Salvează în DB cu deduplicare case-insensitive pe titlu.
// $setOnInsert: nu suprascrie dacă evenimentul există deja.
const saveEvent = async (evt, source) => {
    const cleanTitle = (evt.title || '').trim();
    if (cleanTitle.length < 4) return;

    const { year, ...dbEvt } = evt; // stripuim year (nu e în schema DB)
    if (!isFutureEvent(dbEvt.date, dbEvt.month, year)) return;

    // Prevenim aceeași imagine la mai multe evenimente
    if (dbEvt.image) {
        if (usedImages.has(dbEvt.image)) {
            dbEvt.image = '';
        } else {
            usedImages.add(dbEvt.image);
        }
    }

    try {
        await Event.findOneAndUpdate(
            { title: { $regex: new RegExp('^' + escapeRegex(cleanTitle) + '$', 'i') } },
            { $setOnInsert: { ...dbEvt, title: cleanTitle } },
            { upsert: true, new: true }
        );
        console.log(`[${source}] ✓ ${cleanTitle} -> ${dbEvt.category}`);
    } catch (err) {
        if (err.code !== 11000) console.error(`[${source}] ✗ "${cleanTitle}": ${err.message}`);
    }
};

// ─── HTTP ─────────────────────────────────────────────────────────────────────

const httpConfig = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ro-RO,ro;q=0.9,en-US;q=0.8',
    },
    timeout: 15000,
    maxRedirects: 5,
};

// Identifică imagini "generice" (logo, banner, placeholder etc.) ce nu trebuie folosite
const isGenericImage = (url) => {
    if (!url) return true;
    const u = url.toLowerCase();
    return /\blogo\b|\bbanner\b|header|cover[-_]default|cover[-_]image|placeholder|via\.placeholder|no[-_]image|noimage|sprite|favicon|icon[-_]|default[-_]event|default\.(jpg|png|svg|webp)|loading\.gif/.test(u)
        || u.endsWith('.svg')
        || /\b(50x50|100x100|150x150|32x32|16x16)\b/.test(u);
};

// Extrage imaginea STRICT din elementul dat (fără a merge la părinți mari)
const extractImage = ($, el, baseUrl = '') => {
    const imgEl = $(el).find('img').first();
    let img = imgEl.attr('data-src') || imgEl.attr('data-lazy-src') ||
              imgEl.attr('data-original') || imgEl.attr('src') || '';
    if (!img) {
        const style = $(el).find('[style*="background-image"]').first().attr('style') || '';
        const m = style.match(/url\(['"]?(.*?)['"]?\)/);
        if (m) img = m[1];
    }
    if (!img) {
        const srcset = imgEl.attr('srcset') || '';
        if (srcset) img = srcset.split(',')[0].trim().split(' ')[0];
    }
    // Fă URL-ul absolut
    if (img && !img.startsWith('http') && !img.startsWith('data:') && baseUrl) {
        img = baseUrl + (img.startsWith('/') ? '' : '/') + img;
    }
    // Filtrare imagini generice / placeholders / iconite
    if (isGenericImage(img)) img = '';
    return img || '';
};

// ─── CURĂȚARE EVENIMENTE TRECUTE ─────────────────────────────────────────────

const cleanPastEvents = async () => {
    // Folosim aceeași logică ca isFutureEvent → catch toate formatele lunii
    const all = await Event.find();
    const pastIds = all.filter(e => !isFutureEvent(e.date, e.month, null)).map(e => e._id);
    if (pastIds.length > 0) {
        await Event.deleteMany({ _id: { $in: pastIds } });
    }
    console.log(`✓ Curățate ${pastIds.length} evenimente trecute din DB.`);
};

// Șterge imaginile duplicate: dacă același URL apare la N evenimente,
// păstrăm imaginea doar la primul, iar restul primesc image='' (nu pierdem evenimentele)
const cleanDuplicateImages = async () => {
    const all = await Event.find({ image: { $exists: true, $ne: '' } });
    const imageCount = {};
    for (const e of all) {
        if (!imageCount[e.image]) imageCount[e.image] = [];
        imageCount[e.image].push(e._id);
    }

    let cleared = 0;
    for (const [img, ids] of Object.entries(imageCount)) {
        // Dacă apare la ≥2 evenimente SAU e imagine generică → ștergem din toate (sau lăsăm doar primul)
        if (isGenericImage(img)) {
            await Event.updateMany({ _id: { $in: ids } }, { $set: { image: '' } });
            cleared += ids.length;
        } else if (ids.length > 1) {
            // Păstrăm primul, golim restul
            const toUpdate = ids.slice(1);
            await Event.updateMany({ _id: { $in: toUpdate } }, { $set: { image: '' } });
            cleared += toUpdate.length;
        }
    }
    console.log(`✓ Curățate ${cleared} imagini duplicate / generice din DB.\n`);
};

// ─── SCRAPER 1: IABILET.RO ───────────────────────────────────────────────────

const scrapeIaBilet = async () => {
    try {
        console.log('[IABILET.RO] Scraping...');
        const { data } = await axios.get('https://www.iabilet.ro/bilete-in-timisoara/', httpConfig);
        const $ = cheerio.load(data);
        const eventi = [];

        const sels = ['.event-card','.event-item','.event-list-item','[class*="EventCard"]','[class*="event-card"]','article[class*="event"]','.listing-item'];
        let els = $();
        for (const s of sels) { const f = $(s); if (f.length > 1) { els = f; break; } }

        if (els.length === 0) {
            $('a[href*="/bilet"],a[href*="/concert"],a[href*="/spectacol"]').each((i, el) => {
                const titlu = $(el).find('h2,h3,h4,.title,strong').first().text().trim() || $(el).attr('title') || '';
                if (!titlu || titlu.length < 4) return;
                const { zi, luna, year } = parseDateText($(el).find('.date,time,[class*="date"]').first().text());
                eventi.push({ title: titlu, location: 'Timișoara', date: zi, month: getMonthCode(luna), year, time: '20:00', price: 'Vezi detalii', image: extractImage($, el), category: ghicesteCategoria(titlu, '') });
            });
        } else {
            els.each((i, el) => {
                const titlu = $(el).find('h2,h3,h4,.title,.name,[class*="title"]').first().text().trim();
                if (!titlu || titlu.length < 4) return;
                const { zi, luna, year } = parseDateText($(el).find('.date,time,[class*="date"],[class*="Date"]').first().text());
                const locatie = $(el).find('.venue,.location,[class*="venue"],[class*="location"]').first().text().trim();
                eventi.push({ title: titlu, location: locatie || 'Timișoara', date: zi, month: getMonthCode(luna), year, time: '20:00', price: 'Vezi detalii', image: extractImage($, el), category: ghicesteCategoria(titlu, locatie) });
            });
        }

        console.log(`  → ${eventi.length} găsite`);
        for (const e of eventi) await saveEvent(e, 'IABILET');
    } catch (err) { console.error('[IABILET.RO] Eroare:', err.message); }
};

// ─── SCRAPER 2: TIMISORENI.RO ────────────────────────────────────────────────

const scrapeTimisoreni = async () => {
    try {
        console.log('[TIMISORENI.RO] Scraping...');
        const { data } = await axios.get('https://www.timisoreni.ro/evenimente/', httpConfig);
        const $ = cheerio.load(data);
        const eventi = [];

        const sels = ['.event','.entry','.post','.card','article','.list-item','.item-event'];
        let els = $();
        for (const s of sels) {
            const f = $(s).filter((i, el) => $(el).text().length > 20 && $(el).find('a').length > 0);
            if (f.length > 2) { els = f; break; }
        }

        if (els.length > 0) {
            els.each((i, el) => {
                const titlu = $(el).find('h2,h3,h4,.title,.entry-title').first().text().trim() || $(el).find('a').first().text().trim();
                if (!titlu || titlu.length < 4) return;
                const { zi, luna, year } = parseDateText($(el).find('.date,.data-eveniment,time,[class*="date"]').first().text());
                const locatie = $(el).find('.location,.venue,[class*="location"]').first().text().trim();
                let img = extractImage($, el, 'https://www.timisoreni.ro');
                eventi.push({ title: titlu, location: locatie || 'Timișoara', date: zi, month: getMonthCode(luna), year, time: '19:00', price: 'Vezi site', image: img, category: ghicesteCategoria(titlu, locatie) });
            });
        } else {
            $('a[href*="/despre/"]').each((i, el) => {
                const titlu = $(el).text().trim();
                if (!titlu || titlu.length < 5) return;
                let img = extractImage($, $(el).closest('div'), 'https://www.timisoreni.ro');
                eventi.push({ title: titlu, location: 'Timișoara', date: '01', month: 'JAN', year: null, time: '19:00', price: 'Vezi site', image: img, category: ghicesteCategoria(titlu, 'timisoara') });
            });
        }

        console.log(`  → ${eventi.length} găsite`);
        for (const e of eventi) await saveEvent(e, 'TIMISORENI');
    } catch (err) { console.error('[TIMISORENI.RO] Eroare:', err.message); }
};

// ─── SCRAPER 3: ONEVENT.RO ───────────────────────────────────────────────────

const scrapeOnEvent = async () => {
    try {
        console.log('[ONEVENT.RO] Scraping...');
        const { data } = await axios.get('https://www.onevent.ro/evenimente-in-orasul/timisoara/', httpConfig);
        const $ = cheerio.load(data);
        const eventi = [];

        $('a[href*="/evenimente/"]').each((i, el) => {
            const cloned = $(el).clone();
            cloned.find('*').each((j, child) => $(child).after(' '));
            const raw = cloned.text().replace(/\s+/g, ' ').trim();

            const dateRx = /^(Lun|Mar|Mie|Joi|Vin|Sam|Sâm|Dum)[a-z]*\s*(\d{1,2})\s*([a-zA-ZăâîșțĂÂÎȘȚ]+)/i;
            const m = raw.match(dateRx);
            if (!m) return;

            const zi = m[2].padStart(2, '0');
            const lunaRaw = m[3];
            let titlu = raw.replace(m[0], '').trim();
            let locatie = 'Timișoara';

            if (titlu.includes('Timisoara')) {
                const parts = titlu.split('Timisoara');
                titlu = parts[0].trim();
                locatie = 'Timișoara ' + (parts[1] || '').trim();
                ['Concert','Teatru','Stand-up','Party','Festival','Sport','Altele','Social'].forEach(cat => {
                    if (locatie.includes(cat)) locatie = locatie.split(cat)[0].trim();
                });
            }

            let prev = '';
            while (titlu !== prev) {
                prev = titlu;
                [/^(Lun|Mar|Mie|Joi|Vin|Sam|Sâm|Dum)[a-z]*\.?\s*\d{1,2}\s*/i,
                 /^[\(\[]?(Ian|Feb|Mar|Apr|Mai|Iun|Iul|Aug|Sep|Oct|Nov|Dec|Jan)[a-z]*\.?\s*\d{1,2}[\)\]\.\,\-\:\s]*/i,
                 /^\d{2}:\d{2}\s*/,/^\d{1,2}\)\s*/,/^[\s\)\(\-\.\,]+/
                ].forEach(p => { titlu = titlu.replace(p,'').trim(); });
            }
            if (!titlu || titlu.length < 4) return;

            const timeM = raw.match(/(\d{2}:\d{2})/);
            // Imagine STRICT din link (fără fallback la parent mare)
            const img = extractImage($, el, 'https://www.onevent.ro');

            eventi.push({ title: titlu.substring(0,100), location: locatie.trim().substring(0,100), date: zi, month: getMonthCode(lunaRaw), year: null, time: timeM ? timeM[1] : '19:00', price: 'Vezi detalii', image: img, category: ghicesteCategoria(titlu, locatie) });
        });

        console.log(`  → ${eventi.length} găsite`);
        for (const e of eventi) await saveEvent(e, 'ONEVENT');
    } catch (err) { console.error('[ONEVENT.RO] Eroare:', err.message); }
};

// ─── SCRAPER 4: OPERA NAȚIONALĂ ROMÂNĂ TIMIȘOARA (ort.ro) ───────────────────
// Structură confirmată: .event-card > img + a[href*="/eveniment/"] h3 + p cu data

const scrapeOpera = async () => {
    try {
        console.log('[OPERA TM] Scraping...');
        const urls = ['https://www.ort.ro/ro/Spectacole.html', 'https://www.ort.ro/'];
        let $;
        for (const url of urls) {
            try {
                const res = await axios.get(url, httpConfig);
                $ = cheerio.load(res.data);
                if ($('.event-card').length > 0) break;
            } catch (e) { console.log(`  [OPERA TM] ${url}: ${e.message}`); }
        }
        if (!$) { console.log('[OPERA TM] Inaccesibil.'); return; }

        const eventi = [];

        $('.event-card').each((i, el) => {
            const titlu = $(el).find('h3').first().text().trim() ||
                          $(el).find('a[href*="/eveniment/"]').first().text().trim();
            if (!titlu || titlu.length < 3) return;

            // Data: ultimul <p> → "MIERCURI 13 MAI 2026, Ora: 19:00"
            let dateText = '';
            $(el).find('p').each((j, p) => { if (/\d{1,2}\s+[A-ZĂÂÎȘȚ]{3}/.test($(p).text())) dateText = $(p).text(); });
            if (!dateText) dateText = $(el).find('p').last().text();

            // "13 MAI 2026" sau "13 MAI 2026, Ora: 19:00"
            const dm = dateText.match(/(\d{1,2})\s+([A-ZĂÂÎȘȚa-zăâîșț]+)\s+(\d{4})/);
            if (!dm) return;

            const zi = dm[1].padStart(2,'0');
            const luna = dm[2];
            const year = parseInt(dm[3]);
            const timeM = dateText.match(/(\d{2}:\d{2})/);

            let img = $(el).find('img').attr('src') || '';
            if (img && !img.startsWith('http')) img = 'https://www.ort.ro' + (img.startsWith('/') ? '' : '/') + img;

            eventi.push({ title: titlu, location: 'Opera Națională Română, Timișoara', date: zi, month: getMonthCode(luna), year, time: timeM ? timeM[1] : '19:00', price: 'Vezi detalii', image: img, category: 'Teatru' });
        });

        console.log(`  → ${eventi.length} spectacole`);
        for (const e of eventi) await saveEvent(e, 'OPERA TM');
    } catch (err) { console.error('[OPERA TM] Eroare:', err.message); }
};

// ─── SCRAPER 5: FILARMONICA BANATUL (filarmonicabanatul.ro) ──────────────────
// WordPress cu The Events Calendar → date format "mai 1 @ 19:00"

const scrapeFilarmonica = async () => {
    try {
        console.log('[FILARMONICA] Scraping...');
        const { data } = await axios.get('https://filarmonicabanatul.ro/evenimente/', httpConfig);
        const $ = cheerio.load(data);
        const eventi = [];

        // The Events Calendar plugin: article.type-tribe_events sau .tribe-event
        const sels = ['.type-tribe_events', '.tribe-event', 'article[class*="tribe"]', '.event-item', 'article'];
        let els = $();
        for (const s of sels) {
            const f = $(s).filter((i, el) => $(el).text().length > 10);
            if (f.length > 0) { els = f; break; }
        }

        els.each((i, el) => {
            const titlu = $(el).find('.tribe-event-url,.tribe-events-anchor,h2,h3,h4,a').first().text().trim();
            if (!titlu || titlu.length < 4) return;

            const text = $(el).text().replace(/\s+/g, ' ');
            // Format: "mai 1 @ 19:00" SAU "1 mai @ 19:00"
            const dm1 = text.match(/(ian|feb|mar|apr|mai|iun|iul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})\s*@\s*(\d{2}:\d{2})/i);
            const dm2 = text.match(/(\d{1,2})\s+(ian|feb|mar|apr|mai|iun|iul|aug|sep|oct|nov|dec)[a-z]*\s*@\s*(\d{2}:\d{2})/i);
            if (!dm1 && !dm2) return;

            const luna = dm1 ? dm1[1] : dm2[2];
            const zi   = (dm1 ? dm1[2] : dm2[1]).padStart(2,'0');
            const time = (dm1 ? dm1[3] : dm2[3]);

            let img = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';

            eventi.push({ title: titlu.substring(0,100), location: 'Filarmonica Banatul, Timișoara', date: zi, month: getMonthCode(luna), year: null, time, price: 'Vezi detalii', image: img, category: 'Concerte' });
        });

        console.log(`  → ${eventi.length} concerte`);
        for (const e of eventi) await saveEvent(e, 'FILARMONICA');
    } catch (err) { console.error('[FILARMONICA] Eroare:', err.message); }
};

// ─── SCRAPER 6: TEATRUL NAȚIONAL TIMIȘOARA (tntm.ro) ────────────────────────
// Date format: "13.05 / 19:00" (DD.MM / HH:MM)

const scrapeTNTM = async () => {
    try {
        console.log('[TEATRU TM] Scraping...');
        const urls = ['https://www.tntm.ro/', 'https://www.tntm.ro/spectacole/'];
        let $;
        for (const url of urls) {
            try {
                const res = await axios.get(url, httpConfig);
                $ = cheerio.load(res.data);
                break;
            } catch (e) { console.log(`  [TEATRU TM] ${url}: ${e.message}`); }
        }
        if (!$) { console.log('[TEATRU TM] Inaccesibil.'); return; }

        const eventi = [];

        // Caută containere cu pattern "DD.MM"
        const sels = ['.show-card','.spectacol','.performance','.event-card','.card','article','.item','.show'];
        let els = $();
        for (const s of sels) {
            const f = $(s).filter((i, el) => /\d{1,2}\.\d{2}/.test($(el).text()) && $(el).text().length > 15);
            if (f.length > 1) { els = f; break; }
        }

        // Fallback: link-uri cu spectacol + pattern de dată în parent
        if (els.length === 0) {
            $('a').each((i, el) => {
                const parent = $(el).closest('div,article,li,section');
                const parentText = parent.text().replace(/\s+/g, ' ');
                const dm = parentText.match(/(\d{1,2})\.(\d{2})(?:\s*[\/\|]\s*(\d{2}:\d{2}))?/);
                if (!dm) return;
                const titlu = $(el).find('h1,h2,h3,h4').first().text().trim() || $(el).text().trim();
                if (!titlu || titlu.length < 4 || /citeste|detalii|bilete/i.test(titlu)) return;

                const zi = dm[1].padStart(2,'0');
                const monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
                const monthCode = monthNames[parseInt(dm[2])-1] || 'JAN';

                eventi.push({ title: titlu.substring(0,100), location: 'Teatrul Național Timișoara', date: zi, month: monthCode, year: new Date().getFullYear(), time: dm[3] || '19:00', price: 'Vezi detalii', image: extractImage($, parent), category: 'Teatru' });
            });
        } else {
            els.each((i, el) => {
                const titlu = $(el).find('h1,h2,h3,h4,.title').first().text().trim();
                if (!titlu || titlu.length < 4) return;
                const text = $(el).text().replace(/\s+/g, ' ');
                const dm = text.match(/(\d{1,2})\.(\d{2})(?:\s*[\/\|]\s*(\d{2}:\d{2}))?/);
                if (!dm) return;
                const zi = dm[1].padStart(2,'0');
                const monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
                const monthCode = monthNames[parseInt(dm[2])-1] || 'JAN';
                eventi.push({ title: titlu.substring(0,100), location: 'Teatrul Național Timișoara', date: zi, month: monthCode, year: new Date().getFullYear(), time: dm[3] || '19:00', price: 'Vezi detalii', image: extractImage($, el), category: 'Teatru' });
            });
        }

        // Dedup local (același spectacol apare la mai multe date)
        const seen = new Set();
        const unique = eventi.filter(e => {
            const k = normalizeText(e.title) + e.date + e.month;
            if (seen.has(k)) return false; seen.add(k); return true;
        });

        console.log(`  → ${unique.length} spectacole`);
        for (const e of unique) await saveEvent(e, 'TEATRU TM');
    } catch (err) { console.error('[TEATRU TM] Eroare:', err.message); }
};

// ─── SCRAPER 7: ZILE ȘI NOPȚI (zilesinopti.ro) ──────────────────────────────
// Agregator complet pentru Timișoara – date format "DD/MM" + "HH:MM"

const scrapeZileSiNopti = async () => {
    try {
        console.log('[ZILESINOPTI] Scraping...');
        const year = new Date().getFullYear();
        const urls = [
            `https://zilesinopti.ro/timisoara/`,
            `https://zilesinopti.ro/evenimente-timisoara-${year}/`,
        ];

        let $;
        for (const url of urls) {
            try {
                const res = await axios.get(url, httpConfig);
                $ = cheerio.load(res.data);
                if ($('body').text().length > 500) break;
            } catch (e) { console.log(`  [ZILESINOPTI] ${url}: ${e.message}`); }
        }
        if (!$) { console.log('[ZILESINOPTI] Inaccesibil.'); return; }

        const eventi = [];

        // Caută containere cu pattern "DD/MM"
        const sels = ['.event','.event-card','.event-item','article','.listing','.item','li'];
        let els = $();
        for (const s of sels) {
            const f = $(s).filter((i, el) => /\d{2}\/\d{2}/.test($(el).text()) && $(el).text().length > 15);
            if (f.length > 2) { els = f; break; }
        }

        if (els.length > 0) {
            els.each((i, el) => {
                const titlu = $(el).find('h2,h3,h4,.title,.name,a').first().text().trim();
                if (!titlu || titlu.length < 4) return;
                const text = $(el).text().replace(/\s+/g, ' ');
                const dm = text.match(/(\d{2})\/(\d{2})/);
                if (!dm) return;
                const zi = dm[1];
                const monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
                const monthCode = monthNames[parseInt(dm[2])-1] || 'JAN';
                const timeM = text.match(/(\d{2}:\d{2})/);
                const locatie = $(el).find('.venue,.location,.address,[class*="venue"],[class*="location"]').first().text().trim();
                eventi.push({ title: titlu.substring(0,100), location: locatie || 'Timișoara', date: zi, month: monthCode, year: null, time: timeM ? timeM[1] : '19:00', price: 'Vezi detalii', image: extractImage($, el), category: ghicesteCategoria(titlu, locatie) });
            });
        } else {
            // Fallback: link-uri cu titlu + dată DD/MM în container
            const seen = new Set();
            $('a').each((i, el) => {
                const titlu = $(el).text().trim();
                if (!titlu || titlu.length < 5 || seen.has(titlu)) return;
                const parent = $(el).closest('div,li,article');
                const text = parent.text().replace(/\s+/g, ' ');
                const dm = text.match(/(\d{2})\/(\d{2})/);
                if (!dm) return;
                const zi = dm[1];
                const monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
                const monthCode = monthNames[parseInt(dm[2])-1] || 'JAN';
                const timeM = text.match(/(\d{2}:\d{2})/);
                seen.add(titlu);
                eventi.push({ title: titlu.substring(0,100), location: 'Timișoara', date: zi, month: monthCode, year: null, time: timeM ? timeM[1] : '19:00', price: 'Vezi detalii', image: '', category: ghicesteCategoria(titlu, '') });
            });
        }

        // Dedup local
        const seenKeys = new Set();
        const unique = eventi.filter(e => {
            const k = normalizeText(e.title) + e.month;
            if (seenKeys.has(k)) return false; seenKeys.add(k); return true;
        });

        console.log(`  → ${unique.length} evenimente`);
        for (const e of unique) await saveEvent(e, 'ZILESINOPTI');
    } catch (err) { console.error('[ZILESINOPTI] Eroare:', err.message); }
};

// ─── SCRAPER 8: CASA DE CULTURĂ TIMIȘOARA (casadeculturatm.ro) ──────────────
// Date format variabil: "iun. 18 - 21, 2026" / "luni, 1 iunie 2026 20:30"
// Event links: /eveniment/[slug]/

const scrapeCasaCultura = async () => {
    try {
        console.log('[CASA CULTURA] Scraping...');
        const urls = ['https://www.casadeculturatm.ro/calendar/', 'https://www.casadeculturatm.ro/'];
        let $;
        for (const url of urls) {
            try {
                const res = await axios.get(url, httpConfig);
                $ = cheerio.load(res.data);
                if ($('a[href*="/eveniment/"]').length > 0) break;
            } catch (e) { console.log(`  [CASA CULTURA] ${url}: ${e.message}`); }
        }
        if (!$) { console.log('[CASA CULTURA] Inaccesibil.'); return; }

        const eventi = [];
        const seen = new Set();

        $('a[href*="/eveniment/"]').each((i, el) => {
            const titlu = $(el).text().trim() || $(el).attr('title') || '';
            if (!titlu || titlu.length < 4 || seen.has(titlu)) return;

            const parent = $(el).closest('article,div,li,section');
            const text = parent.text().replace(/\s+/g, ' ');

            // Date format 1: "ZI luna YYYY [HH:MM]" (luni, 1 iunie 2026 20:30)
            let dm = text.match(/(\d{1,2})\s+(ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie)\s+(\d{4})/i);
            // Date format 2: "iun. 18 - 21, 2026"
            if (!dm) dm = text.match(/(ian|feb|mar|apr|mai|iun|iul|aug|sep|oct|nov|dec)\.?\s+(\d{1,2})\b/i);
            if (!dm) return;

            let zi, luna, year;
            if (/^\d/.test(dm[0])) {
                zi = dm[1].padStart(2,'0');
                luna = dm[2];
                year = parseInt(dm[3]);
            } else {
                luna = dm[1];
                zi = dm[2].padStart(2,'0');
                year = null;
            }

            const timeM = text.match(/(\d{2}:\d{2})/);
            // Locație: după dată, înainte de "Detalii" sau alt link
            let locatie = 'Timișoara';
            const locM = text.match(/(?:\d{4}|\d{2}:\d{2})\s+([A-ZĂÂÎȘȚ][^\.\|]{4,60})/);
            if (locM) locatie = locM[1].trim();

            seen.add(titlu);
            eventi.push({
                title: titlu.substring(0, 100),
                location: locatie.substring(0, 100),
                date: zi, month: getMonthCode(luna), year,
                time: timeM ? timeM[1] : '19:00',
                price: 'Vezi detalii',
                image: extractImage($, parent, 'https://www.casadeculturatm.ro'),
                category: ghicesteCategoria(titlu, locatie),
            });
        });

        console.log(`  → ${eventi.length} evenimente`);
        for (const e of eventi) await saveEvent(e, 'CASA CULTURA');
    } catch (err) { console.error('[CASA CULTURA] Eroare:', err.message); }
};

// ─── SCRAPER 9: RADIO TIMIȘOARA AGENDA (radiotimisoara.ro) ──────────────────
// Date format: "14 mai 2026" + time "17:00"

const scrapeRadioTimisoara = async () => {
    try {
        console.log('[RADIO TM] Scraping...');
        const { data } = await axios.get('https://www.radiotimisoara.ro/agenda-evenimente', httpConfig);
        const $ = cheerio.load(data);
        const eventi = [];

        const sels = ['.event-listing', '.event-item', '.event', 'article', '.post', '.entry', '.item'];
        let els = $();
        for (const s of sels) {
            const f = $(s).filter((i, el) => $(el).text().length > 20);
            if (f.length > 1) { els = f; break; }
        }

        // Fallback: caută orice link în agenda care are pattern "ZI luna YYYY" în parent
        if (els.length === 0) {
            $('a[href*="/agenda"]').each((i, el) => {
                const parent = $(el).closest('div,article,li,section');
                const text = parent.text().replace(/\s+/g, ' ');
                const titlu = $(el).text().trim();
                const dm = text.match(/(\d{1,2})\s+(ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie|ian|feb|mar|apr|iun|iul|aug|sep|oct|nov|dec)\b\.?\s*(\d{4})?/i);
                if (!titlu || titlu.length < 4 || !dm) return;
                const zi = dm[1].padStart(2,'0');
                const year = dm[3] ? parseInt(dm[3]) : null;
                const timeM = text.match(/(\d{2}:\d{2})/);
                eventi.push({
                    title: titlu.substring(0, 100),
                    location: 'Timișoara',
                    date: zi, month: getMonthCode(dm[2]), year,
                    time: timeM ? timeM[1] : '19:00',
                    price: 'Vezi detalii',
                    image: extractImage($, parent, 'https://www.radiotimisoara.ro'),
                    category: ghicesteCategoria(titlu, ''),
                });
            });
        } else {
            els.each((i, el) => {
                const titlu = $(el).find('h1,h2,h3,h4,.event-title,.title,a').first().text().trim();
                if (!titlu || titlu.length < 4) return;
                const text = $(el).text().replace(/\s+/g, ' ');
                const dm = text.match(/(\d{1,2})\s+(ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie|ian|feb|mar|apr|iun|iul|aug|sep|oct|nov|dec)\b\.?\s*(\d{4})?/i);
                if (!dm) return;
                const zi = dm[1].padStart(2,'0');
                const year = dm[3] ? parseInt(dm[3]) : null;
                const timeM = text.match(/(\d{2}:\d{2})/);
                eventi.push({
                    title: titlu.substring(0, 100),
                    location: 'Timișoara',
                    date: zi, month: getMonthCode(dm[2]), year,
                    time: timeM ? timeM[1] : '19:00',
                    price: 'Vezi detalii',
                    image: extractImage($, el, 'https://www.radiotimisoara.ro'),
                    category: ghicesteCategoria(titlu, ''),
                });
            });
        }

        // Dedup local
        const seenKeys = new Set();
        const unique = eventi.filter(e => {
            const k = normalizeText(e.title) + e.month + e.date;
            if (seenKeys.has(k)) return false; seenKeys.add(k); return true;
        });

        console.log(`  → ${unique.length} evenimente`);
        for (const e of unique) await saveEvent(e, 'RADIO TM');
    } catch (err) { console.error('[RADIO TM] Eroare:', err.message); }
};

// ─── SCRAPER 10: TICKETSTORE.RO TIMIȘOARA ────────────────────────────────────
// Aggregator general de bilete, incl. evenimente sportive

const scrapeTicketstore = async () => {
    try {
        console.log('[TICKETSTORE] Scraping...');
        const { data } = await axios.get('https://ticketstore.ro/ro/oras/Timisoara', httpConfig);
        const $ = cheerio.load(data);
        const eventi = [];

        const sels = ['.event-card','.event','.event-item','.product-item','article','.card','[class*="event"]','[class*="Event"]'];
        let els = $();
        for (const s of sels) {
            const f = $(s).filter((i, el) => $(el).text().length > 20);
            if (f.length > 2) { els = f; break; }
        }

        // Fallback: link-uri către pagina de eveniment
        if (els.length === 0) {
            $('a[href*="/eveniment"], a[href*="/event"]').each((i, el) => {
                const parent = $(el).closest('div,article,li');
                const titlu = $(el).find('h2,h3,h4,.title').first().text().trim() || $(el).text().trim();
                if (!titlu || titlu.length < 4) return;
                const text = parent.text().replace(/\s+/g, ' ');
                const dm = text.match(/(\d{1,2})\s+(ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie|ian|feb|mar|apr|iun|iul|aug|sep|oct|nov|dec)\b\.?\s*(\d{4})?/i);
                if (!dm) return;
                const timeM = text.match(/(?:ora\s+)?(\d{2}:\d{2})/);
                const locatie = $(el).find('.venue,.location').first().text().trim();
                eventi.push({
                    title: titlu.substring(0, 100),
                    location: locatie || 'Timișoara',
                    date: dm[1].padStart(2,'0'),
                    month: getMonthCode(dm[2]),
                    year: dm[3] ? parseInt(dm[3]) : null,
                    time: timeM ? timeM[1] : '19:00',
                    price: 'Vezi detalii',
                    image: extractImage($, parent, 'https://ticketstore.ro'),
                    category: ghicesteCategoria(titlu, locatie),
                });
            });
        } else {
            els.each((i, el) => {
                const titlu = $(el).find('h2,h3,h4,.title,.name,a').first().text().trim();
                if (!titlu || titlu.length < 4) return;
                const text = $(el).text().replace(/\s+/g, ' ');
                const dm = text.match(/(\d{1,2})\s+(ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie|ian|feb|mar|apr|iun|iul|aug|sep|oct|nov|dec)\b\.?\s*(\d{4})?/i);
                if (!dm) return;
                const timeM = text.match(/(?:ora\s+)?(\d{2}:\d{2})/);
                const locatie = $(el).find('.venue,.location,[class*="venue"],[class*="location"]').first().text().trim();
                eventi.push({
                    title: titlu.substring(0, 100),
                    location: locatie || 'Timișoara',
                    date: dm[1].padStart(2,'0'),
                    month: getMonthCode(dm[2]),
                    year: dm[3] ? parseInt(dm[3]) : null,
                    time: timeM ? timeM[1] : '19:00',
                    price: 'Vezi detalii',
                    image: extractImage($, el, 'https://ticketstore.ro'),
                    category: ghicesteCategoria(titlu, locatie),
                });
            });
        }

        // Dedup local
        const seen = new Set();
        const unique = eventi.filter(e => {
            const k = normalizeText(e.title) + e.month + e.date;
            if (seen.has(k)) return false; seen.add(k); return true;
        });

        console.log(`  → ${unique.length} evenimente`);
        for (const e of unique) await saveEvent(e, 'TICKETSTORE');
    } catch (err) { console.error('[TICKETSTORE] Eroare:', err.message); }
};

// ─── SCRAPER 11: SCM TIMIȘOARA (basketball, handball, rugby) ────────────────
// Date format pe pagini de știri: [DD.MM.YYYY] + categorie [Rugby]/[Handbal]
// Toate evenimentele = categoria Sport (hard-coded)

const scrapeSCM = async () => {
    try {
        console.log('[SCM TM] Scraping...');
        const urls = [
            'https://scmtimisoara.ro/',
            'https://scmtimisoara.ro/rugby/',
            'https://scmtimisoara.ro/handbal/',
            'https://scmtimisoara.ro/baschet/',
        ];

        for (const url of urls) {
            try {
                const res = await axios.get(url, httpConfig);
                const $ = cheerio.load(res.data);
                const eventi = [];

                $('article,div.news-item,.post,.event,.match,li').each((i, el) => {
                    const text = $(el).text().replace(/\s+/g, ' ');
                    // [DD.MM.YYYY] sau "DD.MM.YYYY" sau "DD-MM-YYYY"
                    const dm = text.match(/\[?(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{4})\]?/);
                    if (!dm) return;

                    const titlu = $(el).find('h1,h2,h3,h4,.title,a').first().text().trim();
                    if (!titlu || titlu.length < 6 || /^\s*\d/.test(titlu)) return;

                    const zi = dm[1].padStart(2,'0');
                    const monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
                    const monthCode = monthNames[parseInt(dm[2]) - 1] || 'JAN';
                    const year = parseInt(dm[3]);
                    const timeM = text.match(/(\d{2}:\d{2})/);

                    // Categorie sport specifică din URL sau text
                    let sport = 'Sport';
                    if (/rugby/i.test(url) || /rugby/i.test(text)) sport = 'Sport';
                    else if (/handbal/i.test(url) || /handbal/i.test(text)) sport = 'Sport';
                    else if (/baschet/i.test(url) || /baschet|basket/i.test(text)) sport = 'Sport';

                    eventi.push({
                        title: titlu.substring(0, 100),
                        location: 'Sala Polivalentă / Stadion, Timișoara',
                        date: zi, month: monthCode, year,
                        time: timeM ? timeM[1] : '19:00',
                        price: 'Vezi detalii',
                        image: extractImage($, el, 'https://scmtimisoara.ro'),
                        category: sport, // Forțat Sport
                    });
                });

                // Dedup
                const seen = new Set();
                const unique = eventi.filter(e => {
                    const k = normalizeText(e.title) + e.month + e.date;
                    if (seen.has(k)) return false; seen.add(k); return true;
                });

                if (unique.length > 0) {
                    console.log(`  → ${unique.length} (din ${url.replace('https://scmtimisoara.ro','')})`);
                    for (const e of unique) await saveEvent(e, 'SCM TM');
                }
            } catch (e) { console.log(`  [SCM TM] ${url}: ${e.message}`); }
        }
    } catch (err) { console.error('[SCM TM] Eroare:', err.message); }
};

// ─── SCRAPER 12: ALLEVENTS.IN TIMIȘOARA ──────────────────────────────────────

const scrapeAllEvents = async () => {
    try {
        console.log('[ALLEVENTS] Scraping...');
        const { data } = await axios.get('https://allevents.in/timisoara/all', httpConfig);
        const $ = cheerio.load(data);
        const eventi = [];

        const sels = ['.event-card','.event-item','article[class*="event"]','.evt','[itemtype*="Event"]','.evnt'];
        let els = $();
        for (const s of sels) {
            const f = $(s);
            if (f.length > 1) { els = f; break; }
        }

        // Fallback: link-uri către evenimente specifice
        if (els.length === 0) {
            $('a[href*="/timisoara/"]').each((i, el) => {
                const parent = $(el).closest('div,article,li');
                const titlu = $(el).find('h2,h3,h4').first().text().trim() || $(el).text().trim();
                if (!titlu || titlu.length < 6) return;
                const text = parent.text().replace(/\s+/g, ' ');
                // Format EN: "Fri May 29 2026 at 05:00 pm"
                const dmEN = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})\s+(\d{4})/i);
                // Format RO: "13 mai 2026"
                const dmRO = text.match(/(\d{1,2})\s+(ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie|ian|feb|mar|apr|iun|iul|aug|sep|oct|nov|dec)\b\.?\s*(\d{4})?/i);
                if (!dmEN && !dmRO) return;

                let zi, luna, year;
                if (dmEN) { luna = dmEN[1]; zi = dmEN[2].padStart(2,'0'); year = parseInt(dmEN[3]); }
                else { zi = dmRO[1].padStart(2,'0'); luna = dmRO[2]; year = dmRO[3] ? parseInt(dmRO[3]) : null; }

                const timeM = text.match(/(\d{1,2}:\d{2})\s*(pm|am)?/i);
                let time = '19:00';
                if (timeM) {
                    let h = parseInt(timeM[1].split(':')[0]);
                    const m = timeM[1].split(':')[1];
                    if (timeM[2] && /pm/i.test(timeM[2]) && h < 12) h += 12;
                    if (timeM[2] && /am/i.test(timeM[2]) && h === 12) h = 0;
                    time = String(h).padStart(2,'0') + ':' + m;
                }
                const locatie = $(el).find('.venue,.location').first().text().trim() || 'Timișoara';

                eventi.push({
                    title: titlu.substring(0, 100),
                    location: locatie,
                    date: zi, month: getMonthCode(luna), year,
                    time, price: 'Vezi detalii',
                    image: extractImage($, parent),
                    category: ghicesteCategoria(titlu, locatie),
                });
            });
        } else {
            els.each((i, el) => {
                const titlu = $(el).find('h2,h3,h4,.title,a').first().text().trim();
                if (!titlu || titlu.length < 4) return;
                const text = $(el).text().replace(/\s+/g, ' ');
                const dm = text.match(/(\d{1,2})\s+(ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie|ian|feb|mar|apr|iun|iul|aug|sep|oct|nov|dec)\b\.?\s*(\d{4})?/i);
                if (!dm) return;
                const timeM = text.match(/(\d{2}:\d{2})/);
                const locatie = $(el).find('.venue,.location').first().text().trim() || 'Timișoara';
                eventi.push({
                    title: titlu.substring(0, 100),
                    location: locatie,
                    date: dm[1].padStart(2,'0'),
                    month: getMonthCode(dm[2]),
                    year: dm[3] ? parseInt(dm[3]) : null,
                    time: timeM ? timeM[1] : '19:00',
                    price: 'Vezi detalii',
                    image: extractImage($, el),
                    category: ghicesteCategoria(titlu, locatie),
                });
            });
        }

        // Dedup local
        const seen = new Set();
        const unique = eventi.filter(e => {
            const k = normalizeText(e.title) + e.month + e.date;
            if (seen.has(k)) return false; seen.add(k); return true;
        });

        console.log(`  → ${unique.length} evenimente`);
        for (const e of unique) await saveEvent(e, 'ALLEVENTS');
    } catch (err) { console.error('[ALLEVENTS] Eroare:', err.message); }
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Conectat la MongoDB\n');

        usedImages = new Set(); // reset imagini per run

        await cleanPastEvents();
        await cleanDuplicateImages();

        await scrapeIaBilet();
        await scrapeTimisoreni();
        await scrapeOnEvent();
        await scrapeOpera();
        await scrapeFilarmonica();
        await scrapeTNTM();
        await scrapeZileSiNopti();
        await scrapeCasaCultura();
        await scrapeRadioTimisoara();
        await scrapeTicketstore();
        await scrapeSCM();
        await scrapeAllEvents();

        console.log('\n✓ Scraping finalizat.');
        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('Eroare generală:', err);
        process.exit(1);
    }
};

run();
