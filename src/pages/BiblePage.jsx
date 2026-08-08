import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  X,
  ChevronDown,
  BookOpen,
  MessageSquarePlus,
  Check,
  Copy,
  Image as ImageIcon,
  Compass,
  Globe,
  Info
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getOldTestamentBooks, 
  getNewTestamentBooks, 
  getAllBooks, 
  getBookById, 
  getChapterContent, 
  fetchBibleAudioAvailability,
  fetchAudioAccessStreamUrl,
  getBibleAudioFilename,
} from '../utils/bibleService.js';
import { getAudioApiBase } from '../utils/audioLookup.js';
import { loadAudioIndex, hasBibleChapterAudio } from '../utils/audioIndexService.js';
import { getLiturgyInfo, getLiturgicalColor } from '../utils/liturgyCalendar.js';
import { supabase } from '../lib/supabase.js';
import BibleAudioPlayer from '../components/audio/BibleAudioPlayer.jsx';
import VerseActionBar from '../components/reader/VerseActionBar.jsx';
import { useLiturgy } from '../context/LiturgyContext.jsx';
import { useVerseHighlight, HIGHLIGHT_COLORS } from '../hooks/useVerseHighlight.js';
import { useVerseNote } from '../hooks/useVerseNote.js';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation.js';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Virtuoso } from 'react-virtuoso';
import NoteModal from '../components/reader/NoteModal.jsx';
import QuoteImageModal from '../components/reader/QuoteImageModal.jsx';
import BibleSearchModal from '../components/reader/BibleSearchModal.jsx';
import BibleNavigationPanel from '../features/bible/components/BibleNavigationPanel.jsx';
import ReaderToolbar from '../features/bible/components/ReaderToolbar.jsx';
import ReaderPreferencesSheet from '../features/bible/components/ReaderPreferencesSheet.jsx';
import { BookHero, ChapterMeta } from '../features/bible/components/ChapterHero.jsx';
import ChapterNavigationCard from '../features/bible/components/ChapterNavigationCard.jsx';
import { parseBibleReference } from '../features/bible/utils/referenceParser.js';
import {
  getBookReadingProgress,
  getLastReadingPosition,
  saveBookReadingProgress,
} from '../features/bible/utils/readingProgress.js';

// ── Liturgical color → Tailwind accent map ─────────────────────────
const LITURGY_ACCENT = {
  amber:   { badge: 'bg-amber-100/60 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300' },
  emerald: { badge: 'bg-emerald-100/60 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' },
  purple:  { badge: 'bg-purple-100/60 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300' },
  rose:    { badge: 'bg-rose-100/60 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300' },
};

