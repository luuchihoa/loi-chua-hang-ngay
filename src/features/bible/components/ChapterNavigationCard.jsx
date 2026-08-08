import React from 'react';
import { ChevronLeft, ChevronRight, Headphones, Loader2, Bot } from 'lucide-react';

export default function ChapterNavigationCard({
  book,
  chapter,
  onPrevious,
  onNext,
  onPlayAudio,
  hasAudio,
  isAudioLoading,
}) {
  return (
    <div className="px-4 pb-8 pt-3 sm:px-6 md:px-8">
      <section className="reader-navigation-card mx-auto max-w-2xl overflow-hidden rounded-[28px] border border-amber-200/70 p-5 shadow-sm dark:border-amber-900/50 sm:p-6">
        <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">
          <div className="text-center sm:text-left">
            <span className="inline-flex rounded-full bg-amber-100/80 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-amber-800 dark:bg-amber-900/45 dark:text-amber-200">
              Hoàn thành chương {chapter}
            </span>
            <h3 className="mt-2 font-serif text-lg font-bold text-stone-950 dark:text-stone-100">
              {book.name} · {chapter}
            </h3>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              {chapter < book.chapters ? `Tiếp theo: Chương ${chapter + 1}` : 'Bạn đã đọc đến chương cuối'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button type="button" onClick={onPrevious} disabled={chapter <= 1} className="reader-nav-button" aria-label="Chương trước">
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              onClick={onPlayAudio}
              disabled={isAudioLoading}
              className={`reader-nav-button transition-all hover:scale-105 ${
                hasAudio
                  ? 'bg-amber-700 text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500 shadow-sm'
                  : 'bg-stone-800 text-stone-200 hover:bg-stone-700 dark:bg-stone-200 dark:text-stone-900 dark:hover:bg-white'
              }`}
              aria-label={hasAudio ? `Nghe bản thu Studio ${book.name} chương ${chapter}` : `Nghe bằng Giọng đọc AI ${book.name} chương ${chapter}`}
              title={hasAudio ? `Bản thu Studio MP3: ${book.name} chương ${chapter}` : `Giọng đọc AI (TTS): ${book.name} chương ${chapter}`}
            >
              {isAudioLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : hasAudio ? (
                <Headphones size={18} />
              ) : (
                <Bot size={18} />
              )}
            </button>

            {chapter < book.chapters ? (
              <button type="button" onClick={onNext} className="inline-flex min-h-12 items-center gap-1.5 rounded-2xl bg-amber-700 px-4 text-xs font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-amber-800 hover:shadow-md sm:text-sm">
                <span>Chương {chapter + 1}</span>
                <ChevronRight size={17} />
              </button>
            ) : (
              <span className="rounded-xl bg-stone-100 px-3 py-2 text-xs font-bold text-stone-400 dark:bg-stone-800">Hết sách</span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
