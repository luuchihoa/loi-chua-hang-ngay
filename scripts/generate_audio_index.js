import fs from 'fs';
import path from 'path';

/**
 * Script tự động quét các file MP3 trong private/audio hoặc danh sách R2
 * và sinh ra public/audio_index.json cho Web.
 */

const outputFilePath = path.join(process.cwd(), 'public', 'audio_index.json');
const privateAudioDir = path.join(process.cwd(), 'private', 'audio');

let bibleList = ['st_1', 'mt_1', 'mt_2', 'mt_3', 'mt_4', 'mt_5', 'mc_1', 'lc_1', 'ga_1', 'ga_3'];
let liturgyList = ['gospel_Mt_1331-35', 'gospel_Ga_1119-27', 'r1_1_Ga_47-16'];

if (fs.existsSync(privateAudioDir)) {
  const scanDir = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(scanDir(filePath));
      } else if (file.endsWith('.mp3')) {
        const basename = path.basename(file, '.mp3');
        results.push(basename);
      }
    });
    return results;
  };

  const allFiles = scanDir(privateAudioDir);
  allFiles.forEach(name => {
    if (name.startsWith('gospel_') || name.startsWith('r1_') || name.startsWith('r2_')) {
      if (!liturgyList.includes(name)) liturgyList.push(name);
    } else {
      if (!bibleList.includes(name)) bibleList.push(name);
    }
  });
}

const indexData = {
  version: '1.0.0',
  updatedAt: new Date().toISOString(),
  bible: Array.from(new Set(bibleList)),
  liturgy: Array.from(new Set(liturgyList))
};

fs.writeFileSync(outputFilePath, JSON.stringify(indexData, null, 2), 'utf-8');
console.log(`✅ [AUDIO INDEX] Đã tạo file public/audio_index.json với ${indexData.bible.length} file Kinh Thánh & ${indexData.liturgy.length} file Phụng Vụ.`);
