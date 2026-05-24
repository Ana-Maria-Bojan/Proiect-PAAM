// Helper Google Gemini — embeddings pentru deduplicare semantică
// Folosește modelul text-embedding-004 (free tier, 768-dim vectors)

const { GoogleGenerativeAI } = require('@google/generative-ai');

if (!process.env.GEMINI_API_KEY) {
    console.warn('[GEMINI] ATENȚIE: GEMINI_API_KEY nu e setat în .env — deduplicarea semantică va fi dezactivată.');
}

const genAI = process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;
const embedModel = genAI ? genAI.getGenerativeModel({ model: 'text-embedding-004' }) : null;

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

module.exports = { generateEmbedding, cosineSimilarity };
