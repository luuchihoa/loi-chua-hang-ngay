import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("💥 Lỗi: Thiếu VITE_SUPABASE_URL hoặc Key trong file .env!");
  process.exit(1);
}

console.log(`📡 Kết nối tới Supabase Database: ${SUPABASE_URL}`);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixGospelAlleluiaDB() {
  console.log("🔍 Đang lấy dữ liệu các bản ghi có gospel_alleluia...");
  
  let allRows = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('liturgy_contents')
      .select('id, liturgy_key, cycle, gospel_alleluia')
      .not('gospel_alleluia', 'is', null)
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("💥 Lỗi query dữ liệu:", error.message);
      return;
    }

    if (data && data.length > 0) {
      allRows = allRows.concat(data);
      from += pageSize;
      if (data.length < pageSize) hasMore = false;
    } else {
      hasMore = false;
    }
  }

  console.log(`📊 Tổng số bản ghi có gospel_alleluia: ${allRows.length}`);

  let updatedCount = 0;
  let unchangedCount = 0;

  for (let i = 0; i < allRows.length; i++) {
    const row = allRows[i];
    const original = row.gospel_alleluia;

    if (typeof original === 'string' && (original.includes('\n') || original.includes('\r'))) {
      const cleaned = original.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
      
      const { error: updateErr } = await supabase
        .from('liturgy_contents')
        .update({ gospel_alleluia: cleaned })
        .eq('id', row.id);

      if (updateErr) {
        console.error(`❌ Lỗi update ID ${row.id} (${row.liturgy_key}):`, updateErr.message);
      } else {
        updatedCount++;
        console.log(`✅ [${updatedCount}] Fixed ID: ${row.id} | Key: ${row.liturgy_key}`);
      }
    } else {
      unchangedCount++;
    }
  }

  console.log(`\n🎉 HOÀN THÀNH CẬP NHẬT DATABASE:`);
  console.log(`- Đã sửa (bỏ xuống dòng): ${updatedCount} bản ghi`);
  console.log(`- Không cần sửa:            ${unchangedCount} bản ghi`);
}

fixGospelAlleluiaDB();
