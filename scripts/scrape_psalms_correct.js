import { execSync } from 'child_process';
import * as cheerio from 'cheerio';
import fs from 'fs';

const BOOK_ID = 'tv';
const TOTAL_CHAPTERS = 150;
const SQL_FILE = 'database/psalms_all_chapters.sql';
const JSON_FILE = 'scripts/psalms_all_chapters.json';

function fetchHtml(url) {
    try {
        const stdout = execSync(`curl -sL "${url}"`, { maxBuffer: 10 * 1024 * 1024, timeout: 15000 });
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

            if (!hasSub && strongEm.length > 0 && cleanText($el.text()).length < 120) {
                const sectionText = cleanText($el.text());
                if (sectionText) {
                    outputLines.push(`[SECTION] ${sectionText}`);
                }
                return;
            }

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

    let result = outputLines.join('\n');
    const introNote = "Nguyên văn theo Kinh Thánh Công Giáo, bản dịch của Nhóm Các Giờ Kinh Phụng Vụ. Phần audio do Giu-se Định và Ma-ri-a Kim Hồi, cùng các anh chị em thanhlinh.net thực hiện.";
    result = result.replace(introNote, '').trim();

    return result;
}

async function scrapeAllPsalms() {
    console.log(`🚀 Bắt đầu cào chuẩn xác 150 Thánh Vịnh (${BOOK_ID})...`);
    const chaptersData = [];
    const sqlStatements = [];

    for (let c = 1; c <= TOTAL_CHAPTERS; c++) {
        const url = c === 1 
            ? `https://augustino.net/sach-thanh-vinh` 
            : `https://augustino.net/thanh-vinh-${c}`;

        process.stdout.write(`📡 Cào Thánh Vịnh ${c}/${TOTAL_CHAPTERS}... `);
        const html = fetchHtml(url);
        if (!html) {
            console.log(`❌ Thất bại!`);
            continue;
        }

        const $ = cheerio.load(html);
        const contentDiv = $('#page-content').length ? $('#page-content') : $('.content');
        if (!contentDiv.length) {
            console.log(`❌ Thất bại!`);
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

    console.log(`🎉 HOÀN THÀNH 150 THÁNH VỊNH!`);
    console.log(`📄 SQL: ${SQL_FILE}`);
    console.log(`📄 JSON: ${JSON_FILE}`);
}

scrapeAllPsalms();
