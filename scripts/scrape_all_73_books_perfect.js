import fs from 'fs';
import * as cheerio from 'cheerio';
import { parseChapterContent, cleanText } from './bible_parser.js';

export const ALL_73_BOOKS = [
  // Cựu Ước - Ngũ Thư (5)
  { id: "st", name: "Sáng Thế", totalChapters: 50, slug: "sach-sang-the", sqlFile: "database/genesis_all_chapters.sql", jsonFile: "scripts/genesis_all_chapters.json" },
  { id: "xh", name: "Xuất Hành", totalChapters: 40, slug: "sach-xuat-hanh", sqlFile: "database/exodus_all_chapters.sql", jsonFile: "scripts/exodus_all_chapters.json" },
  { id: "lv", name: "Lê-vi", totalChapters: 27, slug: "sach-le-vi", sqlFile: "database/leviticus_all_chapters.sql", jsonFile: "scripts/leviticus_all_chapters.json" },
  { id: "ds", name: "Dân Số", totalChapters: 36, slug: "sach-dan-so", sqlFile: "database/numbers_all_chapters.sql", jsonFile: "scripts/numbers_all_chapters.json" },
  { id: "dnl", name: "Đệ Nhị Luật", totalChapters: 34, slug: "sach-de-nhi-luat", sqlFile: "database/deuteronomy_all_chapters.sql", jsonFile: "scripts/deuteronomy_all_chapters.json" },

  // Cựu Ước - Lịch Sử (16)
  { id: "gs", name: "Giô-suê", totalChapters: 24, slug: "sach-gio-sue", sqlFile: "database/joshua_all_chapters.sql", jsonFile: "scripts/joshua_all_chapters.json" },
  { id: "tl", name: "Thủ Lãnh", totalChapters: 21, slug: "sach-thu-lanh", sqlFile: "database/judges_all_chapters.sql", jsonFile: "scripts/judges_all_chapters.json" },
  { id: "r", name: "Rút", totalChapters: 4, slug: "sach-rut", sqlFile: "database/ruth_all_chapters.sql", jsonFile: "scripts/ruth_all_chapters.json" },
  { id: "1sm", name: "1 Sa-mu-en", totalChapters: 31, slug: "sach-sa-mu-en-1", sqlFile: "database/samuel1_all_chapters.sql", jsonFile: "scripts/samuel1_all_chapters.json" },
  { id: "2sm", name: "2 Sa-mu-en", totalChapters: 24, slug: "sach-sa-mu-en-2", sqlFile: "database/samuel2_all_chapters.sql", jsonFile: "scripts/samuel2_all_chapters.json" },
  { id: "1v", name: "1 Các Vua", totalChapters: 22, slug: "sach-cac-vua-1", sqlFile: "database/kings1_all_chapters.sql", jsonFile: "scripts/kings1_all_chapters.json" },
  { id: "2v", name: "2 Các Vua", totalChapters: 25, slug: "sach-cac-vua-2", sqlFile: "database/kings2_all_chapters.sql", jsonFile: "scripts/kings2_all_chapters.json" },
  { id: "1sb", name: "1 Sử Biên Niên", totalChapters: 29, slug: "sach-su-bien-1", sqlFile: "database/chronicles1_all_chapters.sql", jsonFile: "scripts/chronicles1_all_chapters.json" },
  { id: "2sb", name: "2 Sử Biên Niên", totalChapters: 36, slug: "sach-su-bien-2", sqlFile: "database/chronicles2_all_chapters.sql", jsonFile: "scripts/chronicles2_all_chapters.json" },
  { id: "er", name: "Ét-ra", totalChapters: 10, slug: "sach-et-ra", sqlFile: "database/ezra_all_chapters.sql", jsonFile: "scripts/ezra_all_chapters.json" },
  { id: "nhm", name: "Nê-he-mi-a", totalChapters: 13, slug: "sach-no-khe-mi-a", sqlFile: "database/nehemiah_all_chapters.sql", jsonFile: "scripts/nehemiah_all_chapters.json" },
  { id: "tb", name: "Tô-bi-a", totalChapters: 14, slug: "sach-to-bi-a", sqlFile: "database/tobit_all_chapters.sql", jsonFile: "scripts/tobit_all_chapters.json" },
  { id: "gdt", name: "Giu-đi-tha", totalChapters: 16, slug: "sach-giu-di-tha", sqlFile: "database/judith_all_chapters.sql", jsonFile: "scripts/judith_all_chapters.json" },
  { id: "et", name: "Ê-sơ-te", totalChapters: 10, slug: "sach-et-te", sqlFile: "database/esther_all_chapters.sql", jsonFile: "scripts/esther_all_chapters.json" },
  { id: "1mc", name: "1 Ma-ca-bê", totalChapters: 16, slug: "sach-ma-ca-be-1", sqlFile: "database/maccabees1_all_chapters.sql", jsonFile: "scripts/maccabees1_all_chapters.json" },
  { id: "2mc", name: "2 Ma-ca-bê", totalChapters: 15, slug: "sach-ma-ca-be-2", sqlFile: "database/maccabees2_all_chapters.sql", jsonFile: "scripts/maccabees2_all_chapters.json" },

  // Cựu Ước - Giáo Huấn (7)
  { id: "g", name: "Gióp", totalChapters: 42, slug: "sach-giop", sqlFile: "database/job_all_chapters.sql", jsonFile: "scripts/job_all_chapters.json" },
  { id: "tv", name: "Thánh Vịnh", totalChapters: 150, slug: "sach-thanh-vinh", urlType: "psalm", sqlFile: "database/psalms_all_chapters.sql", jsonFile: "scripts/psalms_all_chapters.json" },
  { id: "cn", name: "Châm Ngôn", totalChapters: 31, slug: "sach-cham-ngon", sqlFile: "database/proverbs_all_chapters.sql", jsonFile: "scripts/proverbs_all_chapters.json" },
  { id: "gv", name: "Giảng Viên", totalChapters: 12, slug: "sach-giang-vien", sqlFile: "database/ecclesiastes_all_chapters.sql", jsonFile: "scripts/ecclesiastes_all_chapters.json" },
  { id: "dc", name: "Diễm Ca", totalChapters: 8, slug: "sach-diem-ca", sqlFile: "database/song_of_songs_all_chapters.sql", jsonFile: "scripts/song_of_songs_all_chapters.json" },
  { id: "kn", name: "Khôn Ngoan", totalChapters: 19, slug: "sach-khon-ngoan", sqlFile: "database/wisdom_all_chapters.sql", jsonFile: "scripts/wisdom_all_chapters.json" },
  { id: "hc", name: "Huấn Ca", totalChapters: 51, slug: "sach-huan-ca", sqlFile: "database/sirach_all_chapters.sql", jsonFile: "scripts/sirach_all_chapters.json" },

  // Cựu Ước - Ngôn Sứ (18)
  { id: "is", name: "I-sai-a", totalChapters: 66, slug: "sach-ngon-su-i-sai-a", sqlFile: "database/isaiah_all_chapters.sql", jsonFile: "scripts/isaiah_all_chapters.json" },
  { id: "gr", name: "Giê-rê-mi-a", totalChapters: 52, slug: "sach-ngon-su-gie-re-mi-a", sqlFile: "database/jeremiah_all_chapters.sql", jsonFile: "scripts/jeremiah_all_chapters.json" },
  { id: "ac", name: "Ai Ca", totalChapters: 5, slug: "sach-ai-ca", urlType: "bai", sqlFile: "database/lamentations_all_chapters.sql", jsonFile: "scripts/lamentations_all_chapters.json" },
  { id: "br", name: "Ba-rúc", totalChapters: 6, slug: "sach-ba-ruc", sqlFile: "database/baruch_all_chapters.sql", jsonFile: "scripts/baruch_all_chapters.json" },
  { id: "ed", name: "Ê-dê-ki-en", totalChapters: 48, slug: "sach-ngon-su-e-de-ki-en", sqlFile: "database/ezekiel_all_chapters.sql", jsonFile: "scripts/ezekiel_all_chapters.json" },
  { id: "dn", name: "Đa-ni-en", totalChapters: 14, slug: "sach-ngon-su-da-ni-en", sqlFile: "database/daniel_all_chapters.sql", jsonFile: "scripts/daniel_all_chapters.json" },
  { id: "hs", name: "Hô-sê", totalChapters: 14, slug: "sach-ngon-su-ho-se", sqlFile: "database/hosea_all_chapters.sql", jsonFile: "scripts/hosea_all_chapters.json" },
  { id: "ge", name: "Giô-en", totalChapters: 4, slug: "sach-ngon-su-gio-en", sqlFile: "database/joel_all_chapters.sql", jsonFile: "scripts/joel_all_chapters.json" },
  { id: "am", name: "A-mốt", totalChapters: 9, slug: "sach-ngon-su-a-mot", sqlFile: "database/amos_all_chapters.sql", jsonFile: "scripts/amos_all_chapters.json" },
  { id: "ov", name: "Ô-va-đi-a", totalChapters: 1, slug: "sach-ngon-su-o-va-di-a", sqlFile: "database/obadiah_all_chapters.sql", jsonFile: "scripts/obadiah_all_chapters.json" },
  { id: "gn", name: "Giô-na", totalChapters: 4, slug: "sach-ngon-su-gio-na", sqlFile: "database/jonah_all_chapters.sql", jsonFile: "scripts/jonah_all_chapters.json" },
  { id: "mk", name: "Mi-kha", totalChapters: 7, slug: "sach-ngon-su-mi-kha", sqlFile: "database/micah_all_chapters.sql", jsonFile: "scripts/micah_all_chapters.json" },
  { id: "nh", name: "Na-hum", totalChapters: 3, slug: "sach-ngon-su-na-khum", sqlFile: "database/nahum_all_chapters.sql", jsonFile: "scripts/nahum_all_chapters.json" },
  { id: "hb", name: "Ha-ba-cúc", totalChapters: 3, slug: "sach-ngon-su-kha-ba-cuc", sqlFile: "database/habakkuk_all_chapters.sql", jsonFile: "scripts/habakkuk_all_chapters.json" },
  { id: "xp", name: "Xô-phô-ni-a", totalChapters: 3, slug: "sach-ngon-su-xo-pho-ni-a", sqlFile: "database/zephaniah_all_chapters.sql", jsonFile: "scripts/zephaniah_all_chapters.json" },
  { id: "kg", name: "Khắc-gai", totalChapters: 2, slug: "sach-ngon-su-khac-gai", sqlFile: "database/haggai_all_chapters.sql", jsonFile: "scripts/haggai_all_chapters.json" },
  { id: "dcr", name: "Da-ca-ri-a", totalChapters: 14, slug: "sach-ngon-su-da-ca-ri-a", sqlFile: "database/zechariah_all_chapters.sql", jsonFile: "scripts/zechariah_all_chapters.json" },
  { id: "ml", name: "Ma-la-khi", totalChapters: 3, slug: "sach-ngon-su-ma-la-khi", sqlFile: "database/malachi_all_chapters.sql", jsonFile: "scripts/malachi_all_chapters.json" },

  // Tân Ước (27)
  { id: "mt", name: "Mát-thêu", totalChapters: 28, slug: "tin-mung-theo-thanh-mat-theu", sqlFile: "database/matthew_all_chapters.sql", jsonFile: "scripts/matthew_all_chapters.json" },
  { id: "mc", name: "Mác-cô", totalChapters: 16, slug: "tin-mung-theo-thanh-mac-co", sqlFile: "database/mark_all_chapters.sql", jsonFile: "scripts/mark_all_chapters.json" },
  { id: "lc", name: "Lu-ca", totalChapters: 24, slug: "tin-mung-theo-thanh-lu-ca", sqlFile: "database/luke_all_chapters.sql", jsonFile: "scripts/luke_all_chapters.json" },
  { id: "ga", name: "Gio-an", totalChapters: 21, slug: "tin-mung-theo-thanh-gio-an", sqlFile: "database/john_all_chapters.sql", jsonFile: "scripts/john_all_chapters.json" },
  { id: "cv", name: "Công Vụ Tông Đồ", totalChapters: 28, slug: "sach-cong-vu-tong-do", sqlFile: "database/acts_all_chapters.sql", jsonFile: "scripts/acts_all_chapters.json" },
  { id: "rm", name: "Rô-ma", totalChapters: 16, slug: "thu-gui-tin-huu-ro-ma", sqlFile: "database/romans_all_chapters.sql", jsonFile: "scripts/romans_all_chapters.json" },
  { id: "1cr", name: "1 Cô-rin-tô", totalChapters: 16, slug: "thu-1-gui-tin-huu-co-rin-to", sqlFile: "database/corinthians1_all_chapters.sql", jsonFile: "scripts/corinthians1_all_chapters.json" },
  { id: "2cr", name: "2 Cô-rin-tô", totalChapters: 13, slug: "thu-2-gui-tin-huu-co-rin-to", sqlFile: "database/corinthians2_all_chapters.sql", jsonFile: "scripts/corinthians2_all_chapters.json" },
  { id: "gl", name: "Ga-la-ti", totalChapters: 6, slug: "thu-gui-tin-huu-ga-lat", sqlFile: "database/galatians_all_chapters.sql", jsonFile: "scripts/galatians_all_chapters.json" },
  { id: "ep", name: "Ê-phê-xô", totalChapters: 6, slug: "thu-gui-tin-huu-e-phe-xo", sqlFile: "database/ephesians_all_chapters.sql", jsonFile: "scripts/ephesians_all_chapters.json" },
  { id: "pl", name: "Phi-líp-phê", totalChapters: 4, slug: "thu-gui-tin-huu-phi-lip-phe", sqlFile: "database/philippians_all_chapters.sql", jsonFile: "scripts/philippians_all_chapters.json" },
  { id: "cl", name: "Cô-lô-xê", totalChapters: 4, slug: "thu-gui-tin-huu-co-lo-xe", sqlFile: "database/colossians_all_chapters.sql", jsonFile: "scripts/colossians_all_chapters.json" },
  { id: "1tx", name: "1 Thê-xa-lô-ni-ca", totalChapters: 5, slug: "thu-1-gui-tin-huu-the-xa-lo-ni-ca", sqlFile: "database/thessalonians1_all_chapters.sql", jsonFile: "scripts/thessalonians1_all_chapters.json" },
  { id: "2tx", name: "2 Thê-xa-lô-ni-ca", totalChapters: 3, slug: "thu-2-gui-tin-huu-the-xa-lo-ni-ca", sqlFile: "database/thessalonians2_all_chapters.sql", jsonFile: "scripts/thessalonians2_all_chapters.json" },
  { id: "1tm", name: "1 Ti-mô-thê", totalChapters: 6, slug: "thu-1-gui-ong-ti-mo-the", sqlFile: "database/timothy1_all_chapters.sql", jsonFile: "scripts/timothy1_all_chapters.json" },
  { id: "2tm", name: "2 Ti-mô-thê", totalChapters: 4, slug: "thu-2-gui-ong-ti-mo-the", sqlFile: "database/timothy2_all_chapters.sql", jsonFile: "scripts/timothy2_all_chapters.json" },
  { id: "tt", name: "Ti-tô", totalChapters: 3, slug: "thu-gui-ong-ti-to", sqlFile: "database/titus_all_chapters.sql", jsonFile: "scripts/titus_all_chapters.json" },
  { id: "plm", name: "Phi-lê-môn", totalChapters: 1, slug: "thu-gui-ong-phi-le-mon", sqlFile: "database/philemon_all_chapters.sql", jsonFile: "scripts/philemon_all_chapters.json" },
  { id: "dt", name: "Do Thái", totalChapters: 13, slug: "thu-gui-tin-huu-hip-ri", sqlFile: "database/hebrews_all_chapters.sql", jsonFile: "scripts/hebrews_all_chapters.json" },
  { id: "gc", name: "Gia-cô-bê", totalChapters: 5, slug: "thu-cua-thanh-gia-co-be", sqlFile: "database/james_all_chapters.sql", jsonFile: "scripts/james_all_chapters.json" },
  { id: "1pr", name: "1 Phê-rô", totalChapters: 5, slug: "thu-1-cua-thanh-phe-ro", sqlFile: "database/peter1_all_chapters.sql", jsonFile: "scripts/peter1_all_chapters.json" },
  { id: "2pr", name: "2 Phê-rô", totalChapters: 3, slug: "thu-2-cua-thanh-phe-ro", sqlFile: "database/peter2_all_chapters.sql", jsonFile: "scripts/peter2_all_chapters.json" },
  { id: "1ga", name: "1 Gio-an", totalChapters: 5, slug: "thu-1-cua-thanh-gio-an", sqlFile: "database/john1_all_chapters.sql", jsonFile: "scripts/john1_all_chapters.json" },
  { id: "2ga", name: "2 Gio-an", totalChapters: 1, slug: "thu-2-cua-thanh-gio-an", sqlFile: "database/john2_all_chapters.sql", jsonFile: "scripts/john2_all_chapters.json" },
  { id: "3ga", name: "3 Gio-an", totalChapters: 1, slug: "thu-3-cua-thanh-gio-an", sqlFile: "database/john3_all_chapters.sql", jsonFile: "scripts/john3_all_chapters.json" },
  { id: "gd", name: "Giu-đa", totalChapters: 1, slug: "thu-cua-thanh-giu-da", sqlFile: "database/jude_all_chapters.sql", jsonFile: "scripts/jude_all_chapters.json" },
  { id: "kh", name: "Khải Huyền", totalChapters: 22, slug: "sach-khai-huyen", sqlFile: "database/revelation_all_chapters.sql", jsonFile: "scripts/revelation_all_chapters.json" }
];

