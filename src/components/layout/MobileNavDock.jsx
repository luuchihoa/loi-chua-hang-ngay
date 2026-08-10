import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Book, Headphones, Sparkles, Bookmark, Calendar } from 'lucide-react';
import { useLiturgy } from '../../context/LiturgyContext.jsx';

export default function MobileNavDock() {
  const location = useLocation();
  const { bookmarks } = useLiturgy();

  const navItems = [
    {
      path: '/',
      label: 'Lời Chúa',
      icon: BookOpen,
      isActive: location.pathname === '/' || location.pathname === '/liturgy',
    },
    {
      path: '/bible',
      label: 'Kinh Thánh',
      icon: Book,
      isActive: location.pathname.startsWith('/bible') && !location.pathname.startsWith('/bible-audio'),
    },
    {
      path: '/bible-audio',
      label: 'Audio',
      icon: Headphones,
      isActive: location.pathname === '/bible-audio',
    },
    ...(import.meta.env.DEV ? [{
      path: '/studio-audio',
      label: 'Studio AI',
      icon: Sparkles,
      isActive: location.pathname === '/studio-audio',
    }] : []),
    {
      path: '/bookmarks',
      label: 'Đã lưu',
      icon: Bookmark,
      badge: bookmarks.length > 0 ? bookmarks.length : null,
      isActive: location.pathname === '/bookmarks',
    },
  ];

  const dockRef = useRef(null);
  const [dockActiveRect, setDockActiveRect] = useState({ left: 0, width: 0, opacity: 0 });

  useEffect(() => {
    if (dockRef.current) {
      const activeEl = dockRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        setDockActiveRect({
          left: activeEl.offsetLeft,
          width: activeEl.offsetWidth,
          opacity: 1
        });
      }
    }
  }, [location.pathname]);

  const dockContent = (
    <nav 
      data-ui-layer="mobile-dock" 
      aria-label="Điều hướng chính" 
      className="fixed left-1/2 -translate-x-1/2 z-[45] w-[calc(100%-24px)] max-w-md block md:hidden pointer-events-auto"
      style={{ bottom: 'calc(14px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div ref={dockRef} className="relative glass-dock rounded-[22px] px-1.5 py-1.5 flex items-center justify-around shadow-[0_16px_50px_-18px_rgba(28,25,23,.45)]">
        {/* Bulletproof sliding pill */}
        <motion.div
          className="absolute top-1.5 bottom-1.5 bg-amber-500/15 dark:bg-amber-400/20 border border-amber-500/30 rounded-xl pointer-events-none"
          initial={false}
          animate={{ 
            left: dockActiveRect.left, 
            width: dockActiveRect.width, 
            opacity: dockActiveRect.opacity 
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />

        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;

          return (
            <Link
              key={item.path}
              to={item.path}
              data-active={active}
              aria-current={active ? 'page' : undefined}
              className="relative min-w-[62px] min-h-[52px] flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all duration-200"
            >

              <div className="relative">
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  animate={{ scale: active ? 1.1 : 1 }}
                  transition={{ duration: 0.15 }}
                >
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      active
                        ? 'text-amber-600 dark:text-amber-400 stroke-[2.5]'
                        : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                    }`}
                  />
                </motion.div>

                {item.badge && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] font-bold mt-1 transition-colors ${
                  active
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );

  return typeof document !== 'undefined' ? createPortal(dockContent, document.body) : dockContent;
}
