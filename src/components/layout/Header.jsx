import React, { useState, useRef, useEffect } from 'react';
import { Bookmark, Sun, Moon, Coffee, Smartphone } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiturgy } from '../../context/LiturgyContext.jsx';
import { usePWAInstall } from '../../context/PWAInstallContext.jsx';
import { BRAND } from '../../config/brand.js';

export default function Header() {
  const location = useLocation();
  const { 
    themeMode, 
    cycleTheme,
    fontSize, 
    setFontSize, 
    bookmarks,
  } = useLiturgy();

  const { openInstallModal, isStandalone } = usePWAInstall();

  const navLinks = [
    { path: '/', label: 'Lời Chúa', isActive: location.pathname === '/' || location.pathname === '/liturgy' },
    { path: '/bible', label: 'Sách Kinh Thánh', isActive: location.pathname.startsWith('/bible') && !location.pathname.startsWith('/bible-audio') },
    { path: '/bible-audio', label: 'Kinh Thánh Audio', isActive: location.pathname === '/bible-audio' },
    ...(import.meta.env.DEV
      ? [{ path: '/studio-audio', label: 'Studio AI', isActive: location.pathname === '/studio-audio' }]
      : []),
  ];

  const desktopNavRef = useRef(null);
  const fontMenuRef = useRef(null);
  const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [desktopActiveRect, setDesktopActiveRect] = useState({ left: 0, width: 0, opacity: 0 });

  const fontSizes = [
    { value: 'normal', label: 'A−', description: 'Chữ nhỏ' },
    { value: 'medium', label: 'A', description: 'Chữ vừa' },
    { value: 'large', label: 'A+', description: 'Chữ lớn' },
  ];

  useEffect(() => {
    if (desktopNavRef.current) {
      const activeEl = desktopNavRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        setDesktopActiveRect({
          left: activeEl.offsetLeft,
          width: activeEl.offsetWidth,
          opacity: 1
        });
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    const closeFontMenu = (event) => {
      if (!fontMenuRef.current?.contains(event.target)) setIsFontMenuOpen(false);
    };
    document.addEventListener('mousedown', closeFontMenu);
    return () => document.removeEventListener('mousedown', closeFontMenu);
  }, []);

  // Header dày/nổi hơn một chút khi cuộn trang, cho cảm giác chiều sâu
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`app-header fixed top-0 left-0 right-0 z-40 w-full glass-panel border-b transition-all duration-300 ${
        isScrolled
          ? 'border-stone-200/80 dark:border-stone-800/80 shadow-md'
          : 'border-stone-200/50 dark:border-stone-800/50 shadow-xs'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Logo & Application Name */}
        <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 rounded-xl" aria-label={`${BRAND.name} — ${BRAND.slogan}`}>
          <motion.div
            whileHover={{ scale: 1.08, rotate: 2 }}
            whileTap={{ scale: 0.95 }}
            className="w-11 h-11 rounded-[15px] overflow-hidden bg-[#600b14] ring-1 ring-amber-500/35 shadow-md shadow-amber-900/20 shrink-0 flex items-center justify-center"
          >
            <img src="/logo_48.png" srcSet="/logo_48.png 1x, /logo_96.png 2x" alt="Logo Lời Chúa Mỗi Ngày" width="44" height="44" loading="eager" decoding="async" className="w-full h-full object-contain p-1" />
          </motion.div>
          <div className="min-w-0">
            <span className="font-extrabold text-[15px] sm:text-lg leading-tight tracking-tight text-stone-900 dark:text-stone-100 truncate block">
              {BRAND.name}
            </span>
            <p className="text-[9px] sm:text-[11px] font-bold text-amber-700 dark:text-amber-400 truncate">{BRAND.slogan}</p>
          </div>
        </Link>

        {/* Desktop Navigation Tabs */}
        <nav ref={desktopNavRef} className="relative hidden md:flex items-center gap-1 bg-stone-100 dark:bg-stone-900 p-1 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
          {/* Bulletproof sliding pill */}
          <motion.div
            className="absolute top-1 bottom-1 bg-white dark:bg-stone-700 rounded-xl shadow-xs border border-stone-200/80 dark:border-stone-600/80"
            initial={false}
            animate={{ 
              left: desktopActiveRect.left, 
              width: desktopActiveRect.width, 
              opacity: desktopActiveRect.opacity 
            }}
            transition={{ type: 'spring', stiffness: 450, damping: 35 }}
          />

          {navLinks.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              data-active={item.isActive}
              aria-current={item.isActive ? 'page' : undefined}
              className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 ${
                item.isActive
                  ? 'text-stone-900 dark:text-stone-100'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <span className="relative z-10">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Header Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={cycleTheme}
            aria-label="Đổi giao diện sáng hoặc tối"
            className="w-11 h-11 flex items-center justify-center rounded-xl text-stone-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70"
            title="Đổi giao diện (Sáng/Tối/Vàng)"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={themeMode}
                initial={{ opacity: 0, rotate: -90, scale: 0.7 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 90, scale: 0.7 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-center"
              >
                {themeMode === 'light' && <Sun className="w-4 h-4 sm:w-5 sm:h-5" />}
                {themeMode === 'dark' && <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
                {themeMode === 'sepia' && <Coffee className="w-4 h-4 sm:w-5 sm:h-5" />}
              </motion.span>
            </AnimatePresence>
          </motion.button>
          
          <div ref={fontMenuRef} className="relative">
            <div className="hidden lg:flex items-center gap-0.5 p-1 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700/80" aria-label="Cỡ chữ đọc">
              {fontSizes.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFontSize(option.value)}
                  aria-label={option.description}
                  aria-pressed={fontSize === option.value}
                  className={`min-w-9 h-9 px-2 rounded-lg text-xs font-extrabold transition-all outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 ${
                    fontSize === option.value
                      ? 'bg-white dark:bg-stone-700 text-amber-700 dark:text-amber-300 shadow-sm'
                      : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsFontMenuOpen((open) => !open)}
              aria-label="Chọn cỡ chữ đọc"
              aria-expanded={isFontMenuOpen}
              className={`lg:hidden w-11 h-11 flex items-center justify-center rounded-xl font-serif font-extrabold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 ${
                isFontMenuOpen
                  ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                  : 'text-stone-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30'
              }`}
              title="Chọn cỡ chữ"
            >
              Aa
            </button>

            {isFontMenuOpen && (
              <div className="lg:hidden absolute top-full right-0 mt-2 p-2 rounded-2xl bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl border border-stone-200 dark:border-stone-700 shadow-xl z-50">
                <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400 whitespace-nowrap">Cỡ chữ đọc</p>
                <div className="flex items-center gap-1">
                  {fontSizes.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setFontSize(option.value);
                        setIsFontMenuOpen(false);
                      }}
                      aria-label={option.description}
                      aria-pressed={fontSize === option.value}
                      className={`min-w-12 h-11 px-3 rounded-xl text-sm font-extrabold transition-all outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 ${
                        fontSize === option.value
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link
            to="/bookmarks"
            aria-label={bookmarks.length > 0 ? `Mở các bài đã lưu (${bookmarks.length})` : 'Mở các bài đã lưu'}
            className="w-11 h-11 flex items-center justify-center rounded-xl text-stone-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors relative outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70"
            title="Bài đã lưu"
          >
            <Bookmark className="w-4 h-4 sm:w-5 sm:h-5" />
            {bookmarks.length > 0 && (
              <span className="theme-invariant absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[9px] font-extrabold text-white bg-rose-500 rounded-full border-2 border-white dark:border-stone-900 leading-none">
                {bookmarks.length > 9 ? '9+' : bookmarks.length}
              </span>
            )}
          </Link>

          {/* Smart Install App Trigger Button */}
          {!isStandalone && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={openInstallModal}
              aria-label="Cài đặt ứng dụng Lời Chúa Mỗi Ngày"
              className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 dark:bg-amber-400/15 dark:hover:bg-amber-400/25 text-amber-800 dark:text-amber-300 border border-amber-500/30 dark:border-amber-400/30 flex items-center gap-1.5 transition-all text-xs font-extrabold outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 cursor-pointer shrink-0"
              title="Cài đặt App lên điện thoại / máy tính"
            >
              <Smartphone className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              <span className="hidden sm:inline">Cài App</span>
            </motion.button>
          )}
        </div>

      </div>
    </header>
  );
}