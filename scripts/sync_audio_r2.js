#!/usr/bin/env node

/**
 * ============================================================================
 * CLOUDFLARE R2 AUDIO SYNC TOOL (scripts/sync_audio_r2.js)
 * Đồng bộ kho dữ liệu audio từ thư mục private/audio lên Cloudflare R2
 * ============================================================================
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_DIR = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(BASE_DIR, '.env') });

const args = process.argv.slice(2);
const IS_DRY_RUN = args.includes('--dry-run');
const IS_FORCE = args.includes('--force');
const SHOW_HELP = args.includes('--help') || args.includes('-h');

let subPrefix = '';
const prefixArg = args.find((a) => a.startsWith('--prefix='));
if (prefixArg) {
  subPrefix = prefixArg.split('=')[1].replace(/^\/+/, '').replace(/\/+$/, '');
}

let concurrency = 8;
const concurrencyArg = args.find((a) => a.startsWith('--concurrency='));
if (concurrencyArg) {
  const parsed = parseInt(concurrencyArg.split('=')[1], 10);
  if (!isNaN(parsed) && parsed > 0) concurrency = parsed;
}

if (SHOW_HELP) {
  console.log(`
📖 CLOUDFLARE R2 AUDIO SYNC TOOL - CÁCH SỬ DỤNG:
--------------------------------------------------
  npm run sync:r2              : Đồng bộ các file mới hoặc đã chỉnh sửa lên R2
  npm run sync:r2:dry          : Chạy thử nghiệm (Dry-Run), không tải lên thực tế
  node scripts/sync_audio_r2.js --force          : Ghi đè bắt buộc toàn bộ file
  node scripts/sync_audio_r2.js --prefix=gospels : Chỉ đồng bộ thư mục gospels/
  node scripts/sync_audio_r2.js --concurrency=12 : Đặt số lượng upload đồng thời
`);
  process.exit(0);
}

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
const R2_ENDPOINT =
  process.env.R2_ENDPOINT ||
  (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '');
const AUDIO_PRIVATE_ROOT =
  process.env.AUDIO_PRIVATE_ROOT || path.join(BASE_DIR, 'private', 'audio');

function validateConfig() {
  const missing = [];
  if (!R2_ACCOUNT_ID) missing.push('R2_ACCOUNT_ID');
  if (!R2_ACCESS_KEY_ID) missing.push('R2_ACCESS_KEY_ID');
  if (!R2_SECRET_ACCESS_KEY) missing.push('R2_SECRET_ACCESS_KEY');
  if (!R2_BUCKET_NAME) missing.push('R2_BUCKET_NAME');

  if (missing.length > 0) {
    console.error('\n❌ [LỖI CẤU HÌNH] Thiếu các biến môi trường sau trong tệp .env:');
    for (const k of missing) {
      console.error(`   - ${k}`);
    }
    console.log(`
👉 HƯỚNG DẪN THIẾT LẬP NHANH:
1. Mở Cloudflare Dashboard -> R2 Object Storage -> Manage R2 API Tokens.
2. Tạo Token có quyền "Object Read & Write".
3. Điền các giá trị vào tệp .env:
   R2_ACCOUNT_ID=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET_NAME=...
`);
    process.exit(1);
  }
}

const IGNORED_FILES = new Set(['.DS_Store', 'Thumbs.db', '.gitkeep', 'desktop.ini']);

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.mp3':
      return 'audio/mpeg';
    case '.wav':
      return 'audio/wav';
    case '.m4a':
    case '.aac':
      return 'audio/aac';
    case '.ogg':
      return 'audio/ogg';
    case '.flac':
      return 'audio/flac';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.m3u8':
      return 'application/vnd.apple.mpegurl; charset=utf-8';
    case '.m4s':
      return 'video/iso.segment';
    case '.mp4':
      return 'video/mp4';
    case '.srt':
    case '.txt':
      return 'text/plain; charset=utf-8';
    case '.vtt':
      return 'text/vtt; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

function getCacheControl(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.m3u8', '.m4s', '.mp4', '.srt', '.vtt'].includes(ext)) {
    return 'public, max-age=31536000, immutable';
  }
  if (ext === '.json') {
    return 'public, max-age=300, must-revalidate';
  }
  return 'public, max-age=86400';
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

function scanLocalAudioFiles(rootDir) {
  const files = [];

  function scan(dir, relPath = '') {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (IGNORED_FILES.has(entry.name) || entry.name.startsWith('.')) continue;
      const fullPath = path.join(dir, entry.name);
      const relative = relPath ? `${relPath}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        scan(fullPath, relative);
      } else if (entry.isFile()) {
        const stats = fs.statSync(fullPath);
        files.push({
          fullPath,
          relativeKey: relative.replace(/\\/g, '/'),
          size: stats.size,
          mtime: stats.mtime
        });
      }
    }
  }

  scan(rootDir);
  return files;
}

async function fetchRemoteR2Objects(s3Client, bucketName) {
  const remoteMap = new Map();
  let continuationToken = undefined;

  process.stdout.write('🔍 Đang truy vấn danh mục object hiện có trên Cloudflare R2...');

  try {
    do {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken
      });
      const response = await s3Client.send(command);

      if (response.Contents) {
        for (const item of response.Contents) {
          if (item.Key) {
            remoteMap.set(item.Key, {
              key: item.Key,
              size: item.Size,
              eTag: item.ETag ? item.ETag.replace(/"/g, '') : '',
              lastModified: item.LastModified
            });
          }
        }
      }
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    console.log(`\r🔍 Tìm thấy ${remoteMap.size} files hiện có trên R2 bucket [${bucketName}].   \n`);
    return remoteMap;
  } catch (err) {
    console.error(`\n❌ Không thể đọc danh mục object từ bucket ${bucketName}: ${err.message}`);
    throw err;
  }
}

async function uploadFileWithRetry(s3Client, fileObj, bucketName, maxRetries = 3) {
  const body = fs.readFileSync(fileObj.fullPath);
  const contentType = getContentType(fileObj.fullPath);
  const cacheControl = getCacheControl(fileObj.fullPath);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileObj.relativeKey,
    Body: body,
    ContentType: contentType,
    CacheControl: cacheControl
  });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await s3Client.send(command);
      return { success: true };
    } catch (err) {
      if (attempt === maxRetries) {
        return { success: false, error: err.message };
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
}

async function runConcurrentUploads(items, s3Client, bucketName, maxConcurrency) {
  let completed = 0;
  let uploadedBytes = 0;
  const total = items.length;
  const errors = [];

  const queue = [...items];
  const workers = Array(Math.min(maxConcurrency, total))
    .fill(0)
    .map(async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;

        const startTime = Date.now();
        const res = await uploadFileWithRetry(s3Client, item, bucketName);
        completed++;
        const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);

        if (res.success) {
          uploadedBytes += item.size;
          const percent = Math.round((completed / total) * 100);
          console.log(
            `[${completed}/${total}] (${percent}%) ⬆️  ${item.relativeKey} (${formatBytes(
              item.size
            )}) - ${elapsedSec}s`
          );
        } else {
          console.error(
            `[${completed}/${total}] ❌ Thất bại: ${item.relativeKey} | ${res.error}`
          );
          errors.push({ key: item.relativeKey, error: res.error });
        }
      }
    });

  await Promise.all(workers);
  return { completed, uploadedBytes, errors };
}

async function main() {
  console.log('===============================================================================');
  console.log('⚡ BẮT ĐẦU ĐỒNG BỘ KHO AUDIO LÊN CLOUDFLARE R2');
  console.log('===============================================================================');

  validateConfig();

  if (!fs.existsSync(AUDIO_PRIVATE_ROOT)) {
    console.error(`❌ Thư mục audio nguồn không tồn tại: ${AUDIO_PRIVATE_ROOT}`);
    process.exit(1);
  }

  console.log(`📂 Thư mục nguồn: ${AUDIO_PRIVATE_ROOT}`);
  console.log(`🪣 Bucket R2 đích : ${R2_BUCKET_NAME}`);
  if (IS_DRY_RUN) console.log('🧪 Chế độ: DRY-RUN (Chạy mô phỏng, không ghi dữ liệu)');
  if (IS_FORCE) console.log('⚡ Chế độ: FORCE (Ghi đè tất cả các file)');
  if (subPrefix) console.log(`🎯 Tiền tố thư mục lọc: ${subPrefix}`);
  console.log('-------------------------------------------------------------------------------');

  let localFiles = scanLocalAudioFiles(AUDIO_PRIVATE_ROOT);
  if (subPrefix) {
    localFiles = localFiles.filter((f) => f.relativeKey.startsWith(subPrefix));
  }

  const totalLocalBytes = localFiles.reduce((acc, f) => acc + f.size, 0);
  console.log(`📦 Tổng số file cục bộ hợp lệ: ${localFiles.length} files (${formatBytes(totalLocalBytes)})`);

  if (localFiles.length === 0) {
    console.log('⚠️ Không có file nào cần đồng bộ.');
    return;
  }

  const s3Client = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY
    }
  });

  let remoteMap = new Map();
  try {
    remoteMap = await fetchRemoteR2Objects(s3Client, R2_BUCKET_NAME);
  } catch (e) {
    console.error('❌ Kết nối R2 thất bại:', e.message);
    process.exit(1);
  }

  const toUpload = [];
  let alreadySyncedCount = 0;
  let alreadySyncedBytes = 0;

  for (const local of localFiles) {
    const remote = remoteMap.get(local.relativeKey);
    if (IS_FORCE || !remote) {
      toUpload.push(local);
    } else if (remote.size !== local.size) {
      toUpload.push(local);
    } else {
      alreadySyncedCount++;
      alreadySyncedBytes += local.size;
    }
  }

  console.log(`📊 Thống kê kiểm tra:`);
  console.log(`   • Đã có sẵn trên R2 (khớp size) : ${alreadySyncedCount} files (${formatBytes(alreadySyncedBytes)})`);
  console.log(`   • Cần upload mới / cập nhật      : ${toUpload.length} files (${formatBytes(toUpload.reduce((a, b) => a + b.size, 0))})`);
  console.log('-------------------------------------------------------------------------------');

  if (toUpload.length === 0) {
    console.log('🎉 Toàn bộ kho audio đã ở trạng thái đồng bộ 100%! Không có file nào cần upload.');
    return;
  }

  if (IS_DRY_RUN) {
    console.log('📋 DANH SÁCH FILE SẼ ĐƯỢC UPLOAD (DRY-RUN):');
    toUpload.forEach((item, idx) => {
      const type = remoteMap.has(item.relativeKey) ? 'UPDATE' : 'NEW';
      console.log(`  [${idx + 1}/${toUpload.length}] [${type}] ${item.relativeKey} (${formatBytes(item.size)})`);
    });
    console.log('\n💡 Để upload thật, hãy chạy: npm run sync:r2');
    return;
  }

  console.log(`🚀 Đang tiến hành upload ${toUpload.length} files với concurrency=${concurrency}...\n`);
  const startTime = Date.now();
  const { completed, uploadedBytes, errors } = await runConcurrentUploads(
    toUpload,
    s3Client,
    R2_BUCKET_NAME,
    concurrency
  );

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n===============================================================================');
  console.log('🏁 KẾT QUẢ ĐỒNG BỘ:');
  console.log(`   • Tổng thời gian: ${durationSec} giây`);
  console.log(`   • Upload thành công: ${completed - errors.length}/${toUpload.length} files (${formatBytes(uploadedBytes)})`);
  if (errors.length > 0) {
    console.log(`   • ❌ Lỗi: ${errors.length} files`);
    errors.forEach((e) => console.log(`     - ${e.key}: ${e.error}`));
  } else {
    console.log('   • ✨ Trạng thái: Hoàn tất 100% không có lỗi!');
  }
  console.log('===============================================================================');
}

main().catch((err) => {
  console.error('❌ Lỗi không mong muốn:', err);
  process.exit(1);
});
