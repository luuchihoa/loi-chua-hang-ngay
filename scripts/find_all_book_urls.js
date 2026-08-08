import { execSync } from 'child_process';
import * as cheerio from 'cheerio';

const urls = [
    'https://augustino.net',
    'https://augustino.net/kinh-thanh',
    'https://augustino.net/cuu-uoc',
    'https://augustino.net/tan-uoc'
];

urls.forEach(u => {
    try {
        const html = execSync(`curl -sL "${u}"`).toString();
        const $ = cheerio.load(html);
        console.log(`\n=== LINKS FROM ${u} ===`);
        $('a').each((_, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            if (href && href.includes('augustino.net') && text) {
                console.log(`${text} => ${href}`);
            }
        });
    } catch (e) {
        console.error(`Error fetching ${u}: ${e.message}`);
    }
});
