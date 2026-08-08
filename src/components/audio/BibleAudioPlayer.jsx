import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipForward, SkipBack, X, BookOpen } from 'lucide-react';

/**
 * BibleAudioPlayer — Trình phát audio Kinh Thánh với tính năng Audio-Text Sync.
 *
 * Props:
 *  - currentTrack: { title, subtitle, category, url }
 *  - onClose: () => void
 *  - verses: Array<{ num: number }> — danh sách câu của chương đang phát (để tính sync)
 *  - onActiveVerse: (verseNum: number | null) => void — callback khi câu đang đọc thay đổi
 */
export default function BibleAudioPlayer({ currentTrack, onClose, verses = [], onActiveVerse }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);

  // Load & autoplay khi track mới
  useEffect(() => {
    if (currentTrack && audioRef.current) {
      audioRef.current.src = currentTrack.url;
      audioRef.current.load();
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.log('Audio autoplay prevented:', err));
    }
    // Reset active verse khi đổi track
    onActiveVerse?.(null);
  }, [currentTrack]);

  // Audio-Text Sync: tính câu đang đọc theo thời gian
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

    // Gọi callback để highlight câu đang đọc
    const activeVerse = computeActiveVerse(t, d);
    onActiveVerse?.(activeVerse);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    onActiveVerse?.(null);
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

  // Progress percentage cho progress bar visualizer
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Tính câu hiện tại để hiển thị trong player
  const currentVerseNum = computeActiveVerse(currentTime, duration);
  const currentVerseIdx = verses.findIndex(v => v.num === currentVerseNum);

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl">
      <div className="bg-stone-900/97 backdrop-blur-xl text-white p-3.5 sm:p-4 rounded-3xl border border-amber-500/30 shadow-2xl shadow-stone-950/80">
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
              {/* Animated waveform icon when playing */}
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-md transition-all ${
                isPlaying 
                  ? 'bg-gradient-to-tr from-amber-600 to-amber-400 shadow-amber-600/40' 
                  : 'bg-stone-700'
              }`}>
                <BookOpen size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-stone-100 flex items-center gap-2 min-w-0">
                  <span className="truncate min-w-0">{currentTrack.title || 'Kinh Thánh Audio'}</span>
                  {currentTrack.category && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] uppercase font-mono shrink-0">
                      {currentTrack.category}
                    </span>
                  )}
                </div>
                {/* Hiển thị câu đang đọc */}
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

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={cycleSpeed}
                className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 font-mono text-[11px] font-bold border border-stone-700 transition-colors cursor-pointer"
                title="Tốc độ phát"
                aria-label={`Tốc độ phát: ${playbackRate}x`}
              >
                {playbackRate}x
              </button>
              <button
                type="button"
                onClick={toggleMute}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white transition-colors cursor-pointer"
                aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              {onClose && (
                <button
                  type="button"
                  onClick={() => { onClose(); onActiveVerse?.(null); }}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Đóng trình phát"
                  aria-label="Đóng trình phát audio"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Verse Progress Indicators — mini dots */}
          {verses.length > 0 && verses.length <= 30 && (
            <div className="flex items-center gap-0.5 px-1">
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

          {/* Timeline Slider */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-stone-400 w-9 text-right">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1.5 bg-stone-700 accent-amber-500 rounded-lg cursor-pointer"
              aria-label="Thanh tua audio"
            />
            <span className="text-[10px] font-mono text-stone-400 w-9">{formatTime(duration)}</span>
          </div>

          {/* Player Controls */}
          <div className="flex items-center justify-center gap-4 pt-0.5">
            <button
              type="button"
              onClick={() => skipTime(-10)}
              className="text-stone-400 hover:text-white transition-colors text-xs font-semibold flex items-center gap-0.5 cursor-pointer"
              title="Lùi 10 giây"
              aria-label="Lùi 10 giây"
            >
              <SkipBack size={16} />
              <span>-10s</span>
            </button>

            <button
              type="button"
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold flex items-center justify-center shadow-lg shadow-amber-500/25 transition-transform active:scale-95 cursor-pointer"
              aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
            >
              {isPlaying 
                ? <Pause size={20} className="fill-current" /> 
                : <Play size={20} className="fill-current ml-0.5" />
              }
            </button>

            <button
              type="button"
              onClick={() => skipTime(10)}
              className="text-stone-400 hover:text-white transition-colors text-xs font-semibold flex items-center gap-0.5 cursor-pointer"
              title="Tới 10 giây"
              aria-label="Tới 10 giây"
            >
              <span>+10s</span>
              <SkipForward size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}