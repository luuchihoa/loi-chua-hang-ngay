import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("💥 Lỗi: Thiếu VITE_SUPABASE_URL hoặc Key trong file .env!");
  process.exit(1);
}

console.log(`📡 Đang kết nối tới Supabase: ${SUPABASE_URL}`);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function cleanText(text, isSingleNewlineField = false) {
  if (typeof text !== 'string') return text;
  let cleaned = text.normalize('NFC').trim();
  cleaned = cleaned.replace(/✠([^\s])/g, '✠ $1');
  if (isSingleNewlineField) {
    cleaned = cleaned.replace(/(\r?\n)\s*(\r?\n)+/g, '\n');
  }
  return cleaned;
}

const VALID_SUFFIXES = ['abcd', 'bcde', 'abc', 'bcd', 'cde', 'ab', 'bc', 'cd', 'de', 'ef', 'a', 'b', 'c', 'd', 'e'];

function cleanVerseWord(text) {
  if (!text) return text;
  text = text.replace(/(\b\d+)\s+([a-e]{1,4})(?=\s|[\p{Lu}]|$)/gu, (m, g1, g2) => g1 + g2);
  text = text.replace(/(\b\d+[a-e]{1,3})\s+([a-e]{1,3})(?=\s|[\p{Lu}]|$)/gu, (m, g1, g2) => g1 + g2);
  text = text.replace(/(\b\d+)([\p{L}]+)/gu, (match, num, rest) => {
    if (!rest) return num;
    let matchedSuffix = '';
    for (const suf of VALID_SUFFIXES) {
      if (rest.startsWith(suf)) {
        const afterSuf = rest.slice(suf.length);
        if (afterSuf.length === 0 || /^[\p{Lu}]/u.test(afterSuf) || suf.length >= 2) {
          matchedSuffix = suf;
          break;
        }
      }
    }
    if (matchedSuffix) {
      const remainingText = rest.slice(matchedSuffix.length);
      return num + matchedSuffix + (remainingText ? ' ' + remainingText : '');
    } else {
      return num + ' ' + rest;
    }
  });
  return text;
}

function formatPsalmContent(text) {
  if (typeof text !== 'string' || !text.trim()) return text;
  let cleaned = cleanVerseWord(text);
  const lines = cleaned.split('\n');
  const resultLines = [];
  for (let line of lines) {
    let formatted = line.replace(/([^\n\d\s][^\n\d]*?)\s+(\d+(?:\s+\d+)?[a-h]{0,4})\b/g, (m, g1, g2) => g1 + '\n' + g2);
    resultLines.push(formatted);
  }
  return resultLines.join('\n');
}

async function pushAllData() {
  const filePath = path.resolve(process.cwd(), 'data.json');
  console.log(`=== ĐỌC DỮ LIỆU TỪ FILE: ${filePath} ===`);

  if (!fs.existsSync(filePath)) {
    console.error("💥 Không tìm thấy file data.json!");
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
  console.log(`📦 Đã nạp ${items.length} bản ghi từ file data.json.`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const key = item.liturgy_key;
    const cycle = item.cycle || 'all';

    if (!key) {
      console.warn(`⚠️ Bản ghi thứ ${i + 1} không có liturgy_key, bỏ qua!`);
      continue;
    }

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
      psalm_content: formatPsalmContent(cleanText(item.psalm_content)),
      r2_ref: cleanText(item.r2_ref),
      r2_quote: cleanText(item.r2_quote),
      r2_intro: cleanText(item.r2_intro),
      r2_content: cleanText(item.r2_content, true),
      gospel_ref: cleanText(item.gospel_ref),
      gospel_alleluia: item.gospel_alleluia ? cleanText(item.gospel_alleluia).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim() : null,
      gospel_intro: cleanText(item.gospel_intro),
      gospel_content: cleanText(item.gospel_content, true),
      reflection: cleanText(item.reflection),
      extra_readings: item.extra_readings || null
    };

    const { data: existingRows } = await supabase
      .from('liturgy_contents')
      .select('id')
      .eq('liturgy_key', key)
      .eq('cycle', cycle);

    if (existingRows && existingRows.length > 0) {
      const existingId = existingRows[0].id;
      const { error: updateErr } = await supabase
        .from('liturgy_contents')
        .update(payload)
        .eq('id', existingId);

      if (updateErr) {
        console.error(`❌ [${i + 1}/${items.length}] Lỗi cập nhật key "${key}" (cycle: ${cycle}):`, updateErr.message);
        failCount++;
      } else {
        console.log(`✅ [${i + 1}/${items.length}] [UPDATE] Key: "${key}" (cycle: ${cycle})`);
        successCount++;
      }
    } else {
      const { error: insertErr } = await supabase
        .from('liturgy_contents')
        .insert([payload]);

      if (insertErr) {
        console.error(`❌ [${i + 1}/${items.length}] Lỗi thêm mới key "${key}" (cycle: ${cycle}):`, insertErr.message);
        failCount++;
      } else {
        console.log(`✅ [${i + 1}/${items.length}] [INSERT] Key: "${key}" (cycle: ${cycle})`);
        successCount++;
      }
    }
  }

  console.log(`\n🎉 BÁO CÁO KẾT QUẢ:`);
  console.log(`- Thành công: ${successCount}/${items.length}`);
  console.log(`- Thất bại:   ${failCount}/${items.length}`);
}

pushAllData();
