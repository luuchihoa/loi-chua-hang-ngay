import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_DIR = path.resolve(__dirname, '..');

const PUBLIC_DIR = path.join(BASE_DIR, 'public');
const DIST_DIR = path.join(BASE_DIR, 'dist');

function findMp3Files(dirPath) {
  let results = [];
  if (!fs.existsSync(dirPath)) return results;

  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    if (item.isDirectory()) {
      results = results.concat(findMp3Files(fullPath));
    } else if (item.isFile() && item.name.endsWith('.mp3')) {
      results.push(fullPath);
    }
  }
  return results;
}

function runAssertion() {
  console.log('🛡️ [PREBUILD GUARD] Kiểm tra bảo mật kho Audio công khai...');

  const publicMp3s = findMp3Files(PUBLIC_DIR);
  if (publicMp3s.length > 0) {
    console.error(`❌ VI PHẠM BẢO MẬT: Tìm thấy ${publicMp3s.length} file MP3 trong public/:`);
    publicMp3s.forEach(p => console.error(`  - ${p}`));
    process.exit(1);
  }

  // Kiểm tra public manifest chứa list MP3
  const publicManifest = path.join(PUBLIC_DIR, 'audio', 'bible', 'manifest.json');
  if (fs.existsSync(publicManifest)) {
    try {
      const data = JSON.parse(fs.readFileSync(publicManifest, 'utf-8'));
      if (data && Array.isArray(data.files) && data.files.length > 0) {
        console.error(`❌ VI PHẠM BẢO MẬT: public/audio/bible/manifest.json chứa danh sách ${data.files.length} file MP3 công khai!`);
        process.exit(1);
      }
    } catch(e) {}
  }

  const distMp3s = findMp3Files(DIST_DIR);
  if (distMp3s.length > 0) {
    console.error(`❌ VI PHẠM BẢO MẬT: Tìm thấy ${distMp3s.length} file MP3 trong dist/:`);
    distMp3s.forEach(p => console.error(`  - ${p}`));
    process.exit(1);
  }

  console.log('✅ [PREBUILD GUARD] Đạt tiêu chuẩn: 0 file MP3 trong public/ và dist/. Quá trình build an toàn.');
}

runAssertion();
