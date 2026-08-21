import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("💥 Lỗi: Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_SERVICE_ROLE_KEY trong file .env!");
    process.exit(1);
}

console.log(`📡 Đang kết nối tới Supabase đích: ${SUPABASE_URL}`);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
});

const BOOKS_METADATA = [
  // Cựu Ước (46)
  { id: 'st', name: 'Sáng Thế', short_name: 'St', testament: 'old', total_chapters: 50, book_order: 1, jsonFile: 'scripts/genesis_all_chapters.json' },
  { id: 'xh', name: 'Xuất Hành', short_name: 'Xh', testament: 'old', total_chapters: 40, book_order: 2, jsonFile: 'scripts/exodus_all_chapters.json' },
  { id: 'lv', name: 'Lê-vi', short_name: 'Lv', testament: 'old', total_chapters: 27, book_order: 3, jsonFile: 'scripts/leviticus_all_chapters.json' },
  { id: 'ds', name: 'Dân Số', short_name: 'Ds', testament: 'old', total_chapters: 36, book_order: 4, jsonFile: 'scripts/numbers_all_chapters.json' },
  { id: 'dnl', name: 'Đệ Nhị Luật', short_name: 'Đnl', testament: 'old', total_chapters: 34, book_order: 5, jsonFile: 'scripts/deuteronomy_all_chapters.json' },
  { id: 'gs', name: 'Giô-suê', short_name: 'Gs', testament: 'old', total_chapters: 24, book_order: 6, jsonFile: 'scripts/joshua_all_chapters.json' },
  { id: 'tl', name: 'Thủ Lãnh', short_name: 'Tl', testament: 'old', total_chapters: 21, book_order: 7, jsonFile: 'scripts/judges_all_chapters.json' },
  { id: 'r', name: 'Rút', short_name: 'R', testament: 'old', total_chapters: 4, book_order: 8, jsonFile: 'scripts/ruth_all_chapters.json' },
  { id: '1sm', name: '1 Sa-mu-en', short_name: '1 Sm', testament: 'old', total_chapters: 31, book_order: 9, jsonFile: 'scripts/samuel1_all_chapters.json' },
  { id: '2sm', name: '2 Sa-mu-en', short_name: '2 Sm', testament: 'old', total_chapters: 24, book_order: 10, jsonFile: 'scripts/samuel2_all_chapters.json' },
  { id: '1v', name: '1 Các Vua', short_name: '1 V', testament: 'old', total_chapters: 22, book_order: 11, jsonFile: 'scripts/kings1_all_chapters.json' },
  { id: '2v', name: '2 Các Vua', short_name: '2 V', testament: 'old', total_chapters: 25, book_order: 12, jsonFile: 'scripts/kings2_all_chapters.json' },
  { id: '1sb', name: '1 Sử Biên Niên', short_name: '1 Sb', testament: 'old', total_chapters: 29, book_order: 13, jsonFile: 'scripts/chronicles1_all_chapters.json' },
  { id: '2sb', name: '2 Sử Biên Niên', short_name: '2 Sb', testament: 'old', total_chapters: 36, book_order: 14, jsonFile: 'scripts/chronicles2_all_chapters.json' },
  { id: 'er', name: 'Ét-ra', short_name: 'Er', testament: 'old', total_chapters: 10, book_order: 15, jsonFile: 'scripts/ezra_all_chapters.json' },
  { id: 'nhm', name: 'Nê-he-mi-a', short_name: 'Nhm', testament: 'old', total_chapters: 13, book_order: 16, jsonFile: 'scripts/nehemiah_all_chapters.json' },
  { id: 'tb', name: 'Tô-bi-a', short_name: 'Tb', testament: 'old', total_chapters: 14, book_order: 17, jsonFile: 'scripts/tobit_all_chapters.json' },
  { id: 'gdt', name: 'Giu-đi-tha', short_name: 'Gđt', testament: 'old', total_chapters: 16, book_order: 18, jsonFile: 'scripts/judith_all_chapters.json' },
  { id: 'et', name: 'Ê-sơ-te', short_name: 'Et', testament: 'old', total_chapters: 10, book_order: 19, jsonFile: 'scripts/esther_all_chapters.json' },
  { id: '1mc', name: '1 Ma-ca-bê', short_name: '1 Mc', testament: 'old', total_chapters: 16, book_order: 20, jsonFile: 'scripts/maccabees1_all_chapters.json' },
  { id: '2mc', name: '2 Ma-ca-bê', short_name: '2 Mc', testament: 'old', total_chapters: 15, book_order: 21, jsonFile: 'scripts/maccabees2_all_chapters.json' },
  { id: 'g', name: 'Gióp', short_name: 'G', testament: 'old', total_chapters: 42, book_order: 22, jsonFile: 'scripts/job_all_chapters.json' },
  { id: 'tv', name: 'Thánh Vịnh', short_name: 'Tv', testament: 'old', total_chapters: 150, book_order: 23, jsonFile: 'scripts/psalms_all_chapters.json' },
  { id: 'cn', name: 'Châm Ngôn', short_name: 'Cn', testament: 'old', total_chapters: 31, book_order: 24, jsonFile: 'scripts/proverbs_all_chapters.json' },
  { id: 'gv', name: 'Giảng Viên', short_name: 'Gv', testament: 'old', total_chapters: 12, book_order: 25, jsonFile: 'scripts/ecclesiastes_all_chapters.json' },
  { id: 'dc', name: 'Diễm Ca', short_name: 'Dc', testament: 'old', total_chapters: 8, book_order: 26, jsonFile: 'scripts/song_of_songs_all_chapters.json' },
  { id: 'kn', name: 'Khôn Ngoan', short_name: 'Kn', testament: 'old', total_chapters: 19, book_order: 27, jsonFile: 'scripts/wisdom_all_chapters.json' },
  { id: 'hc', name: 'Huấn Ca', short_name: 'Hc', testament: 'old', total_chapters: 51, book_order: 28, jsonFile: 'scripts/sirach_all_chapters.json' },
  { id: 'is', name: 'I-sai-a', short_name: 'Is', testament: 'old', total_chapters: 66, book_order: 29, jsonFile: 'scripts/isaiah_all_chapters.json' },
  { id: 'gr', name: 'Giê-rê-mi-a', short_name: 'Gr', testament: 'old', total_chapters: 52, book_order: 30, jsonFile: 'scripts/jeremiah_all_chapters.json' },
  { id: 'ac', name: 'Ai Ca', short_name: 'Ac', testament: 'old', total_chapters: 5, book_order: 31, jsonFile: 'scripts/lamentations_all_chapters.json' },
  { id: 'br', name: 'Ba-rúc', short_name: 'Br', testament: 'old', total_chapters: 6, book_order: 32, jsonFile: 'scripts/baruch_all_chapters.json' },
  { id: 'ed', name: 'Ê-dê-ki-en', short_name: 'Ed', testament: 'old', total_chapters: 48, book_order: 33, jsonFile: 'scripts/ezekiel_all_chapters.json' },
  { id: 'dn', name: 'Đa-ni-en', short_name: 'Đn', testament: 'old', total_chapters: 14, book_order: 34, jsonFile: 'scripts/daniel_all_chapters.json' },
  { id: 'hs', name: 'Hô-sê', short_name: 'Hs', testament: 'old', total_chapters: 14, book_order: 35, jsonFile: 'scripts/hosea_all_chapters.json' },
  { id: 'ge', name: 'Giô-en', short_name: 'Ge', testament: 'old', total_chapters: 4, book_order: 36, jsonFile: 'scripts/joel_all_chapters.json' },
  { id: 'am', name: 'A-mốt', short_name: 'Am', testament: 'old', total_chapters: 9, book_order: 37, jsonFile: 'scripts/amos_all_chapters.json' },
  { id: 'ov', name: 'Ô-va-đi-a', short_name: 'Ôv', testament: 'old', total_chapters: 1, book_order: 38, jsonFile: 'scripts/obadiah_all_chapters.json' },
  { id: 'gn', name: 'Giô-na', short_name: 'Gn', testament: 'old', total_chapters: 4, book_order: 39, jsonFile: 'scripts/jonah_all_chapters.json' },
  { id: 'mk', name: 'Mi-kha', short_name: 'Mk', testament: 'old', total_chapters: 7, book_order: 40, jsonFile: 'scripts/micah_all_chapters.json' },
  { id: 'nh', name: 'Na-hum', short_name: 'Nh', testament: 'old', total_chapters: 3, book_order: 41, jsonFile: 'scripts/nahum_all_chapters.json' },
  { id: 'hb', name: 'Ha-ba-cúc', short_name: 'Hb', testament: 'old', total_chapters: 3, book_order: 42, jsonFile: 'scripts/habakkuk_all_chapters.json' },
  { id: 'xp', name: 'Xô-phô-ni-a', short_name: 'Xp', testament: 'old', total_chapters: 3, book_order: 43, jsonFile: 'scripts/zephaniah_all_chapters.json' },
  { id: 'kg', name: 'Khắc-gai', short_name: 'Kg', testament: 'old', total_chapters: 2, book_order: 44, jsonFile: 'scripts/haggai_all_chapters.json' },
  { id: 'dcr', name: 'Da-ca-ri-a', short_name: 'Dcr', testament: 'old', total_chapters: 14, book_order: 45, jsonFile: 'scripts/zechariah_all_chapters.json' },
  { id: 'ml', name: 'Ma-la-khi', short_name: 'Ml', testament: 'old', total_chapters: 3, book_order: 46, jsonFile: 'scripts/malachi_all_chapters.json' },

  // Tân Ước (27)
  { id: 'mt', name: 'Mát-thêu', short_name: 'Mt', testament: 'new', total_chapters: 28, book_order: 47, jsonFile: 'scripts/matthew_all_chapters.json' },
  { id: 'mc', name: 'Mác-cô', short_name: 'Mc', testament: 'new', total_chapters: 16, book_order: 48, jsonFile: 'scripts/mark_all_chapters.json' },
  { id: 'lc', name: 'Lu-ca', short_name: 'Lc', testament: 'new', total_chapters: 24, book_order: 49, jsonFile: 'scripts/luke_all_chapters.json' },
  { id: 'ga', name: 'Gio-an', short_name: 'Ga', testament: 'new', total_chapters: 21, book_order: 50, jsonFile: 'scripts/john_all_chapters.json' },
  { id: 'cv', name: 'Công Vụ Tông Đồ', short_name: 'Cv', testament: 'new', total_chapters: 28, book_order: 51, jsonFile: 'scripts/acts_all_chapters.json' },
  { id: 'rm', name: 'Rô-ma', short_name: 'Rm', testament: 'new', total_chapters: 16, book_order: 52, jsonFile: 'scripts/romans_all_chapters.json' },
  { id: '1cr', name: '1 Cô-rin-tô', short_name: '1 Cr', testament: 'new', total_chapters: 16, book_order: 53, jsonFile: 'scripts/corinthians1_all_chapters.json' },
  { id: '2cr', name: '2 Cô-rin-tô', short_name: '2 Cr', testament: 'new', total_chapters: 13, book_order: 54, jsonFile: 'scripts/corinthians2_all_chapters.json' },
  { id: 'gl', name: 'Ga-la-ti', short_name: 'Gl', testament: 'new', total_chapters: 6, book_order: 55, jsonFile: 'scripts/galatians_all_chapters.json' },
  { id: 'ep', name: 'Ê-phê-xô', short_name: 'Ep', testament: 'new', total_chapters: 6, book_order: 56, jsonFile: 'scripts/ephesians_all_chapters.json' },
  { id: 'pl', name: 'Phi-líp-phê', short_name: 'Pl', testament: 'new', total_chapters: 4, book_order: 57, jsonFile: 'scripts/philippians_all_chapters.json' },
  { id: 'cl', name: 'Cô-lô-xê', short_name: 'Cl', testament: 'new', total_chapters: 4, book_order: 58, jsonFile: 'scripts/colossians_all_chapters.json' },
  { id: '1tx', name: '1 Thê-xa-lô-ni-ca', short_name: '1 Tx', testament: 'new', total_chapters: 5, book_order: 59, jsonFile: 'scripts/thessalonians1_all_chapters.json' },
  { id: '2tx', name: '2 Thê-xa-lô-ni-ca', short_name: '2 Tx', testament: 'new', total_chapters: 3, book_order: 60, jsonFile: 'scripts/thessalonians2_all_chapters.json' },
  { id: '1tm', name: '1 Ti-mô-thê', short_name: '1 Tm', testament: 'new', total_chapters: 6, book_order: 61, jsonFile: 'scripts/timothy1_all_chapters.json' },
  { id: '2tm', name: '2 Ti-mô-thê', short_name: '2 Tm', testament: 'new', total_chapters: 4, book_order: 62, jsonFile: 'scripts/timothy2_all_chapters.json' },
  { id: 'tt', name: 'Ti-tô', short_name: 'Tt', testament: 'new', total_chapters: 3, book_order: 63, jsonFile: 'scripts/titus_all_chapters.json' },
  { id: 'plm', name: 'Phi-lê-môn', short_name: 'Plm', testament: 'new', total_chapters: 1, book_order: 64, jsonFile: 'scripts/philemon_all_chapters.json' },
  { id: 'dt', name: 'Do Thái', short_name: 'Dt', testament: 'new', total_chapters: 13, book_order: 65, jsonFile: 'scripts/hebrews_all_chapters.json' },
  { id: 'gc', name: 'Gia-cô-bê', short_name: 'Gc', testament: 'new', total_chapters: 5, book_order: 66, jsonFile: 'scripts/james_all_chapters.json' },
  { id: '1pr', name: '1 Phê-rô', short_name: '1 Pr', testament: 'new', total_chapters: 5, book_order: 67, jsonFile: 'scripts/peter1_all_chapters.json' },
  { id: '2pr', name: '2 Phê-rô', short_name: '2 Pr', testament: 'new', total_chapters: 3, book_order: 68, jsonFile: 'scripts/peter2_all_chapters.json' },
  { id: '1ga', name: '1 Gio-an', short_name: '1 Ga', testament: 'new', total_chapters: 5, book_order: 69, jsonFile: 'scripts/john1_all_chapters.json' },
  { id: '2ga', name: '2 Gio-an', short_name: '2 Ga', testament: 'new', total_chapters: 1, book_order: 70, jsonFile: 'scripts/john2_all_chapters.json' },
  { id: '3ga', name: '3 Gio-an', short_name: '3 Ga', testament: 'new', total_chapters: 1, book_order: 71, jsonFile: 'scripts/john3_all_chapters.json' },
  { id: 'gd', name: 'Giu-đa', short_name: 'Gđ', testament: 'new', total_chapters: 1, book_order: 72, jsonFile: 'scripts/jude_all_chapters.json' },
  { id: 'kh', name: 'Khải Huyền', short_name: 'Kh', testament: 'new', total_chapters: 22, book_order: 73, jsonFile: 'scripts/revelation_all_chapters.json' }
];

