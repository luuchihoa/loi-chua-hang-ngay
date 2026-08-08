import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
  CheckCircle,
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

const TESTAMENT_TABS = [
  {
    id: 'old',
    label: 'Cựu Ước',
    count: 46,
    gradient: 'from-amber-500 to-orange-600',
    activeBg: 'bg-gradient-to-r from-amber-500 to-orange-600',
    ringColor: 'ring-amber-400/60',
    chipActiveBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
    icon: BookMarked,
  },
  {
    id: 'new',
    label: 'Tân Ước',
    count: 27,
    gradient: 'from-blue-500 to-indigo-600',
    activeBg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
    ringColor: 'ring-blue-400/60',
    chipActiveBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    icon: Sparkles,
  },
];

// ── Toast Component ──────────────────────────────────────────────────────────
function Toast({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border border-white/20 bg-stone-900/95 backdrop-blur-md text-white max-w-[90vw] sm:max-w-sm animate-[fadeInUp_0.25s_ease]"
    >
      <span className="shrink-0 w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center">
        <Info size={14} className="text-amber-400" />
      </span>
      <p className="text-sm leading-snug flex-1">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-white/40 hover:text-white transition cursor-pointer"
        aria-label="Đóng thông báo"
      >
        <X size={14} />
      </button>
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
  const [toastMessage, setToastMessage] = useState(null);

  const bookChipRef = useRef(null);
  const chapterScrollRef = useRef(null);

  const triggerToast = useCallback((msg) => {
    setToastMessage(msg);
    const t = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(t);
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

  const handlePlayBibleChapter = useCallback(
    (chapNum) => {
      if (!selectedBook) return;
      const isMp3Available = hasBibleChapterAudio(selectedBook.id, chapNum);
      if (!isMp3Available) {
        triggerToast(`Chương ${chapNum} — ${selectedBook.name} chưa có bản thu Studio MP3. Ban biên tập đang cập nhật dần!`);
        return;
      }

      const filename = getBibleAudioFilename(selectedBook.id, chapNum);
      const trackId = `bible_${selectedBook.id}_${chapNum}`;
      const isStaticStorage =
        AUDIO_API_BASE.includes('.r2.dev') ||
        AUDIO_API_BASE.includes('r2.cloudflarestorage.com');

      if (isStaticStorage) {
        setCurrentTrack({
          trackId,
          title: `${selectedBook.name} · Chương ${chapNum}`,
          subtitle: `${selectedBook.testament === 'old' ? 'Cựu Ước' : 'Tân Ước'} • ${selectedBook.name} (${selectedBook.short}) • Chương ${chapNum}`,
          category: `Kinh Thánh - ${selectedBook.name}`,
          url: `${AUDIO_API_BASE}/bible/${filename}`,
          filename,
          bookId: selectedBook.id,
          chapter: chapNum,
        });
        return;
      }

      if (loadingTrackId) return;
      setLoadingTrackId(trackId);
      fetchAudioAccessStreamUrl(trackId)
        .then((signedUrl) => {
          if (signedUrl) {
            setCurrentTrack({
              trackId,
              title: `${selectedBook.name} · Chương ${chapNum}`,
              subtitle: `${selectedBook.testament === 'old' ? 'Cựu Ước' : 'Tân Ước'} • ${selectedBook.name} (${selectedBook.short}) • Chương ${chapNum}`,
              category: `Kinh Thánh - ${selectedBook.name}`,
              url: signedUrl,
              filename,
              bookId: selectedBook.id,
              chapter: chapNum,
            });
          }
        })
        .finally(() => setLoadingTrackId(null));
    },
    [selectedBook, loadingTrackId, triggerToast]
  );

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

  return (
    <main className="min-h-screen pb-40 font-sans">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div className="relative">
        <div className="relative overflow-hidden bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 px-4 pt-10 pb-36 sm:pb-40 sm:px-8">
          <div className="pointer-events-none absolute -top-20 -right-20 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 w-60 h-60 rounded-full bg-indigo-500/8 blur-3xl" />

          <div className="relative z-10 max-w-4xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-white/80 text-[11px] font-semibold tracking-widest uppercase">
              <Headphones size={12} />
              <span>Thư Viện Audio Kinh Thánh</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight leading-tight">
              Lắng Nghe <span className="text-amber-400">Lời Chúa</span>
            </h1>
            <p className="text-sm text-stone-400 max-w-sm mx-auto">
              Bản thu Studio chất lượng cao từ 73 Sách Kinh Thánh Công Giáo
            </p>

            {/* Testament tabs */}
            <div className="flex justify-center pt-2">
              <div className="inline-flex p-1 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 gap-1">
                {TESTAMENT_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = testamentFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleTabSwitch(tab.id)}
                      className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                        isActive
                          ? `${tab.activeBg} text-white shadow-lg scale-[1.02]`
                          : 'text-white/60 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Icon size={15} aria-hidden="true" />
                      <span>{tab.label}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${isActive ? 'bg-white/25 text-white' : 'bg-white/10 text-white/50'}`}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── CONTENT CARD — floated up over hero ───────────────────────── */}
        <div className="relative z-10 -mt-28 max-w-4xl mx-auto px-3 sm:px-6">
          <div className="rounded-3xl border border-stone-200 dark:border-stone-700/80 bg-white dark:bg-stone-900 shadow-2xl overflow-hidden">

            {/* Search bar */}
            <div className={`bg-gradient-to-r ${activeTabMeta?.gradient} px-4 py-3`}>
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

            {/* ── BOOK CHIPS — horizontal scroll, full name ─────────────────── */}
            <div
              ref={bookChipRef}
              className="flex gap-2 px-3 py-3 overflow-x-auto scrollbar-none border-b border-stone-100 dark:border-stone-800 bg-stone-50/40 dark:bg-stone-800/20"
              role="listbox"
              aria-label="Chọn sách Kinh Thánh"
            >
              {filteredBibleBooks.length === 0 ? (
                <span className="text-xs text-stone-400 py-2 px-1">Không tìm thấy sách phù hợp</span>
              ) : (
                filteredBibleBooks.map((book) => {
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
                })
              )}
            </div>

            {/* ── SELECTED BOOK HEADER ────────────────────────────────────────── */}
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

                  {/* Progress bar */}
                  <div className="mt-3 h-1.5 w-full bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${activeTabMeta?.gradient} transition-all duration-700`}
                      style={{ width: availableCount > 0 ? `${(availableCount / selectedBook.chapters) * 100}%` : '2%' }}
                    />
                  </div>
                </div>

                {/* ── CHAPTER — horizontal scroll row ──────────────────────────── */}
                <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800">
                  {/* Legend row */}
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

                  {/* Horizontal chapter scroll */}
                  <div
                    ref={chapterScrollRef}
                    className="flex gap-2 overflow-x-auto scrollbar-none pb-1"
                    role="group"
                    aria-label={`Chương sách ${selectedBook.name}`}
                  >
                    {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((chapNum) => {
                      const filename = getBibleAudioFilename(selectedBook.id, chapNum);
                      const trackId = `bible_${selectedBook.id}_${chapNum}`;
                      const isMp3Available = hasBibleChapterAudio(selectedBook.id, chapNum);
                      const isPlayingThisChap = Boolean(
                        currentTrack &&
                          (currentTrack.trackId === trackId || currentTrack.url?.includes(`/${filename}`))
                      );
                      const isLoadingThisChap = loadingTrackId === trackId;

                      return (
                        <button
                          key={chapNum}
                          type="button"
                          disabled={isLoadingThisChap}
                          aria-label={`Phát ${selectedBook.name} chương ${chapNum}`}
                          onClick={() => handlePlayBibleChapter(chapNum)}
                          className={`group shrink-0 flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-2xl font-mono font-bold transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 relative overflow-hidden ${
                            isPlayingThisChap
                              ? `bg-gradient-to-br ${activeTabMeta?.gradient} text-white shadow-lg scale-110 ring-2 ${activeTabMeta?.ringColor}`
                              : isMp3Available
                              ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border border-amber-300/70 dark:border-amber-700/60 hover:scale-105 hover:shadow-md hover:bg-amber-100 dark:hover:bg-amber-900/50'
                              : 'bg-stone-50 dark:bg-stone-800/20 text-stone-300 dark:text-stone-600 border border-stone-150/50 dark:border-stone-700/20'
                          }`}
                        >
                          {isPlayingThisChap && (
                            <span className="absolute inset-0 rounded-2xl ring-4 ring-amber-400/25 animate-ping pointer-events-none" />
                          )}
                          <span className={`text-xs leading-none ${!isMp3Available && !isPlayingThisChap ? 'opacity-30' : 'font-extrabold'}`}>
                            {isLoadingThisChap ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : isPlayingThisChap ? (
                              <Radio size={14} className="animate-pulse" />
                            ) : (
                              chapNum
                            )}
                          </span>
                          {/* MP3 / Lock indicator dot */}
                          {!isPlayingThisChap && !isLoadingThisChap && (
                            <span className={`w-1 h-1 rounded-full ${isMp3Available ? 'bg-amber-500' : 'bg-stone-200 dark:bg-stone-700'}`} />
                          )}
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
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />

      {/* ── AUDIO PLAYER ─────────────────────────────────────────────────────── */}
      {currentTrack && (
        <BibleAudioPlayer currentTrack={currentTrack} onClose={() => setCurrentTrack(null)} />
      )}
    </main>
  );
}
