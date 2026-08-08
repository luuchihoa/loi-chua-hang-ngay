import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://avrnbefzxtznpodugacz.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2cm5iZWZ6eHR6bnBvZHVnYWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MTU3MzksImV4cCI6MjA5OTE5MTczOX0._wZp4bK1b2XGSYYUWzQTw2mkyCyKvwOi6iyIIuauRKI";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function cleanText(text, isSingleNewlineField = false) {
  if (typeof text !== 'string') return text;
  let cleaned = text.normalize('NFC').trim();
  // Đảm bảo có khoảng trắng sau biểu tượng ✠
  cleaned = cleaned.replace(/✠([^\s])/g, '✠ $1');
  
  // Với các cột r1_content, r2_content, gospel_content, gospel_alleluia -> chuyển \n\n thành \n
  if (isSingleNewlineField) {
    cleaned = cleaned.replace(/(\r?\n)\s*(\r?\n)+/g, '\n');
  }
  return cleaned;
}

async function pushPreviewData() {
  const filePath = path.resolve(process.cwd(), 'preview_data.json');
  console.log(`=== ĐỌC DỮ LIỆU TỪ FILE: ${filePath} ===`);

  if (!fs.existsSync(filePath)) {
    console.error("💥 Không tìm thấy file preview_data.json!");
    return;
  }

  let rawData;
  try {
    rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error("💥 Lỗi đọc/parse file JSON:", err.message);
    return;
  }

  const items = Array.isArray(rawData) ? rawData : [rawData];
  console.log(`Đã nạp ${items.length} bản ghi từ file JSON.`);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const key = item.liturgy_key;
    const cycle = item.cycle || 'all';

    if (!key) {
      console.warn(`⚠️ Bản ghi thứ ${i + 1} không có liturgy_key, bỏ qua!`);
      continue;
    }

    // Chuẩn hóa định dạng các trường văn bản
    const payload = {
      liturgy_key: key,
      cycle: cycle,
      title: cleanText(item.title),
      quote: cleanText(item.quote),
      r1_ref: cleanText(item.r1_ref),
      r1_quote: cleanText(item.r1_quote),
      r1_intro: cleanText(item.r1_intro),
      r1_content: cleanText(item.r1_content, true),
      psalm_ref: cleanText(item.psalm_ref),
      psalm_content: cleanText(item.psalm_content),
      r2_ref: cleanText(item.r2_ref),
      r2_quote: cleanText(item.r2_quote),
      r2_intro: cleanText(item.r2_intro),
      r2_content: cleanText(item.r2_content, true),
      gospel_ref: cleanText(item.gospel_ref),
      gospel_alleluia: cleanText(item.gospel_alleluia, true),
      gospel_intro: cleanText(item.gospel_intro),
      gospel_content: cleanText(item.gospel_content, true),
      reflection: cleanText(item.reflection),
      extra_readings: item.extra_readings || null
    };

    // Kiểm tra bản ghi đã tồn tại trên Supabase chưa
    const { data: existingRows } = await supabase
      .from('liturgy_contents')
      .select('id')
      .eq('liturgy_key', key)
      .eq('cycle', cycle);

    if (existingRows && existingRows.length > 0) {
      // Đã có -> Cập nhật (Update)
      const existingId = existingRows[0].id;
      const { error: updateErr } = await supabase
        .from('liturgy_contents')
        .update(payload)
        .eq('id', existingId);

      if (updateErr) {
        console.error(`💥 Lỗi cập nhật ngày ${key} (Cycle: ${cycle}):`, updateErr.message);
      } else {
        console.log(`✅ [UPDATE THÀNH CÔNG] Key: "${key}", Cycle: "${cycle}" (ID: ${existingId})`);
      }
    } else {
      // Chưa có -> Thêm mới (Insert)
      const { error: insertErr, data: insertedData } = await supabase
        .from('liturgy_contents')
        .insert([payload])
        .select();

      if (insertErr) {
        console.error(`💥 Lỗi thêm mới ngày ${key} (Cycle: ${cycle}):`, insertErr.message);
      } else {
        console.log(`✅ [INSERT THÀNH CÔNG] Key: "${key}", Cycle: "${cycle}" (ID: ${insertedData?.[0]?.id})`);
      }
    }
  }

  console.log("\n🎉 HOÀN THÀNH ĐẨY DỮ LIỆU LÊN SUPABASE DATABASE!");
}

pushPreviewData();
