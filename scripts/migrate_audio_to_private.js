import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_DIR = path.resolve(__dirname, '..');

const PUBLIC_AUDIO_DIR = path.join(BASE_DIR, 'public', 'audio');
const PRIVATE_AUDIO_DIR = path.join(BASE_DIR, 'private', 'audio');

function getFileHash(filepath) {
  const content = fs.readFileSync(filepath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function getAllMp3Files(dirPath, relativeRoot = '') {
  let results = [];
  if (!fs.existsSync(dirPath)) return results;

  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const item of items) {
    const relPath = path.join(relativeRoot, item.name);
    const fullPath = path.join(dirPath, item.name);

    if (item.isDirectory()) {
      results = results.concat(getAllMp3Files(fullPath, relPath));
    } else if (item.isFile() && item.name.endsWith('.mp3')) {
      results.push({ fullPath, relPath });
    }
  }
  return results;
}

function runMigration() {
  console.log('🚀 [AUDIO MIGRATION] Bắt đầu di chuyển Audio từ public/ -> private/...\n');

  const publicFiles = getAllMp3Files(PUBLIC_AUDIO_DIR);
  console.log(`📊 Tìm thấy ${publicFiles.length} file MP3 trong public/audio/`);

  if (publicFiles.length === 0) {
    console.log('ℹ️ Không có file MP3 nào trong public/audio/ (hoặc đã được di chuyển trước đó).');
    return;
  }

  // 1. Tính checksum ban đầu
  const initialHashes = new Map();
  for (const f of publicFiles) {
    initialHashes.set(f.relPath, getFileHash(f.fullPath));
  }

  // 2. Di chuyển từng file sang private/audio/
  let movedCount = 0;
  for (const f of publicFiles) {
    const targetPath = path.join(PRIVATE_AUDIO_DIR, f.relPath);
    const targetDir = path.dirname(targetPath);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.renameSync(f.fullPath, targetPath);
    movedCount++;
  }

  // 3. Xóa file manifest công khai cũ nếu tồn tại
  const oldPublicManifest = path.join(PUBLIC_AUDIO_DIR, 'bible', 'manifest.json');
  if (fs.existsSync(oldPublicManifest)) {
    fs.unlinkSync(oldPublicManifest);
    console.log('🗑️ Đã xóa public/audio/bible/manifest.json công khai.');
  }

  // 4. Xóa các file .tmp nếu có
  const oldTmpManifest = path.join(PUBLIC_AUDIO_DIR, 'bible', 'manifest.json.tmp');
  if (fs.existsSync(oldTmpManifest)) {
    fs.unlinkSync(oldTmpManifest);
  }

  // 5. Xác minh hậu di chuyển
  const privateFiles = getAllMp3Files(PRIVATE_AUDIO_DIR);
  const remainingPublicFiles = getAllMp3Files(PUBLIC_AUDIO_DIR);

  console.log(`\n🔍 Kết Quả Xác Minh:`);
  console.log(`- File MP3 trong private/audio/: ${privateFiles.length} (Kỳ vọng: ${publicFiles.length})`);
  console.log(`- File MP3 còn lại trong public/audio/: ${remainingPublicFiles.length} (Kỳ vọng: 0)`);

  if (remainingPublicFiles.length > 0) {
    console.error('❌ LỖI: Vẫn còn file MP3 trong public/audio/!');
    process.exit(1);
  }

  // 6. Kiểm tra checksum từng file
  let hashMismatch = false;
  for (const [relPath, expectedHash] of initialHashes.entries()) {
    const targetPath = path.join(PRIVATE_AUDIO_DIR, relPath);
    if (!fs.existsSync(targetPath)) {
      console.error(`❌ Mất file trong private: ${relPath}`);
      hashMismatch = true;
      continue;
    }

    const newHash = getFileHash(targetPath);
    if (newHash !== expectedHash) {
      console.error(`❌ Checksum không khớp cho file: ${relPath}`);
      hashMismatch = true;
    }
  }

  if (hashMismatch) {
    console.error('❌ LỖI MIGRATION: Checksum không trùng khớp!');
    process.exit(1);
  }

  console.log('\n✅ [MIGRATION HOÀN TẤT] 100% file MP3 đã di chuyển an toàn sang private/audio/ với Checksum trùng khớp!');
}

runMigration();
