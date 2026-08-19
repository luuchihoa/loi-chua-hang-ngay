import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import Header from './components/layout/Header.jsx';
import Footer from './components/layout/Footer.jsx';
import MobileNavDock from './components/layout/MobileNavDock.jsx';
import ScrollToTop from './components/utils/ScrollToTop.jsx';
import { LiturgyProvider } from './context/LiturgyContext.jsx';
import { PWAInstallProvider } from './context/PWAInstallContext.jsx';
import InstallAppModal from './components/pwa/InstallAppModal.jsx';
import InstallAppBanner from './components/pwa/InstallAppBanner.jsx';
import AppRoutes from './app/AppRoutes.jsx';

export default function App() {
  return (
    <LiturgyProvider>
      <PWAInstallProvider>
        <Router>
          <ScrollToTop />
          <div className="min-h-screen flex flex-col justify-between bg-stone-50 dark:bg-stone-950 relative">
            <Header />
            <main className="flex-1" style={{ paddingTop: 'calc(4rem + env(safe-area-inset-top, 0px))' }}>
              <AppRoutes />
            </main>
            <Footer />
            <MobileNavDock />
            <InstallAppBanner />
            <InstallAppModal />
          </div>
        </Router>
      </PWAInstallProvider>
    </LiturgyProvider>
  );
}

