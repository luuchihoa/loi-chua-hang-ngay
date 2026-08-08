import React, { useState, useMemo, useCallback } from 'react';
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
  ChevronRight,
  BookMarked,
  Sparkles,
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
    description: '46 Sách',
    gradient: 'from-amber-500 to-orange-600',
    activeBg: 'bg-gradient-to-r from-amber-500 to-orange-600',
    icon: BookMarked,
  },
  {
    id: 'new',
    label: 'Tân Ước',
    count: 27,
    description: '27 Sách',
    gradient: 'from-blue-500 to-indigo-600',
    activeBg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
    icon: Sparkles,
  },
];

export default function BibleAudioPage() {
  useAudioIndex();

  const allBibleBooks = useMemo(() => getAllBooks(), []);
  const [testamentFilter, setTestamentFilter] = useState('old');
  const [bibleSearchQuery, setBibleSearchQuery] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('st');
  const [currentTrack, setCurrentTrack] = useState(null);
  const [loadingTrackId, setLoadingTrackId] = useState(null);

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
    if (found) return found;
    return filteredBibleBooks[0] || allBibleBooks[0];
  }, [allBibleBooks, selectedBookId, filteredBibleBooks]);

  const handlePlayBibleChapter = useCallback(
    (chapNum) => {
      if (!selectedBook) return;
      const isMp3Available = hasBibleChapterAudio(selectedBook.id, chapNum);
      if (!isMp3Available) {
        alert(
          `Chương ${chapNum} hiện chưa có bản thu Audio Studio MP3.\nBan biên tập đang cập nhật!`
        );
        return;
      }

      const filename = getBibleAudioFilename(selectedBook.id, chapNum);
      const trackId = `bible_${selectedBook.id}_${chapNum}`;
      const isStaticStorage =
        AUDIO_API_BASE.includes('.r2.dev') ||
        AUDIO_API_BASE.includes('r2.cloudflarestorage.com');

      if (isStaticStorage) {
        const streamUrl = `${AUDIO_API_BASE}/bible/${filename}`;
        setCurrentTrack({
          trackId,
          title: `${selectedBook.name} · Chương ${chapNum}`,
          subtitle: `${selectedBook.testament === 'old' ? 'Cựu Ước' : 'Tân Ước'} • ${selectedBook.name} (${selectedBook.short}) • Chương ${chapNum}`,
          category: `Kinh Thánh - ${selectedBook.name}`,
          url: streamUrl,
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
    [selectedBook, loadingTrackId]
  );

  const activeTabMeta = TESTAMENT_TABS.find((t) => t.id === testamentFilter);

  // Count available MP3 for selected book
  const availableCount = useMemo(() => {
    if (!selectedBook) return 0;
    let count = 0;
    for (let i = 1; i <= selectedBook.chapters; i++) {
      if (hasBibleChapterAudio(selectedBook.id, i)) count++;
    }
    return count;
  }, [selectedBook]);

  return (
    <main className="min-h-screen pb-40 font-sans">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 px-4 pt-10 pb-8 sm:px-8">
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 w-56 h-56 rounded-full bg-orange-500/10 blur-2xl" />

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

          {/* ── TESTAMENT TAB SWITCHER ─────────────────────────────────────── */}
          <div className="flex justify-center pt-2">
            <div className="inline-flex p-1 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 gap-1">
              {TESTAMENT_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = testamentFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setTestamentFilter(tab.id);
                      setBibleSearchQuery('');
                      const first = allBibleBooks.find((b) => b.testament === tab.id);
                      if (first) setSelectedBookId(first.id);
                    }}
                    className={`relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                      isActive
                        ? `${tab.activeBg} text-white shadow-lg scale-[1.02]`
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon size={15} aria-hidden="true" />
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                        isActive
                          ? 'bg-white/25 text-white'
                          : 'bg-white/10 text-white/50'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-3 sm:px-6 -mt-2 space-y-4 pb-6 pt-4">

        {/* ── SEARCH BAR ──────────────────────────────────────────────────── */}
        <div className="relative">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            size={15}
            aria-hidden="true"
          />
          <input
            type="text"
            value={bibleSearchQuery}
            onChange={(e) => setBibleSearchQuery(e.target.value)}
            placeholder={`Tìm trong ${activeTabMeta?.label}... (tên sách, viết tắt)`}
            className="w-full pl-10 pr-10 py-3 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400/60 transition"
          />
          {bibleSearchQuery && (
            <button
              type="button"
              onClick={() => setBibleSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* ── DUAL PANEL ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">

          {/* LEFT: Book List ──────────────────────────────────────────────── */}
          <div className="lg:col-span-2 rounded-2xl border border-stone-200 dark:border-stone-700/80 bg-white dark:bg-stone-900 shadow-sm overflow-hidden">
            <div className={`px-4 py-3 bg-gradient-to-r ${activeTabMeta?.gradient} flex items-center gap-2`}>
              <BookOpen size={14} className="text-white/90" />
              <span className="text-xs font-bold text-white uppercase tracking-widest">
                {activeTabMeta?.label} · {filteredBibleBooks.length} Sách
              </span>
            </div>

            <div className="overflow-y-auto max-h-[520px] divide-y divide-stone-100 dark:divide-stone-800/60">
              {filteredBibleBooks.length === 0 ? (
                <div className="py-10 text-center text-sm text-stone-400">
                  Không tìm thấy sách phù hợp.
                </div>
              ) : (
                filteredBibleBooks.map((book) => {
                  const isSelected = selectedBook?.id === book.id;
                  const mp3Count = (() => {
                    let n = 0;
                    for (let i = 1; i <= book.chapters; i++) {
                      if (hasBibleChapterAudio(book.id, i)) n++;
                    }
                    return n;
                  })();
                  const hasAny = mp3Count > 0;

                  return (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => setSelectedBookId(book.id)}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-amber-400 ${
                        isSelected
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-r-[3px] border-amber-500'
                          : 'hover:bg-stone-50 dark:hover:bg-stone-800/50'
                      }`}
                    >
                      {/* Short code badge */}
                      <span
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-extrabold font-mono shrink-0 ${
                          isSelected
                            ? `bg-gradient-to-br ${activeTabMeta?.gradient} text-white shadow-sm`
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                        }`}
                      >
                        {book.short}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold truncate ${isSelected ? 'text-amber-900 dark:text-amber-200' : 'text-stone-800 dark:text-stone-200'}`}>
                          {book.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-stone-400 dark:text-stone-500">
                            {book.chapters} chương
                          </span>
                          {hasAny && (
                            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                              <Volume2 size={9} />
                              {mp3Count} MP3
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight
                        size={14}
                        className={`shrink-0 transition-transform ${isSelected ? 'text-amber-500 translate-x-0.5' : 'text-stone-300 dark:text-stone-600'}`}
                      />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: Chapter Grid ─────────────────────────────────────────── */}
          <div className="lg:col-span-3 rounded-2xl border border-stone-200 dark:border-stone-700/80 bg-white dark:bg-stone-900 shadow-sm overflow-hidden">
            {selectedBook ? (
              <>
                {/* Book Header */}
                <div className="px-5 py-4 border-b border-stone-100 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/30">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold font-mono bg-gradient-to-br ${activeTabMeta?.gradient} text-white`}>
                          {selectedBook.short}
                        </span>
                        <h2 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">
                          Sách {selectedBook.name}
                        </h2>
                      </div>
                      <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-1">
                        {selectedBook.category} · {selectedBook.testament === 'old' ? 'Cựu Ước' : 'Tân Ước'} · {selectedBook.chapters} chương
                      </p>
                    </div>

                    {/* MP3 progress badge */}
                    <div className="shrink-0 text-right">
                      <div className="text-lg font-extrabold font-mono leading-none text-stone-900 dark:text-stone-100">
                        {availableCount}
                        <span className="text-xs font-normal text-stone-400 dark:text-stone-500">/{selectedBook.chapters}</span>
                      </div>
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">MP3 sẵn sàng</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {availableCount > 0 && (
                    <div className="mt-3 h-1.5 w-full bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${activeTabMeta?.gradient} transition-all duration-700`}
                        style={{ width: `${(availableCount / selectedBook.chapters) * 100}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Legend */}
                <div className="px-5 py-2.5 flex items-center gap-4 border-b border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900">
                  <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                    <span className="w-5 h-5 rounded-md bg-amber-500/20 border border-amber-400/50 flex items-center justify-center">
                      <Play size={8} className="fill-amber-600 text-amber-600" />
                    </span>
                    <span>Có MP3</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-stone-400 dark:text-stone-500">
                    <span className="w-5 h-5 rounded-md bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                      <Lock size={8} className="text-stone-400" />
                    </span>
                    <span>Đang cập nhật</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 ml-auto font-semibold">
                    <Radio size={10} className="animate-pulse" />
                    <span>Nhấn để nghe</span>
                  </div>
                </div>

                {/* Chapter Grid */}
                <div className="p-4 grid grid-cols-5 sm:grid-cols-7 md:grid-cols-8 gap-2">
                  {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((chapNum) => {
                    const filename = getBibleAudioFilename(selectedBook.id, chapNum);
                    const trackId = `bible_${selectedBook.id}_${chapNum}`;
                    const isMp3Available = hasBibleChapterAudio(selectedBook.id, chapNum);
                    const isPlayingThisChap = Boolean(
                      currentTrack &&
                        (currentTrack.trackId === trackId ||
                          currentTrack.url?.includes(`/${filename}`))
                    );
                    const isLoadingThisChap = loadingTrackId === trackId;

                    return (
                      <button
                        key={chapNum}
                        type="button"
                        disabled={isLoadingThisChap}
                        aria-label={`Phát ${selectedBook.name} chương ${chapNum}`}
                        title={
                          isMp3Available
                            ? `Studio MP3: ${selectedBook.name} chương ${chapNum}`
                            : `Chưa có MP3: ${selectedBook.name} chương ${chapNum}`
                        }
                        onClick={() => handlePlayBibleChapter(chapNum)}
                        className={`group relative aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 font-mono text-xs font-bold transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 overflow-hidden ${
                          isPlayingThisChap
                            ? `bg-gradient-to-br ${activeTabMeta?.gradient} text-white shadow-md scale-110 ring-2 ring-amber-400/60`
                            : isMp3Available
                            ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border border-amber-300/70 dark:border-amber-700/60 hover:scale-105 hover:shadow-md hover:bg-amber-100 dark:hover:bg-amber-950/50'
                            : 'bg-stone-50 dark:bg-stone-800/30 text-stone-300 dark:text-stone-600 border border-stone-200/50 dark:border-stone-700/30'
                        }`}
                      >
                        {/* playing glow ring */}
                        {isPlayingThisChap && (
                          <span className="absolute inset-0 rounded-xl ring-4 ring-amber-400/40 animate-ping pointer-events-none" />
                        )}

                        {isLoadingThisChap ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : isPlayingThisChap ? (
                          <Radio size={13} className="animate-pulse" aria-hidden="true" />
                        ) : isMp3Available ? (
                          <Play size={10} className="fill-current opacity-70 group-hover:opacity-100" aria-hidden="true" />
                        ) : (
                          <Lock size={9} className="opacity-40" aria-hidden="true" />
                        )}
                        <span className={`text-[11px] leading-none ${!isMp3Available && !isPlayingThisChap ? 'opacity-40' : ''}`}>
                          {chapNum}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="py-20 text-center text-sm text-stone-400">
                Chọn một sách bên trái để xem danh sách chương.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── FLOATING AUDIO PLAYER ─────────────────────────────────────────── */}
      {currentTrack && (
        <BibleAudioPlayer currentTrack={currentTrack} onClose={() => setCurrentTrack(null)} />
      )}
    </main>
  );
}
