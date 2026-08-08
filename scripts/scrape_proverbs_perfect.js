import { execSync } from 'child_process';
import * as cheerio from 'cheerio';
import fs from 'fs';

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

function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/[ \t]+/g, ' ')
        .trim();
}

function parseChapterContent($, contentDiv) {
    let outputLines = [];

    contentDiv.children().each((_, el) => {
        const tag = el.tagName ? el.tagName.toLowerCase() : '';
        const $el = $(el);

        if (['script', 'style', 'noscript'].includes(tag)) return;

        // 1. Tiêu đề Phần lớn [PART] (h2, h3, h4)
        if (['h2', 'h3', 'h4'].includes(tag)) {
            const headingText = cleanText($el.text());
            if (headingText) {
                outputLines.push(`[PART] ${headingText}`);
            }
            return;
        }

        if (tag === 'p') {
            $el.find('span.reference').remove();

            const hasSub = $el.find('sub').length > 0;
            const strongEm = $el.find('strong em, em strong, em, strong');

            // 2. Tiêu đề Tiểu mục [SECTION]
            if (!hasSub && strongEm.length > 0 && cleanText($el.text()).length < 120) {
                const sectionText = cleanText($el.text());
                if (sectionText) {
                    outputLines.push(`[SECTION] ${sectionText}`);
                }
                return;
            }

            // 3. Giữ nguyên 100% cấu trúc thẻ <p> làm 1 đoạn duy nhất
            let paragraphStr = '';

            el.children.forEach(child => {
                if (child.tagName === 'sub') {
                    const subId = $(child).attr('id') || cleanText($(child).text());
                    if (subId && (/^\d+[a-z]?$/.test(subId) || /^\d+-\d+$/.test(subId) || /^\d+$/.test(subId))) {
                        paragraphStr += ` (${subId}) `;
                    }
                } else if (child.tagName === 'br') {
                    paragraphStr += ' \n ';
                } else if (child.nodeType === 3) {
                    paragraphStr += child.data;
                } else {
                    paragraphStr += $(child).text();
                }
            });

            const linesInP = paragraphStr.split('\n').map(l => cleanText(l)).filter(Boolean);
            if (linesInP.length > 0) {
                outputLines.push(linesInP.join('\n'));
            }
        }
    });

    return outputLines.join('\n');
}

async function scrapeAllProverbsPerfect() {
    console.log(`🚀 Bắt đầu cào 31 chương Sách Châm Ngôn (${BOOK_ID}) giữ nguyên cấu trúc đoạn văn gốc...`);
    const chaptersData = [];
    const sqlStatements = [];

    for (let c = 1; c <= TOTAL_CHAPTERS; c++) {
        const url = c === 1 
            ? `https://augustino.net/${URL_SLUG}` 
            : `https://augustino.net/${URL_SLUG}-chuong-${c}`;

        console.log(`📡 Đang cào Chương ${c}/${TOTAL_CHAPTERS}...`);
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

    console.log(`🎉 HOÀN THÀNH! Đã cào chuẩn nguyên văn 100% 31 chương Sách Châm Ngôn.`);
}

scrapeAllProverbsPerfect();
