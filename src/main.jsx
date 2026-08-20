import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { registerSW } from 'virtual:pwa-register';

// Cấu hình React Query Client (Cache 24h)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60 * 24, // 24 hours
      cacheTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Đăng ký Service Worker cho PWA (Cập nhật ngầm trong nền, không tự ý reload làm giật trang)
registerSW({
  immediate: true,
  onNeedReload() {
    // 🛡️ Chặn tự động reload: cho phép Service Worker âm thầm nạp cache mới trong nền
    // Tuyệt đối không gián đoạn trải nghiệm của người đang đọc kinh
  },
  onOfflineReady() {
    // Ứng dụng đã sẵn sàng hoạt động ngoại tuyến (offline)
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
