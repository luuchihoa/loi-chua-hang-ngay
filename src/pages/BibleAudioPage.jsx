import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Volume2, 
  Play, 
  Search, 
  X, 
  RefreshCw, 
  Info, 
  Radio, 
  FilterX,
  BookOpen,
  ChevronRight,
  Layers,
  Calendar,
  ChevronDown,
  Lock,
  Loader2,
  Bot
} from 'lucide-react';
import BibleAudioPlayer from '../components/audio/BibleAudioPlayer.jsx';
import { 
  getAllBooks, 
  fetchAudioAccessStreamUrl, 
  fetchBibleAudioAvailability,
  getBibleAudioFilename,
} from '../utils/bibleService.js';
import { loadAudioIndex, hasBibleChapterAudio } from '../utils/audioIndexService.js';

const LITURGY_TABS = [
  { id: 'all', label: 'Tất Cả' },
  { id: 'gospel', label: 'Tin Mừng' },
  { id: 'r1', label: 'Bài Đọc 1' },
  { id: 'r2', label: 'Bài Đọc 2' },
];

const RAW_AUDIO_API_BASE = import.meta.env.VITE_AUDIO_API_BASE || import.meta.env.VITE_AUDIO_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:5005' : '');

const AUDIO_API_BASE = RAW_AUDIO_API_BASE.replace(/\/+$/, '');

