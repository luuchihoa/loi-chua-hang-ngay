import React from 'react';
import { Bookmark, Trash2, BookOpen, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLiturgy } from '../context/LiturgyContext.jsx';

export default function BookmarksPage() {
  const { bookmarks, toggleBookmark, setSelectedDate } = useLiturgy();
  const navigate = useNavigate();

  const navigateToDate = (dateStr) => {
    const date = new Date(dateStr);
    setSelectedDate(date);
    navigate('/');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      
      <div className="flex items-center gap-3 mb-6">
        <div className="theme-invariant w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md">
          <Bookmark className="w-5 h-5 fill-current" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
            Bài Đọc Đã Lưu
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Danh sách bài đọc Lời Chúa bạn đã đánh dấu yêu thích
          </p>
        </div>
      </div>

      {bookmarks.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-12 text-center border border-stone-200 dark:border-stone-800 my-8">
          <Bookmark className="w-12 h-12 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
          <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">
            Chưa có bài đọc nào được lưu.
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
            Bấm biểu tượng Bookmark ở trang Lời Chúa để lưu lại trích đoạn yêu thích.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookmarks.map((b) => (
            <div
              key={b.dateStr}
              className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-stone-200/80 dark:border-stone-800 shadow-sm flex items-center justify-between gap-4 hover:border-amber-400 transition-all group"
            >
              <div 
                onClick={() => navigateToDate(b.dateStr)}
                className="flex-1 cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                    {b.dateFormatted}
                  </span>
                  <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                    {b.title}
                  </span>
                </div>

                <p className="text-xs font-semibold text-stone-600 dark:text-stone-400 line-clamp-1">
                  {b.gospelRef}: "{b.gospelQuote || 'Bài đọc Phụng Vụ'}"
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleBookmark(null, null, new Date(b.dateStr))}
                  className="p-2 rounded-xl text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="Xóa khỏi danh sách lưu"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => navigateToDate(b.dateStr)}
                  className="p-2 rounded-xl text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
