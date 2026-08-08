import { useState, useEffect, useRef, useCallback } from 'react';
import { checkAndGetAudioStreamUrl } from '../utils/audioLookup.js';
import { cleanScriptureTextOnUI, cleanScriptureTextForTTS } from '../utils/scriptureCleaner.js';

export function useLiturgyTTS() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSection, setCurrentSection] = useState(null);
  const [rate, setRateState] = useState(1);
  
  const audioObjRef = useRef(null);
  const playTokenRef = useRef(0);
  const playlistItemsRef = useRef([]);
  const playlistIndexRef = useRef(0);

  // Dừng tất cả âm thanh (cả MP3 Signed Stream & Web Speech Synthesis)
  const stop = useCallback(() => {
    playTokenRef.current += 1;
    playlistItemsRef.current = [];
    playlistIndexRef.current = 0;

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
    
    let matchedAudioUrl = null;
    if (refString) {
      const accessObj = await checkAndGetAudioStreamUrl(refString, prefix);
      if (accessObj && accessObj.exists && accessObj.streamUrl) {
        matchedAudioUrl = accessObj.streamUrl;
      }
    }

    if (currentToken !== playTokenRef.current) return;

    if (matchedAudioUrl) {
      const audio = new Audio();
      audio.preload = 'none';
      audio.src = matchedAudioUrl;
      audio.playbackRate = rate;
      audioObjRef.current = audio;

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
        if (currentToken === playTokenRef.current) {
          audioObjRef.current = null;
          setIsPlaying(false);
          setIsPaused(false);
          setCurrentSection(null);
        }
      };

      audio.onerror = () => {
        speakWithWebSpeech(text, sectionTitle);
      };

      audio.play().catch(() => {
        speakWithWebSpeech(text, sectionTitle);
      });
    } else {
      speakWithWebSpeech(text, sectionTitle);
    }
  }, [rate, stop]);

  const playPlaylist = useCallback((items) => {
    stop();
    if (!items || items.length === 0) return;

    const currentToken = playTokenRef.current;
    playlistItemsRef.current = items;
    playlistIndexRef.current = 0;

    const playNext = async (index) => {
      if (currentToken !== playTokenRef.current) return;

      if (index >= playlistItemsRef.current.length) {
        stop();
        return;
      }

      playlistIndexRef.current = index;
      const currentItem = playlistItemsRef.current[index];
      let matchedAudioUrl = null;

      if (currentItem.ref) {
        const accessObj = await checkAndGetAudioStreamUrl(currentItem.ref, currentItem.prefix || 'r1');
        if (accessObj && accessObj.exists && accessObj.streamUrl) {
          matchedAudioUrl = accessObj.streamUrl;
        }
      }

      if (currentToken !== playTokenRef.current) return;

      if (matchedAudioUrl) {
        const audio = new Audio();
        audio.preload = 'none';
        audio.src = matchedAudioUrl;
        audio.playbackRate = rate;
        audioObjRef.current = audio;

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
          if (currentToken === playTokenRef.current) {
            audioObjRef.current = null;
            playNext(index + 1);
          }
        };

        audio.onerror = () => {
          if (currentToken === playTokenRef.current) {
            speakWithWebSpeech(currentItem.text || currentItem.title, currentItem.title, () => playNext(index + 1));
          }
        };

        audio.play().catch(() => {
          if (currentToken === playTokenRef.current) {
            speakWithWebSpeech(currentItem.text || currentItem.title, currentItem.title, () => playNext(index + 1));
          }
        });
      } else {
        speakWithWebSpeech(currentItem.text || currentItem.title, currentItem.title, () => playNext(index + 1));
      }
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
