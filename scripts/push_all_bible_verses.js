import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("💥 Lỗi: Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_SERVICE_ROLE_KEY trong .env");
    process.exit(1);
}

console.log(`📡 Đang kết nối tới Supabase: ${SUPABASE_URL}`);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const booksData = [
  { id: 'gen', name: 'Sáng Thế', short_name: 'St', testament: 'old', total_chapters: 50, book_order: 1 },
  { id: 'exo', name: 'Xuất Hành', short_name: 'Xh', testament: 'old', total_chapters: 40, book_order: 2 },
  { id: 'lev', name: 'Lê-vi', short_name: 'Lv', testament: 'old', total_chapters: 27, book_order: 3 },
  { id: 'num', name: 'Dân Số', short_name: 'Ds', testament: 'old', total_chapters: 36, book_order: 4 },
  { id: 'deu', name: 'Đệ Nhị Luật', short_name: 'Đnl', testament: 'old', total_chapters: 34, book_order: 5 },
  { id: 'jos', name: 'Giô-suê', short_name: 'Gs', testament: 'old', total_chapters: 24, book_order: 6 },
  { id: 'jdg', name: 'Thủ Lãnh', short_name: 'Tl', testament: 'old', total_chapters: 21, book_order: 7 },
  { id: 'rut', name: 'Rút', short_name: 'R', testament: 'old', total_chapters: 4, book_order: 8 },
  { id: '1sa', name: '1 Sa-mu-en', short_name: '1 Sm', testament: 'old', total_chapters: 31, book_order: 9 },
  { id: '2sa', name: '2 Sa-mu-en', short_name: '2 Sm', testament: 'old', total_chapters: 24, book_order: 10 },
  { id: '1ki', name: '1 Các Vua', short_name: '1 V', testament: 'old', total_chapters: 22, book_order: 11 },
  { id: '2ki', name: '2 Các Vua', short_name: '2 V', testament: 'old', total_chapters: 25, book_order: 12 },
  { id: '1ch', name: '1 Sử Biên Niên', short_name: '1 Sb', testament: 'old', total_chapters: 29, book_order: 13 },
  { id: '2ch', name: '2 Sử Biên Niên', short_name: '2 Sb', testament: 'old', total_chapters: 36, book_order: 14 },
  { id: 'ezr', name: 'Ét-ra', short_name: 'Er', testament: 'old', total_chapters: 10, book_order: 15 },
  { id: 'neh', name: 'Nê-he-mi-a', short_name: 'Nhm', testament: 'old', total_chapters: 13, book_order: 16 },
  { id: 'tob', name: 'Tô-bi-a', short_name: 'Tb', testament: 'old', total_chapters: 14, book_order: 17 },
  { id: 'jdt', name: 'Giu-đi-tha', short_name: 'Gđt', testament: 'old', total_chapters: 16, book_order: 18 },
  { id: 'est', name: 'Ê-sơ-te', short_name: 'Et', testament: 'old', total_chapters: 10, book_order: 19 },
  { id: '1ma', name: '1 Ma-ca-bê', short_name: '1 Mc', testament: 'old', total_chapters: 16, book_order: 20 },
  { id: '2ma', name: '2 Ma-ca-bê', short_name: '2 Mc', testament: 'old', total_chapters: 15, book_order: 21 },
  { id: 'job', name: 'Gióp', short_name: 'G', testament: 'old', total_chapters: 42, book_order: 22 },
  { id: 'psa', name: 'Thánh Vịnh', short_name: 'Tv', testament: 'old', total_chapters: 150, book_order: 23 },
  { id: 'pro', name: 'Châm Ngôn', short_name: 'Cn', testament: 'old', total_chapters: 31, book_order: 24 },
  { id: 'ecc', name: 'Giảng Viên', short_name: 'Gv', testament: 'old', total_chapters: 12, book_order: 25 },
  { id: 'sng', name: 'Diễm Ca', short_name: 'Dc', testament: 'old', total_chapters: 8, book_order: 26 },
  { id: 'wis', name: 'Khôn Ngoan', short_name: 'Kn', testament: 'old', total_chapters: 19, book_order: 27 },
  { id: 'sir', name: 'Huấn Ca', short_name: 'Hc', testament: 'old', total_chapters: 51, book_order: 28 },
  { id: 'isa', name: 'I-sai-a', short_name: 'Is', testament: 'old', total_chapters: 66, book_order: 29 },
  { id: 'jer', name: 'Giê-rê-mi-a', short_name: 'Gr', testament: 'old', total_chapters: 52, book_order: 30 },
  { id: 'lam', name: 'Ai Ca', short_name: 'Ac', testament: 'old', total_chapters: 5, book_order: 31 },
  { id: 'bar', name: 'Ba-rúc', short_name: 'Br', testament: 'old', total_chapters: 6, book_order: 32 },
  { id: 'ezk', name: 'Ê-dê-ki-en', short_name: 'Ed', testament: 'old', total_chapters: 48, book_order: 33 },
  { id: 'dan', name: 'Đa-ni-en', short_name: 'Đn', testament: 'old', total_chapters: 14, book_order: 34 },
  { id: 'hos', name: 'Hô-sê', short_name: 'Hs', testament: 'old', total_chapters: 14, book_order: 35 },
  { id: 'jol', name: 'Giô-en', short_name: 'Ge', testament: 'old', total_chapters: 4, book_order: 36 },
  { id: 'amo', name: 'A-mốt', short_name: 'Am', testament: 'old', total_chapters: 9, book_order: 37 },
  { id: 'oba', name: 'Ô-va-đi-a', short_name: 'Ôv', testament: 'old', total_chapters: 1, book_order: 38 },
  { id: 'jon', name: 'Giô-na', short_name: 'Gn', testament: 'old', total_chapters: 4, book_order: 39 },
  { id: 'mic', name: 'Mi-kha', short_name: 'Mk', testament: 'old', total_chapters: 7, book_order: 40 },
  { id: 'nam', name: 'Na-hum', short_name: 'Nh', testament: 'old', total_chapters: 3, book_order: 41 },
  { id: 'hab', name: 'Ha-ba-cúc', short_name: 'Hb', testament: 'old', total_chapters: 3, book_order: 42 },
  { id: 'zep', name: 'Xô-phô-ni-a', short_name: 'Xp', testament: 'old', total_chapters: 3, book_order: 43 },
  { id: 'hag', name: 'Khắc-gai', short_name: 'Kg', testament: 'old', total_chapters: 2, book_order: 44 },
  { id: 'zec', name: 'Da-ca-ri-a', short_name: 'Dcr', testament: 'old', total_chapters: 14, book_order: 45 },
  { id: 'mal', name: 'Ma-la-khi', short_name: 'Ml', testament: 'old', total_chapters: 3, book_order: 46 },
  { id: 'mat', name: 'Mát-thêu', short_name: 'Mt', testament: 'new', total_chapters: 28, book_order: 47 },
  { id: 'mrk', name: 'Mác-cô', short_name: 'Mc', testament: 'new', total_chapters: 16, book_order: 48 },
  { id: 'luk', name: 'Lu-ca', short_name: 'Lc', testament: 'new', total_chapters: 24, book_order: 49 },
  { id: 'jhn', name: 'Gio-an', short_name: 'Ga', testament: 'new', total_chapters: 21, book_order: 50 },
  { id: 'act', name: 'Công Vụ Tông Đồ', short_name: 'Cv', testament: 'new', total_chapters: 28, book_order: 51 },
  { id: 'rom', name: 'Rô-ma', short_name: 'Rm', testament: 'new', total_chapters: 16, book_order: 52 },
  { id: '1co', name: '1 Cô-rin-tô', short_name: '1 Cr', testament: 'new', total_chapters: 16, book_order: 53 },
  { id: '2co', name: '2 Cô-rin-tô', short_name: '2 Cr', testament: 'new', total_chapters: 13, book_order: 54 },
  { id: 'gal', name: 'Ga-la-ti', short_name: 'Gl', testament: 'new', total_chapters: 6, book_order: 55 },
  { id: 'eph', name: 'Ê-phê-xô', short_name: 'Ep', testament: 'new', total_chapters: 6, book_order: 56 },
  { id: 'php', name: 'Phi-líp-phê', short_name: 'Pl', testament: 'new', total_chapters: 4, book_order: 57 },
  { id: 'col', name: 'Cô-lô-xê', short_name: 'Cl', testament: 'new', total_chapters: 4, book_order: 58 },
  { id: '1th', name: '1 Thê-xa-lô-ni-ca', short_name: '1 Tx', testament: 'new', total_chapters: 5, book_order: 59 },
  { id: '2th', name: '2 Thê-xa-lô-ni-ca', short_name: '2 Tx', testament: 'new', total_chapters: 3, book_order: 60 },
  { id: '1ti', name: '1 Ti-mô-thê', short_name: '1 Tm', testament: 'new', total_chapters: 6, book_order: 61 },
  { id: '2ti', name: '2 Ti-mô-thê', short_name: '2 Tm', testament: 'new', total_chapters: 4, book_order: 62 },
  { id: 'tit', name: 'Ti-tô', short_name: 'Tt', testament: 'new', total_chapters: 3, book_order: 63 },
  { id: 'phm', name: 'Phi-lê-môn', short_name: 'Plm', testament: 'new', total_chapters: 1, book_order: 64 },
  { id: 'heb', name: 'Do Thái', short_name: 'Dt', testament: 'new', total_chapters: 13, book_order: 65 },
  { id: 'jas', name: 'Gia-cô-bê', short_name: 'Gc', testament: 'new', total_chapters: 5, book_order: 66 },
  { id: '1pe', name: '1 Phê-rô', short_name: '1 Pr', testament: 'new', total_chapters: 5, book_order: 67 },
  { id: '2pe', name: '2 Phê-rô', short_name: '2 Pr', testament: 'new', total_chapters: 3, book_order: 68 },
  { id: '1jn', name: '1 Gio-an', short_name: '1 Ga', testament: 'new', total_chapters: 5, book_order: 69 },
  { id: '2jn', name: '2 Gio-an', short_name: '2 Ga', testament: 'new', total_chapters: 1, book_order: 70 },
  { id: '3jn', name: '3 Gio-an', short_name: '3 Ga', testament: 'new', total_chapters: 1, book_order: 71 },
  { id: 'jud', name: 'Giu-đa', short_name: 'Gđ', testament: 'new', total_chapters: 1, book_order: 72 },
  { id: 'rev', name: 'Khải Huyền', short_name: 'Kh', testament: 'new', total_chapters: 22, book_order: 73 }
];

