import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { generateAudioByRef } from './generateElevenLabsAudio.js';

dotenv.config();

/**
 * Script tự động đọc tất cả bài Phúc Âm trong data.json / Supabase
 * và tự động tải file MP3 theo gospel_ref nếu chưa có!
 */

async function batchGenerate() {
  const args = process.argv.slice(2);
  const seasonArg = args.find(a => a.startsWith('--season='))?.split('=')[1]?.toLowerCase() || 'all';
  const fromToday = args.includes('--from-today') || !args.some(a => a.startsWith('--from-date='));
  const daysLimit = parseInt(args.find(a => a.startsWith('--days='))?.split('=')[1] || '30', 10);
  
  // Ngày hôm nay YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  console.log(`🚀 BẮT ĐẦU TỰ ĐỘNG TẠO FILE MP3 PHÚC ÂM (CHỈ CHẠY TỪ HÔM NAY TRỞ ĐI)...`);
  console.log(`📅 Ngày bắt đầu: ${todayStr} | Giới hạn: ${daysLimit} ngày tới | Phụ lục: ${seasonArg.toUpperCase()}\n`);

  const dataPath = path.resolve('data.json');
  if (!fs.existsSync(dataPath)) {
    console.error('❌ Không tìm thấy file data.json');
    return;
  }

  const raw = fs.readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(raw);

  // Lọc bài đọc từ HÔM NAY trở đi
  const filteredData = data.filter(item => {
    if (!item.gospel_ref || !item.gospel_content) return false;
    
    // Lọc theo ngày
    if (fromToday && item.date) {
      if (item.date < todayStr) {
        return false; // BỎ QUA CÁC NGÀY ĐÃ QUÁ TRONG QUÁ KHỨ!
      }
    }

    if (seasonArg === 'all') return true;
    
    const season = (item.season || item.liturgical_season || '').toLowerCase();
    const title = (item.title || '').toLowerCase();

    if (seasonArg === 'thuongnien' || seasonArg === 'ordinary') {
      return season.includes('thường niên') || title.includes('thường niên');
    }
    if (seasonArg === 'muavong' || seasonArg === 'advent') {
      return season.includes('mùa vọng') || title.includes('mùa vọng');
    }
    if (seasonArg === 'giangsinh' || seasonArg === 'christmas') {
      return season.includes('giáng sinh') || title.includes('giáng sinh');
    }
    if (seasonArg === 'muachay' || seasonArg === 'lent') {
      return season.includes('mùa chay') || title.includes('mùa chay');
    }
    if (seasonArg === 'phucsinh' || seasonArg === 'easter') {
      return season.includes('phục sinh') || title.includes('phục sinh');
    }
    return true;
  }).slice(0, daysLimit); // Chỉ lấy trong số ngày chỉ định

  let totalCount = 0;
  let skippedCount = 0;
  let generatedCount = 0;

  for (const item of filteredData) {
    const ref = item.gospel_ref;
    const content = item.gospel_content;

    totalCount++;
    console.log(`\n--------------------------------------------------`);
    console.log(`📌 [${totalCount}/${filteredData.length}] Ngày: ${item.date || 'Lễ'} | ${ref} (${item.title || ''})`);

    const result = await generateAudioByRef(ref, content);
    if (result) {
      if (typeof result === 'string' && result.includes('gospel_')) {
        const isExisting = fs.existsSync(path.resolve('public', result.replace(/^\//, '')));
        if (isExisting) {
          skippedCount++;
        } else {
          generatedCount++;
        }
      }
    }
  }

  console.log(`\n==================================================`);
  console.log(`🎉 HOÀN THÀNH TẠO AUDIO TỪ HÔM NAY (${todayStr})`);
  console.log(`📊 Tổng số bài Phúc Âm xử lý: ${totalCount}`);
  console.log(`⚡ Bài đã có sẵn (Bỏ qua): ${skippedCount}`);
  console.log(`🎙️ Bài mới vừa tạo MP3 thành công: ${generatedCount}`);
}

batchGenerate();
