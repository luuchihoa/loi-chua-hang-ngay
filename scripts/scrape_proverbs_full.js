import * as cheerio from 'cheerio';
import fs from 'fs';
import { execSync } from 'child_process';

const BOOK_ID = 'cn';
const TOTAL_CHAPTERS = 31;
const URL_SLUG = 'sach-cham-ngon';

function fetchHtml(url) {
    try {
        const stdout = execSync(`curl -sL "${url}"`, { maxBuffer: 10 * 1024 * 1024 });
        return stdout.toString();
    } catch (error) {
        console.error(`❌ Error fetching ${url}: ${error.message}`);
        return null;
    }
}

function parseChapterContent($, contentDiv) {
    let outputLines = [];

    contentDiv.find('p, h2, h3, div').each((_, el) => {
        const tag = el.tagName ? el.tagName.toLowerCase() : '';
        const $el = $(el);
        const text = $el.text().trim();
        if (!text) return;

        // 1. Tiêu đề Phần lớn [PART]
        if (['h2', 'h3'].includes(tag) || (tag === 'p' && $el.find('strong').length && text.toUpperCase() === text && text.length > 5 && !$el.find('sub').length)) {
            outputLines.push(`[PART] ${text}`);
            return;
        }

        // 2. Tiêu đề Tiểu mục [SECTION]
        if (tag === 'p' && ($el.find('em').length || $el.find('strong').length) && !$el.find('sub').length && text.length < 100) {
            outputLines.push(`[SECTION] ${text}`);
            return;
        }

        // 3. Xử lý câu Kinh Thánh trong thẻ <p>
        if (tag === 'p' && $el.find('sub').length) {
            let currentLine = '';
            
            el.children.forEach(child => {
                if (child.tagName === 'sub') {
                    const subId = $(child).attr('id') || $(child).text().trim();
                    if (/^\d+[a-z]?$/.test(subId) || /^\d+$/.test(subId) || /^\d+-\d+$/.test(subId)) {
                        if (currentLine.trim()) {
                            outputLines.push(currentLine.trim());
                            currentLine = '';
                        }
                        currentLine += `(${subId}) `;
                    }
                } else if (child.tagName === 'br') {
                    if (currentLine.trim()) {
                        outputLines.push(currentLine.trim());
                        currentLine = '';
                    }
                } else if (child.nodeType === 3) {
                    currentLine += child.data;
                } else {
                    currentLine += $(child).text();
                }
            });

            if (currentLine.trim()) {
                outputLines.push(currentLine.trim());
            }
        }
    });

    return outputLines.join('\n').replace(/ \n/g, '\n').replace(/\n\n+/g, '\n\n');
}

async function scrapeAllChapters() {
    console.log(`🚀 Bắt đầu cào 31 chương Sách Châm Ngôn (${BOOK_ID})...`);
    const chaptersData = [];
    const sqlStatements = [];

    for (let c = 1; c <= TOTAL_CHAPTERS; c++) {
        const url = c === 1 
            ? `https://augustino.net/${URL_SLUG}` 
            : `https://augustino.net/${URL_SLUG}-chuong-${c}`;

        console.log(`📡 Đang tải Chương ${c}/${TOTAL_CHAPTERS}...`);
        const html = fetchHtml(url);
        
        if (!html) continue;

        const $ = cheerio.load(html);
        const contentDiv = $('#page-content').length ? $('#page-content') : $('.content');

        if (!contentDiv.length) continue;

        const chapterContent = parseChapterContent($, contentDiv);

        if (chapterContent) {
            chaptersData.push({
                translation_id: 1,
                book_id: BOOK_ID,
                chapter: c,
                content: chapterContent
            });

            const escapedContent = chapterContent.replace(/'/g, "''");
            sqlStatements.push(`INSERT INTO chapters (translation_id, book_id, chapter, content) VALUES (1, '${BOOK_ID}', ${c}, '${escapedContent}') ON CONFLICT (translation_id, book_id, chapter) DO UPDATE SET content = EXCLUDED.content;`);
        }
    }

    fs.writeFileSync('scripts/proverbs_all_chapters.json', JSON.stringify(chaptersData, null, 2), 'utf-8');
    fs.writeFileSync('database/proverbs_all_chapters.sql', sqlStatements.join('\n\n'), 'utf-8');

    console.log(`🎉 HOÀN THÀNH! Đã cào thành công ${chaptersData.length}/${TOTAL_CHAPTERS} chương Sách Châm Ngôn.`);
    console.log(`📄 Đã sinh tệp JSON: scripts/proverbs_all_chapters.json`);
    console.log(`📄 Đã sinh tệp SQL: database/proverbs_all_chapters.sql`);
}

scrapeAllChapters();
