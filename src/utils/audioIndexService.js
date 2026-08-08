import { getBookById } from './bibleService.js';

let audioIndexCache = null;
let audioIndexPromise = null;

const STORAGE_KEY = 'lc_audio_index_cache';
const STORAGE_TIME_KEY = 'lc_audio_index_time';
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export const loadAudioIndex = async () => {
  if (audioIndexCache) return audioIndexCache;

  // Try loading from localStorage cache
  try {
    const cachedStr = localStorage.getItem(STORAGE_KEY);
    const cachedTime = localStorage.getItem(STORAGE_TIME_KEY);
    if (cachedStr && cachedTime && (Date.now() - Number(cachedTime) < CACHE_TTL)) {
      audioIndexCache = JSON.parse(cachedStr);
      return audioIndexCache;
    }
  } catch (e) {}

  if (!audioIndexPromise) {
    audioIndexPromise = fetch('/audio_index.json')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        audioIndexCache = data || { bible: [], liturgy: [] };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(audioIndexCache));
          localStorage.setItem(STORAGE_TIME_KEY, String(Date.now()));
        } catch (e) {}
        return audioIndexCache;
      })
      .catch(() => {
        audioIndexCache = { bible: [], liturgy: [] };
        return audioIndexCache;
      });
  }

  return await audioIndexPromise;
};

export const getAudioIndex = () => {
  return audioIndexCache || { bible: [], liturgy: [] };
};

export const hasBibleChapterAudio = (bookIdOrShort, chapter) => {
  if (!bookIdOrShort || !chapter) return false;
  const book = getBookById(bookIdOrShort);
  const shortCode = (book?.short || bookIdOrShort).toLowerCase().replace(/[^a-z0-9]/g, '');
  const key = `${shortCode}_${chapter}`;

  const index = getAudioIndex();
  if (Array.isArray(index.bible)) {
    return index.bible.includes(key);
  }
  return false;
};

export const hasLiturgyAudio = (refString, section = 'r1') => {
  if (!refString) return false;
  const cleanRef = refString.trim().replace(/[\.,:;()\\/*?"<>|]/g, '').replace(/\s+/g, '_');
  const sec = (section || 'r1').toLowerCase();
  const key = `${sec}_${cleanRef}`;

  const index = getAudioIndex();
  if (Array.isArray(index.liturgy)) {
    return index.liturgy.some(k => k.toLowerCase() === key.toLowerCase());
  }
  return false;
};
