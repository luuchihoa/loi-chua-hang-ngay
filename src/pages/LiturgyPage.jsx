import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Calendar, ChevronLeft, ChevronRight, Loader2, PlayCircle, 
  PauseCircle, CalendarDays, Copy, Share2, Check, Sparkles, Volume2, Square, ArrowUp,
  Maximize2, Minimize2, Search, X, Command, Tag, Bookmark, CalendarHeart, PenLine, Info
} from 'lucide-react';
import { usePageMotion } from '../hooks/usePageMotion.js';
import { getLiturgyInfo, getLiturgicalYear, getLiturgicalColor, findDateForLiturgyKey } from '../utils/liturgyCalendar.js';
import { getCachedLiturgy, setCachedLiturgy } from '../utils/liturgyCache.js';
import { useLiturgyTTS } from '../hooks/useLiturgyTTS.js';
import { supabase } from '../lib/supabase.js';
import { useLocation } from 'react-router-dom';
import { useLiturgy } from '../context/LiturgyContext.jsx';
import WeekRibbon from '../features/liturgy/components/WeekRibbon.jsx';
import DatePicker from '../features/liturgy/components/DatePicker.jsx';
import SearchResultItem from '../features/liturgy/components/SearchResultItem.jsx';
import { LITURGICAL_SYNONYMS, QUICK_SEARCH_CHIPS } from '../features/liturgy/config/search.js';
import SEO from '../components/seo/SEO.jsx';

function getLiturgicalCycles(year) {
  const sundayCycle = ["C", "A", "B"][year % 3];
  const weekdayCycle = (year % 2 === 0) ? "II" : "I";
  return { sundayCycle, weekdayCycle };
}

// ─────────────────────────────────────────────────────────────
// BẢNG MÀU PHỤNG VỤ ĐỘNG (Dynamic Liturgical Theme System)
// ─────────────────────────────────────────────────────────────
const LITURGICAL_THEMES = {
  amber: {
    name: 'Vàng / Trắng (Mùa Phục Sinh & Giáng Sinh / Lễ Trọng)',
    badgeBg: 'bg-amber-100/90 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200',
    accentText: 'text-amber-700 dark:text-amber-400',
    headingText: 'text-stone-900 dark:text-stone-100',
    borderAccent: 'border-amber-500 dark:border-amber-500',
    bgHover: 'hover:bg-amber-100/50 dark:hover:bg-amber-900/30',
    btnBg: 'theme-invariant bg-amber-600 hover:bg-amber-700 text-white shadow-amber-900/20',
    activeDay: 'theme-invariant bg-amber-600 text-white shadow-md shadow-amber-900/20 font-bold',
    todayDay: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100 font-bold',
    gospelCardBg: 'sm:bg-amber-50/40 sm:dark:bg-amber-950/20 sm:border-amber-400/50 sm:dark:border-amber-700/50',
    icon: 'text-amber-600 dark:text-amber-400',
    navBg: 'glass-panel border-amber-900/10 dark:border-amber-100/10',
    supColor: 'text-amber-600 dark:text-amber-400',
  },
  emerald: {
    name: 'Xanh Lá (Mùa Thường Niên)',
    badgeBg: 'bg-emerald-100/90 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700/60 text-emerald-900 dark:text-emerald-200',
    accentText: 'text-emerald-700 dark:text-emerald-400',
    headingText: 'text-stone-900 dark:text-stone-100',
    borderAccent: 'border-emerald-500 dark:border-emerald-500',
    bgHover: 'hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30',
    btnBg: 'theme-invariant bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/20',
    activeDay: 'theme-invariant bg-emerald-600 text-white shadow-md shadow-emerald-900/20 font-bold',
    todayDay: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100 font-bold',
    gospelCardBg: 'sm:bg-emerald-50/40 sm:dark:bg-emerald-950/20 sm:border-emerald-400/50 sm:dark:border-emerald-700/50',
    icon: 'text-emerald-600 dark:text-emerald-400',
    navBg: 'glass-panel border-emerald-900/10 dark:border-emerald-100/10',
    supColor: 'text-emerald-600 dark:text-emerald-400',
  },
  purple: {
    name: 'Tím (Mùa Vọng & Mùa Chay)',
    badgeBg: 'bg-purple-100/90 dark:bg-purple-950/60 border-purple-300 dark:border-purple-700/60 text-purple-900 dark:text-purple-200',
    accentText: 'text-purple-700 dark:text-purple-400',
    headingText: 'text-stone-900 dark:text-stone-100',
    borderAccent: 'border-purple-500 dark:border-purple-500',
    bgHover: 'hover:bg-purple-100/50 dark:hover:bg-purple-900/30',
    btnBg: 'theme-invariant bg-purple-600 hover:bg-purple-700 text-white shadow-purple-900/20',
    activeDay: 'theme-invariant bg-purple-600 text-white shadow-md shadow-purple-900/20 font-bold',
    todayDay: 'bg-purple-100 text-purple-900 dark:bg-purple-900/40 dark:text-purple-100 font-bold',
    gospelCardBg: 'sm:bg-purple-50/40 sm:dark:bg-purple-950/20 sm:border-purple-400/50 sm:dark:border-purple-700/50',
    icon: 'text-purple-600 dark:text-purple-400',
    navBg: 'glass-panel border-purple-900/10 dark:border-purple-100/10',
    supColor: 'text-purple-600 dark:text-purple-400',
  },
  rose: {
    name: 'Đỏ (Lễ Tử Đạo / Lễ Chúa Thánh Thần / Lễ Lá)',
    badgeBg: 'bg-rose-100/90 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700/60 text-rose-900 dark:text-rose-200',
    accentText: 'text-rose-700 dark:text-rose-400',
    headingText: 'text-stone-900 dark:text-stone-100',
    borderAccent: 'border-rose-500 dark:border-rose-500',
    bgHover: 'hover:bg-rose-100/50 dark:hover:bg-rose-900/30',
    btnBg: 'theme-invariant bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/20',
    activeDay: 'theme-invariant bg-rose-600 text-white shadow-md shadow-rose-900/20 font-bold',
    todayDay: 'bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100 font-bold',
    gospelCardBg: 'sm:bg-rose-50/40 sm:dark:bg-rose-950/20 sm:border-rose-400/50 sm:dark:border-rose-700/50',
    icon: 'text-rose-600 dark:text-rose-400',
    navBg: 'glass-panel border-rose-900/10 dark:border-rose-100/10',
    supColor: 'text-rose-600 dark:text-rose-400',
  }
};

