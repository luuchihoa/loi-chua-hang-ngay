import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script tự động chuyển văn bản Bài Đọc Phụng Vụ thành file MP3 siêu thực bằng ElevenLabs API
 * 
 * Cách dùng:
 * 1. Đặt API Key vào .env: ELEVENLABS_API_KEY=your_key_here
 * 2. Chạy: node scripts/generateElevenLabsAudio.js "Văn bản bài đọc cần tạo..." "output_name.mp3"
 */

// Lấy API Key từ .env hoặc biến môi trường
const API_KEY = process.env.ELEVENLABS_API_KEY || '';

// Voice ID Tiếng Việt chuẩn bạn yêu cầu từ Voice Library: 3VnrjnYrskPMDsapTr8X
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '3VnrjnYrskPMDsapTr8X';

// Model: 'eleven_multilingual_v2' (Bản ElevenLabs v3 Multilingual chuẩn Tiếng Việt có biểu cảm tự nhiên)
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';

// Hàm xóa các thẻ HTML để lấy chữ thuần và tối ưu số ký tự
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

// Hàm làm sạch gospel_ref để tạo tên file an toàn
export function formatRefFilename(gospelRef) {
  if (!gospelRef) return `gospel_${Date.now()}`;
  const clean = gospelRef
    .trim()
    .replace(/[\\\/:*?"<>|]/g, '') // Xóa ký tự cấm của tên file
    .replace(/\s+/g, '_')
    .replace(/,/g, '');
  return `gospel_${clean}`;
}

export async function generateAudioByRef(gospelRef, rawText) {
  const fileBasename = formatRefFilename(gospelRef) + '.mp3';
  const outputDir = path.resolve('private/audio/gospels');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputFilePath = path.join(outputDir, fileBasename);

  if (fs.existsSync(outputFilePath)) {
    console.log(`⚡ [ĐÃ TỒN TẠI] Trích đoạn "${gospelRef}" đã có file MP3 tại: private/audio/gospels/${fileBasename}`);
    console.log(`✨ Tiết kiệm 100% credit ElevenLabs!`);
    return `/audio/gospels/${fileBasename}`;
  }

  // ⚡ 2. CHƯA CÓ FILE -> GỌI ELEVENLABS TẠO MP3 MỚI
  console.log(`🆕 Trích đoạn "${gospelRef}" chưa có audio. Đang gọi ElevenLabs v3 tạo file mới...`);
  const successPath = await generateAudioFromText(rawText, `gospels/${fileBasename}`);
  if (successPath) {
    return `/audio/gospels/${fileBasename}`;
  }
  return null;
}

export async function generateAudioFromText(rawText, outputFilename = 'output.mp3') {
  if (!API_KEY) {
    console.error('❌ LỖI: Chưa có ELEVENLABS_API_KEY trong file .env');
    console.log('👉 Vui lòng mở file .env và thêm dòng: ELEVENLABS_API_KEY=key_cua_ban');
    return false;
  }

  const cleanText = stripHtml(rawText);
  if (!cleanText) {
    console.error('❌ LỖI: Văn bản đầu vào trống!');
    return false;
  }

  console.log(`🎙️ Đang gửi văn bản tới ElevenLabs Voice (${VOICE_ID}) với Model ${MODEL_ID}...`);
  console.log(`📏 Độ dài văn bản: ${cleanText.length} ký tự`);

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': API_KEY,
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: MODEL_ID, // eleven_turbo_v2_5 hoặc eleven_multilingual_v2
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`ElevenLabs API báo lỗi (${response.status}): ${errText}`);
    }

    // Nhận luồng âm thanh audio/mpeg
    const buffer = Buffer.from(await response.arrayBuffer());
    
    // Thư mục lưu file
    const outputFilePath = path.resolve('private/audio', outputFilename);
    const outputDir = path.dirname(outputFilePath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputFilePath, buffer);

    console.log(`✅ TẠO FILE MP3 THÀNH CÔNG!`);
    console.log(`📁 Đường dẫn file: ${outputFilePath}`);
    return outputFilePath;
  } catch (error) {
    console.error('❌ Thất bại khi tạo file MP3:', error.message);
    return false;
  }
}

// Nếu chạy trực tiếp từ Terminal
const args = process.argv.slice(2);
if (args.length > 0) {
  const refOrText = args[0];
  const rawContent = args[1];

  if (rawContent) {
    // Trường hợp truyền cả gospel_ref và Nội dung chữ: node scripts/generateElevenLabsAudio.js "Mt 5, 1-12a" "Khi ấy Đức Giê-su..."
    generateAudioByRef(refOrText, rawContent);
  } else {
    // Trường hợp truyền văn bản trực tiếp: node scripts/generateElevenLabsAudio.js "Nội dung chữ..."
    generateAudioFromText(refOrText, `liturgy_${Date.now()}.mp3`);
  }
}
