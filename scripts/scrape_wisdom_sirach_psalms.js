import { execSync } from 'child_process';
import * as cheerio from 'cheerio';
import fs from 'fs';

const BOOKS = [
    { id: 'kn', name: 'Sách Khôn Ngoan', totalChapters: 19, slug: 'sach-khon-ngoan', sqlFile: 'database/wisdom_all_chapters.sql', jsonFile: 'scripts/wisdom_all_chapters.json' },
    { id: 'hc', name: 'Sách Huấn Ca', totalChapters: 51, slug: 'sach-huan-ca', sqlFile: 'database/sirach_all_chapters.sql', jsonFile: 'scripts/sirach_all_chapters.json' },
    { id: 'tv', name: 'Sách Thánh Vịnh', totalChapters: 150, slug: 'sach-thanh-vinh', sqlFile: 'database/psalms_all_chapters.sql', jsonFile: 'scripts/psalms_all_chapters.json' }
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
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // Bỏ các ô khoảng trắng vô hình
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
            // Loại bỏ các thẻ chú thích span.reference
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

            // 3. Xử lý đoạn văn <p>: Giữ nguyên toàn bộ nội dung của thẻ <p> làm 1 đoạn văn duy nhất
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

            // Làm sạch khoảng trắng nhưng giữ lại dấu \n do thẻ <br> tạo ra
            const linesInP = paragraphStr.split('\n').map(l => cleanText(l)).filter(Boolean);
            if (linesInP.length > 0) {
                outputLines.push(linesInP.join('\n'));
            }
        }
    });

    // Bỏ ghi chú trang web nếu có ở đầu
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
            console.log(`❌ Thất bại (Không tìm thấy khung nội dung)!`);
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
        } else {
            console.log(`⚠️ Rỗng!`);
        }
    }

    fs.writeFileSync(bookConfig.jsonFile, JSON.stringify(chaptersData, null, 2), 'utf-8');
    fs.writeFileSync(bookConfig.sqlFile, sqlStatements.join('\n\n'), 'utf-8');

    console.log(`🎉 HOÀN THÀNH ${bookConfig.name}!`);
    console.log(`📄 SQL: ${bookConfig.sqlFile}`);
    console.log(`📄 JSON: ${bookConfig.jsonFile}`);
}

async function scrapeAll() {
    for (const book of BOOKS) {
        await scrapeBook(book);
    }
    console.log(`\n🏆 TẤT CẢ 3 SÁCH (KHÔN NGOAN, HUẤN CA, THÁNH VỊNH) ĐÃ ĐƯỢC CÀO XONG 100%!`);
}

scrapeAll();
