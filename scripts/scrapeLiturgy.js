import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import { getLiturgyInfo, getLiturgicalYear } from '../src/utils/liturgyCalendar.js';

function getLiturgicalCycles(year) {
  const cycles = ['C', 'A', 'B'];
  const sundayCycle = cycles[year % 3];
  const weekdayCycle = (year % 2 === 0) ? 'II' : 'I';
  return { sundayCycle, weekdayCycle };
}

dotenv.config();

// Khởi tạo Supabase client
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Lỗi: Chưa cấu hình VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY trong file .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Các hàm tiện ích
const formatDateStr = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const cleanVerseSpacingInLine = (line) => {
  if (!line) return line;
  const startMatch = line.match(/^(\s*\d+[a-zA-Z]*[\s\u00A0]+)/);
  let prefix = "";
  let restOfLine = line;
  if (startMatch) {
    prefix = startMatch[1];
    restOfLine = line.substring(prefix.length);
  }
  const cleanedRest = restOfLine.replace(/([^\n\s\u00A0])[\s\u00A0]+(\d+[a-zA-Z]*)(?=[\s\u00A0\p{P}]|$)/gu, '$1$2');
  return prefix + cleanedRest;
};

const cleanNbspAndQuotes = (text) => {
  if (!text || typeof text !== 'string') return text;
  let cleaned = text.replace(/\u00A0/g, ' ');
  cleaned = cleaned.replace(/([“\(\[])\s+/g, '$1');
  cleaned = cleaned.replace(/\s+([”\)\.]])/g, '$1');
  return cleaned;
};

const cleanText = (text) => {
  if (!text) return '';
  const normalized = text.normalize('NFC').split('\n').map(l => l.trim().replace(/[ \t\r]+/g, ' ')).join('\n').trim().replace(/✠([^\s])/g, '✠ $1');
  const cleanedVerses = normalized.split('\n').map(cleanVerseSpacingInLine).join('\n');
  return cleanNbspAndQuotes(cleanedVerses);
};

