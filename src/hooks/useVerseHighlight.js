import { useState, useEffect, useCallback } from 'react';

// 5 màu highlight chuẩn YouVersion
export const HIGHLIGHT_COLORS = {
  yellow: {
    label: 'Vàng',
    bg: 'highlight-yellow',
    dot: '#fbbf24',
  },
  green: {
    label: 'Xanh lá',
    bg: 'highlight-green',
    dot: '#4ade80',
  },
  blue: {
    label: 'Xanh dương',
    bg: 'highlight-blue',
    dot: '#60a5fa',
  },
  pink: {
    label: 'Hồng',
    bg: 'highlight-pink',
    dot: '#f472b6',
  },
  purple: {
    label: 'Tím',
    bg: 'highlight-purple',
    dot: '#a78bfa',
  },
};

/**
 * Custom hook quản lý highlight đa màu cho câu Kinh Thánh.
 * Lưu trữ vào localStorage, schema: { "mat_15_24": "yellow", ... }
 */
export function useVerseHighlight() {
  const [highlights, setHighlights] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('verse_highlights') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('verse_highlights', JSON.stringify(highlights));
  }, [highlights]);

  /**
   * Tạo key duy nhất cho câu: `bookId_chapter_verseNum`
   */
  const makeKey = useCallback((bookId, chapter, verseNum) => {
    return `${bookId}_${chapter}_${verseNum}`;
  }, []);

  /**
   * Lấy màu highlight của câu, hoặc null nếu chưa highlight
   */
  const getHighlight = useCallback((bookId, chapter, verseNum) => {
    return highlights[makeKey(bookId, chapter, verseNum)] || null;
  }, [highlights, makeKey]);

  /**
   * Tô màu câu. Nếu color === null hoặc cùng màu hiện tại → xóa highlight.
   */
  const setHighlight = useCallback((bookId, chapter, verseNum, color) => {
    const key = makeKey(bookId, chapter, verseNum);
    setHighlights(prev => {
      const next = { ...prev };
      if (!color || prev[key] === color) {
        delete next[key]; // Toggle off
      } else {
        next[key] = color;
      }
      return next;
    });
  }, [makeKey]);

  /**
   * Xóa toàn bộ highlight của 1 chương
   */
  const clearChapterHighlights = useCallback((bookId, chapter) => {
    setHighlights(prev => {
      const next = { ...prev };
      const prefix = `${bookId}_${chapter}_`;
      Object.keys(next).forEach(k => {
        if (k.startsWith(prefix)) delete next[k];
      });
      return next;
    });
  }, []);

  return { highlights, getHighlight, setHighlight, clearChapterHighlights, HIGHLIGHT_COLORS };
}
