import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_DIR = path.resolve(__dirname, '..');

const PRIVATE_AUDIO_ROOT = process.env.AUDIO_PRIVATE_ROOT || path.join(BASE_DIR, 'private', 'audio');
const BIBLE_AUDIO_DIR = path.join(PRIVATE_AUDIO_ROOT, 'bible');
const MANIFEST_PATH = path.join(BIBLE_AUDIO_DIR, 'manifest.json');

if (!fs.existsSync(BIBLE_AUDIO_DIR)) {
  fs.mkdirSync(BIBLE_AUDIO_DIR, { recursive: true });
}

let files = [];
if (fs.existsSync(BIBLE_AUDIO_DIR)) {
  files = fs.readdirSync(BIBLE_AUDIO_DIR)
    .filter(fn => fn.endsWith('.mp3') && !fn.includes('test'))
    .sort();
}

const payload = {
  version: 1,
  generatedAt: new Date().toISOString(),
  total: files.length,
  files
};

const tmpPath = `${MANIFEST_PATH}.tmp`;
fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf-8');
fs.renameSync(tmpPath, MANIFEST_PATH);

console.log(`✅ [PRIVATE BIBLE CATALOG] Đã cập nhật private catalog (${files.length} file mp3 tại ${MANIFEST_PATH})`);
