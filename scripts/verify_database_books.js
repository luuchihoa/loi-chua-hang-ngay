import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const booksData = [
  { id: 'gen', name: 'Sáng Thế' },
  { id: 'exo', name: 'Xuất Hành' },
  { id: 'lev', name: 'Lê-vi' },
  { id: 'num', name: 'Dân Số' },
  { id: 'deu', name: 'Đệ Nhị Luật' },
  { id: 'jos', name: 'Giô-suê' },
  { id: 'jdg', name: 'Thủ Lãnh' },
  { id: 'rut', name: 'Rút' },
  { id: '1sa', name: '1 Sa-mu-en' },
  { id: '2sa', name: '2 Sa-mu-en' },
  { id: '1ki', name: '1 Các Vua' },
  { id: '2ki', name: '2 Các Vua' },
  { id: '1ch', name: '1 Sử Biên Niên' },
  { id: '2ch', name: '2 Sử Biên Niên' },
  { id: 'ezr', name: 'Ét-ra' },
  { id: 'neh', name: 'Nê-he-mi-a' },
  { id: 'tob', name: 'Tô-bi-a' },
  { id: 'jdt', name: 'Giu-đi-tha' },
  { id: 'est', name: 'Ê-sơ-te' },
  { id: '1ma', name: '1 Ma-ca-bê' },
  { id: '2ma', name: '2 Ma-ca-bê' },
  { id: 'job', name: 'Gióp' },
  { id: 'psa', name: 'Thánh Vịnh' },
  { id: 'pro', name: 'Châm Ngôn' },
  { id: 'ecc', name: 'Giảng Viên' },
  { id: 'sng', name: 'Diễm Ca' },
  { id: 'wis', name: 'Khôn Ngoan' },
  { id: 'sir', name: 'Huấn Ca' },
  { id: 'isa', name: 'I-sai-a' },
  { id: 'jer', name: 'Giê-rê-mi-a' },
  { id: 'lam', name: 'Ai Ca' },
  { id: 'bar', name: 'Ba-rúc' },
  { id: 'ezk', name: 'Ê-dê-ki-en' },
  { id: 'dan', name: 'Đa-ni-en' },
  { id: 'hos', name: 'Hô-sê' },
  { id: 'jol', name: 'Giô-en' },
  { id: 'amo', name: 'A-mốt' },
  { id: 'oba', name: 'Ô-va-đi-a' },
  { id: 'jon', name: 'Giô-na' },
  { id: 'mic', name: 'Mi-kha' },
  { id: 'nam', name: 'Na-hum' },
  { id: 'hab', name: 'Ha-ba-cúc' },
  { id: 'zep', name: 'Xô-phô-ni-a' },
  { id: 'hag', name: 'Khắc-gai' },
  { id: 'zec', name: 'Da-ca-ri-a' },
  { id: 'mal', name: 'Ma-la-khi' },
  { id: 'mat', name: 'Mát-thêu' },
  { id: 'mrk', name: 'Mác-cô' },
  { id: 'luk', name: 'Lu-ca' },
  { id: 'jhn', name: 'Gio-an' },
  { id: 'act', name: 'Công Vụ Tông Đồ' },
  { id: 'rom', name: 'Rô-ma' },
  { id: '1co', name: '1 Cô-rin-tô' },
  { id: '2co', name: '2 Cô-rin-tô' },
  { id: 'gal', name: 'Ga-la-ti' },
  { id: 'eph', name: 'Ê-phê-xô' },
  { id: 'php', name: 'Phi-líp-phê' },
  { id: 'col', name: 'Cô-lô-xê' },
  { id: '1th', name: '1 Thê-xa-lô-ni-ca' },
  { id: '2th', name: '2 Thê-xa-lô-ni-ca' },
  { id: '1ti', name: '1 Ti-mô-thê' },
  { id: '2ti', name: '2 Ti-mô-thê' },
  { id: 'tit', name: 'Ti-tô' },
  { id: 'phm', name: 'Phi-lê-môn' },
  { id: 'heb', name: 'Do Thái' },
  { id: 'jas', name: 'Gia-cô-bê' },
  { id: '1pe', name: '1 Phê-rô' },
  { id: '2pe', name: '2 Phê-rô' },
  { id: '1jn', name: '1 Gio-an' },
  { id: '2jn', name: '2 Gio-an' },
  { id: '3jn', name: '3 Gio-an' },
  { id: 'jud', name: 'Giu-đa' },
  { id: 'rev', name: 'Khải Huyền' }
];

async function check() {
    console.log("🔍 Đang kiểm tra 73 sách trên Supabase...");
    const missing = [];
    const present = [];
    
    for (const b of booksData) {
        const { count, error } = await supabase
            .from('verses')
            .select('*', { count: 'exact', head: true })
            .eq('book_id', b.id);
            
        if (error) {
            console.error(`Lỗi kiểm tra sách ${b.name} (${b.id}):`, error.message);
        } else {
            if (!count || count === 0) {
                missing.push(b);
                console.log(`❌ THIẾU: ${b.name} (${b.id}) - 0 câu`);
            } else {
                present.push({ ...b, count });
            }
        }
    }
    
    console.log(`\n====================================`);
    console.log(`📊 KẾT QUẢ KIỂM TRA:`);
    console.log(`- Đã có trên Database: ${present.length}/73 sách`);
    console.log(`- Còn thiếu:           ${missing.length}/73 sách`);
    console.log(`====================================\n`);
    
    if (missing.length > 0) {
        console.log("Danh sách các sách còn thiếu:");
        console.log(missing.map(m => `${m.name} (${m.id})`).join(', '));
    } else {
        console.log("🎉 TOÀN BỘ 73 SÁCH ĐÃ ĐẦY ĐỦ TRÊN DATABASE! KHÔNG CÒN SÁCH NÀO THIẾU!");
    }
}

check();
