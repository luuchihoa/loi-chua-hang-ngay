import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, Apple, CheckCircle2, Share2, PlusSquare, Sparkles, Download, Layers, ShieldCheck, WifiOff, Volume2 } from 'lucide-react';
import { usePWAInstall } from '../../context/PWAInstallContext.jsx';
import { BRAND } from '../../config/brand.js';

export default function InstallAppModal() {
  const { 
    isInstallModalOpen, 
    closeInstallModal, 
    isIOS, 
    isAndroid, 
    isDesktop,
    canInstallNative, 
    triggerInstall,
    isStandalone 
  } = usePWAInstall();

  const [activeTab, setActiveTab] = useState(isIOS ? 'ios' : isAndroid ? 'android' : 'ios');

  if (!isInstallModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeInstallModal}
          className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-lg bg-stone-50 dark:bg-stone-900 rounded-3xl shadow-2xl border border-amber-500/30 overflow-hidden z-10 my-auto"
        >
          {/* Header Banner with Gold Accents */}
          <div className="relative bg-gradient-to-br from-[#600b14] via-[#45070e] to-[#250307] text-white p-6 pb-5 text-center overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-rose-500/20 rounded-full blur-2xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={closeInstallModal}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-stone-200 hover:text-white transition-colors"
              aria-label="Đóng bảng hướng dẫn"
            >
              <X className="w-5 h-5" />
            </button>

            {/* App Icon */}
            <div className="mx-auto w-16 h-16 rounded-2xl overflow-hidden bg-white/10 p-1.5 ring-2 ring-amber-400/50 shadow-xl mb-3 flex items-center justify-center">
              <img 
                src="/logo_loi_chua_moi_ngay.png" 
                alt="Logo Lời Chúa Mỗi Ngày" 
                className="w-full h-full object-contain"
                onError={(e) => { e.target.src = '/logo_96.png'; }}
              />
            </div>

            <h3 className="font-extrabold text-xl sm:text-2xl text-amber-300 tracking-wide mb-1">
              Cài Đặt {BRAND.name}
            </h3>
            <p className="text-xs sm:text-sm text-stone-200 opacity-90 max-w-sm mx-auto">
              Trải nghiệm ứng dụng Phụng Vụ & Kinh Thánh mượt mà, toàn màn hình, hoàn toàn miễn phí 100%.
            </p>
          </div>

          {/* Benefits Feature Grid */}
          <div className="grid grid-cols-2 gap-2.5 p-4 sm:p-5 bg-amber-50/50 dark:bg-stone-950/40 border-b border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/80 dark:bg-stone-800/80 border border-stone-200/60 dark:border-stone-700/60 shadow-2xs">
              <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-semibold">Toàn màn hình không viền</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/80 dark:bg-stone-800/80 border border-stone-200/60 dark:border-stone-700/60 shadow-2xs">
              <WifiOff className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-semibold">Đọc offline không cần mạng</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/80 dark:bg-stone-800/80 border border-stone-200/60 dark:border-stone-700/60 shadow-2xs">
              <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="font-semibold">Nghe Audio chạy nền</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/80 dark:bg-stone-800/80 border border-stone-200/60 dark:border-stone-700/60 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <span className="font-semibold">0đ trọn đời & Không QC</span>
            </div>
          </div>

          {/* OS Switcher Tabs */}
          <div className="p-4 sm:p-6 pt-4">
            <div className="flex rounded-2xl bg-stone-200/70 dark:bg-stone-800 p-1 mb-5">
              <button
                onClick={() => setActiveTab('ios')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'ios'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                <Apple className="w-4 h-4" />
                <span>iPhone / iPad (iOS)</span>
              </button>
              <button
                onClick={() => setActiveTab('android')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'android'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Android / Máy Tính</span>
              </button>
            </div>

            {/* TAB CONTENT: iOS Guide */}
            {activeTab === 'ios' && (
              <div className="space-y-3.5">
                <div className="text-xs text-stone-600 dark:text-stone-400 mb-2 font-medium">
                  Thực hiện 2 bước đơn giản trên trình duyệt <strong className="text-stone-900 dark:text-stone-100">Safari</strong>:
                </div>

                {/* Step 1 */}
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white dark:bg-stone-800/90 border border-stone-200 dark:border-stone-700/80 shadow-xs">
                  <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 leading-relaxed">
                    Bấm vào nút <span className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-md"><Share2 className="w-3.5 h-3.5" /> Chia sẻ</span> ở thanh công cụ dưới cùng của Safari.
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white dark:bg-stone-800/90 border border-stone-200 dark:border-stone-700/80 shadow-xs">
                  <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 leading-relaxed">
                    Cuộn xuống danh sách và chọn <span className="inline-flex items-center gap-1 font-bold text-stone-900 dark:text-white bg-stone-100 dark:bg-stone-700 px-2 py-0.5 rounded-md"><PlusSquare className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Thêm vào MH chính</span> <i>(Add to Home Screen)</i>.
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white dark:bg-stone-800/90 border border-stone-200 dark:border-stone-700/80 shadow-xs">
                  <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 leading-relaxed">
                    Bấm <strong className="text-amber-700 dark:text-amber-400">"Thêm" (Add)</strong> ở góc trên bên phải màn hình để hoàn tất!
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Android / Desktop Guide */}
            {activeTab === 'android' && (
              <div className="space-y-4 text-center">
                {canInstallNative ? (
                  <div className="py-2">
                    <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 mb-4">
                      Thiết bị của bạn hỗ trợ cài đặt tự động chỉ với 1 lần chạm:
                    </p>
                    <button
                      onClick={triggerInstall}
                      className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                    >
                      <Download className="w-5 h-5" />
                      <span>Cài Đặt Ứng Dụng Ngay (1 Chạm)</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 text-left">
                    <div className="text-xs text-stone-600 dark:text-stone-400 mb-2 font-medium">
                      Cách cài đặt trên <strong className="text-stone-900 dark:text-stone-100">Chrome / Cốc Cốc / Edge</strong>:
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-white dark:bg-stone-800/90 border border-stone-200 dark:border-stone-700/80 shadow-xs">
                      <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </div>
                      <div className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 leading-relaxed">
                        Bấm vào biểu tượng <strong>Menu 3 chấm (⋮)</strong> ở góc trên bên phải trình duyệt.
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-white dark:bg-stone-800/90 border border-stone-200 dark:border-stone-700/80 shadow-xs">
                      <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </div>
                      <div className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 leading-relaxed">
                        Chọn <strong className="text-amber-700 dark:text-amber-400">"Cài đặt ứng dụng"</strong> hoặc <strong>"Thêm vào Màn hình chính"</strong>.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer Notice */}
            <div className="mt-5 pt-3 border-t border-stone-200/80 dark:border-stone-800 text-center">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Công nghệ PWA đạt chuẩn quốc tế do Apple & Google phát triển
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
