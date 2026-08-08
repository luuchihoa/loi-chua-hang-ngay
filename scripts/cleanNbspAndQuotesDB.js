import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://avrnbefzxtznpodugacz.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2cm5iZWZ6eHR6bnBvZHVnYWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MTU3MzksImV4cCI6MjA5OTE5MTczOX0._wZp4bK1b2XGSYYUWzQTw2mkyCyKvwOi6iyIIuauRKI";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export function cleanNbspAndQuotes(text) {
  if (!text || typeof text !== 'string') return text;

  let cleaned = text;

  // 1. Convert Non-Breaking Space \u00A0 to regular space ' '
  cleaned = cleaned.replace(/\u00A0/g, ' ');

  // 2. Remove leading space inside opening quote “ or ( or [
  cleaned = cleaned.replace(/([“\(\[])\s+/g, '$1');

  // 3. Remove trailing space inside closing quote ” or ) or ]
  cleaned = cleaned.replace(/\s+([”\)\.]])/g, '$1');

  // 4. Collapse multiple consecutive spaces into single space per line
  cleaned = cleaned.split('\n').map(line => line.replace(/[ \t]+/g, ' ')).join('\n');

  return cleaned;
}

async function runNbspAndQuotesFix() {
  console.log("=== CHẠY SCRIPT CHUẨN HÓA NBSP (\\u00A0) & KHOẢNG TRẮNG NGOẶC KÉP TRÊN DATABASE ===");

  const { data: rows, error } = await supabase
    .from('liturgy_contents')
    .select('*');

  if (error || !rows) {
    console.error("Lỗi khi đọc Supabase:", error);
    return;
  }

  console.log(`Đã đọc ${rows.length} dòng từ Supabase.\n`);

  const textCols = [
    'title', 'quote',
    'r1_ref', 'r1_quote', 'r1_intro', 'r1_content',
    'psalm_ref', 'psalm_content',
    'r2_ref', 'r2_quote', 'r2_intro', 'r2_content',
    'gospel_ref', 'gospel_alleluia', 'gospel_intro', 'gospel_content'
  ];

  let updatedCount = 0;
  let totalColsUpdated = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const updates = {};
    let hasChanges = false;

    textCols.forEach(col => {
      const orig = r[col];
      if (!orig || typeof orig !== 'string') return;

      const cleaned = cleanNbspAndQuotes(orig);
      if (cleaned !== orig) {
        updates[col] = cleaned;
        hasChanges = true;
        totalColsUpdated++;
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
        if (updatedCount % 50 === 0 || updatedCount === 1) {
          console.log(`✅ [${updatedCount}] Đã cập nhật dòng ID ${r.id} | Key: "${r.liturgy_key}" | Cycle: "${r.cycle}"`);
        }
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`🎉 HOÀN THÀNH CHUẨN HÓA NBSP & NGOẶC KÉP!`);
  console.log(` - Tổng số bản ghi (rows) được cập nhật: ${updatedCount} dòng`);
  console.log(` - Tổng số cột được cập nhật: ${totalColsUpdated} cột`);
  console.log("=".repeat(60));
}

runNbspAndQuotesFix();
