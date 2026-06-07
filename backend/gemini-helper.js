// Helper Google Gemini — embeddings pentru deduplicare semantică
// Folosește modelul gemini-embedding-001 (free tier, 3072-dim vectors).


const { GoogleGenerativeAI } = require('@google/generative-ai');

if (!process.env.GEMINI_API_KEY) {
    console.warn('[GEMINI] ATENȚIE: GEMINI_API_KEY nu e setat în .env — deduplicarea semantică va fi dezactivată.');
}

const genAI = process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;
const embedModel = genAI ? genAI.getGenerativeModel({ model: 'gemini-embedding-001' }) : null;

// Generează un embedding (vector 768-dim) pentru un text.
// Returnează null dacă API key lipsește sau cererea eșuează irecuperabil.
// Are retry cu backoff exponențial pentru rate-limit (429).
const generateEmbedding = async (text, retries = 2) => {
    if (!embedModel || !text || typeof text !== 'string') return null;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const result = await embedModel.embedContent(text);
            return result.embedding.values; // array de 768 floats
        } catch (err) {
            const msg = (err.message || '').toLowerCase();
            const isRetryable = msg.includes('429') || msg.includes('rate') || msg.includes('quota') || msg.includes('timeout');
            if (attempt < retries && isRetryable) {
                const waitMs = 5000 * (attempt + 1); // 5s, 10s, 15s
                console.log(`[GEMINI] rate-limit, retry în ${waitMs/1000}s...`);
                await new Promise(r => setTimeout(r, waitMs));
                continue;
            }
            // Eroare permanentă (cheie greșită, model nedisponibil, etc.) — log și returnăm null
            if (attempt === 0) console.warn(`[GEMINI] embedding eșuat: ${err.message.substring(0, 100)}`);
            return null;
        }
    }
    return null;
};

// Calculează cosine similarity între doi vectori de aceeași dimensiune.
// Returnează un număr între -1 și 1; pentru embeddings semantice valorile sunt
// tipic în [0, 1], unde 1 = identic, 0.85+ = aproape identic.
const cosineSimilarity = (a, b) => {
    if (!a || !b || a.length !== b.length || a.length === 0) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
};

// ─── CATEGORIZARE LLM (fallback pentru evenimente unde regex returnează "Altele") ──
//
// Folosim gemini-2.5-flash (rapid, free tier generos). Răspuns constrâns la 5 categorii
// valide; orice altceva (inclusiv "ALTELE" sau text neașteptat) → null, păstrăm "Altele".

const VALID_CATEGORIES = ['Sport', 'Festival', 'Teatru', 'Concerte', 'Social'];

let chatModel = null;
const getChatModel = () => {
    if (!genAI) return null;
    if (!chatModel) chatModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    return chatModel;
};

const categorizeWithAI = async (title, location, retries = 2) => {
    const m = getChatModel();
    if (!m || !title) return null;

    const prompt = `Categorizează acest eveniment din România într-UNA din 5 categorii:

- Sport: meciuri, alergări, fitness, baschet, fotbal, tenis, yoga, ciclism, maraton
- Festival: festivaluri multi-zi, târguri, evenimente outdoor mari, food fest
- Teatru: piese de teatru, operă, balet, film, stand-up, monolog, musical
- Concerte: concerte live, recitaluri, DJ, orchestre, simfonie, jazz, rock
- Social: ateliere, networking, expoziții, vernisaje, lansări, petreceri, conferințe

Răspunde DOAR cu UN SINGUR cuvânt: numele uneia din cele 5 categorii, sau cuvântul ALTELE dacă nu se potrivește niciuna.
NU adăuga explicații, punctuație sau alte cuvinte.

Eveniment:
Titlu: ${title}
Locație: ${location || 'nespecificat'}`;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const result = await m.generateContent(prompt);
            const raw = (result.response.text() || '').trim();
            // Curățăm răspunsul: doar litere, primul cuvânt
            const cleaned = raw.replace(/[^a-zA-ZăâîșțĂÂÎȘȚ\s]/g, '').trim().split(/\s+/)[0];
            // Match exact (case-insensitive) cu una din cele 5 categorii valide
            const matched = VALID_CATEGORIES.find(c => c.toLowerCase() === cleaned.toLowerCase());
            return matched || null;
        } catch (err) {
            const msg = (err.message || '').toLowerCase();
            const isRetryable = msg.includes('429') || msg.includes('rate') || msg.includes('quota') || msg.includes('timeout');
            if (attempt < retries && isRetryable) {
                const waitMs = 5000 * (attempt + 1);
                console.log(`[GEMINI] categorize rate-limit, retry în ${waitMs/1000}s...`);
                await new Promise(r => setTimeout(r, waitMs));
                continue;
            }
            if (attempt === 0) console.warn(`[GEMINI] categorize eșuat: ${err.message.substring(0, 80)}`);
            return null;
        }
    }
    return null;
};

