// src/components/booking/BookingList.jsx
import React from 'react';
import BookingCard from './BookingCard';
import { PackageSearch } from 'lucide-react';

const BookingList = ({ bookings, loading, error, onCancel }) => {
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-500 text-center py-8">{error}</p>
    );
  }

  const upcoming = bookings.filter(b => b.status !== 'collected' && b.status !== 'cancelled');
  const past     = bookings.filter(b => b.status === 'collected' || b.status === 'cancelled');

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
        <PackageSearch size={36} strokeWidth={1.5} />
        <p className="text-sm">No bookings yet.</p>
        <p className="text-xs text-gray-300">Book a drop-off slot to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {upcoming.length > 0 && (
        <section>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Upcoming
          </p>
          <div className="flex flex-col gap-3">
            {upcoming.map(b => (
              <BookingCard key={b.id} booking={b} onCancel={onCancel} isPast={false} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Past
          </p>
          <div className="flex flex-col gap-3">
            {past.map(b => (
              <BookingCard key={b.id} booking={b} onCancel={onCancel} isPast={true} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default BookingList;