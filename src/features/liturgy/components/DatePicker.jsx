import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default function DatePicker({ selectedDate, onChange, onClose, theme }) {
  const [viewDate, setViewDate] = useState(() => new Date(selectedDate));
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const emptyDays = new Date(year, month, 1).getDay() === 0
    ? 6
    : new Date(year, month, 1).getDay() - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const selectDate = (date) => {
    onChange(date);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-[290px] bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl p-4 z-50"
    >
      <div className="flex items-center justify-between mb-4">
        <button aria-label="Tháng trước" onClick={() => setViewDate(new Date(year, month - 1, 1))} className="w-9 h-9 flex items-center justify-center text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-[14px] font-bold text-stone-900 dark:text-stone-100">Tháng {month + 1}, {year}</div>
        <button aria-label="Tháng sau" onClick={() => setViewDate(new Date(year, month + 1, 1))} className="w-9 h-9 flex items-center justify-center text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2 text-center">
        {DAY_LABELS.map((label, index) => (
          <div key={label} className={`text-[11px] font-bold ${index === 6 ? 'text-rose-600' : 'text-stone-400'}`}>{label}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 place-items-center">
        {Array.from({ length: emptyDays }, (_, index) => <div key={`empty-${index}`} className="w-8 h-8" />)}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const dayNumber = index + 1;
          const date = new Date(year, month, dayNumber);
          const isSelected = date.toDateString() === selectedDate.toDateString();
          const isToday = date.toDateString() === new Date().toDateString();

          return (
            <button
              key={dayNumber}
              onClick={() => selectDate(date)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-medium transition-all ${
                isSelected ? theme.activeDay : isToday ? theme.todayDay : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              {dayNumber}
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 text-center">
        <button onClick={() => selectDate(new Date())} className={`min-h-9 px-3 text-[12px] font-bold ${theme.accentText} hover:underline`}>
          Về Hôm Nay
        </button>
      </div>
    </motion.div>
  );
}
