import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Type, AlignJustify } from 'lucide-react';

const FONT_OPTIONS = [
  { value: 'normal', label: 'Nhỏ' },
  { value: 'medium', label: 'Vừa' },
  { value: 'large', label: 'Lớn' },
];

const LINE_OPTIONS = [
  { value: 'compact', label: 'Gần' },
  { value: 'normal', label: 'Vừa' },
  { value: 'relaxed', label: 'Thoáng' },
];

export default function ReaderPreferencesSheet({
  isOpen,
  onClose,
  fontSize,
  setFontSize,
  lineHeight,
  setLineHeight,
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Đóng tùy chỉnh đọc"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            data-ui-layer="modal-backdrop"
            className="fixed inset-0 z-[80] bg-stone-950/35 backdrop-blur-[2px]"
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="reader-preferences-title"
            initial={{ opacity: 0, y: 24, x: 0 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 24, x: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            data-ui-layer="modal-content"
            className="fixed inset-x-3 bottom-3 z-[90] max-h-[82vh] overflow-y-auto rounded-[28px] border border-stone-200 bg-[#fffdf8] p-5 shadow-2xl dark:border-stone-700 dark:bg-stone-900 sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-24 sm:w-[360px]"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">Không gian đọc</p>
                <h2 id="reader-preferences-title" className="mt-1 font-serif text-xl font-bold text-stone-900 dark:text-stone-100">Tùy chỉnh theo bạn</h2>
              </div>
              <button type="button" onClick={onClose} className="reader-icon-control" aria-label="Đóng tùy chỉnh đọc">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">
              <PreferenceGroup icon={Type} label="Cỡ chữ">
                <SegmentedOptions options={FONT_OPTIONS} value={fontSize} onChange={setFontSize} />
              </PreferenceGroup>

              <PreferenceGroup icon={AlignJustify} label="Khoảng cách dòng">
                <SegmentedOptions options={LINE_OPTIONS} value={lineHeight} onChange={setLineHeight} />
              </PreferenceGroup>

            </div>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}

function PreferenceGroup({ icon: Icon, label, children }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs font-bold text-stone-600 dark:text-stone-300">
        <Icon size={15} className="text-amber-700 dark:text-amber-400" />
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}

function SegmentedOptions({ options, value, onChange }) {
  return (
    <div className="sepia-surface-soft grid grid-cols-3 gap-1 rounded-2xl bg-stone-100 p-1 dark:bg-stone-800">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`min-h-[44px] rounded-xl px-3 text-xs font-bold transition-all ${
            value === option.value
              ? 'bg-white text-stone-900 shadow-sm ring-1 ring-amber-600/70 dark:bg-stone-700 dark:text-white'
              : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
