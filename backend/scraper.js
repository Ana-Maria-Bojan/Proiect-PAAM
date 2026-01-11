const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config(); // Încărcăm variabilele din .env
const Event = require('./models/Event');

// Mapare luni RO -> EN (3 litere)
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
    'dec': 'DEC', 'decembrie': 'DEC'
};

const getMonthCode = (mon) => {
    if (!mon) return 'JAN';
    const cleanMon = mon.toLowerCase().replace('.', '');
    return mapLuni[cleanMon] || 'JAN';
};

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

    // 4. Social (Jocuri, Ateliere, Networking etc.)
    if (t.includes('remi') || t.includes('rummy') || t.includes('board') || t.includes('joc') || t.includes('quiz') || t.includes('trivia') || t.includes('karaoke') || t.includes('atelier') || t.includes('workshop') || t.includes('degustare') || t.includes('networking') || t.includes('catan') || t.includes('carti') || t.includes('sah') || t.includes('social') || t.includes('meetup')) {
        return 'Social';
    }
    
    // 5. Concerte (Trebuie să fim specifici acum, nu mai e default)
    if (t.includes('concert') || t.includes('live') || t.includes('muzica') || t.includes('recital') || t.includes('trupa') || t.includes('formatia') || t.includes('band') || t.includes('simfonic') || t.includes('philharmonic') || t.includes('filarmonica') || t.includes('party') || t.includes('dj ') || t.includes('retro') || t.includes('rock') || t.includes('jazz') || t.includes('piano') ||
        l.includes('club') || l.includes('pub') || l.includes('discoteca') || l.includes('beraria')) {
        return 'Concerte';
    }

    // 6. Altele (Default pentru ce nu recunoaștem)
    return 'Altele'; 
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
            
            // Extragere imagine avansată (suport lazy loading)
            let imgElement = $(element).find('img');
            let imagine = imgElement.attr('src') || imgElement.attr('data-src') || imgElement.attr('data-original');
            
            // Uneori imaginea e în background-image pe un div
            if (!imagine) {
                const style = $(element).find('.image').attr('style'); // posibilă clasă .image sau similar
                if (style && style.includes('background-image')) {
                     const bgMatch = style.match(/url\(['"]?(.*?)['"]?\)/);
                     if (bgMatch) imagine = bgMatch[1];
                }
            }

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
                console.log(`[IABILET] ${evt.title} -> Categorie: ${result.category}`);
            } catch (err) {
                console.error(`Eroare la salvarea evenimentului ${evt.title}:`, err.message);
            }
        }

    } catch (error) {
        console.error('Eroare la scraping iabilet:', error);
    }
};

// --- 2. SCRAPER TIMISORENI.RO ---
const scrapeTimisoreni = async () => {
    try {
        console.log('Începem scanarea Timisoreni.ro...');
        const { data } = await axios.get('https://www.timisoreni.ro/evenimente/', { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } 
        });
        const $ = cheerio.load(data);
        const evenimenteNoi = [];

        // Structura pare a fi un h3 sau h6 cu link, urmat de detalii
        // Vom itera prin toate link-urile care au '/despre/' in href, care par a fi pagini de eveniment
        $('a[href*="/despre/"]').each((index, element) => {
            const link = $(element).attr('href');
            // Verificăm dacă e link complet sau relativ
            const fullLink = link.startsWith('http') ? link : `https://www.timisoreni.ro${link}`;
            
            const titlu = $(element).text().trim();
            // Încercăm să găsim containerul părinte sau elementele adiacente pentru dată și locație
            // Adesea în site-uri vechi, data e într-un tabel sau div imediat următor
            // Folosim o logică generică de "vecinătate"
            
            // Căutăm o imagine în apropiere (în sus sau în containerul părinte)
            let imgEl = $(element).closest('div').find('img');
            let imagine = imgEl.attr('src') || imgEl.attr('data-src');
            
            if (!imagine) {
                 // Uneori imaginea e într-un tag img precedent link-ului
                 imgEl = $(element).parent().prev().find('img');
                 imagine = imgEl.attr('src') || imgEl.attr('data-src');
            }
            
            // Dacă tot nu găsim, ne uităm în div-ul părinte al link-ului (poate e structură card)
             if (!imagine) {
                 imgEl = $(element).parents('div').first().find('img').first();
                 imagine = imgEl.attr('src') || imgEl.attr('data-src');
            }

            if (imagine && !imagine.startsWith('http')) {
                imagine = `https://www.timisoreni.ro${imagine}`;
            }

            // Data și Locația sunt mai greu de extras fara selector exact. 
            // Vom pune default-uri și ne bazăm pe titlu pentru categorie.
            // Pentru un scraper robust, am avea nevoie de structura exactă a HTML-ului.
            
            if (titlu && titlu.length > 3) {
                evenimenteNoi.push({
                    title: titlu,
                    location: 'Timișoara (vezi detalii)', // Placeholder, greu de extras fără selector precis
                    date: '1', 
                    month: 'JAN', // Default
                    time: '19:00',
                    price: 'Vezi site',
                    image: imagine || 'https://via.placeholder.com/300',
                    category: ghicesteCategoria(titlu, 'timisoara')
                });
            }
        });

        console.log(`[TIMISORENI.RO] Am găsit ${evenimenteNoi.length} evenimente (necesită rafinare selectori).`);
        for (const evt of evenimenteNoi) {
             // Evităm duplicatele cu titluri foarte scurte sau generice
             if (evt.title.length > 5) {
                const result = await Event.findOneAndUpdate({ title: evt.title }, evt, { upsert: true, new: true });
                console.log(`[TIMISORENI.RO] ${evt.title} -> Categorie: ${result.category}`);
             }
        }

    } catch (error) {
        console.error('Eroare la scraping Timisoreni.ro:', error.message);
    }
};

