import { execSync } from 'child_process';
import * as cheerio from 'cheerio';

const html = execSync('curl -sL "https://augustino.net"').toString();
const $ = cheerio.load(html);

console.log("=== ALL LINKS ON HOMEPAGE ===");
$('a').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href) {
        console.log(`[${text}] => ${href}`);
    }
});
