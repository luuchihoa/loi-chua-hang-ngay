import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'loichua_pwa_banner_dismissed_until';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Safe storage wrapper protecting against Safari Private Mode & QuotaExceededError
const safeStorage = {
  get: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Gracefully ignore storage write failures
    }
  }
};

const PWAInstallContext = createContext({
  isStandalone: false,
  isIOS: false,
  isAndroid: false,
  isDesktop: false,
  canInstallNative: false,
  isInstallModalOpen: false,
  showInstallBanner: false,
  openInstallModal: () => {},
  closeInstallModal: () => {},
  dismissInstallBanner: () => {},
  triggerInstall: async () => {},
});

export function PWAInstallProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const isPromptingRef = useRef(false);

  useEffect(() => {
    // 1. Comprehensive Standalone Mode Detection
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://');
      
      setIsStandalone(Boolean(isStandaloneMode));
      return Boolean(isStandaloneMode);
    };

    const standalone = checkStandalone();

    // 2. Realtime display-mode change listener
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e) => {
      if (e.matches) {
        setIsStandalone(true);
        setShowInstallBanner(false);
      }
    };
    mediaQuery.addEventListener?.('change', handleDisplayModeChange);

    // 3. Robust Device Platform Detection (including iPadOS 13+ fix)
    const ua = window.navigator.userAgent.toLowerCase();
    const isIPadOS = ua.includes('macintosh') && window.navigator.maxTouchPoints > 1;
    const isIosDevice = (/iphone|ipad|ipod/.test(ua) || isIPadOS) && !window.MSStream;
    const isAndroidDevice = /android/.test(ua);
    const isDesktopDevice = !isIosDevice && !isAndroidDevice;

    setIsIOS(isIosDevice);
    setIsAndroid(isAndroidDevice);
    setIsDesktop(isDesktopDevice);

    // 4. Listen to PWA lifecycle events
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setShowInstallBanner(false);
      setIsInstallModalOpen(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 5. Check if we should display the install banner after 3.5s delay
    let timer = null;
    if (!standalone) {
      const dismissedUntil = safeStorage.get(STORAGE_KEY);
      const parsedTime = Number(dismissedUntil);
      const isDismissed = Number.isFinite(parsedTime) && Date.now() < parsedTime;
      
      if (!isDismissed) {
        timer = setTimeout(() => {
          setShowInstallBanner(true);
        }, 3500);
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener?.('change', handleDisplayModeChange);
    };
  }, []);

  const openInstallModal = useCallback(() => {
    setIsInstallModalOpen(true);
    setShowInstallBanner(false);
  }, []);

  const closeInstallModal = useCallback(() => {
    setIsInstallModalOpen(false);
  }, []);

  const dismissInstallBanner = useCallback(() => {
    setShowInstallBanner(false);
    const nextWeek = Date.now() + SEVEN_DAYS_MS;
    safeStorage.set(STORAGE_KEY, String(nextWeek));
  }, []);

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) {
      openInstallModal();
      return;
    }

    if (isPromptingRef.current) return;
    isPromptingRef.current = true;

    try {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      // Clear deferred prompt on both accept and dismiss since prompt event is single-use
      setDeferredPrompt(null);
      if (choice.outcome === 'accepted') {
        setShowInstallBanner(false);
        setIsInstallModalOpen(false);
      }
    } catch {
      openInstallModal();
    } finally {
      isPromptingRef.current = false;
    }
  }, [deferredPrompt, openInstallModal]);

  return (
    <PWAInstallContext.Provider
      value={{
        isStandalone,
        isIOS,
        isAndroid,
        isDesktop,
        canInstallNative: Boolean(deferredPrompt),
        isInstallModalOpen,
        showInstallBanner,
        openInstallModal,
        closeInstallModal,
        dismissInstallBanner,
        triggerInstall,
      }}
    >
      {children}
    </PWAInstallContext.Provider>
  );
}

export function usePWAInstall() {
  return useContext(PWAInstallContext);
}
