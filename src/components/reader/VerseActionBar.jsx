import React, { useState } from 'react';
import { Bookmark, Highlighter, MessageSquare, Share2, Check, X, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { HIGHLIGHT_COLORS } from '../../hooks/useVerseHighlight.js';

export default function VerseActionBar({ 
  verseNum,
  verseText,
  isBookmarked,
  onBookmark,
  onShare,
  hasCopied,
  onHighlight,
  currentHighlight, // màu đang được highlight (hoặc null)
  onNote,
  onMultiSelect,
}) {
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="flex flex-col gap-2 mt-3"
        onClick={(e) => e.stopPropagation()} // Ngăn click lan ra ngoài đóng bar
      >
        {/* Color Picker Popup — hiện trên nút highlight */}
        <AnimatePresence>
          {showHighlightPicker && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="flex items-center gap-1.5 p-2 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-xl"
            >
              {/* Nút xóa highlight (nếu đang có) */}
              {currentHighlight && (
                <button
                  type="button"
                  onClick={() => { onHighlight(null); setShowHighlightPicker(false); }}
                  className="w-7 h-7 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                  title="Xóa tô sáng"
                  aria-label="Xóa tô sáng"
                >
                  <X size={12} className="text-stone-500" />
                </button>
              )}
              {/* 5 Màu */}
              {Object.entries(HIGHLIGHT_COLORS).map(([colorKey, colorDef]) => (
                <button
                  key={colorKey}
                  type="button"
                  onClick={() => { onHighlight(colorKey); setShowHighlightPicker(false); }}
                  className={`w-7 h-7 rounded-full transition-transform hover:scale-110 active:scale-95 cursor-pointer ring-2 ring-offset-1 ring-offset-white dark:ring-offset-stone-900 ${
                    currentHighlight === colorKey ? 'ring-stone-600 dark:ring-stone-300 scale-110' : 'ring-transparent'
                  }`}
                  style={{ backgroundColor: colorDef.dot }}
                  title={colorDef.label}
                  aria-label={`Tô sáng màu ${colorDef.label}`}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Action Bar */}
        <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-md w-fit">
          
          {/* Highlight Button */}
          <button 
            type="button"
            onClick={() => setShowHighlightPicker(prev => !prev)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer ${
              showHighlightPicker || currentHighlight
                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title="Tô sáng"
            aria-label="Mở bảng chọn màu tô sáng"
          >
            <Highlighter size={18} />
            <span className="text-[10px] font-medium hidden sm:block">Tô sáng</span>
          </button>

          {/* Bookmark Button */}
          <button 
            type="button"
            onClick={() => onBookmark(verseNum)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer ${
              isBookmarked 
                ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' 
                : 'text-stone-500 hover:text-amber-600 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title="Đánh dấu"
            aria-label={isBookmarked ? 'Bỏ đánh dấu câu này' : 'Đánh dấu câu này'}
          >
            <Bookmark size={18} className={isBookmarked ? 'fill-current' : ''} />
            <span className="text-[10px] font-medium hidden sm:block">Đánh dấu</span>
          </button>

          {/* Note Button */}
          <button 
            type="button"
            onClick={() => onNote?.(verseNum)}
            className="flex flex-col items-center gap-1 p-2 rounded-xl text-stone-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-all cursor-pointer"
            title="Ghi chú"
            aria-label="Thêm ghi chú cho câu này"
          >
            <MessageSquare size={18} />
            <span className="text-[10px] font-medium hidden sm:block">Ghi chú</span>
          </button>

          {/* Multi Select Button */}
          <button 
            type="button"
            onClick={onMultiSelect}
            className="flex flex-col items-center gap-1 p-2 rounded-xl text-stone-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer"
            title="Chọn nhiều câu"
            aria-label="Chọn nhiều câu"
          >
            <CheckSquare size={18} />
            <span className="text-[10px] font-medium hidden sm:block">Chọn</span>
          </button>

          {/* Share/Copy Button */}
          <button 
            type="button"
            onClick={() => onShare(verseNum)}
            className="flex flex-col items-center gap-1 p-2 rounded-xl text-stone-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all cursor-pointer"
            title="Chia sẻ / Sao chép"
            aria-label="Sao chép câu này vào clipboard"
          >
            {hasCopied ? (
              <Check size={18} className="text-emerald-600" />
            ) : (
              <Share2 size={18} />
            )}
            <span className="text-[10px] font-medium hidden sm:block">
              {hasCopied ? 'Đã chép' : 'Chia sẻ'}
            </span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
