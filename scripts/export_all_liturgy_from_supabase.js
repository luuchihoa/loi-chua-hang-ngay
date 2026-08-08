import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Không tìm thấy VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY trong file .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportAllLiturgy() {
  console.log("🔄 Đang tải toàn bộ dữ liệu Phụng Vụ từ Supabase...");
  
  let allRows = [];
  let page = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from("liturgy_contents")
      .select("*")
      .range(page * pageSize, (page + 1) * pageSize - 1);
      
    if (error) {
      console.error("❌ Lỗi khi tải dữ liệu:", error);
      process.exit(1);
    }
    
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < pageSize) break;
    page++;
  }

  console.log(`✅ Đã tải thành công tổng cộng ${allRows.length} dòng từ Supabase!`);
  
  const r2Rows = allRows.filter(r => r.r2_ref && r.r2_content && r.r2_content.trim().length > 10);
  console.log(`📊 Trong đó có đúng ${r2Rows.length} dòng CÓ BÀI ĐỌC 2 (r2_ref)!`);

  const outputPath = path.join(__dirname, "../liturgy_contents_rows.json");
  fs.writeFileSync(outputPath, JSON.stringify(allRows, null, 2), "utf-8");
  console.log(`💾 Đã cập nhật file liturgy_contents_rows.json hoàn chỉnh!`);
}

exportAllLiturgy();
