import { execSync } from 'child_process';
import * as cheerio from 'cheerio';

const keywords = ['samuen', 'vua', 'su-bien', 'giu-di-ta', 'macabe', 'mac-ca-be'];

keywords.forEach(kw => {
    const url = `https://augustino.net/?s=${kw}`;
    try {
        const html = execSync(`curl -sL "${url}"`).toString();
        const $ = cheerio.load(html);
        console.log(`\n=== SEARCH RESULTS FOR "${kw}" ===`);
        $('article h2 a, h3 a, .entry-title a').each((_, el) => {
            console.log(`${$(el).text().trim()} => ${$(el).attr('href')}`);
        });
    } catch (e) {
        console.error(`Error searching ${kw}: ${e.message}`);
    }
});
