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

async function runReplaceGospelQuote() {
  console.log("=== CHẠY SCRIPT THAY KÍ TỰ KEY 'gospel_quote' THÀNH 'quote' TRONG extra_readings BẢNG liturgy_contents ===\n");

  const jsonPath = path.join(__dirname, "../liturgy_contents_rows.json");
  const allRows = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  let updatedRowsCount = 0;
  let totalItemsUpdated = 0;

  for (let i = 0; i < allRows.length; i++) {
    const r = allRows[i];
    let extra = r.extra_readings;
    if (!extra) continue;

    if (typeof extra === 'string') {
      try {
        extra = JSON.parse(extra);
      } catch (e) {
        continue;
      }
    }

    if (!Array.isArray(extra)) continue;

    let hasChanges = false;
    extra.forEach(item => {
      if (item && typeof item === 'object' && 'gospel_quote' in item) {
        item.quote = item.gospel_quote;
        delete item.gospel_quote;
        hasChanges = true;
        totalItemsUpdated++;
      }
    });

    if (hasChanges) {
      r.extra_readings = extra;

      const { error: updateErr } = await supabase
        .from('liturgy_contents')
        .update({ extra_readings: extra })
        .eq('id', r.id);

      if (updateErr) {
        console.error(`❌ Lỗi cập nhật dòng ID ${r.id} (${r.liturgy_key}):`, updateErr);
      } else {
        updatedRowsCount++;
        console.log(`✅ [${updatedRowsCount}] Đã chuyển 'gospel_quote' -> 'quote' cho dòng ID ${r.id} | Key: "${r.liturgy_key}"`);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`🎉 HOÀN THÀNH CẬP NHẬT TRÊN SUPABASE!`);
  console.log(` - Tổng số dòng (rows) đã cập nhật: ${updatedRowsCount} dòng`);
  console.log(` - Tổng số mục extra_readings đã đổi key: ${totalItemsUpdated} mục`);
  console.log("=".repeat(60));

  fs.writeFileSync(jsonPath, JSON.stringify(allRows, null, 2), "utf-8");
  console.log(`💾 Đã cập nhật file liturgy_contents_rows.json.`);
}

runReplaceGospelQuote();
