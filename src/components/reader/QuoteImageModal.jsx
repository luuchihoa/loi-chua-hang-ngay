import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Image as ImageIcon } from 'lucide-react';
import * as htmlToImage from 'html-to-image';

const BACKGROUNDS = [
  { id: 'solid-dark', name: 'Đen nhám', class: 'bg-stone-900 text-stone-100' },
  { id: 'solid-light', name: 'Trắng sứ', class: 'bg-stone-50 text-stone-900' },
  { id: 'gradient-amber', name: 'Hoàng hôn', class: 'bg-gradient-to-br from-amber-500 to-rose-600 text-white' },
  { id: 'gradient-ocean', name: 'Đại dương', class: 'bg-gradient-to-br from-cyan-600 to-blue-800 text-white' },
  { id: 'gradient-emerald', name: 'Rừng nhiệt đới', class: 'bg-gradient-to-br from-emerald-500 to-teal-800 text-white' },
];

export default function QuoteImageModal({ isOpen, onClose, versesData, citation }) {
  const [bg, setBg] = useState(BACKGROUNDS[2]);
  const [isGenerating, setIsGenerating] = useState(false);
  const cardRef = useRef(null);

  if (!isOpen || !versesData || versesData.length === 0) return null;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const dataUrl = await htmlToImage.toPng(cardRef.current, { 
        quality: 1, 
        pixelRatio: 2,
        style: {
          borderRadius: '0px', // Remove rounded corners for export
        }
      });
      const link = document.createElement('a');
      link.download = `loi-chua-${citation.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Lỗi khi tạo ảnh:', err);
      alert('Không thể tạo ảnh, vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
    }
  };

  const textContent = versesData.map(v => v.text).join(' ');

  return (
    <AnimatePresence>
      <div data-ui-layer="modal-root" className="fixed inset-0 z-[90] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          data-ui-layer="modal-backdrop"
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
          data-ui-layer="modal-content"
          className="relative w-full max-w-xl bg-stone-100 dark:bg-stone-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800">
            <h3 className="font-bold flex items-center gap-2">
              <ImageIcon size={20} className="text-amber-600" /> Tạo ảnh Lời Chúa
            </h3>
            <button onClick={onClose} className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-full transition-colors cursor-pointer">
              <X size={20} className="text-stone-500" />
            </button>
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto flex flex-col items-center justify-center bg-stone-200/50 dark:bg-stone-950/50">
            {/* The Card to capture */}
            <div 
              ref={cardRef}
              className={`w-full aspect-square max-w-sm sm:max-w-md p-6 sm:p-10 flex flex-col justify-center rounded-2xl shadow-xl transition-all duration-300 relative overflow-hidden ${bg.class}`}
            >
              {/* Decorative elements */}
              <div className="absolute top-4 left-4 text-4xl opacity-20 font-serif">"</div>
              <div className="absolute bottom-4 right-4 text-4xl opacity-20 font-serif rotate-180">"</div>

              <div className="relative z-10 space-y-4">
                <p className={`font-serif-reading leading-relaxed font-medium text-center line-clamp-6 ${
                  textContent.length > 250 ? 'text-xs sm:text-sm' : textContent.length > 120 ? 'text-sm sm:text-base' : 'text-base sm:text-xl md:text-2xl'
                }`}>
                  {textContent}
                </p>
                <div className="text-center">
                  <p className="font-bold tracking-widest text-xs sm:text-sm uppercase opacity-90">{citation}</p>
                  <p className="text-[10px] uppercase tracking-widest opacity-60 mt-1 font-sans">Kinh Thánh Công Giáo</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4">
            {/* Theme Selector */}
            <div>
              <p className="text-xs font-bold text-stone-500 mb-2 uppercase tracking-wider">Chọn Nền</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2">
                {BACKGROUNDS.map(b => (
                  <button
                    key={b.id}
                    onClick={() => setBg(b)}
                    className={`shrink-0 w-12 h-12 rounded-xl border-2 transition-all cursor-pointer ${b.class} ${bg.id === b.id ? 'border-amber-500 scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                    title={b.name}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="theme-invariant w-full flex items-center justify-center gap-2 min-h-[44px] py-3.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl shadow-lg transition-all font-bold text-sm cursor-pointer"
            >
              <Download size={18} />
              {isGenerating ? 'Đang tạo ảnh...' : 'Lưu Ảnh Về Máy'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
