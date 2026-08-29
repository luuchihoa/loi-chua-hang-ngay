const CACHE_PREFIX = 'loi_chua_hang_ngay_cache_v6_';
const CACHE_TTL_DAYS = 7;

// Tắt cache khi chạy dev server (npm run dev) để dễ test dữ liệu mới
const IS_DEV = Boolean(import.meta?.env?.DEV);

/**
 * Xóa sạch toàn bộ cache bài đọc phụng vụ trong localStorage
 */
export function clearAllLiturgyCache() {
  try {
    if (typeof localStorage === 'undefined') return;
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('loi_chua_hang_ngay_cache_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (err) {
    console.warn("Lỗi khi xóa toàn bộ cache phụng vụ:", err);
  }
}

// Tự động dọn dẹp các bản cache cũ (v1, v2) khi người dùng truy cập phiên bản mới
try {
  if (typeof localStorage !== 'undefined') {
    const legacyKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('loi_chua_hang_ngay_cache_') && !key.startsWith(CACHE_PREFIX)) {
        legacyKeys.push(key);
      }
    }
    legacyKeys.forEach(k => localStorage.removeItem(k));
  }
} catch (e) {}

export function getLiturgyDateKey(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}_${month}_${day}`;
}

export function getCachedLiturgy(date, extraKey = '') {
  if (IS_DEV) return null; // Dev: luôn fetch mới, không đọc cache
  try {
    const dateKey = getLiturgyDateKey(date);
    if (!dateKey) return null;
    const fullKey = `${CACHE_PREFIX}${dateKey}${extraKey ? '_' + extraKey : ''}`;
    const raw = localStorage.getItem(fullKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.timestamp || !parsed.data) return null;

    const now = Date.now();
    if (now - parsed.timestamp > CACHE_TTL_DAYS * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(fullKey);
      return null;
    }
    return parsed.data;
  } catch (err) {
    return null;
  }
}

export function setCachedLiturgy(date, data, extraKey = '') {
  if (IS_DEV) return; // Dev: không lưu cache
  try {
    const dateKey = getLiturgyDateKey(date);
    if (!dateKey || !data) return;

    const fullKey = `${CACHE_PREFIX}${dateKey}${extraKey ? '_' + extraKey : ''}`;
    const payload = {
      timestamp: Date.now(),
      data: data
    };
    localStorage.setItem(fullKey, JSON.stringify(payload));
  } catch (err) {
    console.warn("Lỗi lưu cache phụng vụ:", err);
  }
}
