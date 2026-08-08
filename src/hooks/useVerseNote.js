import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook quản lý ghi chú (notes) cho câu Kinh Thánh.
 * Lưu trữ vào localStorage, schema: 
 * { 
 *   "mat_15_24": { text: "Ghi chú của tôi...", updatedAt: "2026-07-31T15:00:00Z" } 
 * }
 */
export function useVerseNote() {
  const [notes, setNotes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('verse_notes') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('verse_notes', JSON.stringify(notes));
  }, [notes]);

  const makeKey = useCallback((bookId, chapter, verseNum) => {
    return `${bookId}_${chapter}_${verseNum}`;
  }, []);

  const getNote = useCallback((bookId, chapter, verseNum) => {
    return notes[makeKey(bookId, chapter, verseNum)] || null;
  }, [notes, makeKey]);

  const saveNote = useCallback((bookId, chapter, verseNum, text) => {
    const key = makeKey(bookId, chapter, verseNum);
    setNotes(prev => {
      const next = { ...prev };
      if (!text || text.trim() === '') {
        delete next[key];
      } else {
        next[key] = {
          text: text.trim(),
          updatedAt: new Date().toISOString()
        };
      }
      return next;
    });
  }, [makeKey]);

  const deleteNote = useCallback((bookId, chapter, verseNum) => {
    const key = makeKey(bookId, chapter, verseNum);
    setNotes(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, [makeKey]);

  return { notes, getNote, saveNote, deleteNote };
}
