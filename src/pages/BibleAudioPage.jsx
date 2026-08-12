import React, { useState, useMemo, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import {
  Play,
  Search,
  X,
  Radio,
  Lock,
  Loader2,
  Volume2,
  BookOpen,
  Headphones,
  BookMarked,
  Sparkles,
  Info,
  History,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import BibleAudioPlayer from '../components/audio/BibleAudioPlayer.jsx';
import {
  getAllBooks,
  fetchAudioAccessStreamUrl,
  getBibleAudioFilename,
} from '../utils/bibleService.js';
import { hasBibleChapterAudio, useAudioIndex } from '../utils/audioIndexService.js';

const RAW_AUDIO_API_BASE =
  import.meta.env.VITE_AUDIO_API_BASE ||
  import.meta.env.VITE_AUDIO_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:5005' : '');
const AUDIO_API_BASE = RAW_AUDIO_API_BASE.replace(/\/+$/, '');

const RECENT_STORAGE_KEY = 'bible_audio_recent_v1';
const RECENT_MAX = 6;

const TESTAMENT_TABS = [
  {
    id: 'old',
    label: 'Cựu Ước',
    count: 46,
    gradient: 'from-amber-600 to-orange-700',
    ringColor: 'ring-amber-400/60',
    chipActiveBg: 'bg-gradient-to-br from-amber-600 to-orange-700',
    icon: BookMarked,
  },
  {
    id: 'new',
    label: 'Tân Ước',
    count: 27,
    gradient: 'from-rose-600 to-red-700',
    ringColor: 'ring-rose-400/60',
    chipActiveBg: 'bg-gradient-to-br from-rose-600 to-red-700',
    icon: Sparkles,
  },
];

/* ── Local storage helpers cho "Tiếp tục nghe" ───────────────────────────── */
function loadRecent() {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function saveRecent(list) {
  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
  } catch {
    /* localStorage có thể bị chặn (chế độ riêng tư) — bỏ qua an toàn */
  }
}

/* ── Toast Component — Top-down position để không bị che bởi Player ──── */
function Toast({ toast, onDismiss }) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!toast) {
      setEntered(false);
      return;
    }
    setEntered(false);
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [toast]);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-20 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 transition-all duration-300 ease-out ${
        entered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <div className="relative flex overflow-hidden rounded-2xl border border-amber-200/70 dark:border-amber-800/40 bg-white/97 dark:bg-stone-900/97 backdrop-blur-md shadow-2xl">
        <span className="w-1 shrink-0 bg-gradient-to-b from-amber-400 to-orange-500" aria-hidden="true" />
        <div className="flex items-start gap-3 px-3.5 py-3 flex-1 min-w-0">
          <span className="mt-0.5 shrink-0 w-7 h-7 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
            <Info size={14} className="text-amber-600 dark:text-amber-400" />
          </span>
          <p className="text-sm leading-snug text-stone-700 dark:text-stone-200 flex-1 pt-0.5">{toast.message}</p>
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 -mr-0.5 p-1 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
            aria-label="Đóng thông báo"
          >
            <X size={14} />
          </button>
        </div>
        {/* Thanh đếm ngược — báo trước khi toast tự ẩn */}
        <div className="absolute bottom-0 left-1 right-0 h-0.5 bg-stone-100 dark:bg-stone-800 overflow-hidden">
          <div
            key={toast.id}
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 origin-left"
            style={{ animation: `bibleToastCountdown ${toast.duration}ms linear forwards` }}
          />
        </div>
      </div>
      <style>{`
        @keyframes bibleToastCountdown {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}

/* ── Dải cuộn ngang có fade cạnh + mũi tên, báo hiệu còn nội dung ẩn ─────── */
function EdgeFadeScroller({ children, className = '', innerRef }) {
  const fallbackRef = useRef(null);
  const ref = innerRef || fallbackRef;
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, [ref]);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [update, children]);

  const scrollBy = (dir) => ref.current?.scrollBy({ left: dir * 240, behavior: 'smooth' });

  return (
    <div className="relative">
      {canLeft && (
        <>
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-stone-900 to-transparent z-10" />
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Cuộn sang trái"
            className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow flex items-center justify-center text-stone-500 hover:text-stone-800 cursor-pointer"
          >
            <ChevronLeft size={13} />
          </button>
        </>
      )}
      <div ref={ref} className={className}>
        {children}
      </div>
      {canRight && (
        <>
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-stone-900 to-transparent z-10" />
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Cuộn sang phải"
            className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow flex items-center justify-center text-stone-500 hover:text-stone-800 cursor-pointer"
          >
            <ChevronRight size={13} />
          </button>
        </>
      )}
    </div>
  );
}

/* ── Toggle Cựu Ước / Tân Ước — pill trượt mượt phía sau nút đang chọn ───
   Trước đây mỗi nút tự đổi nền khi active nên lúc chuyển tab, màu "nhảy"
   tức thì từ nút này sang nút kia. Giờ có một pill nền dùng chung, đo vị
   trí + bề rộng nút đang chọn bằng ref (không dùng % cứng vì hai nhãn
   "Cựu Ước" / "Tân Ước" dài ngắn khác nhau và biến thể compact có thêm
   icon/số đếm), rồi trượt sang bằng transform — mượt và không lệch. */
function TestamentToggle({ active, onChange, variant = 'full' }) {
  const containerRef = useRef(null);
  const btnRefs = useRef({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  const measure = useCallback(() => {
    const btn = btnRefs.current[active];
    const container = containerRef.current;
    if (!btn || !container) return;
    const cRect = container.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    setIndicator({ left: bRect.left - cRect.left, width: bRect.width, ready: true });
  }, [active]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const isCompact = variant === 'compact';
  const activeGradient = TESTAMENT_TABS.find((t) => t.id === active)?.gradient;

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex gap-1 ${
        isCompact
          ? 'p-0.5 rounded-lg bg-white/15'
          : 'p-1 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15'
      }`}
    >
      {indicator.ready && (
        <span
          aria-hidden="true"
          className={`absolute pointer-events-none transition-all duration-300 ease-out ${
            isCompact ? 'top-0.5 bottom-0.5 rounded-md' : 'top-1 bottom-1 rounded-xl'
          } ${isCompact ? 'bg-white/25' : `bg-gradient-to-r ${activeGradient} shadow-lg`}`}
          style={{ transform: `translateX(${indicator.left}px)`, width: `${indicator.width}px` }}
        />
      )}
      {TESTAMENT_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              btnRefs.current[tab.id] = el;
            }}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-pressed={isActive}
            className={`relative z-10 flex items-center justify-center cursor-pointer font-semibold transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
              isCompact ? 'gap-1.5 px-2.5 py-1 rounded-md text-xs' : 'gap-2.5 px-5 py-2.5 rounded-xl text-sm'
            } ${isActive ? 'text-white' : 'text-white/60 hover:text-white'}`}
          >
            {!isCompact && <Icon size={15} aria-hidden="true" />}
            <span>{tab.label}</span>
            {!isCompact && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md transition-colors duration-300 ${
                  isActive ? 'bg-white/25 text-white' : 'bg-white/10 text-white/50'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function BibleAudioPage() {
  useAudioIndex();

  const allBibleBooks = useMemo(() => getAllBooks(), []);
  const [testamentFilter, setTestamentFilter] = useState('old');
  const [bibleSearchQuery, setBibleSearchQuery] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('st');
  const [currentTrack, setCurrentTrack] = useState(null);
  const [loadingTrackId, setLoadingTrackId] = useState(null);
  const [toast, setToast] = useState(null);
  const [recentPlays, setRecentPlays] = useState(() => loadRecent());
  const [isCompact, setIsCompact] = useState(false);

  const bookChipRef = useRef(null);
  const chapterScrollRef = useRef(null);
  const toastTimerRef = useRef(null);
  const sentinelRef = useRef(null);

  // Sửa lỗi gốc: timeout cũ không bị clear khi người dùng bấm liên tiếp
  // nhiều chương chưa có audio — toast trước có thể biến mất sai thời điểm.
  // `id` đổi mỗi lần gọi để thanh đếm ngược trong Toast luôn chạy lại từ đầu.
  const triggerToast = useCallback((msg, duration = 4000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now(), message: msg, duration });
    toastTimerRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const filteredBibleBooks = useMemo(() => {
    const query = bibleSearchQuery.trim().toLowerCase();
    return allBibleBooks.filter((book) => {
      const matchesTestament = book.testament === testamentFilter;
      const matchesSearch =
        !query ||
        book.name.toLowerCase().includes(query) ||
        book.short.toLowerCase().includes(query) ||
        (book.category || '').toLowerCase().includes(query);
      return matchesTestament && matchesSearch;
    });
  }, [allBibleBooks, testamentFilter, bibleSearchQuery]);

  const selectedBook = useMemo(() => {
    const found = allBibleBooks.find((b) => b.id === selectedBookId);
    if (found && found.testament === testamentFilter) return found;
    return filteredBibleBooks[0] || allBibleBooks[0];
  }, [allBibleBooks, selectedBookId, filteredBibleBooks, testamentFilter]);

  // Scroll selected book chip into view
  useEffect(() => {
    if (!bookChipRef.current || !selectedBook) return;
    const chip = bookChipRef.current.querySelector(`[data-book-id="${selectedBook.id}"]`);
    if (chip) chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedBook?.id]);

  // Thanh compact dính khi cuộn qua khỏi hero — giữ tìm kiếm + đổi giao ước
  // trong tầm tay thay vì buộc cuộn ngược lên đầu trang mỗi lần.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setIsCompact(!entry.isIntersecting), { threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const pushRecent = useCallback((bookId, chapNum) => {
    setRecentPlays((prev) => {
      const next = [{ bookId, chapter: chapNum }, ...prev.filter((r) => !(r.bookId === bookId && r.chapter === chapNum))].slice(
        0,
        RECENT_MAX
      );
      saveRecent(next);
      return next;
    });
  }, []);

  const handlePlayBibleChapter = useCallback(
    (chapNum, book) => {
      const targetBook = book || selectedBook;
      if (!targetBook) return;
      const isMp3Available = hasBibleChapterAudio(targetBook.id, chapNum);
      if (!isMp3Available) {
        triggerToast(`Chương ${chapNum} — ${targetBook.name} chưa có bản thu Studio MP3. Ban biên tập đang cập nhật dần!`);
        return;
      }

      const filename = getBibleAudioFilename(targetBook.id, chapNum);
      const trackId = `bible_${targetBook.id}_${chapNum}`;
      const isStaticStorage =
        AUDIO_API_BASE.includes('.r2.dev') ||
        AUDIO_API_BASE.includes('r2.cloudflarestorage.com');

      if (isStaticStorage) {
        setCurrentTrack({
          trackId,
          title: `${targetBook.name} · Chương ${chapNum}`,
          subtitle: `${targetBook.testament === 'old' ? 'Cựu Ước' : 'Tân Ước'} • ${targetBook.short}`,
          category: 'Kinh Thánh',
          url: `${AUDIO_API_BASE}/bible/${filename}`,
          filename,
          bookId: targetBook.id,
          chapter: chapNum,
        });
        pushRecent(targetBook.id, chapNum);
        return;
      }

      if (loadingTrackId) return;
      setLoadingTrackId(trackId);
      fetchAudioAccessStreamUrl(trackId)
        .then((signedUrl) => {
          if (signedUrl) {
            setCurrentTrack({
              trackId,
              title: `${targetBook.name} · Chương ${chapNum}`,
              subtitle: `${targetBook.testament === 'old' ? 'Cựu Ước' : 'Tân Ước'} • ${targetBook.short}`,
              category: 'Kinh Thánh',
              url: signedUrl,
              filename,
              bookId: targetBook.id,
              chapter: chapNum,
            });
            pushRecent(targetBook.id, chapNum);
          }
        })
        .finally(() => setLoadingTrackId(null));
    },
    [selectedBook, loadingTrackId, triggerToast, pushRecent]
  );

  const handleNextChapter = useCallback(() => {
    if (!selectedBook || !currentTrack) return;
    const currentChap = currentTrack.chapter || 1;
    if (currentChap < selectedBook.chapters) {
      handlePlayBibleChapter(currentChap + 1, selectedBook);
    }
  }, [selectedBook, currentTrack, handlePlayBibleChapter]);

  const handlePrevChapter = useCallback(() => {
    if (!selectedBook || !currentTrack) return;
    const currentChap = currentTrack.chapter || 1;
    if (currentChap > 1) {
      handlePlayBibleChapter(currentChap - 1, selectedBook);
    }
  }, [selectedBook, currentTrack, handlePlayBibleChapter]);

  const activeTabMeta = TESTAMENT_TABS.find((t) => t.id === testamentFilter);

  const availableCount = useMemo(() => {
    if (!selectedBook) return 0;
    let count = 0;
    for (let i = 1; i <= selectedBook.chapters; i++) {
      if (hasBibleChapterAudio(selectedBook.id, i)) count++;
    }
    return count;
  }, [selectedBook]);

  const handleTabSwitch = (tabId) => {
    setTestamentFilter(tabId);
    setBibleSearchQuery('');
    const first = allBibleBooks.find((b) => b.testament === tabId);
    if (first) setSelectedBookId(first.id);
  };

  const recentWithBooks = useMemo(
    () =>
      recentPlays
        .map((r) => ({ ...r, book: allBibleBooks.find((b) => b.id === r.bookId) }))
        .filter((r) => r.book),
    [recentPlays, allBibleBooks]
  );

  return (
    <main className="min-h-screen pb-40 font-sans">
      <style>{`
        @keyframes bibleContentFade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes biblePageEnter {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .bible-fade-card { animation: bibleContentFade 320ms ease-out; }
        .bible-enter-1 { animation: biblePageEnter 550ms ease-out both; }
        .bible-enter-2 { animation: biblePageEnter 550ms ease-out 90ms both; }
        .bible-enter-3 { animation: biblePageEnter 550ms ease-out 170ms both; }
        .bible-enter-4 { animation: biblePageEnter 550ms ease-out 250ms both; }
        .bible-enter-5 { animation: biblePageEnter 550ms ease-out 330ms both; }
        @media (prefers-reduced-motion: reduce) {
          .bible-fade-card,
          .bible-enter-1,
          .bible-enter-2,
          .bible-enter-3,
          .bible-enter-4,
          .bible-enter-5 {
            animation: none !important;
          }
        }
      `}</style>
      {/* ── STICKY COMPACT BAR — hiện khi cuộn qua khỏi hero ──────────────── */}
      <div
        className={`theme-invariant fixed top-0 left-0 right-0 z-40 transition-transform duration-300 ${
          isCompact ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className={`bg-gradient-to-r ${activeTabMeta?.gradient} shadow-lg`}>
          <div className="max-w-4xl mx-auto px-3 sm:px-6 py-2 flex items-center gap-2">
            <TestamentToggle active={testamentFilter} onChange={handleTabSwitch} variant="compact" />
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" size={13} />
              <input
                value={bibleSearchQuery}
                onChange={(e) => setBibleSearchQuery(e.target.value)}
                placeholder="Tìm sách…"
                aria-label="Tìm sách"
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/15 border border-white/20 text-white placeholder-white/50 text-xs focus:outline-none focus:bg-white/25"
              />
            </div>
            {selectedBook && (
              <span className="shrink-0 text-xs font-mono font-bold text-white/90 px-2 py-1 rounded-md bg-white/10">
                {selectedBook.short}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="theme-invariant relative overflow-hidden bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 px-4 pt-10 pb-36 sm:pb-40 sm:px-8">
          <div className="pointer-events-none absolute -top-20 -right-20 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 w-60 h-60 rounded-full bg-indigo-500/8 blur-3xl" />

          <div className="relative z-10 max-w-4xl mx-auto text-center space-y-4">
            <div className="bible-enter-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-white/80 text-[11px] font-semibold tracking-widest uppercase">
              <Headphones size={12} />
              <span>Thư Viện Audio Kinh Thánh</span>
            </div>
            <h1 className="bible-enter-2 text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight leading-tight">
              Lắng Nghe <span className="text-amber-400">Lời Chúa</span>
            </h1>
            <p className="bible-enter-3 text-sm text-stone-400 max-w-sm mx-auto">
              Bản thu Studio chất lượng cao từ 73 Sách Kinh Thánh Công Giáo
            </p>

            <div className="bible-enter-4 flex justify-center pt-2">
              <TestamentToggle active={testamentFilter} onChange={handleTabSwitch} variant="full" />
            </div>
          </div>
        </div>
        <div ref={sentinelRef} className="h-px" />

        <div className="relative z-10 -mt-28 max-w-4xl mx-auto px-3 sm:px-6 space-y-4">
          {recentWithBooks.length > 0 && (
            <div className="bible-enter-5 rounded-2xl border border-stone-200 dark:border-stone-700/80 bg-white dark:bg-stone-900 shadow-xl p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2 px-1">
                <History size={13} />
                Tiếp tục nghe
              </div>
              <EdgeFadeScroller className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                {recentWithBooks.map((r) => {
                  const trackId = `bible_${r.book.id}_${r.chapter}`;
                  const isActive = currentTrack?.trackId === trackId;
                  const isLoadingThis = loadingTrackId === trackId;
                  return (
                    <button
                      key={trackId}
                      type="button"
                      disabled={isLoadingThis}
                      onClick={() => {
                        setSelectedBookId(r.book.id);
                        setTestamentFilter(r.book.testament);
                        handlePlayBibleChapter(r.chapter, r.book);
                      }}
                      className={`shrink-0 flex items-center gap-2 pl-2 pr-3 py-2 rounded-xl border text-left cursor-pointer transition ${
                        isActive
                          ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30'
                          : 'border-stone-200 dark:border-stone-700 hover:border-amber-300'
                      }`}
                    >
                      <span className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
                        {isLoadingThis ? (
                          <Loader2 size={13} className="animate-spin text-stone-500" />
                        ) : isActive ? (
                          <Radio size={13} className="text-amber-500 animate-pulse" />
                        ) : (
                          <Play size={12} className="text-stone-500" />
                        )}
                      </span>
                      <span className="text-xs">
                        <div className="font-semibold text-stone-800 dark:text-stone-100 leading-none">
                          {r.book.short} {r.chapter}
                        </div>
                        <div className="text-[10px] text-stone-400 mt-0.5">{r.book.name}</div>
                      </span>
                    </button>
                  );
                })}
              </EdgeFadeScroller>
            </div>
          )}

          <div
            key={testamentFilter}
            className="bible-fade-card rounded-3xl border border-stone-200 dark:border-stone-700/80 bg-white dark:bg-stone-900 shadow-2xl overflow-hidden"
          >
            <div className={`theme-invariant bg-gradient-to-r ${activeTabMeta?.gradient} px-4 py-3`}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" size={14} />
                <input
                  type="text"
                  value={bibleSearchQuery}
                  onChange={(e) => setBibleSearchQuery(e.target.value)}
                  placeholder={`Tìm sách trong ${activeTabMeta?.label}…`}
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/15 backdrop-blur-sm border border-white/25 text-white placeholder-white/50 text-sm focus:outline-none focus:bg-white/25 transition"
                />
                {bibleSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setBibleSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-white/60 hover:text-white cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="px-3 py-3 border-b border-stone-100 dark:border-stone-800 bg-stone-50/40 dark:bg-stone-800/20">
              {filteredBibleBooks.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <BookOpen size={22} className="text-stone-300" />
                  <p className="text-sm text-stone-400">Không tìm thấy sách khớp với "{bibleSearchQuery}"</p>
                  <button
                    type="button"
                    onClick={() => setBibleSearchQuery('')}
                    className="text-xs font-semibold text-amber-600 hover:underline cursor-pointer"
                  >
                    Xóa tìm kiếm
                  </button>
                </div>
              ) : (
                <EdgeFadeScroller
                  innerRef={bookChipRef}
                  className="flex gap-2 overflow-x-auto scrollbar-none"
                >
                  <div className="flex gap-2" role="listbox" aria-label="Chọn sách Kinh Thánh">
                    {filteredBibleBooks.map((book) => {
                      const isSelected = selectedBook?.id === book.id;
                      const hasMp3 = (() => {
                        for (let i = 1; i <= book.chapters; i++) {
                          if (hasBibleChapterAudio(book.id, i)) return true;
                        }
                        return false;
                      })();
                      return (
                        <button
                          key={book.id}
                          data-book-id={book.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => setSelectedBookId(book.id)}
                          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 leading-none ${
                            isSelected
                              ? `${activeTabMeta?.chipActiveBg} text-white shadow-md`
                              : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-amber-300 dark:hover:border-amber-600 hover:text-amber-800 dark:hover:text-amber-300'
                          }`}
                        >
                          {hasMp3 && !isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          )}
                          {isSelected && <Volume2 size={12} className="shrink-0" />}
                          <span>{book.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </EdgeFadeScroller>
              )}
            </div>

            {selectedBook && (
              <>
                <div className="px-4 sm:px-5 py-4 border-b border-stone-100 dark:border-stone-800 bg-stone-50/30 dark:bg-stone-800/10">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold font-mono bg-gradient-to-br ${activeTabMeta?.gradient} text-white`}>
                          {selectedBook.short}
                        </span>
                        <h2 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">
                          Sách {selectedBook.name}
                        </h2>
                      </div>
                      <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
                        {selectedBook.category} · {selectedBook.testament === 'old' ? 'Cựu Ước' : 'Tân Ước'} · {selectedBook.chapters} chương
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-xl font-extrabold font-mono leading-none text-stone-900 dark:text-stone-100">
                        {availableCount}
                        <span className="text-xs font-normal text-stone-400">/{selectedBook.chapters}</span>
                      </div>
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                        {availableCount > 0 ? 'chương có MP3' : 'chưa có MP3'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 h-1.5 w-full bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${activeTabMeta?.gradient} transition-all duration-700`}
                      style={{ width: availableCount > 0 ? `${(availableCount / selectedBook.chapters) * 100}%` : '2%' }}
                    />
                  </div>
                </div>

                <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                      <span className="w-4 h-4 rounded-md bg-amber-100 dark:bg-amber-950/40 border border-amber-300/70 flex items-center justify-center">
                        <Play size={7} className="fill-amber-600 text-amber-600" />
                      </span>
                      Có MP3
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-stone-400 dark:text-stone-500">
                      <span className="w-4 h-4 rounded-md bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                        <Lock size={7} className="text-stone-300 dark:text-stone-600" />
                      </span>
                      Đang cập nhật
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 ml-auto font-medium">
                      <Radio size={9} className="animate-pulse" />
                      Chạm để nghe
                    </div>
                  </div>

                  <div
  ref={chapterScrollRef}
  className="grid gap-2.5 sm:gap-2 max-h-72 overflow-y-auto pr-1"
  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(2.75rem, 1fr))', gridAutoRows: '2.75rem' }}
  role="group"
  aria-label={`Chương sách ${selectedBook.name}`}
  aria-busy={Boolean(loadingTrackId)}
