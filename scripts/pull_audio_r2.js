#!/usr/bin/env node

/**
 * ============================================================================
 * CLOUDFLARE R2 AUDIO PULL / RESTORE TOOL (scripts/pull_audio_r2.js)
 * Khôi phục / Tải ngược dữ liệu từ Cloudflare R2 về thư mục private/audio
 * ============================================================================
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand
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
📖 CLOUDFLARE R2 PULL TOOL - CÁCH SỬ DỤNG:
--------------------------------------------------
  npm run pull:r2              : Tải các file còn thiếu hoặc đã sửa từ R2 về local
  npm run pull:r2:dry          : Chạy thử nghiệm xem danh sách file sẽ tải
  node scripts/pull_audio_r2.js --force          : Ghi đè toàn bộ file từ R2
  node scripts/pull_audio_r2.js --prefix=sub     : Chỉ tải thư mục sub/
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

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

async function fetchRemoteR2Objects(s3Client, bucketName, prefix = '') {
  const remoteFiles = [];
  let continuationToken = undefined;

  process.stdout.write('🔍 Đang truy vấn danh mục object từ Cloudflare R2...');

  do {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix || undefined,
      ContinuationToken: continuationToken
    });
    const response = await s3Client.send(command);

    if (response.Contents) {
      for (const item of response.Contents) {
        if (item.Key && !item.Key.endsWith('/')) {
          remoteFiles.push({
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

  console.log(`\r🔍 Tìm thấy ${remoteFiles.length} files trên Cloudflare R2 [${bucketName}].   \n`);
  return remoteFiles;
}

async function downloadFileWithRetry(s3Client, item, bucketName, targetDir, maxRetries = 3) {
  const targetPath = path.join(targetDir, item.key);
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: item.key
  });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await s3Client.send(command);
      const fileStream = fs.createWriteStream(targetPath);

      await new Promise((resolve, reject) => {
        response.Body.pipe(fileStream);
        response.Body.on('error', reject);
        fileStream.on('finish', resolve);
      });

      return { success: true };
    } catch (err) {
      if (attempt === maxRetries) {
        return { success: false, error: err.message };
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
}

async function main() {
  console.log('===============================================================================');
  console.log('⚡ BẮT ĐẦU TẢI / KHÔI PHỤC DỮ LIỆU TỪ CLOUDFLARE R2 VỀ LOCAL');
  console.log('===============================================================================');

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.error('❌ Thiếu biến môi trường R2 trong .env');
    process.exit(1);
  }

  const s3Client = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY
    }
  });

  const remoteFiles = await fetchRemoteR2Objects(s3Client, R2_BUCKET_NAME, subPrefix);
  const toDownload = [];
  let existingCount = 0;
  let existingBytes = 0;

  for (const rem of remoteFiles) {
    const localPath = path.join(AUDIO_PRIVATE_ROOT, rem.key);
    if (!fs.existsSync(localPath)) {
      toDownload.push(rem);
    } else {
      const stat = fs.statSync(localPath);
      if (IS_FORCE || stat.size !== rem.size) {
        toDownload.push(rem);
      } else {
        existingCount++;
        existingBytes += rem.size;
      }
    }
  }

  console.log(`📊 Thống kê kiểm tra:`);
  console.log(`   • Đã có sẵn cục bộ (khớp size) : ${existingCount} files (${formatBytes(existingBytes)})`);
  console.log(`   • Cần tải về / khôi phục       : ${toDownload.length} files (${formatBytes(toDownload.reduce((a, b) => a + b.size, 0))})`);
  console.log('-------------------------------------------------------------------------------');

  if (toDownload.length === 0) {
    console.log('🎉 Thư mục local đã đồng bộ đầy đủ 100% với R2! Không cần tải thêm file nào.');
    return;
  }

  if (IS_DRY_RUN) {
    console.log('📋 DANH SÁCH FILE SẼ TẢI VỀ (DRY-RUN):');
    toDownload.forEach((item, idx) => {
      console.log(`  [${idx + 1}/${toDownload.length}] ⬇️  ${item.key} (${formatBytes(item.size)})`);
    });
    return;
  }

  console.log(`🚀 Đang tiến hành tải ${toDownload.length} files về ${AUDIO_PRIVATE_ROOT}...\n`);
  let completed = 0;
  let downloadedBytes = 0;
  const errors = [];
  const startTime = Date.now();

  const queue = [...toDownload];
  const workers = Array(Math.min(concurrency, toDownload.length))
    .fill(0)
    .map(async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;

        const startItem = Date.now();
        const res = await downloadFileWithRetry(s3Client, item, R2_BUCKET_NAME, AUDIO_PRIVATE_ROOT);
        completed++;
        const elapsedSec = ((Date.now() - startItem) / 1000).toFixed(1);

        if (res.success) {
          downloadedBytes += item.size;
          const percent = Math.round((completed / toDownload.length) * 100);
          console.log(
            `[${completed}/${toDownload.length}] (${percent}%) ⬇️  ${item.key} (${formatBytes(
              item.size
            )}) - ${elapsedSec}s`
          );
        } else {
          console.error(`[${completed}/${toDownload.length}] ❌ Lỗi tải: ${item.key} | ${res.error}`);
          errors.push({ key: item.key, error: res.error });
        }
      }
    });

  await Promise.all(workers);
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n===============================================================================');
  console.log('🏁 KẾT QUẢ TẢI / KHÔI PHỤC:');
  console.log(`   • Tổng thời gian: ${durationSec} giây`);
  console.log(`   • Tải thành công: ${completed - errors.length}/${toDownload.length} files (${formatBytes(downloadedBytes)})`);
  if (errors.length > 0) {
    console.log(`   • ❌ Lỗi: ${errors.length} files`);
  } else {
    console.log('   • ✨ Trạng thái: Toàn bộ dữ liệu đã được khôi phục nguyên vẹn!');
  }
  console.log('===============================================================================');
}

main().catch((err) => {
  console.error('❌ Lỗi không mong muốn:', err);
  process.exit(1);
});
