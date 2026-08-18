import React, { createContext, useContext, useState, useEffect } from 'react';

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

  useEffect(() => {
    // 1. Detect Standalone / Already Installed mode
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://');
      
      setIsStandalone(isStandaloneMode);
      return isStandaloneMode;
    };

    const standalone = checkStandalone();

    // 2. Detect OS / Device Platform
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua) && !window.MSStream;
    const isAndroidDevice = /android/.test(ua);
    const isDesktopDevice = !isIosDevice && !isAndroidDevice;

    setIsIOS(isIosDevice);
    setIsAndroid(isAndroidDevice);
    setIsDesktop(isDesktopDevice);

    // 3. Listen to beforeinstallprompt event (Android / Chrome Desktop)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Determine if we should show the bottom slide-in install banner
    if (!standalone) {
      const dismissedUntil = localStorage.getItem('loichua_pwa_banner_dismissed_until');
      const now = Date.now();
      
      if (!dismissedUntil || now > Number(dismissedUntil)) {
        // Show after small pleasant delay (3.5 seconds) so user has seen the page
        const timer = setTimeout(() => {
          setShowInstallBanner(true);
        }, 3500);
        return () => {
          clearTimeout(timer);
          window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const openInstallModal = () => {
    setIsInstallModalOpen(true);
    setShowInstallBanner(false);
  };

  const closeInstallModal = () => {
    setIsInstallModalOpen(false);
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    // Dismiss for 7 days
    const nextWeek = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem('loichua_pwa_banner_dismissed_until', String(nextWeek));
  };

  const triggerInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallBanner(false);
        setIsInstallModalOpen(false);
      }
    } else {
      openInstallModal();
    }
  };

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