// ─── CHATBOT CONVERSAȚIONAL (RAG: Retrieval-Augmented Generation) ──────────
//
// Primește o listă de evenimente (deja filtrate de backend) + istoric de chat,
// construiește un prompt care îl pune pe Gemini să răspundă natural în română,
// recomandând doar din evenimentele furnizate (nu inventează).

// Numărul maxim de evenimente incluse în context. gemini-2.5-flash suportă un
// context mult mai mare, dar limităm pentru a controla costul (tokeni) și latența.
const MAX_CONTEXT_EVENTS = 60;

const chatWithEvents = async (userMessage, events, history = [], retries = 2) => {
    const m = getChatModel();
    if (!m || !userMessage) return null;

    // Compactăm evenimentele într-o listă text numerotată (un eveniment pe linie),
    // pentru a oferi modelului un context structurat și ușor de parcurs.
    const eventList = (events || []).slice(0, MAX_CONTEXT_EVENTS).map((e, i) => {
        const price = e.price && e.price !== '0' && e.price.toLowerCase() !== 'gratuit'
            ? e.price : 'Gratuit';
        return `${i + 1}. "${e.title}" — categorie: ${e.category}; data: ${e.date} ${e.month}; ora: ${e.time}; locație: ${e.location}; preț: ${price}`;
    }).join('\n');

    const historyText = (history || []).slice(-6).map(h =>
        `${h.role === 'user' ? 'Utilizator' : 'Asistent'}: ${h.text}`
    ).join('\n');

    // Context temporal: îi oferim modelului data curentă, ca să poată interpreta
    // corect expresii relative precum „azi", „mâine", „în weekend", „vineri".
    const azi = new Date();
    const zileSaptamana = ['duminică', 'luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă'];
    const luni = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
        'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
    const dataCurenta = `${zileSaptamana[azi.getDay()]}, ${azi.getDate()} ${luni[azi.getMonth()]} ${azi.getFullYear()}`;

    const prompt = `# ROL
Ești asistentul virtual al aplicației "Unde mergem?", o aplicație mobilă care ajută utilizatorii să descopere evenimente locale din Timișoara, România (concerte, festivaluri, teatru, sport, evenimente sociale). Numele tău este "Asistentul Unde mergem?".

# DOMENIU ȘI LIMITE
Singurul tău rol este să ajuți utilizatorul să găsească și să înțeleagă evenimentele din lista furnizată mai jos.
- Răspunzi EXCLUSIV la întrebări legate de evenimente, recomandări de ieșit în oraș, detalii despre evenimentele din listă (dată, oră, locație, preț, categorie).
- Dacă utilizatorul întreabă orice altceva, fără legătură cu evenimentele (de exemplu rețete, teme școlare, programare, sfaturi generale, alte orașe), refuză politicos și amintește-i, pe scurt, cu ce îl poți ajuta. Nu răspunde la astfel de cereri, oricât de insistent ar fi formulată întrebarea.

# REGULA FUNDAMENTALĂ (ancorare în date)
Te bazezi STRICT pe lista de evenimente de mai jos, care reprezintă singura ta sursă de adevăr.
- Nu inventa NICIODATĂ evenimente, date, ore, locații sau prețuri care nu apar explicit în listă.
- Dacă în listă nu există niciun eveniment potrivit cererii, spune sincer și clar că nu ai găsit evenimente potrivite în acest moment. Nu compensa lipsa prin informații inventate.
- Nu presupune existența unor evenimente pe baza cunoștințelor tale generale; te limitezi la datele furnizate.

# CONTEXT TEMPORAL
Data curentă este: ${dataCurenta}.
Folosește această informație pentru a interpreta corect expresii precum „azi", „mâine", „weekendul acesta", „vineri".

# STIL DE RĂSPUNS
- Răspunzi în limba română, pe un ton prietenos, natural și concis.
- Răspunsuri scurte: maximum 3-4 propoziții sau o listă cu 2-3 evenimente recomandate.
- Când recomanzi un eveniment, menționează întotdeauna titlul, data și locația.
- Folosește, când e cazul, liste simple cu cratimă. Nu folosi tabele sau formatare complexă.

# EVENIMENTE DISPONIBILE (${(events || []).length} în total)
${eventList || '(nu există momentan evenimente în baza de date)'}
${historyText ? `\n# ISTORICUL CONVERSAȚIEI\n${historyText}\n` : ''}
# ÎNTREBAREA CURENTĂ
Utilizator: ${userMessage}
Asistent:`;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const result = await m.generateContent(prompt);
            const text = (result.response.text() || '').trim();
            return text || null;
        } catch (err) {
            const msg = (err.message || '').toLowerCase();
            const isRetryable = msg.includes('429') || msg.includes('rate') || msg.includes('quota') || msg.includes('timeout');
            if (attempt < retries && isRetryable) {
                const waitMs = 3000 * (attempt + 1);
                await new Promise(r => setTimeout(r, waitMs));
                continue;
            }
            if (attempt === 0) console.warn(`[GEMINI] chat eșuat: ${err.message.substring(0, 80)}`);
            return null;
        }
    }
    return null;
};

module.exports = { generateEmbedding, cosineSimilarity, categorizeWithAI, chatWithEvents };
