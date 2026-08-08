import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import fs from 'fs';
import { execSync } from 'child_process';

dotenv.config();

const TRANSLATION_ID = 1;

const books = [
    { id: 'isa', name: 'I-sai-a', chapters: 66, urlSlug: 'sach-ngon-su-i-sai-a' },
    { id: 'jer', name: 'Giê-rê-mi-a', chapters: 52, urlSlug: 'sach-ngon-su-gie-re-mi-a' },
    { id: 'lam', name: 'Ai Ca', chapters: 5, urlSlug: 'sach-ai-ca' },
    { id: 'bar', name: 'Ba-rúc', chapters: 6, urlSlug: 'sach-ba-ruc' },
    { id: 'ezk', name: 'Ê-dê-ki-en', chapters: 48, urlSlug: 'sach-ngon-su-e-de-ki-en' },
    { id: 'dan', name: 'Đa-ni-en', chapters: 14, urlSlug: 'sach-ngon-su-da-ni-en' },
    { id: 'hos', name: 'Hô-sê', chapters: 14, urlSlug: 'sach-ngon-su-ho-se' },
    { id: 'jol', name: 'Giô-en', chapters: 4, urlSlug: 'sach-ngon-su-gio-en' },
    { id: 'amo', name: 'A-mốt', chapters: 9, urlSlug: 'sach-ngon-su-a-mot' },
    { id: 'oba', name: 'Ô-va-đi-a', chapters: 1, urlSlug: 'sach-ngon-su-o-va-di-a' },
    { id: 'jon', name: 'Giô-na', chapters: 4, urlSlug: 'sach-ngon-su-gio-na' },
    { id: 'mic', name: 'Mi-kha', chapters: 7, urlSlug: 'sach-ngon-su-mi-kha' },
    { id: 'nam', name: 'Na-hum', chapters: 3, urlSlug: 'sach-ngon-su-na-khum' },
    { id: 'hab', name: 'Ha-ba-cúc', chapters: 3, urlSlug: 'sach-ngon-su-kha-ba-cuc' },
    { id: 'zep', name: 'Xô-phô-ni-a', chapters: 3, urlSlug: 'sach-ngon-su-xo-pho-ni-a' },
    { id: 'hag', name: 'Khắc-gai', chapters: 2, urlSlug: 'sach-ngon-su-khac-gai' },
    { id: 'zec', name: 'Da-ca-ri-a', chapters: 14, urlSlug: 'sach-ngon-su-da-ca-ri-a' },
    { id: 'mal', name: 'Ma-la-khi', chapters: 3, urlSlug: 'sach-ngon-su-ma-la-khi' }
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
    
    let url = '';
    if (book.id === 'lam' && chapterNum > 1) {
        url = `https://augustino.net/${book.urlSlug}-bai-${chapterNum}`;
    } else {
        url = chapterNum === 1 
            ? `https://augustino.net/${book.urlSlug}` 
            : `https://augustino.net/${book.urlSlug}-chuong-${chapterNum}`;
    }
    
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
    console.log("Starting Prophetic Books scraper...");
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
    
    console.log(`\nTotal unique verses scraped across Prophetic Books: ${uniqueVerses.length}`);
    fs.writeFileSync('scripts/scraped_prophets.json', JSON.stringify(uniqueVerses, null, 2));
    console.log("Generated scripts/scraped_prophets.json successfully!");
}

main();
