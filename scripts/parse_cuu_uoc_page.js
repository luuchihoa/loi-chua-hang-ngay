import { execSync } from 'child_process';
import * as cheerio from 'cheerio';

const html = execSync('curl -sL "https://augustino.net/kinh-thanh-cuu-uoc"').toString();
const $ = cheerio.load(html);

console.log("=== ALL OLD TESTAMENT BOOK LINKS ===");
$('a').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && text) {
        console.log(`${text} => ${href}`);
    }
});
