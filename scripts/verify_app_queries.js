import bibleIndex from '../src/data/bible/bibleIndex.json' with { type: 'json' };
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const allBooks = [
  ...bibleIndex.old_testament,
  ...bibleIndex.new_testament
];

async function testAppQueries() {
    console.log(`🔍 Đang test truy vấn giao diện cho ${allBooks.length} sách...`);
    let emptyCount = 0;
    
    for (const book of allBooks) {
        const { data: verses, error } = await supabase
            .from('verses')
            .select('verse_num, verse_text')
            .eq('book_id', book.id)
            .eq('chapter', 1);
            
        if (error) {
            console.error(`❌ Lỗi truy vấn sách ${book.name} (${book.id}):`, error.message);
            emptyCount++;
        } else if (!verses || verses.length === 0) {
            console.error(`❌ SÁCH TRỐNG GIAO DIỆN: ${book.name} (id trong index: '${book.id}') - Không tìm thấy chương 1`);
            emptyCount++;
        } else {
            console.log(`  ✅ ${book.name} (${book.id}): Lấy thành công ${verses.length} câu của chương 1`);
        }
    }
    
    console.log(`\n========================================`);
    if (emptyCount === 0) {
        console.log(`🎉 TẤT CẢ ${allBooks.length} SÁCH ĐÃ KHỚP MÃ CƠ SỞ DỮ LIỆU VÀ LẤY ĐƯỢC DỮ LIỆU CHƯƠNG 1 TRÊN GIAO DIỆN!`);
    } else {
        console.log(`⚠️ Còn ${emptyCount} sách chưa hiển thị được trên giao diện!`);
    }
    console.log(`========================================`);
}

testAppQueries();
