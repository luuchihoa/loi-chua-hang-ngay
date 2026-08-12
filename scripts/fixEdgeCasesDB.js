import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://avrnbefzxtznpodugacz.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_SERVICE_ROLE_KEY trong environment");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export function cleanEdgeCases(text) {
  if (!text || typeof text !== 'string') return text;

  let cleaned = text;

  // 1. Sửa số câu bị đứt đoạn bởi nốt xuống dòng: "1\n7 " -> "17 ", "1\n4 " -> "14 ", "1\n3ab" -> "13ab", "1\n8 " -> "18 "
  cleaned = cleaned.replace(/(\d+)[\r\n]+(\d+[\s\w])/g, '$1$2');

  // 2. Sửa nhãn câu dính chữ c của từ "còn": "9bc òn" -> "9b còn"
  cleaned = cleaned.replace(/\b(\d+[a-z])c\s+(òn|ùng|ác|ó|ủng|húng)\b/g, '$1 c$2');

  return cleaned;
}

async function runFixEdgeCases() {
  console.log("=== CHẠY SCRIPT SỬA CÁC LỖI EDGE CASES PHÁT HIỆN BỞI QA SUBAGENT ===\n");

  const jsonPath = path.join(__dirname, "../liturgy_contents_rows.json");
  const allRows = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  const contentCols = ['r1_content', 'r2_content', 'psalm_content', 'gospel_content'];
  let updatedRowsCount = 0;

  for (let i = 0; i < allRows.length; i++) {
    const r = allRows[i];
    const updates = {};
    let hasChanges = false;

    contentCols.forEach(col => {
      const orig = r[col];
      if (!orig || typeof orig !== 'string') return;

      const cleaned = cleanEdgeCases(orig);
      if (cleaned !== orig) {
        updates[col] = cleaned;
        r[col] = cleaned;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      const { error: updateErr } = await supabase
        .from('liturgy_contents')
        .update(updates)
        .eq('id', r.id);

      if (updateErr) {
        console.error(`❌ Lỗi cập nhật dòng ID ${r.id} (${r.liturgy_key}):`, updateErr);
      } else {
        updatedRowsCount++;
        console.log(`✅ [${updatedRowsCount}] Đã sửa edge case cho dòng ID ${r.id} | Key: "${r.liturgy_key}"`);
      }
    }
  }

  console.log(`\n🎉 Hoàn thành sửa các edge cases! Tổng số dòng cập nhật thêm: ${updatedRowsCount}`);
  fs.writeFileSync(jsonPath, JSON.stringify(allRows, null, 2), "utf-8");
  console.log(`💾 Đã cập nhật file liturgy_contents_rows.json.`);
}

runFixEdgeCases();
