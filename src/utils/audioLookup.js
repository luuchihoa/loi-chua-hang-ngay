import { fetchAudioAccessStreamUrl } from './bibleService.js';

let r2ManifestCache = null;
let r2ManifestFetching = null;

export const getAudioApiBase = () => {
  const base = import.meta.env.VITE_AUDIO_API_BASE || (import.meta.env.DEV ? 'http://localhost:5005' : '');
  return base.replace(/\/+$/, '');
};

const normalizeRefKey = (section, refStr) => {
  if (!refStr) return '';
  const cleanRef = refStr.toLowerCase().replace(/[^a-z0-9]/g, '');
  const prefix = (section || 'r1').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${prefix}${cleanRef}`;
};

export const checkAndGetAudioStreamUrl = async (refString, section = 'r1') => {
  if (!refString) return { exists: false, streamUrl: null, trackId: null };
  const apiBase = getAudioApiBase();
  if (!apiBase) return { exists: false, streamUrl: null, trackId: null };

  const isStaticStorage = apiBase.includes('.r2.dev') || apiBase.includes('r2.cloudflarestorage.com') || (!apiBase.includes('localhost:5005') && !apiBase.includes('/api'));

  if (isStaticStorage) {
    try {
      if (!r2ManifestCache) {
        if (!r2ManifestFetching) {
          r2ManifestFetching = Promise.all([
            fetch(`${apiBase}/audioManifest.json`).then(r => r.ok ? r.json() : null).catch(() => null),
            fetch(`${apiBase}/audio/audioManifest.json`).then(r => r.ok ? r.json() : null).catch(() => null)
          ]).then(([m1, m2]) => ({ ...(m1 || {}), ...(m2 || {}) }));
        }
        r2ManifestCache = await r2ManifestFetching;
        r2ManifestFetching = null;
      }

      if (r2ManifestCache) {
        const key = normalizeRefKey(section, refString);
        let relPath = r2ManifestCache[key];
        if (relPath) {
          // Chuẩn hóa đường dẫn khớp cấu trúc R2: audio/gospel, audio/readings/r1, audio/readings/r2
          if (!relPath.startsWith('http') && !relPath.startsWith('/audio/') && !relPath.startsWith('audio/')) {
            relPath = `/audio${relPath.startsWith('/') ? '' : '/'}${relPath}`;
          }
          // Chuẩn hóa /gospels/ thành /gospel/ nếu R2 lưu thư mục dạng audio/gospel
          relPath = relPath.replace('/audio/gospels/', '/audio/gospel/');

          const fullUrl = relPath.startsWith('http') ? relPath : `${apiBase}${relPath.startsWith('/') ? '' : '/'}${relPath}`;
          return { exists: true, streamUrl: fullUrl, trackId: key };
        }
      }
    } catch (e) {
      console.warn('⚠️ Lỗi nạp R2 Audio Manifest:', e.message);
    }
    return { exists: false, streamUrl: null, trackId: null };
  }

  try {
    const res = await fetch(`${apiBase}/api/check-audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: refString, section })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.exists && data.trackId) {
        const streamUrl = await fetchAudioAccessStreamUrl(data.trackId);
        return { exists: true, streamUrl, trackId: data.trackId };
      }
    }
  } catch (err) {
    console.warn('⚠️ Lỗi kiểm tra & lấy stream audio:', err.message);
  }

  return { exists: false, streamUrl: null, trackId: null };
};
