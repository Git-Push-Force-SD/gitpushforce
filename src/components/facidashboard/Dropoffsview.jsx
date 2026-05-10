// DropOffsView.jsx
import React, { useState, useEffect } from 'react';
import { Loader, ChevronRight } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { formatDate, formatTime } from './facilUtils';
import { getImageUrl } from './imageUtils';

// ─────────────────────────────────────────────────────────────────────────────
// DROP-OFFS VIEW
// Shows all pending bookings — staff confirms receipt which marks the item
// as dropped_off and unlocks the buyer's collection slot.
// ─────────────────────────────────────────────────────────────────────────────
export default function DropOffsView() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    const fetchDropOffs = async () => {
      setLoading(true);
      try {
        // Pending = seller hasn't dropped off yet — staff sees these and confirms on receipt
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select(`
            id,
            listing_id,
            order_id,
            buyer_id,
            seller_id,
            date,
            time_slot,
            listings (id, title, image_path)
          `)
          .eq('status', 'pending')
          .order('date', { ascending: true });

        if (bookingsError) throw bookingsError;
        if (!bookingsData || bookingsData.length === 0) {
          setBookings([]);
          return;
        }

        // Fetch sellers manually — no FK on bookings.seller_id
        const sellerIds = [...new Set(bookingsData.map(b => b.seller_id).filter(Boolean))];

        const { data: usersData } = await supabase
          .from('users')
          .select('id, username, email')
          .in('id', sellerIds);

        const userMap = (usersData || []).reduce((acc, u) => {
          acc[u.id] = u;
          return acc;
        }, {});

        setBookings(bookingsData.map(b => ({
          ...b,
          seller: userMap[b.seller_id] ?? null,
        })));
      } catch (err) {
        console.error('Drop-offs fetch error:', err);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDropOffs();
  }, []);

  const handleConfirmDropOff = async (booking) => {
    setActionLoading(booking.id);
    try {
      // Mark booking as confirmed — item is now held by staff
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', booking.id);

      if (bookingError) throw bookingError;

      // Mark order as dropped_off and unlock buyer's collection slot
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          seller_status: 'dropped_off',
          buyer_status: 'ready_for_collection',
        })
        .eq('id', booking.order_id);

      if (orderError) throw orderError;

      setBookings(prev => prev.filter(b => b.id !== booking.id));
    } catch (err) {
      console.error('Confirm drop-off error:', err);
      alert('Failed to confirm drop-off. Please try again.');
      setActionLoading(null);
      setSelectedBooking(null);
      return;
    }

    setActionLoading(null);
    setSelectedBooking(null);

    try {
      await supabase.functions.invoke('notify-buyer-collection', {
        body: {
          buyerId: booking.buyer_id,
          listingTitle: booking.listings?.title,
          date: booking.date,
          timeSlot: booking.time_slot,
        },
      });
    } catch (err) {
      console.error('Email notification failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="rounded-xl sm:rounded-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-light bg-light">
              <th className="px-3 sm:px-6 py-3 sm:py-4"></th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-semibold text-dark uppercase tracking-wider">Item</th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-semibold text-dark uppercase tracking-wider">Seller</th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-semibold text-dark uppercase tracking-wider">Date</th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-semibold text-dark uppercase tracking-wider">Time</th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-semibold text-dark uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-3 sm:px-6 py-6 sm:py-8 text-center text-xs sm:text-sm text-text-muted">
                  No items pending drop-off
                </td>
              </tr>
            ) : (
              bookings.map((booking) => {
                const imageUrl = getImageUrl(booking.listings);
                return (
                <tr key={booking.id} className="border-b border-light hover:bg-light/50 transition-colors">
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    {imageUrl ? (
                      <img src={imageUrl} className="w-10 h-10 rounded-lg object-contain bg-light flex-shrink-0" alt="listing" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-light flex-shrink-0" />
                    )}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 font-medium text-dark text-xs sm:text-sm">{booking.listings?.title || 'N/A'}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-text-muted text-xs sm:text-sm">
                    {booking.seller?.username || booking.seller?.email?.split('@')[0] || 'N/A'}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-text-muted text-xs sm:text-sm">{formatDate(booking.date)}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-text-muted text-xs sm:text-sm">{formatTime(booking.time_slot)}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <button
                      onClick={() => handleConfirmDropOff(booking)}
                      disabled={actionLoading === booking.id}
                      className="bg-primary text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {actionLoading === booking.id ? 'Processing...' : 'Confirm Receipt'}
                    </button>
                  </td>
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* Mobile List View */}
      <div className="sm:hidden divide-y divide-light">
        {bookings.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-text-muted">
            No items pending drop-off
          </div>
        ) : (
          bookings.map((booking) => {
            const imageUrl = getImageUrl(booking.listings);
            return (
            <button
              key={booking.id}
              onClick={() => setSelectedBooking(booking)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-light/50 transition-colors text-left"
            >
              <div className="flex items-center gap-3 flex-1">
                {imageUrl ? (
                  <img src={imageUrl} className="w-10 h-10 rounded-lg object-contain bg-light flex-shrink-0" alt="listing" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-light flex-shrink-0" />
                )}
                <div>
                  <p className="font-medium text-dark text-sm">{booking.listings?.title || 'N/A'}</p>
                  <p className="text-xs text-text-muted mt-1">
                    {booking.seller?.username || booking.seller?.email?.split('@')[0] || 'N/A'}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-text-muted flex-shrink-0" />
            </button>
          );
          })
        )}
      </div>
      
      {/* Bottom Sheet Modal */}
      {selectedBooking && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedBooking(null)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white p-6 space-y-4 shadow-xl">
            {(() => {
              const imageUrl = getImageUrl(selectedBooking.listings);
              return (
                <>
                  {imageUrl ? (
                    <img src={imageUrl} className="w-20 h-20 rounded-xl object-contain mx-auto" alt="listing" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-light mx-auto" />
                  )}
                </>
              );
            })()}
            <div className="w-10 h-1 rounded-full bg-light mx-auto mb-2" />
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Item</span>
                <span className="font-medium text-dark">{selectedBooking.listings?.title || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Seller</span>
                <span className="font-medium text-dark">
                  {selectedBooking.seller?.username || selectedBooking.seller?.email?.split('@')[0] || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Date</span>
                <span className="font-medium text-dark">{formatDate(selectedBooking.date)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Time</span>
                <span className="font-medium text-dark">{formatTime(selectedBooking.time_slot)}</span>
              </div>
            </div>
            <button
              onClick={() => handleConfirmDropOff(selectedBooking)}
              disabled={actionLoading === selectedBooking.id}
              className="w-full bg-primary text-white py-3 rounded-2xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {actionLoading === selectedBooking.id ? 'Processing...' : 'Confirm Receipt'}
            </button>
            <button
              onClick={() => setSelectedBooking(null)}
              className="w-full py-3 rounded-2xl text-sm font-semibold text-text-muted hover:bg-light transition-colors"
            >
              Close
            </button>
          </div>
        </>
      )}
    </div>
  );
}