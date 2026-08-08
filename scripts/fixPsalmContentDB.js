import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("💥 Lỗi: Thiếu VITE_SUPABASE_URL hoặc Key trong file .env!");
  process.exit(1);
}

console.log(`📡 Kết nối tới Supabase Database: ${SUPABASE_URL}`);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const VALID_SUFFIXES = ['abcd', 'bcde', 'abc', 'bcd', 'cde', 'ab', 'bc', 'cd', 'de', 'ef', 'a', 'b', 'c', 'd', 'e'];

export function cleanVerseWord(text) {
  if (!text) return text;

  // Step 1: Repair broken verse labels (e.g. '2 cd ', '2c d ', '2 c d ')
  text = text.replace(/(\b\d+)\s+([a-e]{1,4})(?=\s|[\p{Lu}]|$)/gu, (m, g1, g2) => g1 + g2);
  text = text.replace(/(\b\d+[a-e]{1,3})\s+([a-e]{1,3})(?=\s|[\p{Lu}]|$)/gu, (m, g1, g2) => g1 + g2);

  // Step 2: Separate verse label from attached text
  text = text.replace(/(\b\d+)([\p{L}]+)/gu, (match, num, rest) => {
    if (!rest) return num;

    let matchedSuffix = '';
    for (const suf of VALID_SUFFIXES) {
      if (rest.startsWith(suf)) {
        const afterSuf = rest.slice(suf.length);
        if (afterSuf.length === 0) {
          matchedSuffix = suf;
          break;
        }
        if (/^[\p{Lu}]/u.test(afterSuf) || suf.length >= 2) {
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

export function formatPsalmContent(text) {
  if (typeof text !== 'string' || !text.trim()) return text;

  let cleaned = cleanVerseWord(text);

  // Step 3: Put mid-line verse numbers on a new line
  const lines = cleaned.split('\n');
  const resultLines = [];

  for (let line of lines) {
    let formatted = line.replace(/([^\n\d\s][^\n\d]*?)\s+(\d+(?:\s+\d+)?[a-h]{0,4})\b/g, (m, g1, g2) => g1 + '\n' + g2);
    resultLines.push(formatted);
  }

  return resultLines.join('\n');
}

async function runFixPsalmContent() {
  console.log("🔍 Đang tải toàn bộ dữ liệu psalm_content từ Supabase...");

  let allRows = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('liturgy_contents')
      .select('id, liturgy_key, cycle, psalm_content')
      .not('psalm_content', 'is', null)
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("💥 Lỗi query dữ liệu:", error.message);
      return;
    }

    if (data && data.length > 0) {
      allRows = allRows.concat(data);
      from += pageSize;
      if (data.length < pageSize) hasMore = false;
    } else {
      hasMore = false;
    }
  }

  console.log(`📊 Tổng số bản ghi có psalm_content: ${allRows.length}`);

  let updatedCount = 0;
  let unchangedCount = 0;

  for (let i = 0; i < allRows.length; i++) {
    const row = allRows[i];
    const original = row.psalm_content;
    const formatted = formatPsalmContent(original);

    if (original !== formatted) {
      const { error: updateErr } = await supabase
        .from('liturgy_contents')
        .update({ psalm_content: formatted })
        .eq('id', row.id);

      if (updateErr) {
        console.error(`❌ Lỗi update ID ${row.id} (${row.liturgy_key}):`, updateErr.message);
      } else {
        updatedCount++;
        console.log(`✅ [${updatedCount}] Fixed ID: ${row.id} | Key: ${row.liturgy_key}`);
      }
    } else {
      unchangedCount++;
    }
  }

  console.log(`\n🎉 HOÀN THÀNH SỬA TOÀN BỘ PSALM_CONTENT:`);
  console.log(`- Đã cập nhật & khôi phục chuẩn: ${updatedCount} bản ghi`);
  console.log(`- Đã chuẩn không cần sửa:       ${unchangedCount} bản ghi`);
}

runFixPsalmContent();