// --- 3. SCRAPER UPDATE: ONEVENT.RO ---
const scrapeOnEvent = async () => {
    try {
        console.log('Începem scanarea OnEvent.ro...');
        const { data } = await axios.get('https://www.onevent.ro/evenimente-in-orasul/timisoara/', {
             headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        const $ = cheerio.load(data);
        const evenimenteNoi = [];

        // Pe OnEvent, evenimentele par să fie link-uri care conțin '/evenimente/' si text bogat
        $('a[href*="/evenimente/"]').each((index, element) => {
            // Curățăm textul pentru a evita lipirea cuvintelor din tag-uri diferite (ex: <div>10</div><div>Ian</div> -> 10 Ian)
            // Clonez elementul pentru a nu afecta structura originală dacă ar conta (deși aici e doar un loop)
            const clonedEl = $(element).clone();
            
            // Adăugăm un spațiu după fiecare element copil pentru a separa textul concatenat
            clonedEl.find('*').each((i, child) => {
                $(child).after(' '); 
            });

            const rawText = clonedEl.text().replace(/\s+/g, ' ').trim(); 

            // Regex pentru a extrage data: ZiSaptamana ZiNumar Luna (Ex: Vin 09 Ian sau Sâm 10 Ian)
            // Permitem caractere opționale între ele
            const dateRegex = /^(Lun|Mar|Mie|Joi|Vin|Sam|Sâm|Dum)[a-z]*\s*(\d{1,2})\s*([a-zA-Zăâîșț]+)/i;
            const match = rawText.match(dateRegex);

            if (match) {
                // match[1] = Ziua Săpt (Vin)
                // match[2] = Ziua (09)
                // match[3] = Luna (Ian)
                // Curăță strict ziua să fie un număr
                const zi = match[2].replace(/\D/g, ''); 
                const lunaRaw = match[3];
                
                // Eliminăm partea de dată din text pentru a rămâne cu titlul
                // Construim stringul match-uit pentru a-l scoate
                const fullDateMatch = match[0];
                let restOfText = rawText.replace(fullDateMatch, '').trim();

                let titlu = restOfText;
                let locatie = 'Timișoara';

                // Extragem locația dacă există markerul specific (adesea caracterul  sau "Bilet")
                // Sau heuristic: Locația e la sfârșit.
                
                // Încercare de separare locatie
                if (titlu.includes('Timisoara')) {
                    const splitLoc = titlu.split('Timisoara');
                    titlu = splitLoc[0].trim();
                     // Curățăm caractere ciudate de la finalul titlului (ex: )
                    titlu = titlu.replace(/[\uE000-\uF8FF]/g, '').trim();
                    
                    locatie = 'Timisoara ' + (splitLoc[1] || '');
                    // Curățăm categoria din locație dacă apare
                    const categoriiPosibile = ['Concert', 'Teatru', 'Stand-up', 'Party', 'Festival', 'Sport'];
                    for (const cat of categoriiPosibile) {
                        if (locatie.includes(cat)) {
                             locatie = locatie.split(cat)[0];
                        }
                    }
                }

                // Curățăm titlul de alte date reziduale.
                
                // 3. Extragem ora exactă pentru a o folosi ulterior
                let time = '19:00';
                const timeMatch = rawText.match(/(\d{2}:\d{2})/);
                if (timeMatch) {
                    time = timeMatch[1];
                }

                // Curățare recursivă/iterativă a începutului de titlu pentru a scoate toate artefactele repetate
                // ex: "Ian 24) Dum 25 (Ian 25) 02:00 Havana Nights" -> curăță tot până la "Havana Nights"
                let previousTitlu = '';
                while (titlu !== previousTitlu) {
                    previousTitlu = titlu;
                    
                    const patterns = [
                        // Regex Zi Saptamana + Numar (ex: Dum 25)
                        /^(Lun|Mar|Mie|Joi|Vin|Sam|Sâm|Dum)[a-z]*\.?\s*\d{1,2}\s*/i,
                        
                        // Regex Luna + Numar, cu sau fara paranteze (ex: Ian 24, (Ian 25), Feb 16))
                        /^[\(\[]?(Ian|Feb|Mar|Apr|Mai|Iun|Iul|Aug|Sep|Oct|Nov|Dec|Jan)[a-z]*\.?\s*\d{1,2}[\)\]\.\,\-\:\s]*/i,
                        
                        // Regex Ora la inceput (ex: 02:00)
                        /^\d{2}:\d{2}\s*/,
                        
                        // Regex Numere cu paranteza ramase (ex: "9)")
                        /^\d{1,2}\)\s*/,
                        
                        // Garbage punctuation la inceput (spatii, paranteze, cratime)
                        /^[\s\)\(\-\.\,]+/
                    ];

                    for (const p of patterns) {
                        titlu = titlu.replace(p, '').trim();
                    }
                }


                
                const link = $(element).attr('href');
                
                // Extragere imagine îmbunătățită
                let imgEl = $(element).find('img');
                if (imgEl.length === 0) {
                     // Dacă nu e în link, căutăm în părinți apropiați (div-ul cardului)
                     imgEl = $(element).closest('div').parent().find('img'); 
                }
                
                let imagine = imgEl.attr('data-src') || imgEl.attr('data-lazy-src') || imgEl.attr('src') || imgEl.attr('srcset');
                // Adesea imaginile sunt in style background-image
                if (!imagine) {
                    const style = $(element).find('*[style*="background-image"]').attr('style');
                    if (style) {
                        const bgMatch = style.match(/url\(['"]?(.*?)['"]?\)/);
                        if (bgMatch) imagine = bgMatch[1];
                    }
                }

                // Uneori srcset conține URL-ul + size (ex: "url 300w"). Luăm primul.
                if (imagine && imagine.includes(' ')) {
                    imagine = imagine.split(' ')[0];
                }
                // Verificăm dacă e cale relativă
                if (imagine && !imagine.startsWith('http') && !imagine.startsWith('data:')) {
                     // Presupunem că domeniul e onevent.ro, dar atenție la cdn-uri
                     imagine = 'https://www.onevent.ro' + (imagine.startsWith('/') ? '' : '/') + imagine;
                }

                evenimenteNoi.push({
                    title: titlu.substring(0, 100), // Limităm lungimea
                    location: locatie.substring(0, 50),
                    date: zi,
                    month: getMonthCode(lunaRaw),
                    time: time,
                    price: 'Vezi detalii',
                    image: imagine || 'https://via.placeholder.com/300',
                    category: ghicesteCategoria(titlu, locatie)
                });
            }
        });

        console.log(`[ONEVENT.RO] Am găsit ${evenimenteNoi.length} evenimente.`);
        for (const evt of evenimenteNoi) {
             try {
                const result = await Event.findOneAndUpdate({ title: evt.title }, evt, { upsert: true, new: true });
                console.log(`[ONEVENT.RO] ${evt.title} -> Categorie: ${result.category}`);
             } catch (e) {
                console.error(`Eroare salvare ${evt.title}`, e.message);
             }
        }

    } catch (error) {
        console.error('Eroare la scraping OnEvent.ro:', error.message);
    }
};

// --- 4. SCRAPER EVENTIM.RO ---
const scrapeEventim = async () => {
    // Eventim are protecție puternică anti-bot (Cloudflare/Akamai) și randează dinamic.
    // Un simplu axios/cheerio scraper va primi 403 sau HTML incomplet.
    // Pentru a demonstra intenția, lăsăm un log. Recomandare: Folosiți API oficial sau Puppeteer/Selenium.
    console.log('[EVENTIM.RO] Skipping: Necesită browser automation sau API key (protecție anti-bot).');
};

const run = async () => {
    try {
        // Conectare la baza de date
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Scraper conectat la MongoDB');

        // --- CURATARE DB (Opțional: decomentează dacă vrei să ștergi totul înainte) ---
        console.log('Ștergem evenimentele vechi pentru a evita duplicatele...');
        await Event.deleteMany({});
        console.log('Baza de date a fost curățată.');
        
        // Rulăm scraping-ul pentru toate sursele
        await scrapeIaBilet();
        await scrapeTimisoreni();
        await scrapeOnEvent();
        await scrapeEventim();
        
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
