#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getLiturgyInfo, getLiturgicalYear } from '../src/utils/liturgyCalendar.js';
import { getGospelAudioFilename, getReadingAudioFilename } from '../src/utils/audioNaming.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env') });

const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) throw new Error(`Thiếu biến môi trường: ${missing.join(', ')}`);

const audioRoot = path.join(root, 'private', 'audio');
const hlsRoot = path.join(audioRoot, 'hls', 'liturgy');
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const bucket = process.env.R2_BUCKET_NAME;

const isFilled = (value) => Array.isArray(value) ? value.length > 0 : Boolean(String(value || '').replace(/<[^>]*>/g, '').trim());
const dateKey = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
const addDays = (date, days) => { const next = new Date(date); next.setDate(next.getDate() + days); return next; };
const cycleFor = (date, info) => {
  const year = getLiturgicalYear(date);
  return info.isSunday ? ['C', 'A', 'B'][year % 3] : info.season === 'thuong' ? (year % 2 === 0 ? 'II' : 'I') : 'all';
};

const selectRow = (rows, key, cycle) => {
  const matches = rows.filter((row) => row.liturgy_key === key);
  if (!matches.length) return null;
  return matches.find((row) => row.cycle === cycle)
    || matches.find((row) => row.cycle === 'all')
    || matches[0];
};

const merged = (base, override) => {
  const value = { ...(base || {}) };
  for (const [key, candidate] of Object.entries(override || {})) if (isFilled(candidate)) value[key] = candidate;
  return value;
};

const collectTracks = (content) => {
  const readings = [];
  const push = (title, ref, kind) => { if (ref) readings.push({ title, ref, kind }); };
  push('Bài Đọc 1', content.r1_ref, 'r1');
  push('Bài Đọc 2', content.r2_ref, 'r2');
  for (const extra of Array.isArray(content.extra_readings) ? content.extra_readings : []) {
    if (extra?.type !== 'full_mass' && extra?.type !== 'alternative' && extra?.ref && extra?.content) push(extra.title || 'Bài Đọc Phụ', extra.ref, 'r1');
  }
  push('Tin Mừng', content.gospel_ref, 'gospel');

  const tracks = [{ title: 'Nhạc mở đầu', key: 'music/liturgy_intro_v5.mp3' }];
  readings.forEach((reading, index) => {
    if (index) tracks.push({ title: 'Nhạc chuyển đoạn', key: 'music/reading_transition_v5.mp3' });
    if (reading.kind === 'r1' || reading.kind === 'r2') tracks.push({ title: `Lời dẫn ${reading.title}`, key: `readings/${reading.kind}.mp3` });
    const filename = reading.kind === 'gospel' ? getGospelAudioFilename(reading.ref) : getReadingAudioFilename(reading.ref);
    tracks.push({ title: reading.title, key: `${reading.kind === 'gospel' ? 'gospels' : 'readings'}/${filename}` });
  });
  tracks.push({ title: 'Nhạc kết', key: 'music/liturgy_outro_v5.mp3' });
  return readings.length ? tracks : [];
};

const download = async (key) => {
  const target = path.join(audioRoot, key);
  if (fs.existsSync(target)) return target;
  try {
    const response = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, Buffer.from(await response.Body.transformToByteArray()));
    return target;
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NoSuchKey') return null;
    throw error;
  }
};

const uploadDirectory = async (directory) => {
  const files = fs.readdirSync(directory, { withFileTypes: true });
  for (const entry of files) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await uploadDirectory(fullPath);
    else {
      const key = path.relative(audioRoot, fullPath).replaceAll(path.sep, '/');
      const extension = path.extname(fullPath);
      const contentType = extension === '.m3u8' ? 'application/vnd.apple.mpegurl' : extension === '.m4s' ? 'video/iso.segment' : extension === '.mp4' ? 'video/mp4' : 'application/json';
      await r2.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: fs.readFileSync(fullPath), ContentType: contentType }));
    }
  }
};

const deleteExpiredBundles = async (keepDates) => {
  let token;
  const stale = [];
  do {
    const response = await r2.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: 'hls/liturgy/', ContinuationToken: token }));
    for (const object of response.Contents || []) {
      const date = object.Key?.split('/')[2];
      if (date && !keepDates.has(date)) stale.push({ Key: object.Key });
    }
    token = response.NextContinuationToken;
  } while (token);
  for (let start = 0; start < stale.length; start += 1000) {
    await r2.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: stale.slice(start, start + 1000), Quiet: true } }));
  }
  console.log(`Đã dọn ${stale.length} object HLS hết hạn.`);
};

const today = new Date();
today.setHours(0, 0, 0, 0);
// Yesterday plus the seven-date reader window beginning today.
const dates = Array.from({ length: 8 }, (_, index) => addDays(today, index - 1));
const fields = 'liturgy_key,cycle,title,r1_ref,r2_ref,gospel_ref,extra_readings';

for (const date of dates) {
  const info = getLiturgyInfo(date);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const keys = [...new Set([info.key, info.seasonKey, `feast_${month}_${day}`, `fixed_${month}_${day}`].filter(Boolean))];
  const { data: rows, error } = await supabase.from('liturgy_contents').select(fields).in('liturgy_key', keys);
  if (error) throw new Error(`${dateKey(date)}: ${error.message}`);
  const cycle = cycleFor(date, info);
  const weekday = selectRow(rows || [], info.seasonKey, cycle);
  const feast = selectRow(rows || [], info.key, cycle)
    || selectRow(rows || [], `feast_${month}_${day}`, cycle)
    || selectRow(rows || [], `fixed_${month}_${day}`, cycle);
  const variants = new Map();
  const defaultContent = feast ? merged(weekday, feast) : weekday;
  if (defaultContent) variants.set('weekday', defaultContent);
  if (info.feastType?.startsWith('memorial') && feast && weekday) variants.set('feast', merged(weekday, feast));

  for (const [variant, content] of variants) {
    const tracks = collectTracks(content);
    if (!tracks.length) continue;
    const sources = await Promise.all(tracks.map((track) => download(track.key)));
    const absent = tracks.filter((_, index) => !sources[index]).map((track) => track.key);
    if (absent.length) {
      console.log(`Bỏ qua ${dateKey(date)}/${variant}: thiếu ${absent.join(', ')}`);
      continue;
    }
    const inputPath = path.join(root, 'private', `hls-${dateKey(date)}-${variant}.json`);
    fs.writeFileSync(inputPath, JSON.stringify({ date: dateKey(date), variant, tracks: tracks.map((track) => ({ title: track.title, path: path.relative(root, path.join(audioRoot, track.key)) })) }));
    execFileSync(process.execPath, [path.join(root, 'scripts/build_liturgy_hls.js'), `--input=${path.relative(root, inputPath)}`], { stdio: 'inherit' });
    fs.rmSync(inputPath, { force: true });
    await uploadDirectory(path.join(hlsRoot, dateKey(date), variant));
    console.log(`Đã cập nhật HLS ${dateKey(date)}/${variant}.`);
  }
}

await deleteExpiredBundles(new Set(dates.map(dateKey)));
