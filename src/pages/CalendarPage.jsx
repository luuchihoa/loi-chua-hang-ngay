import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Sparkles, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getLiturgyInfo, getLiturgicalColor } from '../utils/liturgyCalendar.js';
import { useLiturgy } from '../context/LiturgyContext.jsx';

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { setSelectedDate } = useLiturgy();
  const navigate = useNavigate();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDow = firstDay.getDay(); // 0: CN
  const daysInMonth = lastDay.getDate();

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const days = [];
  for (let i = 0; i < startDow; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d));
  }

  const dowHeader = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

  const handleSelectDate = (date) => {
    if (!date) return;
    setSelectedDate(date);
    navigate('/');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      
      {/* Calendar Header */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                Lịch Phụng Vụ Công Giáo
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Tháng {month + 1} năm {year}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 text-center gap-1 mb-2">
          {dowHeader.map((h, i) => (
            <div
              key={h}
              className={`text-xs font-bold py-2 ${
                i === 0 ? 'text-rose-600 dark:text-rose-400' : 'text-stone-500 dark:text-stone-400'
              }`}
            >
              {h}
            </div>
          ))}
        </div>

        {/* Grid Days */}
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${idx}`} className="h-16 rounded-xl bg-stone-50/50 dark:bg-stone-950/20" />;
            }

            const info = getLiturgyInfo(date);
            const isToday = date.toDateString() === new Date().toDateString();
            const isSunday = date.getDay() === 0;

            const colorKey = getLiturgicalColor(info);
            const badgeColor = 
              colorKey === 'emerald' ? 'bg-emerald-500' :
              colorKey === 'purple' ? 'bg-purple-500' :
              colorKey === 'rose' ? 'bg-rose-500' : 'bg-amber-500';

            return (
              <button
                key={date.toISOString()}
                onClick={() => handleSelectDate(date)}
                className={`h-16 rounded-2xl p-1.5 flex flex-col justify-between text-left transition-all hover:scale-[1.03] active:scale-95 border ${
                  isToday
                    ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 dark:border-amber-700 font-bold'
                    : 'bg-white dark:bg-stone-900 border-stone-100 dark:border-stone-800 hover:border-amber-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-xs font-bold ${isSunday ? 'text-rose-600 dark:text-rose-400' : 'text-stone-800 dark:text-stone-200'}`}>
                    {date.getDate()}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${badgeColor}`} title={info.displayName} />
                </div>

                <span className="text-[10px] text-stone-500 dark:text-stone-400 line-clamp-2 leading-tight">
                  {info.displayName.replace('Mùa ', '')}
                </span>
              </button>
            );
          })}
        </div>

      </div>

    </div>
  );
}
