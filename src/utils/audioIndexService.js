import { useState, useEffect } from 'react';
import { getBookById } from './bibleService.js';

const DEFAULT_INDEX = {
  version: '1.0.0',
  bible: ['st_1', 'mt_1', 'mt_2', 'mt_3', 'mt_4', 'mt_5', 'mc_1', 'lc_1', 'ga_1', 'ga_3'],
  liturgy: ['gospel_Mt_1331-35', 'gospel_Ga_1119-27', 'r1_1_Ga_47-16']
};

let audioIndexCache = DEFAULT_INDEX;
let audioIndexPromise = null;
const listeners = new Set();

const STORAGE_KEY = 'lc_audio_index_cache';
const STORAGE_TIME_KEY = 'lc_audio_index_time';
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// Load cached from localStorage immediately if available
try {
  const cachedStr = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  const cachedTime = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_TIME_KEY) : null;
  if (cachedStr && cachedTime && (Date.now() - Number(cachedTime) < CACHE_TTL)) {
    const parsed = JSON.parse(cachedStr);
    if (parsed && Array.isArray(parsed.bible)) {
      audioIndexCache = parsed;
    }
  }
} catch (e) {}

const notifyListeners = () => {
  listeners.forEach(fn => {
    try { fn(audioIndexCache); } catch (e) {}
  });
};

export const subscribeAudioIndex = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const loadAudioIndex = async () => {
  if (!audioIndexPromise) {
    audioIndexPromise = fetch('/audio_index.json')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data && Array.isArray(data.bible)) {
          audioIndexCache = data;
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(audioIndexCache));
            localStorage.setItem(STORAGE_TIME_KEY, String(Date.now()));
          } catch (e) {}
          notifyListeners();
        }
        return audioIndexCache;
      })
      .catch(() => audioIndexCache);
  }
  return await audioIndexPromise;
};

export const getAudioIndex = () => {
  return audioIndexCache || DEFAULT_INDEX;
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

export const useAudioIndex = () => {
  const [index, setIndex] = useState(() => getAudioIndex());
  useEffect(() => {
    loadAudioIndex().then(data => setIndex(data));
    return subscribeAudioIndex(setIndex);
  }, []);
  return index;
};
