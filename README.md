# Unde mergem? — Platformă mobilă cu AI pentru agregarea evenimentelor din Timișoara

Aplicație mobilă (React Native + Expo) cu server propriu (Node.js + Express + MongoDB), care colectează automat evenimentele din Timișoara prin web scraping, le procesează cu inteligență artificială (deduplicare semantică, categorizare automată, asistent conversațional) și le prezintă unificat utilizatorului.

---

## 1. Adresa repository-ului

> **Repository public:** https://github.com/Ana-Maria-Bojan/Proiect-PAAM.git

**Structura proiectului:**
- **`backend/`** — server Express (API REST), modele MongoDB, web scraping, integrare AI
- **`mobile-app/`** — aplicația mobilă React Native (Expo)
- **`.github/workflows/`** — colectarea zilnică automată a datelor (GitHub Actions)

---

## 2. Cerințe preliminare

- **Node.js** ≥ 18 și **npm**
- **Expo Go** instalat pe telefon — pentru lansarea în mod dezvoltare
- **Cont Expo** (gratuit) — doar pentru compilarea APK-ului
- Fișier **`.env`** cu cheile de acces — nu este inclus în repository, din motive de securitate

---

## 3. Pașii de compilare

Aplicația mobilă se compilează într-un fișier instalabil **APK** prin EAS Build:

```bash
cd mobile-app
npm install
npx eas login
npx eas build -p android --profile preview
```

La final, EAS afișează linkul de descărcare al fișierului `.apk`. Compilarea rulează în cloud și durează 10–20 de minute.

Serverul Node.js este interpretat și nu necesită compilare.

---

## 4. Pașii de instalare și lansare

### Serverul

```bash
cd backend
npm install
npm start
```

Înainte de pornire, se creează fișierul `backend/.env`:

```env
MONGODB_URI=<conexiunea MongoDB Atlas>
GEMINI_API_KEY=<cheia Google Gemini>
GROQ_API_KEY=<cheia Groq>
JWT_SECRET=<șir secret pentru autentificare>
```

Serverul pornește pe `http://localhost:5000`.

> O instanță publică rulează deja la `https://proiect-paam.onrender.com`, iar aplicația mobilă o folosește implicit — aplicația poate fi deci lansată și **fără** server local.

### Aplicația mobilă — mod dezvoltare

```bash
cd mobile-app
npm install
npx expo start
```

Se scanează codul QR din terminal cu **Expo Go** (telefonul și calculatorul, în aceeași rețea Wi-Fi).

### Aplicația mobilă — instalare APK

1. Se descarcă fișierul `.apk` rezultat la compilare
2. Se deschide pe telefon și se confirmă instalarea
3. Aplicația **„Unde mergem?"** funcționează de sine stătător, conectată la serverul public

### Colectarea datelor

Rulează **automat, zilnic**, prin GitHub Actions — baza de date se actualizează fără intervenție manuală.
