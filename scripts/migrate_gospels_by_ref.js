#!/usr/bin/env node

/**
 * Đổi tên audio trong gospels/ theo ref thật từ metadata cache.
 * File bị đặt nhầm thư mục (ví dụ r1_*.mp3) sẽ được chuyển sang readings/.
 * Mặc định chỉ báo cáo; dùng --apply để di chuyển.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { normalizeAudioRef, getGospelAudioFilename, getReadingAudioFilename } from '../src/utils/audioNaming.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const audioRoot = path.join(root, 'private', 'audio');
const sourceDir = path.join(audioRoot, 'gospels');
const cachePath = path.join(root, 'data', 'audio_liturgy_metadata_cache.json');
const apply = process.argv.includes('--apply');
const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
const metadata = new Map(cache.entries || []);
const knownFilenameAliases = new Map([
  ['gospel_Lc_139-56 .mp3', 'gospel_Lc_139-56.mp3'],
  ['gospel_Mt_1821-191 22.00.10.mp3', 'gospel_Mt_1821-191.mp3']
]);
const manualUsages = new Map([
  ['gospel_Ga_2115-17.mp3', { ref: 'Ga 21,15-17', section: 'gospel' }],
  ['gospel_Mt_238-12.mp3', { ref: 'Mt 23,8-12', section: 'gospel' }],
  ['r1_Hc_261-413-16.mp3', { ref: 'Hc 26,1-4.13-16', section: 'r1' }]
]);

const sources = fs.readdirSync(sourceDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === '.mp3')
  .map((entry) => {
    const key = knownFilenameAliases.get(entry.name) || entry.name;
    const usages = manualUsages.has(entry.name) ? [manualUsages.get(entry.name)] : (metadata.get(key) || []);
    // Khác biệt dấu chấm cuối câu không tạo ra một ref khác.
    const refs = [...new Map(usages.map((item) => [normalizeAudioRef(item.ref), item.ref]).filter(([slug]) => slug)).values()];
    const sections = [...new Set(usages.map((item) => item.section).filter(Boolean))];
    return { filename: entry.name, source: path.join(sourceDir, entry.name), refs, sections };
  });

const unresolved = sources.filter((item) => item.refs.length !== 1 || item.sections.length !== 1);
const candidates = sources.filter((item) => item.refs.length === 1 && item.sections.length === 1).map((item) => {
  const section = item.sections[0];
  const isGospel = section === 'gospel';
  const filename = isGospel ? getGospelAudioFilename(item.refs[0]) : getReadingAudioFilename(item.refs[0]);
  return {
    ...item,
    ref: item.refs[0],
    target: path.join(audioRoot, isGospel ? 'gospels' : 'readings', filename),
    targetRel: path.join(isGospel ? 'gospels' : 'readings', filename)
  };
});

const byTarget = new Map();
for (const item of candidates) byTarget.set(item.target, [...(byTarget.get(item.target) || []), item]);
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const moves = [];
const conflicts = [];
for (const [target, items] of byTarget) {
  if (items.length > 1 || fs.existsSync(target)) {
    const hashes = items.map((item) => hash(item.source));
    conflicts.push({ target, items, reason: items.length > 1 && new Set(hashes).size === 1 ? 'duplicate-identical-source' : 'target-exists-or-different-audio' });
  } else moves.push(items[0]);
}

console.log(`\n✝️  Chuẩn hoá audio Tin Mừng (${apply ? 'APPLY' : 'DRY-RUN'})`);
console.log(`   Nguồn: ${sources.length}; di chuyển an toàn: ${moves.length}; chưa rõ: ${unresolved.length}; xung đột: ${conflicts.length}`);
moves.forEach((item) => console.log(`  MOVE ${path.relative(root, item.source)} -> ${item.targetRel}  [${item.ref}]`));
unresolved.forEach((item) => console.log(`  SKIP ${path.relative(root, item.source)} (refs: ${item.refs.join(' | ') || 'không có'}; sections: ${item.sections.join(' | ') || 'không có'})`));
conflicts.forEach((item) => console.log(`  CONFLICT ${path.relative(root, item.target)} (${item.reason})`));
if (!apply) process.exit(0);

for (const item of moves) fs.renameSync(item.source, item.target);
const report = {
  migratedAt: new Date().toISOString(),
  moved: moves.map((item) => ({ source: path.relative(root, item.source), target: item.targetRel, ref: item.ref })),
  unresolved: unresolved.map((item) => ({ source: path.relative(root, item.source), refs: item.refs, sections: item.sections })),
  conflicts: conflicts.map((item) => ({ target: path.relative(root, item.target), reason: item.reason }))
};
fs.writeFileSync(path.join(root, 'data', 'gospels_migration_report.json'), JSON.stringify(report, null, 2));
console.log(`✅ Đã di chuyển ${moves.length} file.`);
if (unresolved.length || conflicts.length) process.exitCode = 2;
