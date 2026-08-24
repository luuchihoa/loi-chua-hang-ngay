import { fetchAudioAccessStreamUrl } from './bibleService.js';
import { normalizeAudioRef, getGospelAudioFilename, getReadingAudioFilename } from './audioNaming.js';

export const getAudioApiBase = () => {
  // Hỗ trợ tên cũ VITE_AUDIO_BASE_URL để các deploy R2 hiện có vẫn hoạt động.
  const base = import.meta.env.VITE_AUDIO_API_BASE || import.meta.env.VITE_AUDIO_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5005' : '');
  return base.replace(/\/+$/, '');
};

// Phải khớp với format_reading_filename() trong các script render Python.
// Ví dụ: "1 Ga 4,7-16" -> "1_Ga_4v7_to_16".
export const formatRefForFilename = normalizeAudioRef;

const getStaticAudioPath = (refString, section) => {
  const ref = formatRefForFilename(refString);
  if (!ref) return null;

  const normalizedSection = (section || 'r1').toLowerCase();
  if (normalizedSection === 'gospel') return `/gospels/${getGospelAudioFilename(refString)}`;

  // Bài đọc 1 và 2 dùng chung một kho theo trích dẫn. Ví dụ cùng ref
  // "1 Cr 13,1-13" chỉ có một file: readings/1_Cr_131-13.mp3.
  return `/readings/${getReadingAudioFilename(refString)}`;
};

const getReadingIntroStaticPath = (section) => {
  const normalizedSection = (section || '').toLowerCase();
  return normalizedSection === 'r1' || normalizedSection === 'r2'
    ? `/readings/${normalizedSection}.mp3`
    : null;
};

const LITURGY_MUSIC_FILES = {
  intro: 'liturgy_intro_v3.mp3',
  transition: 'reading_transition_v3.mp3',
  outro: 'liturgy_outro_v3.mp3',
};

export const checkAndGetLiturgyMusicStreamUrl = async (music) => {
  const filename = LITURGY_MUSIC_FILES[music];
  const apiBase = getAudioApiBase();
  if (!filename || !apiBase) return { exists: false, streamUrl: null, trackId: null };

  const isStaticStorage = apiBase.includes('.r2.dev') || apiBase.includes('r2.cloudflarestorage.com') || (!apiBase.includes('localhost:5005') && !apiBase.includes('/api'));
  if (isStaticStorage) {
    return {
      exists: true,
      streamUrl: `${apiBase}/music/${filename}`,
      trackId: `music:${music}`,
    };
  }

  try {
    const res = await fetch(`${apiBase}/api/check-audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ music }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.exists && data.trackId) {
        return {
          exists: true,
          streamUrl: await fetchAudioAccessStreamUrl(data.trackId),
          trackId: data.trackId,
        };
      }
    }
  } catch (err) {
    console.warn('⚠️ Lỗi lấy nhạc phụng vụ:', err.message);
  }

  return { exists: false, streamUrl: null, trackId: null };
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

// r1.mp3 và r2.mp3 chỉ là lời dẫn chung "Bài đọc 1/2", không gắn với ref.
export const checkAndGetReadingIntroStreamUrl = async (section) => {
  const introPath = getReadingIntroStaticPath(section);
  if (!introPath) return { exists: false, streamUrl: null, trackId: null };

  const apiBase = getAudioApiBase();
  if (!apiBase) return { exists: false, streamUrl: null, trackId: null };

  const isStaticStorage = apiBase.includes('.r2.dev') || apiBase.includes('r2.cloudflarestorage.com') || (!apiBase.includes('localhost:5005') && !apiBase.includes('/api'));
  if (isStaticStorage) {
    return {
      exists: true,
      streamUrl: `${apiBase}${introPath}`,
      trackId: `reading-intro:${section}`
    };
  }

  try {
    const res = await fetch(`${apiBase}/api/check-audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intro: section })
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.exists && data.trackId) {
        return {
          exists: true,
          streamUrl: await fetchAudioAccessStreamUrl(data.trackId),
          trackId: data.trackId
        };
      }
    }
  } catch (err) {
    console.warn('⚠️ Lỗi lấy lời dẫn bài đọc:', err.message);
  }

  return { exists: false, streamUrl: null, trackId: null };
};