async function main() {
    console.log("=========================================================================");
    console.log("🚀 TIẾN TRÌNH CHUYỂN TOÀN BỘ DỮ LIỆU SANG SUPABASE MỚI (ALL-IN-ONE)");
    console.log("=========================================================================");

    // 1. Translations
    console.log("\n📖 [1/4] Đang nạp bản dịch CGKPV (id=1)...");
    const { error: transErr } = await supabase.from('translations').upsert([
        { id: 1, name: 'Các Giờ Kinh Phụng Vụ 2011', short_name: 'CGKPV', language: 'vi' }
    ], { onConflict: 'id' });
    if (transErr) console.error("  ❌ Lỗi translations:", transErr.message);
    else console.log("  ✅ Translations OK.");

    // 2. Books
    console.log("\n📚 [2/4] Đang nạp metadata 73 cuốn sách vào bảng `books`...");
    const booksRows = BOOKS_METADATA.map(b => ({
        id: b.id,
        name: b.name,
        short_name: b.short_name,
        testament: b.testament,
        total_chapters: b.total_chapters,
        book_order: b.book_order
    }));
    const { error: booksErr } = await supabase.from('books').upsert(booksRows, { onConflict: 'id' });
    if (booksErr) console.error("  ❌ Lỗi books:", booksErr.message);
    else console.log(`  ✅ Đã nạp thành công ${booksRows.length} sách.`);

    // 3. Chapters
    console.log("\n📦 [3/4] Đang nạp 1.328 chương Kinh Thánh vào bảng `chapters`...");
    let totalChaptersPushed = 0;
    for (let i = 0; i < BOOKS_METADATA.length; i++) {
        const book = BOOKS_METADATA[i];
        if (!fs.existsSync(book.jsonFile)) continue;
        const chapters = JSON.parse(fs.readFileSync(book.jsonFile, 'utf-8'));
        const rows = chapters.map(c => ({
            translation_id: 1,
            book_id: book.id,
            chapter: c.chapter,
            content: c.content
        }));
        const { error: chapErr } = await supabase.from('chapters').upsert(rows, { onConflict: 'translation_id,book_id,chapter' });
        if (chapErr) {
            console.error(`  ❌ Lỗi sách ${book.name}:`, chapErr.message);
        } else {
            totalChaptersPushed += rows.length;
            if ((i + 1) % 10 === 0 || i === BOOKS_METADATA.length - 1) {
                console.log(`  - Đã nạp ${i + 1}/73 sách (${totalChaptersPushed}/1.328 chương)...`);
            }
        }
    }
    console.log(`  ✅ Hoàn tất nạp Chapters: ${totalChaptersPushed}/1.328 chương.`);

    // 4. Liturgy Contents
    console.log("\n🕯️ [4/4] Đang nạp 986 bài đọc Phụng Vụ vào bảng `liturgy_contents`...");
    const liturgyJsonPath = path.resolve(process.cwd(), 'liturgy_contents_rows.json');
    if (fs.existsSync(liturgyJsonPath)) {
        const liturgyRows = JSON.parse(fs.readFileSync(liturgyJsonPath, 'utf-8'));
        console.log(`  - Tìm thấy ${liturgyRows.length} bài đọc trong backup.`);

        const BATCH_SIZE = 50;
        let liturgySuccess = 0;
        for (let i = 0; i < liturgyRows.length; i += BATCH_SIZE) {
            const chunk = liturgyRows.slice(i, i + BATCH_SIZE);
            const { error: litErr } = await supabase
                .from('liturgy_contents')
                .upsert(chunk, { onConflict: 'liturgy_key,cycle' });

            if (litErr) {
                console.error(`  ❌ Lỗi batch bài đọc ${i}-${i + chunk.length}:`, litErr.message);
            } else {
                liturgySuccess += chunk.length;
                process.stdout.write(`  - Tiến độ: ${liturgySuccess}/${liturgyRows.length} bài đọc\n`);
            }
        }
        console.log(`  ✅ Hoàn tất nạp Liturgy Contents: ${liturgySuccess}/${liturgyRows.length} bài đọc.`);
    } else {
        console.warn("  ⚠️ Không tìm thấy file liturgy_contents_rows.json.");
    }

    console.log("\n=========================================================================");
    console.log(`🎉 DI CHUYỂN DỮ LIỆU SANG SUPABASE MỚI HOÀN TẤT 100%!`);
    console.log("=========================================================================");
}

main();