>
  {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((chapNum) => {
    const filename = getBibleAudioFilename(selectedBook.id, chapNum);
    const trackId = `bible_${selectedBook.id}_${chapNum}`;
    const isMp3Available = hasBibleChapterAudio(selectedBook.id, chapNum);
    const isPlayingThisChap = Boolean(
      currentTrack && (currentTrack.trackId === trackId || currentTrack.url?.includes(`/${filename}`))
    );
    const isLoadingThisChap = loadingTrackId === trackId;
    const isBlockedByOtherLoad = Boolean(loadingTrackId) && !isLoadingThisChap;

    return (
      <button
        key={chapNum}
        type="button"
        disabled={isLoadingThisChap || isBlockedByOtherLoad}
        aria-label={
          isMp3Available
            ? `Phát ${selectedBook.name} chương ${chapNum}`
            : `Chương ${chapNum} chưa có bản thu`
        }
        onClick={() => handlePlayBibleChapter(chapNum)}
        className={`group relative flex flex-col items-center justify-center gap-0.5 rounded-xl font-mono font-bold transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
          isPlayingThisChap
            ? `bg-gradient-to-br ${activeTabMeta?.gradient} text-white shadow-md`
            : isMp3Available
            ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border border-amber-300/70 dark:border-amber-700/60 hover:bg-amber-100 dark:hover:bg-amber-900/50 active:scale-95'
            : 'bg-stone-50 dark:bg-stone-800/20 text-stone-300 dark:text-stone-600 border border-stone-150/50 dark:border-stone-700/20'
        }`}
      >
        <span className="text-xs leading-none">
          {isLoadingThisChap ? (
            <Loader2 size={14} className="animate-spin" />
          ) : isPlayingThisChap ? (
            <Radio size={14} className="animate-pulse" />
          ) : isMp3Available ? (
            <span className="font-extrabold">{chapNum}</span>
          ) : (
            <span className="flex flex-col items-center gap-0.5">
              <Lock size={9} className="opacity-60" />
              <span className="opacity-50">{chapNum}</span>
            </span>
          )}
        </span>
      </button>
    );
  })}
</div>
                </div>

                {/* Desktop spacer */}
                <div className="h-3" />
              </>
            )}
          </div>
        </div>

        <div className="h-8" />
      </div>

      {/* ── TOAST ────────────────────────────────────────────────────────────── */}
      <Toast
        toast={toast}
        onDismiss={() => {
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          setToast(null);
        }}
        avoidPlayer={Boolean(currentTrack)}
      />

      {/* ── AUDIO PLAYER ─────────────────────────────────────────────────────── */}
      {currentTrack && (
        <BibleAudioPlayer
          currentTrack={currentTrack}
          onClose={() => setCurrentTrack(null)}
          onTrackEnd={handleNextChapter}
          onNextChapter={handleNextChapter}
          onPrevChapter={handlePrevChapter}
        />
      )}
    </main>
  );
}