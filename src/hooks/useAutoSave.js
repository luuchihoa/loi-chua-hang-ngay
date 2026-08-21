import { useState, useEffect, useRef, useCallback } from 'react';
import { saveStudioDraft, getStudioDraft, deleteStudioDraft } from '../utils/indexedDbStorage.js';

/**
 * Custom React Hook quản lý Auto-Save cho Studio / Editor
 * 
 * @param {string} draftKey - Key định danh duy nhất của dự án
 * @param {object} currentData - Dữ liệu state cần lưu
 * @param {object} options - Cấu hình debounce, callbacks
 */
export function useAutoSave(draftKey, currentData, options = {}) {
  const {
    debounceMs = 800,
    enabled = true,
    onDraftLoaded = null
  } = options;

  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  const debounceTimerRef = useRef(null);
  const latestDataRef = useRef(currentData);
  latestDataRef.current = currentData;

  // 1. Tải bản nháp đã lưu trước đó khi component mount
  useEffect(() => {
    if (!enabled || !draftKey) {
      setIsInitialLoaded(true);
      return;
    }

    let isMounted = true;

    async function loadSavedDraft() {
      try {
        const draft = await getStudioDraft(draftKey);
        if (isMounted) {
          if (draft && draft.data) {
            setHasRestoredDraft(true);
            setLastSavedAt(new Date(draft.updatedAt));
            setSaveStatus('saved');
            if (onDraftLoaded) {
              onDraftLoaded(draft.data, draft.updatedAt);
            }
          }
          setIsInitialLoaded(true);
        }
      } catch (err) {
        console.warn('Lỗi khi tải bản nháp tự động lưu:', err);
        if (isMounted) {
          setIsInitialLoaded(true);
        }
      }
    }

    loadSavedDraft();

    return () => {
      isMounted = false;
    };
  }, [draftKey, enabled]);

  // 2. Hàm thực thi lưu tức thì
  const saveNow = useCallback(async (data = latestDataRef.current) => {
    if (!enabled || !draftKey) return;
    try {
      setSaveStatus('saving');
      await saveStudioDraft(draftKey, data);
      setLastSavedAt(new Date());
      setSaveStatus('saved');
    } catch (err) {
      console.warn('Lỗi khi lưu tự động:', err);
      setSaveStatus('error');
    }
  }, [draftKey, enabled]);

  // 3. Tự động lưu theo cơ chế Debounce khi dữ liệu thay đổi
  useEffect(() => {
    if (!enabled || !isInitialLoaded || !draftKey) return;

    // Khi người dùng đang gõ/thao tác, chuyển sang trạng thái chuẩn bị lưu
    setSaveStatus('saving');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      saveNow(currentData);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [currentData, enabled, isInitialLoaded, draftKey, debounceMs, saveNow]);

  // 4. Lắng nghe sự kiện Gập máy (visibilitychange) hoặc Tắt tab (beforeunload) để Flush ngay
  useEffect(() => {
    if (!enabled || !draftKey) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        saveNow(latestDataRef.current);
      }
    };

    const handleBeforeUnload = () => {
      saveNow(latestDataRef.current);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, draftKey, saveNow]);

  // 5. Xóa bản nháp
  const clearDraft = useCallback(async () => {
    if (!draftKey) return;
    try {
      await deleteStudioDraft(draftKey);
      setHasRestoredDraft(false);
      setSaveStatus('idle');
      setLastSavedAt(null);
    } catch (err) {
      console.warn('Lỗi khi xóa bản nháp:', err);
    }
  }, [draftKey]);

  return {
    saveStatus,
    lastSavedAt,
    isInitialLoaded,
    hasRestoredDraft,
    saveNow,
    clearDraft
  };
}
