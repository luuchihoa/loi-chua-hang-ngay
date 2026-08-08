const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function getWeekDays(selectedDate) {
  const current = new Date(selectedDate);
  const mondayOffset = current.getDay() === 0 ? -6 : 1 - current.getDay();
  const monday = new Date(current);
  monday.setDate(current.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return day;
  });
}

export default function WeekRibbon({ selectedDate, onSelectDate, theme }) {
  const days = getWeekDays(selectedDate);

  return (
    <div aria-label="Chọn ngày trong tuần" className="grid grid-cols-7 gap-1 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md rounded-[20px] p-1.5 border border-stone-200/80 dark:border-stone-800/80 shadow-sm my-3">
      {days.map((day, index) => {
        const isSelected = day.toDateString() === selectedDate.toDateString();
        const isToday = day.toDateString() === new Date().toDateString();

        return (
          <button
            key={day.toISOString()}
            onClick={() => onSelectDate(day)}
            aria-label={`${DAY_LABELS[index]}, ngày ${day.getDate()} tháng ${day.getMonth() + 1}`}
            aria-pressed={isSelected}
            className={`min-w-0 min-h-[52px] py-1.5 px-1 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-95 ${
              isSelected
                ? theme.activeDay
                : isToday
                  ? theme.todayDay
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <span className={`text-[10px] font-bold uppercase ${index === 6 && !isSelected ? 'text-rose-500' : ''}`}>
              {DAY_LABELS[index]}
            </span>
            <span className="text-[13px] font-extrabold mt-0.5">{day.getDate()}</span>
          </button>
        );
      })}
    </div>
  );
}
