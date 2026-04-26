// src/components/booking/StatusTimeline.jsx
import React from 'react';
import { TIMELINE_STEPS } from '../../utils/bookingConstants';

const StatusTimeline = ({ status }) => {
  const currentIdx = TIMELINE_STEPS.findIndex(s => s.key === status);

  return (
    <div className="flex items-start mt-3">
      {TIMELINE_STEPS.map((step, i) => {
        const done   = i < currentIdx;
        const active = i === currentIdx;

        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: done ? '#1D9E75' : active ? '#1a1a1a' : '#d1d5db',
                }}
              />
              <span
                className="text-[10px] whitespace-nowrap"
                style={{
                  color:      done ? '#1D9E75' : active ? '#1a1a1a' : '#9ca3af',
                  fontWeight: active ? 500 : 400,
                }}
              >
                {step.label}
              </span>
            </div>
            {i < TIMELINE_STEPS.length - 1 && (
              <div
                className="flex-1 mt-[5px] mx-1.5"
                style={{
                  height: '0.5px',
                  background: done ? '#1D9E75' : '#e5e7eb',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default StatusTimeline;