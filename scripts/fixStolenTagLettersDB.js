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

const validWords = new Set(['cúi', 'dẫn', 'cả', 'cửa', 'biết', 'duy', 'còn', 'bền', 'công', 'con', 'bảo', 'cứu', 'bởi', 'dõi']);

const pattern = /\b(\d+)([a-zA-Z]{1,2})\s+([a-zàáảãạâầấẩẫậăằắẳẵặeèéẻẽẹêềếểễệiìíỉĩịoòóỏõọôồốổỗộơờớởỡợuùúủũụưừứửữựyỳýỷỹỵđ]+)/g;

export function cleanStolenTagLetters(text) {
  if (!text || typeof text !== 'string') return text;

  return text.replace(pattern, (match, digits, tagLet, wordFrag) => {
    const stolenChar = tagLet[tagLet.length - 1];
    const reconstructed = `${stolenChar}${wordFrag}`.toLowerCase();

    if (validWords.has(reconstructed)) {
      const prefixTag = tagLet.slice(0, -1);
      const newTag = (digits + prefixTag).trim();
      return newTag ? `${newTag} ${reconstructed}` : reconstructed;
    }
    return match;
  });
}

async function runFixStolenTagLetters() {
  console.log("=== CHẠY SCRIPT CHUẨN HÓA 50 VỊ TRÍ NHÃN CÂU DÍNH CHỮ ĐẦU TRÊN SUPABASE DATABASE ===\n");

  const jsonPath = path.join(__dirname, "../liturgy_contents_rows.json");
  const allRows = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  const contentCols = ['r1_content', 'r2_content', 'psalm_content', 'gospel_content'];
  let updatedRowsCount = 0;
  let totalColsUpdated = 0;

  for (let i = 0; i < allRows.length; i++) {
    const r = allRows[i];
    const updates = {};
    let hasChanges = false;

    contentCols.forEach(col => {
      const orig = r[col];
      if (!orig || typeof orig !== 'string') return;

      const cleaned = cleanStolenTagLetters(orig);
      if (cleaned !== orig) {
        updates[col] = cleaned;
        r[col] = cleaned;
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
        console.error(`❌ Lỗi cập nhật dòng ID ${r.id} (${r.liturgy_key}):`, updateErr);
      } else {
        updatedRowsCount++;
        console.log(`✅ [${updatedRowsCount}] Đã sửa dòng ID ${r.id} | Key: "${r.liturgy_key}"`);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`🎉 HOÀN THÀNH CẬP NHẬT 50 VỊ TRÍ TRÊN SUPABASE!`);
  console.log(` - Tổng số dòng (rows) đã cập nhật: ${updatedRowsCount} dòng`);
  console.log(` - Tổng số cột đã cập nhật: ${totalColsUpdated} cột`);
  console.log("=".repeat(60));

  fs.writeFileSync(jsonPath, JSON.stringify(allRows, null, 2), "utf-8");
  console.log(`💾 Đã cập nhật file liturgy_contents_rows.json.`);
}

runFixStolenTagLetters();
