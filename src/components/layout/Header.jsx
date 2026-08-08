import React, { useState, useRef, useEffect } from 'react';
import { Bookmark, Sun, Moon, Coffee } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLiturgy } from '../../context/LiturgyContext.jsx';
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



  return (
    <header className="app-header fixed top-0 left-0 right-0 z-40 w-full glass-panel border-b border-stone-200/80 dark:border-stone-800/80 transition-colors duration-300 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Logo & Application Name */}
        <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group min-w-0" aria-label={`${BRAND.name} — Trang chủ`}>
          <motion.div
            whileHover={{ scale: 1.08, rotate: 2 }}
            whileTap={{ scale: 0.95 }}
            className="w-11 h-11 rounded-[15px] overflow-hidden bg-[#600b14] ring-1 ring-amber-500/35 shadow-md shadow-amber-900/20 shrink-0"
          >
            <img src={BRAND.logoPath} alt="" className="w-full h-full object-cover object-center scale-[1.12]" />
          </motion.div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-[15px] sm:text-lg leading-tight tracking-tight text-stone-900 dark:text-stone-100 truncate">
              {BRAND.name}
            </h1>
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
              className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
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
            className="w-11 h-11 flex items-center justify-center rounded-xl text-stone-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
            title="Đổi giao diện (Sáng/Tối/Vàng)"
          >
            {themeMode === 'light' && <Sun className="w-4 h-4 sm:w-5 sm:h-5" />}
            {themeMode === 'dark' && <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
            {themeMode === 'sepia' && <Coffee className="w-4 h-4 sm:w-5 sm:h-5" />}
          </motion.button>
          
          <div ref={fontMenuRef} className="relative">
            <div className="hidden lg:flex items-center gap-0.5 p-1 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700/80" aria-label="Cỡ chữ đọc">
              {fontSizes.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFontSize(option.value)}
                  aria-label={option.description}
                  aria-pressed={fontSize === option.value}
                  className={`min-w-9 h-9 px-2 rounded-lg text-xs font-extrabold transition-all ${
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
              className={`lg:hidden w-11 h-11 flex items-center justify-center rounded-xl font-serif font-extrabold transition-colors ${
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
                      className={`min-w-12 h-11 px-3 rounded-xl text-sm font-extrabold transition-all ${
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
            aria-label="Mở các bài đã lưu"
            className="w-11 h-11 flex items-center justify-center rounded-xl text-stone-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors relative"
            title="Bài đã lưu"
          >
            <Bookmark className="w-4 h-4 sm:w-5 sm:h-5" />
            {bookmarks.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-stone-900"></span>
            )}
          </Link>
        </div>

      </div>
    </header>
  );
}
