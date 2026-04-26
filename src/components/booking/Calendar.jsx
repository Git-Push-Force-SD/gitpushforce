// src/components/booking/Calendar.jsx
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const Calendar = ({ selectedDate, onSelect }) => {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Build date string YYYY-MM-DD
  const toDateStr = (d) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-dark">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-[11px] font-medium text-gray-400 text-center py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;

          const dt         = new Date(viewYear, viewMonth, day);
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const isPast     = dt < todayStart;
          const isWeekend  = dt.getDay() === 0 || dt.getDay() === 6;
          const isToday    = dt.toDateString() === today.toDateString();
          const isSelected = selectedDate === toDateStr(day);
          const disabled   = isPast || isWeekend;

          return (
            <button
              key={day}
              disabled={disabled}
              onClick={() => onSelect(toDateStr(day))}
              className={`
                aspect-square flex items-center justify-center rounded-lg text-sm transition-all
                ${isSelected
                  ? 'bg-dark text-white font-semibold'
                  : disabled
                    ? 'text-gray-300 cursor-not-allowed'
                    : isToday
                      ? 'border border-dark text-dark font-medium hover:bg-gray-50'
                      : 'text-dark hover:bg-gray-100'
                }
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-3">Weekends are unavailable. Select a weekday.</p>
    </div>
  );
};

export default Calendar;