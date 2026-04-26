// src/components/booking/CancelModal.jsx
import React from 'react';
import { X } from 'lucide-react';

const CancelModal = ({ booking, onConfirm, onClose, loading }) => {
  if (!booking) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-start justify-between mb-3">
          <p className="text-base font-semibold text-dark">Cancel this booking?</p>
          <button onClick={onClose} className="text-gray-400 hover:text-dark transition-colors">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm font-medium text-dark mb-1">{booking.listings?.title}</p>
        <p className="text-sm text-gray-500 mb-4">
          {booking.date} · {booking.time_slot}
        </p>
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
          Your slot will be freed up and you'll be able to rebook from the same order. This cannot be undone.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-dark hover:bg-gray-50 transition-colors"
          >
            Keep booking
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ background: '#FCEBEB', color: '#A32D2D' }}
          >
            {loading ? 'Cancelling…' : 'Yes, cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelModal;