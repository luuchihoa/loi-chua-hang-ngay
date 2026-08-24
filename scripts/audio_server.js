import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath, URL } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { normalizeAudioRef } from '../src/utils/audioNaming.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_DIR = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(BASE_DIR, '.env') });

// ── PORT CẤU HÌNH ĐỘNG ────────────────────────────────────────────────
const PORT = Number(process.env.AUDIO_PORT || 5005);
const IS_PROD = process.env.NODE_ENV === 'production';

// ── KHU VỰC PRIVATE STORAGE ──────────────────────────────────────────
const AUDIO_PRIVATE_ROOT = process.env.AUDIO_PRIVATE_ROOT || path.join(BASE_DIR, 'private', 'audio');
const DISK_CACHE_DIR = path.join(BASE_DIR, 'data');
const DISK_CACHE_PATH = path.join(DISK_CACHE_DIR, 'audio_liturgy_metadata_cache.json');
const CUSTOM_VOICES_DIR = path.join(AUDIO_PRIVATE_ROOT, 'custom_voices');

if (!fs.existsSync(AUDIO_PRIVATE_ROOT)) {
  fs.mkdirSync(AUDIO_PRIVATE_ROOT, { recursive: true });
}
if (!fs.existsSync(CUSTOM_VOICES_DIR)) {
  fs.mkdirSync(CUSTOM_VOICES_DIR, { recursive: true });
}
if (!fs.existsSync(DISK_CACHE_DIR)) {
  fs.mkdirSync(DISK_CACHE_DIR, { recursive: true });
}

// ── BẢO MẬT CHỮ KÝ AUDIO_SIGNING_SECRET ──────────────────────────────
let SIGNING_SECRET = process.env.AUDIO_SIGNING_SECRET || '';
if (!SIGNING_SECRET || SIGNING_SECRET.length < 32) {
  if (IS_PROD) {
    console.error('❌ FATAL: AUDIO_SIGNING_SECRET phải có tối thiểu 32 ký tự trên môi trường production!');
    process.exit(1);
  } else {
    console.warn('⚠️ WARNING: AUDIO_SIGNING_SECRET chưa được thiết lập hoặc quá ngắn. Đang tự tạo random secret ngẫu nhiên cho dev.');
    SIGNING_SECRET = crypto.randomBytes(32).toString('hex');
  }
}

// Parse TOKEN_TTL_SECONDS an toàn (min 30s, max 300s, invalid => 120s)
let parsedTtl = parseInt(process.env.AUDIO_STREAM_TOKEN_TTL_SECONDS || '120', 10);
if (isNaN(parsedTtl)) parsedTtl = 120;
const TOKEN_TTL_SECONDS = Math.max(30, Math.min(parsedTtl, 300));

// ── CẤU HÌNH SUPABASE SERVER-SIDE (ANON KEY ONLY) ──────────────────
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ── SERVER TRACK REGISTRY (HMAC-SHA256 OPAQUE TRACK ID) ─────────────
const trackRegistry = new Map();     // trackId -> { trackId, relPath, absPath, filename, categoryKey, categoryLabel, sizeKb, contentType }
const relPathToTrackMap = new Map(); // relPath -> trackId

const ALLOWED_AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac']);

function getContentTypeForExt(ext) {
  switch (ext.toLowerCase()) {
    case '.wav': return 'audio/wav';
    case '.m4a':
    case '.aac': return 'audio/aac';
    case '.ogg': return 'audio/ogg';
    case '.flac': return 'audio/flac';
    default: return 'audio/mpeg';
  }
}

function generateOpaqueTrackId(relPath) {
  return crypto.createHmac('sha256', SIGNING_SECRET).update(`track:${relPath}`).digest('hex').slice(0, 32);
}

function scanPrivateAudioRegistry() {
  trackRegistry.clear();
  relPathToTrackMap.clear();

  function scanDir(dirPath, relDir = '') {
    if (!fs.existsSync(dirPath)) return;
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
      const relPath = path.join(relDir, item.name).replace(/\\/g, '/');
      const absPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        scanDir(absPath, relPath);
      } else if (item.isFile() && !item.name.includes('test')) {
        const ext = path.extname(item.name).toLowerCase();
        if (!ALLOWED_AUDIO_EXTENSIONS.has(ext)) continue;

        const trackId = generateOpaqueTrackId(relPath);
        let sizeKb = '0.0';
        try { sizeKb = (fs.statSync(absPath).size / 1024).toFixed(1); } catch (e) {}

        let categoryKey = 'other';
        let categoryLabel = 'Khác';
        if (relPath === 'readings/r1.mp3' || relPath === 'readings/r2.mp3') { categoryKey = 'reading_intro'; categoryLabel = 'Lời dẫn bài đọc'; }
        else if (relPath.startsWith('readings/')) { categoryKey = 'reading'; categoryLabel = 'Bài Đọc'; }
        else if (relPath.startsWith('gospels')) { categoryKey = 'gospel'; categoryLabel = 'Tin Mừng'; }
        else if (relPath.startsWith('music/')) { categoryKey = 'music'; categoryLabel = 'Nhạc phụng vụ'; }
        else if (relPath.startsWith('bible')) { categoryKey = 'bible'; categoryLabel = 'Kinh Thánh'; }
        else if (relPath.startsWith('custom_voices')) { categoryKey = 'custom_voice'; categoryLabel = 'Giọng Mẫu'; }

        const entry = {
          trackId,
          relPath,
          absPath,
          filename: item.name,
          categoryKey,
          categoryLabel,
          sizeKb,
          contentType: getContentTypeForExt(ext)
        };

        trackRegistry.set(trackId, entry);
        relPathToTrackMap.set(relPath, trackId);
      }
    }
  }

  scanDir(AUDIO_PRIVATE_ROOT);
  console.log(`🔐 [REGISTRY] Quét thành công ${trackRegistry.size} file audio mã hóa HMAC trackId từ ${AUDIO_PRIVATE_ROOT}`);
}

scanPrivateAudioRegistry();

// ── ALLOWLIST VÀ CHUẨN HÓA 73 SÁCH KINH THÁNH ────────────────────────
const BIBLE_73_BOOKS_MAP = {
  // Cựu Ước (46 Sách)
  'gen': ['st', 'gen'], 'exo': ['xh', 'exo'], 'lev': ['lv', 'lev'], 'num': ['ds', 'num'], 'deu': ['dnl', 'deu'],
  'jos': ['gs', 'jos'], 'jdg': ['tl', 'jdg'], 'rut': ['r', 'rut'], '1sa': ['1sm', '1sa'], '2sa': ['2sm', '2sa'],
  '1ki': ['1v', '1ki'], '2ki': ['2v', '2ki'], '1ch': ['1sb', '1ch'], '2ch': ['2sb', '2ch'], 'ezr': ['er', 'ezr'],
  'neh': ['nhm', 'neh'], 'tob': ['tb', 'tob'], 'jdt': ['gdt', 'jdt'], 'est': ['et', 'est'], '1ma': ['1mc', '1ma'],
  '2ma': ['2mc', '2ma'], 'job': ['g', 'job'], 'psa': ['tv', 'psa'], 'pro': ['cn', 'pro'], 'ecc': ['gv', 'ecc'],
  'sng': ['dc', 'sng'], 'wis': ['kn', 'wis'], 'sir': ['hc', 'sir'], 'isa': ['is', 'isa'], 'jer': ['gr', 'jer'],
  'lam': ['ac', 'lam'], 'bar': ['br', 'bar'], 'ezk': ['ed', 'ezk'], 'dan': ['dn', 'dan'], 'hos': ['hs', 'hos'],
  'jol': ['ge', 'jol'], 'amo': ['am', 'amo'], 'oba': ['ov', 'oba'], 'jon': ['gn', 'jon'], 'mic': ['mi', 'mic'],
  'nam': ['na', 'nam'], 'hab': ['hc', 'hab'], 'zep': ['sp', 'zep'], 'hag': ['hg', 'hag'], 'zec': ['dc', 'zec'],
  'mal': ['ml', 'mal'],
  // Tân Ước (27 Sách)
  'mat': ['mt', 'mat'], 'mrk': ['mc', 'mrk'], 'luk': ['lc', 'luk'], 'jhn': ['ga', 'jhn'], 'act': ['tvd', 'cv', 'act'],
  'rom': ['rm', 'rom'], '1co': ['1cr', '1co'], '2co': ['2cr', '2co'], 'gal': ['gl', 'gal'], 'eph': ['ep', 'eph'],
  'php': ['pl', 'php'], 'col': ['cl', 'col'], '1th': ['1tx', '1th'], '2th': ['2tx', '2th'], '1ti': ['1tm', '1ti'],
  '2ti': ['2tm', '2ti'], 'tit': ['tt', 'tit'], 'phm': ['plm', 'phm'], 'heb': ['tg', 'dt', 'heb'], 'jas': ['gc', 'jas'],
  '1pe': ['1pr', '1pe'], '2pe': ['2pr', '2pe'], '1jn': ['1ga', '1jn'], '2jn': ['2ga', '2jn'], '3jn': ['3ga', '3jn'],
  'jud': ['gd', 'jud'], 'rev': ['kh', 'rev']
};

function normalizeBibleBookId(inputBookId) {
  if (!inputBookId) return null;
  const key = inputBookId.trim().toLowerCase();

  for (const [canonicalId, codes] of Object.entries(BIBLE_73_BOOKS_MAP)) {
    if (canonicalId === key || codes.includes(key)) {
      return { canonicalId, codes };
    }
  }

  return null;
}

// ── BẢNG CHUẨN HÓA TÊN SÁCH & THƯ KINH THÁNH CÔNG GIÁO ─────────────
const CATHOLIC_BOOK_MAP = {
  '1 ga': { name: 'Thư thứ nhất của thánh Gio-an' },
  '2 ga': { name: 'Thư thứ hai của thánh Gio-an' },
  '3 ga': { name: 'Thư thứ ba của thánh Gio-an' },
  '1 cr': { name: 'Thư thứ nhất gửi tín hữu Cô-rin-tô' },
  '2 cr': { name: 'Thư thứ hai gửi tín hữu Cô-rin-tô' },
  '1 tx': { name: 'Thư thứ nhất gửi tín hữu Tê-sa-lô-ni-ca' },
  '2 tx': { name: 'Thư thứ hai gửi tín hữu Tê-sa-lô-ni-ca' },
  '1 tm': { name: 'Thư thứ nhất gửi ông Ti-mô-thê' },
  '2 tm': { name: 'Thư thứ hai gửi ông Ti-mô-thê' },
  '1 pr': { name: 'Thư thứ nhất của thánh Phê-rơ' },
  '2 pr': { name: 'Thư thứ hai của thánh Phê-rơ' },
  '1 v': { name: 'Sách 1 Các Vua' },
  '2 v': { name: 'Sách 2 Các Vua' },
  '1 sb': { name: 'Sách 1 Sử Biên' },
  '2 sb': { name: 'Sách 2 Sử Biên' },
  '1 mcb': { name: 'Sách 1 Ma-ca-bê' },
  '2 mcb': { name: 'Sách 2 Ma-ca-bê' },
  '1 sa': { name: 'Sách 1 Sa-mu-en' },
  '2 sa': { name: 'Sách 2 Sa-mu-en' },
  'ga': { name: 'Tin Mừng theo thánh Gio-an' },
  'mt': { name: 'Tin Mừng theo thánh Mát-thêu' },
  'mat': { name: 'Tin Mừng theo thánh Mát-thêu' },
  'mc': { name: 'Tin Mừng theo thánh Mác-cô' },
  'lc': { name: 'Tin Mừng theo thánh Lu-ca' },
  'gr': { name: 'Sách Giê-rê-mi-a' },
  'is': { name: 'Sách I-sai-a' },
  'đn': { name: 'Sách Đa-ni-en' },
  'rm': { name: 'Thư gửi tín hữu Rô-ma' },
  'tv': { name: 'Thánh Vịnh' }
};

const BOOK_NAME_MAP = {
  'gen': 'Sáng Thế', 'exo': 'Xuất Hành', 'lev': 'Lê-vi', 'num': 'Dân Số', 'deu': 'Đệ Nhị Luật',
  'jos': 'Giô-suê', 'jdg': 'Thủ Lãnh', 'rut': 'Rút', '1sa': '1 Sa-mu-en', '2sa': '2 Sa-mu-en',
  '1ki': '1 Các Vua', '2ki': '2 Các Vua', '1ch': '1 Sử Biên', '2ch': '2 Sử Biên', 'ezr': 'Ét-ra',
  'neh': 'Nơ-he-mi-a', 'tob': 'Tô-bi-a', 'jdt': 'Giu-đi-ta', 'est': 'Ét-te', '1ma': '1 Ma-ca-bê',
  '2ma': '2 Ma-ca-bê', 'job': 'Gióp', 'psa': 'Thánh Vịnh', 'pro': 'Châm Ngôn', 'ecc': 'Giáo Lý',
  'sng': 'Diệu Ca', 'wis': 'Khôn Ngoan', 'sir': 'Huấn Ca', 'isa': 'I-sai-a', 'jer': 'Giê-rê-mi-a',
  'lam': 'A-ca', 'bar': 'Ba-ruc', 'ezk': 'Ê-dê-ki-en', 'dan': 'Đa-ni-en', 'hos': 'Hô-sê',
  'jol': 'Giô-en', 'amo': 'A-mốt', 'oba': 'Óa-đi-a', 'jon': 'Giô-na', 'mic': 'Mi-kha',
  'nam': 'Na-hum', 'hab': 'Ha-ba-cúc', 'zep': 'Xơ-pha-ni-a', 'hag': 'Háp-gai', 'zec': 'Da-ca-ri-a',
  'mal': 'Ma-la-khi', 'mat': 'Mát-thêu', 'mrk': 'Mác-cô', 'luk': 'Lu-ca', 'jhn': 'Gio-an',
  'act': 'Tông Đồ Công Tác', 'rom': 'Rô-ma', '1co': '1 Cô-rin-tô', '2co': '2 Cô-rin-tô',
  'gal': 'Ga-lát', 'eph': 'Ê-phê-xô', 'php': 'Phi-líp-phê', 'col': 'Cô-lô-xê', '1th': '1 Tê-sa-lô-ni-ca',
  '2th': '2 Tê-sa-lô-ni-ca', '1ti': '1 Ti-mô-thê', '2ti': '2 Ti-mô-thê', 'tit': 'Ta-tô',
  'phm': 'Phi-lê-môn', 'heb': 'Do Thái', 'jas': 'Gia-cô-bê', '1pe': '1 Phê-rơ', '2pe': '2 Phê-rơ',
  '1jn': '1 Gio-an', '2jn': '2 Gio-an', '3jn': '3 Gio-an', 'jud': 'Giu-đa', 'rev': 'Khải Huyền',
  'mt': 'Mát-thêu', 'mc': 'Mác-cô', 'lc': 'Lu-ca', 'ga': 'Gio-an', 'gr': 'Giê-rê-mi-a',
  'rm': 'Rô-ma', '1 v': '1 Các Vua', '2 v': '2 Các Vua', 'is': 'I-sai-a', 'tv': 'Thánh Vịnh'
};

function getBookFullName(shortCode) {
  if (!shortCode) return null;
  const key = shortCode.toLowerCase().trim();
  return BOOK_NAME_MAP[key] || shortCode;
}

function getCanonicalSlug(ref) {
  return normalizeAudioRef(ref);
}

// Chỉ dùng để đọc kho cũ r1_/r2_ trong giai đoạn chuyển đổi.
function getLegacySlug(ref) {
  if (!ref) return '';
  return ref
    .trim()
    .replace(/[\.,:;()\\/*?"<>|]/g, '')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
}

function formatFullScriptureTitle(ref, categoryLabel) {
  if (!ref) return null;
  const cleanRef = ref.trim();

  const match = cleanRef.match(/^([1-3]\s+[a-zA-Zà-ỹĐđ]+|[a-zA-Zà-ỹĐđ]+)/i);
  if (!match) return cleanRef;

  const rawCode = match[1].toLowerCase().replace(/\s+/g, ' ').trim();
  const found = CATHOLIC_BOOK_MAP[rawCode];

  if (found) {
    return `${found.name} (${cleanRef})`;
  }

  const bookName = getBookFullName(rawCode);
  if (!bookName) return cleanRef;

  if (categoryLabel === 'Tin Mừng') {
    return `Tin Mừng theo thánh ${bookName} (${cleanRef})`;
  } else if (['Rô-ma', 'Cô-rin-tô', 'Ga-lát', 'Ê-phê-xô', 'Phi-líp-phê', 'Cô-lô-xê', 'Tê-sa-lô-ni-ca', 'Ti-mô-thê', 'Ta-tô', 'Phi-lê-môn', 'Gio-an', 'Phê-rơ'].some(b => bookName.includes(b))) {
    return `Thư ${bookName} (${cleanRef})`;
  } else {
    return `Sách ${bookName} (${cleanRef})`;
  }
}

function formatFallbackScriptureTitle(filename = '', defaultCategory = '') {
  if (!filename) return defaultCategory || 'Bài Đọc Audio';

  const cleanName = filename
    .replace(/\.mp3$/i, '')
    .replace(/^(gospel|r1|r2)_/i, '')
    .trim();

  const match = cleanName.match(/^([1-3]_[A-Za-zà-ỹĐđ]+|[A-Za-zà-ỹĐđ]+)_(.+)$/);
  if (match) {
    const rawBookCode = match[1].replace(/_/g, ' ').toLowerCase().trim();
    const rawRefPart = match[2];
    const displayRef = `${match[1].replace(/_/g, ' ')} ${rawRefPart}`;

    const found = CATHOLIC_BOOK_MAP[rawBookCode];
    if (found) {
      return `${found.name} (${displayRef})`;
    }

    const bookName = getBookFullName(rawBookCode);
    if (bookName) {
      if (defaultCategory === 'Tin Mừng') {
        return `Tin Mừng theo thánh ${bookName} (${displayRef})`;
      } else {
        return `Sách ${bookName} (${displayRef})`;
      }
    }
  }

  return cleanName.replace(/_/g, ' ') || filename;
}

// ── QUẢN LÝ PERSISTENT DISK CACHE METADATA (JSON FILE) ───────────────
function loadDiskCache() {
  try {
    if (!fs.existsSync(DISK_CACHE_PATH)) return null;
    const raw = fs.readFileSync(DISK_CACHE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.entries)) {
      console.warn('⚠️ File disk cache metadata không hợp lệ schema.');
      return null;
    }

    const map = new Map();
    parsed.entries.forEach(([key, usages]) => {
      if (typeof key === 'string' && Array.isArray(usages)) {
        map.set(key, usages);
      }
    });

    console.log(`💾 [DISK CACHE] Nạp thành công ${map.size} file metadata từ ${DISK_CACHE_PATH}`);
    return {
      data: map,
      savedAt: Number(parsed.savedAt) || 0
    };
  } catch (err) {
    console.warn('⚠️ Lỗi đọc disk cache metadata:', err.message);
    return null;
  }
}

function saveDiskCache(map) {
  try {
    const entries = Array.from(map.entries());
    const payload = {
      savedAt: Date.now(),
      entries
    };

    const tmpPath = `${DISK_CACHE_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf-8');
    fs.renameSync(tmpPath, DISK_CACHE_PATH);
    console.log(`💾 [DISK CACHE SAVED] Đã lưu atomic ${entries.length} file metadata vào đĩa.`);
  } catch (err) {
    console.warn('⚠️ Lỗi lưu atomic disk cache metadata:', err.message);
  }
}

// ── CACHE METADATA IN-MEMORY VỚI DISK HYDRATION ─────────────────────
const initialDisk = loadDiskCache();

let metadataCache = {
  data: initialDisk ? initialDisk.data : new Map(),
  lastFetched: initialDisk ? initialDisk.savedAt : 0,
  lastFailedAt: 0,
  isFetching: false
};

const METADATA_TTL_MS = 60 * 60 * 1000;       // 1 Giờ cache thành công
const NEGATIVE_CACHE_TTL_MS = 45 * 1000;       // 45 Giây backoff khi thất bại
const SUPABASE_TIMEOUT_MS = 3000;              // 3 Giây timeout tối đa

async function fetchMetadataFromSupabaseDirect() {
  if (!supabase) return new Map();

  const controller = new AbortController();
  let timeoutId = null;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error('Supabase metadata query timed out (3s limit)'));
    }, SUPABASE_TIMEOUT_MS);
  });

  const queryPromise = (async () => {
    const { data: rows, error } = await supabase
      .from('liturgy_contents')
      .select('id, liturgy_key, cycle, title, r1_ref, r2_ref, gospel_ref')
      .abortSignal(controller.signal);

    if (error) {
      throw new Error(`Supabase query error: ${error.message}`);
    }
    return rows || [];
  })();

  try {
    const rows = await Promise.race([queryPromise, timeoutPromise]);

    const map = new Map();
    rows.forEach((r) => {
      const title = r.title || r.liturgy_key;
      const cycle = r.cycle || 'all';
      const liturgyKey = r.liturgy_key;

      const refs = [
        { ref: r.gospel_ref, prefix: 'gospel', sectionLabel: 'Tin Mừng' },
        { ref: r.r1_ref, prefix: 'r1', sectionLabel: 'Bài Đọc 1' },
        { ref: r.r2_ref, prefix: 'r2', sectionLabel: 'Bài Đọc 2' }
      ];

      refs.forEach((item) => {
        if (!item.ref) return;
        const slug = getCanonicalSlug(item.ref);
        if (!slug) return;
        // Mỗi thư mục tự xác định loại audio, nên mọi nội dung đều dùng tên theo ref.
        const fname = `${slug}.mp3`;

        if (!map.has(fname)) {
          map.set(fname, []);
        }

        const existing = map.get(fname);
        if (!existing.some(u => u.liturgyKey === liturgyKey && u.ref === item.ref)) {
          existing.push({
            section: item.prefix,
            sectionLabel: item.sectionLabel,
            ref: item.ref,
            title,
            liturgyKey,
            cycle
          });
        }
      });
    });

    return map;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function getOrFetchLiturgyMetadata() {
  const now = Date.now();

  if (metadataCache.lastFetched > 0 && (now - metadataCache.lastFetched) < METADATA_TTL_MS) {
    return metadataCache.data;
  }

  if (metadataCache.lastFailedAt > 0 && (now - metadataCache.lastFailedAt) < NEGATIVE_CACHE_TTL_MS) {
    return metadataCache.data;
  }

  if (metadataCache.data.size > 0 && !metadataCache.isFetching) {
    metadataCache.isFetching = true;
    fetchMetadataFromSupabaseDirect()
      .then((map) => {
        if (map && map.size > 0) {
          metadataCache.data = map;
          metadataCache.lastFetched = Date.now();
          metadataCache.lastFailedAt = 0;
          saveDiskCache(map);
          console.log(`✅ [BG REFRESH] Cập nhật metadata cache thành công (${map.size} files mapped).`);
        }
      })
      .catch((err) => {
        metadataCache.lastFailedAt = Date.now();
        console.warn(`⚠️ [BG REFRESH FAILED] ${err.message} (entering 45s backoff, retaining disk cache).`);
      })
      .finally(() => {
        metadataCache.isFetching = false;
      });

    return metadataCache.data;
  }

  if (!metadataCache.isFetching) {
    metadataCache.isFetching = true;
    try {
      const map = await fetchMetadataFromSupabaseDirect();
      if (map && map.size > 0) {
        metadataCache.data = map;
        metadataCache.lastFetched = Date.now();
        metadataCache.lastFailedAt = 0;
        saveDiskCache(map);
        console.log(`✅ [INITIAL FETCH] Nạp metadata cache thành công (${map.size} files mapped).`);
      }
    } catch (err) {
      metadataCache.lastFailedAt = Date.now();
      console.warn(`⚠️ [INITIAL FETCH FAILED] ${err.message} (entering 45s backoff).`);
    } finally {
      metadataCache.isFetching = false;
    }
  }

  return metadataCache.data;
}

// ── SECURITY: CORS ALLOWLIST VÀ ORIGINS ──────────────────────────────
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3100', 'http://127.0.0.1:3100',
  'http://localhost:3101', 'http://127.0.0.1:3101',
  'http://localhost:3102', 'http://127.0.0.1:3102',
  'http://localhost:5173', 'http://127.0.0.1:5173',
  'http://localhost:3000', 'http://127.0.0.1:3000',
  'http://localhost:5005', 'http://127.0.0.1:5005',
  'http://localhost:5007', 'http://127.0.0.1:5007'
];
const envOrigins = (process.env.AUDIO_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const ALLOWED_ORIGINS = new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins]);

function getClientIp(req) {
  if (process.env.AUDIO_TRUST_PROXY === 'true') {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

function handleCors(req, res) {
  res.setHeader('Vary', 'Origin');
  const origin = req.headers.origin;

  if (!origin) {
    return true;
  }

  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
    return true;
  }

  res.writeHead(403, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Origin not allowed' }));
  return false;
}

// ── SECURITY: RATE LIMITING BUCKET THEO ROUTE & IP ──────────────────
const rateLimitMap = new Map();

function checkRateLimit(req, res, bucket = 'default', maxRequests = 60, windowMs = 60000) {
  const ip = getClientIp(req);
  const key = `${ip}:${bucket}`;
  const now = Date.now();

  if (rateLimitMap.size > 500) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (now > v.resetTime) {
        rateLimitMap.delete(k);
      }
    }
  }

  let entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetTime) {
    entry = { count: 1, resetTime: now + windowMs };
    rateLimitMap.set(key, entry);
    return true;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    res.writeHead(429, { 
      'Content-Type': 'application/json',
      'Retry-After': String(retryAfter)
    });
    res.end(JSON.stringify({ error: 'Too many requests. Please try again later.' }));
    return false;
  }

  return true;
}

const MAX_BODY_BYTES = 5 * 1024 * 1024;
function readBodyWithLimit(req, res, callback) {
  let chunks = [];
  let totalSize = 0;

  req.on('data', chunk => {
    totalSize += chunk.length;
    if (totalSize > MAX_BODY_BYTES) {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Payload Too Large' }));
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });

  req.on('end', () => {
    if (totalSize <= MAX_BODY_BYTES) {
      callback(Buffer.concat(chunks));
    }
  });
}

function parseMultipart(buffer, boundary) {
  const parts = [];
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  let start = buffer.indexOf(boundaryBuffer) + boundaryBuffer.length;

  while (true) {
    const nextBound = buffer.indexOf(boundaryBuffer, start);
    if (nextBound === -1) break;

    const partData = buffer.slice(start, nextBound);
    const headerEnd = partData.indexOf('\r\n\r\n');
    if (headerEnd === -1) { start = nextBound + boundaryBuffer.length; continue; }

    const headers = partData.slice(0, headerEnd).toString();
    const body = partData.slice(headerEnd + 4, partData.length - 2);

    const filenameMatch = headers.match(/filename="([^"]+)"/);
    const nameMatch = headers.match(/name="([^"]+)"/);

    parts.push({
      name: nameMatch ? nameMatch[1] : '',
      filename: filenameMatch ? filenameMatch[1] : null,
      data: body,
      headers
    });

    start = nextBound + boundaryBuffer.length;
  }

  return parts;
}

// ── TẠO VÀ VERIFY CHỮ KÝ STREAM TOKEN (HMAC-SHA256) ──────────────────
function generateSignedToken(trackId, req) {
  const now = Math.floor(Date.now() / 1000);
  const expires = now + TOKEN_TTL_SECONDS;
  const ip = getClientIp(req);
  const data = `${trackId}:${expires}:${ip}`;
  const sig = crypto.createHmac('sha256', SIGNING_SECRET).update(data).digest('hex');
  return { streamPath: `/api/audio-stream/${trackId}?expires=${expires}&sig=${sig}`, expiresAt: expires };
}

function verifySignedToken(trackId, expiresStr, sigStr, req) {
  if (!expiresStr || !sigStr) {
    return { valid: false, code: 401, error: 'Authentication token missing' };
  }

  const expires = parseInt(expiresStr, 10);
  if (isNaN(expires)) {
    return { valid: false, code: 401, error: 'Invalid token format' };
  }

  const now = Math.floor(Date.now() / 1000);
  if (now > expires) {
    return { valid: false, code: 410, error: 'Access token expired' };
  }

  const ip = getClientIp(req);
  const data = `${trackId}:${expires}:${ip}`;
  const expectedSig = crypto.createHmac('sha256', SIGNING_SECRET).update(data).digest('hex');

  const sigBuffer = Buffer.from(sigStr, 'utf-8');
  const expectedBuffer = Buffer.from(expectedSig, 'utf-8');

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return { valid: false, code: 403, error: 'Invalid token signature' };
  }

  return { valid: true };
}

const server = http.createServer(async (req, res) => {
  if (!handleCors(req, res)) return;

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;

  // ── 1. API LIST AUDIO (PROTECTED METADATA + OPAQUE TRACK ID) ──────────
  if (req.method === 'GET' && pathname === '/api/list-audio') {
    if (!checkRateLimit(req, res, 'list', 60, 60000)) return;

    try {
      const categoryParam = (reqUrl.searchParams.get('category') || 'all').toLowerCase();
      const q = (reqUrl.searchParams.get('q') || '').trim().toLowerCase();
      let limit = parseInt(reqUrl.searchParams.get('limit') || '12', 10);
      if (isNaN(limit) || limit < 1) limit = 12;
      if (limit > 50) limit = 50;

      let offset = parseInt(reqUrl.searchParams.get('offset') || reqUrl.searchParams.get('cursor') || '0', 10);
      if (isNaN(offset) || offset < 0) offset = 0;

      const metadataMap = await getOrFetchLiturgyMetadata();

      const allFiles = [];
      for (const [trackId, entry] of trackRegistry.entries()) {
        if (entry.categoryKey === 'bible' || entry.categoryKey === 'custom_voice' || entry.categoryKey === 'other') continue;

        const fn = entry.filename;
        const usages = metadataMap.get(fn) || [];
        const hasMetadataMatch = usages.length > 0;
        const primaryUsage = hasMetadataMatch ? usages[0] : null;
        const confirmedRef = primaryUsage?.ref || null;
        const fullScriptureTitle = confirmedRef 
          ? formatFullScriptureTitle(confirmedRef, entry.categoryLabel)
          : formatFallbackScriptureTitle(fn, entry.categoryLabel);

        allFiles.push({
          trackId: entry.trackId, // OPAQUE ID ONLY
          filename: fn,
          category: entry.categoryLabel,
          categoryKey: entry.categoryKey,
          size_kb: entry.sizeKb,
          hasMetadataMatch,
          confirmedRef,
          fullScriptureTitle,
          usages: usages.map(u => ({ title: u.title, liturgyKey: u.liturgyKey, cycle: u.cycle })),
          primaryUsage: primaryUsage ? { title: primaryUsage.title, liturgyKey: primaryUsage.liturgyKey, cycle: primaryUsage.cycle } : null,
          extraUsagesCount: Math.max(0, usages.length - 1)
        });
      }

      let filtered = allFiles.filter(item => {
        if (categoryParam === 'all') return true;
        return item.categoryKey === categoryParam;
      });

      if (q) {
        filtered = filtered.filter(item => {
          return (
            item.filename.toLowerCase().includes(q) ||
            item.fullScriptureTitle.toLowerCase().includes(q) ||
            (item.confirmedRef && item.confirmedRef.toLowerCase().includes(q)) ||
            item.category.toLowerCase().includes(q) ||
            item.usages.some(u => u.title.toLowerCase().includes(q) || u.liturgyKey.toLowerCase().includes(q))
          );
        });
      }

      const total = filtered.length;
      const slicedFiles = filtered.slice(offset, offset + limit);
      const hasMore = offset + limit < total;
      const nextCursor = hasMore ? offset + limit : null;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        files: slicedFiles,
        total,
        offset,
        limit,
        hasMore,
        nextCursor
      }));
    } catch (err) {
      console.error('❌ GET /api/list-audio Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }

  // ── 2. API AUDIO ACCESS (POST /api/audio-access) ──────────────────────
  } else if (req.method === 'POST' && pathname === '/api/audio-access') {
    if (!checkRateLimit(req, res, 'access', 20, 60000)) return;

    const contentType = req.headers['content-type'] || '';
    if (!contentType.toLowerCase().startsWith('application/json')) {
      res.writeHead(415, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Content-Type phải là application/json' }));
      return;
    }

    readBodyWithLimit(req, res, (buffer) => {
      try {
        const body = JSON.parse(buffer.toString());
        const trackId = body.trackId;

        if (!trackId || typeof trackId !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Thiếu tham số trackId hợp lệ' }));
          return;
        }

        const entry = trackRegistry.get(trackId);
        if (!entry || !fs.existsSync(entry.absPath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Audio track không tồn tại' }));
          return;
        }

        const tokenObj = generateSignedToken(trackId, req);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          trackId,
          streamPath: tokenObj.streamPath,
          expiresAt: tokenObj.expiresAt
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Body JSON không hợp lệ' }));
      }
    });

  // ── 3. API AUDIO STREAMING (GET / HEAD /api/audio-stream/:trackId) ────
  } else if ((req.method === 'GET' || req.method === 'HEAD') && pathname.startsWith('/api/audio-stream/')) {
    if (!checkRateLimit(req, res, 'stream', 120, 60000)) return;

    const trackId = pathname.replace('/api/audio-stream/', '').trim();
    const expiresStr = reqUrl.searchParams.get('expires');
    const sigStr = reqUrl.searchParams.get('sig');

    const entry = trackRegistry.get(trackId);
    if (!entry || !fs.existsSync(entry.absPath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Audio track không tồn tại' }));
      return;
    }

    const verification = verifySignedToken(trackId, expiresStr, sigStr, req);
    if (!verification.valid) {
      res.writeHead(verification.code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: verification.error }));
      return;
    }

    // Streaming File Với Range Requests Hỗ Trợ HTTP 206
    const stat = fs.statSync(entry.absPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const streamContentType = entry.contentType || 'audio/mpeg';

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (isNaN(start) || isNaN(end) || start >= fileSize || end >= fileSize || start > end) {
        res.writeHead(416, {
          'Content-Range': `bytes */${fileSize}`,
          'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({ error: 'Requested Range Not Satisfiable' }));
        return;
      }

      const chunkSize = (end - start) + 1;
      const headers = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': streamContentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff'
      };

      res.writeHead(206, headers);
      if (req.method === 'HEAD') {
        res.end();
      } else {
        const stream = fs.createReadStream(entry.absPath, { start, end });
        stream.pipe(res);
      }
    } else {
      const headers = {
        'Content-Length': fileSize,
        'Content-Type': streamContentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Accept-Ranges': 'bytes'
      };

      res.writeHead(200, headers);
      if (req.method === 'HEAD') {
        res.end();
      } else {
        const stream = fs.createReadStream(entry.absPath);
        stream.pipe(res);
      }
    }

  // ── 4. API KINHTHÁNH 73 SÁCH AVAILABILITY PER BOOK ─────────────────
  } else if (req.method === 'GET' && pathname === '/api/bible-audio-availability') {
    if (!checkRateLimit(req, res, 'bible-availability', 30, 60000)) return;

    const rawBookId = (reqUrl.searchParams.get('bookId') || '').trim();
    const normalized = normalizeBibleBookId(rawBookId);

    if (!normalized) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Thiếu hoặc bookId không hợp lệ trong danh mục 73 sách' }));
      return;
    }

    const { canonicalId, codes } = normalized;
    const recognizedSet = new Set(codes);

    const availableChapters = [];
    for (const [trackId, entry] of trackRegistry.entries()) {
      if (entry.categoryKey === 'bible' || entry.relPath.startsWith('bible/')) {
        const match = entry.filename.match(/^([a-z0-9]+)_c(\d+)\.mp3$/i);
        if (match) {
          const fileBookCode = match[1].toLowerCase();
          const chapNum = parseInt(match[2], 10);
          if (recognizedSet.has(fileBookCode)) {
            availableChapters.push({ chapter: chapNum, trackId });
          }
        }
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      bookId: canonicalId,
      availableChapters
    }));

  // ── 5. API CHECK & RENDER AUDIO CHO STUDIO ────────────────────────
  } else if (req.method === 'POST' && pathname === '/api/check-audio') {
    if (!checkRateLimit(req, res, 'check', 60, 60000)) return;

    const contentType = req.headers['content-type'] || '';
    if (!contentType.toLowerCase().startsWith('application/json')) {
      res.writeHead(415, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Content-Type phải là application/json' }));
      return;
    }

    readBodyWithLimit(req, res, (buffer) => {
      try {
        const { ref = "", section = "r1", intro = null, music = null } = JSON.parse(buffer.toString());

        const musicFiles = {
          intro: 'liturgy_intro_v4.mp3',
          transition: 'reading_transition_v4.mp3',
          outro: 'liturgy_outro_v4.mp3',
        };
        if (musicFiles[music]) {
          const relPath = `music/${musicFiles[music]}`;
          const trackId = relPathToTrackMap.get(relPath);
          const foundEntry = trackId && trackRegistry.get(trackId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(foundEntry ? {
            exists: true,
            trackId: foundEntry.trackId,
            filename: foundEntry.filename,
            size_kb: foundEntry.sizeKb
          } : { exists: false }));
          return;
        }

        // r1.mp3/r2.mp3 là lời dẫn dùng chung, không phụ thuộc trích dẫn.
        if (intro === 'r1' || intro === 'r2') {
          const relPath = `readings/${intro}.mp3`;
          const trackId = relPathToTrackMap.get(relPath);
          const foundEntry = trackId && trackRegistry.get(trackId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(foundEntry ? {
            exists: true,
            trackId: foundEntry.trackId,
            filename: foundEntry.filename,
            size_kb: foundEntry.sizeKb
          } : { exists: false }));
          return;
        }

        let cleanRef = getCanonicalSlug(ref);
        const legacyCleanRef = getLegacySlug(ref);

        if (!cleanRef) cleanRef = "custom_audio";

        const searchList = section === "gospel"
          ? [{ relPath: `gospels/${cleanRef}.mp3` }]
          : [
              // Cấu trúc chuẩn: một file nội dung cho mỗi ref, R1/R2 dùng chung.
              { relPath: `readings/${cleanRef}.mp3` },
              // Tương thích tạm thời với kho audio cũ trong lúc render lại file mới.
              { relPath: `readings/r1/r1_${legacyCleanRef}.mp3` },
              { relPath: `readings/r2/r2_${legacyCleanRef}.mp3` }
            ];

        let foundEntry = null;
        for (const item of searchList) {
          const relPath = item.relPath;
          const trackId = relPathToTrackMap.get(relPath);
          if (trackId && trackRegistry.has(trackId)) {
            foundEntry = trackRegistry.get(trackId);
            break;
          }
        }

        if (foundEntry) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            exists: true,
            trackId: foundEntry.trackId,
            filename: foundEntry.filename,
            size_kb: foundEntry.sizeKb
          }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ exists: false }));
        }
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });

  } else if (req.method === 'POST' && pathname === '/api/upload-voice') {
    if (!checkRateLimit(req, res, 'upload', 10, 60000)) return;

    const contentType = req.headers['content-type'] || '';
    if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
      res.writeHead(415, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Content-Type phải là multipart/form-data' }));
      return;
    }

    readBodyWithLimit(req, res, (buffer) => {
      try {
        const boundaryMatch = contentType.match(/boundary=(.+)/);
        if (!boundaryMatch) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Thiếu boundary trong Content-Type' }));
          return;
        }

        const parts = parseMultipart(buffer, boundaryMatch[1]);
        const filePart = parts.find(p => p.name === 'voice_file' && p.filename);

        if (!filePart) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Không tìm thấy file giọng mẫu trong request' }));
          return;
        }

        const originalName = filePart.filename || '';
        const ext = path.extname(originalName).toLowerCase();
        if (!ALLOWED_AUDIO_EXTENSIONS.has(ext)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Định dạng file ${ext || 'không xác định'} không được phép.` }));
          return;
        }

        if (originalName.includes('/') || originalName.includes('..') || originalName.includes('\\')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Tên file chứa ký tự không an toàn' }));
          return;
        }

        const safeName = originalName.replace(/[^a-zA-Z0-9._\-\s]/g, '').replace(/\s+/g, '_');
        const destPath = path.join(CUSTOM_VOICES_DIR, safeName);
        fs.writeFileSync(destPath, filePart.data);

        // Re-scan registry sau khi upload để tạo trackId mới
        scanPrivateAudioRegistry();

        const relPath = `custom_voices/${safeName}`;
        const trackId = relPathToTrackMap.get(relPath);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          trackId,
          filename: safeName
        }));
      } catch (err) {
        console.error('❌ Upload Error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });

  } else if (req.method === 'POST' && pathname === '/api/render-audio') {
    if (!checkRateLimit(req, res, 'render', 10, 60000)) return;

    req.setTimeout(0);
    res.setTimeout(0);

    const contentType = req.headers['content-type'] || '';
    if (!contentType.toLowerCase().startsWith('application/json')) {
      res.writeHead(415, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Content-Type phải là application/json' }));
      return;
    }

    readBodyWithLimit(req, res, async (buffer) => {
      try {
        const data = JSON.parse(buffer.toString());
        const {
          ref = "Bai_Doc_Tu_Chinh",
          intro = "",
          content = "",
          voice = "hao",
          section = "r1",
          section_label = "",
          overwrite = true,
          custom_voice_track_id = null,
          pause_config = {}
        } = data;

        const paragraphPause = pause_config.paragraph ?? 0.60;
        const sentencePause = pause_config.sentence ?? 0.45;
        const majorPause = pause_config.major ?? 0.30;
        const mediumPause = pause_config.medium ?? 0.25;

        if (!content || !content.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Nội dung bài đọc không được để trống' }));
          return;
        }

        let resolvedVoicePath = '';
        if (voice === 'custom') {
          if (!custom_voice_track_id || typeof custom_voice_track_id !== 'string') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Thiếu custom_voice_track_id cho giọng đọc tùy chỉnh' }));
            return;
          }

          const voiceEntry = trackRegistry.get(custom_voice_track_id);
          if (!voiceEntry || !voiceEntry.relPath.startsWith('custom_voices/') || !fs.existsSync(voiceEntry.absPath)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'custom_voice_track_id không hợp lệ hoặc không thuộc thư mục custom_voices' }));
            return;
          }

          resolvedVoicePath = voiceEntry.absPath;
        }

        let outSubfolder = "readings";
        let prefix = "";

        if (section === "r2") {
        } else if (section === "gospel" || (voice === "trieu_duong" && section !== "r1" && section !== "r2")) {
          outSubfolder = "gospels";
          prefix = "";
        }

        let cleanRef = getCanonicalSlug(ref);

        if (!cleanRef) cleanRef = "custom_audio";
        const filename = prefix ? `${prefix}_${cleanRef}.mp3` : `${cleanRef}.mp3`;
        const outAbsPath = path.join(AUDIO_PRIVATE_ROOT, outSubfolder, filename);
        const relPath = `${outSubfolder}/${filename}`;

        if (!overwrite && fs.existsSync(outAbsPath)) {
          scanPrivateAudioRegistry();
          const trackId = relPathToTrackMap.get(relPath);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            existing: true,
            trackId,
            filename,
            message: "File audio đã tồn tại sẵn trong hệ thống!"
          }));
          return;
        }

        const payload = {
          ref,
          intro,
          content,
          out_path: outAbsPath,
          section_label,
          num_step: 16,
          use_cpu: false,
          overwrite,
          custom_voice_path: resolvedVoicePath || null,
          paragraph_break: paragraphPause,
          sentence_break: sentencePause,
          major_break: majorPause,
          medium_break: mediumPause
        };

        const payloadStr = JSON.stringify(payload);
        const reqOpts = {
          hostname: '127.0.0.1',
          port: 5006,
          path: '/',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payloadStr)
          },
          timeout: 0
        };

        await new Promise((resolve, reject) => {
          const daemonReq = http.request(reqOpts, (daemonRes) => {
            let resData = '';
            daemonRes.on('data', chunk => resData += chunk);
            daemonRes.on('end', () => {
              try {
                const resJson = JSON.parse(resData);
                if (daemonRes.statusCode !== 200 || !resJson.success) {
                  reject(new Error(resJson.error || "OmniVoice Daemon trả về lỗi"));
                } else {
                  resolve(resJson);
                }
              } catch(e) {
                reject(new Error("Phản hồi từ Daemon không hợp lệ"));
              }
            });
          });

          daemonReq.on('error', reject);
          daemonReq.write(payloadStr);
          daemonReq.end();
        });

        // Re-scan registry để có trackId mới
        scanPrivateAudioRegistry();
        const trackId = relPathToTrackMap.get(relPath);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          trackId,
          filename
        }));
      } catch (err) {
        console.error(`❌ [RENDER ERROR]:`, err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });

  } else if (req.method === 'GET' && (pathname === '/' || pathname === '/api/status')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>Protected Audio Server</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-h: 100vh; height: 100vh; margin: 0; text-align: center; }
          .card { background: #1e293b; padding: 2.5rem; border-radius: 1.5rem; border: 1px solid #334155; max-width: 480px; shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
          h1 { color: #f59e0b; font-size: 1.5rem; margin-top: 0; }
          p { color: #94a3b8; font-size: 0.95rem; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🛡️ Protected Audio Server API</h1>
          <p>Server Backend Bảo Vệ Audio đang hoạt động tại cổng <strong>${PORT}</strong>.</p>
        </div>
      </body>
      </html>
    `);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\nℹ️ Audio Server đã đang chạy tại http://127.0.0.1:${PORT}!\n`);
    process.exit(0);
  } else {
    console.error('❌ Server Error:', err);
  }
});

server.timeout = 15000;
server.keepAliveTimeout = 5000;

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Protected Audio Server đang chạy tại http://127.0.0.1:${PORT}`);
});
