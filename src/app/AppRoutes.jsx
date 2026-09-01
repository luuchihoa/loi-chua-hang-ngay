import React, { Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import LiturgyPage from '../pages/LiturgyPage.jsx';

const BiblePage = React.lazy(() => import('../pages/BiblePage.jsx'));
const BibleAudioPage = React.lazy(() => import('../pages/BibleAudioPage.jsx'));
const CalendarPage = React.lazy(() => import('../pages/CalendarPage.jsx'));
const BookmarksPage = React.lazy(() => import('../pages/BookmarksPage.jsx'));
const AdminFeedbackPage = React.lazy(() => import('../pages/AdminFeedbackPage.jsx'));
const AdminResetPasswordPage = React.lazy(() => import('../pages/AdminResetPasswordPage.jsx'));

function PageFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center" role="status">
      <span className="text-sm font-medium text-stone-500 dark:text-stone-400">Đang mở trang…</span>
    </div>
  );
}

function LazyPage({ children }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LiturgyPage />} />
      <Route path="/liturgy" element={<LiturgyPage />} />
      <Route path="/liturgy/:dateStr" element={<LiturgyPage />} />
      <Route path="/bible" element={<LazyPage><BiblePage /></LazyPage>} />
      <Route path="/bible/:bookId" element={<LazyPage><BiblePage /></LazyPage>} />
      <Route path="/bible/:bookId/:chapterNum" element={<LazyPage><BiblePage /></LazyPage>} />
      <Route path="/bible-audio" element={<LazyPage><BibleAudioPage /></LazyPage>} />
      <Route path="/calendar" element={<LazyPage><CalendarPage /></LazyPage>} />
      <Route path="/bookmarks" element={<LazyPage><BookmarksPage /></LazyPage>} />
      <Route path="/admin" element={<LazyPage><AdminFeedbackPage /></LazyPage>} />
      <Route path="/admin/reset-password" element={<LazyPage><AdminResetPasswordPage /></LazyPage>} />
    </Routes>
  );
}
