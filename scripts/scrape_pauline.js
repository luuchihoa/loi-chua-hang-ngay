import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import fs from 'fs';
import { execSync } from 'child_process';

dotenv.config();

const TRANSLATION_ID = 1;

const books = [
    { id: 'rom', name: 'Rô-ma', chapters: 16, urlSlug: 'thu-gui-tin-huu-ro-ma' },
    { id: '1co', name: '1 Cô-rin-tô', chapters: 16, urlSlug: 'thu-1-gui-tin-huu-co-rin-to' },
    { id: '2co', name: '2 Cô-rin-tô', chapters: 13, urlSlug: 'thu-2-gui-tin-huu-co-rin-to' },
    { id: 'gal', name: 'Ga-la-ti', chapters: 6, urlSlug: 'thu-gui-tin-huu-ga-lat' },
    { id: 'eph', name: 'Ê-phê-xô', chapters: 6, urlSlug: 'thu-gui-tin-huu-e-phe-xo' },
    { id: 'php', name: 'Phi-líp-phê', chapters: 4, urlSlug: 'thu-gui-tin-huu-phi-lip-phe' },
    { id: 'col', name: 'Cô-lô-xê', chapters: 4, urlSlug: 'thu-gui-tin-huu-co-lo-xe' },
    { id: '1th', name: '1 Thê-xa-lô-ni-ca', chapters: 5, urlSlug: 'thu-1-gui-tin-huu-the-xa-lo-ni-ca' },
    { id: '2th', name: '2 Thê-xa-lô-ni-ca', chapters: 3, urlSlug: 'thu-2-gui-tin-huu-the-xa-lo-ni-ca' },
    { id: '1ti', name: '1 Ti-mô-thê', chapters: 6, urlSlug: 'thu-1-gui-ong-ti-mo-the' },
    { id: '2ti', name: '2 Ti-mô-thê', chapters: 4, urlSlug: 'thu-2-gui-ong-ti-mo-the' },
    { id: 'tit', name: 'Ti-tô', chapters: 3, urlSlug: 'thu-gui-ong-ti-to' },
    { id: 'phm', name: 'Phi-lê-môn', chapters: 1, urlSlug: 'thu-gui-ong-phi-le-mon' },
    { id: 'heb', name: 'Híp-ri', chapters: 13, urlSlug: 'thu-gui-tin-huu-hip-ri' }
];

function fetchHtml(url) {
    try {
        const stdout = execSync(`curl -sL "${url}"`);
        return stdout.toString();
    } catch (error) {
        throw new Error(`Failed to fetch ${url} using curl: ${error.message}`);
    }
}

