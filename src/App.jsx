import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import Header from './components/layout/Header.jsx';
import Footer from './components/layout/Footer.jsx';
import MobileNavDock from './components/layout/MobileNavDock.jsx';
import ScrollToTop from './components/utils/ScrollToTop.jsx';
import { LiturgyProvider } from './context/LiturgyContext.jsx';
import AppRoutes from './app/AppRoutes.jsx';

export default function App() {
  return (
    <LiturgyProvider>
      <Router>
        <ScrollToTop />
        <div className="min-h-screen flex flex-col justify-between bg-stone-50 dark:bg-stone-950 relative">
          <Header />
          <main className="flex-1 pt-16">
            <AppRoutes />
          </main>
          <Footer />
          <MobileNavDock />
        </div>
      </Router>
    </LiturgyProvider>
  );
}
