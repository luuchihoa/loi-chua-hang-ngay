import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Headphones, Loader2, Lock, Sparkles, CheckCircle2, BookOpenCheck } from 'lucide-react';

export default function ChapterNavigationCard({
  book,
  chapter,
  onPrevious,
  onNext,
  onPlayAudio,
  hasAudio,
  isAudioLoading,
}) {
  const [isCompleted, setIsCompleted] = useState(false);
  const progressPercent = Math.round((chapter / (book.chapters || 1)) * 100);

  // Load completion state from localStorage
  useEffect(() => {
    try {
      const savedKey = `bible_read_ch_${book.id}_${chapter}`;
      setIsCompleted(localStorage.getItem(savedKey) === 'true');
    } catch (e) {
      setIsCompleted(false);
    }
  }, [book.id, chapter]);

  const toggleCompleted = () => {
    const nextState = !isCompleted;
    setIsCompleted(nextState);
    try {
      const savedKey = `bible_read_ch_${book.id}_${chapter}`;
      if (nextState) {
        localStorage.setItem(savedKey, 'true');
      } else {
        localStorage.removeItem(savedKey);
      }
    } catch (e) {
      // Ignore storage errors
    }
  };

  return (
    <div className="px-4 pb-12 pt-4 sm:px-6 md:px-8">
      <section className="reader-navigation-card mx-auto max-w-2xl overflow-hidden rounded-[30px] border border-amber-300/60 bg-gradient-to-b from-amber-50/80 via-white to-amber-100/40 p-5 shadow-[0_16px_40px_-20px_rgba(180,83,9,0.18)] dark:border-amber-900/50 dark:from-stone-900 dark:via-stone-900 dark:to-amber-950/20 sm:p-7">
        
        {/* Card Header & Book Progress */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/50 pb-4 dark:border-amber-900/40">
            
            {/* Title & Badge */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-900 dark:bg-amber-900/50 dark:text-amber-200">
                  <Sparkles size={11} className="text-amber-600 dark:text-amber-400" />
                  Chương {chapter} / {book.chapters}
                </span>
                <span className="text-[11px] font-extrabold text-amber-700 dark:text-amber-400">
                  {progressPercent}% sách {book.name}
                </span>
              </div>

              <h3 className="mt-2 font-serif text-xl font-bold text-stone-950 dark:text-stone-100 flex items-center gap-2">
                <span>{book.name} · Chương {chapter}</span>
              </h3>
            </div>

            {/* Mark as Read Interactive Button */}
            <button
              type="button"
              onClick={toggleCompleted}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs ${
                isCompleted
                  ? 'theme-invariant bg-emerald-600 text-white shadow-emerald-900/20'
                  : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-amber-400 dark:hover:border-amber-600'
              }`}
            >
              {isCompleted ? (
                <>
                  <CheckCircle2 size={16} className="text-white" />
                  <span>Đã hoàn thành</span>
                </>
              ) : (
                <>
                  <BookOpenCheck size={16} className="text-amber-600 dark:text-amber-400" />
                  <span>Đánh dấu đã đọc</span>
                </>
              )}
            </button>
          </div>

          {/* Book Progress Bar */}
          <div className="w-full bg-stone-200/70 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-600 dark:bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Spiritual Prayer Quote */}
          <p className="text-center italic font-serif text-xs sm:text-sm text-stone-600 dark:text-stone-300 py-1">
            "Lời Chúa là ngọn đèn soi cho con bước, là ánh sáng chỉ đường con đi." <span className="not-italic text-[10px] font-sans font-bold text-amber-700 dark:text-amber-400">(Tv 119, 105)</span>
          </p>

          {/* Symmetrical Navigation Action Controls */}
          <div className="grid grid-cols-3 items-center gap-2 sm:gap-3 pt-1">
            
            {/* Prev Button */}
            <button
              type="button"
              onClick={onPrevious}
              disabled={chapter <= 1}
              className="flex min-h-[44px] items-center justify-center gap-1 sm:gap-1.5 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-3 text-xs font-bold text-stone-700 dark:text-stone-300 shadow-2xs transition-all hover:bg-stone-50 dark:hover:bg-stone-700 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              aria-label="Chương trước"
            >
              <ChevronLeft size={18} className="shrink-0" />
              <span className="truncate hidden min-[360px]:inline">Chương {chapter - 1}</span>
              <span className="min-[360px]:hidden">Trước</span>
            </button>

            {/* Audio Button */}
            <button
              type="button"
              onClick={onPlayAudio}
              disabled={isAudioLoading}
              className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl px-3 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer ${
                hasAudio
                  ? 'theme-invariant bg-amber-600 hover:bg-amber-700 text-white shadow-amber-900/20'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 border border-stone-200 dark:border-stone-700'
              }`}
              aria-label={hasAudio ? `Nghe MP3 ${book.name} chương ${chapter}` : `Chưa có MP3 ${book.name} chương ${chapter}`}
              title={hasAudio ? `Bản thu Studio MP3: ${book.name} chương ${chapter}` : `Chưa có bản thu MP3: ${book.name} chương ${chapter}`}
            >
              {isAudioLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : hasAudio ? (
                <>
                  <Headphones size={16} />
                  <span className="truncate hidden min-[360px]:inline">Nghe MP3</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span className="truncate hidden min-[360px]:inline">Chưa MP3</span>
                </>
              )}
            </button>

            {/* Next Button */}
            {chapter < book.chapters ? (
              <button
                type="button"
                onClick={onNext}
                className="flex min-h-[44px] items-center justify-center gap-1 sm:gap-1.5 rounded-2xl theme-invariant bg-amber-700 hover:bg-amber-800 text-white px-3 text-xs font-bold shadow-md shadow-amber-900/20 transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer"
              >
                <span className="truncate hidden min-[360px]:inline">Chương {chapter + 1}</span>
                <span className="min-[360px]:hidden">Sau</span>
                <ChevronRight size={18} className="shrink-0" />
              </button>
            ) : (
              <span className="flex min-h-[44px] items-center justify-center rounded-2xl bg-stone-100 dark:bg-stone-800 text-xs font-bold text-stone-400 dark:text-stone-500 border border-stone-200 dark:border-stone-700">
                Hết sách
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
