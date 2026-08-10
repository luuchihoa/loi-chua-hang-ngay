import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Trash2 } from 'lucide-react';

export default function NoteModal({ isOpen, onClose, verseNum, initialNote, onSave, onDelete }) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setText(initialNote || '');
    }
  }, [isOpen, initialNote]);

  const handleSave = () => {
    onSave(text);
    onClose();
  };

  const handleDelete = () => {
    onDelete();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div data-ui-layer="modal-root" className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800">
              <h3 className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <span className="text-xl">📝</span> Ghi chú Câu {verseNum}
              </h3>
              <button onClick={onClose} className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors">
                <X size={20} className="text-stone-500" />
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Viết suy niệm hoặc ghi chú của bạn vào đây..."
                className="w-full h-48 sm:h-64 p-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                autoFocus
              />
            </div>

            <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-950">
              {initialNote ? (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 min-h-[44px] px-4 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-colors font-medium text-sm"
                >
                  <Trash2 size={16} /> Xóa
                </button>
              ) : (
                <div /> // placeholder for flex-between
              )}
              
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="min-h-[44px] px-4 py-2 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-xl transition-colors font-medium text-sm"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  className="theme-invariant flex items-center gap-2 min-h-[44px] px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-md transition-colors font-medium text-sm"
                >
                  <Save size={16} /> Lưu lại
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
