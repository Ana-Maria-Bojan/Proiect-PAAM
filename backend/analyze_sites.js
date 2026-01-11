const axios = require('axios');
const fs = require('fs');

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

async function fetchSite(url, filename) {
    try {
        console.log(`Fetching ${url}...`);
        const response = await axios.get(url, { headers });
        fs.writeFileSync(filename, response.data);
        console.log(`Saved to ${filename}`);
    } catch (error) {
        console.error(`Error fetching ${url}:`, error.message);
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            fs.writeFileSync(filename, `Status: ${error.response.status}\nData: ${JSON.stringify(error.response.data)}`);
        }
    }
}

async function run() {
    await fetchSite('https://www.eventim.ro/ro/city/timisoara-67/', '../eventim.html');
    await fetchSite('https://www.onevent.ro/orase/timisoara/', '../onevent.html');
}

run();
