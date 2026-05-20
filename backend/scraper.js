const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();
const Event = require('./models/Event');
const { fetchPageHtml, closeBrowser } = require('./puppeteer-helper');

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

// Curăță un text de descriere: spații, newline-uri, "Read more"-uri
const cleanDescription = (text) => {
    if (!text) return '';
    return text
        .replace(/\s+/g, ' ')
        .replace(/\b(read more|citeste mai mult|vezi mai mult|continua|continuă|...mai mult|cumpara bilet|cumpără bilet)\.{0,3}/gi, '')
        .replace(/[ ​]+/g, ' ')
        .trim();
};

// Trunchiază un text la o lungime maximă, adăugând "..." la cuvântul cel mai apropiat
const truncate = (text, max = 400) => {
    if (!text || text.length <= max) return text;
    const cut = text.substring(0, max);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > max * 0.7 ? cut.substring(0, lastSpace) : cut) + '...';
};

// Descarcă pagina unui eveniment și extrage o descriere scurtă
// Folosește (în ordine): og:description, meta description, JSON-LD, primul paragraf relevant
const fetchDescription = async (url) => {
    if (!url || !/^https?:\/\//i.test(url)) return '';
    try {
        const { data } = await axios.get(url, { ...httpConfig, timeout: 8000 });
        const $ = cheerio.load(data);

        // 1. Open Graph (cel mai de încredere – multe site-uri au asta)
        let desc = $('meta[property="og:description"]').attr('content') ||
                   $('meta[name="twitter:description"]').attr('content') ||
                   $('meta[name="description"]').attr('content') || '';
        desc = cleanDescription(desc);
        if (desc && desc.length > 40) return truncate(desc);

        // 2. JSON-LD structured data
        $('script[type="application/ld+json"]').each((i, el) => {
            if (desc && desc.length > 40) return;
            try {
                const json = JSON.parse($(el).html());
                const items = Array.isArray(json) ? json : [json];
                for (const item of items) {
                    if (item.description) {
                        const d = cleanDescription(String(item.description));
                        if (d.length > 40) { desc = d; break; }
                    }
                }
            } catch {}
        });
        if (desc && desc.length > 40) return truncate(desc);

        // 3. Primul paragraf relevant din conținutul principal
        const contentSels = [
            '.event-description', '.description', '.entry-content', '.post-content',
            '.event-content', '.content', 'article', 'main',
            '.tribe-events-single-event-description', '[itemprop="description"]'
        ];
        for (const sel of contentSels) {
            const container = $(sel).first();
            if (!container.length) continue;
            // Concatenăm primele 2-3 paragrafe ne-goale
            const paras = [];
            container.find('p').each((i, p) => {
                if (paras.length >= 3) return;
                const t = cleanDescription($(p).text());
                if (t.length > 30) paras.push(t);
            });
            if (paras.length > 0) {
                const combined = paras.join(' ');
                if (combined.length > 40) return truncate(combined);
            }
        }

        return '';
    } catch {
        return '';
    }
};

// Pentru toate evenimentele cu website dar fără descriere, fă fetch concurent
// și completează câmpul description.
const enrichDescriptions = async () => {
    const toEnrich = await Event.find({
        website: { $exists: true, $ne: '' },
        $or: [{ description: '' }, { description: { $exists: false } }],
    });

    if (toEnrich.length === 0) {
        console.log('\n[ENRICH] Nimic de actualizat.\n');
        return;
    }

    console.log(`\n[ENRICH] Caut descrieri pentru ${toEnrich.length} evenimente...`);

    const concurrency = 5;
    let updated = 0;
    let failed = 0;

    for (let i = 0; i < toEnrich.length; i += concurrency) {
        const batch = toEnrich.slice(i, i + concurrency);
        await Promise.all(batch.map(async (evt) => {
            const desc = await fetchDescription(evt.website);
            if (desc) {
                await Event.updateOne({ _id: evt._id }, { $set: { description: desc } });
                updated++;
            } else {
                failed++;
            }
        }));
        // Progres la fiecare 20 evenimente
        if ((i + concurrency) % 20 === 0 || i + concurrency >= toEnrich.length) {
            console.log(`  ... ${Math.min(i + concurrency, toEnrich.length)}/${toEnrich.length} (${updated} actualizate)`);
        }
    }

    console.log(`[ENRICH] ✓ Actualizate ${updated}, fără descriere ${failed}.\n`);
};

// Extrage link-ul absolut al unui eveniment dintr-un element cheerio (el = a sau container cu a)
const extractLink = ($, el, baseUrl = '') => {
    let href = '';
    const tag = (el.tagName || el.name || '').toLowerCase();
    if (tag === 'a') {
        href = $(el).attr('href') || '';
    } else {
        href = $(el).find('a').first().attr('href') || '';
    }
    if (!href) return '';
    href = href.trim();

    // Respinge link-uri non-navigabile
    if (href.length < 2 || href.startsWith('#') || href.startsWith('javascript:') ||
        href.startsWith('mailto:') || href.startsWith('tel:')) return '';

    // Protocol-relative → adaugă https:
    if (href.startsWith('//')) return 'https:' + href;
    // Deja absolut
    if (/^https?:\/\//i.test(href)) return href;
    // Path absolut → prefixează cu baseUrl
    if (baseUrl && href.startsWith('/')) return baseUrl + href;
    // Path relativ → prefixează cu baseUrl/
    if (baseUrl) return baseUrl + '/' + href.replace(/^\.?\//, '');
    return '';
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
                eventi.push({ title: titlu, location: 'Timișoara', date: zi, month: getMonthCode(luna), year, time: '20:00', price: 'Vezi detalii', image: extractImage($, el), category: ghicesteCategoria(titlu, ''), website: extractLink($, el, 'https://www.iabilet.ro') });
            });
        } else {
            els.each((i, el) => {
                const titlu = $(el).find('h2,h3,h4,.title,.name,[class*="title"]').first().text().trim();
                if (!titlu || titlu.length < 4) return;
                const { zi, luna, year } = parseDateText($(el).find('.date,time,[class*="date"],[class*="Date"]').first().text());
                const locatie = $(el).find('.venue,.location,[class*="venue"],[class*="location"]').first().text().trim();
                eventi.push({ title: titlu, location: locatie || 'Timișoara', date: zi, month: getMonthCode(luna), year, time: '20:00', price: 'Vezi detalii', image: extractImage($, el), category: ghicesteCategoria(titlu, locatie), website: extractLink($, el, 'https://www.iabilet.ro') });
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
                eventi.push({ title: titlu, location: locatie || 'Timișoara', date: zi, month: getMonthCode(luna), year, time: '19:00', price: 'Vezi site', image: img, category: ghicesteCategoria(titlu, locatie), website: extractLink($, el, 'https://www.timisoreni.ro') });
            });
        } else {
            $('a[href*="/despre/"]').each((i, el) => {
                const titlu = $(el).text().trim();
                if (!titlu || titlu.length < 5) return;
                let img = extractImage($, $(el).closest('div'), 'https://www.timisoreni.ro');
                eventi.push({ title: titlu, location: 'Timișoara', date: '01', month: 'JAN', year: null, time: '19:00', price: 'Vezi site', image: img, category: ghicesteCategoria(titlu, 'timisoara'), website: extractLink($, el, 'https://www.timisoreni.ro') });
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

            eventi.push({ title: titlu.substring(0,100), location: locatie.trim().substring(0,100), date: zi, month: getMonthCode(lunaRaw), year: null, time: timeM ? timeM[1] : '19:00', price: 'Vezi detalii', image: img, category: ghicesteCategoria(titlu, locatie), website: extractLink($, el, 'https://www.onevent.ro') });
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

            eventi.push({ title: titlu, location: 'Opera Națională Română, Timișoara', date: zi, month: getMonthCode(luna), year, time: timeM ? timeM[1] : '19:00', price: 'Vezi detalii', image: img, category: 'Teatru', website: extractLink($, el, 'https://www.ort.ro') });
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

            eventi.push({ title: titlu.substring(0,100), location: 'Filarmonica Banatul, Timișoara', date: zi, month: getMonthCode(luna), year: null, time, price: 'Vezi detalii', image: img, category: 'Concerte', website: extractLink($, el, 'https://filarmonicabanatul.ro') });
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

                eventi.push({ title: titlu.substring(0,100), location: 'Teatrul Național Timișoara', date: zi, month: monthCode, year: new Date().getFullYear(), time: dm[3] || '19:00', price: 'Vezi detalii', image: extractImage($, parent), category: 'Teatru', website: extractLink($, el, 'https://www.tntm.ro') });
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
                eventi.push({ title: titlu.substring(0,100), location: 'Teatrul Național Timișoara', date: zi, month: monthCode, year: new Date().getFullYear(), time: dm[3] || '19:00', price: 'Vezi detalii', image: extractImage($, el), category: 'Teatru', website: extractLink($, el, 'https://www.tntm.ro') });
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
                eventi.push({ title: titlu.substring(0,100), location: locatie || 'Timișoara', date: zi, month: monthCode, year: null, time: timeM ? timeM[1] : '19:00', price: 'Vezi detalii', image: extractImage($, el), category: ghicesteCategoria(titlu, locatie), website: extractLink($, el, 'https://zilesinopti.ro') });
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
                eventi.push({ title: titlu.substring(0,100), location: 'Timișoara', date: zi, month: monthCode, year: null, time: timeM ? timeM[1] : '19:00', price: 'Vezi detalii', image: '', category: ghicesteCategoria(titlu, ''), website: extractLink($, el, 'https://zilesinopti.ro') });
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
                website: extractLink($, el, 'https://www.casadeculturatm.ro'),
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
                    website: extractLink($, el, 'https://www.radiotimisoara.ro'),
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
                    website: extractLink($, el, 'https://www.radiotimisoara.ro'),
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
                    website: extractLink($, el, 'https://ticketstore.ro'),
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
                    website: extractLink($, el, 'https://ticketstore.ro'),
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
                        website: extractLink($, el, 'https://scmtimisoara.ro') || url,
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
                    website: extractLink($, el, 'https://allevents.in'),
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
                    website: extractLink($, el, 'https://allevents.in'),
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

// ═══════════════════════════════════════════════════════════════════════════════
// SCRAPERE PUPPETEER (site-uri protejate Cloudflare sau SPA-uri JavaScript)
// ═══════════════════════════════════════════════════════════════════════════════

// Wrapper: încearcă să încarce pagina cu Puppeteer + Stealth.
// Returnează cheerio loader sau null la eșec (fără să oprească restul scraperelor).
const loadWithPuppeteer = async (url, opts = {}) => {
    try {
        const html = await fetchPageHtml(url, opts);
        if (!html || html.length < 500) return null;
        return cheerio.load(html);
    } catch (err) {
        console.log(`  [puppeteer] ${url}: ${err.message.substring(0, 80)}`);
        return null;
    }
};

// ─── SCRAPER 13: EVENTIM.RO (Cloudflare) ─────────────────────────────────────
// Cel mai mare agregator de bilete din România. Cloudflare + SPA React.
// Strategie: 1) extragem teasers (titluri + URL) din pagina orașului; 2) fetch
// pagina fiecărui eveniment pentru a obține data + locația exactă din meta tags.

const scrapeEventim = async () => {
    try {
        console.log('[EVENTIM.RO] Scraping...');
        const $ = await loadWithPuppeteer('https://www.eventim.ro/ro/bilete/timisoara-1822/city.html', {
            waitSelector: 'a[data-teaser-id]',
            waitMs: 5000,
            scroll: true,
        });
        if (!$) { console.log('[EVENTIM.RO] Inaccesibil.'); return; }

        // 1. Adunăm toate teaser-urile unice (cardurile de evenimente promovate în Timișoara)
        const teasers = [];
        const seen = new Set();
        $('a[data-teaser-id], a.js-track-product').each((i, el) => {
            const titlu = ($(el).attr('data-teaser-name') || $(el).attr('title') || '').trim();
            const href = $(el).attr('href') || '';
            if (!titlu || titlu.length < 4 || !href || seen.has(href)) return;
            // Doar pagini de evenimente reale (skip artist/categorii)
            if (!/^\/(eventseries|event|tickets)\//i.test(href)) return;
            seen.add(href);

            let img = $(el).find('img').first().attr('src') || '';
            if (img && !img.startsWith('http')) img = 'https://www.eventim.ro' + img;

            teasers.push({
                title: titlu,
                href: href.startsWith('http') ? href : 'https://www.eventim.ro' + href,
                image: img,
            });
        });
        console.log(`  → ${teasers.length} teasers găsiți, fetch detalii (max 30)...`);

        // 2. Fetch pe pagina fiecărui eveniment (cu Puppeteer, secvențial — Cloudflare
        //    blochează axios și pe paginile individuale). Limităm la 20 pentru viteză.
        const top = teasers.slice(0, 20);
        const eventi = [];

        for (const t of top) {
            try {
                const html = await fetchPageHtml(t.href, { waitMs: 3000 });
                if (!html) continue;
                const $$ = cheerio.load(html);
                const bodyText = $$('body').text().replace(/\s+/g, ' ');
                const ogDesc = $$('meta[property="og:description"]').attr('content') || '';
                const fullText = bodyText + ' ' + ogDesc;

                    // Format date: "13 Mai 2026", "13.05.2026", "Mai 13, 2026"
                    let zi, luna, year;
                    const dm1 = fullText.match(/(\d{1,2})\s+(ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie|ian|feb|mar|apr|iun|iul|aug|sep|oct|nov|dec)\.?\s+(\d{4})/i);
                    const dm2 = fullText.match(/(\d{1,2})[\.\/](\d{1,2})[\.\/](\d{4})/);
                    if (dm1) {
                        zi = dm1[1].padStart(2,'0'); luna = dm1[2]; year = parseInt(dm1[3]);
                    } else if (dm2) {
                        zi = dm2[1].padStart(2,'0');
                        const monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
                        luna = monthNames[parseInt(dm2[2])-1] || 'JAN';
                        year = parseInt(dm2[3]);
                    } else return;

                    const timeM = fullText.match(/(\d{2}:\d{2})/);
                    // Locația: caută venue specific din Timișoara
                    const locM = fullText.match(/(?:Sala|Stadion|Centrul|Casa|Teatrul|Filarmonica|Berăria|Beraria|Arena|Iulius|Cinema|Park|Parcul)\s+[A-ZĂÂÎȘȚa-zăâîșț][^\.,\|]{2,60}/);
                    const locatie = locM ? locM[0].trim() : 'Timișoara';

                    const monthCode = dm1 ? getMonthCode(luna) : luna;
                eventi.push({
                    title: t.title.substring(0, 100),
                    location: locatie.substring(0, 100),
                    date: zi, month: monthCode, year,
                    time: timeM ? timeM[1] : '20:00',
                    price: 'Vezi pe Eventim',
                    image: t.image,
                    category: ghicesteCategoria(t.title, locatie),
                    website: t.href,
                });
            } catch { /* fetch eșuat — sărim peste */ }
        }

        console.log(`  → ${eventi.length} evenimente cu date complete`);
        for (const e of eventi) await saveEvent(e, 'EVENTIM');
    } catch (err) { console.error('[EVENTIM.RO] Eroare:', err.message); }
};

// ─── SCRAPER 14: BILETE.RO (Cloudflare) ──────────────────────────────────────

const scrapeBilete = async () => {
    try {
        console.log('[BILETE.RO] Scraping...');
        const urls = [
            'https://www.bilete.ro/cauta/?l=timisoara',
            'https://www.bilete.ro/categorii/timisoara/',
        ];
        let $;
        for (const url of urls) {
            $ = await loadWithPuppeteer(url, {
                waitSelector: '.event, [class*="event"], a[href*="/eveniment/"], .product',
                waitMs: 4000,
                scroll: true,
            });
            if ($ && ($('a[href*="/eveniment/"]').length > 0 || $('[class*="event"]').length > 2)) break;
        }
        if (!$) { console.log('[BILETE.RO] Inaccesibil.'); return; }

        const eventi = [];
        const seen = new Set();

        const collect = (el) => {
            const titlu = ($(el).find('h2,h3,h4,.title,.name,[class*="title"]').first().text().trim() ||
                          $(el).attr('title') || '').replace(/\s+/g, ' ');
            if (!titlu || titlu.length < 6 || seen.has(titlu)) return;

            const parent = $(el).closest('article,div,li,section').first();
            const container = parent.length ? parent : $(el);
            const text = container.text().replace(/\s+/g, ' ');

            const dm = text.match(/(\d{1,2})\s+(ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie|ian|feb|mar|apr|iun|iul|aug|sep|oct|nov|dec)\b\.?\s*(\d{4})?/i);
            if (!dm) return;

            const timeM = text.match(/(\d{2}:\d{2})/);
            const locatie = container.find('.venue,.location,[class*="venue"],[class*="location"]').first().text().trim() || 'Timișoara';

            seen.add(titlu);
            eventi.push({
                title: titlu.substring(0, 100),
                location: locatie.substring(0, 100),
                date: dm[1].padStart(2, '0'),
                month: getMonthCode(dm[2]),
                year: dm[3] ? parseInt(dm[3]) : null,
                time: timeM ? timeM[1] : '19:00',
                price: 'Vezi pe Bilete.ro',
                image: extractImage($, container, 'https://www.bilete.ro'),
                category: ghicesteCategoria(titlu, locatie),
                website: extractLink($, el, 'https://www.bilete.ro'),
            });
        };

        $('a[href*="/eveniment/"]').each((i, el) => collect(el));
        if (eventi.length === 0) {
            $('[class*="event"], .product, article').each((i, el) => collect(el));
        }

        console.log(`  → ${eventi.length} evenimente`);
        for (const e of eventi) await saveEvent(e, 'BILETE');
    } catch (err) { console.error('[BILETE.RO] Eroare:', err.message); }
};

// ─── SCRAPER 15: MYSTAGE.RO (SPA JavaScript) ─────────────────────────────────
// Format link: <a href="/spectacole/[slug]/date/[id]">
// Text intern: "[Tag opțional]TitluZi-săptămână, DD Luna - ora HH:MM[Locație, Oraș]"
// Notă: MyStage are evenimente din toată România — păstrăm toate, locația rămâne corectă.

const scrapeMyStage = async () => {
    try {
        console.log('[MYSTAGE] Scraping...');
        const urls = [
            'https://www.mystage.ro/category/concert-6',
            'https://www.mystage.ro/',
        ];
        const eventi = [];
        const seen = new Set();

        for (const url of urls) {
            const $ = await loadWithPuppeteer(url, {
                waitSelector: 'a[href*="/spectacole/"]',
                waitMs: 3500,
                scroll: true,
            });
            if (!$) continue;

            $('a[href*="/spectacole/"]').each((i, el) => {
                const href = $(el).attr('href') || '';
                if (!href || seen.has(href)) return;
                const text = $(el).text().replace(/\s+/g, ' ').trim();
                if (text.length < 20) return;

                // Pattern principal: "DD Luna - ora HH:MM"
                const dateTimeRx = /(\d{1,2})\s+(Ianuarie|Februarie|Martie|Aprilie|Mai|Iunie|Iulie|August|Septembrie|Octombrie|Noiembrie|Decembrie|Ian|Feb|Mar|Apr|Iun|Iul|Aug|Sep|Oct|Nov|Dec)\s*-?\s*ora\s+(\d{2}:\d{2})/i;
                const dtM = text.match(dateTimeRx);
                if (!dtM) return;

                // Titlul = text înainte de potrivire (eventual cu zi-săptămână)
                let titlu = text.substring(0, text.indexOf(dtM[0])).trim();
                // Eliminăm ziua săptămânii de la sfârșit (dacă există)
                titlu = titlu.replace(/(Luni|Marți|Marti|Miercuri|Joi|Vineri|Sâmbătă|Sambata|Duminică|Duminica),?\s*$/i, '').trim();
                // Curățăm tag-uri promo de la început
                titlu = titlu.replace(/^(Bine cotate|Sub reflector|Ultimele\s+\d+\s+bilete|Recomandate|Top vânzări|Sold out)/i, '').trim();
                if (!titlu || titlu.length < 4) return;

                // Locația = text după ora HH:MM
                const afterIdx = text.indexOf(dtM[0]) + dtM[0].length;
                const afterTime = text.substring(afterIdx).trim();
                let locatie = afterTime
                    .replace(/\d+(\.\d+)?\s*(Vezi locurile|Cumpără|Cumpara).*$/i, '')
                    .replace(/(Vezi locurile|Cumpără|Cumpara|Sold out).*$/i, '')
                    .trim();
                if (locatie.length < 3 || locatie.length > 100) locatie = 'România';

                seen.add(href);
                eventi.push({
                    title: titlu.substring(0, 100),
                    location: locatie.substring(0, 100),
                    date: dtM[1].padStart(2, '0'),
                    month: getMonthCode(dtM[2]),
                    year: null,
                    time: dtM[3],
                    price: 'Vezi pe MyStage',
                    image: $(el).find('img').first().attr('src') || '',
                    category: ghicesteCategoria(titlu, locatie),
                    website: href.startsWith('http') ? href : 'https://www.mystage.ro' + href,
                });
            });
        }

        console.log(`  → ${eventi.length} evenimente`);
        for (const e of eventi) await saveEvent(e, 'MYSTAGE');
    } catch (err) { console.error('[MYSTAGE] Eroare:', err.message); }
};

// ─── SCRAPER 16: CINEMACITY.RO (SPA pentru programul de cinema) ──────────────

const scrapeCinemaCity = async () => {
    try {
        console.log('[CINEMACITY] Scraping...');
        // Cinema City Iulius Mall Timișoara
        const $ = await loadWithPuppeteer('https://www.cinemacity.ro/cinemas/iulius-mall-timisoara/008', {
            waitSelector: '[class*="movie"], [class*="Movie"], .qb-movie, a[href*="/movie"]',
            waitMs: 5000,
            scroll: true,
        });
        if (!$) { console.log('[CINEMACITY] Inaccesibil.'); return; }

        const eventi = [];
        const seen = new Set();

        // Cinema City prezintă filme pe mai multe zile. Luăm filmele unice și folosim ziua curentă.
        $('a[href*="/movie"], [class*="movie"]').each((i, el) => {
            const titlu = ($(el).find('h2,h3,h4,[class*="title"]').first().text().trim() ||
                          $(el).attr('title') || $(el).text().trim()).replace(/\s+/g, ' ');
            if (!titlu || titlu.length < 3 || titlu.length > 80 || seen.has(titlu)) return;
            if (/program|cinema|bilet|rezerv|ora\s+\d/i.test(titlu)) return;

            seen.add(titlu);
            const today = new Date();
            const monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

            eventi.push({
                title: `Film: ${titlu}`.substring(0, 100),
                location: 'Cinema City Iulius Mall, Timișoara',
                date: String(today.getDate()).padStart(2, '0'),
                month: monthNames[today.getMonth()],
                year: today.getFullYear(),
                time: '19:00',
                price: 'Bilet cinema',
                image: extractImage($, $(el).closest('div,article,li'), 'https://www.cinemacity.ro'),
                category: 'Teatru', // categoria existentă cea mai potrivită pentru filme
                website: extractLink($, el, 'https://www.cinemacity.ro'),
            });
        });

        // Limităm la primele 30 filme pentru a nu inunda DB-ul
        const limited = eventi.slice(0, 30);
        console.log(`  → ${limited.length} filme`);
        for (const e of limited) await saveEvent(e, 'CINEMACITY');
    } catch (err) { console.error('[CINEMACITY] Eroare:', err.message); }
};

// ─── SCRAPER 17: HAPPENINGNEXT.COM (Aggregator internațional) ────────────────
// Structură reală: <div class="event-card card"> ce conține:
//   <a title="TITLU" href="https://happeningnext.com/event/...">
//   Text intern: "TITLU LOCAȚIE 29 May 2026 CATEGORIE"

const scrapeHappeningNext = async () => {
    try {
        console.log('[HAPPENINGNEXT] Scraping...');
        const $ = await loadWithPuppeteer('https://happeningnext.com/timisoara', {
            waitSelector: '.event-card',
            waitMs: 4000,
            scroll: true,
        });
        if (!$) { console.log('[HAPPENINGNEXT] Inaccesibil.'); return; }

        const eventi = [];
        const seen = new Set();

        $('.event-card').each((i, el) => {
            const link = $(el).find('a[href*="/event/"]').first();
            const titlu = (link.attr('title') || link.text().trim()).replace(/\s+/g, ' ');
            const href = link.attr('href') || '';
            if (!titlu || titlu.length < 4 || !href || seen.has(href)) return;

            const text = $(el).text().replace(/\s+/g, ' ').trim();
            // Format: "TITLU LOCATION DD MMM YYYY CATEGORY"
            const dmEN = text.match(/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})/i);
            if (!dmEN) return;

            // Locația = text între titlu și dată (curățat)
            const titleIdx = text.indexOf(titlu);
            const dateIdx = text.indexOf(dmEN[0]);
            let locatie = 'Timișoara';
            if (titleIdx >= 0 && dateIdx > titleIdx) {
                const between = text.substring(titleIdx + titlu.length, dateIdx).trim();
                if (between.length >= 3 && between.length <= 80) {
                    locatie = between;
                }
            }

            // Imagine: din [data-background-image] sau <img src>
            let img = link.attr('data-background-image') ||
                      $(el).find('[data-background-image]').first().attr('data-background-image') ||
                      $(el).find('img').first().attr('src') || '';
            // Curățăm URL-uri proxy allevents (sunt valide, dar pot fi mari)
            if (img && !img.startsWith('http')) img = 'https://happeningnext.com' + img;

            seen.add(href);
            eventi.push({
                title: titlu.substring(0, 100),
                location: locatie.substring(0, 100),
                date: dmEN[1].padStart(2, '0'),
                month: getMonthCode(dmEN[2]),
                year: parseInt(dmEN[3]),
                time: '19:00',
                price: 'Vezi detalii',
                image: img,
                category: ghicesteCategoria(titlu, locatie),
                website: href.startsWith('http') ? href : 'https://happeningnext.com' + href,
            });
        });

        console.log(`  → ${eventi.length} evenimente`);
        for (const e of eventi) await saveEvent(e, 'HAPPENINGNEXT');
    } catch (err) { console.error('[HAPPENINGNEXT] Eroare:', err.message); }
};

// ─── SCRAPER 18: EVENTBRITE.COM (SPA + protecții anti-bot) ───────────────────

const scrapeEventbrite = async () => {
    try {
        console.log('[EVENTBRITE] Scraping...');
        const $ = await loadWithPuppeteer('https://www.eventbrite.com/d/romania--timisoara/all-events/', {
            waitSelector: 'a[href*="/e/"], [data-testid*="event"], [class*="event-card"]',
            waitMs: 5000,
            scroll: true,
        });
        if (!$) { console.log('[EVENTBRITE] Inaccesibil.'); return; }

        const eventi = [];
        const seen = new Set();

        $('a[href*="/e/"]').each((i, el) => {
            const titlu = ($(el).find('h2,h3,h4,[class*="title"]').first().text().trim() ||
                          $(el).attr('aria-label') || '').replace(/\s+/g, ' ');
            if (!titlu || titlu.length < 6 || seen.has(titlu)) return;

            const parent = $(el).closest('article,section,div,li');
            const text = parent.text().replace(/\s+/g, ' ');

            // Format EN: "Sat, May 30, 7:00 PM" / "May 30"
            const dmEN = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})/i);
            if (!dmEN) return;

            const timeM = text.match(/(\d{1,2}):(\d{2})\s*(pm|am|PM|AM)?/);
            let time = '19:00';
            if (timeM) {
                let h = parseInt(timeM[1]);
                if (timeM[3] && /pm/i.test(timeM[3]) && h < 12) h += 12;
                if (timeM[3] && /am/i.test(timeM[3]) && h === 12) h = 0;
                time = String(h).padStart(2,'0') + ':' + timeM[2];
            }

            const locM = text.match(/(?:•|·|,)\s*([^•·,]{3,50}?(?:Timi[șs]oara|Timisoara)[^•·,]*)/i);
            const locatie = locM ? locM[1].trim() : 'Timișoara';

            seen.add(titlu);
            eventi.push({
                title: titlu.substring(0, 100),
                location: locatie.substring(0, 100),
                date: dmEN[2].padStart(2,'0'),
                month: getMonthCode(dmEN[1]),
                year: null,
                time, price: 'Vezi pe Eventbrite',
                image: extractImage($, parent, 'https://www.eventbrite.com'),
                category: ghicesteCategoria(titlu, locatie),
                website: extractLink($, el, 'https://www.eventbrite.com'),
            });
        });

        console.log(`  → ${eventi.length} evenimente`);
        for (const e of eventi) await saveEvent(e, 'EVENTBRITE');
    } catch (err) { console.error('[EVENTBRITE] Eroare:', err.message); }
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Conectat la MongoDB\n');

        usedImages = new Set(); // reset imagini per run

        await cleanPastEvents();
        await cleanDuplicateImages();

        // Scrapere axios + cheerio (rapide, pentru site-uri publice fără protecții)
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

        // Scrapere Puppeteer + Stealth (pentru site-uri Cloudflare / SPA-uri JavaScript)
        console.log('\n─── Pornesc scraperele Puppeteer ───\n');
        await scrapeEventim();
        await scrapeBilete();
        await scrapeMyStage();
        await scrapeCinemaCity();
        await scrapeHappeningNext();
        await scrapeEventbrite();

        // Închidem browser-ul Puppeteer (eliberare memorie)
        await closeBrowser();
        console.log('\n✓ Browser Puppeteer închis.');

        // Pas final: completează descrierile lipsă fetchând pagina fiecărui eveniment
        await enrichDescriptions();

        console.log('\n✓ Scraping finalizat.');
        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('Eroare generală:', err);
        try { await closeBrowser(); } catch {}
        process.exit(1);
    }
};

run();
