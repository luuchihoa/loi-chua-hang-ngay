import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '../../context/PWAInstallContext.jsx';
import { BRAND } from '../../config/brand.js';

export default function InstallAppBanner() {
  const location = useLocation();
  const { 
    showInstallBanner, 
    dismissInstallBanner, 
    openInstallModal, 
    isStandalone 
  } = usePWAInstall();

  // Chỉ hiển thị trên các màn hình Cửa ngõ / Khám phá: Trang Chủ (/ hoặc /liturgy), Lịch (/calendar), Mục lục Kinh Thánh (/bible)
  // Tự động ẩn trên trang Đọc sâu chương Kinh Thánh (/bible/:book/:chapter) và trang Audio (/bible-audio)
  const isAllowedRoute = 
    location.pathname === '/' || 
    location.pathname === '/liturgy' || 
    location.pathname === '/calendar' || 
    location.pathname === '/bible';

  // Ẩn hoàn toàn trên Màn hình Máy tính (Desktop >= 1024px - dùng lg:hidden) và khi đã ở chế độ Standalone
  const isVisible = showInstallBanner && !isStandalone && isAllowedRoute;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="pwa-install-banner"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{ bottom: 'max(1.25rem, calc(var(--mobile-dock-h, 0px) + 0.75rem))' }}
          className="fixed left-4 right-4 max-w-md mx-auto z-40 lg:hidden"
        >
          <div className="theme-invariant flex items-center justify-between gap-3 p-3 sm:p-3.5 bg-stone-900/95 dark:bg-stone-900/95 text-white rounded-2xl shadow-2xl border border-amber-500/40 backdrop-blur-xl ring-1 ring-black/20">
            {/* Logo & Text */}
            <div 
              onClick={openInstallModal}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 p-1 ring-1 ring-amber-400/40 shrink-0 flex items-center justify-center">
                <img 
                  src="/logo_loi_chua_moi_ngay.png" 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => { e.target.src = '/logo_96.png'; }}
                />
              </div>
              <div className="min-w-0">
                <h4 className="font-extrabold text-xs sm:text-sm text-amber-300 tracking-tight truncate">
                  Cài Đặt {BRAND.name}
                </h4>
                <p className="text-[11px] text-stone-300 truncate opacity-90 mt-0.5">
                  Đọc offline & toàn màn hình
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={openInstallModal}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs shadow-md shadow-amber-500/20 transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Cài Ngay</span>
              </button>
              <button
                onClick={dismissInstallBanner}
                className="w-8 h-8 flex items-center justify-center rounded-full text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Để sau"
                title="Để sau"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
