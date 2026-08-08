import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, BookOpen, CornerDownLeft, ArrowUp, ArrowDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { searchBible } from '../../utils/bibleService.js';

// Bôi đậm phần text khớp với từ khóa đang tìm (không phân biệt hoa/thường).
// Dùng regex có capture group nên split() luôn trả về mảng xen kẽ
// [thường, khớp, thường, khớp, ...] — dựa vào chỉ số lẻ/chẵn thay vì
// gọi lại regex.test() để tránh lỗi lastIndex khi regex có cờ "g".
function highlightMatch(text, query) {
  const q = query.trim();
  if (!q || !text) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = String(text).split(new RegExp(`(${escaped})`, 'ig'));
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark
        key={i}
        className="rounded-[3px] bg-amber-200/70 px-0.5 text-amber-950 dark:bg-amber-500/30 dark:text-amber-100"
      >
        {part}
      </mark>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

export default function BibleSearchModal({ isOpen, onClose, allBooks }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const itemRefs = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const q = query.toLowerCase();

        // 1. Tìm tên sách từ local JSON
        const bookMatches = allBooks
          .filter((b) => b.name.toLowerCase().includes(q) || b.short.toLowerCase().includes(q))
          .map((b) => ({
            type: 'book',
            bookId: b.id,
            bookName: b.name,
            bookShort: b.short,
            title: `Sách ${b.name}`,
            text: `Nhấn để đi đến chương 1 của sách ${b.name}`,
          }));

        // 2. Tìm câu Kinh Thánh từ Supabase
        const verseMatches = await searchBible(query);

        // Giữ nguyên thứ tự "sách trước, câu sau" — thứ tự này được
        // các phần render nhóm bên dưới dựa vào để tách section.
        setResults([...bookMatches, ...verseMatches]);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Lỗi search:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400); // debounce input

    return () => clearTimeout(timer);
  }, [query, allBooks]);

  // Cuộn item đang được chọn (bàn phím) vào vùng nhìn thấy.
  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const bookCount = useMemo(() => results.filter((r) => r.type === 'book').length, [results]);
  const verseCount = results.length - bookCount;

  // Vài sách Tân Ước để gợi ý bắt đầu nhanh khi ô tìm kiếm còn trống.
  const quickStartBooks = useMemo(
    () => allBooks.filter((b) => b.testament === 'new').slice(0, 6),
    [allBooks]
  );

  const handleSelect = (item) => {
    if (!item) return;
    if (item.type === 'book') {
      navigate(`/bible/${item.bookId}/1`);
    } else {
      navigate(`/bible/${item.bookId}/${item.chapter}`);
      // Ideal: có thể pass state để scroll tới item.verse
    }
    onClose();
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (!results.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  // Render danh sách kết quả theo nhóm "Sách" / "Câu Kinh Thánh" nhưng vẫn
  // giữ chỉ số phẳng (idx) khớp với selectedIndex để điều hướng bàn phím
  // hoạt động đúng — dựa vào việc bookMatches luôn đứng trước verseMatches.
  let lastType = null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div data-ui-layer="modal-root" className="fixed inset-0 z-[90] flex items-start justify-center p-4 pt-16 sm:p-6 sm:pt-24">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            data-ui-layer="modal-backdrop"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            data-ui-layer="modal-content"
            role="dialog"
            aria-modal="true"
            aria-label="Tìm kiếm Kinh Thánh"
            className="relative flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl dark:border-stone-800 dark:bg-stone-900"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-2 border-b border-stone-200 bg-stone-50/50 p-3 dark:border-stone-800 dark:bg-stone-950/50 sm:p-4">
              <div className="group flex min-w-0 flex-1 items-center rounded-2xl border border-stone-200 bg-white px-3 transition-all focus-within:border-amber-500 focus-within:ring-3 focus-within:ring-amber-500/15 dark:border-stone-700 dark:bg-stone-900 dark:focus-within:border-amber-500">
                <Search className="shrink-0 text-stone-400 group-focus-within:text-amber-600" size={20} />
                <input
                  ref={inputRef}
                  type="text"
                  role="combobox"
                  aria-expanded={results.length > 0}
                  aria-controls="bible-search-results"
                  aria-activedescendant={results.length ? `bible-search-item-${selectedIndex}` : undefined}
                  aria-label="Tìm kiếm Kinh Thánh"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Tìm sách, câu hoặc từ khóa..."
                  className="search-input h-12 min-w-0 flex-1 border-none bg-transparent px-3 font-serif text-base text-stone-900 outline-none placeholder:text-stone-400 sm:text-lg dark:text-stone-100"
                />
                {isSearching && (
                  <Loader2 size={16} className="mr-1 shrink-0 animate-spin text-amber-500" aria-hidden="true" />
                )}
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      inputRef.current?.focus();
                    }}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                    aria-label="Xóa nội dung tìm kiếm"
                  >
                    <X size={17} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-stone-200 text-stone-700 transition-colors hover:bg-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700 sm:w-auto sm:px-4"
                aria-label="Đóng tìm kiếm"
              >
                <X size={18} className="sm:hidden" />
                <span className="hidden text-sm font-bold sm:inline">Đóng</span>
              </button>
            </div>

            {/* Thanh trạng thái: số kết quả — chỉ hiện khi đã có dữ liệu để không nhấp nháy */}
            {query.trim() && results.length > 0 && (
              <div className="flex items-center justify-between border-b border-stone-100 px-4 py-1.5 text-[11px] font-medium text-stone-400 dark:border-stone-800/80 dark:text-stone-500 sm:px-5">
                <span>
                  {results.length} kết quả
                  {bookCount > 0 && verseCount > 0 && ` · ${bookCount} sách, ${verseCount} câu`}
                </span>
                <span className="hidden items-center gap-2.5 sm:flex">
                  <span className="inline-flex items-center gap-0.5">
                    <ArrowUp size={11} /><ArrowDown size={11} /> chọn
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CornerDownLeft size={11} /> mở
                  </span>
                </span>
              </div>
            )}

            {/* Results Area */}
            <div
              id="bible-search-results"
              role="listbox"
              className="min-h-[200px] flex-1 overflow-y-auto bg-white p-2 transition-opacity dark:bg-stone-900 sm:p-4"
              style={{ opacity: isSearching && results.length > 0 ? 0.5 : 1 }}
            >
              {isSearching && results.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-stone-400">
                  <Loader2 size={32} className="animate-spin text-amber-500" />
                  <p className="text-sm">Đang tìm kiếm toàn văn...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-1">
                  {results.map((res, idx) => {
                    const showHeader = res.type !== lastType;
                    lastType = res.type;
                    const isActive = idx === selectedIndex;

                    return (
                      <React.Fragment key={idx}>
                        {showHeader && (
                          <p
                            className={`px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400 dark:text-stone-500 ${
                              idx !== 0 ? 'pt-3' : 'pt-1'
                            }`}
                          >
                            {res.type === 'book' ? `Sách (${bookCount})` : `Câu Kinh Thánh (${verseCount})`}
                          </p>
                        )}
                        <button
                          id={`bible-search-item-${idx}`}
                          ref={(el) => { itemRefs.current[idx] = el; }}
                          role="option"
                          aria-selected={isActive}
                          onClick={() => handleSelect(res)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`flex w-full cursor-pointer items-start gap-4 rounded-2xl border p-3 text-left transition-colors sm:p-4 ${
                            isActive
                              ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'
                              : 'border-transparent hover:border-stone-200 hover:bg-stone-50 dark:hover:border-stone-800 dark:hover:bg-stone-800/50'
                          }`}
                        >
                          <div
                            className={`mt-1 shrink-0 rounded-xl p-2 ${
                              res.type === 'book'
                                ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                                : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                            }`}
                          >
                            <BookOpen size={20} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                              <span className="font-bold text-stone-900 dark:text-stone-100">
                                {highlightMatch(res.title, query)}
                              </span>
                              <span className="shrink-0 rounded bg-stone-100 px-2 py-0.5 font-mono text-xs font-normal text-stone-400 dark:bg-stone-800">
                                {res.type === 'book' ? 'Sách' : 'Câu Kinh Thánh'}
                              </span>
                            </div>
                            <p
                              className={`mt-1 line-clamp-2 text-sm text-stone-500 dark:text-stone-400 ${
                                res.type === 'verse' ? 'font-serif italic' : ''
                              }`}
                            >
                              {highlightMatch(res.text, query)}
                            </p>
                          </div>
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
              ) : query.trim() ? (
                <div className="flex h-full flex-col items-center justify-center py-12 text-center text-stone-400">
                  <Search size={48} className="mb-4 opacity-20" />
                  <p>Không tìm thấy kết quả cho &ldquo;{query}&rdquo;</p>
                  <p className="mt-2 text-xs opacity-60">Hãy thử tên sách hoặc một từ khóa ngắn hơn.</p>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-5 py-10 text-center text-stone-400">
                  <div className="flex flex-col items-center gap-3">
                    <BookOpen size={40} className="opacity-20" />
                    <p>Gõ tên sách, đoạn hoặc từ khoá để tìm kiếm</p>
                  </div>
                  {quickStartBooks.length > 0 && (
                    <div className="w-full max-w-md">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-300 dark:text-stone-600">
                        Bắt đầu nhanh
                      </p>
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {quickStartBooks.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => handleSelect({ type: 'book', bookId: b.id })}
                            className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-amber-700 dark:hover:bg-amber-950/30 dark:hover:text-amber-300"
                          >
                            {b.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}