import { execSync } from 'child_process';
import * as cheerio from 'cheerio';
import fs from 'fs';

const PENTATEUCH_BOOKS = [
    { id: 'st', name: 'Sách Sáng Thế', totalChapters: 50, slug: 'sach-sang-the', sqlFile: 'database/genesis_all_chapters.sql', jsonFile: 'scripts/genesis_all_chapters.json' },
    { id: 'xh', name: 'Sách Xuất Hành', totalChapters: 40, slug: 'sach-xuat-hanh', sqlFile: 'database/exodus_all_chapters.sql', jsonFile: 'scripts/exodus_all_chapters.json' },
    { id: 'lv', name: 'Sách Lê-vi', totalChapters: 27, slug: 'sach-le-vi', sqlFile: 'database/leviticus_all_chapters.sql', jsonFile: 'scripts/leviticus_all_chapters.json' },
    { id: 'ds', name: 'Sách Dân Số', totalChapters: 36, slug: 'sach-dan-so', sqlFile: 'database/numbers_all_chapters.sql', jsonFile: 'scripts/numbers_all_chapters.json' },
    { id: 'dn', name: 'Sách Đệ Nhị Luật', totalChapters: 34, slug: 'sach-de-nhi-luat', sqlFile: 'database/deuteronomy_all_chapters.sql', jsonFile: 'scripts/deuteronomy_all_chapters.json' }
];

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

async function scrapeBook(bookConfig) {
    console.log(`\n==================================================`);
    console.log(`🚀 Bắt đầu cào ${bookConfig.name} (${bookConfig.id}) - ${bookConfig.totalChapters} chương...`);
    console.log(`==================================================`);
    
    const chaptersData = [];
    const sqlStatements = [];

    for (let c = 1; c <= bookConfig.totalChapters; c++) {
        const url = c === 1 
            ? `https://augustino.net/${bookConfig.slug}` 
            : `https://augustino.net/${bookConfig.slug}-chuong-${c}`;

        process.stdout.write(`📡 Cào Chương ${c}/${bookConfig.totalChapters}... `);
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
                book_id: bookConfig.id,
                chapter: c,
                content: chapterContent
            });

            const escapedContent = chapterContent.replace(/'/g, "''");
            sqlStatements.push(`INSERT INTO chapters (translation_id, book_id, chapter, content) VALUES (1, '${bookConfig.id}', ${c}, '${escapedContent}') ON CONFLICT (translation_id, book_id, chapter) DO UPDATE SET content = EXCLUDED.content;`);
            console.log(`✅ Thành công (${chapterContent.length} ký tự).`);
        }
    }

    fs.writeFileSync(bookConfig.jsonFile, JSON.stringify(chaptersData, null, 2), 'utf-8');
    fs.writeFileSync(bookConfig.sqlFile, sqlStatements.join('\n\n'), 'utf-8');

    console.log(`🎉 HOÀN THÀNH ${bookConfig.name}!`);
    console.log(`📄 SQL: ${bookConfig.sqlFile}`);
    console.log(`📄 JSON: ${bookConfig.jsonFile}`);
}

async function scrapeAllPentateuch() {
    for (const book of PENTATEUCH_BOOKS) {
        await scrapeBook(book);
    }
    console.log(`\n🏆 TẤT CẢ 5 SÁCH BỘ NGŨ THƯ (SÁNG THẾ, XUẤT HÀNH, LÊ-VI, DÂN SỐ, ĐỆ NHỊ LUẬT) ĐÃ CÀO XONG 100%!`);
}

scrapeAllPentateuch();
