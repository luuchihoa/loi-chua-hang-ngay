import { execSync } from 'child_process';
import * as cheerio from 'cheerio';

const html = execSync('curl -sL "https://augustino.net"').toString();
const $ = cheerio.load(html);

const links = new Set();
$('a').each((_, el) => {
    const href = $(el).attr('href');
    if (href && href.startsWith('https://augustino.net/')) {
        links.add(href);
    }
});

console.log(`Found ${links.size} unique links on homepage:`);
Array.from(links).slice(0, 40).forEach(l => console.log(l));
