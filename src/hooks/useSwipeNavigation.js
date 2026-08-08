import { useEffect, useRef } from 'react';

/**
 * Hook phát hiện thao tác vuốt ngang (swipe) trên thiết bị cảm ứng.
 * @param {Object} options
 * @param {Function} options.onSwipeLeft  - Gọi khi người dùng vuốt từ phải sang trái (→ chương sau)
 * @param {Function} options.onSwipeRight - Gọi khi người dùng vuốt từ trái sang phải (→ chương trước)
 * @param {number}   options.threshold    - Ngưỡng px tối thiểu để nhận là swipe (mặc định 60px)
 * @param {boolean}  options.disabled     - Tắt swipe (vd: khi overlay đang mở)
 * @returns {React.RefObject} - Gắn ref này vào element cần nhận swipe
 */
export function useSwipeNavigation({
  onSwipeLeft,
  onSwipeRight,
  threshold = 60,
  disabled = false,
}) {
  const containerRef = useRef(null);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || disabled) return;

    const handleTouchStart = (e) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
      if (touchStartX.current === null) return;

      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;

      // Chỉ nhận swipe ngang: deltaX phải lớn hơn deltaY
      if (Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return;

      if (deltaX < -threshold) {
        // Vuốt sang trái → chương sau
        onSwipeLeft?.();
      } else if (deltaX > threshold) {
        // Vuốt sang phải → chương trước
        onSwipeRight?.();
      }

      touchStartX.current = null;
      touchStartY.current = null;
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, threshold, disabled]);

  return containerRef;
}
