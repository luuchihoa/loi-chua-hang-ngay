#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const audioRoot = path.join(root, 'private', 'audio');
const args = process.argv.slice(2);
const inputArg = args.find((arg) => arg.startsWith('--input='));

if (!inputArg) {
  throw new Error('Dùng: node scripts/build_liturgy_hls.js --input=path/to/playlist.json');
}

const inputPath = path.resolve(root, inputArg.slice('--input='.length));
const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date || '') || !/^[a-z0-9-]+$/i.test(input.variant || 'default')) {
  throw new Error('date hoặc variant không hợp lệ.');
}
if (!Array.isArray(input.tracks) || input.tracks.length === 0) {
  throw new Error('playlist.json phải có tracks.');
}

const sourcePaths = input.tracks.map((track) => {
  const source = path.resolve(root, track.path || '');
  if (!source.startsWith(`${audioRoot}${path.sep}`) || path.extname(source).toLowerCase() !== '.mp3' || !fs.existsSync(source)) {
    throw new Error(`Nguồn audio không hợp lệ hoặc không tồn tại: ${track.path}`);
  }
  return source;
});

const outputDir = path.join(audioRoot, 'hls', 'liturgy', input.date, input.variant || 'default');
fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });
const concatFile = path.join(os.tmpdir(), `liturgy-hls-${Date.now()}.txt`);
fs.writeFileSync(concatFile, sourcePaths.map((source) => `file '${source.replace(/'/g, "'\\\\''")}'`).join('\n'));

try {
  execFileSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', concatFile,
    '-vn', '-c:a', 'aac', '-b:a', '96k', '-ar', '44100', '-ac', '2',
    '-f', 'hls', '-hls_time', '6', '-hls_playlist_type', 'vod', '-hls_segment_type', 'fmp4',
    '-hls_fmp4_init_filename', 'init.mp4', '-hls_segment_filename', path.join(outputDir, 'segment-%05d.m4s'),
    path.join(outputDir, 'index.m3u8'),
  ], { stdio: 'inherit' });
} finally {
  fs.rmSync(concatFile, { force: true });
}

fs.writeFileSync(path.join(outputDir, 'metadata.json'), JSON.stringify({
  date: input.date,
  variant: input.variant || 'default',
  tracks: input.tracks.map(({ title, path: source }) => ({ title, source })),
}, null, 2));
console.log(`✅ HLS đã tạo: ${path.relative(root, outputDir)}`);
