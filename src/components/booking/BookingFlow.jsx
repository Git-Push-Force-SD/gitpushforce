// src/components/booking/BookingFlow.jsx
// 3-step flow: Choose date → Pick slot → Confirm
// All DB calls happen in the parent via createBooking()

import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import Calendar from './Calendar';
import SlotPicker from './SlotPicker';
import { useAvailableSlots } from '../../hooks/useBookings';
import { FACILITY_LOCATION } from '../../utils/bookingConstants';

// ── Step indicator ────────────────────────────
const StepBar = ({ current }) => {
  const steps = ['Choose date', 'Pick slot', 'Confirm'];
  return (
    <div className="flex items-center mb-6">
      {steps.map((label, i) => {
        const done   = i < current - 1;
        const active = i === current - 1;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors"
                style={{
                  background: done ? '#EAF3DE' : active ? '#1a1a1a' : '#f3f4f6',
                  color:      done ? '#3B6D11' : active ? '#fff'    : '#9ca3af',
                }}
              >
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] whitespace-nowrap ${active ? 'text-dark font-medium' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="flex-1 mx-2 mt-[-10px]"
                style={{ height: '0.5px', background: done ? '#1D9E75' : '#e5e7eb' }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ── Main flow component ───────────────────────
const BookingFlow = ({ eligibleOrders, onConfirm, submitting }) => {
  const [step,        setStep]        = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(eligibleOrders[0] || null);
  const [selectedDate,  setSelectedDate]  = useState(null);
  const [selectedSlot,  setSelectedSlot]  = useState(null);
  const [notes,         setNotes]         = useState('');

  const { slots, loading: slotsLoading } = useAvailableSlots(selectedDate);

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setStep(2);
  };

  const handleSubmit = () => {
    onConfirm({
      orderId:    selectedOrder.orderId,
      sellerId:   selectedOrder.sellerId,
      listingId:  selectedOrder.listingId,
      date:       selectedDate,
      timeSlot:   selectedSlot,
      notes,
    });
  };

  const formattedDate = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-ZA', {
        weekday: 'long', day: 'numeric', month: 'long',
      })
    : '';

  // No eligible orders
  if (!eligibleOrders || eligibleOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
        <p className="text-sm font-medium text-dark">No items to drop off</p>
        <p className="text-xs text-center text-gray-400 max-w-xs">
          You don't have any paid orders awaiting a drop-off booking yet.
          Once a purchase is complete and payment confirmed, it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <StepBar current={step} />

      {/* Order selector */}
      <div className="mb-4">
        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest block mb-2">
          Item to drop off
        </label>
        <select
          value={selectedOrder?.orderId || ''}
          onChange={e => {
            const order = eligibleOrders.find(o => o.orderId === e.target.value);
            setSelectedOrder(order || null);
            setSelectedDate(null);
            setSelectedSlot(null);
            setStep(1);
          }}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-dark bg-white focus:outline-none focus:border-dark transition-colors"
        >
          {eligibleOrders.map(o => (
            <option key={o.orderId} value={o.orderId}>
              {o.title} — {o.sellerName}
            </option>
          ))}
        </select>
      </div>

      {/* Step 1 — Calendar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-3">
        <Calendar selectedDate={selectedDate} onSelect={handleDateSelect} />
      </div>

      {/* Step 2 — Slot picker */}
      {step >= 2 && selectedDate && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-3">
          <p className="text-sm text-gray-500 mb-1">
            Available slots for{' '}
            <span className="font-semibold text-dark">{formattedDate}</span>
          </p>
          <SlotPicker
            slots={slots}
            selectedSlot={selectedSlot}
            onSelect={setSelectedSlot}
            loading={slotsLoading}
          />
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => { setStep(1); setSelectedSlot(null); }}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-dark transition-colors"
            >
              <ChevronLeft size={14} /> Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!selectedSlot}
              className="ml-auto px-5 py-2 rounded-full text-sm font-medium bg-dark text-white disabled:opacity-40 transition-opacity"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Confirm */}
      {step === 3 && selectedSlot && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Booking summary
          </p>

          <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm divide-y divide-gray-100">
            {[
              ['Item',     selectedOrder?.title],
              ['Date',     formattedDate],
              ['Time',     selectedSlot],
              ['Location', FACILITY_LOCATION],
              ['Seller',   selectedOrder?.sellerName],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-2 first:pt-0 last:pb-0">
                <span className="text-gray-400">{label}</span>
                <span className="text-dark font-medium text-right max-w-[60%]">{value}</span>
              </div>
            ))}
          </div>

          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest block mb-2">
            Notes for staff (optional)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="e.g. fragile item, needs bubble wrap…"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-dark transition-colors mb-4"
          />

          <div className="flex gap-2">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-dark transition-colors"
            >
              <ChevronLeft size={14} /> Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="ml-auto px-5 py-2 rounded-full text-sm font-medium bg-dark text-white disabled:opacity-50 transition-opacity"
            >
              {submitting ? 'Confirming…' : 'Confirm booking'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingFlow;