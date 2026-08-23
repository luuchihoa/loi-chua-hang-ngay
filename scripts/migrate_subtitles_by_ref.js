#!/usr/bin/env node

/** Chuẩn hoá sub/<ref>.srt để basename khớp chính xác file MP3 theo ref. */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { normalizeAudioRef } from '../src/utils/audioNaming.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const subDir = path.join(root, 'private', 'audio', 'sub');
const cache = JSON.parse(fs.readFileSync(path.join(root, 'data', 'audio_liturgy_metadata_cache.json'), 'utf8'));
const apply = process.argv.includes('--apply');

const legacySubtitleStem = (ref) => String(ref || '')
  .trim()
  .replace(/[,:;]/g, '_')
  .replace(/\s+/g, '_')
  .replace(/_+/g, '_');

const refsByLegacyStem = new Map();
for (const [, usages] of cache.entries || []) {
  for (const usage of usages || []) {
    if (!usage?.ref) continue;
    const stem = legacySubtitleStem(usage.ref);
    refsByLegacyStem.set(stem, [...(refsByLegacyStem.get(stem) || []), usage.ref]);
  }
}
refsByLegacyStem.set('1_Tx_2_2b-8', ['1 Tx 2,2b-8']);
refsByLegacyStem.set('Ga_21_15-17', ['Ga 21,15-17']);

const unresolved = [];
const moves = [];
const conflicts = [];
const duplicates = [];
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for (const entry of fs.readdirSync(subDir, { withFileTypes: true })) {
  if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.srt') continue;
  const stem = path.basename(entry.name, '.srt');
  // Đã là tên chuẩn, không cần xử lý lại.
  if (stem.includes('v')) continue;
  const refs = [...new Map((refsByLegacyStem.get(stem) || [])
    .map((ref) => [normalizeAudioRef(ref), ref])
    .filter(([slug]) => slug)).values()];
  if (refs.length !== 1) {
    unresolved.push({ filename: entry.name, refs });
    continue;
  }
  const targetName = `${normalizeAudioRef(refs[0])}.srt`;
  const source = path.join(subDir, entry.name);
  const target = path.join(subDir, targetName);
  if (fs.existsSync(target)) {
    if (hash(source) === hash(target)) duplicates.push({ filename: entry.name, source, targetName });
    else conflicts.push({ filename: entry.name, targetName });
  }
  else moves.push({ filename: entry.name, source, target, targetName, ref: refs[0] });
}

console.log(`\n🔤 Chuẩn hoá phụ đề (${apply ? 'APPLY' : 'DRY-RUN'})`);
console.log(`   Đổi tên an toàn: ${moves.length}; bản trùng checksum: ${duplicates.length}; chưa rõ: ${unresolved.length}; xung đột: ${conflicts.length}`);
moves.forEach((item) => console.log(`  ${item.filename} -> ${item.targetName}  [${item.ref}]`));
unresolved.forEach((item) => console.log(`  SKIP ${item.filename} (${item.refs.join(' | ') || 'không tìm được ref'})`));
conflicts.forEach((item) => console.log(`  CONFLICT ${item.filename} -> ${item.targetName}`));
if (!apply) process.exit(0);

moves.forEach((item) => fs.renameSync(item.source, item.target));
duplicates.forEach((item) => fs.unlinkSync(item.source));
console.log(`✅ Đã đổi tên ${moves.length} file và xoá ${duplicates.length} bản phụ đề trùng checksum.`);
if (unresolved.length || conflicts.length) process.exitCode = 2;
