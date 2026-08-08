import { execSync } from 'child_process';
import * as cheerio from 'cheerio';
import fs from 'fs';

const PROPHETIC_BOOKS = [
    { id: 'is', name: 'Sách I-sai-a', totalChapters: 66, slug: 'sach-ngon-su-i-sai-a', sqlFile: 'database/isaiah_all_chapters.sql', jsonFile: 'scripts/isaiah_all_chapters.json' },
    { id: 'gr', name: 'Sách Giê-rê-mi-a', totalChapters: 52, slug: 'sach-ngon-su-gie-re-mi-a', sqlFile: 'database/jeremiah_all_chapters.sql', jsonFile: 'scripts/jeremiah_all_chapters.json' },
    { id: 'ac', name: 'Sách Ai Ca', totalChapters: 5, slug: 'sach-ai-ca', chapterUrlType: 'bai', sqlFile: 'database/lamentations_all_chapters.sql', jsonFile: 'scripts/lamentations_all_chapters.json' },
    { id: 'br', name: 'Sách Ba-rúc', totalChapters: 6, slug: 'sach-ba-ruc', sqlFile: 'database/baruch_all_chapters.sql', jsonFile: 'scripts/baruch_all_chapters.json' },
    { id: 'ed', name: 'Sách Ê-dê-ki-en', totalChapters: 48, slug: 'sach-ngon-su-e-de-ki-en', sqlFile: 'database/ezekiel_all_chapters.sql', jsonFile: 'scripts/ezekiel_all_chapters.json' },
    { id: 'dn', name: 'Sách Đa-ni-en', totalChapters: 14, slug: 'sach-ngon-su-da-ni-en', sqlFile: 'database/daniel_all_chapters.sql', jsonFile: 'scripts/daniel_all_chapters.json' },
    { id: 'hs', name: 'Sách Hô-sê', totalChapters: 14, slug: 'sach-ngon-su-ho-se', sqlFile: 'database/hosea_all_chapters.sql', jsonFile: 'scripts/hosea_all_chapters.json' },
    { id: 'ge', name: 'Sách Giô-en', totalChapters: 4, slug: 'sach-ngon-su-gio-en', sqlFile: 'database/joel_all_chapters.sql', jsonFile: 'scripts/joel_all_chapters.json' },
    { id: 'am', name: 'Sách A-mốt', totalChapters: 9, slug: 'sach-ngon-su-a-mot', sqlFile: 'database/amos_all_chapters.sql', jsonFile: 'scripts/amos_all_chapters.json' },
    { id: 'ov', name: 'Sách Ô-va-đi-a', totalChapters: 1, slug: 'sach-ngon-su-o-va-di-a', sqlFile: 'database/obadiah_all_chapters.sql', jsonFile: 'scripts/obadiah_all_chapters.json' },
    { id: 'gn', name: 'Sách Giô-na', totalChapters: 4, slug: 'sach-ngon-su-gio-na', sqlFile: 'database/jonah_all_chapters.sql', jsonFile: 'scripts/jonah_all_chapters.json' },
    { id: 'mk', name: 'Sách Mi-kha', totalChapters: 7, slug: 'sach-ngon-su-mi-kha', sqlFile: 'database/micah_all_chapters.sql', jsonFile: 'scripts/micah_all_chapters.json' },
    { id: 'nh', name: 'Sách Na-khum', totalChapters: 3, slug: 'sach-ngon-su-na-khum', sqlFile: 'database/nahum_all_chapters.sql', jsonFile: 'scripts/nahum_all_chapters.json' },
    { id: 'hb', name: 'Sách Kha-ba-cúc', totalChapters: 3, slug: 'sach-ngon-su-kha-ba-cuc', sqlFile: 'database/habakkuk_all_chapters.sql', jsonFile: 'scripts/habakkuk_all_chapters.json' },
    { id: 'xp', name: 'Sách Xô-phô-ni-a', totalChapters: 3, slug: 'sach-ngon-su-xo-pho-ni-a', sqlFile: 'database/zephaniah_all_chapters.sql', jsonFile: 'scripts/zephaniah_all_chapters.json' },
    { id: 'kg', name: 'Sách Khắc-gai', totalChapters: 2, slug: 'sach-ngon-su-khac-gai', sqlFile: 'database/haggai_all_chapters.sql', jsonFile: 'scripts/haggai_all_chapters.json' },
    { id: 'dcr', name: 'Sách Da-ca-ri-a', totalChapters: 14, slug: 'sach-ngon-su-da-ca-ri-a', sqlFile: 'database/zechariah_all_chapters.sql', jsonFile: 'scripts/zechariah_all_chapters.json' },
    { id: 'ml', name: 'Sách Ma-la-khi', totalChapters: 3, slug: 'sach-ngon-su-ma-la-khi', sqlFile: 'database/malachi_all_chapters.sql', jsonFile: 'scripts/malachi_all_chapters.json' }
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
        let url;
        if (c === 1) {
            url = `https://augustino.net/${bookConfig.slug}`;
        } else if (bookConfig.chapterUrlType === 'bai') {
            url = `https://augustino.net/${bookConfig.slug}-bai-${c}`;
        } else {
            url = `https://augustino.net/${bookConfig.slug}-chuong-${c}`;
        }

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

async function scrapeAllProphetic() {
    for (const book of PROPHETIC_BOOKS) {
        await scrapeBook(book);
    }
    console.log(`\n🏆 TẤT CẢ 18 SÁCH NGÔN SỨ ĐÃ ĐƯỢC CÀO XONG 100%!`);
}

scrapeAllProphetic();
