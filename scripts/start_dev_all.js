import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_DIR = path.resolve(__dirname, '..');

console.log("🚀 ĐANG KHỞI CHẠY ĐỒNG THỜI VITE DEV SERVER (5173) & AUDIO RENDER SERVER (5005)...\n");

// 1. Chạy Audio Studio Render API Server (Port 5005)
const studioServer = spawn('node', [path.join(BASE_DIR, 'scripts', 'audio_server.js')], {
  stdio: 'pipe',
  shell: true,
  cwd: BASE_DIR
});

studioServer.stdout.on('data', (data) => {
  process.stdout.write(`\x1b[36m[STUDIO SERVER 5005]\x1b[0m ${data.toString()}`);
});

studioServer.stderr.on('data', (data) => {
  process.stderr.write(`\x1b[31m[STUDIO SERVER ERR]\x1b[0m ${data.toString()}`);
});

// 2. Chạy Vite Web Application Dev Server (Port 5173)
const viteDev = spawn('npx', ['vite'], {
  stdio: 'pipe',
  shell: true,
  cwd: BASE_DIR
});

viteDev.stdout.on('data', (data) => {
  process.stdout.write(`\x1b[32m[VITE APP 5173]\x1b[0m ${data.toString()}`);
});

viteDev.stderr.on('data', (data) => {
  process.stderr.write(`\x1b[31m[VITE APP ERR]\x1b[0m ${data.toString()}`);
});

// Xử lý khi nhấn Ctrl+C để tắt sạch cả 2 server
process.on('SIGINT', () => {
  console.log('\n🛑 Đang dừng cả 2 server...');
  studioServer.kill();
  viteDev.kill();
  process.exit(0);
});
