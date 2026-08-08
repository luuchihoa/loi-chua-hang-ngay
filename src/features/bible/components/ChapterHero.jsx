import React from 'react';
import { Share2 } from 'lucide-react';

export function BookHero({ book }) {
  return (
    <header className="reader-book-hero px-4 pt-7 sm:px-8 sm:pt-10 md:px-12">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex min-h-7 items-center rounded-full border border-amber-200/80 bg-amber-50/80 px-3.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-amber-900 shadow-xs dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
          {book.testament === 'old' ? 'Cựu Ước' : 'Tân Ước'} <span className="mx-1.5 text-amber-400">·</span> {book.category}
        </span>
        <h1 className="reader-book-title mt-3 text-3xl font-bold tracking-[-0.035em] text-stone-950 dark:text-stone-50 sm:text-4xl md:text-5xl">
          {book.name}
        </h1>
        <div className="mx-auto mt-4 flex max-w-40 items-center gap-3 text-amber-600/60" aria-hidden="true">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-500/50" />
          <span className="text-[10px]">✦</span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-500/50" />
        </div>
      </div>
    </header>
  );
}

export function ChapterMeta({ book, chapter, isLoading, title, onShare }) {
  const progress = Math.round((chapter / book.chapters) * 100);
  return (
    <div className="reader-chapter-meta mx-auto max-w-2xl text-center">
      <div className="flex items-center justify-center gap-2">
        <h2 className="min-h-7 font-serif text-base font-semibold italic text-stone-700 dark:text-stone-300 sm:text-lg" aria-live="polite">
          Chương {chapter}{title ? `: ${title}` : ''}
        </h2>
        {isLoading && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-600" aria-label="Đang tải chương" />}
      </div>

      <div className="mx-auto mt-3 max-w-xs" aria-label={`Đã đọc đến ${progress}% sách ${book.name}`}>
        <div className="reader-progress-labels mb-1.5 flex justify-between text-[9px] font-bold uppercase tracking-wider text-stone-400">
          <span>{chapter}/{book.chapters}</span>
          <span>{progress}%</span>
        </div>
        <div className="reader-progress-track h-1 overflow-hidden rounded-full bg-stone-200/80 dark:bg-stone-800">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-700 to-amber-400 transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <button
        type="button"
        onClick={onShare}
        className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-[11px] font-semibold text-stone-500 transition-colors hover:bg-stone-100 hover:text-amber-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-amber-300"
        aria-label={`Chia sẻ ${book.name} chương ${chapter}`}
      >
        <Share2 size={13} />
        <span>Chia sẻ chương</span>
      </button>
    </div>
  );
}