// Hàm cào dữ liệu của một ngày từ Vatican News
async function scrapeDate(browser, dateObj, previewMode, scrapedResults) {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  console.log(`\n⏳ Đang cào dữ liệu ngày: ${dateStr}...`);

  const info = getLiturgyInfo(dateObj);
  const lityear = getLiturgicalYear(dateObj);
  const cycles = getLiturgicalCycles(lityear);
  
  // Xử lý ngoại lệ Lễ có chu kỳ năm A, B, C (Lễ Chúa Chịu Phép Rửa, Thánh Tâm, Gia Thất, Tết, Chúa Ba Ngôi, Mình Máu Chúa, Thăng Thiên, Hiện Xuống, Thứ 7 Tuần Thánh)
  const isSpecialABCFeast = [
    'feast_phep_rua',
    'feast_thanh_tam',
    'feast_gia_that',
    'feast_tet_1',
    'feast_ba_ngoi',
    'feast_minh_mau_chua',
    'feast_hien_xuong',
    'feast_chua_thang_thien',
    'tuan_thanh_thu7'
  ].includes(info.key) || (info.key && info.key.includes('phep_rua'));
  
  let currentCycle;
  if (info.isSunday || isSpecialABCFeast) {
    currentCycle = cycles.sundayCycle; // A, B, C
  } else if (info.season === 'thuong') {
    currentCycle = cycles.weekdayCycle; // I, II
  } else {
    currentCycle = 'all'; // Mùa Vọng, Chay, Giáng Sinh, Phục Sinh không chia năm chẵn/lẻ
  }

  // Phúc âm luôn dùng chung ('all') cho ngày thường, trừ Chúa Nhật và Lễ đặc biệt
  const gospelCycle = (info.isSunday || isSpecialABCFeast) ? currentCycle : 'all';
  const readingCycle = currentCycle;

  const page = await browser.newPage();
  
  // Tối ưu tốc độ: chặn tải ảnh, css, font, chỉ tải HTML
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
      req.abort();
    } else {
      req.continue();
    }
  });

  try {
    const url = `https://www.vaticannews.va/vi/loi-chua-hang-ngay/${yyyy}/${mm}/${dd}.html`;
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    if (response.status() === 404) {
      console.log(`⚠️ Ngày ${dateStr}: Chưa có dữ liệu trên Vatican News (404). Bỏ qua.`);
      return;
    }

    const data = await page.evaluate(() => {
      const paragraphs = Array.from(document.querySelectorAll('.section__content > p'));
      
      const result = {
        mainTitle: '',
        r1: { title: '', epitomize: '', lead: '', content: '' },
        psalm: { title: '', epitomize: '', lead: '', content: '' },
        r2: { title: '', epitomize: '', lead: '', content: '' },
        gospelAcclam: { title: '', epitomize: '', lead: '', content: '' },
        gospel: { title: '', epitomize: '', lead: '', content: '' },
        extraReadings: [] // Chứa các bài đọc > 2 (VD: Bài đọc 3-7, Thánh thư)
      };

      let contentBuffer = [];
      let titleParts = [];
      let isCapturingTitle = true;
      let currentSection = null;
      let extraIndex = -1;

      const saveBuffer = () => {
        if (!currentSection || contentBuffer.length === 0) return;
        const text = contentBuffer.join('\n\n').trim();
        if (currentSection === 'r1') result.r1.content = text;
        else if (currentSection === 'psalm') result.psalm.content = text;
        else if (currentSection === 'r2') result.r2.content = text;
        else if (currentSection === 'gospelAcclam') result.gospelAcclam.content = text;
        else if (currentSection === 'gospel') result.gospel.content = text;
        else if (currentSection === 'extra_reading' && extraIndex >= 0) {
          result.extraReadings[extraIndex].content = text;
        }
        else if (currentSection === 'extra_psalm' && extraIndex >= 0) {
          result.extraReadings[extraIndex].psalm_content = text;
        }
        contentBuffer = [];
      };

      for (let p of paragraphs) {
        let text = p.innerText.normalize('NFC').split('\n').map(l => l.trim().replace(/[ \t\r]+/g, ' ')).join('\n').trim();
        if (!text || text === String.fromCharCode(160)) continue;

        let lowerText = text.toLowerCase();

        // Stop capturing title when encountering the first liturgical section
        if (isCapturingTitle) {
          // Detect start of a reading or other sections
          if (lowerText.includes('bài đọc')) {
            // Split the line so title ends before the reading marker
            const splitIndex = lowerText.indexOf('bài đọc');
            const titlePart = text.slice(0, splitIndex).trim();
            if (titlePart) titleParts.push(titlePart);
            // Set title and stop capturing
            isCapturingTitle = false;
            result.mainTitle = titleParts.join(' - ');
            // Prepare the remainder of the line for further parsing as a reading
            const remainder = text.slice(splitIndex).trim();
            if (!remainder) continue;
            // Update variables for the rest of the loop
            text = remainder;
            lowerText = remainder.toLowerCase();
          } else if (
            lowerText.startsWith('đáp ca') ||
            lowerText.startsWith('tung hô tin mừng') ||
            lowerText.match(/^(tin mừng|phúc âm)\s*[-–—]?\s*(kiệu lá|rước lá)/i) ||
            lowerText.match(/^bài đọc\s*[1i]/i) ||
            lowerText.match(/^(✠\s*)?(tin mừng chúa giê-su|cuộc thương khó|khởi đầu tin mừng|kết thúc tin mừng)/i) ||
            lowerText.includes('dấu ký hiệu viết tắt')
          ) {
            isCapturingTitle = false;
            result.mainTitle = titleParts.join(' - ').split(/ - Bài đọc/i)[0].trim();
          } else {
            titleParts.push(text);
            continue;
          }
        }

        if (lowerText.match(/^(tin mừng|phúc âm)\s*[-–—]?\s*(kiệu lá|rước lá)/i)) {
          saveBuffer();
          currentSection = 'extra_reading';
          const matchRef = text.match(/\(([^)]+)\)/);
          const refStr = matchRef ? matchRef[1].trim() : text.replace(/^(tin mừng|phúc âm)\s*[-–—]?\s*(kiệu lá|rước lá)\s*/i, '').trim();
          result.extraReadings.push({
            title: 'Tin Mừng - Kiệu lá',
            ref: refStr,
            lead: '',
            epitomize: '',
            content: '',
            psalm_title: '',
            psalm_content: '',
            type: 'procession'
          });
          extraIndex = result.extraReadings.length - 1;
        } else if (lowerText.startsWith('bài đọc 1') || lowerText.startsWith('bài đọc i ')) {
          saveBuffer();
          currentSection = 'r1';
          result.r1.title = text.replace(/^(Bài đọc 1|Bài đọc I)\s*/i, '').trim();
        } else if (lowerText.startsWith('đáp ca')) {
          saveBuffer();
          // Nếu đang ở Bài đọc phụ, thì đây là Đáp ca phụ
          if (currentSection === 'extra_reading' || currentSection === 'extra_psalm') {
            currentSection = 'extra_psalm';
            if (extraIndex >= 0) {
              const fullText = text.replace(/^Đáp ca\s*/i, '').trim();
              const lines = fullText.split('\n');
              result.extraReadings[extraIndex].psalm_title = lines[0].trim();
              if (lines.length > 1) {
                contentBuffer.push(lines.slice(1).join('\n'));
              }
            }
          } else {
            currentSection = 'psalm';
            const fullText = text.replace(/^Đáp ca\s*/i, '').trim();
            const lines = fullText.split('\n');
            result.psalm.title = lines[0].trim();
            if (lines.length > 1) {
              contentBuffer.push(lines.slice(1).join('\n'));
            }
          }
        } else if (lowerText.startsWith('bài đọc 2') || lowerText.startsWith('bài đọc ii ')) {
          saveBuffer();
          currentSection = 'r2';
          result.r2.title = text.replace(/^(Bài đọc 2|Bài đọc II)\s*/i, '').trim();
        } else if (lowerText.match(/^hoặc(\s+bài đọc|\s+tin mừng|\s+phúc âm|\s*:|\s*$)/i)) {
          saveBuffer();
          let targetSection = 'gospel';
          if (currentSection === 'r1' || currentSection === 'psalm') targetSection = 'r1';
          else if (currentSection === 'r2') targetSection = 'r2';
          else if (currentSection === 'gospel' || currentSection === 'gospelAcclam') targetSection = 'gospel';

          currentSection = 'extra_reading';
          const matchRef = text.match(/\(([^)]+)\)/);
          const refStr = matchRef ? matchRef[1].trim() : text.replace(/^hoặc\s*[:\s]*/i, '').trim();
          result.extraReadings.push({
            title: text.trim(),
            ref: refStr,
            lead: '',
            epitomize: '',
            content: '',
            psalm_title: '',
            psalm_content: '',
            type: 'alternative',
            target_section: targetSection,
            option_label: refStr ? `Hoặc (${refStr})` : 'Lựa chọn khác'
          });
          extraIndex = result.extraReadings.length - 1;
        } else if (lowerText.match(/^bài đọc [3-9]/i) || lowerText.match(/^thánh thư/i) && !lowerText.includes('tung hô')) {
          saveBuffer();
          currentSection = 'extra_reading';
          result.extraReadings.push({
            title: text.trim(),
            lead: '',
            epitomize: '',
            content: '',
            psalm_title: '',
            psalm_content: ''
          });
          extraIndex = result.extraReadings.length - 1;
        } else if (lowerText.startsWith('tung hô tin mừng') || lowerText.startsWith('alleluia')) {
          saveBuffer();
          currentSection = 'gospelAcclam';
          result.gospelAcclam.title = text.replace(/^(Tung hô Tin Mừng|Alleluia)\s*/i, '').trim();
        } else if (lowerText.match(/^tin mừng\s/i) && !lowerText.includes('chúa giê-su')) {
          // Xử lý cấu trúc mới từ năm 2024: "Tin Mừng     Ga 3..."
          saveBuffer();
          currentSection = 'gospel';
          result.gospel.title = text.replace(/^Tin Mừng\s*/i, '').trim();
        } else if (lowerText.match(/^(✠\s*)?(tin mừng chúa giê-su|cuộc thương khó|khởi đầu tin mừng|kết thúc tin mừng)/i)) {
          if (currentSection === 'extra_reading') {
            const gospelMatch = text.match(/^(.*?theo thánh\s+[\p{L}\s-]+[.)]*)\s*\(?(.*?)\)?$/iu);
            if (gospelMatch) {
              result.extraReadings[extraIndex].lead = gospelMatch[1].trim();
            } else {
              result.extraReadings[extraIndex].lead = text;
            }
          } else {
            if (currentSection !== 'gospel') {
              saveBuffer();
              currentSection = 'gospel';
            }
            const gospelMatch = text.match(/^(.*?theo thánh\s+[\p{L}\s-]+[.)]*)\s*\(?(.*?)\)?$/iu);
            if (gospelMatch) {
              result.gospel.lead = gospelMatch[1].trim();
              if (!result.gospel.title) {
                result.gospel.title = gospelMatch[2].replace(/[()]/g, '').trim();
              }
            } else {
              result.gospel.lead = text;
            }
          }
        } else if (lowerText.includes('dấu ký hiệu viết tắt') || (currentSection === 'gospelAcclam' && lowerText.match(/^✠\s*:/))) {
          if (currentSection !== 'gospel') {
            saveBuffer();
            currentSection = 'gospel';
          }
          contentBuffer.push(text);
        } else if (lowerText.startsWith('bài trích sách') || lowerText.startsWith('thư của thánh') || lowerText.startsWith('bài trích thư') || lowerText.startsWith('khởi đầu') || lowerText.startsWith('trích sách') || lowerText.startsWith('trích thư')) {
           if (currentSection) {
             if (currentSection === 'extra_reading' && extraIndex >= 0) result.extraReadings[extraIndex].lead = text;
             else if (result[currentSection]) result[currentSection].lead = text;
           }
        } else if (p.querySelector('i') && p.innerText === p.querySelector('i').innerText && currentSection) {
           // Nếu là câu trích dẫn in nghiêng
           if (currentSection === 'extra_reading' && extraIndex >= 0) {
             if (!result.extraReadings[extraIndex].epitomize) result.extraReadings[extraIndex].epitomize = text;
             else contentBuffer.push(text);
           } else if (result[currentSection]) {
             if (!result[currentSection].epitomize) result[currentSection].epitomize = text;
             else contentBuffer.push(text);
           }
        } else {
          // Lọc rác (Footer) của Vatican News ở cuối trang
          if (lowerText.includes('xin hỗ trợ sứ mạng') || 
              lowerText.includes('góp ý cải thiện') || 
              lowerText.includes('điền form') ||
              lowerText.includes('đóng góp cho lời chúa hằng ngày')) {
             currentSection = null; // Dừng cào dữ liệu từ đoạn này trở đi vì đã đến chân trang
             continue;
          }

          // Xử lý các trích dẫn Phúc Âm hay lọt vào tung hô
          if (currentSection === 'gospelAcclam' && p.querySelector('i') && !lowerText.includes('ha-lê-lui-a')) {
             result.gospel.epitomize = text;
          } else if (currentSection) {
             contentBuffer.push(text);
          }
        }
      }
      saveBuffer();
      return result;
    });

    if (!data.gospel.content && !data.r1.content) {
      console.log(`⚠️ Ngày ${dateStr}: TRỐNG DỮ LIỆU. Bỏ qua.`);
      return;
    }

    // Xác định Tiêu đề: Ưu tiên tiêu đề thực tế từ Vatican (bao gồm cả lễ nhớ), nếu trống thì dùng tiêu đề tự gen
    const finalTitle = data.mainTitle ? cleanText(data.mainTitle).split(/ - Bài đọc/i)[0].trim() : info.displayName;

    // Tự động nhận diện Lễ Cố Định (Feast Day) thông qua tiêu đề Vatican News
    let finalLiturgyKey = info.key;
    let finalGospelCycle = gospelCycle;
    let finalReadingCycle = readingCycle;

    const isMovableFeastKey = info.key && (info.key.startsWith('feast_') || info.key.startsWith('fixed_'));
    const feastMatch = finalTitle.match(/^Ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})/i);

    if (isMovableFeastKey) {
      finalLiturgyKey = info.key;
    } else if (feastMatch) {
      const d = feastMatch[1].padStart(2, '0');
      const m = feastMatch[2].padStart(2, '0');
      finalLiturgyKey = `feast_${m}_${d}`;
    }

    if (feastMatch || info.isFeast || isMovableFeastKey) {
      // Lễ cố định thường dùng chung một chu kỳ ('all')
      // NGOẠI TRỪ các Chúa Nhật Đặc Biệt và các Lễ Trọng có chia chu kỳ A, B, C
      const cyclicFeasts = [
        'feast_phep_rua',
        'feast_cn_le_la', 
        'feast_chua_thang_thien', 
        'feast_hien_xuong', 
        'feast_ba_ngoi', 
        'feast_minh_mau_chua', 
        'feast_thanh_tam', 
        'feast_gia_that',
        'feast_tet_1',
        'feast_hien_linh'
      ];
      
      if (finalLiturgyKey === 'tuan_thanh_thu7') {
        finalReadingCycle = 'all'; // Đêm Canh thức: Bài đọc cố định (all), Phúc Âm chia A/B/C
      } else if (!info.isSunday && !isSpecialABCFeast && !cyclicFeasts.includes(finalLiturgyKey)) {
        finalGospelCycle = 'all';  
        finalReadingCycle = 'all'; 
      }
    }

    // === RULE KIỂM DUYỆT (VALIDATION) ===
    if (!finalTitle || !finalLiturgyKey || !finalGospelCycle) {
      throw new Error(`[VALIDATION FAILED] Thiếu cột bắt buộc: title, liturgy_key hoặc cycle`);
    }

    // 1. Bài đọc 1: Nếu có bất kỳ trường nào thì phải có đủ 4 cột
    const hasR1 = data.r1.title || data.r1.epitomize || data.r1.lead || data.r1.content;
    if (hasR1) {
      if (!data.r1.title || !data.r1.epitomize || !data.r1.lead || !data.r1.content) {
         throw new Error(`[VALIDATION FAILED] Bài đọc 1 thiếu dữ liệu. Cần đủ 4 cột (ref, quote, intro, content)`);
      }
    }

    // 2. Bài đọc 2: Nếu có bất kỳ trường nào thì phải có đủ 4 cột
    const hasR2 = data.r2.title || data.r2.epitomize || data.r2.lead || data.r2.content;
    if (hasR2) {
      if (!data.r2.title || !data.r2.epitomize || !data.r2.lead || !data.r2.content) {
         throw new Error(`[VALIDATION FAILED] Bài đọc 2 thiếu dữ liệu. Cần đủ 4 cột (ref, quote, intro, content)`);
      }
    }

    // 3. Phúc Âm: Bắt buộc phải có 3 cột
    if (!data.gospel.title || !data.gospel.lead || !data.gospel.content) {
      throw new Error(`[VALIDATION FAILED] Phúc âm thiếu dữ liệu. Cần đủ 3 cột (ref, intro, content)`);
    }

    // 1. Lưu bản ghi CHUNG (Phúc Âm)
    const gospelPayload = {
      liturgy_key: finalLiturgyKey,
      cycle: finalGospelCycle,
      title: finalTitle,
      quote: cleanText(data.gospel.epitomize),
      gospel_ref: cleanText(data.gospel.title),
      gospel_alleluia: cleanText(data.gospelAcclam.content),
      gospel_intro: cleanText(data.gospel.lead),
      gospel_content: cleanText(data.gospel.content),
      reflection: '' // Bot không tự suy niệm được
    };

    let payloads = [];

    // 2. Chỉ tách riêng Bài đọc và Phúc âm nếu là Ngày Thường của MÙA THƯỜNG NIÊN hoặc Thứ Bảy Tuần Thánh
    const shouldSplit = finalLiturgyKey === 'tuan_thanh_thu7' || (!info.isSunday && !feastMatch && !info.isFeast && finalLiturgyKey !== 'feast_thanh_tam' && finalLiturgyKey !== 'feast_gia_that' && info.season === 'thuong');
    
    if (shouldSplit) {
      const readingPayload = {
        liturgy_key: finalLiturgyKey,
        cycle: finalReadingCycle,
        title: finalTitle,
        r1_ref: cleanText(data.r1.title),
        r1_quote: cleanText(data.r1.epitomize),
        r1_intro: cleanText(data.r1.lead),
        r1_content: cleanText(data.r1.content),
        psalm_ref: cleanText(data.psalm.title),
        psalm_content: cleanText(data.psalm.content),
        r2_ref: cleanText(data.r2.title),
        r2_quote: cleanText(data.r2.epitomize),
        r2_intro: cleanText(data.r2.lead),
        r2_content: cleanText(data.r2.content),
        extra_readings: data.extraReadings && data.extraReadings.length > 0 ? data.extraReadings.map(ex => {
          if (ex.type === 'full_mass') {
            return {
              ...ex,
              title: cleanText(ex.title),
              mass_title: cleanText(ex.mass_title || ex.title),
              r1_ref: cleanText(ex.r1_ref), r1_quote: cleanText(ex.r1_quote), r1_intro: cleanText(ex.r1_intro), r1_content: cleanText(ex.r1_content),
              psalm_ref: cleanText(ex.psalm_ref), psalm_content: cleanText(ex.psalm_content),
              r2_ref: cleanText(ex.r2_ref), r2_quote: cleanText(ex.r2_quote), r2_intro: cleanText(ex.r2_intro), r2_content: cleanText(ex.r2_content),
              gospel_ref: cleanText(ex.gospel_ref), gospel_alleluia: cleanText(ex.gospel_alleluia), quote: cleanText(ex.quote || ex.gospel_quote || ex.epitomize), gospel_intro: cleanText(ex.gospel_intro), gospel_content: cleanText(ex.gospel_content)
            };
          }
          return {
            title: cleanText(ex.title),
            ref: cleanText(ex.ref || ex.title),
            quote: cleanText(ex.epitomize),
            intro: cleanText(ex.lead),
            content: cleanText(ex.content),
            psalm_ref: cleanText(ex.psalm_title),
            psalm_content: cleanText(ex.psalm_content),
            type: ex.type || 'extra',
            target_section: ex.target_section || null,
            option_label: ex.option_label || null
          };
        }) : null
      };
      payloads.push(gospelPayload, readingPayload);
    } else {
      // Nếu là Chúa nhật HOẶC Lễ cố định, nhập chung hết vào 1 cục
      const fullPayload = {
        ...gospelPayload,
        liturgy_key: finalLiturgyKey,
        cycle: finalGospelCycle,
        r1_ref: cleanText(data.r1.title),
        r1_quote: cleanText(data.r1.epitomize),
        r1_intro: cleanText(data.r1.lead),
        r1_content: cleanText(data.r1.content),
        psalm_ref: cleanText(data.psalm.title),
        psalm_content: cleanText(data.psalm.content),
        r2_ref: cleanText(data.r2.title),
        r2_quote: cleanText(data.r2.epitomize),
        r2_intro: cleanText(data.r2.lead),
        r2_content: cleanText(data.r2.content),
        extra_readings: data.extraReadings && data.extraReadings.length > 0 ? data.extraReadings.map(ex => {
          if (ex.type === 'full_mass') {
            return {
              ...ex,
              title: cleanText(ex.title),
              mass_title: cleanText(ex.mass_title || ex.title),
              r1_ref: cleanText(ex.r1_ref), r1_quote: cleanText(ex.r1_quote), r1_intro: cleanText(ex.r1_intro), r1_content: cleanText(ex.r1_content),
              psalm_ref: cleanText(ex.psalm_ref), psalm_content: cleanText(ex.psalm_content),
              r2_ref: cleanText(ex.r2_ref), r2_quote: cleanText(ex.r2_quote), r2_intro: cleanText(ex.r2_intro), r2_content: cleanText(ex.r2_content),
              gospel_ref: cleanText(ex.gospel_ref), gospel_alleluia: cleanText(ex.gospel_alleluia), quote: cleanText(ex.quote || ex.gospel_quote || ex.epitomize), gospel_intro: cleanText(ex.gospel_intro), gospel_content: cleanText(ex.gospel_content)
            };
          }
          return {
            title: cleanText(ex.title),
            ref: cleanText(ex.ref || ex.title),
            quote: cleanText(ex.epitomize),
            intro: cleanText(ex.lead),
            content: cleanText(ex.content),
            psalm_ref: cleanText(ex.psalm_title),
            psalm_content: cleanText(ex.psalm_content),
            type: ex.type || 'extra',
            target_section: ex.target_section || null,
            option_label: ex.option_label || null
          };
        }) : null
      };
      payloads.push(fullPayload);
    }

    if (previewMode) {
      for (const payload of payloads) {
        const existingIndex = scrapedResults.findIndex(
          item => item.liturgy_key === payload.liturgy_key && item.cycle === payload.cycle
        );
        if (existingIndex >= 0) {
          scrapedResults[existingIndex] = payload; // Ghi đè (Upsert)
        } else {
          scrapedResults.push(payload); // Thêm mới
        }
      }
      console.log(`👀 Chế độ Preview: Lưu tạm thành công ngày ${dateStr} (Đã áp dụng Ghi đè nếu trùng)`);
    } else {
      for (const payload of payloads) {
        const { error } = await supabase
          .from('liturgy_contents')
          .upsert(payload, { onConflict: 'liturgy_key,cycle' });
        if (error) throw new Error(`Lỗi lưu DB: ${error.message}`);
      }
      console.log(`✅ Lưu lên DB thành công ngày ${dateStr} (Key: ${info.key}, Cycle: ${currentCycle})`);
    }

  } catch (error) {
    console.log(`❌ Lỗi ngày ${dateStr}: ${error.message}`);
  } finally {
    await page.close();
  }
}

