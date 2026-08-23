#!/usr/bin/env node

/** Xoá chính xác các object legacy readings/r1/* và readings/r2/* trên R2. */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(root, '.env') });

const apply = process.argv.includes('--apply');
const accountId = process.env.R2_ACCOUNT_ID || '';
const accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
const bucket = process.env.R2_BUCKET_NAME || '';
const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');

if (!accountId || !accessKeyId || !secretAccessKey || !bucket) throw new Error('Thiếu cấu hình R2 trong .env');

const s3 = new S3Client({
  region: 'auto', endpoint,
  credentials: { accessKeyId, secretAccessKey }
});

const legacyKeys = [];
for (const prefix of ['readings/r1/', 'readings/r2/']) {
  let token;
  do {
    const result = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }));
    legacyKeys.push(...(result.Contents || []).map((item) => item.Key).filter(Boolean));
    token = result.NextContinuationToken;
  } while (token);
}

console.log(`Tìm thấy ${legacyKeys.length} object legacy trên R2.`);
legacyKeys.forEach((key) => console.log(`  ${key}`));
if (!apply) {
  console.log('\nDRY-RUN: chưa xoá. Dùng --apply để xoá chính xác danh sách trên.');
  process.exit(0);
}

for (let index = 0; index < legacyKeys.length; index += 1000) {
  const batch = legacyKeys.slice(index, index + 1000);
  await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true } }));
}
console.log(`✅ Đã xoá ${legacyKeys.length} object legacy từ R2.`);
