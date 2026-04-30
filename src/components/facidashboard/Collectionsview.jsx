// CollectionsView.jsx
import React, { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { badgeClasses, formatDate, formatTime } from './facilUtils';

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTIONS VIEW
// Shows confirmed bookings where item is held by staff and buyer is ready
// to collect. Staff releases item once payment is clear.
// ─────────────────────────────────────────────────────────────────────────────
export default function CollectionsView({ user }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    const fetchCollections = async () => {
      setLoading(true);
      try {
        // confirmed = item held by staff, get orders where buyer can now collect
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('id')
          .eq('seller_status', 'dropped_off')
          .eq('buyer_status', 'ready_for_collection');

        if (ordersError) throw ordersError;
        if (!ordersData || ordersData.length === 0) {
          setBookings([]);
          return;
        }

        const orderIds = ordersData.map(o => o.id);

        // Fetch confirmed bookings for those orders
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select(`
            id,
            listing_id,
            order_id,
            buyer_id,
            date,
            time_slot,
            listings (id, title)
          `)
          .eq('status', 'confirmed')
          .in('order_id', orderIds)
          .order('date', { ascending: true });

        if (bookingsError) throw bookingsError;
        if (!bookingsData || bookingsData.length === 0) {
          setBookings([]);
          return;
        }

        // Fetch buyers manually — no FK on bookings.seller_id
        const buyerIds = [...new Set(bookingsData.map(b => b.buyer_id).filter(Boolean))];

        const { data: usersData } = await supabase
          .from('users')
          .select('id, username, email')
          .in('id', buyerIds);

        const userMap = (usersData || []).reduce((acc, u) => {
          acc[u.id] = u;
          return acc;
        }, {});

        // Fetch payments via order_id
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('id, order_id, cash_shortfall, cash_settled')
          .in('order_id', orderIds);

        const paymentMap = (paymentsData || []).reduce((acc, p) => {
          acc[p.order_id] = p;
          return acc;
        }, {});

        setBookings(bookingsData.map(b => ({
          ...b,
          buyer: userMap[b.buyer_id] ?? null,
          payment: paymentMap[b.order_id] ?? null,
        })));
      } catch (err) {
        console.error('Collections fetch error:', err);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, []);

  const handleReleaseItem = async (booking) => {
    setActionLoading(booking.id);
    try {
      const { error: orderError } = await supabase
        .from('orders')
        .update({ buyer_status: 'collected', status: 'completed' })
        .eq('id', booking.order_id);

      if (orderError) throw orderError;

      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ status: 'collected' })
        .eq('id', booking.id);

      if (bookingError) throw bookingError;

      setBookings(prev => prev.filter(b => b.id !== booking.id));
    } catch (err) {
      console.error('Release item error:', err);
      alert('Failed to release item. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkCashSettled = async (booking) => {
    setActionLoading(`cash-${booking.id}`);
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          cash_settled: true,
          cash_settled_by: user?.id,
          cash_settled_at: new Date().toISOString(),
        })
        .eq('id', booking.payment?.id);

      if (error) throw error;

      setBookings(prev => prev.map(b =>
        b.id === booking.id
          ? { ...b, payment: { ...b.payment, cash_settled: true } }
          : b
      ));
    } catch (err) {
      console.error('Mark cash settled error:', err);
      alert('Failed to mark cash settled. Please try again.');
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
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-semibold text-dark uppercase tracking-wider">Buyer</th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-semibold text-dark uppercase tracking-wider">Date</th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-semibold text-dark uppercase tracking-wider">Time</th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-semibold text-dark uppercase tracking-wider">Payment</th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-semibold text-dark uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-3 sm:px-6 py-6 sm:py-8 text-center text-xs sm:text-sm text-text-muted">
                  No items ready for collection
                </td>
              </tr>
            ) : (
              bookings.map((booking) => {
                const payment = booking.payment;
                const isPaymentClear = !payment || (payment.cash_shortfall <= 0 || payment.cash_settled);
                const hasCashOutstanding = payment && payment.cash_shortfall > 0 && !payment.cash_settled;
                const canRelease = isPaymentClear || !hasCashOutstanding;

                return (
                  <tr key={booking.id} className="border-b border-light hover:bg-light/50 transition-colors">
                    <td className="px-3 sm:px-6 py-3 sm:py-4 font-medium text-dark text-xs sm:text-sm">{booking.listings?.title || 'N/A'}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-text-muted text-xs sm:text-sm">
                      {booking.buyer?.username || booking.buyer?.email?.split('@')[0] || 'N/A'}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-text-muted text-xs sm:text-sm">{formatDate(booking.date)}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-text-muted text-xs sm:text-sm">{formatTime(booking.time_slot)}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <span className={`inline-flex rounded-full px-2 sm:px-3 py-1 text-xs font-semibold ${badgeClasses(isPaymentClear ? 'Payment clear' : 'Cash outstanding')}`}>
                        {isPaymentClear ? 'Clear' : 'Outstanding'}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                        <button
                          onClick={() => handleReleaseItem(booking)}
                          disabled={actionLoading === booking.id || !canRelease}
                          className="bg-primary text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                          {actionLoading === booking.id ? 'Processing...' : 'Release'}
                        </button>
                        {hasCashOutstanding && (
                          <button
                            onClick={() => handleMarkCashSettled(booking)}
                            disabled={actionLoading === `cash-${booking.id}`}
                            className="bg-dark text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold hover:bg-dark/90 transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            {actionLoading === `cash-${booking.id}` ? 'Processing...' : 'Mark Settled'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}