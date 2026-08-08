import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

// Phân tách Contexts để tránh re-render thừa trên Mobile
const LiturgyStateContext = createContext();
const LiturgyActionsContext = createContext();

export function LiturgyProvider({ children }) {
  // 1. Trạng thái Ngày Phụng Vụ
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  // 2. Trạng thái Giao diện & Chế độ đọc (Light, Dark, Sepia)
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('theme_mode') || 'light';
  });

  const [readingTheme, setReadingTheme] = useState(() => {
    return localStorage.getItem('reading_theme') || 'light';
  });

  // 3. Tùy chỉnh Chữ & Định dạng (Typography)
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('font_size') || 'medium');
  const [fontStyle, setFontStyle] = useState(() => localStorage.getItem('font_style') || 'serif');
  const [lineHeight, setLineHeight] = useState(() => localStorage.getItem('line_height') || 'normal');
  const [showRedLetter, setShowRedLetter] = useState(() => localStorage.getItem('show_red_letter') !== 'false');

  // 4. Trạng thái Đã lưu (Bookmarks) & Lịch sử đọc (Reading History)
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('saved_liturgies') || '[]');
    } catch (e) {
      return [];
    }
  });

  const [readingHistory, setReadingHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('reading_history') || '[]');
    } catch (e) {
      return [];
    }
  });

  // 5. Trạng thái Mobile UX (Bottom Sheet & Offline Status)
  const [isReadingSheetOpen, setIsReadingSheetOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Lắng nghe trạng thái kết nối mạng của điện thoại
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync Theme với root element (HTML document)
  useEffect(() => {
    localStorage.setItem('theme_mode', themeMode);
    const root = document.documentElement;
    
    // Xóa tất cả theme cũ
    root.classList.remove('dark', 'theme-sepia');
    
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else if (themeMode === 'sepia') {
      root.classList.add('theme-sepia');
    }
  }, [themeMode]);

  // Sync Reading Theme & Settings vào LocalStorage
  useEffect(() => {
    localStorage.setItem('reading_theme', readingTheme);
  }, [readingTheme]);

  useEffect(() => {
    localStorage.setItem('font_size', fontSize);
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('font_style', fontStyle);
  }, [fontStyle]);

  useEffect(() => {
    localStorage.setItem('line_height', lineHeight);
  }, [lineHeight]);

  useEffect(() => {
    localStorage.setItem('show_red_letter', showRedLetter);
  }, [showRedLetter]);

  useEffect(() => {
    localStorage.setItem('saved_liturgies', JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    localStorage.setItem('reading_history', JSON.stringify(readingHistory.slice(0, 15)));
  }, [readingHistory]);

  // ─────────────────────────────────────────────────────────────
  // MOBILE NAVIGATION HELPERS (Hỗ trợ vuốt & thao tác ngày)
  // ─────────────────────────────────────────────────────────────
  const goToNextDay = useCallback(() => {
    setSelectedDate(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 1);
      return next;
    });
  }, []);

  const goToPrevDay = useCallback(() => {
    setSelectedDate(prev => {
      const prevDay = new Date(prev);
      prevDay.setDate(prevDay.getDate() - 1);
      return prevDay;
    });
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  const isToday = useMemo(() => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  }, [selectedDate]);

  // ─────────────────────────────────────────────────────────────
  // THEME & TYPOGRAPHY ACTIONS
  // ─────────────────────────────────────────────────────────────
  const cycleTheme = useCallback(() => {
    setThemeMode(prev => {
      const next = prev === 'light' ? 'sepia' : (prev === 'sepia' ? 'dark' : 'light');
      setReadingTheme(next); // cycleTheme should also sync readingTheme
      return next;
    });
  }, []);

  const cycleFontSize = useCallback(() => {
    setFontSize(prev => {
      if (prev === 'normal') return 'medium';
      if (prev === 'medium') return 'large';
      if (prev === 'large') return 'xlarge';
      return 'normal';
    });
  }, []);

  const cycleLineHeight = useCallback(() => {
    setLineHeight(prev => {
      if (prev === 'compact') return 'normal';
      if (prev === 'normal') return 'relaxed';
      return 'compact';
    });
  }, []);

  // ─────────────────────────────────────────────────────────────
  // BOOKMARK & HISTORY ACTIONS
  // ─────────────────────────────────────────────────────────────
  const isBookmarked = useCallback((date) => {
    const dateStr = (date || selectedDate).toDateString();
    return bookmarks.some(b => b.dateStr === dateStr);
  }, [bookmarks, selectedDate]);

  const toggleBookmark = useCallback((data, info, customDate = null) => {
    const targetDate = customDate || selectedDate;
    const dateStr = targetDate.toDateString();
    
    setBookmarks(prev => {
      if (prev.some(b => b.dateStr === dateStr)) {
        return prev.filter(b => b.dateStr !== dateStr);
      } else {
        const newItem = {
          dateStr,
          dateFormatted: targetDate.toLocaleDateString('vi-VN'),
          title: info?.displayName || data?.title || 'Lời Chúa Mỗi Ngày',
          gospelRef: data?.gospel_ref || data?.r1_ref || '',
          gospelQuote: data?.gospel_quote || data?.quote || '',
          savedAt: Date.now()
        };
        return [newItem, ...prev];
      }
    });
  }, [selectedDate]);

  const recordReadingHistory = useCallback((liturgyData) => {
    if (!liturgyData) return;
    const dateStr = selectedDate.toDateString();
    
    setReadingHistory(prev => {
      const filtered = prev.filter(item => item.dateStr !== dateStr);
      return [{
        dateStr,
        dateFormatted: selectedDate.toLocaleDateString('vi-VN'),
        title: liturgyData.title || 'Phụng Vụ Ngày',
        readAt: Date.now()
      }, ...filtered];
    });
  }, [selectedDate]);

  // ─────────────────────────────────────────────────────────────
  // MEMOIZED CONTEXT VALUES FOR PERFORMANCE
  // ─────────────────────────────────────────────────────────────
  const stateValue = useMemo(() => ({
    selectedDate,
    isToday,
    themeMode,
    readingTheme,
    fontSize,
    fontStyle,
    lineHeight,
    showRedLetter,
    bookmarks,
    readingHistory,
    isReadingSheetOpen,
    isOnline
  }), [
    selectedDate,
    isToday,
    themeMode,
    readingTheme,
    fontSize,
    fontStyle,
    lineHeight,
    showRedLetter,
    bookmarks,
    readingHistory,
    isReadingSheetOpen,
    isOnline
  ]);

  const actionsValue = useMemo(() => ({
    setSelectedDate,
    goToNextDay,
    goToPrevDay,
    goToToday,
    setThemeMode,
    setReadingTheme,
    cycleTheme,
    setFontSize,
    cycleFontSize,
    setFontStyle,
    setLineHeight,
    cycleLineHeight,
    setShowRedLetter,
    isBookmarked,
    toggleBookmark,
    recordReadingHistory,
    setIsReadingSheetOpen
  }), [
    goToNextDay,
    goToPrevDay,
    goToToday,
    cycleTheme,
    cycleFontSize,
    cycleLineHeight,
    isBookmarked,
    toggleBookmark,
    recordReadingHistory
  ]);

  return (
    <LiturgyStateContext.Provider value={stateValue}>
      <LiturgyActionsContext.Provider value={actionsValue}>
        {children}
      </LiturgyActionsContext.Provider>
    </LiturgyStateContext.Provider>
  );
}

// Custom Hooks chuyên biệt cho phép tách biệt giữa State và Actions
export function useLiturgyState() {
  const context = useContext(LiturgyStateContext);
  if (!context) throw new Error('useLiturgyState must be used within LiturgyProvider');
  return context;
}

export function useLiturgyActions() {
  const context = useContext(LiturgyActionsContext);
  if (!context) throw new Error('useLiturgyActions must be used within LiturgyProvider');
  return context;
}

// Backward-compatible hook
export function useLiturgy() {
  const state = useLiturgyState();
  const actions = useLiturgyActions();
  return { ...state, ...actions };
}
