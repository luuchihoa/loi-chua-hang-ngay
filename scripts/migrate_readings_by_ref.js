#!/usr/bin/env node

/**
 * Chuyển kho cũ readings/r1/r1_<legacy>.mp3 và readings/r2/r2_<legacy>.mp3
 * sang readings/<ref-chuan>.mp3. Tên đích được suy từ ref trong metadata cache,
 * không suy ngược từ tên file cũ (vì tên cũ có thể mất ranh giới chương/câu).
 *
 * Mặc định chỉ báo cáo. Thêm --apply để thực hiện di chuyển an toàn.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { getReadingAudioFilename } from '../src/utils/audioNaming.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const readingsDir = path.join(root, 'private', 'audio', 'readings');
const cachePath = path.join(root, 'data', 'audio_liturgy_metadata_cache.json');
const apply = process.argv.includes('--apply');

if (!fs.existsSync(cachePath)) throw new Error(`Không thấy metadata cache: ${cachePath}`);

const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
const refsByLegacyFilename = new Map(cache.entries || []);
// Hai file này không còn trong cache nhưng ref vẫn xác định được từ tên cũ.
const LEGACY_REF_OVERRIDES = new Map([
  ['r1_1_Tx_22b-8.mp3', '1 Tx 2,2b-8'],
  ['r1_Lc_928b-36.mp3', 'Lc 9,28b-36']
]);
const sources = [];

for (const section of ['r1', 'r2']) {
  const dir = path.join(readingsDir, section);
  if (!fs.existsSync(dir)) continue;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.mp3') continue;
    const usages = refsByLegacyFilename.get(entry.name) || [];
    const refs = [...new Set([
      ...usages.map((item) => item.ref),
      LEGACY_REF_OVERRIDES.get(entry.name)
    ].filter(Boolean))];
    sources.push({ section, filename: entry.name, source: path.join(dir, entry.name), refs });
  }
}

const unresolved = sources.filter((item) => item.refs.length !== 1);
const candidates = sources
  .filter((item) => item.refs.length === 1)
  .map((item) => ({ ...item, ref: item.refs[0], targetName: getReadingAudioFilename(item.refs[0]) }));

const candidatesByTarget = new Map();
for (const item of candidates) {
  const group = candidatesByTarget.get(item.targetName) || [];
  group.push(item);
  candidatesByTarget.set(item.targetName, group);
}

const hashFile = (filePath) => crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
const plannedMoves = [];
const conflicts = [];

for (const [targetName, items] of candidatesByTarget) {
  const target = path.join(readingsDir, targetName);
  if (items.length > 1) {
    const hashes = new Set(items.map((item) => hashFile(item.source)));
    conflicts.push({ targetName, reason: hashes.size === 1 ? 'duplicate-identical-source' : 'different-audio-for-same-ref', sources: items });
    continue;
  }
  if (fs.existsSync(target)) {
    conflicts.push({ targetName, reason: 'target-already-exists', sources: items });
    continue;
  }
  plannedMoves.push({ ...items[0], target });
}

console.log(`\n📚 Quy đổi audio bài đọc theo ref (${apply ? 'APPLY' : 'DRY-RUN'})`);
console.log(`   Nguồn tìm thấy: ${sources.length}`);
console.log(`   Di chuyển an toàn: ${plannedMoves.length}`);
console.log(`   Chưa xác định ref: ${unresolved.length}`);
console.log(`   Cần xử lý riêng: ${conflicts.length}`);

for (const item of plannedMoves) console.log(`  MOVE ${path.relative(root, item.source)} -> readings/${item.targetName}  [${item.ref}]`);
for (const item of unresolved) console.log(`  SKIP ${path.relative(root, item.source)} (metadata refs: ${item.refs.join(' | ') || 'không có'})`);
for (const item of conflicts) console.log(`  CONFLICT readings/${item.targetName} (${item.reason})`);

if (!apply) {
  console.log('\nKhông thay đổi file. Chạy lại với --apply để di chuyển các file an toàn.');
  process.exit(0);
}

for (const item of plannedMoves) fs.renameSync(item.source, item.target);

const report = {
  migratedAt: new Date().toISOString(),
  moved: plannedMoves.map(({ source, target, ref }) => ({ source: path.relative(root, source), target: path.relative(root, target), ref })),
  unresolved: unresolved.map(({ source, refs }) => ({ source: path.relative(root, source), refs })),
  conflicts: conflicts.map(({ targetName, reason, sources: items }) => ({ target: `readings/${targetName}`, reason, sources: items.map(({ source, ref }) => ({ source: path.relative(root, source), ref })) }))
};
const reportPath = path.join(root, 'data', 'readings_migration_report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n✅ Đã di chuyển ${plannedMoves.length} file. Báo cáo: ${path.relative(root, reportPath)}`);
if (unresolved.length || conflicts.length) process.exitCode = 2;
