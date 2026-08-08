import { fetchAudioAccessStreamUrl } from './bibleService.js';

export const getAudioApiBase = () => {
  const base = import.meta.env.VITE_AUDIO_API_BASE || (import.meta.env.DEV ? 'http://localhost:5005' : '');
  return base.replace(/\/+$/, '');
};

export const checkAndGetAudioStreamUrl = async (refString, section = 'r1') => {
  if (!refString) return { exists: false, streamUrl: null, trackId: null };
  const apiBase = getAudioApiBase();

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