async function pushBooks() {
    console.log("📚 Đang nạp danh sách 73 sách vào bảng `books`...");
    const { error } = await supabase.from('books').upsert(booksData, { onConflict: 'id' });
    if (error) {
        console.error("💥 Lỗi khi nạp danh sách sách:", error.message);
        process.exit(1);
    }
    console.log("✅ Nạp thành công 73 sách!");
}

const jsonFiles = [
    'scripts/scraped_matthew.json',
    'scripts/scraped_mark.json',
    'scripts/scraped_luke.json',
    'scripts/scraped_john.json',
    'scripts/scraped_acts.json',
    'scripts/scraped_pauline.json',
    'scripts/scraped_nt_others.json',
    'scripts/scraped_pentateuch.json',
    'scripts/scraped_history_unique.json',
    'scripts/scraped_psalms.json',
    'scripts/scraped_wisdom.json',
    'scripts/scraped_prophets.json'
];

async function main() {
    await pushBooks();
    
    let totalPushed = 0;
    const seenKeys = new Set();
    const batchSize = 500;
    
    for (const relativePath of jsonFiles) {
        const fullPath = path.resolve(process.cwd(), relativePath);
        if (!fs.existsSync(fullPath)) {
            console.warn(`⚠️ Bỏ qua ${relativePath} (Không tìm thấy file)`);
            continue;
        }
        
        console.log(`\n📖 Đang đọc file: ${relativePath}...`);
        const raw = fs.readFileSync(fullPath, 'utf8');
        const data = JSON.parse(raw);
        
        const uniqueVerses = [];
        for (const v of data) {
            const key = `${v.translation_id}-${v.book_id}-${v.chapter}-${v.verse_num}`;
            if (!seenKeys.has(key)) {
                seenKeys.add(key);
                uniqueVerses.push(v);
            }
        }
        
        console.log(`📦 Tìm thấy ${uniqueVerses.length} câu (mới/không trùng) từ ${relativePath}`);
        
        for (let i = 0; i < uniqueVerses.length; i += batchSize) {
            const batch = uniqueVerses.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(uniqueVerses.length / batchSize);
            
            const { error } = await supabase.from('verses').upsert(batch, {
                onConflict: 'translation_id, book_id, chapter, verse_num'
            });
            
            if (error) {
                console.error(`❌ Lỗi tại batch ${batchNum}/${totalBatches} (${relativePath}):`, error.message);
            } else {
                totalPushed += batch.length;
                console.log(`  ✅ [${batchNum}/${totalBatches}] Đã nạp +${batch.length} câu (Tổng cộng: ${totalPushed} câu)`);
            }
        }
    }
    
    console.log(`\n🎉 HOÀN THÀNH TẤT CẢ! Đã nạp thành công ${totalPushed} câu Kinh Thánh vào Supabase!`);
}

main();
