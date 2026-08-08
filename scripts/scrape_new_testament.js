import { execSync } from 'child_process';
import * as cheerio from 'cheerio';
import fs from 'fs';

const NT_BOOKS = [
    { id: 'mt', name: 'Sách Mát-thêu', totalChapters: 28, slug: 'tin-mung-theo-thanh-mat-theu', sqlFile: 'database/matthew_all_chapters.sql', jsonFile: 'scripts/matthew_all_chapters.json' },
    { id: 'mc', name: 'Sách Mác-cô', totalChapters: 16, slug: 'tin-mung-theo-thanh-mac-co', sqlFile: 'database/mark_all_chapters.sql', jsonFile: 'scripts/mark_all_chapters.json' },
    { id: 'lc', name: 'Sách Lu-ca', totalChapters: 24, slug: 'tin-mung-theo-thanh-lu-ca', sqlFile: 'database/luke_all_chapters.sql', jsonFile: 'scripts/luke_all_chapters.json' },
    { id: 'ga', name: 'Sách Gio-an', totalChapters: 21, slug: 'tin-mung-theo-thanh-gio-an', sqlFile: 'database/john_all_chapters.sql', jsonFile: 'scripts/john_all_chapters.json' },
    { id: 'cv', name: 'Sách Công Vụ Tông Đồ', totalChapters: 28, slug: 'sach-cong-vu-tong-do', sqlFile: 'database/acts_all_chapters.sql', jsonFile: 'scripts/acts_all_chapters.json' },
    { id: 'rm', name: 'Sách Rô-ma', totalChapters: 16, slug: 'thu-gui-tin-huu-ro-ma', sqlFile: 'database/romans_all_chapters.sql', jsonFile: 'scripts/romans_all_chapters.json' },
    { id: '1cr', name: 'Sách 1 Cô-rin-tô', totalChapters: 16, slug: 'thu-1-gui-tin-huu-co-rin-to', sqlFile: 'database/corinthians1_all_chapters.sql', jsonFile: 'scripts/corinthians1_all_chapters.json' },
    { id: '2cr', name: 'Sách 2 Cô-rin-tô', totalChapters: 13, slug: 'thu-2-gui-tin-huu-co-rin-to', sqlFile: 'database/corinthians2_all_chapters.sql', jsonFile: 'scripts/corinthians2_all_chapters.json' },
    { id: 'gl', name: 'Sách Ga-la-ti', totalChapters: 6, slug: 'thu-gui-tin-huu-ga-lat', sqlFile: 'database/galatians_all_chapters.sql', jsonFile: 'scripts/galatians_all_chapters.json' },
    { id: 'ep', name: 'Sách Ê-phê-xô', totalChapters: 6, slug: 'thu-gui-tin-huu-e-phe-xo', sqlFile: 'database/ephesians_all_chapters.sql', jsonFile: 'scripts/ephesians_all_chapters.json' },
    { id: 'pl', name: 'Sách Phi-líp-phê', totalChapters: 4, slug: 'thu-gui-tin-huu-phi-lip-phe', sqlFile: 'database/philippians_all_chapters.sql', jsonFile: 'scripts/philippians_all_chapters.json' },
    { id: 'cl', name: 'Sách Cô-lô-xê', totalChapters: 4, slug: 'thu-gui-tin-huu-co-lo-xe', sqlFile: 'database/colossians_all_chapters.sql', jsonFile: 'scripts/colossians_all_chapters.json' },
    { id: '1tx', name: 'Sách 1 Thê-xa-lô-ni-ca', totalChapters: 5, slug: 'thu-1-gui-tin-huu-the-xa-lo-ni-ca', sqlFile: 'database/thessalonians1_all_chapters.sql', jsonFile: 'scripts/thessalonians1_all_chapters.json' },
    { id: '2tx', name: 'Sách 2 Thê-xa-lô-ni-ca', totalChapters: 3, slug: 'thu-2-gui-tin-huu-the-xa-lo-ni-ca', sqlFile: 'database/thessalonians2_all_chapters.sql', jsonFile: 'scripts/thessalonians2_all_chapters.json' },
    { id: '1tm', name: 'Sách 1 Ti-mô-thê', totalChapters: 6, slug: 'thu-1-gui-ong-ti-mo-the', sqlFile: 'database/timothy1_all_chapters.sql', jsonFile: 'scripts/timothy1_all_chapters.json' },
    { id: '2tm', name: 'Sách 2 Ti-mô-thê', totalChapters: 4, slug: 'thu-2-gui-ong-ti-mo-the', sqlFile: 'database/timothy2_all_chapters.sql', jsonFile: 'scripts/timothy2_all_chapters.json' },
    { id: 'tt', name: 'Sách Ti-tô', totalChapters: 3, slug: 'thu-gui-ong-ti-to', sqlFile: 'database/titus_all_chapters.sql', jsonFile: 'scripts/titus_all_chapters.json' },
    { id: 'plm', name: 'Sách Phi-lê-môn', totalChapters: 1, slug: 'thu-gui-ong-phi-le-mon', sqlFile: 'database/philemon_all_chapters.sql', jsonFile: 'scripts/philemon_all_chapters.json' },
    { id: 'dt', name: 'Sách Do Thái', totalChapters: 13, slug: 'thu-gui-tin-huu-hip-ri', sqlFile: 'database/hebrews_all_chapters.sql', jsonFile: 'scripts/hebrews_all_chapters.json' },
    { id: 'gc', name: 'Sách Gia-cô-bê', totalChapters: 5, slug: 'thu-cua-thanh-gia-co-be', sqlFile: 'database/james_all_chapters.sql', jsonFile: 'scripts/james_all_chapters.json' },
    { id: '1pr', name: 'Sách 1 Phê-rô', totalChapters: 5, slug: 'thu-1-cua-thanh-phe-ro', sqlFile: 'database/peter1_all_chapters.sql', jsonFile: 'scripts/peter1_all_chapters.json' },
    { id: '2pr', name: 'Sách 2 Phê-rô', totalChapters: 3, slug: 'thu-2-cua-thanh-phe-ro', sqlFile: 'database/peter2_all_chapters.sql', jsonFile: 'scripts/peter2_all_chapters.json' },
    { id: '1ga', name: 'Sách 1 Gio-an', totalChapters: 5, slug: 'thu-1-cua-thanh-gio-an', sqlFile: 'database/john1_all_chapters.sql', jsonFile: 'scripts/john1_all_chapters.json' },
    { id: '2ga', name: 'Sách 2 Gio-an', totalChapters: 1, slug: 'thu-2-cua-thanh-gio-an', sqlFile: 'database/john2_all_chapters.sql', jsonFile: 'scripts/john2_all_chapters.json' },
    { id: '3ga', name: 'Sách 3 Gio-an', totalChapters: 1, slug: 'thu-3-cua-thanh-gio-an', sqlFile: 'database/john3_all_chapters.sql', jsonFile: 'scripts/john3_all_chapters.json' },
    { id: 'gd', name: 'Sách Giu-đa', totalChapters: 1, slug: 'thu-cua-thanh-giu-da', sqlFile: 'database/jude_all_chapters.sql', jsonFile: 'scripts/jude_all_chapters.json' },
    { id: 'kh', name: 'Sách Khải Huyền', totalChapters: 22, slug: 'sach-khai-huyen', sqlFile: 'database/revelation_all_chapters.sql', jsonFile: 'scripts/revelation_all_chapters.json' }
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

async function scrapeAllNewTestament() {
    for (const book of NT_BOOKS) {
        await scrapeBook(book);
    }
    console.log(`\n🏆 TẤT CẢ 27 SÁCH TÂN ƯỚC ĐÃ ĐƯỢC CÀO XONG 100%!`);
}

scrapeAllNewTestament();