async function scrapeChapter(book, chapterNum) {
    console.log(`Scraping ${book.name} - chapter ${chapterNum}...`);
    const url = chapterNum === 1 
        ? `https://augustino.net/${book.urlSlug}` 
        : `https://augustino.net/${book.urlSlug}-chuong-${chapterNum}`;
    
    try {
        const html = fetchHtml(url);
        const $ = cheerio.load(html);
        const contentDiv = $('#page-content').length ? $('#page-content') : $('.content');
        
        if (!contentDiv.length) {
            console.error(`Could not find content for ${book.name} chapter ${chapterNum}`);
            return [];
        }

        const versesData = [];
        const subs = contentDiv.find('sub');
        
        subs.each((i, el) => {
            const idAttr = $(el).attr('id');
            if (!idAttr || !/^\d+$/.test(idAttr)) return;
            
            const verseNum = parseInt(idAttr, 10);
            
            let verseNodes = [];
            let current = el.nextSibling;
            
            while (current) {
                if (current.tagName === 'sub' && /^\d+$/.test($(current).attr('id'))) {
                    break;
                }
                
                if (!['p', 'div', 'br', 'hr'].includes(current.tagName)) {
                    if (current.nodeType === 3) {
                        verseNodes.push(current.data);
                    } else {
                        verseNodes.push($(current).text());
                    }
                } else {
                    verseNodes.push(" ");
                }
                
                current = current.nextSibling;
                
                if (!current) {
                    const parent = $(el).parent();
                    if (parent.length) {
                        const nextP = parent.next('p, div');
                        if (nextP.length) {
                            const firstSub = nextP.find('sub').filter((idx, s) => /^\d+$/.test($(s).attr('id'))).first();
                            if (firstSub.length) {
                                nextP.contents().each((idx, child) => {
                                    if (child === firstSub[0]) return false;
                                    if (child.nodeType === 3) {
                                        verseNodes.push(child.data);
                                    } else {
                                        verseNodes.push($(child).text());
                                    }
                                });
                            } else {
                                verseNodes.push(nextP.text());
                            }
                        }
                    }
                }
            }
            
            let verseText = verseNodes.join('').trim().replace(/\s+/g, ' ');
            
            if (verseText) {
                versesData.push({
                    translation_id: TRANSLATION_ID,
                    book_id: book.id,
                    chapter: chapterNum,
                    verse_num: verseNum,
                    verse_text: verseText
                });
            }
        });

        const firstSub = contentDiv.find('sub#2');
        if (firstSub.length && !versesData.some(v => v.verse_num === 1)) {
            let verse1Nodes = [];
            let stop = false;
            contentDiv.find('p, div').each((i, el) => {
                if (stop) return false;
                $(el).contents().each((j, child) => {
                    if (child === firstSub[0]) {
                        stop = true;
                        return false;
                    }
                    if (child.tagName === 'sub' && /^\d+$/.test($(child).attr('id'))) {
                        return;
                    }
                    if (child.nodeType === 3) {
                        verse1Nodes.push(child.data);
                    } else {
                        verse1Nodes.push($(child).text());
                    }
                });
            });
            let verse1Text = verse1Nodes.join('').trim().replace(/\s+/g, ' ');
            verse1Text = verse1Text.replace(/\s*\d+$/, '').trim();
            
            if (verse1Text) {
                versesData.unshift({
                    translation_id: TRANSLATION_ID,
                    book_id: book.id,
                    chapter: chapterNum,
                    verse_num: 1,
                    verse_text: verse1Text
                });
            }
        }

        return versesData;

    } catch (e) {
        console.error(`Error scraping ${book.name} chapter ${chapterNum}:`, e.message);
        return [];
    }
}

async function main() {
    console.log("Starting Pauline Epistles scraper using Node.js...");
    const allVerses = [];
    
    for (const book of books) {
        console.log(`\n--- Starting book: ${book.name} ---`);
        for (let ch = 1; ch <= book.chapters; ch++) {
            const verses = await scrapeChapter(book, ch);
            console.log(`${book.name} Chapter ${ch}: found ${verses.length} verses`);
            allVerses.push(...verses);
        }
    }
    
    console.log(`\nTotal verses scraped across all Pauline Epistles: ${allVerses.length}`);
    fs.writeFileSync('scripts/scraped_pauline.json', JSON.stringify(allVerses, null, 2));
    
    let sqlContent = `-- Dữ liệu Thư Phao-lô (gồm cả Do Thái) (${allVerses.length} câu)\n`;
    sqlContent += `INSERT INTO verses (translation_id, book_id, chapter, verse_num, verse_text) VALUES\n`;
    
    const values = allVerses.map(v => {
        const text = v.verse_text.replace(/'/g, "''");
        return `(${v.translation_id}, '${v.book_id}', ${v.chapter}, ${v.verse_num}, '${text}')`;
    });
    
    sqlContent += values.join(',\n') + `\nON CONFLICT (translation_id, book_id, chapter, verse_num) DO NOTHING;\n`;
    
    fs.writeFileSync('database/pauline_insert.sql', sqlContent);
    console.log("Generated database/pauline_insert.sql successfully!");
}

main();
