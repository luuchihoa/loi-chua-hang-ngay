import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../context/PWAInstallContext.jsx';
import { BRAND } from '../../config/brand.js';

export default function InstallAppBanner() {
  const { 
    showInstallBanner, 
    dismissInstallBanner, 
    openInstallModal, 
    isStandalone 
  } = usePWAInstall();

  if (!showInstallBanner || isStandalone) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-20 md:bottom-6 left-4 right-4 max-w-md mx-auto z-40"
      >
        <div className="flex items-center justify-between gap-3 p-3 sm:p-3.5 bg-stone-900/95 dark:bg-stone-900/95 text-white rounded-2xl shadow-2xl border border-amber-500/40 backdrop-blur-xl ring-1 ring-black/20">
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
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs text-amber-300 truncate">
                  Cài Đặt App {BRAND.name}
                </span>
                <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-full">
                  Miễn phí
                </span>
              </div>
              <p className="text-[11px] text-stone-300 truncate">
                Đọc offline, toàn màn hình không viền
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
              className="w-7 h-7 flex items-center justify-center rounded-full text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Để sau"
              title="Để sau"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
