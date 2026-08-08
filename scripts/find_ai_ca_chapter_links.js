import { execSync } from 'child_process';
import * as cheerio from 'cheerio';

const html = execSync('curl -sL "https://augustino.net/sach-ai-ca"').toString();
const $ = cheerio.load(html);

console.log("=== CHAPTER LINKS ON SACH AI CA PAGE ===");
$('a').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && (href.includes('ai-ca') || text.includes('Chương'))) {
        console.log(`[${text}] => ${href}`);
    }
});
