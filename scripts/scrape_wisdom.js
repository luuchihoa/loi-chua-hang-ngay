import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import fs from 'fs';
import { execSync } from 'child_process';

dotenv.config();

const TRANSLATION_ID = 1;

const books = [
    { id: 'job', name: 'Gióp', chapters: 42, urlSlug: 'sach-giop' },
    { id: 'pro', name: 'Châm Ngôn', chapters: 31, urlSlug: 'sach-cham-ngon' },
    { id: 'ecc', name: 'Giảng Viên', chapters: 12, urlSlug: 'sach-giang-vien' },
    { id: 'sng', name: 'Diễm Ca', chapters: 8, urlSlug: 'sach-diem-ca' },
    { id: 'wis', name: 'Khôn Ngoan', chapters: 19, urlSlug: 'sach-khon-ngoan' },
    { id: 'sir', name: 'Huấn Ca', chapters: 51, urlSlug: 'sach-huan-ca' }
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
    console.log("Starting Wisdom Books scraper...");
    const allVerses = [];
    
    for (const book of books) {
        console.log(`\n--- Starting book: ${book.name} ---`);
        for (let ch = 1; ch <= book.chapters; ch++) {
            const verses = await scrapeChapter(book, ch);
            console.log(`${book.name} Chapter ${ch}: found ${verses.length} verses`);
            allVerses.push(...verses);
        }
    }
    
    // Deduplicate
    const uniqueVerses = [];
    const seen = new Set();
    for (const v of allVerses) {
        const key = `${v.translation_id}-${v.book_id}-${v.chapter}-${v.verse_num}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueVerses.push(v);
        }
    }
    
    console.log(`\nTotal unique verses scraped across Wisdom Books: ${uniqueVerses.length}`);
    fs.writeFileSync('scripts/scraped_wisdom.json', JSON.stringify(uniqueVerses, null, 2));
    
    let sqlContent = `-- Dữ liệu sách Khôn Ngoan (${uniqueVerses.length} câu)\n`;
    sqlContent += `INSERT INTO verses (translation_id, book_id, chapter, verse_num, verse_text) VALUES\n`;
    
    const values = uniqueVerses.map(v => {
        const text = v.verse_text.replace(/'/g, "''");
        return `(${v.translation_id}, '${v.book_id}', ${v.chapter}, ${v.verse_num}, '${text}')`;
    });
    
    sqlContent += values.join(',\n') + `\nON CONFLICT (translation_id, book_id, chapter, verse_num) DO UPDATE \nSET verse_text = EXCLUDED.verse_text;\n`;
    
    fs.writeFileSync('database/wisdom_insert.sql', sqlContent);
    console.log("Generated database/wisdom_insert.sql successfully!");
}

main();