function getChapterUrl(book, c) {
    if (book.urlType === "psalm") {
        return c === 1 ? "https://augustino.net/sach-thanh-vinh" : `https://augustino.net/thanh-vinh-${c}`;
    }
    if (book.urlType === "bai") {
        return c === 1 ? `https://augustino.net/${book.slug}` : `https://augustino.net/${book.slug}-bai-${c}`;
    }
    return c === 1 ? `https://augustino.net/${book.slug}` : `https://augustino.net/${book.slug}-chuong-${c}`;
}

import { execSync } from 'child_process';

function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const stdout = execSync(`curl -sL "${url}"`, {
                maxBuffer: 10 * 1024 * 1024,
                timeout: 15000
            });
            const html = stdout.toString();
            if (html && html.length > 500) {
                return html;
            }
        } catch (e) {
            if (i === retries - 1) {
                console.error(`❌ Error fetching ${url}: ${e.message}`);
                return null;
            }
            execSync('sleep 1');
        }
    }
    return null;
}

async function scrapeBook(book, bookIndex, totalBooks) {
    const startTime = Date.now();
    console.log(`\n[${bookIndex + 1}/${totalBooks}] 📖 Bắt đầu: ${book.name} (${book.id}) - ${book.totalChapters} chương`);

    const chaptersData = [];
    const sqlStatements = [];

    for (let c = 1; c <= book.totalChapters; c++) {
        const url = getChapterUrl(book, c);
        const html = fetchWithRetry(url);
        if (!html) {
            console.error(`  ❌ Không lấy được HTML chương ${c} (${url})`);
            continue;
        }

        const $ = cheerio.load(html);
        const contentDiv = $('#page-content').length ? $('#page-content') : $('.content');
        if (!contentDiv.length) {
            console.error(`  ❌ Không tìm thấy contentDiv chương ${c}`);
            continue;
        }

        const content = parseChapterContent($, contentDiv);
        if (!content) {
            console.error(`  ❌ Không parse được nội dung chương ${c}`);
            continue;
        }

        chaptersData.push({
            translation_id: 1,
            book_id: book.id,
            chapter: c,
            content: content
        });

        const escaped = content.replace(/'/g, "''");
        sqlStatements.push(`INSERT INTO chapters (translation_id, book_id, chapter, content) VALUES (1, '${book.id}', ${c}, '${escaped}') ON CONFLICT (translation_id, book_id, chapter) DO UPDATE SET content = EXCLUDED.content;`);

        if (c % 10 === 0 || c === book.totalChapters) {
            process.stdout.write(`  - Tiến độ: ${c}/${book.totalChapters} chương\n`);
        }
    }

    if (chaptersData.length !== book.totalChapters) {
        console.error(`  ❌ LỖI: ${book.name} chỉ lấy được ${chaptersData.length}/${book.totalChapters} chương! Giữ nguyên không ghi đè file rỗng.`);
        return false;
    }

    fs.writeFileSync(book.jsonFile, JSON.stringify(chaptersData, null, 2), 'utf-8');
    fs.writeFileSync(book.sqlFile, sqlStatements.join('\n\n'), 'utf-8');

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ✅ Hoàn tất ${book.name}: ${chaptersData.length}/${book.totalChapters} chương (${duration}s) -> ${book.sqlFile}`);
    return true;
}

async function main() {
    console.log("===============================================================");
    console.log(`🚀 BẮT ĐẦU CÀO TOÀN BỘ 73 CUỐN SÁCH KINH THÁNH (1.328 CHƯƠNG)`);
    console.log("===============================================================");

    const overallStart = Date.now();
    let completedCount = 0;

    for (let i = 0; i < ALL_73_BOOKS.length; i++) {
        await scrapeBook(ALL_73_BOOKS[i], i, ALL_73_BOOKS.length);
        completedCount++;
    }

    const totalMinutes = ((Date.now() - overallStart) / 60000).toFixed(2);
    console.log("\n===============================================================");
    console.log(`🎉 HOÀN THÀNH TẤT CẢ ${completedCount}/73 SÁCH TRONG ${totalMinutes} PHÚT!`);
    console.log("===============================================================");
}

if (process.argv[1] && process.argv[1].endsWith('scrape_all_73_books_perfect.js')) {
    main();
}
