// DropOffsView.jsx
import React, { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { formatDate, formatTime } from './facilUtils';

// ─────────────────────────────────────────────────────────────────────────────
// DROP-OFFS VIEW
// Shows all pending bookings — staff confirms receipt which marks the item
// as dropped_off and unlocks the buyer's collection slot.
// ─────────────────────────────────────────────────────────────────────────────
export default function DropOffsView() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

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
            seller_id,
            date,
            time_slot,
            listings (id, title)
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
    } finally {
      setActionLoading(null);
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
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-light bg-light">
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
                <td colSpan="5" className="px-3 sm:px-6 py-6 sm:py-8 text-center text-xs sm:text-sm text-text-muted">
                  No items pending drop-off
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr key={booking.id} className="border-b border-light hover:bg-light/50 transition-colors">
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}