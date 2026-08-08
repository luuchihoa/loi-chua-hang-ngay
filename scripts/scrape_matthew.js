import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import fs from 'fs';
import { execSync } from 'child_process';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TRANSLATION_ID = 1;
const BOOK_ID = 'mat';

function fetchHtml(url) {
    try {
        const stdout = execSync(`curl -sL "${url}"`);
        return stdout.toString();
    } catch (error) {
        throw new Error(`Failed to fetch ${url} using curl: ${error.message}`);
    }
}

async function scrapeChapter(chapterNum) {
    console.log(`Scraping chapter ${chapterNum}...`);
    const url = chapterNum === 1 
        ? "https://augustino.net/tin-mung-theo-thanh-mat-theu" 
        : `https://augustino.net/tin-mung-theo-thanh-mat-theu-chuong-${chapterNum}`;
    
    try {
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);
        const contentDiv = $('#page-content').length ? $('#page-content') : $('.content');
        
        if (!contentDiv.length) {
            console.error(`Could not find content for chapter ${chapterNum}`);
            return [];
        }

        const versesData = [];
        const subs = contentDiv.find('sub');
        
        subs.each((i, el) => {
            const idAttr = $(el).attr('id');
            if (!idAttr || !/^\d+$/.test(idAttr)) return;
            
            const verseNum = parseInt(idAttr, 10);
            
            // Collect text until next <sub>
            let verseNodes = [];
            let current = el.nextSibling;
            
            while (current) {
                if (current.tagName === 'sub' && /^\d+$/.test($(current).attr('id'))) {
                    break;
                }
                
                if (!['p', 'div', 'br', 'hr'].includes(current.tagName)) {
                    if (current.nodeType === 3) { // Text node
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
                                // Extract text up to firstSub
                                nextP.contents().each((idx, child) => {
                                    if (child === firstSub[0]) return false; // break loop
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
                    book_id: BOOK_ID,
                    chapter: chapterNum,
                    verse_num: verseNum,
                    verse_text: verseText
                });
            }
        });

        // Handle verse 1 implicitly (before sub id="2")
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
                        return; // continue
                    }
                    if (child.nodeType === 3) {
                        verse1Nodes.push(child.data);
                    } else {
                        verse1Nodes.push($(child).text());
                    }
                });
            });
            let verse1Text = verse1Nodes.join('').trim().replace(/\s+/g, ' ');
            verse1Text = verse1Text.replace(/\s*\d+$/, '').trim(); // Remove trailing digits if accidentally included
            
            if (verse1Text) {
                versesData.unshift({
                    translation_id: TRANSLATION_ID,
                    book_id: BOOK_ID,
                    chapter: chapterNum,
                    verse_num: 1,
                    verse_text: verse1Text
                });
            }
        }

        return versesData;

    } catch (e) {
        console.error(`Error scraping chapter ${chapterNum}:`, e.message);
        return [];
    }
}

async function main() {
    console.log("Starting Matthew scraper using Node.js...");
    const allVerses = [];
    
    for (let ch = 1; ch <= 28; ch++) {
        const verses = await scrapeChapter(ch);
        console.log(`Chapter ${ch}: found ${verses.length} verses`);
        allVerses.push(...verses);
    }
    
    console.log(`Total verses scraped: ${allVerses.length}`);
    fs.writeFileSync('scripts/scraped_matthew.json', JSON.stringify(allVerses, null, 2));
    
    // Generate SQL file
    let sqlContent = `-- Dữ liệu Tin Mừng Mát-thêu (1071 câu)\n`;
    sqlContent += `INSERT INTO verses (translation_id, book_id, chapter, verse_num, verse_text) VALUES\n`;
    
    const values = allVerses.map(v => {
        const text = v.verse_text.replace(/'/g, "''");
        return `(${v.translation_id}, '${v.book_id}', ${v.chapter}, ${v.verse_num}, '${text}')`;
    });
    
    sqlContent += values.join(',\n') + `\nON CONFLICT (translation_id, book_id, chapter, verse_num) DO NOTHING;\n`;
    
    fs.writeFileSync('database/matthew_insert.sql', sqlContent);
    console.log("Generated database/matthew_insert.sql successfully!");
}

main();
