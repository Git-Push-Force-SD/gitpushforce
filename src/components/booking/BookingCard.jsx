// src/components/booking/BookingCard.jsx
import React from 'react';
import { MapPin, Clock } from 'lucide-react';
import StatusTimeline from './StatusTimeline';
import { STATUS_META } from '../../utils/bookingConstants';

const BookingCard = ({ booking, onCancel, isPast }) => {
  const meta   = STATUS_META[booking.status] || STATUS_META.pending;
  const imgUrl = booking.listings?.image_path
    ? `https://keposlpyrewldohbmesq.supabase.co/storage/v1/object/public/Listings/${booking.listings.image_path}`
    : null;

  const formattedDate = booking.date
    ? new Date(booking.date + 'T00:00:00').toLocaleDateString('en-ZA', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      })
    : '—';

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-opacity ${isPast ? 'opacity-60' : ''}`}>
      <div className="flex">
        {/* Item image */}
        {imgUrl && (
          <div className="w-24 shrink-0 bg-gray-50">
            <img src={imgUrl} alt={booking.listings?.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex-1 p-4">
          {/* Title + badge */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-dark leading-tight">
              {booking.listings?.title || 'Item'}
            </p>
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-md shrink-0"
              style={{ background: meta.bg, color: meta.color }}
            >
              {meta.label}
            </span>
          </div>

          <p className="text-xs text-gray-400 mb-1">Seller: {booking.sellerName}</p>

          {/* Date + time */}
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-1">
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {formattedDate} · {booking.time_slot}
            </span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <MapPin size={11} />
            {booking.location}
          </div>

          {/* Timeline (only for active bookings) */}
          {!isPast && <StatusTimeline status={booking.status} />}

          {/* Cancel button */}
          {!isPast && booking.status !== 'collected' && (
            <button
              onClick={() => onCancel(booking)}
              className="mt-3 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: '#FCEBEB', color: '#A32D2D' }}
            >
              Cancel booking
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingCard;