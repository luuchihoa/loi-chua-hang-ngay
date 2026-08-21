import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipForward, SkipBack, X, BookOpen, Moon, Clock, Check, RotateCcw, RotateCw, ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import { useFeedback } from '../../context/FeedbackContext.jsx';

/**
 * BibleAudioPlayer — Trình phát audio Kinh Thánh với Audio-Text Sync, Continuous Auto Play, Sleep Timer & MediaSession API.
 *
 * Props:
 *  - currentTrack: { title, subtitle, category, url, bookId, chapter }
 *  - onClose: () => void
 *  - verses: Array<{ num: number }> — danh sách câu của chương đang phát
 *  - onActiveVerse: (verseNum: number | null) => void
 *  - onTrackEnd: () => void — callback khi nghe xong chương để tự phát chương kế tiếp
 *  - onNextChapter: () => void — callback chuyển chương tiếp theo
 *  - onPrevChapter: () => void — callback lùi về chương trước
 */
export default function BibleAudioPlayer({
  currentTrack,
  onClose,
  verses = [],
  onActiveVerse,
  onTrackEnd,
  onNextChapter,
  onPrevChapter,
}) {
  const { openFeedback } = useFeedback();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
  // Sleep Timer State (minutes or 'chapter')
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState(null);
  const [isSleepModalOpen, setIsSleepModalOpen] = useState(false);
  const [sleepRemainingSeconds, setSleepRemainingSeconds] = useState(null);

  const audioRef = useRef(null);
  const sleepIntervalRef = useRef(null);

  // ── Load & Autoplay khi đổi track ──────────────────────────────
  useEffect(() => {
    if (currentTrack && audioRef.current) {
      audioRef.current.src = currentTrack.url;
      audioRef.current.load();
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.log('Audio autoplay prevented:', err));
    }
    onActiveVerse?.(null);
  }, [currentTrack]);

  // ── Lock Screen Controls (MediaSession API) ────────────────────
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title || 'Kinh Thánh Audio',
        artist: 'Lời Chúa Hằng Ngày',
        album: currentTrack.subtitle || currentTrack.category || 'Kinh Thánh Phụng Vụ',
        artwork: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current?.play();
        setIsPlaying(true);
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
        setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        onPrevChapter ? onPrevChapter() : skipTime(-10);
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        onNextChapter ? onNextChapter() : skipTime(10);
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime && audioRef.current) {
          audioRef.current.currentTime = details.seekTime;
          setCurrentTime(details.seekTime);
        }
      });
    } catch (e) {
      // Browser Unsupported MediaSession actions fallback
    }
  }, [currentTrack, onNextChapter, onPrevChapter]);

  // ── Sleep Timer Logic ──────────────────────────────────────────
  useEffect(() => {
    if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);

    if (typeof sleepTimerMinutes === 'number' && sleepTimerMinutes > 0) {
      setSleepRemainingSeconds(sleepTimerMinutes * 60);

      sleepIntervalRef.current = setInterval(() => {
        setSleepRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(sleepIntervalRef.current);
            audioRef.current?.pause();
            setIsPlaying(false);
            setSleepTimerMinutes(null);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setSleepRemainingSeconds(null);
    }

    return () => {
      if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
    };
  }, [sleepTimerMinutes]);

  // ── Audio-Text Sync ────────────────────────────────────────────
  const computeActiveVerse = useCallback((time, totalDuration) => {
    if (!verses.length || !totalDuration || totalDuration === 0) return null;
    const verseDuration = totalDuration / verses.length;
    const idx = Math.min(
      Math.floor(time / verseDuration),
      verses.length - 1
    );
    return verses[idx]?.num ?? null;
  }, [verses]);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const t = audioRef.current.currentTime;
    const d = audioRef.current.duration || 0;
    setCurrentTime(t);
    setDuration(d);

    const activeVerse = computeActiveVerse(t, d);
    onActiveVerse?.(activeVerse);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    onActiveVerse?.(null);

    // Sleep Timer: 'chapter' option -> pause on chapter end
    if (sleepTimerMinutes === 'chapter') {
      setSleepTimerMinutes(null);
      return;
    }

    // Continuous Auto Play: Auto play next chapter!
    if (onTrackEnd) {
      onTrackEnd();
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true));
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skipTime = (seconds) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(
        Math.max(audioRef.current.currentTime + seconds, 0),
        duration
      );
    }
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 0.8];
    const nextSpeed = speeds[(speeds.indexOf(playbackRate) + 1) % speeds.length];
    setPlaybackRate(nextSpeed);
    if (audioRef.current) audioRef.current.playbackRate = nextSpeed;
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs === 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentVerseNum = computeActiveVerse(currentTime, duration);
  const currentVerseIdx = verses.findIndex(v => v.num === currentVerseNum);

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl theme-invariant">
      <div className="bg-stone-900/97 backdrop-blur-2xl text-white p-3.5 sm:p-4.5 rounded-3xl border border-amber-500/35 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
        <audio
          ref={audioRef}
          preload="none"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleTimeUpdate}
          onEnded={handleEnded}
        />

        <div className="flex flex-col gap-2.5">
          {/* Track Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md transition-all ${
                isPlaying 
                  ? 'bg-gradient-to-tr from-amber-600 to-amber-400 shadow-amber-600/40' 
                  : 'bg-stone-700'
              }`}>
                <BookOpen size={19} />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold text-stone-100 flex items-center gap-2 min-w-0">
                  <span className="truncate min-w-0">{currentTrack.title || 'Kinh Thánh Audio'}</span>
                  {currentTrack.category && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] uppercase font-mono shrink-0">
                      {currentTrack.category}
                    </span>
                  )}
                </div>
                {/* Active Verse or Subtitle */}
                {isPlaying && currentVerseNum && verses.length > 0 ? (
                  <p className="text-[11px] font-semibold text-amber-400 truncate animate-pulse">
                    ▸ Câu {currentVerseNum}
                    {verses.length > 0 && (
                      <span className="text-stone-500 font-normal ml-1">
                        ({currentVerseIdx + 1}/{verses.length})
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-[11px] text-stone-400 truncate">
                    {currentTrack.subtitle || 'Audio phát trực tiếp'}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions (Speed, Sleep, Mute, Close) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => openFeedback({ category: 'audio', source: 'audio_player', reference: currentTrack.title || 'Kinh Thánh Audio', audioPositionSeconds: Math.round(currentTime) })}
                className="min-w-[38px] h-9 rounded-xl text-stone-400 hover:text-amber-300 transition-colors cursor-pointer flex items-center justify-center"
                title="Báo lỗi audio"
                aria-label="Báo lỗi audio đang phát"
              >
                <Flag size={16} />
              </button>
              {/* Sleep Timer Trigger */}
              <button
                type="button"
                onClick={() => setIsSleepModalOpen(!isSleepModalOpen)}
                className={`min-w-[38px] h-9 px-2 rounded-xl flex items-center justify-center gap-1 text-xs font-bold transition-colors cursor-pointer border ${
                  sleepTimerMinutes
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700'
                }`}
                title="Hẹn giờ tắt"
                aria-label="Hẹn giờ tắt audio"
              >
                <Moon size={14} />
                {sleepRemainingSeconds && (
                  <span className="text-[10px] font-mono text-amber-300">
                    {Math.ceil(sleepRemainingSeconds / 60)}m
                  </span>
                )}
              </button>

              {/* Speed Button */}
              <button
                type="button"
                onClick={cycleSpeed}
                className="min-w-[38px] h-9 px-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 font-mono text-xs font-bold border border-stone-700 transition-colors cursor-pointer flex items-center justify-center"
                title="Tốc độ phát"
                aria-label={`Tốc độ phát: ${playbackRate}x`}
              >
                {playbackRate}x
              </button>

              {/* Mute Button */}
              <button
                type="button"
                onClick={toggleMute}
                className="min-w-[38px] h-9 rounded-xl text-stone-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              >
                {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
              </button>

              {/* Close Player */}
              {onClose && (
                <button
                  type="button"
                  onClick={() => { onClose(); onActiveVerse?.(null); }}
                  className="min-w-[38px] h-9 rounded-xl text-stone-400 hover:text-rose-400 transition-colors cursor-pointer flex items-center justify-center"
                  title="Đóng trình phát"
                  aria-label="Đóng trình phát audio"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Sleep Timer Popup */}
          {isSleepModalOpen && (
            <div className="bg-stone-950/95 border border-stone-800 p-3 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-stone-400 font-medium flex items-center gap-1.5">
                <Clock size={13} className="text-amber-400" />
                Hẹn giờ tắt:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: 'Tắt', value: null },
                  { label: '15 phút', value: 15 },
                  { label: '30 phút', value: 30 },
                  { label: '45 phút', value: 45 },
                  { label: 'Hết chương', value: 'chapter' },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => {
                      setSleepTimerMinutes(opt.value);
                      setIsSleepModalOpen(false);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      sleepTimerMinutes === opt.value
                        ? 'bg-amber-600 text-white'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Verse Progress Indicators */}
          {verses.length > 0 && verses.length <= 30 && (
            <div className="flex items-center gap-0.5 px-1 py-0.5">
              {verses.map((v, idx) => {
                const isActive = v.num === currentVerseNum;
                const isPast = currentVerseIdx > idx;
                return (
                  <div
                    key={v.num}
                    className={`h-1 rounded-full flex-1 transition-all duration-300 ${
                      isActive 
                        ? 'bg-amber-400 scale-y-150' 
                        : isPast 
                          ? 'bg-amber-600/50' 
                          : 'bg-stone-700'
                    }`}
                  />
                );
              })}
            </div>
          )}

          {/* Timeline Slider with expanded touch area */}
          <div className="flex items-center gap-2 py-1">
            <span className="text-[10px] font-mono text-stone-400 w-9 text-right">{formatTime(currentTime)}</span>
            <div className="flex-1 relative flex items-center min-h-[32px]">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 bg-stone-700 accent-amber-500 rounded-lg cursor-pointer"
                aria-label="Thanh tua audio"
              />
            </div>
            <span className="text-[10px] font-mono text-stone-400 w-9">{formatTime(duration)}</span>
          </div>

          {/* Player Main Controls — Tách biệt nút tua ±10s với nút chuyển chương */}
          <div className="flex items-center justify-center gap-3 sm:gap-5 pt-0.5 pb-1">
            {/* Prev Chapter Button */}
            {onPrevChapter && (
              <button
                type="button"
                onClick={onPrevChapter}
                className="min-w-[40px] min-h-[40px] rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors flex items-center justify-center cursor-pointer"
                title="Chương trước"
                aria-label="Chương trước"
              >
                <ChevronLeft size={22} />
              </button>
            )}

            {/* Skip -10s Button */}
            <button
              type="button"
              onClick={() => skipTime(-10)}
              className="min-w-[40px] min-h-[40px] px-2 rounded-xl text-stone-300 hover:text-amber-400 hover:bg-stone-800 transition-colors text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
              title="Lùi 10 giây"
              aria-label="Lùi 10 giây"
            >
              <RotateCcw size={16} />
              <span className="text-[11px] font-mono font-bold">-10s</span>
            </button>

            {/* Play/Pause Button (w-12 h-12 = 48px Touch Target) */}
            <button
              type="button"
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold flex items-center justify-center shadow-lg shadow-amber-500/25 transition-transform active:scale-95 cursor-pointer"
              aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
            >
              {isPlaying 
                ? <Pause size={22} className="fill-current" /> 
                : <Play size={22} className="fill-current ml-0.5" />
              }
            </button>

            {/* Skip +10s Button */}
            <button
              type="button"
              onClick={() => skipTime(10)}
              className="min-w-[40px] min-h-[40px] px-2 rounded-xl text-stone-300 hover:text-amber-400 hover:bg-stone-800 transition-colors text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
              title="Tới 10 giây"
              aria-label="Tới 10 giây"
            >
              <span className="text-[11px] font-mono font-bold">+10s</span>
              <RotateCw size={16} />
            </button>

            {/* Next Chapter Button */}
            {onNextChapter && (
              <button
                type="button"
                onClick={onNextChapter}
                className="min-w-[40px] min-h-[40px] rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors flex items-center justify-center cursor-pointer"
                title="Chương tiếp theo"
                aria-label="Chương tiếp theo"
              >
                <ChevronRight size={22} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