export default function BibleAudioPage() {
  const [viewMode, setViewMode] = useState('liturgy');

  // ── States cho Nhóm A (Bài Đọc Phụng Vụ - Server Paginated 12 items/trang) ─
  const [liturgyAudioList, setLiturgyAudioList] = useState([]);
  const [activeLiturgyTab, setActiveLiturgyTab] = useState('all');
  const [liturgySearchQuery, setLiturgySearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isLoadingLiturgy, setIsLoadingLiturgy] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalLiturgyCount, setTotalLiturgyCount] = useState(0);
  const [hasMoreLiturgy, setHasMoreLiturgy] = useState(false);
  const [nextCursorLiturgy, setNextCursorLiturgy] = useState(null);

  // ── States cho Nhóm B (Kinh Thánh 73 Sách & Per-Book Availability) ────────
  const allBibleBooks = useMemo(() => getAllBooks(), []);
  const [testamentFilter, setTestamentFilter] = useState('all');
  const [bibleSearchQuery, setBibleSearchQuery] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('mat');
  const [availableChaptersMap, setAvailableChaptersMap] = useState(new Map()); // chapNum -> trackId
  const [isBibleAvailabilityLoading, setIsBibleAvailabilityLoading] = useState(false);

  // ── Player & Token Loading State ─────────────────────────────────
  const [currentTrack, setCurrentTrack] = useState(null);
  const [loadingTrackId, setLoadingTrackId] = useState(null);

  // Debounce Search Input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(liturgySearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [liturgySearchQuery]);

  // 1. Tải Bài Đọc Phụng Vụ từ Server API hoặc R2 Static Storage Manifest
  const fetchLiturgyAudioInitial = useCallback(async (category, searchQuery) => {
    setIsLoadingLiturgy(true);

    const isStaticStorage = AUDIO_API_BASE.includes('.r2.dev') || AUDIO_API_BASE.includes('r2.cloudflarestorage.com') || (!AUDIO_API_BASE.includes('localhost:5005') && !AUDIO_API_BASE.includes('/api'));

    if (isStaticStorage) {
      setLiturgyAudioList([]);
      setTotalLiturgyCount(0);
      setHasMoreLiturgy(false);
      setNextCursorLiturgy(null);
      setIsLoadingLiturgy(false);
      return;
    }

    try {
      const params = new URLSearchParams();
      params.set('category', category);
      if (searchQuery) params.set('q', searchQuery);
      params.set('limit', '12');
      params.set('offset', '0');

      const res = await fetch(`${AUDIO_API_BASE}/api/list-audio?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();

      if (data && Array.isArray(data.files)) {
        setLiturgyAudioList(data.files);
        setTotalLiturgyCount(data.total || data.files.length);
        setHasMoreLiturgy(Boolean(data.hasMore));
        setNextCursorLiturgy(data.nextCursor ?? (data.hasMore ? 12 : null));
      }
    } catch (err) {
      setLiturgyAudioList([]);
      setTotalLiturgyCount(0);
      setHasMoreLiturgy(false);
      setNextCursorLiturgy(null);
    } finally {
      setIsLoadingLiturgy(false);
    }
  }, []);

  // 2. Tải Trang Tiếp Theo (Load More)
  const handleLoadMoreLiturgy = useCallback(async () => {
    if (!hasMoreLiturgy || nextCursorLiturgy === null || isLoadingMore) return;

    const isStaticStorage = AUDIO_API_BASE.includes('.r2.dev') || AUDIO_API_BASE.includes('r2.cloudflarestorage.com') || (!AUDIO_API_BASE.includes('localhost:5005') && !AUDIO_API_BASE.includes('/api'));
    if (isStaticStorage) return;

    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams();
      params.set('category', activeLiturgyTab);
      if (debouncedQuery) params.set('q', debouncedQuery);
      params.set('limit', '12');
      params.set('offset', String(nextCursorLiturgy));

      const res = await fetch(`${AUDIO_API_BASE}/api/list-audio?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.files)) {
          setLiturgyAudioList((prev) => {
            const existingIds = new Set(prev.map(item => item.trackId));
            const newFiles = data.files.filter(item => !existingIds.has(item.trackId));
            return [...prev, ...newFiles];
          });
          setTotalLiturgyCount(data.total || 0);
          setHasMoreLiturgy(Boolean(data.hasMore));
          setNextCursorLiturgy(data.nextCursor);
        }
      }
    } catch (err) {
      console.warn('Lỗi tải thêm bài đọc:', err.message);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMoreLiturgy, nextCursorLiturgy, isLoadingMore, activeLiturgyTab, debouncedQuery]);

  useEffect(() => {
    fetchLiturgyAudioInitial(activeLiturgyTab, debouncedQuery);
  }, [activeLiturgyTab, debouncedQuery, fetchLiturgyAudioInitial]);

  // 3. Nạp danh mục chương khả dụng cho duy nhất Sách đang chọn (Nhóm B)
  const fetchBookAvailability = useCallback(async (bookId) => {
    setIsBibleAvailabilityLoading(true);
    try {
      const chaptersList = await fetchBibleAudioAvailability(bookId);
      const map = new Map();
      chaptersList.forEach(item => {
        if (item.chapter && item.trackId) {
          map.set(item.chapter, item.trackId);
        }
      });
      setAvailableChaptersMap(map);
    } catch (err) {
      setAvailableChaptersMap(new Map());
    } finally {
      setIsBibleAvailabilityLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBookId) {
      fetchBookAvailability(selectedBookId);
    }
  }, [selectedBookId, fetchBookAvailability]);

  // Lọc 73 sách Kinh Thánh
  const filteredBibleBooks = useMemo(() => {
    const query = bibleSearchQuery.trim().toLowerCase();
    return allBibleBooks.filter((book) => {
      const matchesTestament = testamentFilter === 'all' || book.testament === testamentFilter;
      const matchesSearch =
        !query ||
        book.name.toLowerCase().includes(query) ||
        book.short.toLowerCase().includes(query) ||
        book.category.toLowerCase().includes(query);

      return matchesTestament && matchesSearch;
    });
  }, [allBibleBooks, testamentFilter, bibleSearchQuery]);

  const selectedBook = useMemo(() => {
    return allBibleBooks.find(b => b.id === selectedBookId) || filteredBibleBooks[0] || allBibleBooks[0];
  }, [allBibleBooks, selectedBookId, filteredBibleBooks]);

  // Thao tác Xin Token & Phát Track
  const handlePlayTrack = useCallback(async (item, trackMeta) => {
    if (!item || !item.trackId || loadingTrackId) return;

    setLoadingTrackId(item.trackId);
    try {
      const signedStreamUrl = await fetchAudioAccessStreamUrl(item.trackId);
      if (signedStreamUrl) {
        setCurrentTrack({
          trackId: item.trackId,
          title: trackMeta.title,
          subtitle: trackMeta.subtitle,
          category: trackMeta.category,
          url: signedStreamUrl,
          filename: item.filename,
          bookId: trackMeta.bookId,
          chapter: trackMeta.chapter
        });
      } else {
        alert('Không thể xin token bảo mật để phát bài đọc này.');
      }
    } catch (err) {
      console.error('Lỗi khi tải stream URL:', err);
    } finally {
      setLoadingTrackId(null);
    }
  }, [loadingTrackId]);

  const handlePlayBibleChapter = useCallback((chapNum) => {
    if (!selectedBook) return;
    const filename = getBibleAudioFilename(selectedBook.id, chapNum);
    const trackId = availableChaptersMap.get(chapNum) || `bible_${selectedBook.id}_${chapNum}`;
    const isStaticStorage = AUDIO_API_BASE.includes('.r2.dev') || AUDIO_API_BASE.includes('r2.cloudflarestorage.com');

    if (isStaticStorage) {
      // Chế độ Public R2 Storage: Tải trực tiếp file tĩnh công khai
      const streamUrl = `${AUDIO_API_BASE}/bible/${filename}`;
      setCurrentTrack({
        trackId,
        title: `${selectedBook.name} · Chương ${chapNum}`,
        subtitle: `Kinh Thánh 73 Sách • ${selectedBook.name} (${selectedBook.short}) • Chương ${chapNum}`,
        category: `Kinh Thánh - ${selectedBook.name}`,
        url: streamUrl,
        filename,
        bookId: selectedBook.id,
        chapter: chapNum
      });
      return;
    }

    handlePlayTrack({ trackId, filename }, {
      title: `${selectedBook.name} - Chương ${chapNum}`,
      subtitle: `Kinh Thánh 73 Sách • ${selectedBook.name} (${selectedBook.short}) • Chương ${chapNum}`,
      category: `Kinh Thánh - ${selectedBook.name}`,
      bookId: selectedBook.id,
      chapter: chapNum
    });
  }, [selectedBook, availableChaptersMap, handlePlayTrack]);

  return (
    <main className="min-h-screen pb-28 pt-4 sm:pt-6 px-3 sm:px-6 max-w-5xl mx-auto space-y-5 sm:space-y-7 font-sans text-stone-800 dark:text-stone-200">
      
      {/* ── 1. COMPACT SACRED HERO SECTION ─────────────────────────── */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-amber-100/70 via-amber-50/40 to-stone-50/20 dark:from-stone-900/90 dark:via-stone-900/60 dark:to-stone-950/40 border border-amber-200/70 dark:border-amber-900/40 p-5 sm:p-6 text-center space-y-2 shadow-xs">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-900/10 dark:bg-amber-400/10 text-amber-900 dark:text-amber-200 text-xs font-semibold tracking-wide border border-amber-900/15 dark:border-amber-400/20">
          <Volume2 size={13} aria-hidden="true" />
          <span>Thư Viện Âm Thanh Lời Chúa (Protected Stream)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100 tracking-tight">
          Lắng Nghe Lời Chúa &amp; Phụng Vụ
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-lg mx-auto leading-relaxed">
          Không gian thanh tĩnh thưởng thức các bài đọc Phụng Vụ thu sẵn và tra cứu danh mục 73 sách Kinh Thánh Công Giáo.
        </p>
      </header>

      {/* ── 2. ELEGANT MODE SWITCHER SEGMENTED CONTROL ─────────────── */}
      <div className="flex justify-center">
        <div 
          role="tablist" 
          aria-label="Chuyển thư viện Audio"
          className="inline-flex p-1 bg-stone-200/60 dark:bg-stone-950 rounded-xl border border-stone-300/60 dark:border-stone-800 shadow-inner"
        >
          <button
            type="button"
            role="tab"
            id="mode-tab-liturgy"
            aria-selected={viewMode === 'liturgy'}
            aria-controls="mode-section-liturgy"
            onClick={() => setViewMode('liturgy')}
            className={`py-2 px-4 rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              viewMode === 'liturgy'
                ? 'bg-white dark:bg-stone-800 text-amber-950 dark:text-amber-200 shadow-xs border border-amber-300/40 dark:border-amber-700/40 font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <Radio size={15} aria-hidden="true" />
            <span>Bài Đọc Phụng Vụ ({totalLiturgyCount})</span>
          </button>

          <button
            type="button"
            role="tab"
            id="mode-tab-bible"
            aria-selected={viewMode === 'bible'}
            aria-controls="mode-section-bible"
            onClick={() => setViewMode('bible')}
            className={`py-2 px-4 rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              viewMode === 'bible'
                ? 'bg-white dark:bg-stone-800 text-amber-950 dark:text-amber-200 shadow-xs border border-amber-300/40 dark:border-amber-700/40 font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <BookOpen size={15} aria-hidden="true" />
            <span>Kinh Thánh 73 Sách</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          CHẾ ĐỘ 1: BÀI ĐỌC PHỤNG VỤ (NHÓM A - PAGINATED API 12 ITEMS/PAGE)
         ───────────────────────────────────────────────────────────── */}
      {viewMode === 'liturgy' && (
        <section 
          id="mode-section-liturgy" 
          aria-labelledby="mode-tab-liturgy"
          className="space-y-4"
        >
          {/* Thanh Công Cụ Toolbar Filter & Search */}
          <div className="bg-white/90 dark:bg-stone-900/90 rounded-2xl p-4 border border-stone-200/80 dark:border-stone-800/80 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              
              {/* Filter Pills */}
              <nav 
                aria-label="Phân loại bài đọc Phụng Vụ"
                className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-950 rounded-xl border border-stone-200/80 dark:border-stone-800/80 w-full sm:w-auto overflow-x-auto"
              >
                {LITURGY_TABS.map((tab) => {
                  const isActive = activeLiturgyTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      id={`liturgy-tab-${tab.id}`}
                      aria-selected={isActive}
                      aria-controls="liturgy-playlist"
                      onClick={() => setActiveLiturgyTab(tab.id)}
                      className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                        isActive
                          ? 'bg-amber-700 text-white shadow-xs font-bold'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800/60'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </nav>

              {/* Ô tìm kiếm bài đọc */}
              <div className="relative w-full sm:w-64 shrink-0">
                <label htmlFor="liturgy-search-input" className="sr-only">
                  Tìm kiếm bài đọc phụng vụ
                </label>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} aria-hidden="true" />
                <input
                  id="liturgy-search-input"
                  type="text"
                  value={liturgySearchQuery}
                  onChange={(e) => setLiturgySearchQuery(e.target.value)}
                  placeholder="Tìm tên sách, trích đoạn, tên lễ..."
                  className="w-full pl-8 pr-8 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
                {liturgySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setLiturgySearchQuery('')}
                    aria-label="Xóa từ khóa tìm kiếm"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

            </div>

            {/* Track List Server-Side Enriched & Paginated */}
            <div 
              id="liturgy-playlist"
              aria-live="polite"
              aria-label="Danh sách phát audio phụng vụ"
              className="space-y-2.5 pt-1"
            >
              {isLoadingLiturgy ? (
                <div className="space-y-2 py-2">
                  {[1, 2, 3].map((n) => (
                    <div 
                      key={n} 
                      className="p-3.5 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-950/40 animate-pulse flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded-md w-1/3" />
                        <div className="h-3 bg-stone-200 dark:bg-stone-800 rounded-md w-1/4" />
                      </div>
                      <div className="w-16 h-8 bg-stone-200 dark:bg-stone-800 rounded-lg shrink-0" />
                    </div>
                  ))}
                </div>
              ) : liturgyAudioList.length === 0 ? (
                <div className="text-center py-10 px-4 rounded-xl border border-dashed border-stone-200 dark:border-stone-800 bg-stone-50/40 dark:bg-stone-950/40 space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-100/60 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto">
                    <FilterX size={20} aria-hidden="true" />
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {liturgySearchQuery
                      ? `Không tìm thấy bài đọc nào khớp với từ khóa "${liturgySearchQuery}".`
                      : `Chưa có bài đọc nào trong mục này.`}
                  </p>
                  {(liturgySearchQuery || activeLiturgyTab !== 'all') && (
                    <button
                      type="button"
                      onClick={() => { setLiturgySearchQuery(''); setActiveLiturgyTab('all'); }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-700 text-white font-semibold text-xs cursor-pointer"
                    >
                      <RefreshCw size={12} aria-hidden="true" />
                      <span>Xóa lọc</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {liturgyAudioList.map((item, idx) => {
                    const isSelected = Boolean(currentTrack && currentTrack.trackId === item.trackId);
                    const isLoadingThisTrack = loadingTrackId === item.trackId;
                    const trackPlayerTitle = item.fullScriptureTitle;
                    const trackPlayerSubtitle = item.hasMetadataMatch 
                      ? `${item.primaryUsage?.title} (${item.category})`
                      : `${item.category} • Chưa gắn ngày/lễ`;

                    return (
                      <article
                        key={item.trackId}
                        tabIndex={0}
                        role="button"
                        aria-pressed={isSelected}
                        aria-label={`Phát bài ${item.fullScriptureTitle}`}
                        onClick={() => handlePlayTrack(item, {
                          title: trackPlayerTitle,
                          subtitle: trackPlayerSubtitle,
                          category: item.category
                        })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handlePlayTrack(item, {
                              title: trackPlayerTitle,
                              subtitle: trackPlayerSubtitle,
                              category: item.category
                            });
                          }
                        }}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 sm:gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                          isSelected
                            ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 shadow-xs'
                            : 'bg-white dark:bg-stone-900 border-stone-200/70 dark:border-stone-800/80 hover:border-amber-300/80 dark:hover:border-amber-700/80 hover:bg-stone-50/60 dark:hover:bg-stone-950/40'
                        }`}
                      >
                        {/* Left Track Info */}
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-mono text-xs font-bold mt-0.5 ${
                            isSelected
                              ? 'bg-amber-700 text-white'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                          }`}>
                            {isLoadingThisTrack ? (
                              <Loader2 size={15} className="animate-spin text-amber-700" />
                            ) : isSelected ? (
                              <Radio size={15} className="animate-pulse" aria-hidden="true" />
                            ) : (
                              idx + 1
                            )}
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="text-sm font-bold text-stone-950 dark:text-stone-50 font-serif tracking-tight leading-snug">
                                {item.fullScriptureTitle}
                              </h2>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              <span className="px-2 py-0.5 rounded bg-amber-100/70 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 text-[10px] uppercase font-semibold border border-amber-300/40 dark:border-amber-800/50 shrink-0">
                                {item.category}
                              </span>

                              {item.hasMetadataMatch && item.primaryUsage ? (
                                <span className="text-stone-700 dark:text-stone-300 font-medium flex items-center gap-1 truncate" title={item.primaryUsage.title}>
                                  <Calendar size={12} className="text-amber-700 shrink-0" aria-hidden="true" />
                                  <span className="truncate">{item.primaryUsage.title}</span>
                                </span>
                              ) : (
                                <span className="text-stone-400 dark:text-stone-500 font-normal italic">
                                  Chưa gắn ngày/lễ
                                </span>
                              )}

                              {item.extraUsagesCount > 0 && (
                                <span 
                                  className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 text-[10px] font-mono font-medium shrink-0"
                                  title={item.usages?.map(u => u.title).join('\n')}
                                >
                                  +{item.extraUsagesCount} lễ khác
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-stone-400 dark:text-stone-500 font-mono truncate flex items-center gap-2 pt-0.5">
                              <span className="truncate" title={item.filename}>{item.filename}</span>
                              <span>•</span>
                              <span className="shrink-0">{item.size_kb} KB</span>
                            </div>
                          </div>
                        </div>

                        {/* Right Play Action */}
                        <button
                          type="button"
                          tabIndex={-1}
                          disabled={isLoadingThisTrack}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-800 text-white font-bold'
                              : 'bg-amber-700 hover:bg-amber-800 text-white'
                          }`}
                        >
                          {isLoadingThisTrack ? (
                            <>
                              <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                              <span>Đang xin token...</span>
                            </>
                          ) : isSelected ? (
                            <>
                              <Radio size={13} className="animate-pulse" aria-hidden="true" />
                              <span>Đang phát</span>
                            </>
                          ) : (
                            <>
                              <Play size={13} className="fill-current" aria-hidden="true" />
                              <span>Phát</span>
                            </>
                          )}
                        </button>
                      </article>
                    );
                  })}

                  {/* Nút Xem Thêm (Load More Pagination) */}
                  {hasMoreLiturgy && (
                    <div className="text-center pt-3 pb-1">
                      <button
                        type="button"
                        onClick={handleLoadMoreLiturgy}
                        disabled={isLoadingMore}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-stone-800 dark:text-stone-200 hover:text-amber-900 dark:hover:text-amber-200 border border-stone-200 dark:border-stone-700 font-bold text-xs transition-all shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50"
                      >
                        {isLoadingMore ? (
                          <>
                            <RefreshCw size={14} className="animate-spin text-amber-700" aria-hidden="true" />
                            <span>Đang tải thêm...</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown size={15} className="text-amber-700" aria-hidden="true" />
                            <span>Xem thêm ({totalLiturgyCount - liturgyAudioList.length} bài đọc khác)</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CHẾ ĐỘ 2: KINH THÁNH 73 SÁCH (NHÓM B) - PER-BOOK AVAILABILITY
         ───────────────────────────────────────────────────────────── */}
      {viewMode === 'bible' && (
        <section 
          id="mode-section-bible" 
          aria-labelledby="mode-tab-bible"
          className="space-y-4"
        >
          {/* Status Banner */}
          <div 
            role="status"
            aria-live="polite"
            className="bg-stone-100/90 dark:bg-stone-900/90 border border-stone-200/90 dark:border-stone-800/90 rounded-xl p-3.5 text-xs text-stone-600 dark:text-stone-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-xs"
          >
            <div className="flex items-center gap-2">
              <Info size={15} className="text-amber-700 dark:text-amber-400 shrink-0" aria-hidden="true" />
              <span>
                <strong>Kinh Thánh 73 Sách:</strong> Duyệt danh mục 73 sách (1.328 chương). Kiểm tra khả dụng từng sách thực tế từ server.
              </span>
            </div>
            <div className="font-mono text-[11px] bg-amber-100/80 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 px-2.5 py-1 rounded-md shrink-0 font-medium border border-amber-200/60 dark:border-amber-800/60">
              73 Sách • Protected Streaming
            </div>
          </div>

          {/* Controls: Testament Filter & Search */}
          <div className="bg-white/90 dark:bg-stone-900/90 rounded-2xl p-4 border border-stone-200/80 dark:border-stone-800/80 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <nav aria-label="Bộ lọc Ước Kinh Thánh" className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-950 rounded-xl border border-stone-200/80 dark:border-stone-800/80">
                <button
                  type="button"
                  onClick={() => setTestamentFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                    testamentFilter === 'all'
                      ? 'bg-amber-700 text-white font-bold'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                >
                  Tất Cả (73)
                </button>
                <button
                  type="button"
                  onClick={() => setTestamentFilter('old')}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                    testamentFilter === 'old'
                      ? 'bg-amber-700 text-white font-bold'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                >
                  Cựu Ước (46)
                </button>
                <button
                  type="button"
                  onClick={() => setTestamentFilter('new')}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                    testamentFilter === 'new'
                      ? 'bg-amber-700 text-white font-bold'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                >
                  Tân Ước (27)
                </button>
              </nav>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} aria-hidden="true" />
                <input
                  type="text"
                  value={bibleSearchQuery}
                  onChange={(e) => setBibleSearchQuery(e.target.value)}
                  placeholder="Tìm tên sách (Mát-thêu, St, 2 Sm...)"
                  className="w-full pl-8 pr-8 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
                {bibleSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setBibleSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Dual Panel Duyệt Sách & Bảng Chương */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* Cột Trái: Danh mục Sách */}
            <div className="lg:col-span-5 bg-white/90 dark:bg-stone-900/90 rounded-2xl p-3.5 border border-stone-200/80 dark:border-stone-800/80 shadow-xs space-y-2.5 max-h-[560px] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800/80 pb-2 px-1">
                <h3 className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={13} className="text-amber-700" />
                  <span>Danh Mục Sách ({filteredBibleBooks.length})</span>
                </h3>
              </div>

              {filteredBibleBooks.length === 0 ? (
                <div className="text-center py-6 text-xs text-stone-400">
                  Không tìm thấy sách phù hợp.
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredBibleBooks.map((book) => {
                    const isSelected = selectedBook?.id === book.id;
                    return (
                      <div
                        key={book.id}
                        onClick={() => setSelectedBookId(book.id)}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 shadow-xs'
                            : 'bg-white dark:bg-stone-900 border-stone-200/60 dark:border-stone-800/60 hover:border-amber-300/60 dark:hover:border-amber-700/60 hover:bg-stone-50/60 dark:hover:bg-stone-950/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className={`min-w-[2rem] px-1.5 py-0.5 rounded-lg font-bold font-mono text-xs flex items-center justify-center shrink-0 whitespace-nowrap text-center ${
                            isSelected ? 'bg-amber-700 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                          }`}>
                            {book.short}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate font-sans">
                              {book.name}
                            </h4>
                            <p className="text-[10px] text-stone-400 dark:text-stone-500">
                              {book.category} • {book.chapters} chương
                            </p>
                          </div>
                        </div>

                        <ChevronRight size={14} className={`shrink-0 transition-transform ${isSelected ? 'text-amber-700' : 'text-stone-400'}`} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cột Phải: Bảng Chương Sách Được Chọn */}
            <div className="lg:col-span-7 bg-white/90 dark:bg-stone-900/90 rounded-2xl p-4 sm:p-5 border border-stone-200/80 dark:border-stone-800/80 shadow-xs space-y-4">
              {selectedBook ? (
                <>
                  <div className="border-b border-stone-100 dark:border-stone-800/80 pb-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="min-w-[2rem] px-2 py-0.5 rounded-lg bg-amber-100/80 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 text-xs font-mono font-bold border border-amber-200 dark:border-amber-800 whitespace-nowrap shrink-0 flex items-center justify-center text-center">
                          {selectedBook.short}
                        </span>
                        <h2 className="text-base sm:text-lg font-serif font-bold text-stone-900 dark:text-stone-100 truncate">
                          Sách {selectedBook.name}
                        </h2>
                      </div>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        {selectedBook.category} • {selectedBook.testament === 'old' ? 'Cựu Ước' : 'Tân Ước'} • {selectedBook.chapters} Chương
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-mono shrink-0">
                      <Volume2 size={13} className="text-amber-700 shrink-0" aria-hidden="true" />
                      <span>{selectedBook.chapters} chương sẵn sàng phát</span>
                    </div>
                  </div>

                  {/* Grid chọn Chương */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                        Danh sách chương ({selectedBook.chapters} chương):
                      </h4>
                      <span className="text-[11px] text-stone-400 dark:text-stone-500">
                        * Nhấn nút chương để phát audio trực tiếp
                      </span>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
                      {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((chapNum) => {
                        const filename = getBibleAudioFilename(selectedBook.id, chapNum);
                        const trackId = availableChaptersMap.get(chapNum) || `bible_${selectedBook.id}_${chapNum}`;
                        const isMp3Available = hasBibleChapterAudio(selectedBook.id, chapNum);
                        const isPlayingThisChap = Boolean(currentTrack && (currentTrack.trackId === trackId || currentTrack.url?.includes(`/${filename}`)));
                        const isLoadingThisChap = loadingTrackId === trackId;

                        return (
                          <button
                            key={chapNum}
                            type="button"
                            disabled={isLoadingThisChap}
                            aria-label={`Phát ${selectedBook.name} chương ${chapNum}`}
                            title={isMp3Available ? `Bản thu Studio MP3: ${selectedBook.name} chương ${chapNum}` : `Giọng đọc AI (TTS): ${selectedBook.name} chương ${chapNum}`}
                            onClick={() => handlePlayBibleChapter(chapNum)}
                            className={`py-2 px-1 rounded-lg text-xs font-semibold font-mono transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                              isPlayingThisChap
                                ? 'bg-amber-700 text-white shadow-xs scale-105 font-bold'
                                : isMp3Available
                                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 hover:bg-amber-100/70'
                                  : 'bg-stone-50 dark:bg-stone-950 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:border-stone-400 hover:bg-stone-100/50'
                            }`}
                          >
                            {isLoadingThisChap ? (
                              <Loader2 size={12} className="animate-spin text-amber-700 dark:text-amber-400" />
                            ) : isPlayingThisChap ? (
                              <Radio size={13} className="animate-pulse" aria-hidden="true" />
                            ) : isMp3Available ? (
                              <Play size={11} className="fill-current text-amber-700 dark:text-amber-400" aria-hidden="true" />
                            ) : (
                              <Bot size={11} className="text-stone-500 dark:text-stone-400" aria-hidden="true" />
                            )}
                            <span>{chapNum}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-10 text-xs text-stone-400">
                  Vui lòng chọn một sách bên danh mục để xem danh sách chương.
                </div>
              )}
            </div>

          </div>
        </section>
      )}

      {/* Trình Phát Audio Nổi (BibleAudioPlayer) */}
      {currentTrack && (
        <BibleAudioPlayer
          currentTrack={currentTrack}
          onClose={() => setCurrentTrack(null)}
        />
      )}
    </main>
  );
}
