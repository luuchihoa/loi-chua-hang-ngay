import React, { useEffect, useMemo, useRef } from 'react';
import { BookOpen, CalendarDays, ChevronRight, Search, Sparkles, X } from 'lucide-react';
import { getBookById } from '../../../utils/bibleService.js';
import { parseBibleReference } from '../utils/referenceParser.js';

// Maps liturgy color key → dot color class
const LITURGY_DOT = {
  green:  'bg-green-500',
  purple: 'bg-purple-500',
  red:    'bg-red-500',
  rose:   'bg-rose-400',
  white:  'bg-stone-300',
  amber:  'bg-amber-500',
};

// Tên các ngày trong tuần (Chủ nhật, Thứ Hai, ...)
const DAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

function BibleNavigationPanel({
  testament,
  setTestament,
  setSelectedBookId,
  setChapterNum,
  chapterNum,
  activeBook,
  filteredBooks,
  searchQuery,
  setSearchQuery,
  handleSelectBook,
  todayLiturgyInfo,
  liturgyAccent,
  liturgyColor,
  setIsMobileNavOpen,
  setSelectedVerses,
  setIsMultiSelect,
  allBooks,
  verseRefs,
  onNavigateToReference,
}) {
  const activeBookButtonRef     = useRef(null);
  const activeChapterButtonRef  = useRef(null);
  const bookListContainerRef    = useRef(null);
  const chapterGridContainerRef = useRef(null);

  const todayReference = useMemo(() => {
    const displayRef = todayLiturgyInfo.gospelRef || 'Mt 13, 54-58';
    return {
      displayRef,
      parsed: parseBibleReference(displayRef, allBooks) || { bookId: 'mat', chapter: 13, verse: 54 },
    };
  }, [todayLiturgyInfo, allBooks]);

  // Today's date label e.g. "Thứ Tư, 6/8/2026"
  const todayDateLabel = useMemo(() => {
    const now = new Date();
    const day = DAY_NAMES[now.getDay()];
    return `${day}, ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
  }, []);

  // Scroll active book into view within container
  useEffect(() => {
    const container = bookListContainerRef.current;
    const activeBtn = activeBookButtonRef.current;
    if (container && activeBtn) {
      const targetTop = activeBtn.offsetTop - container.clientHeight / 2 + activeBtn.offsetHeight / 2;
      container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
    }
  }, [activeBook.id, testament]);

  // Scroll active chapter into view within container
  useEffect(() => {
    const container = chapterGridContainerRef.current;
    const activeBtn = activeChapterButtonRef.current;
    if (container && activeBtn) {
      const targetLeft = activeBtn.offsetLeft - container.clientWidth / 2 + activeBtn.offsetWidth / 2;
      container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
    }
  }, [activeBook.id, chapterNum]);

  const openTodayReading = (event) => {
    event?.stopPropagation();
    const { bookId, chapter, verse } = todayReference.parsed;

    if (onNavigateToReference) {
      onNavigateToReference({ bookId, chapter, verse });
      return;
    }

    const targetBook = getBookById(bookId);
    if (targetBook) {
      setTestament(targetBook.testament || 'new');
      setSelectedBookId(targetBook.id);
      setChapterNum(chapter);
    }
    setIsMobileNavOpen(false);
    setSelectedVerses(verse ? [verse] : []);
    setIsMultiSelect(false);
    if (verse) {
      window.setTimeout(() => {
        verseRefs?.current?.[verse]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400);
    }
  };

  const liturgyDotClass = LITURGY_DOT[liturgyColor] || LITURGY_DOT.amber;

  return (
    <div className="relative flex h-full select-none flex-col overflow-hidden border-r border-stone-200/70 bg-[linear-gradient(180deg,#faf8f3_0%,#f3eee5_100%)] dark:border-stone-800 dark:bg-[linear-gradient(180deg,#1c1917_0%,#12100f_100%)]">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-300/15 blur-3xl dark:bg-amber-600/10" />

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="relative px-3 pb-2 pt-3">
        {/* Hàng tiện ích mỏng — chỉ hiện nút đóng trên mobile */}
        <div className="mb-2.5 flex items-center justify-between px-1 md:hidden">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400 dark:text-stone-500">
            Danh mục sách
          </span>
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(false)}
            aria-label="Đóng danh mục"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-200/70 text-stone-500 transition-colors hover:bg-stone-300 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700"
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        </div>

        {/* ── Testament tabs — điểm neo thị giác chính ─────────── */}
        <div className="relative grid grid-cols-2 gap-1 rounded-[20px] border border-stone-200/70 bg-stone-200/55 p-1 shadow-inner dark:border-stone-700/80 dark:bg-stone-950/70">
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.375rem)] rounded-2xl bg-white shadow-[0_5px_16px_-10px_rgba(28,25,23,.7)] ring-1 ring-stone-200/60 transition-transform duration-300 ease-out dark:bg-stone-800 dark:ring-stone-700 ${
              testament === 'old' ? 'translate-x-[calc(100%+0.25rem)]' : 'translate-x-0'
            }`}
          />
          {[
            { key: 'new', label: 'Tân Ước' },
            { key: 'old', label: 'Cựu Ước' },
          ].map((item) => {
            const isActive = testament === item.key;
            const count = allBooks.filter((b) => b.testament === item.key).length;
            return (
              <button
                key={item.key}
                onClick={() => setTestament(item.key)}
                aria-pressed={isActive}
                className={`relative z-10 flex h-11 items-center justify-center gap-1.5 rounded-2xl px-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-950 ${
                  isActive
                    ? 'text-stone-950 dark:text-white'
                    : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'
                }`}
              >
                <span className="text-[13px] font-black">{item.label}</span>
                <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[9px] font-black ${
                  isActive ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/55 dark:text-amber-200' : 'bg-stone-200/80 text-stone-500 dark:bg-stone-800'
                }`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Search ──────────────────────────────────────────────── */}
      <div className="relative px-3 pb-3">
        <label className="relative block">
          <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <span className="sr-only">Tìm sách Kinh Thánh</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm sách hoặc ký hiệu..."
            className="h-10 w-full rounded-[14px] border border-stone-200/80 bg-white/85 pl-9 pr-9 text-xs font-medium text-stone-900 shadow-sm outline-none transition-all placeholder:text-stone-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-400/10 dark:border-stone-700 dark:bg-stone-900/85 dark:text-stone-100 dark:focus:border-amber-600 dark:focus:bg-stone-900 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Xóa nội dung tìm kiếm"
              className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-stone-200/80 text-stone-500 transition-colors hover:bg-stone-300 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:bg-stone-700/80 dark:text-stone-400 dark:hover:bg-stone-600 dark:hover:text-stone-200"
            >
              <X size={11} strokeWidth={2.5} />
            </button>
          )}
        </label>
      </div>

      {/* ── Today's Reading Card ─────────────────────────────────── */}
      <div className="relative px-3 pb-3">
        <button
          onClick={openTodayReading}
          data-preserve-verse-selection="true"
          aria-label={`Mở bài đọc hôm nay: ${todayLiturgyInfo.displayName}`}
          className="group relative w-full overflow-hidden rounded-[22px] border border-amber-200/80 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:border-amber-800/40 dark:focus-visible:ring-offset-stone-950"
          style={{ background: 'linear-gradient(145deg, #fffbeb 0%, #fef3c7 55%, #fde68a 100%)' }}
        >
          {/* Dark mode overlay */}
          <div className="absolute inset-0 rounded-[22px] bg-[linear-gradient(145deg,rgba(69,26,3,.7),rgba(28,14,3,.85))] opacity-0 dark:opacity-100 pointer-events-none" />

          {/* Glow orb */}
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-300/40 blur-2xl dark:bg-amber-500/20" />

          <div className="relative p-3.5">
            {/* Top row: icon + eyebrow + live dot */}
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] bg-amber-700/90 text-white shadow-sm dark:bg-amber-400 dark:text-stone-950">
                  <CalendarDays size={15} />
                </span>
                <span className="flex items-center gap-1.5">
                  <Sparkles size={11} className="text-amber-700 dark:text-amber-300" />
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-amber-800 dark:text-amber-300">
                    Bài đọc hôm nay
                  </span>
                </span>
              </div>
              {/* Liturgy color dot */}
              <span className={`h-2 w-2 rounded-full shadow-sm ${liturgyDotClass} ring-2 ring-white/60 dark:ring-stone-900/60`} />
            </div>

            {/* Date badge */}
            <div className="mb-2">
              <span className="inline-block rounded-full border border-amber-300/60 bg-white/60 px-2 py-0.5 text-[9px] font-bold text-amber-900 dark:border-amber-700/40 dark:bg-stone-900/50 dark:text-amber-200">
                {todayDateLabel}
              </span>
            </div>

            {/* Season name */}
            <p className="mb-1 text-[12px] font-black leading-tight text-stone-900 dark:text-stone-100 line-clamp-2">
              {todayLiturgyInfo.displayName}
            </p>

            {/* Gospel reference */}
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-black tracking-tight text-amber-700 dark:text-amber-300">
                {todayReference.displayRef}
              </span>
              <ChevronRight
                size={16}
                className="shrink-0 text-amber-700/70 transition-transform group-hover:translate-x-0.5 dark:text-amber-400/70"
              />
            </div>
          </div>
        </button>
      </div>

      {/* ── Book List ────────────────────────────────────────────── */}
      <div className="relative flex min-h-0 flex-1 flex-col border-t border-stone-200/65 dark:border-stone-800/80">
        <div className="flex items-center justify-between px-4 pb-1.5 pt-2.5">
          <span className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400">Danh mục sách</span>
          <span className="text-[9px] font-bold text-stone-400">{filteredBooks.length} kết quả</span>
        </div>
        <div
          ref={bookListContainerRef}
          className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-2.5 pb-3 pt-0.5 [mask-image:linear-gradient(to_bottom,black,black_calc(100%-14px),transparent)]"
        >
          {filteredBooks.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-200/70 text-stone-400 dark:bg-stone-800 dark:text-stone-500">
                <Search size={16} />
              </span>
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">Không tìm thấy sách phù hợp</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="rounded-full px-2 py-1 text-[11px] font-bold text-amber-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-amber-400"
              >
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            filteredBooks.map((book) => {
              const isActive = activeBook.id === book.id;
              return (
                <button
                  key={book.id}
                  ref={isActive ? activeBookButtonRef : null}
                  onClick={() => handleSelectBook(book.id)}
                  title={book.name}
                  className={`group flex min-h-12 w-full items-center gap-2.5 rounded-[17px] px-2.5 py-1.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-900 ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-[0_10px_22px_-14px_rgba(180,83,9,.75)] dark:from-amber-400 dark:to-amber-500 dark:text-stone-950'
                      : 'text-stone-700 hover:bg-white/80 hover:shadow-sm dark:text-stone-300 dark:hover:bg-stone-800/80'
                  }`}
                >
                  <span className={`flex h-8 min-w-9 shrink-0 items-center justify-center whitespace-nowrap rounded-xl px-1.5 font-mono text-[10px] font-black tracking-tight ${
                    isActive
                      ? 'bg-black/15 text-white dark:bg-stone-950/15 dark:text-stone-950'
                      : 'bg-stone-200/75 text-stone-600 group-hover:bg-amber-100 group-hover:text-amber-800 dark:bg-stone-800 dark:text-stone-300 dark:group-hover:bg-amber-900/50 dark:group-hover:text-amber-200'
                  }`}>
                    {book.short}
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[12px] font-extrabold">{book.name}</span>
                    <span className={`mt-0.5 block truncate text-[8px] font-semibold ${isActive ? 'text-amber-50/90' : 'text-stone-400'}`}>{book.category}</span>
                  </span>
                  <ChevronRight size={14} className={`shrink-0 transition-all ${isActive ? 'text-white/80' : 'translate-x-1 text-stone-300 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 dark:text-stone-600'}`} />
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Chapter Selector ─────────────────────────────────────── */}
      <div className="relative bg-white/40 p-2.5 backdrop-blur-sm dark:bg-stone-950/30">
        <div className="rounded-[22px] border border-stone-200/80 bg-white/85 p-2.5 shadow-sm dark:border-stone-700/80 dark:bg-stone-900/90">
          <div className="mb-2 flex items-end justify-between gap-2 px-0.5">
            <span className="min-w-0">
              <span className="block text-[8px] font-extrabold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">Chọn chương</span>
              <span className="mt-0.5 block truncate text-[11px] font-black text-stone-900 dark:text-stone-100">{activeBook.name}</span>
            </span>
            <span className="shrink-0 rounded-full bg-stone-100 px-2 py-1 text-[9px] font-black tabular-nums text-stone-600 dark:bg-stone-800 dark:text-stone-300">
              {chapterNum}/{activeBook.chapters}
            </span>
          </div>
          <div className="mb-2 h-1 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
            <div
              className="h-full rounded-full bg-amber-500 transition-[width] duration-300"
              style={{ width: `${Math.round((chapterNum / activeBook.chapters) * 100)}%` }}
            />
          </div>
          <div
            ref={chapterGridContainerRef}
            className="scrollbar-thin grid grid-flow-col auto-cols-[36px] gap-1.5 overflow-x-auto pb-1 [mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-12px),transparent)]"
          >
            {Array.from({ length: activeBook.chapters }, (_, i) => i + 1).map((ch) => (
              <button
                key={ch}
                ref={chapterNum === ch ? activeChapterButtonRef : null}
                onClick={() => { setChapterNum(ch); setIsMobileNavOpen(false); setSelectedVerses([]); setIsMultiSelect(false); }}
                aria-label={`Chương ${ch}`}
                aria-current={chapterNum === ch ? 'page' : undefined}
                className={`h-8 rounded-xl font-mono text-[10px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-900 ${
                  chapterNum === ch
                    ? 'bg-amber-700 text-white shadow-md shadow-amber-800/25 ring-2 ring-amber-200 dark:bg-amber-400 dark:text-stone-950 dark:ring-amber-900'
                    : 'bg-stone-100/90 text-stone-600 hover:bg-amber-100 hover:text-amber-800 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-amber-900/45 dark:hover:text-amber-200'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(BibleNavigationPanel);