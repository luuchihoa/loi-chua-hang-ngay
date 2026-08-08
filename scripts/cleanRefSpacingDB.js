import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://avrnbefzxtznpodugacz.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2cm5iZWZ6eHR6bnBvZHVnYWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MTU3MzksImV4cCI6MjA5OTE5MTczOX0._wZp4bK1b2XGSYYUWzQTw2mkyCyKvwOi6iyIIuauRKI";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export function cleanRefSpacing(text) {
  if (!text || typeof text !== 'string') return text;
  
  let cleaned = text;

  // 1. Thay thế nhiều khoảng trắng thành 1 khoảng trắng
  cleaned = cleaned.replace(/\s+/g, ' ');

  // 2. Xóa khoảng trắng giữa các chữ số (ví dụ: "3 5" -> "35")
  // Dùng vòng lặp replace để xử lý các trường hợp có nhiều khoảng trắng giữa nhiều số như "3 5 7"
  while (cleaned.match(/(\d)\s+(\d)/)) {
    cleaned = cleaned.replace(/(\d)\s+(\d)/g, '$1$2');
  }

  // 3. Xóa khoảng trắng xung quanh các dấu câu: phẩy, gạch ngang, chấm, chấm phẩy, hai chấm
  cleaned = cleaned.replace(/\s+([,\-\.;:])/g, '$1');
  cleaned = cleaned.replace(/([,\-\.;:])\s+/g, '$1');

  // 4. Xóa khoảng trắng giữa số và chữ cái thường (ví dụ "35 a" -> "35a")
  cleaned = cleaned.replace(/(\d)\s+([a-z])/g, '$1$2');

  return cleaned.trim();
}

async function runRefSpacingFix() {
  console.log("=== CHẠY SCRIPT CHUẨN HÓA KHOẢNG TRẮNG TRONG CÁC CỘT REF ===\n");

  const { data: rows, error } = await supabase
    .from('liturgy_contents')
    .select('*');

  if (error || !rows) {
    console.error("Lỗi khi đọc Supabase:", error);
    return;
  }

  console.log(`Đã đọc ${rows.length} dòng từ Supabase.\n`);

  const textCols = ['r1_ref', 'r2_ref', 'gospel_ref'];

  let updatedCount = 0;
  let totalColsUpdated = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const updates = {};
    let hasChanges = false;

    textCols.forEach(col => {
      const orig = r[col];
      if (!orig || typeof orig !== 'string') return;

      const cleaned = cleanRefSpacing(orig);
      if (cleaned !== orig) {
        updates[col] = cleaned;
        hasChanges = true;
        totalColsUpdated++;
        // Log sự thay đổi để dễ theo dõi
        console.log(`- Thay đổi [${col}]: "${orig}" -> "${cleaned}"`);
      }
    });

    if (hasChanges) {
      const { error: updateErr } = await supabase
        .from('liturgy_contents')
        .update(updates)
        .eq('id', r.id);

      if (updateErr) {
        console.error(`Lỗi cập nhật dòng ID ${r.id} (${r.liturgy_key}):`, updateErr);
      } else {
        updatedCount++;
        console.log(`✅ Đã cập nhật dòng ID ${r.id} | Key: "${r.liturgy_key}"\n`);
      }
    }
  }

  console.log("=".repeat(60));
  console.log(`🎉 HOÀN THÀNH CHUẨN HÓA KHOẢNG TRẮNG REF!`);
  console.log(` - Tổng số bản ghi (rows) được cập nhật: ${updatedCount} dòng`);
  console.log(` - Tổng số cột được cập nhật: ${totalColsUpdated} cột`);
  console.log("=".repeat(60));
}

runRefSpacingFix();
