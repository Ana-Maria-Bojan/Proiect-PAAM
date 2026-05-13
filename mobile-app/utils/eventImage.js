// Imagini sugestive pentru fiecare categorie (folosite când evenimentul nu are imagine)
// URL-uri Unsplash stabile (CDN-ul Unsplash garantează disponibilitatea pe URL direct)
const CATEGORY_FALLBACKS = {
  'Concerte':  'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80',
  'Teatru':    'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&q=80',
  'Sport':     'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&q=80',
  'Festival':  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80',
  'Social':    'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80',
  'Fluxul meu':'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&q=80',
  'Altele':    'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80',
};

const DEFAULT_FALLBACK = CATEGORY_FALLBACKS['Altele'];

// Detectează imagini "rele" (logo, placeholder, gol)
const isBadImage = (url) => {
  if (!url || typeof url !== 'string') return true;
  const u = url.toLowerCase().trim();
  if (u.length < 10) return true;
  if (!u.startsWith('http') && !u.startsWith('data:') && !u.startsWith('file:')) return true;
  return /\blogo\b|\bbanner\b|placeholder|via\.placeholder|no[-_]?image|sprite|favicon|default\.(jpg|png|svg|webp)/.test(u)
    || u.endsWith('.svg');
};

// Imaginea primară pentru un eveniment (cea de pe site, dacă e validă)
export const getEventImage = (event) => {
  if (!event) return DEFAULT_FALLBACK;
  if (event.image && !isBadImage(event.image)) return event.image;
  return CATEGORY_FALLBACKS[event.category] || DEFAULT_FALLBACK;
};

// Imaginea de fallback per categorie (folosită când cea primară eșuează la încărcare)
export const getCategoryFallback = (category) => {
  return CATEGORY_FALLBACKS[category] || DEFAULT_FALLBACK;
};
