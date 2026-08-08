import React from 'react';
import {
  Search,
  Globe2,
  ChevronDown,
  Compass,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';

export default function ReaderToolbar({
  onOpenSearch,
  onOpenTranslation,
  goToRef,
  goToInput,
  setGoToInput,
  goToError,
  setGoToError,
  onGoTo,
  onOpenGoToMobile,
  onPrevious,
  onNext,
  previousDisabled,
  nextDisabled,
  onOpenPreferences,
}) {
  return (
    <div className="reader-toolbar sticky top-32 md:top-16 z-20 px-3 pb-2 sm:px-5 sm:py-2.5 md:px-8">
      <div className="mx-auto grid max-w-lg grid-cols-4 gap-1 rounded-[18px] border border-stone-200/80 bg-white/80 p-1 shadow-[0_12px_28px_-20px_rgba(28,25,23,.7)] backdrop-blur-xl dark:border-stone-700/80 dark:bg-stone-900/88 sm:hidden">
        <button type="button" onClick={onOpenSearch} className="group flex h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-[14px] text-stone-600" aria-label="Tìm kiếm Kinh Thánh">
          <Search size={17} />
          <span className="text-[9px] font-bold">Tìm kiếm</span>
        </button>
        <button type="button" onClick={onOpenTranslation} className="group flex h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-[14px] text-stone-600" aria-label="Chọn bản dịch Kinh Thánh">
          <Globe2 size={17} />
          <span className="max-w-full truncate px-1 text-[9px] font-bold">CGKPV</span>
        </button>
        <button type="button" onClick={onOpenGoToMobile} className="group flex h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-[14px] text-stone-600" aria-label="Đi tới sách, chương hoặc câu">
          <Compass size={17} />
          <span className="text-[9px] font-bold">Đi tới</span>
        </button>
        <button type="button" onClick={onOpenPreferences} className="group flex h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-[14px] text-stone-600" aria-label="Mở tùy chỉnh đọc">
          <SlidersHorizontal size={17} />
          <span className="text-[9px] font-bold">Hiển thị</span>
        </button>
      </div>

      <div className="mx-auto hidden max-w-5xl items-center justify-between gap-2 sm:flex">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <button
            type="button"
            onClick={onOpenSearch}
            className="reader-control h-11 px-3 sm:px-4"
            aria-label="Tìm kiếm Kinh Thánh"
          >
            <Search size={17} />
            <span className="hidden sm:inline">Tìm kiếm</span>
          </button>

          <button
            type="button"
            onClick={onOpenTranslation}
            className="reader-control h-11 px-3"
            aria-label="Chọn bản dịch Kinh Thánh"
          >
            <Globe2 size={15} className="text-amber-700 dark:text-amber-400" />
            <span>CGKPV</span>
            <ChevronDown size={14} className="text-stone-400" />
          </button>

          <div className="relative hidden sm:block">
            <Compass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
            <span className="sr-only">Đi tới sách, chương hoặc câu</span>
            <input
              ref={goToRef}
              type="text"
              aria-label="Đi tới sách, chương hoặc câu"
              value={goToInput}
              onChange={(event) => {
                setGoToInput(event.target.value);
                setGoToError(false);
              }}
              onKeyDown={onGoTo}
              placeholder="Ga 3,16"
              className={`h-11 w-36 rounded-2xl border pl-9 pr-10 text-xs outline-none transition-all md:w-44 ${
                goToError
                  ? 'border-rose-400 bg-rose-50 text-rose-700 ring-2 ring-rose-300/40 dark:bg-rose-950/20 dark:text-rose-300'
                  : 'border-stone-200/80 bg-white/80 text-stone-800 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-100'
              }`}
            />
            <button
              type="button"
              onClick={onGoTo}
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-amber-100 hover:text-amber-800 active:bg-amber-200 dark:text-stone-300 dark:hover:bg-amber-900/45 dark:hover:text-amber-200"
              aria-label="Thực hiện đi tới địa chỉ Kinh Thánh"
              title="Đi tới"
            >
              <ArrowRight size={16} />
            </button>
            {goToError && (
              <span className="absolute top-full left-0 mt-1 whitespace-nowrap rounded-lg bg-rose-600 px-2 py-1 text-[10px] font-semibold text-white shadow-lg">
                Không tìm thấy địa chỉ này
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="hidden sm:flex items-center rounded-2xl bg-stone-100/80 dark:bg-stone-800/70" aria-label="Điều hướng chương">
            <button type="button" onClick={onPrevious} disabled={previousDisabled} className="reader-icon-control h-11 px-3 sm:px-4 !rounded-l-xl !rounded-r-none bg-transparent" aria-label="Chương trước">
              <ChevronLeft size={17} />
            </button>
            <button type="button" onClick={onNext} disabled={nextDisabled} className="reader-icon-control h-11 px-3 sm:px-4 !rounded-r-xl !rounded-l-none bg-transparent" aria-label="Chương sau">
              <ChevronRight size={17} />
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenPreferences}
            className="reader-control h-11 px-3 sm:px-4 bg-amber-100/80 text-amber-900 hover:bg-amber-200/80 dark:bg-amber-900/35 dark:text-amber-200 dark:hover:bg-amber-900/55"
            aria-label="Mở tùy chỉnh đọc"
          >
            <SlidersHorizontal size={17} />
            <span className="hidden sm:inline">Tùy chỉnh</span>
          </button>
        </div>
      </div>
    </div>
  );
}
