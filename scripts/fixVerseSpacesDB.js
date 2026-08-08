import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://avrnbefzxtznpodugacz.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2cm5iZWZ6eHR6bnBvZHVnYWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MTU3MzksImV4cCI6MjA5OTE5MTczOX0._wZp4bK1b2XGSYYUWzQTw2mkyCyKvwOi6iyIIuauRKI";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export function cleanVerseSpacing(text) {
  if (!text) return text;

  const lines = text.split('\n');
  const cleanedLines = lines.map(line => {
    if (!line) return line;

    // Preserve line-start verse number + its trailing space (e.g. "2 ", "14 ", "7a ")
    const startMatch = line.match(/^(\s*\d+[a-zA-Z]*[\s\u00A0]+)/);
    let prefix = "";
    let restOfLine = line;

    if (startMatch) {
      prefix = startMatch[1];
      restOfLine = line.substring(prefix.length);
    }

    // In restOfLine, remove spaces BEFORE any verse numbers in middle of sentence
    const cleanedRest = restOfLine.replace(/([^\n\s\u00A0])[\s\u00A0]+(\d+[a-zA-Z]*)(?=[\s\u00A0\p{P}]|$)/gu, '$1$2');

    return prefix + cleanedRest;
  });

  return cleanedLines.join('\n');
}

async function runVerseSpacingFix() {
  console.log("=== CHẠY SCRIPT CHUẨN HÓA KHOẢNG TRẮNG SỐ CÂU TRÊN DATABASE ===");

  const { data: rows, error } = await supabase
    .from('liturgy_contents')
    .select('id, liturgy_key, cycle, r1_content, r2_content, gospel_content');

  if (error || !rows) {
    console.error("Lỗi khi đọc Supabase:", error);
    return;
  }

  console.log(`Đã đọc ${rows.length} dòng từ Supabase.\n`);

  let updatedCount = 0;
  let totalColsUpdated = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const updates = {};
    let hasChanges = false;

    ['r1_content', 'r2_content', 'gospel_content'].forEach(col => {
      const orig = r[col];
      if (!orig) return;

      const cleaned = cleanVerseSpacing(orig);
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
  console.log(`🎉 HOÀN THÀNH CHUẨN HÓA!`);
  console.log(` - Tổng số bản ghi (rows) được cập nhật: ${updatedCount} dòng`);
  console.log(` - Tổng số cột (r1, r2, gospel) được cập nhật: ${totalColsUpdated} cột`);
  console.log("=".repeat(60));
}

runVerseSpacingFix();
