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

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function swapHienXuong() {
  console.log("=== ĐẢO VỊ TRÍ THÁNH LỄ VỌNG VÀ CHÍNH NGÀY CHO 'feast_hien_xuong' ===\n");

  const jsonPath = path.join(__dirname, "../liturgy_contents_rows.json");
  const allRows = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  const targetIdx = allRows.findIndex(r => r.liturgy_key === 'feast_hien_xuong');
  if (targetIdx === -1) {
    console.error("❌ Không tìm thấy bản ghi feast_hien_xuong!");
    return;
  }

  const r = allRows[targetIdx];
  const extra = typeof r.extra_readings === 'string' ? JSON.parse(r.extra_readings) : r.extra_readings;
  
  const fullMassVigil = extra.find(x => x.type === 'full_mass');
  if (!fullMassVigil) {
    console.error("❌ Không tìm thấy full_mass trong extra_readings của feast_hien_xuong!");
    return;
  }

  const dayAltsAndSequence = extra.filter(x => x.type !== 'full_mass');

  // 1. Tạo đối tượng Full Mass cho Thánh Lễ Chính Ngày
  const dayFullMass = {
    type: 'full_mass',
    mass_title: 'Thánh Lễ Chính Ngày',
    title: 'LỄ CHÚA THÁNH THẦN HIỆN XUỐNG\nThánh lễ Chính Ngày',
    quote: r.quote || 'Như Chúa Cha đã sai Thầy, thì Thầy cũng sai anh em. Anh em hãy nhận lấy Thánh Thần.',
    r1_ref: r.r1_ref,
    r1_intro: r.r1_intro,
    r1_quote: r.r1_quote,
    r1_content: r.r1_content,
    psalm_ref: r.psalm_ref,
    psalm_content: r.psalm_content,
    r2_ref: r.r2_ref,
    r2_intro: r.r2_intro,
    r2_quote: r.r2_quote,
    r2_content: r.r2_content,
    gospel_ref: r.gospel_ref,
    gospel_intro: r.gospel_intro,
    gospel_alleluia: r.gospel_alleluia,
    gospel_content: r.gospel_content,
    reflection: r.reflection || '',
    extra_readings: dayAltsAndSequence
  };

  // 2. Chuẩn hóa các bài đọc tùy chọn Cựu Ước trong Thánh Lễ Vọng (Xh 19, Ed 37, Ge 3)
  const vigilAlts = (fullMassVigil.extra_readings || []).map((sub, i) => {
    let title = sub.title;
    let option_label = sub.option_label;
    if (sub.ref?.includes('Xh')) {
      title = 'Hoặc sách Xuất Hành';
      option_label = 'Hoặc Xuất Hành';
    } else if (sub.ref?.includes('Ed')) {
      title = 'Hoặc sách Ê-dê-ki-en';
      option_label = 'Hoặc Ê-dê-ki-en';
    } else if (sub.ref?.includes('Ge')) {
      title = 'Hoặc sách Giô-en';
      option_label = 'Hoặc Giô-en';
    }
    return {
      ...sub,
      title,
      option_label,
      target_section: 'r1'
    };
  });

  // 3. Tạo bản ghi mới cho Thánh Lễ Vọng làm Mặc Định
  const updatedRow = {
    ...r,
    title: 'LỄ CHÚA THÁNH THẦN HIỆN XUỐNG\nThánh lễ Vọng',
    mass_title: 'Thánh Lễ Vọng',
    quote: fullMassVigil.quote || 'Từ lòng Người, sẽ tuôn chảy những dòng nước hằng sống.',
    r1_ref: fullMassVigil.r1_ref,
    r1_intro: fullMassVigil.r1_intro,
    r1_quote: fullMassVigil.r1_quote,
    r1_content: fullMassVigil.r1_content,
    psalm_ref: fullMassVigil.psalm_ref,
    psalm_content: fullMassVigil.psalm_content,
    r2_ref: fullMassVigil.r2_ref,
    r2_intro: fullMassVigil.r2_intro,
    r2_quote: fullMassVigil.r2_quote,
    r2_content: fullMassVigil.r2_content,
    gospel_ref: (fullMassVigil.gospel_ref === 'Ga 7,37-89' || !fullMassVigil.gospel_ref) ? 'Ga 7,37-39' : fullMassVigil.gospel_ref,
    gospel_intro: fullMassVigil.gospel_intro || '✠ Tin Mừng Chúa Giê-su Ki-tô theo thánh Gio-an.',
    gospel_alleluia: fullMassVigil.gospel_alleluia || 'Ha-lê-lui-a. Ha-lê-lui-a. Lạy Chúa Thánh Thần, xin ngự đến, cho tâm hồn tín hữu được nhuần thấm muôn ơn, và cháy lửa yêu mến Ngài. Ha-lê-lui-a.',
    gospel_content: fullMassVigil.gospel_content,
    reflection: fullMassVigil.reflection || '',
    extra_readings: [
      ...vigilAlts,
      dayFullMass
    ]
  };

  // Cập nhật mảng allRows
  allRows[targetIdx] = updatedRow;

  // 4. Lưu lại vào liturgy_contents_rows.json
  fs.writeFileSync(jsonPath, JSON.stringify(allRows, null, 2), "utf-8");
  console.log("💾 Đã cập nhật thành công file local liturgy_contents_rows.json!");

  // 5. Đồng bộ lên Supabase Database
  try {
    const payload = {
      title: updatedRow.title,
      mass_title: updatedRow.mass_title,
      quote: updatedRow.quote,
      r1_ref: updatedRow.r1_ref,
      r1_intro: updatedRow.r1_intro,
      r1_quote: updatedRow.r1_quote,
      r1_content: updatedRow.r1_content,
      psalm_ref: updatedRow.psalm_ref,
      psalm_content: updatedRow.psalm_content,
      r2_ref: updatedRow.r2_ref,
      r2_intro: updatedRow.r2_intro,
      r2_quote: updatedRow.r2_quote,
      r2_content: updatedRow.r2_content,
      gospel_ref: updatedRow.gospel_ref,
      gospel_intro: updatedRow.gospel_intro,
      gospel_alleluia: updatedRow.gospel_alleluia,
      gospel_content: updatedRow.gospel_content,
      reflection: updatedRow.reflection,
      extra_readings: updatedRow.extra_readings
    };

    const { data, error } = await supabase
      .from('liturgy_contents')
      .update(payload)
      .eq('liturgy_key', 'feast_hien_xuong');

    if (error) {
      console.warn("⚠️ Cảnh báo cập nhật Supabase:", error.message);
    } else {
      console.log("✅ Đã cập nhật thành công lên Supabase Database (liturgy_contents)!");
    }
  } catch (err) {
    console.warn("⚠️ Lỗi mạng hoặc Supabase offline:", err.message);
  }

  console.log("\n🎉 HOÀN TẤT ĐẢO VỊ TRÍ feast_hien_xuong!");
}

swapHienXuong();
