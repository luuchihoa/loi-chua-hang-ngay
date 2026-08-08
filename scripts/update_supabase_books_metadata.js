import bibleIndex from '../src/data/bible/bibleIndex.json' with { type: 'json' };
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const allBooks = [
  ...bibleIndex.old_testament.map((b, idx) => ({
      id: b.id,
      name: b.name,
      short_name: b.short,
      testament: 'old',
      total_chapters: b.chapters,
      book_order: idx + 1
  })),
  ...bibleIndex.new_testament.map((b, idx) => ({
      id: b.id,
      name: b.name,
      short_name: b.short,
      testament: 'new',
      total_chapters: b.chapters,
      book_order: 46 + idx + 1
  }))
];

async function updateBooksTable() {
    console.log("📚 Đang cập nhật tên và ký hiệu chuẩn CGKPV lên bảng `books` của Supabase...");
    const { error } = await supabase.from('books').upsert(allBooks, { onConflict: 'id' });
    if (error) {
        console.error("❌ Lỗi khi cập nhật bảng books:", error.message);
    } else {
        console.log("✅ Cập nhật thành công 73 sách chuẩn CGKPV Công Giáo trên Supabase!");
    }
}

updateBooksTable();
