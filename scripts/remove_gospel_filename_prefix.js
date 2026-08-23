#!/usr/bin/env node

/**
 * Bỏ tiền tố gospel_ khỏi các file Tin Mừng đã ở chuẩn ref mới.
 * Mặc định chỉ kiểm tra; dùng --apply để đổi tên.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'private', 'audio', 'gospels');
const apply = process.argv.includes('--apply');

const moves = fs.readdirSync(dir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && /^gospel_.*v.*\.mp3$/u.test(entry.name))
  .map((entry) => ({ source: path.join(dir, entry.name), target: path.join(dir, entry.name.replace(/^gospel_/, '')) }))
  .filter((item) => !fs.existsSync(item.target));

console.log(`${apply ? 'APPLY' : 'DRY-RUN'}: ${moves.length} file Tin Mừng sẽ bỏ tiền tố gospel_.`);
moves.forEach((item) => console.log(`  ${path.basename(item.source)} -> ${path.basename(item.target)}`));
if (!apply) process.exit(0);
moves.forEach((item) => fs.renameSync(item.source, item.target));
console.log(`✅ Đã đổi tên ${moves.length} file.`);
