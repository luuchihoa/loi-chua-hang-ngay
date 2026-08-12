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

const invalidStandalone = new Set([
  'b', 'c', 'd', 'đ', 'g', 'h', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v', 'x',
  'ch', 'th', 'nh', 'tr', 'ph', 'kh', 'gi', 'ng', 'qu', 'ngh', 'gh',
  'B', 'C', 'D', 'Đ', 'G', 'H', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'X',
  'Ch', 'Th', 'Nh', 'Tr', 'Ph', 'Kh', 'Gi', 'Ng', 'Qu', 'Ngh', 'Gh',
  'CH', 'TH', 'NH', 'TR', 'PH', 'KH', 'GI', 'NG', 'QU', 'NGH', 'GH'
]);

export function cleanSplitWords(text) {
  if (!text || typeof text !== 'string') return text;

  let cleaned = text;

  // 1. Sửa trường hợp đặc biệt "100a m hiểu" -> "100a am hiểu"
  cleaned = cleaned.replace(/\b100a\s+m\s+hiểu\b/g, '100a am hiểu');

  // 2. Chuẩn hóa khoảng trắng dư thừa giữa phụ âm tách rời và phần còn lại của từ
  let prev;
  const splitPattern = /(^|[\s\(\"\'])([a-zA-ZđĐ]{1,3})\s+([a-zA-ZàáảãạâầấẩẫậăằắẳẵặeèéẻẽẹêềếểễệiìíỉĩịoòóỏõọôồốổỗộơờớởỡợuùúủũụưừứửữựyỳýỷỹỵđĐ]+)(?=[\s\.,;:!?\)\"\']|$)/g;

  do {
    prev = cleaned;
    cleaned = cleaned.replace(splitPattern, (match, prefix, t1, t2) => {
      if (invalidStandalone.has(t1)) {
        // Bỏ qua các nhãn phân đoạn đáp ca như "b Bấy", "c Nhưng"
        if ("abcdefgABCDEFG".includes(t1) && t2[0] === t2[0].toUpperCase() && t2[0] !== t2[0].toLowerCase()) {
          return match;
        }
        return prefix + t1 + t2;
      }
      return match;
    });
  } while (cleaned !== prev);

  return cleaned;
}

async function runFixSplitWords() {
  console.log("=== CHẠY SCRIPT TÌM VÀ SỬA LỖI TÁCH CHỮ TRÊN SUPABASE DATABASE (liturgy_contents) ===\n");

  let allRows = [];
  let page = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from("liturgy_contents")
      .select("*")
      .range(page * pageSize, (page + 1) * pageSize - 1);
      
    if (error) {
      console.error("❌ Lỗi khi tải dữ liệu từ Supabase:", error);
      process.exit(1);
    }
    
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < pageSize) break;
    page++;
  }

  console.log(`Đã đọc ${allRows.length} dòng từ Supabase.\n`);

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

      const cleaned = cleanSplitWords(orig);
      if (cleaned !== orig) {
        updates[col] = cleaned;
        r[col] = cleaned; // Update local memory row as well
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
        console.log(`✅ [${updatedRowsCount}] Đã cập nhật dòng ID ${r.id} | Key: "${r.liturgy_key}"`);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`🎉 HOÀN THÀNH CẬP NHẬT TRÊN SUPABASE!`);
  console.log(` - Tổng số dòng (rows) đã cập nhật: ${updatedRowsCount} dòng`);
  console.log(` - Tổng số cột bài đọc (r1, r2, psalm, gospel) đã cập nhật: ${totalColsUpdated} cột`);
  console.log("=".repeat(60));

  const outputPath = path.join(__dirname, "../liturgy_contents_rows.json");
  fs.writeFileSync(outputPath, JSON.stringify(allRows, null, 2), "utf-8");
  console.log(`💾 Đã đồng bộ file liturgy_contents_rows.json hoàn chỉnh!`);
}

runFixSplitWords();
