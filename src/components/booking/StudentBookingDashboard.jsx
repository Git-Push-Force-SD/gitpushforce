// src/components/booking/StudentBookingDashboard.jsx
// Entry point for the student booking feature.
// Plugs into StudentDashboard.jsx when the student clicks "Trade Facility".

import React, { useState } from 'react';
import { X, CalendarDays, Package } from 'lucide-react';
import BookingFlow from './BookingFlow';
import BookingList from './BookingList';
import CancelModal from './CancelModal';
import { useAuth } from '../../AuthContext';
import {
  useBookings,
  useEligibleOrders,
  useSellerPendingOrders,
  createBooking, 
     cancelBooking 
    } from '../../hooks/useBookings';



// ── Success banner ────────────────────────────
const SuccessBanner = ({ info, onDismiss, onViewBookings }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
    <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
      style={{ background: '#EAF3DE' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="#3B6D11" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
    <p className="text-base font-semibold text-dark mb-1">Booking confirmed!</p>
    <p className="text-sm text-gray-500 mb-5">
      Drop-off scheduled for{' '}
      <span className="font-medium text-dark">
        {new Date(info.date + 'T00:00:00').toLocaleDateString('en-ZA', {
          weekday: 'long', day: 'numeric', month: 'long',
        })}
      </span>{' '}
      at <span className="font-medium text-dark">{info.timeSlot}</span>.
    </p>
    <div className="flex gap-2 justify-center">
      <button
        onClick={onDismiss}
        className="px-5 py-2 rounded-full text-sm font-medium bg-dark text-white"
      >
        Book another slot
      </button>
      <button
        onClick={onViewBookings}
        className="px-5 py-2 rounded-full text-sm font-medium border border-gray-200 text-dark hover:bg-gray-50 transition-colors"
      >
        View my bookings
      </button>
    </div>
  </div>
);

// ── Main dashboard ────────────────────────────
const StudentBookingDashboard = ({ onClose }) => {
  const { user } = useAuth();

  const [activeTab,    setActiveTab]    = useState('book');
  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState(null);
  const [successInfo,  setSuccessInfo]  = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling,   setCancelling]   = useState(false);

  const { 
    bookings, 
    loading: bookingsLoading,
    error: bookingsError,
    refetch,
    cancelBooking
    } = useBookings(user?.id);
  const { orders,   loading: ordersLoading,   error: ordersError }            = useEligibleOrders(user?.id);
  const { pendingOrders } = useSellerPendingOrders(user?.id);
  
  // ── Create booking ──────────────────────────
  const handleConfirm = async ({ orderId, buyerId, sellerId, listingId, date, timeSlot, notes }) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createBooking({
        orderId,
        buyerId,
        sellerId,
        listingId,
        date,
        timeSlot,
        notes,
      });
      setSuccessInfo({ date, timeSlot });
      refetch();
    } catch (err) {
      console.error('[StudentBookingDashboard] createBooking error:', err);
      setSubmitError(err.message || 'Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };


  // ── Cancel booking ──────────────────────────
  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await cancelBooking({
        bookingId: cancelTarget.id,
        orderId:   cancelTarget.order_id,
        userId:    user.id,
      });
      setCancelTarget(null);
      refetch();
    } catch (err) {
      console.error('[StudentBookingDashboard] cancelBooking error:', err);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      <div className="bg-offwhite w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-dark font-display">Bookings</h2>
            <p className="text-xs text-gray-400">Book a drop-off slot for your item</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-dark transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-5 shrink-0">
          {[
            { id: 'book',     label: 'Book a slot', icon: CalendarDays },
            { id: 'bookings', label: 'My bookings', icon: Package },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 pb-2.5 mr-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-dark text-dark'
                  : 'border-transparent text-gray-400 hover:text-dark'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">

          {activeTab === 'book' && (
            <>
              {successInfo ? (
                <SuccessBanner
                  info={successInfo}
                  onDismiss={() => setSuccessInfo(null)}
                  onViewBookings={() => { setSuccessInfo(null); setActiveTab('bookings'); }}
                />
              ) : (
                <>
                  {submitError && (
  <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2 mb-3">
    {submitError}
  </p>
)}

{pendingOrders.length > 0 && (
  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
      <span className="text-amber-600 text-sm font-bold">!</span>
    </div>
    <div>
      <p className="text-sm font-semibold text-amber-800 mb-0.5">
        You have {pendingOrders.length} new order{pendingOrders.length > 1 ? 's' : ''} to drop off
      </p>
      <p className="text-xs text-amber-600">
        A buyer has paid for your item. Please book a drop-off slot at the Trade Facility.
      </p>
    </div>
  </div>
)}
                  {ordersLoading ? (
                    <div className="h-64 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-dark border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <BookingFlow
                      eligibleOrders={orders}
                      onConfirm={handleConfirm}
                      submitting={submitting}
                    />
                  )}
                </>
              )}
            </>
          )}

          {activeTab === 'bookings' && (
            <BookingList
              bookings={bookings}
              loading={bookingsLoading}
              error={bookingsError}
              onCancel={setCancelTarget}
            />
          )}
        </div>
      </div>

      <CancelModal
        booking={cancelTarget}
        onConfirm={handleCancelConfirm}
        onClose={() => setCancelTarget(null)}
        loading={cancelling}
      />
    </div>
  );
};

export default StudentBookingDashboard;