// ─────────────────────────────────────────────────────────────
// PAGE COMPONENT MAIN
// ─────────────────────────────────────────────────────────────
export default function LiturgyPage() {
  const { heroReveal } = usePageMotion();
  const location = useLocation();
  const { 
    selectedDate, 
    setSelectedDate, 
    fontSize, 
    fontStyle, 
    setFontStyle,
    themeMode,
    cycleTheme,
    isBookmarked,
    toggleBookmark
  } = useLiturgy();

  const [liturgyInfo, setLiturgyInfo] = useState(null);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // State quản lý tùy chọn Bài đọc Ngày Thường & Bài đọc Lễ Nhớ
  const [readingModes, setReadingModes] = useState({ weekday: null, feast: null });
  const [activeReadingMode, setActiveReadingMode] = useState('weekday'); // 'weekday' | 'feast'
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const tooltipRef = useRef(null);

  // Lắng nghe sự kiện chạm/bấm ra ngoài khoảng trống (Click / Touch Outside) để tự động đóng Popover chú thích
  useEffect(() => {
    if (!showInfoTooltip) return;
    const handleClickOutside = (e) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target)) {
        setShowInfoTooltip(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showInfoTooltip]);
  
  // Custom Controls State & TTS Audio
  const tts = useLiturgyTTS();
  const [copied, setCopied] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Lắng nghe ngày truyền từ location state (Lịch Phụng Vụ / Bookmark)
  useEffect(() => {
    if (location.state?.date) {
      setSelectedDate(new Date(location.state.date));
    }
  }, [location.state]);

  // Phát hoặc dừng toàn bộ bài đọc trong ngày theo thứ tự (BĐ1 -> BĐ2 -> Tin Mừng)
  const handleToggleAudio = () => {
    if (tts.isPlaying) {
      if (tts.isPaused) {
        tts.resume();
      } else {
        tts.pause();
      }
    } else {
      const playlist = [];

      // 0. Tin Mừng Kiệu Lá (Nếu có trong Chúa Nhật Lễ Lá)
      if (processionReadings.length > 0 && processionReadings[0]?.content) {
        const proc = processionReadings[0];
        playlist.push({
          title: 'Tin Mừng Kiệu Lá',
          text: `Phúc Âm Kiệu Lá. ${proc.intro || ''}. ${proc.content || ''}`,
          ref: proc.ref,
          prefix: 'gospel'
        });
      }

      // 1. Bài Đọc 1
      if (r1Options[r1AltIdx]?.content || activeContent?.r1_content) {
        playlist.push({
          title: 'Bài Đọc 1',
          text: `Bài đọc 1. ${r1Options[r1AltIdx]?.intro || activeContent?.r1_intro || ''}. ${r1Options[r1AltIdx]?.content || activeContent?.r1_content || ''}`,
          ref: r1Options[r1AltIdx]?.ref || activeContent?.r1_ref,
          prefix: 'r1'
        });
      }

      // 2. Bài Đọc 2
      if (r2Options[r2AltIdx]?.content || activeContent?.r2_content) {
        playlist.push({
          title: 'Bài Đọc 2',
          text: `Bài đọc 2. ${r2Options[r2AltIdx]?.intro || activeContent?.r2_intro || ''}. ${r2Options[r2AltIdx]?.content || activeContent?.r2_content || ''}`,
          ref: r2Options[r2AltIdx]?.ref || activeContent?.r2_ref,
          prefix: 'r2'
        });
      }

      // 2.5 Các Bài Đọc Phụ
      if (standardExtraReadings.length > 0) {
        standardExtraReadings.forEach((extra, idx) => {
          if (extra.content) {
            const extraTitle = extra.title || (idx < 5 ? `Bài Đọc ${idx + 3}` : "Thánh Thư");
            playlist.push({
              title: extraTitle,
              text: `${extraTitle}. ${extra.intro || ''}. ${extra.content || ''}`,
              ref: extra.ref,
              prefix: 'r1'
            });
          }
        });
      }

      // 3. Tin Mừng
      if (gospelOptions[gospelAltIdx]?.content || activeContent?.gospel_content) {
        playlist.push({
          title: 'Tin Mừng',
          text: `Phúc Âm. ${gospelOptions[gospelAltIdx]?.intro || activeContent?.gospel_intro || ''}. ${gospelOptions[gospelAltIdx]?.content || activeContent?.gospel_content || ''}`,
          ref: gospelOptions[gospelAltIdx]?.ref || activeContent?.gospel_ref,
          prefix: 'gospel'
        });
      }

      if (playlist.length > 0) {
        tts.playPlaylist(playlist);
      }
    }
  };

  // Helper render nút nghe riêng từng bài đọc (Bài Đọc 1, Đáp Ca, Bài Đọc 2, Tin Mừng)
  const renderSectionAudioBadge = (sectionTitle, textContent, refString, prefix) => {
    const isCurrentSection = tts.currentSection?.includes(sectionTitle);
    const isPlayingThis = tts.isPlaying && isCurrentSection;
    const isPausedThis = tts.isPaused && isCurrentSection;

    return (
      <div className="flex justify-center my-2">
        <button
          onClick={() => {
            if (isPlayingThis) {
              if (isPausedThis) tts.resume();
              else tts.pause();
            } else {
              tts.playAudioOrMp3(textContent, sectionTitle, refString, prefix);
            }
          }}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold transition-all active:scale-95 shadow-2xs border ${
            isPlayingThis
              ? 'bg-amber-500 text-white border-amber-600 shadow-sm animate-pulse'
              : 'bg-amber-50/90 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/60'
          }`}
          title={isPlayingThis ? (isPausedThis ? "Tiếp tục" : "Tạm dừng") : `Nghe riêng ${sectionTitle}`}
        >
          {isPlayingThis ? (
            isPausedThis ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          )}
          <span>
            {isPlayingThis
              ? (isPausedThis ? `Tạm dừng ${sectionTitle}` : `Đang đọc ${sectionTitle}...`)
              : `Nghe ${sectionTitle}`}
          </span>
        </button>
      </div>
    );
  };

  // Trạng thái mở dropdown chọn ngày & ô tìm kiếm
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pickerRef = useRef(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [overrideLiturgyItem, setOverrideLiturgyItem] = useState(null);
  // Chỉ số kết quả đang được highlight bằng phím mũi tên (điều hướng bàn phím)
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  // Chỉ hiện "Mẹo tra cứu" cho tới khi người dùng tự đóng nó (lưu vào localStorage)
  const [showSearchTip, setShowSearchTip] = useState(() => {
    try {
      return !localStorage.getItem('liturgy_search_tip_seen');
    } catch {
      return true;
    }
  });
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const modalRef = useRef(null);
  // Lưu DOM node của từng kết quả (theo flatIndex) để cuộn theo khi điều hướng bằng bàn phím
  const optionRefs = useRef({});
  // Chặn hover-highlight "giả" khi danh sách tự cuộn dưới chuột đứng yên (do phím ↑↓ gây ra).
  // Chỉ bỏ chặn khi chuột thực sự di chuyển (mousemove), không tính việc nội dung trôi tới dưới chuột.
  const suppressHoverRef = useRef(false);

  // Lắng nghe phím tắt toàn cục Cmd+K / Ctrl+K / Esc để bật/tắt Modal Tìm kiếm
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  // Tự động focus vào input khi Modal Tìm kiếm mở
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 80);
      return () => clearTimeout(timer);
    }
  }, [isSearchOpen]);

  // Quản lý tạm dừng Lenis & khóa cuộn body khi mở Modal Tìm kiếm (Kiểm tra an toàn phương thức start/stop)
  useEffect(() => {
    if (isSearchOpen) {
      document.body.style.overflow = 'hidden';
      if (typeof window.lenis?.stop === 'function') {
        window.lenis.stop();
      }
    } else {
      document.body.style.overflow = '';
      if (typeof window.lenis?.start === 'function') {
        window.lenis.start();
      }
    }
    return () => {
      document.body.style.overflow = '';
      if (typeof window.lenis?.start === 'function') {
        window.lenis.start();
      }
    };
  }, [isSearchOpen]);

  // Phân loại kết quả tìm kiếm theo nhóm (Lễ Trọng/Kính, Bài Đọc/Phúc Âm, Suy Niệm)
  const categorizedSearchResults = useMemo(() => {
    if (!searchResults || searchResults.length === 0) return { feasts: [], readings: [], reflections: [] };
    const feasts = [];
    const readings = [];
    const reflections = [];

    searchResults.forEach((item) => {
      const key = item.liturgy_key || '';
      const titleLower = (item.title || '').toLowerCase();

      if (key.startsWith('feast_') || key.startsWith('fixed_') || titleLower.includes('lễ ')) {
        feasts.push(item);
      } else if (item.gospel_ref || item.r1_ref || item.r2_ref) {
        readings.push(item);
      } else {
        reflections.push(item);
      }
    });

    return { feasts, readings, reflections };
  }, [searchResults]);

  // Danh sách phẳng theo đúng thứ tự hiển thị (Lễ -> Bài Đọc -> Suy Niệm), dùng để đồng bộ
  // chỉ số highlight khi điều hướng bằng phím mũi tên
  const flatResults = useMemo(
    () => [
      ...categorizedSearchResults.feasts,
      ...categorizedSearchResults.readings,
      ...categorizedSearchResults.reflections,
    ],
    [categorizedSearchResults]
  );

  // Reset vị trí highlight mỗi khi đóng modal hoặc danh sách kết quả thay đổi
  useEffect(() => {
    if (!isSearchOpen) {
      setHighlightedIndex(-1);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchResults]);

  // Tự động cuộn kết quả đang highlight vào vùng nhìn thấy khi điều hướng bằng ArrowUp/ArrowDown
  useEffect(() => {
    if (highlightedIndex < 0) return;
    const el = optionRefs.current[highlightedIndex];
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [highlightedIndex]);

  // Tô sáng từ khóa tìm kiếm trong kết quả (Highlighting)
  const highlightSearchText = (text, query) => {
    if (!text || !query.trim()) return text;
    const q = query.trim();
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      part.toLowerCase() === q.toLowerCase() ? (
        <mark key={i} className="bg-amber-200 dark:bg-amber-900/80 text-amber-950 dark:text-amber-100 font-bold px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Xác định theme màu phụng vụ
  const colorKey = getLiturgicalColor(liturgyInfo);
  const theme = LITURGICAL_THEMES[colorKey] || LITURGICAL_THEMES.amber;

  // Click outside để đóng dropdown chọn ngày & dropdown tìm kiếm
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setIsPickerOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounce search truy vấn Supabase (kèm Mở Rộng Từ Khóa Thông Minh & Trường r1_info, r2_info, gospel_info)
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const qLower = q.toLowerCase();
        let searchTerms = [q];

        // Mở rộng từ khóa thông minh (Synonym & Season Mapping)
        Object.keys(LITURGICAL_SYNONYMS).forEach(key => {
          if (qLower.includes(key)) {
            searchTerms = Array.from(new Set([...searchTerms, ...LITURGICAL_SYNONYMS[key]]));
          }
        });

        const fields = [
          'title', 'gospel_ref', 'r1_ref', 'r2_ref', 'quote', 'reflection',
          'gospel_intro', 'r1_intro', 'r2_intro', 'liturgy_key'
        ];

        const orConditions = searchTerms.flatMap(term => 
          fields.map(field => `${field}.ilike."%${term}%"`)
        ).join(',');

        const { data, error } = await supabase
          .from('liturgy_contents')
          .select('id, liturgy_key, cycle, title, quote, r1_ref, r2_ref, gospel_ref, r1_intro, r2_intro, gospel_intro')
          .or(orConditions)
          .limit(40);

        if (!error && data) {
          // Ưu tiên Đại lễ / Chúa Nhật & Kết quả khớp chính xác từ khóa lên vị trí đầu tiên
          const sortedData = [...data].sort((a, b) => {
            const aTitle = (a.title || '').toLowerCase();
            const bTitle = (b.title || '').toLowerCase();
            const aKey = (a.liturgy_key || '').toLowerCase();
            const bKey = (b.liturgy_key || '').toLowerCase();

            // 1. Điểm khớp chính xác tiêu đề hoặc liturgy_key của Đại lễ
            const isAExactFeast = aKey === 'feast_phuc_sinh' || aTitle === 'chúa nhật phục sinh' || aTitle === qLower || aKey === `feast_${qLower}`;
            const isBExactFeast = bKey === 'feast_phuc_sinh' || bTitle === 'chúa nhật phục sinh' || bTitle === qLower || bKey === `feast_${qLower}`;
            if (isAExactFeast && !isBExactFeast) return -1;
            if (!isAExactFeast && isBExactFeast) return 1;

            // 2. Điểm ưu tiên Lễ Trọng / Lễ Kính (khởi đầu bằng feast_, fixed_ hoặc tiêu đề là Chúa Nhật / Lễ)
            const isAFeast = aKey.startsWith('feast_') || aKey.startsWith('fixed_') || aTitle.startsWith('chúa nhật') || aTitle.startsWith('lễ ');
            const isBFeast = bKey.startsWith('feast_') || bKey.startsWith('fixed_') || bTitle.startsWith('chúa nhật') || bTitle.startsWith('lễ ');
            if (isAFeast && !isBFeast) return -1;
            if (!isAFeast && isBFeast) return 1;

            // 3. Ưu tiên tiêu đề có chứa từ khóa trực tiếp
            const aMatchTitle = aTitle.includes(qLower);
            const bMatchTitle = bTitle.includes(qLower);
            if (aMatchTitle && !bMatchTitle) return -1;
            if (!aMatchTitle && bMatchTitle) return 1;

            return 0;
          });
          setSearchResults(sortedData);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error(err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Chọn 1 kết quả từ danh sách tìm kiếm
  const handleSelectSearchResult = async (item) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setOverrideLiturgyItem(item);

    // Dò tìm ngày chuẩn xác trong lịch phụng vụ tương ứng với bài đọc được chọn (chuẩn theo Cycle A, B, C)
    const targetDate = findDateForLiturgyKey(item.liturgy_key, selectedDate.getFullYear(), item.cycle);
    if (targetDate) {
      setSelectedDate(targetDate);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Nếu là ngày lễ cố định tháng/ngày
      const matchFeast = item.liturgy_key.match(/(?:feast|fixed)_(\d{1,2})_(\d{1,2})/);
      if (matchFeast) {
        const month = parseInt(matchFeast[1], 10) - 1;
        const day = parseInt(matchFeast[2], 10);
        const newDate = new Date(selectedDate.getFullYear(), month, day);
        setSelectedDate(newDate);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        // Fallback: Nếu không tìm thấy ngày trên lịch, cuộn trang lên đầu để xem bài đọc tra cứu
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  // Điều hướng bàn phím trong modal tìm kiếm: ArrowUp/ArrowDown chọn kết quả,
  // Enter xác nhận, Tab giữ focus bên trong modal (focus trap đơn giản)
  const handleSearchModalKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      if (flatResults.length === 0) return;
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      if (flatResults.length === 0) return;
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (flatResults.length === 0) return;
      e.preventDefault();
      const item = highlightedIndex >= 0 ? flatResults[highlightedIndex] : flatResults[0];
      if (item) handleSelectSearchResult(item);
    } else if (e.key === 'Tab') {
      const focusables = modalRef.current?.querySelectorAll(
        'input, button, [href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) return;
      const list = Array.from(focusables);
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const handleDateChange = (newDate) => {
    setOverrideLiturgyItem(null);
    setSelectedDate(newDate);
  };

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    handleDateChange(newDate);
  };

  useEffect(() => {
    const fetchFullReading = async () => {
      setLoading(true);
      try {
        const info = getLiturgyInfo(selectedDate);
        setLiturgyInfo(info);

        // ⚡ Kiểm tra Cache theo Ngày (chỉ dùng cache nếu người dùng không bấm kết quả tìm kiếm)
        if (!overrideLiturgyItem) {
          const cached = getCachedLiturgy(selectedDate, 'page');
          if (cached) {
            setContent(cached);
            setLoading(false);
            return;
          }
        }

        const lityear = getLiturgicalYear(selectedDate);
        const cycles = getLiturgicalCycles(lityear);
        const isSpecialABCFeast = [
          'feast_phep_rua',
          'feast_thanh_tam',
          'feast_gia_that',
          'feast_tet_1',
          'feast_ba_ngoi',
          'feast_minh_mau_chua',
          'feast_hien_xuong',
          'feast_chua_thang_thien',
          'tuan_thanh_thu7',
          'feast_thu7_tuan_thanh'
        ].includes(info.key) || (info.key && info.key.includes('phep_rua'));
        
        let currentCycle;
        if (info.isSunday || isSpecialABCFeast) {
          currentCycle = cycles.sundayCycle;
        } else if (info.season === 'thuong') {
          currentCycle = cycles.weekdayCycle;
        } else {
          currentCycle = 'all';
        }
        
        const dayStr = String(selectedDate.getDate()).padStart(2, '0');
        const monthStr = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const datePrefix = `Ngày ${dayStr} tháng ${monthStr}`;

        const mPadded = monthStr;
        const dPadded = dayStr;
        const mNum = String(selectedDate.getMonth() + 1);
        const dNum = String(selectedDate.getDate());

        const keysToFetch = Array.from(new Set([
          overrideLiturgyItem?.liturgy_key,
          info.key,
          `feast_${mPadded}_${dPadded}`,
          `feast_${mNum}_${dNum}`,
          `fixed_${mPadded}_${dPadded}`,
          `fixed_${mNum}_${dNum}`,
          info.seasonKey
        ].filter(Boolean)));

        const { data, error } = await supabase
          .from('liturgy_contents')
          .select('*')
          .in('liturgy_key', keysToFetch);

        if (!error && data && data.length > 0) {
          const getDataForKey = (targetKey, preferredCycle = null) => {
            if (!targetKey) return null;
            const matches = data.filter(d => d.liturgy_key === targetKey);
            if (matches.length === 0) return null;

            // Xác định chu kỳ cần lấy
            const reqCycle = preferredCycle || cycles.sundayCycle; // Thường là A, B hoặc C

            // 1. Phân loại 3 dòng dữ liệu với 3 cấp độ
            // Cấp 1: Dòng chứa Năm Chúa Nhật (A, B, C)
            const sundayRow = matches.find(d => d.cycle === reqCycle || d.cycle === cycles.sundayCycle);
            // Cấp 2: Dòng chứa Năm Ngày Thường (I, II)
            const weekdayRow = matches.find(d => d.cycle === cycles.weekdayCycle);
            // Cấp 3: Dòng chung (all)
            const allRow = matches.find(d => d.cycle === 'all');
            
            // Dòng dự phòng (nếu Database nhập sai chuẩn, không có A, B, C, I, II, all)
            const fallbackRow = matches.find(d => d.cycle !== 'all' && d.cycle !== 'I' && d.cycle !== 'II' && !['A','B','C'].includes(d.cycle)) || matches[0];

            const merged = {};
            const allFields = [
              'title', 'quote', 
              'r1_ref', 'r1_quote', 'r1_intro', 'r1_content', 
              'psalm_ref', 'psalm_content', 
              'r2_ref', 'r2_quote', 'r2_intro', 'r2_content', 
              'gospel_ref', 'gospel_alleluia', 'gospel_intro', 'gospel_content', 
              'reflection', 'extra_readings'
            ];

            const isNonEmpty = (val) => {
              if (!val) return false;
              if (Array.isArray(val)) return val.length > 0;
              const plainText = val.toString().replace(/<[^>]*>/g, '').trim();
              return plainText.length > 0;
            };

            // 2. Trộn dữ liệu theo thứ tự ưu tiên: Sunday > Weekday > All > Fallback
            for (const f of allFields) {
              const valFromSunday = sundayRow?.[f];
              const valFromWeekday = weekdayRow?.[f];
              const valFromAll = allRow?.[f];
              const valFromFallback = fallbackRow?.[f];

              if (isNonEmpty(valFromSunday)) {
                merged[f] = valFromSunday;       // Có A/B/C -> Lấy ngay
              } else if (isNonEmpty(valFromWeekday)) {
                merged[f] = valFromWeekday;      // Thiếu A/B/C -> Lấy I/II
              } else if (isNonEmpty(valFromAll)) {
                merged[f] = valFromAll;          // Thiếu I/II -> Lấy all
              } else if (isNonEmpty(valFromFallback)) {
                merged[f] = valFromFallback;     // Quá xui, lấy dự phòng
              }
            }

            return Object.keys(merged).length > 0 ? merged : null;
          };
          // const getDataForKey = (targetKey, preferredCycle = null) => {
          //   if (!targetKey) return null;
          //   const matches = data.filter(d => d.liturgy_key === targetKey);
          //   if (matches.length === 0) return null;

          //   const reqCycle = preferredCycle || cycles.sundayCycle;
          //   // 1. Tìm chính xác dòng khớp với Chu kỳ Năm hiện tại (A, B, C hoặc I, II)
          //   const exactCycleRow = matches.find(d => d.cycle === reqCycle || d.cycle === cycles.sundayCycle || d.cycle === cycles.weekdayCycle);
            
          //   // 2. Tìm dòng cycle = 'all' (Chứa dữ liệu chung B & C hoặc thông tin cố định)
          //   const allRow = matches.find(d => d.cycle === 'all');
            
          //   // 3. Dòng dự phòng cuối cùng (chỉ dùng khi hoàn toàn KHÔNG CÓ dòng trùng năm lẫn dòng 'all')
          //   const fallbackRow = matches.find(d => d.cycle !== 'all') || matches[0];

          //   // Nếu có exactCycleRow thì lấy exactCycleRow; nếu không thì lấy allRow; nếu không có cả 2 mới lấy fallbackRow
          //   const cycleRow = exactCycleRow || (allRow ? null : fallbackRow);

          //   const merged = {};
          //   const allFields = [
          //     'title', 'quote', 
          //     'r1_ref', 'r1_quote', 'r1_intro', 'r1_content', 
          //     'psalm_ref', 'psalm_content', 
          //     'r2_ref', 'r2_quote', 'r2_intro', 'r2_content', 
          //     'gospel_ref', 'gospel_alleluia', 'gospel_intro', 'gospel_content', 
          //     'reflection', 'extra_readings'
          //   ];

          //   const isNonEmpty = (val) => {
          //     if (!val) return false;
          //     if (Array.isArray(val)) return val.length > 0;
          //     const plainText = val.toString().replace(/<[^>]*>/g, '').trim();
          //     return plainText.length > 0;
          //   };

          //   for (const f of allFields) {
          //     const valFromCycle = cycleRow?.[f];
          //     const valFromAll = allRow?.[f];

          //     if (isNonEmpty(valFromCycle)) {
          //       merged[f] = valFromCycle;
          //     } else if (isNonEmpty(valFromAll)) {
          //       merged[f] = valFromAll;
          //     }
          //   }

          //   return Object.keys(merged).length > 0 ? merged : null;
          // };

          const feastData = getDataForKey(info.key) 
                         || getDataForKey(`feast_${mPadded}_${dPadded}`) 
                         || getDataForKey(`fixed_${mPadded}_${dPadded}`)
                         || getDataForKey(`feast_${mNum}_${dNum}`)
                         || getDataForKey(`fixed_${mNum}_${dNum}`);
                         
          const weekdayData = info.seasonKey ? getDataForKey(info.seasonKey) : null;
          
          let selectedData = null;

          // Ưu tiên hiển thị bài đọc nếu người dùng chọn trực tiếp từ ô tìm kiếm
          if (overrideLiturgyItem && overrideLiturgyItem.liturgy_key) {
            const overrideData = getDataForKey(overrideLiturgyItem.liturgy_key, overrideLiturgyItem.cycle);
            if (overrideData) {
              const cycleTag = overrideLiturgyItem.cycle && overrideLiturgyItem.cycle !== 'all' ? ` (Năm ${overrideLiturgyItem.cycle})` : '';
              selectedData = {
                ...overrideData,
                title: overrideData.title ? `${overrideData.title}${cycleTag}` : (overrideLiturgyItem.title || 'Kết quả tra cứu')
              };
            }
          }

          if (!selectedData) {
            const hasFeastReadings = feastData && (
              (feastData.gospel_ref && feastData.gospel_ref.trim() !== '') || 
              (feastData.r1_ref && feastData.r1_ref.trim() !== '') ||
              (feastData.gospel_content && feastData.gospel_content.trim() !== '')
            );

            const hasWeekdayReadings = weekdayData && (
              (weekdayData.gospel_ref && weekdayData.gospel_ref.trim() !== '') || 
              (weekdayData.r1_ref && weekdayData.r1_ref.trim() !== '')
            );

            const isMemorialFeast = info.feastType === 'memorial_obligatory' || info.feastType === 'memorial_optional';

            if (isMemorialFeast && hasFeastReadings && hasWeekdayReadings) {
              // CẢ 2 BÀI ĐỌC ĐỀU TỒN TẠI TRONG NGÀY LỄ NHỚ: TẠO 2 OPTION CHO NGƯỜI DÙNG CHỌN TAB
              const saintName = info.displayName || feastData.title || weekdayData.title || 'Lễ Nhớ';

              const weekdayOption = {
                ...weekdayData,
                title: `${datePrefix} - ${saintName} - ${info.feastTypeName || 'Lễ Nhớ'}`,
                saintName
              };

              const mergedFeast = { ...weekdayData };
              for (let k in feastData) {
                if (feastData[k] && feastData[k].toString().trim() !== "") {
                  mergedFeast[k] = feastData[k];
                }
              }

              const feastOption = {
                ...mergedFeast,
                title: `${datePrefix} - ${saintName} - ${info.feastTypeName || 'Lễ Nhớ'}`,
                saintName
              };

              setReadingModes({ weekday: weekdayOption, feast: feastOption });
              setActiveReadingMode('weekday'); // MẶC ĐỊNH LÀ Bài đọc Lễ Thường DÀNH CHO LỄ NHỚ
              selectedData = weekdayOption;
            } else if (feastData) {
              setReadingModes({ weekday: null, feast: null });
              const mergedContent = { ...(weekdayData || {}) };
              for (let k in feastData) {
                if (feastData[k] && feastData[k].toString().trim() !== "") {
                  mergedContent[k] = feastData[k];
                }
              }

              const saintName = info.displayName || mergedContent.title || 'Lễ Nhớ';
              const displayTitle = (info.feastType === 'memorial_obligatory' || info.feastType === 'memorial_optional')
                ? `${datePrefix} - ${saintName} - ${info.feastTypeName || 'Lễ Nhớ'}`
                : (feastData.title || mergedContent.title || `${datePrefix} - ${saintName}`);

              selectedData = {
                ...mergedContent,
                title: displayTitle
              };
            } else if (weekdayData) {
              setReadingModes({ weekday: null, feast: null });
              const saintName = info.displayName || weekdayData.title || 'Lễ Nhớ';
              const displayTitle = (info.feastType === 'memorial_obligatory' || info.feastType === 'memorial_optional')
                ? `${datePrefix} - ${saintName} - ${info.feastTypeName || 'Lễ Nhớ'}`
                : (weekdayData.title?.toLowerCase().startsWith('ngày') ? weekdayData.title : `${datePrefix} - ${weekdayData.title || saintName}`);

              selectedData = {
                ...weekdayData,
                title: displayTitle
              };
            } else {
              setReadingModes({ weekday: null, feast: null });
            }
          } else {
            setReadingModes({ weekday: null, feast: null });
          }

          if (selectedData && !overrideLiturgyItem) {
            setCachedLiturgy(selectedDate, selectedData, 'page');
          }
          setContent(selectedData);
        } else {
          setContent(null);
        }
      } catch (err) {
        console.error(err);
        setContent(null);
      } finally {
        setLoading(false);
      }
    };

    fetchFullReading();
  }, [selectedDate]);

  const handleSwitchReadingMode = (mode) => {
    if (readingModes && readingModes[mode]) {
      setActiveReadingMode(mode);
      const targetContent = readingModes[mode];
      setContent(targetContent);
      if (!overrideLiturgyItem) {
        setCachedLiturgy(selectedDate, targetContent, 'page');
      }
    }
  };

  // Phân loại các Thánh Lễ khác nhau trong cùng 1 ngày (VD: 24/12 Lễ Sáng vs Lễ Vọng Ban Tối)
  const fullMassReadings = useMemo(() => {
    if (!content?.extra_readings || !Array.isArray(content.extra_readings)) return [];
    return content.extra_readings.filter(ex => ex.type === 'full_mass');
  }, [content]);

  const [activeMassIdx, setActiveMassIdx] = useState(0);

  useEffect(() => {
    setActiveMassIdx(0);
  }, [content]);

  // Nội dung Thánh Lễ đang chọn (Lễ chính hoặc Lễ Vọng/Lễ Phụ)
  const activeContent = useMemo(() => {
    if (!content) return null;
    if (activeMassIdx > 0 && fullMassReadings[activeMassIdx - 1]) {
      const extraMass = fullMassReadings[activeMassIdx - 1];
      return {
        ...content,
        ...extraMass,
        title: extraMass.title || extraMass.mass_title || content.title
      };
    }
    return content;
  }, [content, activeMassIdx, fullMassReadings]);

  // Phân loại Bài đọc extra: Kiệu lá / Rước lá vs Bài đọc chọn thêm (Alternative) vs Bài đọc phụ khác
  const processionReadings = useMemo(() => {
    if (!activeContent?.extra_readings || !Array.isArray(activeContent.extra_readings)) return [];
    return activeContent.extra_readings.filter(ex => 
      ex.type === 'procession' || 
      ex.title?.toLowerCase().includes('kiệu lá') || 
      ex.title?.toLowerCase().includes('rước lá')
    );
  }, [activeContent]);

  const alternativeReadings = useMemo(() => {
    if (!activeContent?.extra_readings || !Array.isArray(activeContent.extra_readings)) return [];
    return activeContent.extra_readings.filter(ex => ex.type === 'alternative');
  }, [activeContent]);

  const sequenceReadings = useMemo(() => {
    if (!activeContent?.extra_readings || !Array.isArray(activeContent.extra_readings)) return [];
    return activeContent.extra_readings.filter(ex => 
      ex.type === 'sequence' || 
      ex.title?.toLowerCase().includes('ca tiếp liên') || 
      ex.target_section === 'sequence'
    );
  }, [activeContent]);

  const extraPsalms = useMemo(() => {
    if (!activeContent?.extra_readings || !Array.isArray(activeContent.extra_readings)) return [];
    return activeContent.extra_readings.filter(ex => {
      if (ex.type === 'full_mass' || ex.type === 'alternative' || ex.type === 'procession' || ex.type === 'sequence') {
        return false;
      }
      if (ex.title?.toLowerCase().includes('ca tiếp liên') || ex.target_section === 'sequence') {
        return false;
      }
      return (
        ex.type === 'psalm' ||
        ex.target_section === 'r2_psalm' ||
        ex.target_section === 'psalm' ||
        ex.title?.toLowerCase().includes('đáp ca') ||
        (ex.psalm_content && (!ex.content || ex.content.trim() === ''))
      );
    });
  }, [activeContent]);

  const standardExtraReadings = useMemo(() => {
    if (!activeContent?.extra_readings || !Array.isArray(activeContent.extra_readings)) return [];
    return activeContent.extra_readings.filter(ex => {
      const isFullMass = ex.type === 'full_mass';
      const isAlt = ex.type === 'alternative';
      const isProcession = ex.type === 'procession' || ex.title?.toLowerCase().includes('kiệu lá') || ex.title?.toLowerCase().includes('rước lá');
      const isSequence = ex.type === 'sequence' || ex.title?.toLowerCase().includes('ca tiếp liên') || ex.target_section === 'sequence';
      const isPsalm = ex.type === 'psalm' || ex.target_section === 'r2_psalm' || ex.target_section === 'psalm' || ex.title?.toLowerCase().includes('đáp ca') || (ex.psalm_content && (!ex.content || ex.content.trim() === ''));

      return !isFullMass && !isAlt && !isProcession && !isSequence && !isPsalm;
    });
  }, [activeContent]);

  // Tab Index State cho các Bài Đọc Tùy Chọn
  const [r1AltIdx, setR1AltIdx] = useState(0);
  const [r2AltIdx, setR2AltIdx] = useState(0);
  const [gospelAltIdx, setGospelAltIdx] = useState(0);

  useEffect(() => {
    setR1AltIdx(0);
    setR2AltIdx(0);
    setGospelAltIdx(0);
  }, [activeContent]);

  // Gom các Lựa Chọn cho từng bài đọc
  const r1Options = useMemo(() => {
    const mainOpt = activeContent?.r1_content ? {
      title: "Bài Đọc 1",
      ref: activeContent.r1_ref,
      quote: activeContent.r1_quote,
      intro: activeContent.r1_intro,
      content: activeContent.r1_content,
      option_label: activeContent.r1_ref ? `Bài chính (${activeContent.r1_ref})` : 'Bài đọc chính'
    } : null;
    const alts = alternativeReadings.filter(a => a.target_section === 'r1');
    return [mainOpt, ...alts].filter(Boolean);
  }, [activeContent, alternativeReadings]);

  const r2Options = useMemo(() => {
    const mainOpt = activeContent?.r2_content ? {
      title: "Bài Đọc 2",
      ref: activeContent.r2_ref,
      quote: activeContent.r2_quote,
      intro: activeContent.r2_intro,
      content: activeContent.r2_content,
      option_label: activeContent.r2_ref ? `Bài chính (${activeContent.r2_ref})` : 'Bài đọc chính'
    } : null;
    const alts = alternativeReadings.filter(a => a.target_section === 'r2');
    return [mainOpt, ...alts].filter(Boolean);
  }, [activeContent, alternativeReadings]);

  const gospelOptions = useMemo(() => {
    const mainOpt = activeContent?.gospel_content ? {
      title: "Tin Mừng",
      ref: activeContent.gospel_ref,
      alleluia: activeContent.gospel_alleluia,
      quote: activeContent.quote || activeContent.gospel_quote,
      intro: activeContent.gospel_intro,
      content: activeContent.gospel_content,
      option_label: activeContent.gospel_ref ? `Bài chính (${activeContent.gospel_ref})` : 'Bài đọc chính'
    } : null;
    const alts = alternativeReadings.filter(a => a.target_section === 'gospel');
    return [mainOpt, ...alts].filter(Boolean);
  }, [activeContent, alternativeReadings]);

  // Copy toàn bộ Lời Chúa & Suy niệm
  const handleCopy = () => {
    if (!activeContent) return;
    let fullText = `${activeContent.title || liturgyInfo?.displayName || 'Lời Chúa'}\n\n`;

    // 1. Tin Mừng Kiệu lá (nếu có)
    if (processionReadings.length > 0) {
      processionReadings.forEach(ex => {
        fullText += `${(ex.title || 'TIN MỪNG - KIỆU LÁ').toUpperCase()} (${ex.ref || ''}):\n`;
        if (ex.quote) fullText += `"${ex.quote}"\n`;
        if (ex.intro) fullText += `${ex.intro}\n`;
        if (ex.content) fullText += `${ex.content.replace(/<[^>]+>/g, '')}\n\n`;
      });
    }

    const currentR1 = r1Options[r1AltIdx];
    if (currentR1?.content) fullText += `BÀI ĐỌC 1 (${currentR1.ref || ''}):\n${currentR1.content.replace(/<[^>]+>/g, '')}\n\n`;
    if (activeContent.psalm_content) fullText += `ĐÁP CA (${activeContent.psalm_ref || ''}):\n${activeContent.psalm_content.replace(/<[^>]+>/g, '')}\n\n`;
    
    const currentR2 = r2Options[r2AltIdx];
    if (currentR2?.content) fullText += `BÀI ĐỌC 2 (${currentR2.ref || ''}):\n${currentR2.content.replace(/<[^>]+>/g, '')}\n\n`;

    // 2. Bài đọc phụ khác
    if (standardExtraReadings.length > 0) {
      standardExtraReadings.forEach((ex, idx) => {
        fullText += `${(ex.title || `BÀI ĐỌC ${idx + 3}`).toUpperCase()} (${ex.ref || ''}):\n`;
        if (ex.quote) fullText += `"${ex.quote}"\n`;
        if (ex.intro) fullText += `${ex.intro}\n`;
        if (ex.content) fullText += `${ex.content.replace(/<[^>]+>/g, '')}\n\n`;
        if (ex.psalm_content) fullText += `ĐÁP CA (${ex.psalm_ref || ''}):\n${ex.psalm_content.replace(/<[^>]+>/g, '')}\n\n`;
      });
    }

    const currentGospel = gospelOptions[gospelAltIdx];
    if (currentGospel?.content) fullText += `TIN MỪNG (${currentGospel.ref || ''}):\n${currentGospel.content.replace(/<[^>]+>/g, '')}\n\n`;
    if (content.reflection) fullText += `SUY NIỆM:\n${content.reflection.replace(/<[^>]+>/g, '')}\n`;

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Chia sẻ
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: content?.title || 'Lời Chúa Mỗi Ngày',
        text: `Lời Chúa ngày ${selectedDate.toLocaleDateString('vi-VN')}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  // Cuộn mượt đến section
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Class điều chỉnh phông chữ thân bài đọc (Đồng bộ tỉ lệ mới)
  const fontClasses = {
    normal: fontStyle === 'serif' ? 'font-serif text-[16px] sm:text-[17px]' : 'font-sans text-[16px] sm:text-[17px]',
    medium: fontStyle === 'serif' ? 'font-serif text-[19px] sm:text-[20px]' : 'font-sans text-[19px] sm:text-[20px]',
    large:  fontStyle === 'serif' ? 'font-serif text-[23px] sm:text-[24px]' : 'font-sans text-[22px] sm:text-[23px]',
  }[fontSize];

  // Class điều chỉnh cỡ chữ Tiêu đề các mục bài đọc (Bài Đọc 1, Đáp Ca, Bài Đọc 2, Tin Mừng...)
  const sectionTitleClasses = {
    normal: 'text-[17px] sm:text-[20px]',
    medium: 'text-[20px] sm:text-[23px]',
    large:  'text-[23px] sm:text-[26px]',
  }[fontSize];

  // Class điều chỉnh cỡ chữ Trích dẫn Kinh Thánh (ref)
  const refFontClasses = {
    normal: 'text-[12px] sm:text-[14px]',
    medium: 'text-[14px] sm:text-[16px]',
    large:  'text-[16px] sm:text-[18px]',
  }[fontSize];

  // Class điều chỉnh cỡ chữ Dòng Câu Đáp (Đ.) trong Đáp Ca
  const refrainFontClasses = {
    normal: 'text-[16px] sm:text-[18px]',
    medium: 'text-[19px] sm:text-[21px]',
    large:  'text-[22px] sm:text-[24px]',
  }[fontSize];

  // Class điều chỉnh cỡ chữ Alleluia
  const alleluiaFontClasses = {
    normal: 'text-[14px] sm:text-[17px]',
    medium: 'text-[16px] sm:text-[19px]',
    large:  'text-[19px] sm:text-[22px]',
  }[fontSize];

  // Định dạng số câu Kinh Thánh & Đoạn Đáp Ca tối ưu giao diện (Sacred Flow Layout - Phương án 1 Liền Mạch)
  const formatLiturgyText = (text, customRefrainClass = refrainFontClasses) => {
    if (!text) return '';
    
    // Tách văn bản thành các đoạn văn lớn dựa theo \n\n (xuống 2 dòng)
    const paragraphs = text.split(/\n\s*\n/);

    return paragraphs.map((paragraphStr) => {
      const rawLines = paragraphStr.split('\n').map(l => l.trim()).filter(Boolean);
      if (rawLines.length === 0) return '';

      let resultHtml = '';
      let i = 0;

      while (i < rawLines.length) {
        let line = rawLines[i];
        let prefixHtml = '';
        let restOfLine = line;
        let hasStartNumber = false;

        // TH1: Đầu dòng có cả Số Chương + Số Câu (Ví dụ: "11 21b Hồi ấy...", "2 1 Khi ấy...")
        const chapterVerseMatch = restOfLine.match(/^(\d{1,3})\s+(\d{1,3}[a-d]{0,4})(?=\s*[\p{L}"“'‘(]|$)/u);
        if (chapterVerseMatch) {
          const [fullMatch, chap, verse] = chapterVerseMatch;
          hasStartNumber = true;
          prefixHtml = `<span class="inline-flex items-baseline gap-1 ${theme.supColor} mr-2 select-none"><span class="text-[0.9em] font-sans font-normal leading-none">${chap}</span><sup class="text-[0.5em] font-sans font-normal leading-none">${verse}</sup></span>`;
          restOfLine = restOfLine.slice(fullMatch.length).trimStart();
        } else {
          // TH2: Đầu dòng có Số Câu lẻ (Ví dụ: "21b Hồi ấy...", "5 Đức Giê-su...")
          const singleVerseMatch = restOfLine.match(/^(\d{1,3}[a-d]{0,4})(?=\s*[\p{L}"“'‘(]|$)/u);
          if (singleVerseMatch) {
            const [fullMatch, verse] = singleVerseMatch;
            hasStartNumber = true;
            prefixHtml = `<sup class="inline-block font-normal ${theme.supColor} text-[0.5em] font-sans px-1 mr-1.5 select-none">${verse}</sup>`;
            restOfLine = restOfLine.slice(fullMatch.length).trimStart();
          }
        }

        // TH3: Xử lý Đoạn Đáp Ca (Bắt đầu với Đ., Đ:, Đáp:, Đ/)
        const refrainMatch = restOfLine.match(/^(Đ\.|Đ:|Đ\/|Đáp:)\s*(.*)$/i);
        if (refrainMatch) {
          // Gom tất cả các dòng tiếp theo trong cùng paragraph thuộc câu đáp này
          const refrainLines = [refrainMatch[2].trim()];
          i++;

          while (i < rawLines.length) {
            const nextLine = rawLines[i];
            // Dừng gom dòng nếu gặp số câu ở đầu dòng hoặc gặp chữ Đ. mới
            const isNextStartNum = /^\d{1,3}[a-d]{0,4}/.test(nextLine);
            const isNextRefrain = /^(Đ\.|Đ:|Đ\/|Đáp:)/i.test(nextLine);
            if (isNextStartNum || isNextRefrain) break;

            refrainLines.push(nextLine);
            i++;
          }

          // Trình bày toàn bộ câu đáp (Dòng 1 + Dòng 2...) theo Phương án 1:
          // Typography Phụng Vụ cao cấp: Font Serif in đậm, chữ Đ. màu đỏ phụng vụ, Hanging Indent tự động
          let refrainContent = refrainLines.join('<br />');

          // Đổi màu số câu ở giữa dòng
          refrainContent = refrainContent.replace(
            /(\d{1,4}[a-d]{0,4})/g,
            `<sup class="font-normal ${theme.supColor} text-[0.5em] font-sans ml-1 select-none">$1</sup>`
          );
          refrainContent = refrainContent.replace(/(<\/sup>)([\p{L}"“'‘(])/gu, '$1 $2');

          // Đổi màu (Đ.) ở giữa hoặc cuối dòng
          refrainContent = refrainContent.replace(
            /\((Đ\.|Đ|Đáp)\)/gi,
            `<span class="font-serif font-bold text-red-600 dark:text-red-400 mx-1 select-none">(Đ.)</span>`
          );

          resultHtml += `<div class="my-2.5 sm:my-3.5 font-serif font-bold text-stone-900 dark:text-stone-100 ${customRefrainClass} leading-relaxed sm:leading-loose text-left pl-7 sm:pl-8 -indent-7 sm:-indent-8">${prefixHtml}<span class="font-serif font-extrabold text-red-600 dark:text-red-400 mr-1.5 select-none">Đ.</span><span>${refrainContent}</span></div>`;
          continue;
        }

        // Dòng văn bản bình thường (Không phải câu đáp)
        restOfLine = restOfLine.replace(
          /(\d{1,4}[a-d]{0,4})/g,
          `<sup class="font-normal ${theme.supColor} text-[0.5em] font-sans ml-1 select-none">$1</sup>`
        );
        restOfLine = restOfLine.replace(/(<\/sup>)([\p{L}"“'‘(])/gu, '$1 $2');
        restOfLine = restOfLine.replace(
          /\((Đ\.|Đ|Đáp)\)/gi,
          `<span class="font-serif font-bold text-red-600 dark:text-red-400 mx-1 select-none">(Đ.)</span>`
        );

        const indentStyle = hasStartNumber ? '' : '[text-indent:1.25rem] sm:[text-indent:1.75rem]';
        const isLastLine = i === rawLines.length - 1;
        const marginStyle = isLastLine ? 'mb-4 sm:mb-5' : 'mb-2 sm:mb-3';

        resultHtml += `<div class="${marginStyle} ${indentStyle} leading-relaxed sm:leading-[1.85] text-justify [text-justify:inter-word] break-words">${prefixHtml}${restOfLine}</div>`;
        i++;
      }

      return resultHtml;
    }).join('');
  };

  return (
    <div className="min-h-screen bg-[#FDFCF9] dark:bg-[#12100E] text-stone-800 dark:text-stone-200 transition-colors duration-500 fade-in-up pb-32 overflow-x-hidden">
      <SEO 
        title={liturgyInfo?.title ? `${liturgyInfo.title} (${selectedDate ? selectedDate.toLocaleDateString('vi-VN') : ''})` : `Lời Chúa Ngày ${selectedDate ? selectedDate.toLocaleDateString('vi-VN') : ''}`}
        description={`Bài đọc Phụng Vụ và Suy niệm Lời Chúa ngày ${selectedDate ? selectedDate.toLocaleDateString('vi-VN') : ''}. Tin Mừng: ${content?.gospel_ref || ''}`}
        jsonLd={liturgyInfo ? {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://loichuamoinngay.com/#organization",
              "name": "Lời Chúa Mỗi Ngày",
              "url": "https://loichuamoinngay.com",
              "logo": "https://loichuamoinngay.com/logo_loi_chua_moi_ngay.png"
            },
            {
              "@type": "BreadcrumbList",
              "@id": "https://loichuamoinngay.com/liturgy#breadcrumb",
              "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Trang chủ", "item": "https://loichuamoinngay.com" },
                { "@type": "ListItem", "position": 2, "name": "Phụng Vụ Hàng Ngày", "item": "https://loichuamoinngay.com/liturgy" }
              ]
            },
            {
              "@type": "Article",
              "@id": "https://loichuamoinngay.com/liturgy#article",
              "headline": liturgyInfo.title || `Lời Chúa Ngày ${selectedDate ? selectedDate.toLocaleDateString('vi-VN') : ''}`,
              "description": `Bài đọc Phụng Vụ và Suy niệm Lời Chúa ngày ${selectedDate ? selectedDate.toLocaleDateString('vi-VN') : ''}. Tin Mừng: ${content?.gospel_ref || ''}`,
              "inLanguage": "vi",
              "publisher": { "@id": "https://loichuamoinngay.com/#organization" },
              "mainEntityOfPage": "https://loichuamoinngay.com/liturgy"
            }
          ]
        } : null}
      />
      {/* Dynamic Background Mesh Grid */}
      <div className="fixed inset-0 w-full h-screen bg-[radial-gradient(circle_at_50%_-10%,rgba(245,158,11,.10),transparent_32%),linear-gradient(to_right,#8881_1px,transparent_1px),linear-gradient(to_bottom,#8881_1px,transparent_1px)] bg-[size:auto,32px_32px,32px_32px] pointer-events-none z-0" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-2.5 sm:px-6 pt-6 sm:pt-12">
        
        {/* Navigation & Header (An khi o Focus Mode) */}
        {!isFocusMode && (
          <motion.div variants={heroReveal} initial="hidden" animate="visible" custom={0} className="mb-4 sm:mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 lg:gap-8">
              <div className="min-w-0 flex-1">
                <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mb-2">
                  <p className={`text-[11px] font-bold uppercase tracking-widest ${theme.accentText} flex items-center gap-2`}>
                    <BookOpen className="w-4 h-4" /> Phụng Vụ Hằng Ngày
                  </p>
                  {liturgyInfo && (
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                      <span className={`w-1.5 h-1.5 rounded-full ${theme.btnBg.split(' ')[0]}`} aria-hidden="true" />
                      {liturgyInfo.feastTypeName && <span>{liturgyInfo.feastTypeName}</span>}
                      {liturgyInfo.feastTypeName && <span className="text-stone-300 dark:text-stone-700">·</span>}
                      <span>{theme.name.split(' (')[0]}</span>
                    </div>
                  )}
                </div>
                <h1 className="text-[30px] sm:text-4xl font-extrabold text-stone-900 dark:text-stone-100 font-serif leading-[1.08] tracking-[-0.02em]">
                  Lời Chúa & Suy Niệm
                </h1>
              </div>

              {/* Action Controls: Search & Date Selector */}
              <div className="flex flex-col sm:flex-row lg:flex-col items-stretch gap-2.5 w-full lg:w-80 lg:shrink-0">
                {/* Search Trigger Button (Command Palette Trigger) */}
                <div className="relative w-full sm:flex-1 lg:w-full">
                  <button
                    onClick={() => setIsSearchOpen(true)}
                    className="w-full h-[46px] flex items-center justify-between pl-2.5 pr-2.5 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl rounded-2xl border border-stone-200/90 dark:border-stone-800/90 shadow-sm hover:shadow-md hover:border-amber-400/60 dark:hover:border-amber-600/60 text-stone-500 dark:text-stone-400 transition-all font-medium group text-left cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:border-amber-500 dark:focus-visible:border-amber-500 focus-visible:shadow-[0_0_0_4px_rgba(245,158,11,0.15)]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className={`flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-xl bg-stone-100 dark:bg-stone-800 group-hover:bg-amber-100 dark:group-hover:bg-amber-950/50 transition-colors`}>
                        <Search className={`w-3.5 h-3.5 ${theme.icon} group-hover:scale-110 transition-transform`} />
                      </span>
                      <span className="truncate text-[14px] text-stone-500 dark:text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-300 transition-colors">
                        Tìm bài đọc, ngày lễ, trích dẫn Lời Chúa...
                      </span>
                    </div>
                    <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-1 text-[10px] font-bold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700/80 rounded-lg flex-shrink-0 shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_rgba(0,0,0,0.4)]">
                      <Command className="w-2.5 h-2.5" />K
                    </kbd>
                  </button>
                </div>

                {/* Selector ngày (Dropdown) */}
                <div ref={pickerRef} className="relative flex justify-center w-full sm:w-auto lg:w-full">
                  <div className={`h-[46px] flex items-center bg-white/90 dark:bg-stone-900/90 backdrop-blur-md rounded-2xl border ${theme.navBg} px-1 shadow-sm w-full sm:w-auto lg:w-full justify-between sm:justify-start`}>
                    <button aria-label="Ngày trước" onClick={() => changeDate(-1)} className="w-11 h-11 flex items-center justify-center text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 rounded-xl transition-all">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={() => setIsPickerOpen(!isPickerOpen)}
                      className="px-2 sm:px-3 flex flex-col items-center justify-center min-w-[160px] sm:w-[200px] lg:w-auto lg:flex-1 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors py-0.5 cursor-pointer active:scale-95"
                    >
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className={`w-3.5 h-3.5 ${theme.icon}`} />
                        <span className="text-[13px] sm:text-[14px] font-bold text-stone-900 dark:text-stone-100 leading-tight">
                          {selectedDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                      </div>
                      <span className="hidden sm:block text-[10px] sm:text-[11px] font-medium text-stone-500 dark:text-stone-400 text-center truncate w-full leading-tight max-w-[150px] sm:max-w-full">
                        {liturgyInfo ? liturgyInfo.displayName : "Đang tính..."}
                      </span>
                    </button>

                    <button aria-label="Ngày sau" onClick={() => changeDate(1)} className="w-11 h-11 flex items-center justify-center text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 rounded-xl transition-all">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Lịch Dropdown */}
                  <AnimatePresence>
                    {isPickerOpen && (
                      <DatePicker 
                        selectedDate={selectedDate} 
                        onChange={handleDateChange} 
                        onClose={() => setIsPickerOpen(false)} 
                        theme={theme}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Dải Lịch 7 Ngày Trong Tuần (Horizontal Week Ribbon 1-Touch) */}
            <WeekRibbon 
              selectedDate={selectedDate} 
              onSelectDate={handleDateChange} 
              theme={theme} 
            />
          </motion.div>
        )}

        {/* Banner thông báo bài đọc tra cứu */}
        {overrideLiturgyItem && !isFocusMode && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-amber-900 dark:text-amber-200 shadow-sm"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span className="truncate">
                Đang hiển thị kết quả tra cứu: <strong className="font-bold text-amber-950 dark:text-amber-100">{overrideLiturgyItem.title || 'Bài đọc tra cứu'}</strong>
                {overrideLiturgyItem.cycle && overrideLiturgyItem.cycle !== 'all' ? ` (Năm ${overrideLiturgyItem.cycle})` : ''}
              </span>
            </div>
            <button
              onClick={() => setOverrideLiturgyItem(null)}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs flex-shrink-0 transition-colors shadow-sm active:scale-95 cursor-pointer"
            >
              Quay về Lễ theo Lịch
            </button>
          </motion.div>
        )}

        {/* Floating Toolbar: Reading Controls (Font size, Copy, Share, Focus) */}
        {content && !isFocusMode && (
          <motion.div variants={heroReveal} initial="hidden" animate="visible" custom={0.05} className="mb-4 sm:mb-6">
            <div className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl border border-stone-200 dark:border-stone-800 rounded-[20px] p-3 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              
              {/* Audio Controls (Phát toàn bộ bài đọc & Bộ điều khiển) */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button 
                  onClick={handleToggleAudio}
                  aria-label={tts.isPlaying ? (tts.isPaused ? "Tiếp tục phát" : "Tạm dừng") : "Phát tất cả bài đọc"}
                  className={`flex items-center justify-center w-11 h-11 rounded-full ${theme.btnBg} transition-all active:scale-95 shadow-xs shrink-0`}
                  title={tts.isPlaying ? (tts.isPaused ? "Tiếp tục phát" : "Tạm dừng") : "Phát toàn bộ các bài đọc theo thứ tự"}
                >
                  {tts.isPlaying && !tts.isPaused ? (
                    <PauseCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <PlayCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </button>

                {tts.isPlaying && (
                  <button
                    onClick={tts.stop}
                    className="flex items-center justify-center w-7 h-7 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 hover:bg-red-200 transition-colors"
                    title="Dừng phát"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </button>
                )}

                <div className="flex flex-col justify-center flex-1 min-w-0">
                  <h4 className="text-[11px] sm:text-[12px] font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5 text-amber-500" /> 
                    {tts.isPlaying ? (tts.isPaused ? "Đã tạm dừng" : (tts.currentSection || "Đang phát...")) : "Phát tất cả Bài Đọc"}
                  </h4>
                </div>

                {/* Speed selector toggle dạng Segmented Pill đẹp UI (0.8x, 1.0x, 1.2x) */}
                <div className="flex items-center bg-stone-100 dark:bg-stone-800/90 p-1 rounded-xl border border-stone-200/60 dark:border-stone-700/60 text-[10px] sm:text-[11px] font-bold ml-auto">
                  {[0.8, 1, 1.2].map((speed) => (
                    <button
                      key={`speed-${speed}`}
                      onClick={() => tts.changeRate(speed)}
                      className={`min-w-[38px] min-h-[34px] px-1.5 py-1 rounded-lg transition-all ${
                        tts.rate === speed
                          ? `${theme.btnBg} shadow-2xs`
                          : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                      }`}
                      title={`Tốc độ ${speed}x`}
                    >
                      {speed === 1 ? '1x' : `${speed}x`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font family, save, copy, share and focus */}
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] sm:flex items-center gap-1.5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 dark:border-stone-800">
                {/* Font Family Toggle */}
                <button
                  onClick={() => setFontStyle(fontStyle === 'serif' ? 'sans' : 'serif')}
                  className="min-h-11 px-3 py-1 rounded-xl border border-stone-200 dark:border-stone-800 text-[11px] sm:text-[12px] font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  title="Đổi phông chữ"
                >
                  {fontStyle === 'serif' ? 'Serif' : 'Sans'}
                </button>

                {/* Nút Lưu Bài Đọc */}
                <button
                  onClick={() => toggleBookmark(content, liturgyInfo)}
                  className={`min-h-11 px-3 rounded-xl border transition-all flex items-center justify-center gap-1 text-[11px] font-bold ${
                    isBookmarked(selectedDate)
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                      : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                  title={isBookmarked(selectedDate) ? "Đã lưu bài đọc" : "Lưu bài đọc này"}
                >
                  <Bookmark className="w-3.5 h-3.5 fill-current" />
                  <span>{isBookmarked(selectedDate) ? 'Đã lưu' : 'Lưu'}</span>
                </button>

                {/* Nút Sao chép */}
                <button
                  onClick={handleCopy}
                  aria-label="Sao chép toàn bộ nội dung bài đọc"
                  className="w-11 h-11 flex items-center justify-center rounded-xl border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors relative"
                  title="Sao chép toàn bộ bài đọc, đáp ca, Tin Mừng và suy niệm"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                {/* Nút Chia sẻ */}
                <button
                  onClick={handleShare}
                  aria-label="Chia sẻ Lời Chúa"
                  className="w-11 h-11 flex items-center justify-center rounded-xl border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  title="Chia sẻ"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>

                {/* Nút Chế Độ Tập Trung (Focus Mode) */}
                <button
                  onClick={() => setIsFocusMode(true)}
                  aria-label="Bật chế độ tập trung"
                  className="w-11 h-11 flex items-center justify-center rounded-xl border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  title="Chế độ tập trung"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>

              </div>
            </div>
          </motion.div>
        )}

        {/* Focus Mode Header Bar (Hiển thị khi bật Focus Mode) */}
        {isFocusMode && (
          <div className="mb-4 flex items-center justify-between bg-white/80 dark:bg-stone-900/80 backdrop-blur-md rounded-2xl px-4 py-2 border border-stone-200 dark:border-stone-800 shadow-sm">
            <span className="text-[12px] font-bold text-stone-600 dark:text-stone-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Chế Độ Cầu Nguyện
            </span>
            <button
              onClick={() => setIsFocusMode(false)}
              className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-xl border border-amber-200 dark:border-amber-800"
            >
              <Minimize2 className="w-3.5 h-3.5" /> Thoát tập trung
            </button>
          </div>
        )}

        {/* Content Area */}
        <motion.div variants={heroReveal} initial="hidden" animate="visible" custom={0.1}>
          {loading ? (
            <div className="py-32 flex flex-col items-center justify-center">
              <Loader2 className={`w-8 h-8 animate-spin ${theme.icon} mb-4`} />
              <p className="text-[14px] font-medium text-stone-500">Đang tải nội dung Lời Chúa...</p>
            </div>
          ) : content ? (
            <article className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl border border-stone-200/80 dark:border-stone-800/80 p-5 sm:p-10 rounded-[24px] sm:rounded-[32px] shadow-[0_24px_70px_-50px_rgba(41,37,36,.55)]">

              {/* Tiêu đề chính của ngày (Lễ Kính, Lễ Nhớ, Chúa Nhật...) */}
              {activeContent.title && (
                <div className="mb-8 sm:mb-12 text-center flex flex-col items-center gap-1.5">
                  {activeContent.title
                    .replace(/^(Ngày\s+\d{1,2}\s+tháng\s+\d{1,2})\s*-?\s*/i, '$1\n')
                    .replace(/\s*-\s*(lễ\s+.*)$/i, '\n$1')
                    .split('\n')
                    .map((part, index, arr) => {
                      const lowerPart = part.toLowerCase();
                      
                      if (index === arr.length - 1 && lowerPart.startsWith('lễ ')) {
                        return (
                          <span key={index} className={`inline-block mt-2 px-3 sm:px-4 py-1 rounded-full text-[11px] sm:text-[13px] uppercase tracking-widest font-bold font-sans shadow-sm border ${theme.badgeBg}`}>
                            {part}
                          </span>
                        );
                      }
                      
                      if (index === 0 && lowerPart.startsWith('ngày')) {
                        return (
                          <span key={index} className={`text-[12px] sm:text-[14px] ${theme.accentText} uppercase tracking-widest font-sans font-bold mb-1`}>
                            {part}
                          </span>
                        );
                      }

                      return (
                        <h2 key={index} className={`text-[22px] sm:text-[32px] font-serif font-bold ${theme.headingText} leading-tight`}>
                          {part}
                        </h2>
                      );
                    })}
                </div>
              )}

              {/* Bộ Chọn Tab Bài Đọc (Cân bằng 50/50 tuyệt đối - Tối ưu Mobile & Desktop) */}
              {readingModes.weekday && readingModes.feast && !overrideLiturgyItem && (
                <div className="mb-5 sm:mb-8 flex flex-col items-center justify-center relative px-2">
                  
                  {/* Thanh Pill Switcher chứa ĐÚNG 2 NÚT (Chia 50% - 50% đối xứng) */}
                  <div className="inline-flex items-center justify-between bg-stone-200/80 dark:bg-stone-800/80 p-1 sm:p-1.5 rounded-full shadow-inner border border-stone-300/50 dark:border-stone-700/50 w-full max-w-[360px] sm:max-w-md">
                    
                    {/* Tab 1: Bài đọc Lễ Thường (50% Width) */}
                    <button
                      onClick={() => handleSwitchReadingMode('weekday')}
                      className={`w-1/2 py-1.5 sm:py-2 px-2 sm:px-3 rounded-full text-[11px] sm:text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 min-w-0 ${
                        activeReadingMode === 'weekday'
                          ? `${theme.btnBg} text-white shadow-md scale-102`
                          : 'text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                      }`}
                    >
                      <span className="text-[12px] sm:text-[14px]">📘</span>
                      <span className="truncate">Bài đọc Lễ Thường</span>
                    </button>

                    {/* Tab 2: Bài đọc Lễ Nhớ (50% Width) */}
                    <button
                      onClick={() => handleSwitchReadingMode('feast')}
                      className={`w-1/2 py-1.5 sm:py-2 px-2 sm:px-3 rounded-full text-[11px] sm:text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 min-w-0 ${
                        activeReadingMode === 'feast'
                          ? `${theme.btnBg} text-white shadow-md scale-102`
                          : 'text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                      }`}
                    >
                      <span className="text-[12px] sm:text-[14px]">🌹</span>
                      <span className="truncate">Bài đọc Lễ Nhớ</span>
                    </button>
                  </div>

                  {/* Nút Hướng Dẫn Quy Tắc Phụng Vụ (Desktop tự Hover hiện, Mobile 1 Chạm hiện & Click Outside tự ẩn) */}
                  <div className="relative mt-2 inline-block group" ref={tooltipRef}>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowInfoTooltip((prev) => !prev);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-stone-500 hover:text-amber-700 dark:text-stone-400 dark:hover:text-amber-300 transition-colors py-1 px-2.5 rounded-full bg-stone-200/50 dark:bg-stone-800/50 hover:bg-stone-200 dark:hover:bg-stone-700 font-sans cursor-pointer active:scale-95"
                    >
                      <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="underline underline-offset-2 decoration-dashed decoration-stone-400 dark:decoration-stone-600 font-medium">Quy tắc Phụng vụ</span>
                    </button>

                    {/* Popover Chú Thích Bật Ra */}
                    <div className={`absolute left-1/2 -translate-x-1/2 top-full mt-1.5 w-64 p-3 bg-stone-900/95 dark:bg-stone-950/95 text-stone-100 text-[11px] rounded-2xl shadow-xl backdrop-blur-md border border-stone-700/80 z-50 leading-relaxed text-left animate-in fade-in zoom-in-95 duration-150 font-sans pointer-events-none ${showInfoTooltip ? 'block' : 'hidden group-hover:block'}`}>
                      <p className="font-semibold text-amber-400 mb-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Quy Tắc Phụng Vụ:
                      </p>
                      Ngày thường có Lễ Nhớ mặc định cử hành <b>Bài đọc Ngày Thường</b>, ngoại trừ trường hợp Giáo xứ cử hành riêng <b>Bài đọc Lễ Nhớ</b>.
                    </div>
                  </div>

                </div>
              )}

              {/* Bộ Chọn Thánh Lễ (Dùng khi 1 ngày có từ 2 Thánh Lễ trở lên, VD: 24/12 Lễ Sáng vs Lễ Vọng Ban Tối) */}
              {fullMassReadings.length > 0 && (
                <div className="mb-6 sm:mb-8 bg-amber-50/80 dark:bg-stone-900/90 border border-amber-200/80 dark:border-amber-800/80 rounded-2xl p-3 sm:p-4 text-center shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-amber-800 dark:text-amber-300 mb-2 font-sans flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Chọn Thánh Lễ Cử Hành
                  </p>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <button
                      onClick={() => setActiveMassIdx(0)}
                      className={`px-3.5 sm:px-4 py-1.5 rounded-full text-[12px] sm:text-[13px] font-bold transition-all ${
                        activeMassIdx === 0
                          ? `${theme.btnBg} shadow-sm`
                          : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'
                      }`}
                    >
                      {content?.title.split('\n')[1].trim() || "Thánh Lễ Chính"}
                    </button>

                    {fullMassReadings.map((m, idx) => (
                      <button
                        key={`mass-tab-${idx}`}
                        onClick={() => setActiveMassIdx(idx + 1)}
                        className={`px-3.5 sm:px-4 py-1.5 rounded-full text-[12px] sm:text-[13px] font-bold transition-all ${
                          activeMassIdx === idx + 1
                            ? `${theme.btnBg} shadow-sm`
                            : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'
                        }`}
                      >
                        {m.mass_title || m.title || `Thánh Lễ ${idx + 2}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tin Mừng - Kiệu Lá (Phúc Âm rước lá - Lễ Lá) */}
              {processionReadings.map((extra, idx) => (
                <div key={`procession-${idx}`} id="sec-procession" className={`mb-8 sm:mb-12 p-5 sm:p-8 rounded-2xl sm:rounded-3xl border ${theme.gospelCardBg} shadow-sm scroll-mt-24 relative overflow-hidden`}>
                  <div className="flex absolute top-0 right-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3.5 py-1 rounded-bl-2xl text-[11px] font-bold uppercase tracking-widest font-sans items-center gap-1">
                    <Sparkles className="w-3 h-3" /> {extra.title || "Tin Mừng - Kiệu Lá"}
                  </div>

                  <h3 className={`font-serif ${sectionTitleClasses} ${theme.headingText} mb-1 uppercase tracking-wider text-center font-bold`}>
                    {extra.title || "Tin Mừng - Kiệu Lá"}
                  </h3>
                  {extra.ref && <p className={`text-center ${refFontClasses} text-stone-500 dark:text-stone-400 font-bold mb-1 font-sans`}>{extra.ref}</p>}

                  {/* Nút nghe riêng Tin Mừng Kiệu Lá */}
                  {renderSectionAudioBadge(
                    'Tin Mừng Kiệu Lá',
                    `Phúc Âm Kiệu Lá. ${extra.intro || ''}. ${extra.content || ''}`,
                    extra.ref,
                    'gospel'
                  )}

                  {extra.quote && (
                    <p className={`italic text-center ${fontClasses} text-stone-600 dark:text-stone-400 mb-5 px-2 font-serif leading-relaxed`}>
                      "{extra.quote}"
                    </p>
                  )}

                  {extra.intro && (
                    <p className={`font-bold ${fontClasses} text-stone-800 dark:text-stone-200 mb-3 font-serif`}>
                      {extra.intro}
                    </p>
                  )}

                  {extra.content && (
                    <div className={`${fontClasses}`}>
                      <div dangerouslySetInnerHTML={{ __html: formatLiturgyText(extra.content) }} />
                    </div>
                  )}
                </div>
              ))}

              {/* Bài Đọc 1 */}
              {r1Options.length > 0 && (
                <div id="sec-r1" className="mb-8 sm:mb-12 scroll-mt-24">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="h-px bg-stone-200 dark:bg-stone-800 flex-1 max-w-[80px]" />
                    <h3 className={`font-serif ${sectionTitleClasses} font-bold ${theme.accentText} uppercase tracking-wider text-center`}>Bài Đọc 1</h3>
                    <div className="h-px bg-stone-200 dark:bg-stone-800 flex-1 max-w-[80px]" />
                  </div>

                  {/* Segmented Tab Toggle cho Bài Đọc 1 (nếu có lựa chọn thay thế) */}
                  {r1Options.length > 1 && (
                    <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
                      {r1Options.map((opt, idx) => (
                        <button
                          key={`r1-opt-${idx}`}
                          onClick={() => setR1AltIdx(idx)}
                          className={`px-3 py-1 rounded-full text-[12px] font-bold transition-all ${
                            r1AltIdx === idx
                              ? `${theme.btnBg} shadow-sm`
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                          }`}
                        >
                          {opt.option_label || opt.ref || `Lựa chọn ${idx + 1}`}
                        </button>
                      ))}
                    </div>
                  )}

                  {r1Options[r1AltIdx]?.ref && <p className={`text-center ${refFontClasses} text-stone-500 dark:text-stone-400 font-bold mb-1 font-sans`}>{r1Options[r1AltIdx].ref}</p>}

                  {/* Nút nghe riêng Bài Đọc 1 */}
                  {renderSectionAudioBadge(
                    'Bài Đọc 1',
                    `Bài đọc 1. ${r1Options[r1AltIdx]?.intro || activeContent?.r1_intro || ''}. ${r1Options[r1AltIdx]?.content || activeContent?.r1_content || ''}`,
                    r1Options[r1AltIdx]?.ref || activeContent?.r1_ref,
                    'r1'
                  )}
                  
                  {r1Options[r1AltIdx]?.quote && (
                    <p className={`italic text-center ${fontClasses} text-stone-600 dark:text-stone-400 mb-5 px-2 font-serif leading-relaxed`}>
                      "{r1Options[r1AltIdx].quote}"
                    </p>
                  )}
                  
                  {r1Options[r1AltIdx]?.intro && (
                    <p className={`font-bold ${fontClasses} text-stone-800 dark:text-stone-200 mb-3 font-serif`}>
                      {r1Options[r1AltIdx].intro}
                    </p>
                  )}
                  
                  {r1Options[r1AltIdx]?.content && (
                    <div className={`${fontClasses}`}>
                      <div dangerouslySetInnerHTML={{ __html: formatLiturgyText(r1Options[r1AltIdx].content) }} />
                    </div>
                  )}
                </div>
              )}

              {/* Đáp Ca */}
              {activeContent.psalm_content && (
                <div id="sec-psalm" className="mb-8 sm:mb-12 pl-3.5 sm:pl-8 border-l-4 border-amber-400 dark:border-amber-600 scroll-mt-24">
                  <h3 className={`font-serif ${sectionTitleClasses} ${theme.accentText} mb-2.5 italic flex items-center flex-wrap gap-2`}>
                    <span className="font-bold">Đáp Ca</span> 
                    {activeContent.psalm_ref && <span className={`${refFontClasses} text-stone-500 font-bold not-italic font-sans`}>- {activeContent.psalm_ref}</span>}
                  </h3>
                  
                  <div className={`${fontClasses} italic text-stone-700 dark:text-stone-300`}>
                    <div dangerouslySetInnerHTML={{ __html: formatLiturgyText(activeContent.psalm_content) }} />
                  </div>
                </div>
              )}

              {/* Bài Đọc 2 */}
              {r2Options.length > 0 && (
                <div id="sec-r2" className="mb-8 sm:mb-12 scroll-mt-24">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="h-px bg-stone-200 dark:bg-stone-800 flex-1 max-w-[80px]" />
                    <h3 className={`font-serif ${sectionTitleClasses} font-bold ${theme.accentText} uppercase tracking-wider text-center`}>Bài Đọc 2</h3>
                    <div className="h-px bg-stone-200 dark:bg-stone-800 flex-1 max-w-[80px]" />
                  </div>

                  {/* Segmented Tab Toggle cho Bài Đọc 2 (nếu có lựa chọn thay thế) */}
                  {r2Options.length > 1 && (
                    <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
                      {r2Options.map((opt, idx) => (
                        <button
                          key={`r2-opt-${idx}`}
                          onClick={() => setR2AltIdx(idx)}
                          className={`px-3 py-1 rounded-full text-[12px] font-bold transition-all ${
                            r2AltIdx === idx
                              ? `${theme.btnBg} shadow-sm`
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                          }`}
                        >
                          {opt.option_label || opt.ref || `Lựa chọn ${idx + 1}`}
                        </button>
                      ))}
                    </div>
                  )}

                  {r2Options[r2AltIdx]?.ref && <p className={`text-center ${refFontClasses} text-stone-500 dark:text-stone-400 font-bold mb-1 font-sans`}>{r2Options[r2AltIdx].ref}</p>}

                  {/* Nút nghe riêng Bài Đọc 2 */}
                  {renderSectionAudioBadge(
                    'Bài Đọc 2',
                    `Bài đọc 2. ${r2Options[r2AltIdx]?.intro || activeContent?.r2_intro || ''}. ${r2Options[r2AltIdx]?.content || activeContent?.r2_content || ''}`,
                    r2Options[r2AltIdx]?.ref || activeContent?.r2_ref,
                    'r2'
                  )}
                  
                  {r2Options[r2AltIdx]?.quote && (
                    <p className={`italic text-center ${fontClasses} text-stone-600 dark:text-stone-400 mb-5 px-2 font-serif leading-relaxed`}>
                      "{r2Options[r2AltIdx].quote}"
                    </p>
                  )}
                  
                  {r2Options[r2AltIdx]?.intro && (
                    <p className={`font-bold ${fontClasses} text-stone-800 dark:text-stone-200 mb-3 font-serif`}>
                      {r2Options[r2AltIdx].intro}
                    </p>
                  )}
                  
                  {r2Options[r2AltIdx]?.content && (
                    <div className={`${fontClasses}`}>
                      <div dangerouslySetInnerHTML={{ __html: formatLiturgyText(r2Options[r2AltIdx].content) }} />
                    </div>
                  )}
                </div>
              )}

              {/* Đáp ca bổ sung (Đặc biệt Đáp ca sau Bài Đọc 2 trong Lễ Vọng Phục Sinh...) */}
              {extraPsalms.map((psalmItem, pIdx) => (
                <div key={`extra-psalm-${pIdx}`} id="sec-r2-psalm" className="mb-8 sm:mb-12 pl-3.5 sm:pl-8 border-l-4 border-amber-400 dark:border-amber-600 scroll-mt-24">
                  <h3 className={`font-serif ${sectionTitleClasses} ${theme.accentText} mb-2.5 italic flex items-center flex-wrap gap-2`}>
                    <span className="font-bold">{psalmItem.title || "Đáp Ca"}</span> 
                    {(psalmItem.psalm_ref || psalmItem.ref) && (
                      <span className={`${refFontClasses} text-stone-500 font-bold not-italic font-sans`}>
                        - {psalmItem.psalm_ref || psalmItem.ref}
                      </span>
                    )}
                  </h3>
                  
                  <div className={`${fontClasses} italic text-stone-700 dark:text-stone-300`}>
                    <div dangerouslySetInnerHTML={{ __html: formatLiturgyText(psalmItem.psalm_content || psalmItem.content) }} />
                  </div>
                </div>
              ))}

              {/* Ca Tiếp Liên (Sequence - Lễ Phục Sinh, Lễ Chúa Thánh Thần, Lễ Mình Máu Thánh Chúa...) */}
              {sequenceReadings.map((seq, seqIdx) => (
                <div key={`seq-${seqIdx}`} id="sec-sequence" className="mb-8 sm:mb-12 p-4 sm:p-7 rounded-2xl sm:rounded-3xl bg-amber-50/70 dark:bg-amber-950/30 border-2 border-amber-300/80 dark:border-amber-700/60 shadow-sm scroll-mt-24">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h3 className={`font-serif ${sectionTitleClasses} font-bold ${theme.accentText} uppercase tracking-wider text-center`}>
                      {seq.title || "Ca Tiếp Liên"}
                    </h3>
                    <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>

                  {seq.quote && (
                    <p className={`italic text-center ${fontClasses} text-stone-600 dark:text-stone-400 mb-4 px-2 font-serif leading-relaxed`}>
                      "{seq.quote}"
                    </p>
                  )}

                  {seq.content && (
                    <div className={`${fontClasses} font-serif leading-relaxed text-stone-800 dark:text-stone-200`}>
                      <div dangerouslySetInnerHTML={{ __html: formatLiturgyText(seq.content) }} />
                    </div>
                  )}
                </div>
              ))}

              {/* Bài Đọc Phụ (Lễ Vọng Phục Sinh...) */}
              {standardExtraReadings.map((extra, idx) => {
                const extraTitle = extra.title || (idx < 5 ? `Bài Đọc ${idx + 3}` : "Thánh Thư");
                return (
                <div key={`extra-${idx}`} className="mb-8 sm:mb-12 scroll-mt-24">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="h-px bg-stone-200 dark:bg-stone-800 flex-1 max-w-[80px]" />
                    <h3 className={`font-serif text-[17px] sm:text-[20px] font-bold ${theme.accentText} uppercase tracking-wider text-center`}>{extraTitle}</h3>
                    <div className="h-px bg-stone-200 dark:bg-stone-800 flex-1 max-w-[80px]" />
                  </div>
                  {extra.ref && <p className="text-center text-[12px] sm:text-[14px] text-stone-500 font-bold mb-3 font-sans">{extra.ref}</p>}

                  {renderSectionAudioBadge(
                    extraTitle,
                    `${extraTitle}. ${extra.intro || ''}. ${extra.content || ''}`,
                    extra.ref,
                    'r1'
                  )}
                  
                  {extra.quote && (
                    <p className={`italic text-center ${fontClasses} text-stone-600 dark:text-stone-400 mb-5 px-2 font-serif`}>
                      "{extra.quote}"
                    </p>
                  )}
                  
                  {extra.intro && (
                    <p className={`font-bold ${fontClasses} text-stone-800 dark:text-stone-200 mb-3 font-serif`}>
                      {extra.intro}
                    </p>
                  )}
                  
                  {extra.content && (
                    <div className={`${fontClasses} mb-6`}>
                      <div dangerouslySetInnerHTML={{ __html: formatLiturgyText(extra.content) }} />
                    </div>
                  )}

                  {extra.psalm_content && (
                    <div className="mb-8 sm:mb-12 pl-3.5 sm:pl-8 border-l-4 border-amber-400 dark:border-amber-600">
                      <h3 className={`font-serif text-[15px] sm:text-[18px] ${theme.accentText} mb-2.5 italic flex items-center flex-wrap gap-2`}>
                        <span className="font-bold">Đáp Ca</span> 
                        {extra.psalm_ref && <span className="text-[12px] sm:text-[13px] text-stone-500 font-bold not-italic font-sans">- {extra.psalm_ref}</span>}
                      </h3>
                      
                      <div className={`${fontClasses} italic text-stone-700 dark:text-stone-300`}>
                        <div dangerouslySetInnerHTML={{ __html: formatLiturgyText(extra.psalm_content) }} />
                      </div>
                    </div>
                  )}
                </div>
                );
              })}

              {/* Tin Mừng Card Highlight */}
              {gospelOptions.length > 0 && (
                <div id="sec-gospel" className={`mb-8 sm:mb-12 p-0 sm:p-8 rounded-none sm:rounded-3xl border-0 sm:border ${theme.gospelCardBg} shadow-none sm:shadow-sm scroll-mt-24 relative overflow-hidden`}>
                  
                  {/* Decorative Gospel Badge */}
                  <div className="hidden sm:flex absolute top-0 right-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-4 py-1 rounded-bl-2xl text-[11px] font-bold uppercase tracking-widest font-sans items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Tin Mừng
                  </div>

                  {/* Segmented Tab Toggle cho Tin Mừng (nếu có lựa chọn thay thế) */}
                  {gospelOptions.length > 1 && (
                    <div className="flex items-center justify-center gap-2 mb-4 flex-wrap pt-2 sm:pt-0">
                      {gospelOptions.map((opt, idx) => (
                        <button
                          key={`gospel-opt-${idx}`}
                          onClick={() => setGospelAltIdx(idx)}
                          className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all ${
                            gospelAltIdx === idx
                              ? `${theme.btnBg} shadow-sm`
                              : 'bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-700'
                          }`}
                        >
                          {opt.option_label || opt.ref || `Lựa chọn ${idx + 1}`}
                        </button>
                      ))}
                    </div>
                  )}

                  {(gospelOptions[gospelAltIdx]?.alleluia || activeContent.gospel_alleluia) && (
                    <div className={`mb-5 sm:mb-8 text-center ${alleluiaFontClasses} font-serif italic text-amber-900 dark:text-amber-300 px-1 sm:px-12 leading-relaxed`}>
                      <div dangerouslySetInnerHTML={{ __html: formatLiturgyText(gospelOptions[gospelAltIdx]?.alleluia || activeContent.gospel_alleluia) }} />
                    </div>
                  )}

                  <h3 className={`font-serif ${sectionTitleClasses} ${theme.headingText} uppercase tracking-wider text-center font-bold mb-1`}>
                    {gospelOptions[gospelAltIdx]?.title || "Tin Mừng"}
                  </h3>
                  {gospelOptions[gospelAltIdx]?.ref && <p className={`text-center ${refFontClasses} text-stone-500 dark:text-stone-400 font-bold mb-1 font-sans`}>{gospelOptions[gospelAltIdx].ref}</p>}

                  {/* Nút nghe riêng Tin Mừng */}
                  {renderSectionAudioBadge(
                    'Tin Mừng',
                    `Phúc Âm. ${gospelOptions[gospelAltIdx]?.intro || activeContent?.gospel_intro || ''}. ${gospelOptions[gospelAltIdx]?.content || activeContent?.gospel_content || ''}`,
                    gospelOptions[gospelAltIdx]?.ref || activeContent?.gospel_ref,
                    'gospel'
                  )}

                  {gospelOptions[gospelAltIdx]?.quote && (
                    <p className={`italic text-center ${fontClasses} text-stone-600 dark:text-stone-400 mb-5 px-2 font-serif leading-relaxed`}>
                      "{gospelOptions[gospelAltIdx].quote}"
                    </p>
                  )}

                  <div className="relative pl-3.5 sm:pl-6 border-l-4 border-amber-500 dark:border-amber-400">
                    {gospelOptions[gospelAltIdx]?.intro && (
                      <p className={`font-bold ${fontClasses} text-stone-900 dark:text-stone-100 mb-3 font-serif`}>
                        {gospelOptions[gospelAltIdx].intro}
                      </p>
                    )}
                    
                    {gospelOptions[gospelAltIdx]?.content && (
                      <div className={`${fontClasses} text-stone-900 dark:text-stone-100 font-medium`}>
                        <div dangerouslySetInnerHTML={{ __html: formatLiturgyText(gospelOptions[gospelAltIdx].content) }} />
                      </div>
                    )}
                  </div>
                </div>
              )}
                
              {/* Suy niệm */}
              {activeContent.reflection && (
                <div id="sec-reflection" className="border-t border-stone-200 dark:border-stone-800 pt-6 sm:pt-8 mt-8 sm:mt-12 scroll-mt-24">
                  <div className="flex items-center gap-2 mb-4 sm:mb-6">
                    <BookOpen className={`w-5 h-5 ${theme.icon}`} />
                    <h3 className="font-sans text-[18px] sm:text-[22px] font-bold text-stone-900 dark:text-stone-100">Bài Suy Niệm</h3>
                  </div>
                  <div className={`${fontClasses} text-stone-800 dark:text-stone-200 leading-relaxed`}>
                    <div dangerouslySetInnerHTML={{ __html: activeContent.reflection.replace(/\n/g, '<br/>') }} />
                  </div>
                </div>
              )}
              </article>
            ) : (
            <div className="py-20 sm:py-24 text-center bg-white/60 dark:bg-stone-900/50 backdrop-blur-sm border border-stone-200/50 dark:border-stone-800/50 rounded-[28px] sm:rounded-[32px] px-4">
              <Calendar className="w-12 h-12 text-stone-300 dark:text-stone-700 mx-auto mb-4" />
              <h3 className="text-[17px] sm:text-[19px] font-bold text-stone-700 dark:text-stone-300 mb-2">Chưa có bài tĩnh tâm</h3>
              <p className="text-[13px] sm:text-[14px] text-stone-500 max-w-sm mx-auto">
                Hiện tại hệ thống chưa cập nhật Lời Chúa và Bài suy niệm cho <b>{liturgyInfo?.displayName}</b>. Xin vui lòng quay lại sau.
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Sticky Bottom Quick Navigation Bar */}
      {activeContent && (
        <div className="fixed bottom-20 sm:bottom-5 left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl border border-stone-200/90 dark:border-stone-800/90 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-2xl flex items-center gap-1 sm:gap-2 text-[11px] sm:text-[12px] font-bold text-stone-600 dark:text-stone-300 max-w-[94vw] overflow-x-auto no-scrollbar">
          {processionReadings.length > 0 && (
            <button onClick={() => scrollToSection('sec-procession')} className="px-2 sm:px-2.5 py-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors whitespace-nowrap text-emerald-700 dark:text-emerald-400 font-bold">
              Kiệu Lá
            </button>
          )}
          {r1Options.length > 0 && (
            <button onClick={() => scrollToSection('sec-r1')} className="px-2 sm:px-2.5 py-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors whitespace-nowrap">
              Đọc 1
            </button>
          )}
          {activeContent.psalm_content && (
            <button onClick={() => scrollToSection('sec-psalm')} className="px-2 sm:px-2.5 py-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors whitespace-nowrap">
              Đáp Ca
            </button>
          )}
          {r2Options.length > 0 && (
            <button onClick={() => scrollToSection('sec-r2')} className="px-2 sm:px-2.5 py-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors whitespace-nowrap">
              Đọc 2
            </button>
          )}
          {sequenceReadings.length > 0 && (
            <button onClick={() => scrollToSection('sec-sequence')} className="px-2 sm:px-2.5 py-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors whitespace-nowrap text-amber-600 dark:text-amber-400 font-bold">
              Ca Tiếp Liên
            </button>
          )}
          {gospelOptions.length > 0 && (
            <button onClick={() => scrollToSection('sec-gospel')} className={`px-2.5 sm:px-3 py-1 rounded-full ${theme.btnBg} transition-all shadow-sm whitespace-nowrap`}>
              Tin Mừng
            </button>
          )}
          {activeContent.reflection && (
            <button onClick={() => scrollToSection('sec-reflection')} className="px-2 sm:px-2.5 py-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors whitespace-nowrap">
              Suy Niệm
            </button>
          )}
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ml-0.5 flex-shrink-0" title="Lên đầu trang">
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search Command Palette Modal & Fullscreen Sheet */}
      <AnimatePresence>
        {isSearchOpen && (
          <div className="fixed inset-0 z-[90] flex items-start sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden" data-ui-layer="modal-root" data-lenis-prevent>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSearchOpen(false)}
              className="fixed inset-0 bg-stone-950/60 dark:bg-black/80 backdrop-blur-md transition-opacity"
            />

            {/* Modal Dialog Content */}
            <motion.div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-label="Tìm kiếm Lời Chúa"
              onKeyDown={handleSearchModalKeyDown}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-2xl bg-white/95 dark:bg-stone-900/95 backdrop-blur-2xl border-0 sm:border border-stone-200/90 dark:border-stone-800/90 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10"
            >
              {/* Search Header Input Bar */}
              {/* Search Header Input Bar */}
<div className="p-3 sm:p-4 border-b border-stone-200/80 dark:border-stone-800/80 flex items-center gap-3 bg-stone-50/70 dark:bg-stone-900/70 focus-within:bg-white dark:focus-within:bg-stone-900 transition-colors">
  <div className="group flex min-w-0 flex-1 items-center rounded-2xl border border-stone-200 bg-white px-3 transition-all focus-within:border-amber-500 focus-within:ring-3 focus-within:ring-amber-500/15 dark:border-stone-700 dark:bg-stone-900 dark:focus-within:border-amber-500">
    <Search className={`w-4 h-4 shrink-0 text-stone-400 group-focus-within:text-amber-600 dark:group-focus-within:text-amber-400`} aria-hidden="true" />
    <input
  ref={searchInputRef}
  type="text"
  role="combobox"
  aria-expanded={flatResults.length > 0}
  aria-controls="liturgy-search-results"
  aria-autocomplete="list"
  aria-activedescendant={highlightedIndex >= 0 ? `search-option-${highlightedIndex}` : undefined}
  aria-label="Tìm bài đọc, ngày lễ, từ khóa, trích dẫn Lời Chúa"
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  placeholder="Tìm bài đọc, ngày lễ, từ khóa, trích dẫn Lời Chúa..."
  className="search-input h-11 min-w-0 flex-1 border-none bg-transparent px-3 text-[16px] sm:text-[17px] font-medium text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none"
/>
    {searchQuery && (
      <button
        onClick={() => {
          setSearchQuery('');
          setSearchResults([]);
          setHighlightedIndex(-1);
          searchInputRef.current?.focus();
        }}
        aria-label="Xoá nội dung tìm kiếm"
        className="flex-shrink-0 p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-full hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    )}
  </div>

  {!searchQuery && (
    <kbd className="hidden sm:inline-flex flex-shrink-0 items-center px-2 py-1 text-[11px] font-bold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700/80 rounded-lg shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_rgba(0,0,0,0.4)]">
      ESC
    </kbd>
  )}

  <button
    onClick={() => setIsSearchOpen(false)}
    className="sm:hidden flex-shrink-0 p-1 text-[13px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
  >
    Đóng
  </button>
</div>

              {/* Modal Body / Scrollable Results & Suggestions */}
              <div
                className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6 no-scrollbar"
                data-lenis-prevent
                id="liturgy-search-results"
                role="listbox"
                aria-label="Kết quả tìm kiếm"
              >
                {searchQuery.trim().length === 1 && (
                  <div className="py-2 text-center text-[13px] text-stone-400 dark:text-stone-500">
                    Gõ thêm ít nhất 1 ký tự để bắt đầu tìm kiếm...
                  </div>
                )}
                {/* Trạng thái 1: Chưa nhập từ khóa -> Hiển thị Quick Search Chips & Lợi ích tra cứu */}
                {searchQuery.trim().length < 2 ? (
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-[12px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-3 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-amber-500" /> Gợi Ý Tra Cứu Nhanh
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {QUICK_SEARCH_CHIPS.map((chip, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSearchQuery(chip.query)}
                            className="px-3 py-1.5 rounded-xl text-[13px] font-semibold bg-stone-100/80 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 hover:text-amber-900 dark:hover:text-amber-200 border border-stone-200/60 dark:border-stone-700/60 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {showSearchTip && (
                      <div className="relative p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30">
                        <button
                          onClick={() => {
                            setShowSearchTip(false);
                            try {
                              localStorage.setItem('liturgy_search_tip_seen', '1');
                            } catch {
                              /* localStorage không khả dụng, bỏ qua */
                            }
                          }}
                          aria-label="Đóng mẹo tra cứu"
                          className="absolute top-2.5 right-2.5 p-1 text-amber-700/60 hover:text-amber-900 dark:text-amber-400/60 dark:hover:text-amber-200 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <p className="text-[12px] text-amber-900 dark:text-amber-300 font-medium leading-relaxed pr-6">
                          💡 <b>Mẹo tra cứu:</b> Bạn có thể gõ tên Thánh Lễ <i>(Lễ Giáng Sinh, Lễ Lá...)</i>, đoạn Kinh Thánh <i>(Phúc Âm Gio-an, Bài đọc 1...)</i> hoặc trích dẫn bất kỳ để tìm lại bài suy niệm.
                        </p>
                      </div>
                    )}
                  </div>
                ) : searching ? (
                  /* Trạng thái 2: Đang tìm kiếm */
                  <div className="py-12 text-center text-stone-500 dark:text-stone-400 text-[14px] flex flex-col items-center justify-center gap-3">
                    <Loader2 className={`w-7 h-7 animate-spin ${theme.icon}`} />
                    <span>Đang tra cứu cơ sở dữ liệu Lời Chúa...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  /* Trạng thái 3: Hiển thị kết quả được phân nhóm */
                  <div className="space-y-6">
                    <div aria-live="polite" className="sr-only">
                      Tìm thấy {searchResults.length} kết quả cho "{searchQuery}"
                    </div>

                    {/* Nhóm 1: Ngày Lễ & Lễ Trọng */}
                    {categorizedSearchResults.feasts.length > 0 && (
                      <div>
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-2.5 flex items-center gap-1.5">
                          <CalendarHeart className="w-3.5 h-3.5" /> Ngày Lễ & Lễ Kính ({categorizedSearchResults.feasts.length})
                        </h4>
                        <div className="space-y-2">
                          {categorizedSearchResults.feasts.map((item) => {
                            const flatIndex = flatResults.indexOf(item);
                            const isActive = highlightedIndex === flatIndex;
                            return (
                              <div
                                key={item.id || item.liturgy_key + item.cycle}
                                id={`search-option-${flatIndex}`}
                                role="option"
                                aria-selected={isActive}
                                ref={(el) => { optionRefs.current[flatIndex] = el; }}
                                onMouseEnter={() => setHighlightedIndex(flatIndex)}
                                className={`rounded-xl transition-colors ${
                                  isActive
                                    ? 'bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-400/70 dark:ring-amber-600/60'
                                    : ''
                                }`}
                              >
                                <SearchResultItem
                                  item={item}
                                  query={searchQuery}
                                  onSelect={handleSelectSearchResult}
                                  theme={theme}
                                  highlightSearchText={highlightSearchText}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Nhóm 2: Bài Đọc & Phúc Âm */}
                    {categorizedSearchResults.readings.length > 0 && (
                      <div>
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2.5 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5" /> Trích Dẫn Lời Chúa & Bài Đọc ({categorizedSearchResults.readings.length})
                        </h4>
                        <div className="space-y-2">
                          {categorizedSearchResults.readings.map((item) => {
                            const flatIndex = flatResults.indexOf(item);
                            const isActive = highlightedIndex === flatIndex;
                            return (
                              <div
                                key={item.id || item.liturgy_key + item.cycle}
                                id={`search-option-${flatIndex}`}
                                role="option"
                                aria-selected={isActive}
                                ref={(el) => { optionRefs.current[flatIndex] = el; }}
                                onMouseEnter={() => setHighlightedIndex(flatIndex)}
                                className={`rounded-xl transition-colors ${
                                  isActive
                                    ? 'bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-400/70 dark:ring-amber-600/60'
                                    : ''
                                }`}
                              >
                                <SearchResultItem
                                  item={item}
                                  query={searchQuery}
                                  onSelect={handleSelectSearchResult}
                                  theme={theme}
                                  highlightSearchText={highlightSearchText}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Nhóm 3: Bài Suy Niệm */}
                    {categorizedSearchResults.reflections.length > 0 && (
                      <div>
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 mb-2.5 flex items-center gap-1.5">
                          <PenLine className="w-3.5 h-3.5" /> Bài Suy Niệm ({categorizedSearchResults.reflections.length})
                        </h4>
                        <div className="space-y-2">
                          {categorizedSearchResults.reflections.map((item) => {
                            const flatIndex = flatResults.indexOf(item);
                            const isActive = highlightedIndex === flatIndex;
                            return (
                              <div
                                key={item.id || item.liturgy_key + item.cycle}
                                id={`search-option-${flatIndex}`}
                                role="option"
                                aria-selected={isActive}
                                ref={(el) => { optionRefs.current[flatIndex] = el; }}
                                onMouseEnter={() => setHighlightedIndex(flatIndex)}
                                className={`rounded-xl transition-colors ${
                                  isActive
                                    ? 'bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-400/70 dark:ring-amber-600/60'
                                    : ''
                                }`}
                              >
                                <SearchResultItem
                                  item={item}
                                  query={searchQuery}
                                  onSelect={handleSelectSearchResult}
                                  theme={theme}
                                  highlightSearchText={highlightSearchText}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Trạng thái 4: Không có kết quả */
                  <div className="py-12 text-center text-stone-500 dark:text-stone-400 text-[14px]">
                    <p className="font-bold text-stone-700 dark:text-stone-300 mb-1">Không tìm thấy bài đọc nào</p>
                    <p className="text-[13px] text-stone-400">Thử tìm kiếm với từ khóa khác như "Đức Mẹ", "Gioan", "Mùa Vọng"...</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-4 py-2.5 sm:px-6 sm:py-3 border-t border-stone-200/80 dark:border-stone-800/80 bg-stone-100/50 dark:bg-stone-900/50 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                <div className="flex items-center gap-3">
                  <span className="hidden sm:flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 font-sans bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded text-[10px]">↑↓</kbd> Di chuyển
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 font-sans bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded text-[10px]">↵</kbd> Chọn kết quả
                  </span>
                  <span className="hidden sm:flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 font-sans bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded text-[10px]">ESC</kbd> Đóng
                  </span>
                </div>
                <span>Tra cứu Lời Chúa Phụng Vụ</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}