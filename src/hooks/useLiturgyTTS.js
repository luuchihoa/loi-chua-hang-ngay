import { useState, useEffect, useRef, useCallback } from 'react';
import { checkAndGetAudioStreamUrl, checkAndGetLiturgyMusicStreamUrl, checkAndGetReadingIntroStreamUrl } from '../utils/audioLookup.js';
import { cleanScriptureTextOnUI, cleanScriptureTextForTTS } from '../utils/scriptureCleaner.js';

const createPreloadedAudio = (url) => {
  const audio = new Audio();
  audio.preload = 'auto';
  audio.src = url;
  audio.load();
  return audio;
};

export function useLiturgyTTS() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSection, setCurrentSection] = useState(null);
  const [rate, setRateState] = useState(1);
  
  const audioObjRef = useRef(null);
  const playTokenRef = useRef(0);
  const playlistItemsRef = useRef([]);
  const playlistIndexRef = useRef(0);
  const preparedPlaylistRef = useRef(new Map());

  const clearPreparedTracks = () => {
    for (const prepared of preparedPlaylistRef.current.values()) {
      Promise.resolve(prepared).then(({ tracks = [] } = {}) => {
        tracks.forEach(({ audio }) => {
          if (!audio || audio === audioObjRef.current) return;
          audio.pause();
          audio.removeAttribute('src');
          audio.load();
        });
      }).catch(() => {});
    }
    preparedPlaylistRef.current.clear();
  };

  // Dừng tất cả âm thanh (cả MP3 Signed Stream & Web Speech Synthesis)
  const stop = useCallback(() => {
    playTokenRef.current += 1;
    playlistItemsRef.current = [];
    playlistIndexRef.current = 0;
    clearPreparedTracks();

    if (audioObjRef.current) {
      try {
        audioObjRef.current.onplay = null;
        audioObjRef.current.onended = null;
        audioObjRef.current.onerror = null;
        audioObjRef.current.pause();
        audioObjRef.current.removeAttribute('src');
        audioObjRef.current.load();
      } catch (e) {}
      audioObjRef.current = null;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }

    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSection(null);
  }, []);

  const pause = useCallback(() => {
    if (audioObjRef.current && isPlaying && !isPaused) {
      audioObjRef.current.pause();
      setIsPaused(true);
    } else if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isPlaying, isPaused]);

  const resume = useCallback(() => {
    if (audioObjRef.current && isPaused) {
      audioObjRef.current.play().catch(() => {});
      setIsPaused(false);
    } else if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [isPaused]);

  // Hàm phát bằng Web Speech Synthesis tiếng Việt làm phương án dự phòng
  const speakWithWebSpeech = (text, sectionTitle, onEndedCallback) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      stop();
      return;
    }

    try {
      window.speechSynthesis.cancel();
    } catch (e) {}

    const cleanText = cleanScriptureTextForTTS(text) || cleanScriptureTextOnUI(text);
    if (!cleanText) {
      stop();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'vi-VN';
    utterance.rate = rate;

    const applyVoiceAndSpeak = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        const viVoice = voices.find(v => v.lang.toLowerCase().includes('vi'));
        if (viVoice) utterance.voice = viVoice;
      } catch (e) {}

      utterance.onstart = () => {
        setIsPlaying(true);
        setIsPaused(false);
        setCurrentSection(`${sectionTitle}`);
      };

      utterance.onend = () => {
        if (onEndedCallback) {
          onEndedCallback();
        } else {
          stop();
        }
      };

      utterance.onerror = (err) => {
        if (err && (err.error === 'canceled' || err.error === 'interrupted')) {
          return;
        }
        console.warn('⚠️ Lỗi phát Web Speech TTS:', err);
        if (onEndedCallback) {
          onEndedCallback();
        } else {
          stop();
        }
      };

      window.speechSynthesis.speak(utterance);
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        applyVoiceAndSpeak();
      };
      // Vẫn gọi speak dự phòng nếu onvoiceschanged không trigger
      applyVoiceAndSpeak();
    } else {
      applyVoiceAndSpeak();
    }
  };

  const playAudioOrMp3 = useCallback(async (text, sectionTitle = 'Bài Đọc', refString = null, prefix = 'gospel') => {
    stop();
    const currentToken = playTokenRef.current;

    const tracks = [];
    // Bài đọc dùng lời dẫn chung r1.mp3/r2.mp3, sau đó mới tới file theo ref.
    if (prefix === 'r1' || prefix === 'r2') {
      const introAccess = await checkAndGetReadingIntroStreamUrl(prefix);
      if (introAccess?.exists && introAccess.streamUrl) tracks.push({ url: introAccess.streamUrl, kind: 'intro' });
    }
    if (refString) {
      const accessObj = await checkAndGetAudioStreamUrl(refString, prefix);
      if (accessObj && accessObj.exists && accessObj.streamUrl) {
        tracks.push({ url: accessObj.streamUrl, kind: 'content' });
      }
    }

    if (currentToken !== playTokenRef.current) return;

    tracks.forEach((track) => {
      track.audio = createPreloadedAudio(track.url);
    });

    const playTrack = (index) => {
      const track = tracks[index];
      if (!track) {
        // Không có file nội dung: dùng TTS từ nội dung của bài đọc.
        speakWithWebSpeech(text, sectionTitle);
        return;
      }

      const audio = track.audio || createPreloadedAudio(track.url);
      audio.playbackRate = rate;
      audioObjRef.current = audio;
      let trackSettled = false;

      audio.onplay = () => {
        if (currentToken !== playTokenRef.current) {
          audio.pause();
          return;
        }
        setIsPlaying(true);
        setIsPaused(false);
        setCurrentSection(`${sectionTitle}`);
      };

      audio.onended = () => {
        if (trackSettled) return;
        trackSettled = true;
        if (currentToken === playTokenRef.current) {
          audioObjRef.current = null;
          if (index + 1 < tracks.length) playTrack(index + 1);
          else if (track.kind === 'intro') {
            // Có lời dẫn nhưng chưa có file nội dung: vẫn đọc phần Kinh Thánh bằng TTS.
            speakWithWebSpeech(text, sectionTitle);
          } else {
            setIsPlaying(false);
            setIsPaused(false);
            setCurrentSection(null);
          }
        }
      };

      audio.onerror = () => {
        if (trackSettled) return;
        trackSettled = true;
        if (currentToken !== playTokenRef.current) return;
        // Thiếu lời dẫn không làm hỏng bài đọc; bỏ qua nó. Lỗi file nội dung
        // mới chuyển sang Web Speech.
        if (track.kind === 'intro') playTrack(index + 1);
        else speakWithWebSpeech(text, sectionTitle);
      };

      audio.play().catch(() => {
        if (trackSettled) return;
        trackSettled = true;
        if (currentToken !== playTokenRef.current) return;
        if (track.kind === 'intro') playTrack(index + 1);
        else speakWithWebSpeech(text, sectionTitle);
      });
    };

    playTrack(0);
  }, [rate, stop]);

  const playPlaylist = useCallback((items) => {
    stop();
    if (!items || items.length === 0) return;

    const currentToken = playTokenRef.current;
    playlistItemsRef.current = [
      { type: 'music', music: 'intro', title: 'Nhạc mở đầu' },
      ...items.flatMap((item, index) => (
        index === 0
          ? [item]
          : [{ type: 'music', music: 'transition', title: 'Nhạc chuyển đoạn' }, item]
      )),
      { type: 'music', music: 'outro', title: 'Nhạc kết' },
    ];
    playlistIndexRef.current = 0;

    const preparePlaylistItem = async (index) => {
      if (index >= playlistItemsRef.current.length) return { tracks: [], currentItem: null };
      const existing = preparedPlaylistRef.current.get(index);
      if (existing) return existing;

      const prepared = (async () => {
        const currentItem = playlistItemsRef.current[index];
        const tracks = [];

        if (currentItem.type === 'music') {
          const musicAccess = await checkAndGetLiturgyMusicStreamUrl(currentItem.music);
          if (musicAccess?.exists && musicAccess.streamUrl) tracks.push({ url: musicAccess.streamUrl, kind: 'music' });
        } else if (currentItem.prefix === 'r1' || currentItem.prefix === 'r2') {
          const introAccess = await checkAndGetReadingIntroStreamUrl(currentItem.prefix);
          if (introAccess?.exists && introAccess.streamUrl) tracks.push({ url: introAccess.streamUrl, kind: 'intro' });
        }

        if (currentItem.type !== 'music' && currentItem.ref) {
          const accessObj = await checkAndGetAudioStreamUrl(currentItem.ref, currentItem.prefix || 'r1');
          if (accessObj?.exists && accessObj.streamUrl) tracks.push({ url: accessObj.streamUrl, kind: 'content' });
        }

        if (currentToken !== playTokenRef.current) return { currentItem, tracks: [] };
        tracks.forEach((track) => {
          track.audio = createPreloadedAudio(track.url);
        });
        return { currentItem, tracks };
      })();

      preparedPlaylistRef.current.set(index, prepared);
      return prepared;
    };

    const playNext = async (index) => {
      if (currentToken !== playTokenRef.current) return;

      if (index >= playlistItemsRef.current.length) {
        stop();
        return;
      }

      playlistIndexRef.current = index;
      const { currentItem, tracks } = await preparePlaylistItem(index);

      if (currentToken !== playTokenRef.current) return;
      void preparePlaylistItem(index + 1);

      const playTrack = (trackIndex) => {
        const track = tracks[trackIndex];
        if (!track) {
          if (currentItem.type === 'music') {
            playNext(index + 1);
            return;
          }
          speakWithWebSpeech(currentItem.text || currentItem.title, currentItem.title, () => playNext(index + 1));
          return;
        }

        const audio = track.audio || createPreloadedAudio(track.url);
        audio.playbackRate = currentItem.type === 'music' ? 1 : rate;
        audioObjRef.current = audio;
        let trackSettled = false;

        audio.onplay = () => {
          if (currentToken !== playTokenRef.current) {
            audio.pause();
            return;
          }
          setIsPlaying(true);
          setIsPaused(false);
          setCurrentSection(`${currentItem.title}`);
        };

        audio.onended = () => {
          if (trackSettled) return;
          trackSettled = true;
          if (currentToken === playTokenRef.current) {
            audioObjRef.current = null;
            if (trackIndex + 1 < tracks.length) playTrack(trackIndex + 1);
            else if (track.kind === 'intro') {
              speakWithWebSpeech(currentItem.text || currentItem.title, currentItem.title, () => playNext(index + 1));
            } else playNext(index + 1);
          }
        };

        audio.onerror = () => {
          if (trackSettled) return;
          trackSettled = true;
          if (currentToken === playTokenRef.current) {
            if (track.kind === 'music') playNext(index + 1);
            else if (track.kind === 'intro') playTrack(trackIndex + 1);
            else speakWithWebSpeech(currentItem.text || currentItem.title, currentItem.title, () => playNext(index + 1));
          }
        };

        audio.play().catch(() => {
          if (trackSettled) return;
          trackSettled = true;
          if (currentToken === playTokenRef.current) {
            if (track.kind === 'music') playNext(index + 1);
            else if (track.kind === 'intro') playTrack(trackIndex + 1);
            else speakWithWebSpeech(currentItem.text || currentItem.title, currentItem.title, () => playNext(index + 1));
          }
        });
      };

      playTrack(0);
    };

    playNext(0);
  }, [rate, stop]);

  const changeRate = (newRate) => {
    setRateState(newRate);
    if (audioObjRef.current) {
      audioObjRef.current.playbackRate = newRate;
    }
  };

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isPlaying,
    isPaused,
    currentSection,
    rate,
    playAudioOrMp3,
    playPlaylist,
    pause,
    resume,
    stop,
    changeRate,
  };
}
