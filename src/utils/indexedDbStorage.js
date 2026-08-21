const DB_NAME = 'LoiChuaStudioDB';
const DB_VERSION = 1;
const STORE_DRAFTS = 'drafts';
const STORE_MEDIA = 'media';

/**
 * Mở hoặc khởi tạo IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        db.createObjectStore(STORE_DRAFTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_MEDIA)) {
        db.createObjectStore(STORE_MEDIA, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Lưu bản nháp vào IndexedDB (có fallback sang localStorage nếu lỗi)
 * @param {string} key
 * @param {any} data
 * @returns {Promise<boolean>}
 */
export async function saveStudioDraft(key, data) {
  const payload = {
    id: key,
    data,
    updatedAt: Date.now()
  };

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_DRAFTS, 'readwrite');
      const store = tx.objectStore(STORE_DRAFTS);
      const req = store.put(payload);

      req.onsuccess = () => resolve(true);
      req.onerror = () => {
        fallbackSetItem(`studio_draft_${key}`, payload);
        resolve(true);
      };
    });
  } catch (err) {
    fallbackSetItem(`studio_draft_${key}`, payload);
    return true;
  }
}

/**
 * Đọc bản nháp từ IndexedDB
 * @param {string} key
 * @returns {Promise<{data: any, updatedAt: number}|null>}
 */
export async function getStudioDraft(key) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_DRAFTS, 'readonly');
      const store = tx.objectStore(STORE_DRAFTS);
      const req = store.get(key);

      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result);
        } else {
          resolve(fallbackGetItem(`studio_draft_${key}`));
        }
      };
      req.onerror = () => {
        resolve(fallbackGetItem(`studio_draft_${key}`));
      };
    });
  } catch (err) {
    return fallbackGetItem(`studio_draft_${key}`);
  }
}

/**
 * Xóa bản nháp khỏi IndexedDB
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export async function deleteStudioDraft(key) {
  try {
    fallbackRemoveItem(`studio_draft_${key}`);
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_DRAFTS, 'readwrite');
      const store = tx.objectStore(STORE_DRAFTS);
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    return true;
  }
}

/**
 * Lưu file media (Blob / File) vào IndexedDB
 * @param {string} key
 * @param {Blob|File} blob
 * @param {object} metadata
 * @returns {Promise<boolean>}
 */
export async function saveMediaBlob(key, blob, metadata = {}) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MEDIA, 'readwrite');
      const store = tx.objectStore(STORE_MEDIA);
      const req = store.put({
        id: key,
        blob,
        metadata,
        updatedAt: Date.now()
      });
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Cannot save media blob to IndexedDB:', err);
    return false;
  }
}

/**
 * Lấy file media (Blob) từ IndexedDB
 * @param {string} key
 * @returns {Promise<{blob: Blob, metadata: object}|null>}
 */
export async function getMediaBlob(key) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_MEDIA, 'readonly');
      const store = tx.objectStore(STORE_MEDIA);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}

/**
 * Xóa file media khỏi IndexedDB
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export async function deleteMediaBlob(key) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_MEDIA, 'readwrite');
      const store = tx.objectStore(STORE_MEDIA);
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    return false;
  }
}

// ─── Helpers Fallback LocalStorage ──────────────────────────────────────────
function fallbackSetItem(key, val) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(val));
    }
  } catch (e) {}
}

function fallbackGetItem(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    }
  } catch (e) {}
  return null;
}

function fallbackRemoveItem(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch (e) {}
}