async function uploadPreviewData() {
  try {
    const rawData = await fs.readFile('preview_data.json', 'utf8');
    const payloads = JSON.parse(rawData);
    
    if (!Array.isArray(payloads) || payloads.length === 0) {
      console.log("⚠️ File preview_data.json trống hoặc không hợp lệ.");
      return;
    }

    console.log(`🚀 Bắt đầu đẩy ${payloads.length} bản ghi từ file preview lên Supabase...`);
    
    for (let i = 0; i < payloads.length; i++) {
      const payload = payloads[i];
      const { error } = await supabase
        .from('liturgy_contents')
        .upsert(payload, { onConflict: 'liturgy_key,cycle' });
        
      if (error) {
        console.log(`❌ Lỗi lưu bản ghi thứ ${i+1} (${payload.liturgy_key}): ${error.message}`);
      } else {
        console.log(`✅ Lưu DB thành công: ${payload.liturgy_key} (Cycle: ${payload.cycle})`);
      }
    }
    console.log("\n🎉 ĐÃ ĐẨY XONG DỮ LIỆU!");

  } catch (err) {
    console.log(`❌ Không thể đọc file preview_data.json: ${err.message}`);
    console.log(`Gợi ý: Bạn cần chạy lệnh scrape với cờ --preview trước để tạo file này.`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  let startDateStr = null;
  let endDateStr = null;
  let isPreviewMode = false;
  let isUploadMode = false;

  for (let arg of args) {
    if (arg.startsWith('--date=')) {
      startDateStr = arg.split('=')[1];
      endDateStr = startDateStr;
    } else if (arg.startsWith('--startDate=')) {
      startDateStr = arg.split('=')[1];
    } else if (arg.startsWith('--endDate=')) {
      endDateStr = arg.split('=')[1];
    } else if (arg === '--preview') {
      isPreviewMode = true;
    } else if (arg === '--upload') {
      isUploadMode = true;
    }
  }

  if (isUploadMode) {
    await uploadPreviewData();
    process.exit(0);
  }

  if (!startDateStr) {
    console.log("Cách sử dụng:");
    console.log("  npm run scrape -- --date=2024-07-17");
    console.log("  npm run scrape -- --date=2024-07-17 --preview");
    console.log("  npm run scrape -- --startDate=2024-08-01 --endDate=2024-08-31");
    console.log("  npm run scrape -- --upload");
    process.exit(0);
  }

  if (!endDateStr) endDateStr = startDateStr;

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  if (isNaN(startDate) || isNaN(endDate)) {
    console.error("❌ Lỗi: Ngày tháng không hợp lệ. Vui lòng dùng định dạng YYYY-MM-DD.");
    process.exit(1);
  }

  console.log(`🚀 Bắt đầu trình cào dữ liệu từ ${formatDateStr(startDate)} đến ${formatDateStr(endDate)}...`);
  if (isPreviewMode) console.log("👀 CHẾ ĐỘ PREVIEW: Dữ liệu sẽ chỉ lưu vào file tĩnh, không đẩy lên Database.");
  
  const browser = await puppeteer.launch({ headless: true });
  let scrapedResults = [];

  // Đọc dữ liệu cũ nếu có để cào nối tiếp
  if (isPreviewMode) {
    try {
      const existingData = await fs.readFile('preview_data.json', 'utf-8');
      scrapedResults = JSON.parse(existingData);
      console.log(`📥 Đã nạp ${scrapedResults.length} bản ghi cũ từ preview_data.json`);
    } catch (e) {
      // Bỏ qua nếu file chưa tồn tại
    }
  }

  // Tạo danh sách các ngày cần cào
  const datesToScrape = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    datesToScrape.push(new Date(d));
  }

  const CONCURRENCY_LIMIT = 5; // Cào tối đa 5 ngày cùng lúc

  for (let i = 0; i < datesToScrape.length; i += CONCURRENCY_LIMIT) {
    const chunk = datesToScrape.slice(i, i + CONCURRENCY_LIMIT);
    
    // Chạy song song cả cụm
    await Promise.all(
      chunk.map(async (dateObj) => {
        try {
          await scrapeDate(browser, dateObj, isPreviewMode, scrapedResults);
        } catch (err) {
          console.error(`❌ Lỗi ngày ${formatDateStr(dateObj)}:`, err.message);
        }
      })
    );

    // Lưu file SAU MỖI CỤM (Batch saving) để tối ưu ổ cứng
    if (isPreviewMode && scrapedResults.length > 0) {
      await fs.writeFile('preview_data.json', JSON.stringify(scrapedResults, null, 2), 'utf-8');
      console.log(`💾 Đã lưu tạm ${scrapedResults.length} bản ghi (Tiến độ: ${Math.min(i + CONCURRENCY_LIMIT, datesToScrape.length)}/${datesToScrape.length})`);
    }
  }

  await browser.close();

  if (isPreviewMode && scrapedResults.length > 0) {
    console.log(`\n💾 Đã hoàn tất lưu ${scrapedResults.length} bản ghi vào file preview_data.json`);
    console.log(`✍️  Hãy mở file preview_data.json ra kiểm duyệt, sau đó chạy: npm run scrape -- --upload`);
  }

  console.log("\n🎉 ĐÃ HOÀN THÀNH!");
}

main();
