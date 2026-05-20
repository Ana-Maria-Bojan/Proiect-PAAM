// Helper Puppeteer + Stealth pentru scraping pe site-uri protejate Cloudflare
// sau care randează conținutul dinamic în JavaScript.
// Browser-ul este lazy-initialized și reutilizat între scrapere pentru viteză.

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

let browser = null;
let browserPromise = null;

const launchBrowser = async () => {
    return puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--disable-features=IsolateOrigins,site-per-process',
            '--no-first-run',
            '--no-default-browser-check',
            '--lang=ro-RO,ro',
        ],
        defaultViewport: { width: 1366, height: 768 },
    });
};

const getBrowser = async () => {
    if (browser) return browser;
    if (browserPromise) return browserPromise;
    browserPromise = launchBrowser().then(b => { browser = b; return b; });
    return browserPromise;
};

const closeBrowser = async () => {
    if (browser) {
        try { await browser.close(); } catch {}
        browser = null;
        browserPromise = null;
    }
};

// Returnează HTML-ul randat al unei pagini.
// Opțiuni:
//   waitSelector: așteaptă să apară un anumit selector (max 15s)
//   waitMs: pauză suplimentară după load (ex: pentru Cloudflare challenge / lazy load)
//   scroll: scroll automat până jos pentru a declanșa lazy loading
//   timeout: timeout total navigare (default 45s)
const fetchPageHtml = async (url, {
    waitSelector = null,
    waitMs = 3000,
    scroll = false,
    timeout = 45000,
} = {}) => {
    const b = await getBrowser();
    const page = await b.newPage();
    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'ro-RO,ro;q=0.9,en-US;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        });
        // Acceleratoare: blocăm resurse irelevante pentru a reduce timpul de încărcare
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const type = req.resourceType();
            if (type === 'media' || type === 'font' || type === 'websocket') {
                return req.abort();
            }
            req.continue();
        });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout });

        if (waitSelector) {
            try { await page.waitForSelector(waitSelector, { timeout: 15000 }); }
            catch { /* selector lipsă – continuăm cu ce avem */ }
        }

        if (waitMs > 0) await new Promise(r => setTimeout(r, waitMs));

        if (scroll) {
            await page.evaluate(async () => {
                await new Promise((resolve) => {
                    let total = 0;
                    const distance = 400;
                    const timer = setInterval(() => {
                        const h = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        total += distance;
                        if (total >= h + 800) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, 250);
                });
            });
            await new Promise(r => setTimeout(r, 1500));
        }

        const html = await page.content();
        return html;
    } finally {
        try { await page.close(); } catch {}
    }
};

module.exports = { fetchPageHtml, closeBrowser, getBrowser };
