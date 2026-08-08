import { fetchAudioAccessStreamUrl } from './bibleService.js';

export const getAudioApiBase = () => {
  // Hỗ trợ tên cũ VITE_AUDIO_BASE_URL để các deploy R2 hiện có vẫn hoạt động.
  const base = import.meta.env.VITE_AUDIO_API_BASE || import.meta.env.VITE_AUDIO_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5005' : '');
  return base.replace(/\/+$/, '');
};

// Phải khớp với format_reading_filename() trong các script render Python.
// Ví dụ: "1 Ga 4,7-16" -> "1_Ga_47-16".
const formatRefForFilename = (refStr) => {
  if (!refStr) return '';
  return refStr
    .trim()
    .replace(/[\.,:;()\\/*?"<>|]/g, '')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
};

const getStaticAudioPath = (refString, section) => {
  const ref = formatRefForFilename(refString);
  if (!ref) return null;

  const normalizedSection = (section || 'r1').toLowerCase();
  if (normalizedSection === 'gospel') return `/gospels/gospel_${ref}.mp3`;
  if (normalizedSection === 'r2') return `/readings/r2/r2_${ref}.mp3`;
  return `/readings/r1/r1_${ref}.mp3`;
};

export const checkAndGetAudioStreamUrl = async (refString, section = 'r1') => {
  if (!refString) return { exists: false, streamUrl: null, trackId: null };
  const apiBase = getAudioApiBase();
  if (!apiBase) return { exists: false, streamUrl: null, trackId: null };

  const isStaticStorage = apiBase.includes('.r2.dev') || apiBase.includes('r2.cloudflarestorage.com') || (!apiBase.includes('localhost:5005') && !apiBase.includes('/api'));

  if (isStaticStorage) {
    const path = getStaticAudioPath(refString, section);
    if (!path) return { exists: false, streamUrl: null, trackId: null };

    // R2 không cung cấp API liệt kê object cho trình duyệt. Thay vì tải
    // audioManifest.json, web suy ra URL trực tiếp từ quy ước tên file.
    // Nếu object chưa tồn tại, Audio.onerror sẽ tự chuyển sang Web Speech.
    return {
      exists: true,
      streamUrl: `${apiBase}${path}`,
      trackId: `${section || 'r1'}:${refString}`
    };
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
