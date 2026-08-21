import { execSync } from 'child_process';
import * as cheerio from 'cheerio';
import fs from 'fs';
import { parseChapterContent } from './bible_parser.js';

const BOOK_ID = 'lc';
const BOOK_NAME = 'Tin Mừng Lu-ca';
const TOTAL_CHAPTERS = 24;
const SLUG = 'tin-mung-theo-thanh-lu-ca';
const SQL_FILE = 'database/luke_all_chapters.sql';
const JSON_FILE = 'scripts/luke_all_chapters.json';

function fetchHtml(url) {
    try {
        const stdout = execSync(`curl -sL "${url}"`, { maxBuffer: 10 * 1024 * 1024, timeout: 15000 });
        return stdout.toString();
    } catch (error) {
        console.error(`❌ Lỗi khi tải ${url}: ${error.message}`);
        return null;
    }
}

async function scrapeAllLuke() {
    console.log(`==================================================`);
    console.log(`🚀 Bắt đầu cào ${BOOK_NAME} (${BOOK_ID}) - ${TOTAL_CHAPTERS} chương...`);
    console.log(`==================================================`);

    const chaptersData = [];
    const sqlStatements = [];

    for (let c = 1; c <= TOTAL_CHAPTERS; c++) {
        const url = c === 1 
            ? `https://augustino.net/${SLUG}` 
            : `https://augustino.net/${SLUG}-chuong-${c}`;

        process.stdout.write(`📡 Cào Chương ${c}/${TOTAL_CHAPTERS}... `);
        const html = fetchHtml(url);
        if (!html) {
            console.log(`❌ Thất bại!`);
            continue;
        }

        const $ = cheerio.load(html);
        const contentDiv = $('#page-content').length ? $('#page-content') : $('.content');
        if (!contentDiv.length) {
            console.log(`❌ Không tìm thấy nội dung!`);
            continue;
        }

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
            console.log(`✅ Thành công (${chapterContent.length} ký tự).`);
        }
    }

    fs.writeFileSync(JSON_FILE, JSON.stringify(chaptersData, null, 2), 'utf-8');
    fs.writeFileSync(SQL_FILE, sqlStatements.join('\n\n'), 'utf-8');

    console.log(`\n🎉 HOÀN THÀNH ${BOOK_NAME}!`);
    console.log(`📄 SQL: ${SQL_FILE}`);
    console.log(`📄 JSON: ${JSON_FILE}`);
}

scrapeAllLuke();
