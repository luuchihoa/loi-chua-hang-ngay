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
  const navElRef = useRef(null); // ref riêng cho thẻ <nav> ngoài cùng, dùng để đo kích thước thật
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

  // ── Publish chiều cao thật của dock ra CSS variable toàn cục ─────────────
  // Thay vì để các component khác (LiturgyPage, hoặc bất kỳ thanh nổi nào
  // trong tương lai) phải tự đoán breakpoint nào dock biến mất, ta đo trực
  // tiếp khoảng trống dock đang chiếm (kể cả khi ẩn hẳn do `md:hidden`) và
  // publish thành `--mobile-dock-h`. Mọi thanh nổi khác chỉ cần cộng thêm
  // biến này vào offset đáy của chính nó, luôn đúng bất kể breakpoint nào
  // đang dùng ở đây, kể cả khi ta đổi `md:hidden` thành `lg:hidden` sau này.
  useEffect(() => {
    const updateDockHeight = () => {
      const el = navElRef.current;
      if (!el) return;

      // `md:hidden` set display:none khi ẩn — lúc đó không chiếm chỗ, trả về 0
      const isHidden = window.getComputedStyle(el).display === 'none';
      if (isHidden) {
        document.documentElement.style.setProperty('--mobile-dock-h', '0px');
        return;
      }

      // Khoảng cách từ mép trên của dock tới đáy viewport = đúng phần không
      // gian dock đang "chiếm dụng" ở đáy màn hình, đã bao gồm offset
      // `bottom: 14px + safe-area` và chiều cao thật của dock.
      const rect = el.getBoundingClientRect();
      const spaceFromBottom = Math.max(0, window.innerHeight - rect.top);
      document.documentElement.style.setProperty('--mobile-dock-h', `${spaceFromBottom}px`);
    };

    updateDockHeight();

    window.addEventListener('resize', updateDockHeight);
    window.addEventListener('orientationchange', updateDockHeight);

    // ResizeObserver bắt các thay đổi kích thước không đến từ resize cửa sổ,
    // ví dụ khi badge số lượng bookmark đổi từ 1 chữ số sang "9+" làm dock
    // co giãn nhẹ, hoặc font hệ thống thay đổi.
    let ro;
    if (typeof ResizeObserver !== 'undefined' && navElRef.current) {
      ro = new ResizeObserver(updateDockHeight);
      ro.observe(navElRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateDockHeight);
      window.removeEventListener('orientationchange', updateDockHeight);
      ro?.disconnect();
      // Dọn biến khi dock unmount, tránh các thanh nổi khác cộng nhầm
      // khoảng trống của một dock không còn tồn tại trên DOM.
      document.documentElement.style.setProperty('--mobile-dock-h', '0px');
    };
  }, []);

  const dockContent = (
    <nav 
      ref={navElRef}
      data-ui-layer="mobile-dock" 
      aria-label="Điều hướng chính" 
      className="fixed bottom-0 left-0 right-0 z-[45] w-full block md:hidden pointer-events-auto glass-dock border-t border-stone-200/80 dark:border-stone-800/80 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]"
      style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom, 0px))' }}
    >
      <div ref={dockRef} className="relative max-w-md mx-auto px-2 pt-1 pb-1 flex items-center justify-around">
        {/* Bulletproof sliding pill */}
        <motion.div
          className="absolute top-1 bottom-1 bg-amber-500/15 dark:bg-amber-400/20 border border-amber-500/30 rounded-xl pointer-events-none"
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
              rel={item.path === '/bookmarks' ? 'nofollow' : undefined}
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