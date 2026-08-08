import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script tự động tạo file MP3 giọng đọc Tiếng Việt AI Neural siêu mượt (Hoài My / Nam Minh)
 * từ Microsoft Azure Speech API - MIỄN PHÍ 500.000 KÝ TỰ MỖI THÁNG!
 * 
 * Cách dùng:
 * 1. Thêm vào .env:
 *    AZURE_SPEECH_KEY=your_azure_key
 *    AZURE_SPEECH_REGION=eastus (hoặc region của bạn)
 * 2. Chạy: node scripts/generateAzureAudio.js "Mt 13,18-23" "Khi ấy Đức Giê-su..."
 */

const AZURE_KEY = process.env.AZURE_SPEECH_KEY || '';
const AZURE_REGION = process.env.AZURE_SPEECH_REGION || 'eastus';

// Giọng đọc AI Neural mặc định: vi-VN-HoaiMyNeural (Nữ miền Nam dịu dàng) hoặc vi-VN-NamMinhNeural (Nam miền Bắc trầm ấm)
const VOICE_NAME = process.env.AZURE_VOICE_NAME || 'vi-VN-HoaiMyNeural';

function formatRefFilename(gospelRef) {
  if (!gospelRef) return `gospel_${Date.now()}`;
  const clean = gospelRef
    .trim()
    .replace(/[\\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
    .replace(/,/g, '');
  return `gospel_${clean}`;
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/Đ\./g, 'Đáp: ')
    .replace(/BĐ1:/gi, 'Bài đọc 1: ')
    .replace(/BĐ2:/gi, 'Bài đọc 2: ')
    .replace(/\((Đ\.|Đ|Đáp)\)/gi, ' Đáp. ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function generateAzureAudio(gospelRef, rawText) {
  if (!AZURE_KEY) {
    console.error('❌ LỖI: Chưa cấu hình AZURE_SPEECH_KEY trong file .env');
    console.log('👉 Vui lòng đăng ký key Azure miễn phí (500k ký tự/tháng) và thêm vào .env: AZURE_SPEECH_KEY=your_key');
    return false;
  }

  const fileBasename = formatRefFilename(gospelRef) + '.mp3';
  const outputFilePath = path.resolve('private/audio/gospels', fileBasename);

  // 1. KIỂM TRA TRÙNG LẶP
  if (fs.existsSync(outputFilePath)) {
    console.log(`⚡ [ĐÃ TỒN TẠI] File MP3 trích đoạn "${gospelRef}" đã có tại private/audio/gospels/${fileBasename}`);
    return fileBasename;
  }

  const cleanText = stripHtml(rawText);
  if (!cleanText) return false;

  console.log(`🎙️ Đang gọi Microsoft Azure Speech API (Giọng: ${VOICE_NAME})...`);
  console.log(`📏 Văn bản: ${cleanText.length} ký tự`);

  // Thẻ SSML tùy chỉnh giọng đọc & cách ngắt nghỉ tự nhiên của Microsoft
  const ssml = `
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="vi-VN">
      <voice name="${VOICE_NAME}">
        <prosody rate="0.95" pitch="0%">
          ${cleanText}
        </prosody>
      </voice>
    </speak>
  `.trim();

  const url = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'CatholicLiturgyApp'
      },
      body: ssml
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Azure TTS Lỗi (${response.status}): ${err}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const outputDir = path.dirname(outputFilePath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputFilePath, buffer);
    console.log(`✅ TẠO FILE MP3 AZURE THÀNH CÔNG!`);
    console.log(`📁 File saved at: ${outputFilePath}`);
    return `/audio/gospels/${fileBasename}`;
  } catch (error) {
    console.error('❌ Thất bại khi tạo audio Azure:', error.message);
    return false;
  }
}

// Chạy trực tiếp từ Terminal
const args = process.argv.slice(2);
if (args.length > 0) {
  const ref = args[0];
  const text = args[1] || ref;
  generateAzureAudio(ref, text);
}