// ──────────────────────────────────────────────────────────────────
export default function BiblePage() {
  const { bookId: urlBookId, chapterNum: urlChapter } = useParams();
  const navigate = useNavigate();
  const allBooks = useMemo(() => getAllBooks(), []);

  // ── Determine initial book + chapter (URL → localStorage → default) ──
  const getInitialState = () => {
    if (urlBookId) {
      const book = getBookById(urlBookId);
      if (book) {
        const ch = parseInt(urlChapter, 10) || 1;
        return { bookId: book.id, chapter: Math.min(Math.max(ch, 1), book.chapters) };
      }
    }
    const last = getLastReadingPosition();
    if (last && getBookById(last.bookId)) return last;
    return { bookId: 'mat', chapter: 15, verse: 1 };
  };

  const initial = useMemo(getInitialState, []); // only once on mount

  // ── Navigation State ────────────────────────────────────────────
  const [selectedBookId, setSelectedBookId] = useState(initial.bookId);
  const [chapterNum, setChapterNum]         = useState(initial.chapter);
  const [searchQuery, setSearchQuery]       = useState('');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [swipeDir, setSwipeDir]             = useState(null);
  const [pendingVerseTarget, setPendingVerseTarget] = useState(() => (
    initial.verse && !urlBookId
      ? { bookId: initial.bookId, chapter: initial.chapter, verse: initial.verse }
      : null
  ));

  // Infer testament from active book
  const activeBook = useMemo(() => getBookById(selectedBookId) || allBooks[0], [selectedBookId, allBooks]);
  const [testament, setTestament] = useState(activeBook.testament || 'new');

  // ── Reader State ─────────────────────────────────────────────────
  const [selectedVerses, setSelectedVerses] = useState([]); // array of vNum
  const [isMultiSelect, setIsMultiSelect]   = useState(false);
  const [activeFootnote, setActiveFootnote] = useState(null);
  const [copiedVerse, setCopiedVerse]       = useState(null);
  const [activeNoteVerse, setActiveNoteVerse] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isGoToModalOpen, setIsGoToModalOpen] = useState(false);
  const [isTranslationModalOpen, setIsTranslationModalOpen] = useState(false);
  const [isReaderSettingsOpen, setIsReaderSettingsOpen] = useState(false);
  const [activeTranslation, setActiveTranslation] = useState('cgkpv2011');
  const [toastMessage, setToastMessage] = useState(null);
  const [showSwipeHint, setShowSwipeHint] = useState(() => {
    return localStorage.getItem('bible_swipe_hint_seen') !== 'true';
  });

  // ── Load Chapter Data (React Query Cache) ────────────────────────
  const { data: chapterData, isLoading: isLoadingChapter, error: queryError, refetch } = useQuery({
    queryKey: ['chapter', activeBook.id, chapterNum],
    queryFn: () => getChapterContent(activeBook.id, chapterNum),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours caching in memory
  });

  // Chỉ hỏi server về audio của sách đang mở; không tải manifest của toàn bộ 73 sách.
  const { data: availableAudioChapters = [] } = useQuery({
    queryKey: ['bible-audio-availability', activeBook.id],
    queryFn: () => fetchBibleAudioAvailability(activeBook.id),
    staleTime: 1000 * 60 * 15,
  });

  const activeChapterTrackId = useMemo(() => (
    availableAudioChapters.find((item) => Number(item.chapter) === Number(chapterNum))?.trackId || null
  ), [availableAudioChapters, chapterNum]);
  
  const chapterError = queryError ? 'Không thể tải Lời Chúa. Vui lòng kiểm tra kết nối mạng.' : null;

  // Show auto-dismiss toast helper
  const triggerToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // ── Re-sync state when URL params change after mount ────────────
  useEffect(() => {
    if (!urlBookId) return;
    const book = getBookById(urlBookId);
    if (!book) return;
    const ch = Math.min(Math.max(parseInt(urlChapter, 10) || 1, 1), book.chapters);
    if (book.id !== selectedBookId) {
      setSelectedBookId(book.id);
      setTestament(book.testament || 'new');
    }
    if (ch !== chapterNum) {
      setChapterNum(ch);
    }
  }, [urlBookId, urlChapter]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Go-to input ─────────────────────────────────────────────────
  const [goToInput, setGoToInput]   = useState('');
  const [goToError, setGoToError]   = useState(false);
  const goToRef                     = useRef(null);

  // ── Audio State ──────────────────────────────────────────────────
  const [currentAudioTrack, setCurrentAudioTrack] = useState(null);
  const [activeAudioVerse, setActiveAudioVerse]   = useState(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  useEffect(() => {
    setCurrentAudioTrack(null);
    setActiveAudioVerse(null);
    setIsAudioLoading(false);
  }, [activeBook.id, chapterNum]);

  // ── Context ──────────────────────────────────────────────────────
  const {
    readingTheme,
    setReadingTheme,
    fontSize,
    setFontSize,
    showRedLetter,
    setShowRedLetter,
    lineHeight,
    setLineHeight,
    toggleBookmark,
    bookmarks,
  } = useLiturgy();
  const prefersReducedMotion = useReducedMotion();

  // ── Highlight Hook ───────────────────────────────────────────────
  const { getHighlight, setHighlight } = useVerseHighlight();

  // ── Note Hook ────────────────────────────────────────────────────
  const { getNote, saveNote, deleteNote } = useVerseNote();

  // ── Verse Refs (audio-text scroll) ───────────────────────────────
  const verseRefs = useRef({});
  const virtuosoRef = useRef(null);
  const queuedProgressRef = useRef(null);
  const progressSaveTimerRef = useRef(null);

  const flushReadingProgress = useCallback(() => {
    if (progressSaveTimerRef.current) {
      clearTimeout(progressSaveTimerRef.current);
      progressSaveTimerRef.current = null;
    }
    const queued = queuedProgressRef.current;
    if (queued) {
      saveBookReadingProgress(queued.bookId, queued.chapter, queued.verse);
      queuedProgressRef.current = null;
    }
  }, []);

  const queueReadingProgress = useCallback((bookId, chapter, verse) => {
    if (!bookId || !verse) return;
    queuedProgressRef.current = { bookId, chapter, verse };
    if (progressSaveTimerRef.current) clearTimeout(progressSaveTimerRef.current);
    progressSaveTimerRef.current = setTimeout(flushReadingProgress, 450);
  }, [flushReadingProgress]);

  // Ghi nốt vị trí cũ trước khi đổi sách/chương hoặc rời trang.
  useEffect(() => () => flushReadingProgress(), [activeBook.id, chapterNum, flushReadingProgress]);

  // ── Liturgy Info (today) — re-calculates at midnight ───────────────
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const msUntilMidnight = () => {
      const n = new Date();
      const midnight = new Date(n);
      midnight.setHours(24, 0, 0, 0);
      return midnight - n;
    };
    let timer;
    const schedule = () => {
      timer = setTimeout(() => { setNow(new Date()); schedule(); }, msUntilMidnight() + 500);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);
  const todayLiturgyInfo = useMemo(() => getLiturgyInfo(now), [now]);

  // ── Fetch dynamic Gospel reference & Title for current date ──────
  const { data: fetchedTodayLiturgyData } = useQuery({
    queryKey: ['todayLiturgyGospelRef', todayLiturgyInfo?.key, now.toDateString()],
    queryFn: async () => {
      if (!todayLiturgyInfo?.key) return null;
      const d = now;
      const mPadded = String(d.getMonth() + 1).padStart(2, '0');
      const dPadded = String(d.getDate()).padStart(2, '0');
      const mNum = String(d.getMonth() + 1);
      const dNum = String(d.getDate());

      const litYear = getLiturgicalYear(d);
      const sundayCycle = ["C", "A", "B"][litYear % 3];
      const weekdayCycle = (litYear % 2 === 0) ? "II" : "I";
      const targetCycle = todayLiturgyInfo.isSunday ? sundayCycle : (todayLiturgyInfo.season === 'thuong' ? weekdayCycle : 'all');

      const keysToFetch = Array.from(new Set([
        todayLiturgyInfo.key,
        todayLiturgyInfo.seasonKey,
        `feast_${mPadded}_${dPadded}`,
        `feast_${mNum}_${dNum}`,
        `fixed_${mPadded}_${dPadded}`,
        `fixed_${mNum}_${dNum}`
      ].filter(Boolean)));

      const { data } = await supabase
        .from('liturgy_contents')
        .select('title, gospel_ref, liturgy_key, cycle')
        .in('liturgy_key', keysToFetch);

      if (data && data.length > 0) {
        // Priority: match cycle === targetCycle -> match cycle === 'all' -> match any with gospel_ref -> fallback first row
        const match = data.find(item => item.gospel_ref && (item.cycle === targetCycle || item.cycle === 'all'))
          || data.find(item => item.gospel_ref)
          || data[0];
        
        return {
          title: match?.title || null,
          gospelRef: match?.gospel_ref || null
        };
      }
      return null;
    },
    staleTime: 1000 * 60 * 60,
  });

  const dynamicTodayLiturgyInfo = useMemo(() => ({
    ...todayLiturgyInfo,
    displayName: fetchedTodayLiturgyData?.title || todayLiturgyInfo.displayName,
    gospelRef: fetchedTodayLiturgyData?.gospelRef || 'Mt 13, 54-58'
  }), [todayLiturgyInfo, fetchedTodayLiturgyData]);

  const liturgyColor     = useMemo(() => getLiturgicalColor(dynamicTodayLiturgyInfo), [dynamicTodayLiturgyInfo]);
  const liturgyAccent    = LITURGY_ACCENT[liturgyColor] || LITURGY_ACCENT.amber;

  // ── Computed Data ────────────────────────────────────────────────
  const books = useMemo(() => (
    testament === 'old' ? getOldTestamentBooks() : getNewTestamentBooks()
  ), [testament]);

  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return books;
    const q = searchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return allBooks.filter(b => {
      const name = b.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const short = b.short.toLowerCase();
      const category = (b.category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return name.includes(q) || short.includes(q) || category.includes(q);
    });
  }, [books, allBooks, searchQuery]);

  // ── URL + per-book reading progress sync ────────────────────────
  useEffect(() => {
    navigate(`/bible/${activeBook.id}/${chapterNum}`, { replace: true });
    const restoredVerse = pendingVerseTarget?.bookId === activeBook.id
      && pendingVerseTarget?.chapter === chapterNum
      ? pendingVerseTarget.verse
      : 1;
    saveBookReadingProgress(activeBook.id, chapterNum, restoredVerse);
  }, [activeBook.id, chapterNum, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Click outside → close action bar / footnote ─────────────────
  useEffect(() => {
    const close = (e) => { 
      if (
        !isMultiSelect
        && !e.target.closest('.verse-action-bar')
        && !e.target.closest('.verse-item')
        && !e.target.closest('[data-preserve-verse-selection="true"]')
      ) {
        setSelectedVerses([]);
      }
      if (!e.target.closest('.footnote-popover')) {
        setActiveFootnote(null);
      }
    };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [isMultiSelect]);

  // ── Audio scroll ─────────────────────────────────────────────────
  useEffect(() => {
    if (activeAudioVerse && verseRefs.current[activeAudioVerse]) {
      verseRefs.current[activeAudioVerse].scrollIntoView({ behavior: 'smooth', block: 'center' });
      queueReadingProgress(activeBook.id, chapterNum, Number(activeAudioVerse));
    }
  }, [activeAudioVerse, activeBook.id, chapterNum, queueReadingProgress]);

  // ── Keyboard Shortcuts ───────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      const anyModalOpen = isSearchModalOpen || isImageModalOpen || !!activeNoteVerse || isMobileNavOpen || isTranslationModalOpen || isReaderSettingsOpen || isGoToModalOpen;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (anyModalOpen) return;
        e.preventDefault();
        if (e.key === 'ArrowLeft' && chapterNum > 1) {
          setSwipeDir('right');
          setChapterNum(prev => prev - 1);
          setSelectedVerses([]);
          setIsMultiSelect(false);
        } else if (e.key === 'ArrowRight' && chapterNum < activeBook.chapters) {
          setSwipeDir('left');
          setChapterNum(prev => prev + 1);
          setSelectedVerses([]);
          setIsMultiSelect(false);
        }
      }

      if (e.key === 'Escape') {
        if (isReaderSettingsOpen) { setIsReaderSettingsOpen(false); return; }
        if (isGoToModalOpen)      { setIsGoToModalOpen(false);      return; }
        if (isTranslationModalOpen) { setIsTranslationModalOpen(false); return; }
        if (isSearchModalOpen)     { setIsSearchModalOpen(false);      return; }
        if (isImageModalOpen)      { setIsImageModalOpen(false);       return; }
        if (activeNoteVerse)       { setActiveNoteVerse(null);         return; }
        if (isMobileNavOpen)       { setIsMobileNavOpen(false);        return; }
        setSelectedVerses([]);
        setIsMultiSelect(false);
        setActiveFootnote(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [chapterNum, activeBook.chapters, isSearchModalOpen, isImageModalOpen, activeNoteVerse, isMobileNavOpen, isTranslationModalOpen, isReaderSettingsOpen, isGoToModalOpen]);

  // ── Swipe Navigation ─────────────────────────────────────────────
  const dismissSwipeHint = useCallback(() => {
    if (showSwipeHint) {
      setShowSwipeHint(false);
      localStorage.setItem('bible_swipe_hint_seen', 'true');
    }
  }, [showSwipeHint]);

  const handleSwipeLeft = useCallback(() => {
    if (chapterNum < activeBook.chapters) {
      setSwipeDir('left');
      setChapterNum(prev => prev + 1);
      setSelectedVerses([]);
      setIsMultiSelect(false);
      dismissSwipeHint();
    }
  }, [chapterNum, activeBook.chapters, dismissSwipeHint]);

  const handleSwipeRight = useCallback(() => {
    if (chapterNum > 1) {
      setSwipeDir('right');
      setChapterNum(prev => prev - 1);
      setSelectedVerses([]);
      setIsMultiSelect(false);
      dismissSwipeHint();
    }
  }, [chapterNum, dismissSwipeHint]);

  const swipeRef = useSwipeNavigation({ onSwipeLeft: handleSwipeLeft, onSwipeRight: handleSwipeRight, disabled: isMobileNavOpen });

  // ── Handlers ─────────────────────────────────────────────────────
  const handleSelectBook = (bookId) => {
    const book = getBookById(bookId);
    if (!book) return;
    const savedPosition = getBookReadingProgress(bookId);
    const targetChapter = Math.min(Math.max(savedPosition?.chapter || 1, 1), book.chapters);
    const targetVerse = savedPosition?.verse || 1;

    setTestament(book.testament || 'new');
    setSelectedBookId(bookId);
    setChapterNum(targetChapter);
    setPendingVerseTarget({ bookId, chapter: targetChapter, verse: targetVerse });
    setIsMobileNavOpen(false);
    setSelectedVerses([]);
    setIsMultiSelect(false);
    setActiveAudioVerse(null);
    if (savedPosition) {
      triggerToast(`Tiếp tục ${book.name} · Chương ${targetChapter}, câu ${targetVerse}`);
    }
  };

  const handleNavigateToReference = useCallback(({ bookId, chapter, verse }) => {
    const targetBook = getBookById(bookId);
    if (!targetBook) return;

    const targetVerse = verse ? Number(verse) : null;
    setTestament(targetBook.testament || 'new');
    setSelectedBookId(targetBook.id);
    setChapterNum(chapter);
    setIsMobileNavOpen(false);
    setIsMultiSelect(false);
    setActiveAudioVerse(null);
    setSelectedVerses(targetVerse ? [targetVerse] : []);
    setPendingVerseTarget(targetVerse
      ? { bookId: targetBook.id, chapter, verse: targetVerse }
      : null);
    saveBookReadingProgress(targetBook.id, chapter, targetVerse || 1);
  }, []);

  const handlePrevChapter = () => {
    if (chapterNum > 1) { setSwipeDir('right'); setChapterNum(prev => prev - 1); setSelectedVerses([]); setIsMultiSelect(false); }
  };
  const handleNextChapter = () => {
    if (chapterNum < activeBook.chapters) { setSwipeDir('left'); setChapterNum(prev => prev + 1); setSelectedVerses([]); setIsMultiSelect(false); }
  };

  const handlePlayAudio = async () => {
    const isMp3Available = hasBibleChapterAudio(activeBook.id, chapterNum);
    if (!isMp3Available) {
      triggerToast(`Chương ${chapterNum} hiện chưa có bản thu Audio Studio MP3. Ban biên tập đang cập nhật!`);
      return;
    }

    if (isAudioLoading) return;
    setIsAudioLoading(true);
    try {
      let audioUrl = null;
      if (activeChapterTrackId) {
        audioUrl = await fetchAudioAccessStreamUrl(activeChapterTrackId);
      }
      if (!audioUrl) {
        const filename = getBibleAudioFilename(activeBook.id, chapterNum);
        const apiBase = getAudioApiBase();
        if (apiBase) {
          audioUrl = `${apiBase}/bible/${filename}`;
        }
      }
      if (!audioUrl) {
        triggerToast(`Chưa có bản thu audio cho ${activeBook.name} chương ${chapterNum}`);
        return;
      }
      setCurrentAudioTrack({
        title: `${activeBook.name} · Chương ${chapterNum}`,
        subtitle: chapterData?.title || 'Kinh Thánh Audio',
        category: activeBook.testament === 'old' ? 'Cựu Ước' : 'Tân Ước',
        url: audioUrl,
      });
    } catch (err) {
      triggerToast(`Không thể tải audio ${activeBook.name} chương ${chapterNum}`);
    } finally {
      setIsAudioLoading(false);
    }
  };

  const copyVerse = (vNum, text) => {
    navigator.clipboard.writeText(`${text} (${activeBook.short} ${chapterNum}, ${vNum})`);
    setCopiedVerse(vNum);
    setTimeout(() => setCopiedVerse(null), 2000);
  };

  const copyMultipleVerses = () => {
    if (!chapterData) return;
    const sorted = [...selectedVerses].sort((a, b) => a - b);
    const textToCopy = sorted.map(num => {
      const v = chapterData.verses.find(v => v.num === num);
      return v ? `[${num}] ${v.text}` : '';
    }).filter(Boolean).join('\n');
    const citation = `(${activeBook.short} ${chapterNum}, ${sorted.length > 1 ? `${sorted[0]}-${sorted[sorted.length-1]}` : sorted[0]})`;
    navigator.clipboard.writeText(`${textToCopy}\n${citation}`);
    setCopiedVerse('multi');
    setTimeout(() => setCopiedVerse(null), 2000);
  };

  const copyChapterLink = () => {
    const link = `${window.location.origin}/bible/${activeBook.id}/${chapterNum}`;
    navigator.clipboard.writeText(link);
    triggerToast('Đã sao chép liên kết chương Kinh Thánh!');
  };

  const toggleBookmarkVerse = (vNum, text) => {
    toggleBookmark(
      { title: `Kinh Thánh - ${activeBook.name}`, gospel_ref: `${activeBook.short} ${chapterNum}, ${vNum}`, gospel_quote: text },
      { displayName: `Kinh Thánh - ${activeBook.name}` },
      new Date()
    );
  };

  const isVerseBookmarked = (vNum) =>
    bookmarks.some(b => b.gospelRef === `${activeBook.short} ${chapterNum}, ${vNum}`);

  // ── Auto-scroll to selected verse when chapter loads ──────────────
  useEffect(() => {
    const hasPendingTarget = pendingVerseTarget
      && pendingVerseTarget.bookId === activeBook.id
      && pendingVerseTarget.chapter === chapterNum;
    const targetVerse = hasPendingTarget ? pendingVerseTarget.verse : selectedVerses[0];

    if (!isLoadingChapter && chapterData?.verses?.length > 0 && targetVerse != null) {
      const targetIndex = chapterData.verses.findIndex(v => Number(v.num) === Number(targetVerse));
      if (targetIndex === -1) {
        if (hasPendingTarget) setPendingVerseTarget(null);
        queueReadingProgress(activeBook.id, chapterNum, Number(chapterData.verses[0]?.num) || 1);
        return;
      }

      let attempts = 0;
      const attemptScroll = () => {
        if (virtuosoRef.current) {
          virtuosoRef.current.scrollToIndex({
            index: targetIndex,
            align: 'center',
            behavior: 'smooth'
          });
        }
        if (verseRefs.current[targetVerse]) {
          verseRefs.current[targetVerse].scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (hasPendingTarget) setPendingVerseTarget(null);
        } else if (attempts < 6) {
          attempts++;
          setTimeout(attemptScroll, 120);
        }
      };

      const timer = setTimeout(attemptScroll, 150);
      return () => clearTimeout(timer);
    }
  }, [isLoadingChapter, chapterData, selectedVerses, chapterNum, activeBook.id, pendingVerseTarget, queueReadingProgress]);

  // ── Go-to handler ────────────────────────────────────────────────
  const handleGoTo = useCallback((e) => {
    if (e && e.key && e.key !== 'Enter') return;
    const result = parseBibleReference(goToInput, allBooks);
    if (!result) {
      setGoToError(true);
      setTimeout(() => setGoToError(false), 1500);
      return;
    }
    const book = getBookById(result.bookId);
    if (book) setTestament(book.testament || 'new');
    setSelectedBookId(result.bookId);
    setChapterNum(result.chapter);
    setSelectedVerses(result.verse ? [result.verse] : []);
    setPendingVerseTarget(result.verse
      ? { bookId: result.bookId, chapter: result.chapter, verse: result.verse }
      : null);
    setIsMultiSelect(false);
    setGoToInput('');
    goToRef.current?.blur();
    saveBookReadingProgress(result.bookId, result.chapter, result.verse || 1);

    if (result.verse) {
      setTimeout(() => {
        verseRefs.current[result.verse]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [goToInput, allBooks]);

  // ── Theme helpers ────────────────────────────────────────────────
  const getThemeClass = () => {
    if (readingTheme === 'sepia') return 'theme-sepia';
    return '';
  };

  // Header nằm ngoài BiblePage, nên đồng bộ một class ở root trong lúc trang đọc dùng nền Giấy.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('reader-sepia', readingTheme === 'sepia');
    return () => root.classList.remove('reader-sepia');
  }, [readingTheme]);

  const initialVerseIndex = useMemo(() => {
    if (selectedVerses.length === 1 && chapterData?.verses) {
      const idx = chapterData.verses.findIndex(v => v.num === selectedVerses[0]);
      return idx !== -1 ? idx : 0;
    }
    return 0;
  }, [chapterData, selectedVerses]);

  const handleVisibleRangeChange = useCallback(({ startIndex }) => {
    const isRestoringSavedPosition = pendingVerseTarget?.bookId === activeBook.id
      && pendingVerseTarget?.chapter === chapterNum;
    if (isRestoringSavedPosition) return;

    const visibleVerse = chapterData?.verses?.[startIndex];
    if (visibleVerse?.num != null) {
      queueReadingProgress(activeBook.id, chapterNum, Number(visibleVerse.num));
    }
  }, [activeBook.id, chapterNum, chapterData, pendingVerseTarget, queueReadingProgress]);

  const FONT_SIZE_CLASSES = { normal: 'text-sm sm:text-base', medium: 'text-base sm:text-lg', large: 'text-lg sm:text-xl' };
  const getFontSizeClass = () => FONT_SIZE_CLASSES[fontSize] || FONT_SIZE_CLASSES.medium;

  const LINE_HEIGHT_CLASSES = { compact: 'leading-snug', normal: 'leading-normal', relaxed: 'leading-loose sm:leading-[2.5]' };
  const getLineHeightClass = () => LINE_HEIGHT_CLASSES[lineHeight] || LINE_HEIGHT_CLASSES.normal;

  // ── Render Footnotes (click popover) ─────────────────────────────
  // Class dùng chung cho số câu (dạng superscript nhỏ, không còn badge nền màu)
  // đầu dòng VÀ span-rỗng thay thế khi dòng không có số câu, để đảm bảo mép
  // trái nội dung luôn thẳng hàng tuyệt đối.
  const VERSE_INDENT_CLASS = 'w-4 sm:w-5 shrink-0';
  const VERSE_NUMBER_CLASS =
    'font-mono font-bold text-amber-700 dark:text-amber-400 select-none';

  const renderFullChapterContent = (rawContent) => {
    if (!rawContent) return null;
    const lines = rawContent.split('\n');

    return (
      <div className="full-chapter-reader font-serif space-y-3 px-2 sm:px-4 py-4 max-w-4xl mx-auto">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-2" />;

          // 1. Tiêu đề Phần lớn [PART]
          if (trimmed.startsWith('[PART]')) {
            const partText = trimmed.replace('[PART]', '').trim();
            return (
              <div key={idx} className="mt-8 mb-6 text-center border-y border-amber-300/40 dark:border-amber-700/40 py-3.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl shadow-2xs">
                <h3 className="text-base sm:text-lg md:text-xl font-black uppercase tracking-widest text-amber-900 dark:text-amber-200 font-serif">
                  {partText}
                </h3>
              </div>
            );
          }

          // 2. Tiêu đề Tiểu mục [SECTION]
          if (trimmed.startsWith('[SECTION]')) {
            const sectionText = trimmed.replace('[SECTION]', '').trim();
            return (
              <div key={idx} className="mt-6 mb-3 pt-2">
                <p className="text-sm sm:text-base md:text-lg font-bold italic text-amber-800 dark:text-amber-300 font-serif tracking-wide border-l-4 border-amber-500 pl-3.5 py-0.5">
                  {sectionText}
                </p>
              </div>
            );
          }

          // 3. Mọi dòng còn lại (thơ hay văn xuôi đều xử lý giống hệt nhau):
          //    - Nếu dòng bắt đầu bằng (số) -> cắt ra làm số câu nhỏ (superscript) cột trái.
          //    - Nếu không -> cột trái là span rỗng cùng kích thước, để mép
          //      trái nội dung luôn thẳng hàng bất kể dòng có số câu hay không.
          //    - Số câu nằm giữa dòng vẫn được tách thành số nhỏ (superscript) inline.
          const leadingMatch = trimmed.match(/^\((\d+[a-z]?|\d+-\d+)\)\s*(.*)/);
          const restOfLine = leadingMatch ? leadingMatch[2] : trimmed;

          // Tách các số câu còn sót lại nằm rải rác trong phần nội dung còn lại
          const parts = restOfLine.split(/(\(\d+[a-z]?\)|\(\d+-\d+\))/g).filter(Boolean);
          const contentElements = parts.map((part, i) => {
            const markerMatch = part.match(/^\((\d+[a-z]?|\d+-\d+)\)$/);
            if (markerMatch) {
              return (
                <sup
                  key={i}
                  className={`${VERSE_NUMBER_CLASS} text-[0.65em] mr-0.5 ml-0.5`}
                >
                  {markerMatch[1]}
                </sup>
              );
            }
            return (
              <span key={i} className="font-serif">
                {part}
              </span>
            );
          });

          // Badge/spacer đặt inline-block ngay đầu đoạn văn (không dùng flex),
          // nên nó chỉ chiếm chỗ trên DÒNG HIỂN THỊ ĐẦU TIÊN. Các dòng do
          // trình duyệt tự word-wrap tiếp theo sẽ tự quay về sát lề trái của
          // <p>, không bị "kéo lệch" theo toàn bộ chiều cao đoạn văn.
          return (
            <p
              key={idx}
              className={`${getLineHeightClass()} text-stone-800 dark:text-stone-200 ${getFontSizeClass()} my-1.5 px-1 py-0.5 rounded-xl hover:bg-amber-50/50 dark:hover:bg-stone-800/30 transition-colors`}
              style={{ textAlign: 'justify', textAlignLast: 'left' }}
            >
              {leadingMatch ? (
                <sup className={`${VERSE_NUMBER_CLASS} ${VERSE_INDENT_CLASS} inline-block text-[0.7em] text-left mr-1`}>
                  {leadingMatch[1]}
                </sup>
              ) : (
                <span className={`${VERSE_INDENT_CLASS} inline-block pointer-events-none`}>&nbsp;</span>
              )}
              <span className="font-serif">{contentElements}</span>
            </p>
          );
        })}
      </div>
    );
  };



  const renderVerseText = (text, footnotes) => {
    const formatPoeticLines = (content) => {
      if (!content || typeof content !== 'string' || !content.includes('\n')) return content;
      return (
        <span className="inline-block align-top w-full">
          {content.split('\n').map((line, lIdx) => (
            <span key={lIdx} className={`block ${lIdx > 0 ? 'pl-4 sm:pl-6 text-stone-700 dark:text-stone-300 font-serif leading-relaxed' : 'font-serif leading-relaxed'}`}>
              {line}
            </span>
          ))}
        </span>
      );
    };

    if (!footnotes?.length) return formatPoeticLines(text);

    return (
      <span className="relative">
        {formatPoeticLines(text)}
        {footnotes.map((fn, idx) => (
          <span key={idx} className="relative inline-block">
            <sup
              className="text-[0.65em] text-amber-600 dark:text-amber-400 font-bold ml-0.5 cursor-pointer p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/40"
              onClick={(e) => { e.stopPropagation(); setActiveFootnote(activeFootnote === fn.marker ? null : fn.marker); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveFootnote(activeFootnote === fn.marker ? null : fn.marker);
                }
              }}
              aria-label={`Xem chú giải ${fn.marker}`}
              role="button"
              tabIndex={0}
            >
              {fn.marker}
            </sup>
            <AnimatePresence>
              {activeFootnote === fn.marker && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 sm:w-64 p-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs rounded-xl shadow-xl z-50 font-sans footnote-popover"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="font-bold mb-1 text-amber-400 dark:text-amber-700 flex items-center justify-between">
                    <span>Chú giải {fn.marker}</span>
                    <button onClick={() => setActiveFootnote(null)} className="p-1 text-stone-400 hover:text-white dark:hover:text-stone-900" aria-label="Đóng chú giải">
                      <X size={12} />
                    </button>
                  </div>
                  <div className="leading-relaxed">{fn.text}</div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-900 dark:border-t-stone-100" />
                </motion.div>
              )}
            </AnimatePresence>
          </span>
        ))}
      </span>
    );
  };

  // ── Slide animation variants ──────────────────────────────────────
  const slideVariants = prefersReducedMotion
    ? {
        enter: { opacity: 0 },
        center: { opacity: 1, transition: { duration: 0.12 } },
        exit: { opacity: 0, transition: { duration: 0.1 } },
      }
    : {
        enter: (dir) => ({ x: dir === 'left' ? 16 : dir === 'right' ? -16 : 0, opacity: 0 }),
        center: { x: 0, opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
        exit: (dir) => ({ x: dir === 'left' ? -16 : dir === 'right' ? 16 : 0, opacity: 0, transition: { duration: 0.14 } }),
      };

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className={`bible-reader-page min-h-screen flex flex-col md:flex-row pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:pb-0 ${getThemeClass()}`}>

      {/* Desktop Sidebar */}
      <aside aria-label="Mục lục Kinh Thánh" className="hidden md:block w-[240px] lg:w-[260px] h-[calc(100vh-4rem)] sticky top-16 shrink-0 border-r border-stone-200 dark:border-stone-800">
        <BibleNavigationPanel
          testament={testament}
          setTestament={setTestament}
          setSelectedBookId={setSelectedBookId}
          setChapterNum={setChapterNum}
          chapterNum={chapterNum}
          activeBook={activeBook}
          filteredBooks={filteredBooks}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleSelectBook={handleSelectBook}
          todayLiturgyInfo={dynamicTodayLiturgyInfo}
          liturgyColor={liturgyColor}
          liturgyAccent={liturgyAccent}
          setIsMobileNavOpen={setIsMobileNavOpen}
          setSelectedVerses={setSelectedVerses}
          setIsMultiSelect={setIsMultiSelect}
          allBooks={allBooks}
          verseRefs={verseRefs}
          onNavigateToReference={handleNavigateToReference}
        />
      </aside>

      {/* Mobile book & chapter command bar */}
      <div className="md:hidden sticky top-16 z-30 h-16 bg-[#fffdf8]/92 px-3 py-2 backdrop-blur-xl dark:bg-stone-950/92">
        <div className="mx-auto flex h-12 max-w-lg items-center gap-1.5 rounded-[18px] border border-stone-200/80 bg-white/85 p-1 shadow-[0_8px_24px_-18px_rgba(28,25,23,.65)] dark:border-stone-700/80 dark:bg-stone-900/88">
          <button
            onClick={() => setIsMobileNavOpen(true)}
            className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[14px] px-2 text-left text-stone-800 transition-colors hover:bg-amber-50 active:bg-amber-100 dark:text-stone-100 dark:hover:bg-amber-950/35"
            aria-label={`Mở mục lục Kinh Thánh, sách hiện tại ${activeBook.name}`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-xs font-black text-amber-800 dark:bg-amber-900/45 dark:text-amber-300">
              {activeBook.short}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400">
                {testament === 'old' ? 'Cựu Ước' : 'Tân Ước'}
              </span>
              <span className="block truncate text-[13px] font-bold">{activeBook.name}</span>
            </span>
            <ChevronDown size={15} className="shrink-0 text-stone-400" />
          </button>

          <div className="flex h-10 shrink-0 items-center rounded-[14px] bg-stone-100/90 p-0.5 dark:bg-stone-800/90" aria-label="Điều hướng chương">
            <button onClick={handlePrevChapter} disabled={chapterNum <= 1} className="flex h-9 w-8 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-white hover:text-stone-900 disabled:opacity-30 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-white" aria-label="Chương trước"><ChevronLeft size={16} /></button>
            <span className="min-w-[48px] px-1 text-center leading-none">
              <span className="block text-[9px] font-semibold uppercase tracking-wide text-stone-400">Chương</span>
              <span className="mt-0.5 block text-xs font-black tabular-nums text-stone-800 dark:text-stone-100">{chapterNum}<span className="font-medium text-stone-400">/{activeBook.chapters}</span></span>
            </span>
            <button onClick={handleNextChapter} disabled={chapterNum >= activeBook.chapters} className="flex h-9 w-8 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-white hover:text-stone-900 disabled:opacity-30 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-white" aria-label="Chương sau"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {isMobileNavOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Đóng mục lục Kinh Thánh"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileNavOpen(false)}
              data-ui-layer="modal-backdrop"
              className="fixed inset-0 z-[80] bg-stone-950/40 backdrop-blur-[2px] md:hidden"
            />
            <motion.section
              initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }}
              transition={prefersReducedMotion ? { duration: 0.01 } : { type: 'spring', damping: 28, stiffness: 260 }}
              data-ui-layer="modal-content"
              className="fixed inset-x-0 bottom-0 z-[90] flex h-[88vh] flex-col overflow-hidden rounded-t-[30px] bg-[#f6f3ec] shadow-2xl dark:bg-stone-900 md:hidden"
              role="dialog" aria-modal="true" aria-label="Mục lục Kinh Thánh"
            >
              <div className="flex items-center justify-between border-b border-stone-200/80 px-4 py-3 dark:border-stone-800">
                <div>
                  <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400">Thư viện 73 sách</span>
                  <h3 className="font-serif text-lg font-bold">Mục lục Kinh Thánh</h3>
                </div>
                <button onClick={() => setIsMobileNavOpen(false)} className="reader-icon-control" aria-label="Đóng mục lục">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <BibleNavigationPanel
                  testament={testament}
                  setTestament={setTestament}
                  setSelectedBookId={setSelectedBookId}
                  setChapterNum={setChapterNum}
                  chapterNum={chapterNum}
                  activeBook={activeBook}
                  filteredBooks={filteredBooks}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  handleSelectBook={handleSelectBook}
                  todayLiturgyInfo={dynamicTodayLiturgyInfo}
                  liturgyColor={liturgyColor}
                  liturgyAccent={liturgyAccent}
                  setIsMobileNavOpen={setIsMobileNavOpen}
                  setSelectedVerses={setSelectedVerses}
                  setIsMultiSelect={setIsMultiSelect}
                  allBooks={allBooks}
                  verseRefs={verseRefs}
                  onNavigateToReference={handleNavigateToReference}
                />
              </div>
            </motion.section>
          </>
        )}
      </AnimatePresence>

      {/* Main Reader Container */}
      <main className="bible-reader-surface flex-1 max-w-5xl mx-auto w-full flex flex-col min-h-screen">

        <ReaderToolbar
          onOpenSearch={() => setIsSearchModalOpen(true)}
          onOpenTranslation={() => setIsTranslationModalOpen(true)}
          goToRef={goToRef}
          goToInput={goToInput}
          setGoToInput={setGoToInput}
          goToError={goToError}
          setGoToError={setGoToError}
          onGoTo={handleGoTo}
          onOpenGoToMobile={() => setIsGoToModalOpen(true)}
          onPrevious={handlePrevChapter}
          onNext={handleNextChapter}
          previousDisabled={chapterNum <= 1}
          nextDisabled={chapterNum >= activeBook.chapters}
          onOpenPreferences={() => setIsReaderSettingsOpen(true)}
        />

        {/* Dynamic Toast Popup */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] bg-stone-900 text-white px-4 py-2 rounded-full text-xs font-medium shadow-lg border border-stone-700 flex items-center gap-2"
            >
              <Info size={14} className="text-amber-400 shrink-0" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Swipeable Reader Content ───────────────────────────── */}
        <div ref={swipeRef} className="flex-1 overflow-hidden">
          <BookHero book={activeBook} />

          <AnimatePresence mode="wait" custom={swipeDir}>
            <motion.div
              key={`${activeBook.id}-${chapterNum}`}
              custom={swipeDir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="px-4 sm:px-8 md:px-12 pt-4 pb-6 sm:pt-5 sm:pb-8 space-y-7 max-w-3xl mx-auto w-full"
            >
              <ChapterMeta
                book={activeBook}
                chapter={chapterNum}
                title={chapterData?.title}
                isLoading={isLoadingChapter}
                onShare={copyChapterLink}
              />

              {/* Verses Area */}
              <div className={`font-serif-reading ${getFontSizeClass()} ${getLineHeightClass()} max-w-2xl mx-auto pb-16`} role="list">
                {isLoadingChapter ? (
                  <div className="py-24 flex flex-col items-center justify-center gap-4 text-stone-400">
                    <div className="relative flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full border-2 border-amber-500/20 animate-ping absolute" />
                      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
                        <BookOpen size={20} className="animate-pulse" />
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm font-medium tracking-wide text-stone-500 dark:text-stone-400 animate-pulse">Đang tải Lời Chúa...</p>
                  </div>
                ) : chapterError ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4 text-center px-4">
                    <div className="text-4xl">⚠️</div>
                    <p className="font-bold text-stone-700 dark:text-stone-300">{chapterError}</p>
                    <button
                      onClick={() => refetch()}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer"
                    >
                      Thử lại
                    </button>
                  </div>
                ) : chapterData?.fullContent ? (
                  renderFullChapterContent(chapterData.fullContent)
                ) : !chapterData?.verses || chapterData.verses.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-stone-400 gap-4 text-center px-4">
                    <p className="text-lg font-serif">Chưa có dữ liệu cho chương này.</p>
                    <p className="text-xs text-stone-500">Nội dung đang được cập nhật thêm trên dữ liệu hệ thống.</p>
                  </div>
                ) : (
                  <Virtuoso
                    ref={virtuosoRef}
                    useWindowScroll
                    initialTopMostItemIndex={initialVerseIndex}
                    data={chapterData.verses}
                    rangeChanged={handleVisibleRangeChange}
                    itemContent={(index, v) => {
                      const verseNumber = Number(v.num);
                      const isBm = isVerseBookmarked(verseNumber);
                      const isSelected = selectedVerses.some(num => Number(num) === verseNumber);
                      const isRedLetter = showRedLetter && v.speaker === 'jesus';
                      const isAudioActive = Number(activeAudioVerse) === verseNumber;
                      const highlightColor = getHighlight(activeBook.id, chapterNum, verseNumber);
                      const highlightClass = highlightColor ? HIGHLIGHT_COLORS[highlightColor]?.bg : null;
                      const hasNote = !!getNote(activeBook.id, chapterNum, verseNumber);

                      const handleVerseClick = (e) => {
                        e.stopPropagation();
                        setActiveFootnote(null);
                        saveBookReadingProgress(activeBook.id, chapterNum, verseNumber);
                        
                        if (isMultiSelect || e.shiftKey) {
                          if (!isMultiSelect) setIsMultiSelect(true);
                          setSelectedVerses(prev =>
                            prev.some(num => Number(num) === verseNumber)
                              ? prev.filter(num => Number(num) !== verseNumber)
                              : [...prev, verseNumber]
                          );
                        } else {
                          setSelectedVerses(isSelected ? [] : [verseNumber]);
                        }
                      };

                      return (
                        <div key={verseNumber}>
                          {/* Part Title / Heading lớn (VD: ĐỀ TỰA TỔNG QUÁT, I. PHẦN MỞ ĐẦU...) */}
                          {v.partTitle && (
                            <div className="mt-8 mb-4 text-center border-y border-amber-300/40 dark:border-amber-700/40 py-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl">
                              <h3 className="text-sm sm:text-base md:text-lg font-black uppercase tracking-widest text-amber-900 dark:text-amber-200 font-serif">
                                {v.partTitle}
                              </h3>
                            </div>
                          )}

                          {/* Section Title / Tiêu đề tiểu mục (VD: Người khôn tránh bạn xấu) */}
                          {v.sectionTitle && (
                            <div className="mt-6 mb-3 px-2">
                              <p className="text-sm sm:text-base font-bold italic text-amber-800 dark:text-amber-300 font-serif tracking-wide border-l-3 border-amber-500 pl-3">
                                {v.sectionTitle}
                              </p>
                            </div>
                          )}

                          <div
                            ref={el => { 
                              if (el) verseRefs.current[verseNumber] = el;
                              else delete verseRefs.current[verseNumber];
                            }}
                            role="listitem"
                            aria-selected={isSelected}
                            className="reader-verse relative group verse-item"
                          >
                          <div
                            onClick={handleVerseClick}
                            className={`flex gap-3 sm:gap-4 px-2.5 sm:px-4 py-3 sm:py-3.5 rounded-2xl cursor-pointer transition-all duration-200 ${
                              isSelected
                                ? 'bg-amber-100/80 dark:bg-amber-900/40 shadow-sm ring-1 ring-amber-300/80 dark:ring-amber-700/80'
                                : 'hover:bg-white/70 dark:hover:bg-stone-800/45'
                            }`}
                          >
                            <div className={`font-mono text-[10px] sm:w-7 pt-1.5 sm:pt-2 select-none flex flex-col items-center gap-1.5 ${
                              isSelected ? 'text-amber-800 dark:text-amber-300 font-bold' : 'text-stone-500 dark:text-stone-400'
                            }`}>
                              <span className={isBm ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-bold' : ''}>
                                {verseNumber}
                              </span>
                              {hasNote && <MessageSquarePlus size={10} className="text-emerald-500" />}
                            </div>

                            <div className="flex-1 space-y-3">
                              <p className={`text-stone-800 dark:text-stone-200 transition-colors ${
                                isRedLetter ? 'text-rose-700 dark:text-rose-400 font-medium' : ''
                              } ${isAudioActive ? 'bg-amber-200/60 dark:bg-amber-900/50 rounded-r-xl border-l-3 border-amber-500 -mx-2 px-3 py-1.5 shadow-xs font-medium' : ''} ${highlightClass || ''}`}>
                                {renderVerseText(v.text, v.footnotes)}
                              </p>
                            </div>
                          </div>

                          {isSelected && !isMultiSelect && selectedVerses.length === 1 && (
                            <div className="absolute left-8 sm:left-10 top-full z-20 -mt-1 verse-action-bar">
                              <VerseActionBar
                                verseNum={verseNumber}
                                verseText={v.text}
                                isBookmarked={isBm}
                                onBookmark={num => toggleBookmarkVerse(num, v.text)}
                                onShare={num => copyVerse(num, v.text)}
                                hasCopied={Number(copiedVerse) === verseNumber}
                                onHighlight={color => setHighlight(activeBook.id, chapterNum, verseNumber, color)}
                                currentHighlight={highlightColor}
                                onNote={num => setActiveNoteVerse(num)}
                                onMultiSelect={() => setIsMultiSelect(true)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                    }}
                  />
                )}
              </div>

              {/* Swipe hint — mobile (Dismissible / one-time) */}
              {showSwipeHint && (
                <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-stone-100/90 dark:bg-stone-800/90 rounded-full max-w-xs mx-auto md:hidden text-[10px] text-stone-500 dark:text-stone-400 select-none shadow-xs border border-stone-200/50 dark:border-stone-700/50">
                  <span className="flex items-center gap-1">
                    <span className="text-amber-600 font-bold">←</span> Vuốt ngang để chuyển chương <span className="text-amber-600 font-bold">→</span>
                  </span>
                  <button onClick={dismissSwipeHint} className="w-8 h-8 flex items-center justify-center -my-1 -mr-1 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 hover:text-stone-900 dark:hover:text-white" aria-label="Đóng hướng dẫn">
                    <X size={12} />
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Multi-Select Floating Bar ──────────────────────────── */}
        <AnimatePresence>
          {isMultiSelect && selectedVerses.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-4 whitespace-nowrap border border-stone-700"
            >
              <div className="text-sm font-bold bg-stone-800 px-3 py-1 rounded-lg">
                Đã chọn {selectedVerses.length} câu
              </div>
              <div className="flex gap-2">
                <button onClick={() => setIsImageModalOpen(true)} className="p-2 hover:bg-stone-700 rounded-xl transition-colors text-stone-300 hover:text-white" title="Tạo ảnh trích dẫn">
                  <ImageIcon size={18} />
                </button>
                <button onClick={copyMultipleVerses} className="p-2 hover:bg-stone-700 rounded-xl transition-colors text-stone-300 hover:text-white" title="Sao chép các câu đã chọn">
                  {copiedVerse === 'multi' ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                </button>
                <button onClick={() => { setIsMultiSelect(false); setSelectedVerses([]); }} className="p-2 hover:bg-stone-700 rounded-xl transition-colors text-stone-300 hover:text-white" title="Bỏ chọn">
                  <X size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ChapterNavigationCard
          book={activeBook}
          chapter={chapterNum}
          onPrevious={handlePrevChapter}
          onNext={handleNextChapter}
          onPlayAudio={handlePlayAudio}
          hasAudio={hasBibleChapterAudio(activeBook.id, chapterNum)}
          isAudioLoading={isAudioLoading}
        />
      </main>

      {/* Audio Player (floating) */}
      {currentAudioTrack && chapterData && (
        <BibleAudioPlayer
          currentTrack={currentAudioTrack}
          verses={chapterData.verses}
          onActiveVerse={setActiveAudioVerse}
          onClose={() => { setCurrentAudioTrack(null); setActiveAudioVerse(null); }}
        />
      )}

      {/* Translation Selection Modal */}
      <AnimatePresence>
        {isTranslationModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsTranslationModalOpen(false)}
              data-ui-layer="modal-backdrop"
              className="fixed inset-0 z-[80] bg-stone-900/40 dark:bg-stone-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              data-ui-layer="modal-content"
              className="fixed top-20 left-1/2 -translate-x-1/2 z-[90] w-full max-w-sm bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-4 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
                <h3 className="font-bold text-sm text-stone-900 dark:text-white flex items-center gap-2">
                  <Globe size={16} className="text-amber-600" />
                  <span>Chọn Bản Dịch Kinh Thánh</span>
                </h3>
                <button onClick={() => setIsTranslationModalOpen(false)} className="reader-icon-control !h-9 !w-9" aria-label="Đóng bảng chọn bản dịch">
                  <X size={16} />
                </button>
              </div>
              
              <div className="space-y-2">
                {[
                  { id: 'cgkpv2011', name: 'CGKPV 2011 (Phụng Vụ)', desc: 'Bản dịch Nhóm Phiên Dịch Các Giờ Kinh Phụng Vụ', active: true },
                  { id: 'tt1925', name: 'Bản Truyền Thống (1925)', desc: 'Bản dịch Kinh Thánh Tiếng Việt cổ điển', active: false },
                  { id: 'ntt', name: 'Lm. Nguyễn Thế Thuấn', desc: 'Bản dịch Dòng Chúa Cứu Thế', active: false }
                ].map(item => (
                  <button
                    key={item.id}
                    disabled={!item.active}
                    onClick={() => {
                      if (item.active) {
                        setActiveTranslation(item.id);
                        setIsTranslationModalOpen(false);
                      } else {
                        triggerToast(`Bản dịch ${item.name} sẽ sớm ra mắt trong phiên bản sắp tới.`);
                      }
                    }}
                    className={`w-full p-3 rounded-xl text-left border transition-all flex items-center justify-between ${
                      item.id === activeTranslation
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100'
                        : 'border-stone-200 text-stone-400 dark:border-stone-800 dark:text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-xs">{item.name}</p>
                      <p className="text-[10px] text-stone-500 mt-0.5">{item.desc}</p>
                    </div>
                    {item.id === activeTranslation ? (
                      <Check size={16} className="text-amber-600 shrink-0" />
                    ) : (
                      <span className="text-[9px] bg-stone-200 dark:bg-stone-800 text-stone-500 px-2 py-0.5 rounded-full">Sắp có</span>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ReaderPreferencesSheet
        isOpen={isReaderSettingsOpen}
        onClose={() => setIsReaderSettingsOpen(false)}
        fontSize={fontSize}
        setFontSize={setFontSize}
        lineHeight={lineHeight}
        setLineHeight={setLineHeight}
        readingTheme={readingTheme}
        setReadingTheme={setReadingTheme}
        showRedLetter={showRedLetter}
        setShowRedLetter={setShowRedLetter}
      />

      {/* Note Modal */}
      <NoteModal
        isOpen={!!activeNoteVerse}
        onClose={() => setActiveNoteVerse(null)}
        verseNum={activeNoteVerse}
        initialNote={activeNoteVerse ? getNote(activeBook.id, chapterNum, activeNoteVerse)?.text : ''}
        onSave={(text) => saveNote(activeBook.id, chapterNum, activeNoteVerse, text)}
        onDelete={() => deleteNote(activeBook.id, chapterNum, activeNoteVerse)}
      />

      {/* Quote Image Modal */}
      <QuoteImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        versesData={chapterData ? [...selectedVerses].sort((a,b) => a-b).map(num => ({
          num,
          text: chapterData.verses.find(v => v.num === num)?.text || ''
        })) : []}
        citation={`${activeBook.short} ${chapterNum}, ${selectedVerses.length > 1 ? `${Math.min(...selectedVerses)}-${Math.max(...selectedVerses)}` : selectedVerses[0]}`}
      />

      {/* Search Modal */}
      <BibleSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        allBooks={allBooks}
      />

      {/* Mobile Go-to Modal */}
      <AnimatePresence>
        {isGoToModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsGoToModalOpen(false)}
              data-ui-layer="modal-backdrop"
              className="fixed inset-0 z-[80] bg-stone-900/40 dark:bg-stone-950/60 backdrop-blur-sm sm:hidden"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              data-ui-layer="modal-content"
              className="fixed top-24 left-4 right-4 z-[90] bg-white dark:bg-stone-900 rounded-2xl shadow-xl overflow-hidden sm:hidden border border-stone-200 dark:border-stone-800"
            >
              <div className="p-4 flex items-center gap-3">
                <Compass size={18} className="text-amber-600 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={goToInput}
                  onChange={(e) => { setGoToInput(e.target.value); setGoToError(false); }}
                  onKeyDown={(e) => {
                    handleGoTo(e);
                    if (e.key === 'Enter' && !goToError) {
                      setIsGoToModalOpen(false);
                    }
                  }}
                  placeholder="Nhập địa chỉ câu (vd: Ga 3,16)"
                  className="flex-1 px-3 py-2 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button onClick={() => setIsGoToModalOpen(false)} className="p-2 bg-stone-200 dark:bg-stone-800 rounded-xl text-stone-600 dark:text-stone-300">
                  <X size={16} />
                </button>
              </div>
              {goToError && <p className="px-4 pb-3 text-rose-500 text-xs font-medium">Không tìm thấy địa chỉ câu này (vd: Ga 3,16).</p>}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}