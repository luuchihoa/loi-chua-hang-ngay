import { execSync } from 'child_process';
import * as cheerio from 'cheerio';
import fs from 'fs';

const HISTORICAL_BOOKS = [
    { id: 'js', name: 'Sách Giô-suê', totalChapters: 24, slug: 'sach-gio-sue', sqlFile: 'database/joshua_all_chapters.sql', jsonFile: 'scripts/joshua_all_chapters.json' },
    { id: 'tl', name: 'Sách Thủ Lãnh', totalChapters: 21, slug: 'sach-thu-lanh', sqlFile: 'database/judges_all_chapters.sql', jsonFile: 'scripts/judges_all_chapters.json' },
    { id: 'rt', name: 'Sách Rút-tơ', totalChapters: 4, slug: 'sach-rut', sqlFile: 'database/ruth_all_chapters.sql', jsonFile: 'scripts/ruth_all_chapters.json' },
    { id: '1sm', name: 'Sách 1 Sa-mu-en', totalChapters: 31, slug: 'sach-sa-mu-en-1', sqlFile: 'database/samuel1_all_chapters.sql', jsonFile: 'scripts/samuel1_all_chapters.json' },
    { id: '2sm', name: 'Sách 2 Sa-mu-en', totalChapters: 24, slug: 'sach-sa-mu-en-2', sqlFile: 'database/samuel2_all_chapters.sql', jsonFile: 'scripts/samuel2_all_chapters.json' },
    { id: '1v', name: 'Sách 1 Vua', totalChapters: 22, slug: 'sach-cac-vua-1', sqlFile: 'database/kings1_all_chapters.sql', jsonFile: 'scripts/kings1_all_chapters.json' },
    { id: '2v', name: 'Sách 2 Vua', totalChapters: 25, slug: 'sach-cac-vua-2', sqlFile: 'database/kings2_all_chapters.sql', jsonFile: 'scripts/kings2_all_chapters.json' },
    { id: '1sb', name: 'Sách 1 Sử Biên', totalChapters: 29, slug: 'sach-su-bien-1', sqlFile: 'database/chronicles1_all_chapters.sql', jsonFile: 'scripts/chronicles1_all_chapters.json' },
    { id: '2sb', name: 'Sách 2 Sử Biên', totalChapters: 36, slug: 'sach-su-bien-2', sqlFile: 'database/chronicles2_all_chapters.sql', jsonFile: 'scripts/chronicles2_all_chapters.json' },
    { id: 'er', name: 'Sách Én-ra', totalChapters: 10, slug: 'sach-et-ra', sqlFile: 'database/ezra_all_chapters.sql', jsonFile: 'scripts/ezra_all_chapters.json' },
    { id: 'nk', name: 'Sách Nơ-khê-mi-a', totalChapters: 13, slug: 'sach-no-khe-mi-a', sqlFile: 'database/nehemiah_all_chapters.sql', jsonFile: 'scripts/nehemiah_all_chapters.json' },
    { id: 'tb', name: 'Sách Tô-bi-a', totalChapters: 14, slug: 'sach-to-bi-a', sqlFile: 'database/tobit_all_chapters.sql', jsonFile: 'scripts/tobit_all_chapters.json' },
    { id: 'gdt', name: 'Sách Giu-đi-ta', totalChapters: 16, slug: 'sach-giu-di-tha', sqlFile: 'database/judith_all_chapters.sql', jsonFile: 'scripts/judith_all_chapters.json' },
    { id: 'et', name: 'Sách Ét-te', totalChapters: 10, slug: 'sach-et-te', sqlFile: 'database/esther_all_chapters.sql', jsonFile: 'scripts/esther_all_chapters.json' },
    { id: '1mc', name: 'Sách 1 Ma-ca-bê', totalChapters: 16, slug: 'sach-ma-ca-be-1', sqlFile: 'database/maccabees1_all_chapters.sql', jsonFile: 'scripts/maccabees1_all_chapters.json' },
    { id: '2mc', name: 'Sách 2 Ma-ca-bê', totalChapters: 15, slug: 'sach-ma-ca-be-2', sqlFile: 'database/maccabees2_all_chapters.sql', jsonFile: 'scripts/maccabees2_all_chapters.json' }
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

async function scrapeAllHistorical() {
    for (const book of HISTORICAL_BOOKS) {
        await scrapeBook(book);
    }
    console.log(`\n🏆 TẤT CẢ 16 SÁCH LỊCH SỬ ĐÃ ĐƯỢC CÀO XONG 100%!`);
}

scrapeAllHistorical();
