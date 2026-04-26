// src/components/booking/SlotPicker.jsx
import React from 'react';

const SlotPicker = ({ slots, selectedSlot, onSelect, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 mt-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!slots || slots.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">
        No slots available for this date.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 mt-2">
      {slots.map(slot => {
        const isSelected = selectedSlot === slot.timeSlot;
        const isFull     = !slot.available;

        return (
          <button
            key={slot.timeSlot}
            disabled={isFull}
            onClick={() => onSelect(slot.timeSlot)}
            className={`
              flex flex-col items-center justify-center py-2.5 px-1 rounded-xl text-xs
              border transition-all
              ${isSelected
                ? 'bg-dark text-white border-dark'
                : isFull
                  ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                  : 'bg-white text-dark border-gray-200 hover:border-dark'
              }
            `}
          >
            <span className="font-medium text-[11px] leading-tight">{slot.timeSlot}</span>
            <span
              className={`text-[10px] mt-0.5 ${
                isSelected ? 'text-gray-300' : isFull ? 'text-red-400' : 'text-gray-400'
              }`}
            >
              {isFull ? 'Full' : `${slot.capacity - slot.taken} left`}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default SlotPicker;