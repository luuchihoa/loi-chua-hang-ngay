import React from 'react';
import { Heart, BookOpen, Sparkles, ShieldCheck, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePWAInstall } from '../../context/PWAInstallContext.jsx';
import { BRAND } from '../../config/brand.js';

export default function Footer() {
  const { openInstallModal } = usePWAInstall();
  return (
    <footer className="w-full pt-10 pb-24 md:pb-10 border-t border-stone-200/80 dark:border-stone-800/80 glass-panel transition-colors relative">
      <div className="max-w-5xl mx-auto px-4 text-center">
        
        {/* Brand identity */}
        <div className="flex items-center justify-center gap-2 mb-3 text-amber-700 dark:text-amber-400 font-extrabold text-sm sm:text-base">
          <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>{BRAND.name} · {BRAND.slogan}</span>
        </div>

        {/* Scripture Quote */}
        <blockquote className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 max-w-lg mx-auto leading-relaxed italic font-serif-reading mb-4">
          "Lời Thầy nói với anh em là thần khí và là sự sống." <span className="not-italic text-[11px] font-sans font-semibold text-amber-700 dark:text-amber-400 opacity-90">(Ga 6, 63)</span>
        </blockquote>

        {/* Quick info row */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-stone-500 dark:text-stone-400 font-semibold mb-6">
          <span className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800/80 px-2.5 py-1 rounded-full border border-stone-200/60 dark:border-stone-700/60">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Bản dịch chuẩn Phụng Vụ
          </span>
          <button
            onClick={openInstallModal}
            className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800/90 hover:bg-amber-50 dark:hover:bg-amber-900/30 text-stone-700 dark:text-stone-300 hover:text-amber-700 dark:hover:text-amber-300 border border-stone-200/80 dark:border-stone-700/80 px-3 py-1 rounded-full transition-all cursor-pointer font-bold active:scale-95 text-[11px]"
            title="Hướng dẫn cài đặt ứng dụng lên iPhone & Android"
          >
            <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Cài đặt App (iOS / Android)
          </button>
          {import.meta.env.DEV && (
            <span className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800/80 px-2.5 py-1 rounded-full border border-stone-200/60 dark:border-stone-700/60">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Công cụ Studio AI nội bộ
            </span>
          )}
        </div>

        {/* Copyright & Heart footer */}
        <div className="pt-4 border-t border-stone-200/60 dark:border-stone-800/60 text-[11px] text-stone-600 dark:text-stone-400 flex items-center justify-center gap-1.5 font-medium">
          <span>Xây dựng với</span>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          >
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          </motion.div>
          <span>dành cho Cộng đồng Dân Chúa Công Giáo</span>
        </div>
      </div>
    </footer>
  );
}
