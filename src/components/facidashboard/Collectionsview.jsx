// CollectionsView.jsx
import React, { useState, useEffect } from 'react';
import { Loader, ChevronRight } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { badgeClasses, formatDate, formatTime } from './facilUtils';
import { getImageUrl } from './imageUtils';
import { useNavigate } from 'react-router-dom';
// ─────────────────────────────────────────────────────────────────────────────
// COLLECTIONS VIEW
// Shows confirmed bookings where item is held by staff and buyer is ready
// to collect. Staff releases item once payment is clear.
// ─────────────────────────────────────────────────────────────────────────────
export default function CollectionsView({ user }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    const fetchCollections = async () => {
      setLoading(true);
      try {
        // confirmed = item held by staff, ready for collection
        // For sales: get orders where seller has dropped off
        // For trades: get bookings where both parties (for same trade) have confirmed
        
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select(`
            id,
            trade_id,
            listing_id,
            order_id,
            booked_by,
            buyer_id,
            status,
            booking_type,
            date,
            time_slot,
            listings (id, title, image_path),
            trades (
              id,
              initiator_id,
              receiver_id,
              offered_listing_id,
              requested_listing_id
            )
          `)
          .eq('status', 'confirmed')
          .order('date', { ascending: true });

        if (bookingsError) throw bookingsError;
        if (!bookingsData || bookingsData.length === 0) {
          setBookings([]);
          return;
        }

        // Separate sale bookings and trade bookings
        const saleBookings = bookingsData.filter(b => !b.trade_id);
        const tradeBookings = bookingsData.filter(b => b.trade_id);

        // For sales: check if order exists and has seller_status = 'dropped_off'
        let salesToShow = [];
        if (saleBookings.length > 0) {
          const orderIds = saleBookings.map(b => b.order_id).filter(Boolean);
          if (orderIds.length > 0) {
            const { data: ordersData } = await supabase
              .from('orders')
              .select('id, seller_status, buyer_status')
              .in('id', orderIds)
              .eq('seller_status', 'dropped_off');

            const validOrderIds = new Set((ordersData || []).map(o => o.id));
            salesToShow = saleBookings.filter(b => validOrderIds.has(b.order_id));
          }
        }

        // For trades: check that BOTH booking rows for the same trade_id have status='confirmed'
        let tradesToShow = [];
        if (tradeBookings.length > 0) {
          const tradeIds = [...new Set(tradeBookings.map(b => b.trade_id))];
          const { data: allTradeBookings } = await supabase
            .from('bookings')
            .select('trade_id, booked_by, status')
            .in('trade_id', tradeIds);

          const bookingsByTrade = (allTradeBookings || []).reduce((acc, b) => {
            if (!acc[b.trade_id]) acc[b.trade_id] = [];
            acc[b.trade_id].push(b);
            return acc;
          }, {});

          // Only include trades where all bookings for that trade are confirmed
          tradesToShow = tradeBookings.filter(b => {
            const tradeBookingsForId = bookingsByTrade[b.trade_id] || [];
            return tradeBookingsForId.length > 0 && tradeBookingsForId.every(tb => tb.status === 'confirmed');
          });
        }

        const allBookings = [...salesToShow, ...tradesToShow];
        if (allBookings.length === 0) {
          setBookings([]);
          return;
        }

        // Fetch all involved users
        const userIds = [...new Set([
          ...allBookings.map(b => b.buyer_id).filter(Boolean),
          ...allBookings.map(b => b.booked_by).filter(Boolean),
          ...allBookings.filter(b => b.trades).flatMap(b => [b.trades.initiator_id, b.trades.receiver_id]).filter(Boolean),
        ])];

        const { data: usersData } = await supabase
          .from('users')
          .select('id, username, email')
          .in('id', userIds);

        const userMap = (usersData || []).reduce((acc, u) => {
          acc[u.id] = u;
          return acc;
        }, {});

        // For trades, fetch both offered and requested listings
        const tradeIds = allBookings.filter(b => b.trade_id).map(b => b.trade_id);
        let tradedListingMap = {};
        if (tradeIds.length > 0) {
          const listingIds = allBookings
            .filter(b => b.trades)
            .flatMap(b => [b.trades.offered_listing_id, b.trades.requested_listing_id])
            .filter(Boolean);

          const { data: listings } = await supabase
            .from('listings')
            .select('id, title, image_path')
            .in('id', listingIds);

          if (listings) {
            tradedListingMap = listings.reduce((acc, l) => {
              acc[l.id] = l;
              return acc;
            }, {});
          }
        }

        // Fetch payments via order_id
        const orderIds = allBookings.map(b => b.order_id).filter(Boolean);
        let paymentMap = {};
        if (orderIds.length > 0) {
          const { data: paymentsData } = await supabase
            .from('payments')
            .select('id, order_id, cash_shortfall, cash_settled')
            .in('order_id', orderIds);

          paymentMap = (paymentsData || []).reduce((acc, p) => {
            acc[p.order_id] = p;
            return acc;
          }, {});
        }

        const processedBookings = allBookings.map(b => {
          const isTrade = b.trade_id && b.trades;
          let offeredListing = null;
          let requestedListing = null;

          if (isTrade) {
            const trade = b.trades;
            offeredListing = tradedListingMap[trade.offered_listing_id];
            requestedListing = tradedListingMap[trade.requested_listing_id];
          }

          return {
            ...b,
            buyer: userMap[b.buyer_id] ?? null,
            bookedByUser: userMap[b.booked_by] ?? null,
            payment: paymentMap[b.order_id] ?? null,
            type: isTrade ? 'Trade' : 'Sale',
            offeredListing,
            requestedListing,
          };
        });
        
        console.log('bookings sample:', processedBookings[0]);
        console.log('trades data:', processedBookings[0]?.trades);
        console.log('offeredListing:', processedBookings[0]?.offeredListing);
        console.log('requestedListing:', processedBookings[0]?.requestedListing);
        
        setBookings(processedBookings);
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
      if (booking.type === 'Trade') {
        const { error: bookingsError } = await supabase
          .from('bookings')
          .update({ status: 'collected' })
          .eq('trade_id', booking.trade_id);

        if (bookingsError) throw bookingsError;

        const { error: tradeError } = await supabase
          .from('trades')
          .update({ status: 'completed' })
          .eq('id', booking.trade_id);

        if (tradeError) throw tradeError;
      } else {
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
      }

      setBookings(prev => prev.filter(b => b.id !== booking.id));
      navigate(`/review/${booking.order_id}`);
    } catch (err) {
      console.error('Release item error:', err);
      alert('Failed to release item. Please try again.');
    } finally {
      setActionLoading(null);
      setSelectedBooking(null);
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
      setSelectedBooking(null);
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
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-semibold text-dark uppercase tracking-wider">Type</th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-semibold text-dark uppercase tracking-wider">Buyer/Party</th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-semibold text-dark uppercase tracking-wider">Date</th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-semibold text-dark uppercase tracking-wider">Time</th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-semibold text-dark uppercase tracking-wider">Payment</th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-semibold text-dark uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-3 sm:px-6 py-6 sm:py-8 text-center text-xs sm:text-sm text-text-muted">
                  No items ready for collection
                </td>
              </tr>
            ) : (
              bookings.map((booking) => {
                const partyDisplay = booking.type === 'Trade'
                  ? (booking.bookedByUser?.username || booking.bookedByUser?.email?.split('@')[0] || 'Unknown')
                  : (booking.buyer?.username || booking.buyer?.email?.split('@')[0] || 'N/A');
                const primaryListing = booking.type === 'Trade'
                  ? booking.offeredListing
                  : booking.listings;
                const imageUrl = getImageUrl(primaryListing);
                
                // For trades, show what this party collects and drops off
                const isInitiator = booking.booked_by === booking.trades?.initiator_id;
                const collecting = isInitiator
                  ? booking.requestedListing?.title
                  : booking.offeredListing?.title;
                const droppingOff = isInitiator
                  ? booking.offeredListing?.title
                  : booking.requestedListing?.title;
                
                const displayTitle = booking.type === 'Trade'
                  ? `Collects: ${collecting || 'N/A'} · Drops off: ${droppingOff || 'N/A'}`
                  : booking.listings?.title || 'N/A';
                
                const payment = booking.payment;
                const isPaymentClear = !payment || (payment.cash_shortfall <= 0 || payment.cash_settled);
                const hasCashOutstanding = payment && payment.cash_shortfall > 0 && !payment.cash_settled;
                const canRelease = booking.type === 'Trade' || isPaymentClear || !hasCashOutstanding;

                return (
                  <tr key={booking.id} className="border-b border-light hover:bg-light/50 transition-colors">
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      {imageUrl ? (
                        <img src={imageUrl} className="w-10 h-10 rounded-lg object-contain bg-light flex-shrink-0" alt="listing" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-light flex-shrink-0" />
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 font-medium text-dark text-xs sm:text-sm">{displayTitle}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <span className={`inline-flex rounded-full px-2 sm:px-3 py-1 text-xs font-semibold ${badgeClasses(booking.type)}`}>
                        {booking.type}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-text-muted text-xs sm:text-sm">
                      {partyDisplay}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-text-muted text-xs sm:text-sm">{formatDate(booking.date)}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-text-muted text-xs sm:text-sm">{formatTime(booking.time_slot)}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      {booking.type === 'Trade' ? (
                        <span className="text-xs text-gray-500">N/A</span>
                      ) : (
                        <span className={`inline-flex rounded-full px-2 sm:px-3 py-1 text-xs font-semibold ${badgeClasses(isPaymentClear ? 'Payment clear' : 'Cash outstanding')}`}>
                          {isPaymentClear ? 'Clear' : 'Outstanding'}
                        </span>
                      )}
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
                        {booking.type === 'Sale' && hasCashOutstanding && (
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
      
      {/* Mobile List View */}
      <div className="sm:hidden divide-y divide-light">
        {bookings.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-text-muted">
            No items ready for collection
          </div>
        ) : (
          bookings.map((booking) => {
            const partyDisplay = booking.type === 'Trade'
              ? (booking.bookedByUser?.username || booking.bookedByUser?.email?.split('@')[0] || 'Unknown')
              : (booking.buyer?.username || booking.buyer?.email?.split('@')[0] || 'N/A');
            const primaryListing = booking.type === 'Trade'
              ? booking.offeredListing
              : booking.listings;
            const imageUrl = getImageUrl(primaryListing);
            
            // For trades, show what this party collects and drops off
            const isInitiator = booking.booked_by === booking.trades?.initiator_id;
            const collecting = isInitiator
              ? booking.requestedListing?.title
              : booking.offeredListing?.title;
            const droppingOff = isInitiator
              ? booking.offeredListing?.title
              : booking.requestedListing?.title;
            
            const displayTitle = booking.type === 'Trade'
              ? `Collects: ${collecting || 'N/A'} · Drops off: ${droppingOff || 'N/A'}`
              : booking.listings?.title || 'N/A';
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
                  <p className="font-medium text-dark text-sm">{displayTitle}</p>
                  <p className="text-xs text-text-muted mt-1">
                    {partyDisplay}
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
      {selectedBooking && (() => {
        const payment = selectedBooking.payment;
        const isPaymentClear = !payment || (payment.cash_shortfall <= 0 || payment.cash_settled);
        const hasCashOutstanding = payment && payment.cash_shortfall > 0 && !payment.cash_settled;
        const canRelease = isPaymentClear || !hasCashOutstanding;
        return (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setSelectedBooking(null)}
            />
            <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white p-6 space-y-4 shadow-xl">
              {(() => {
                const primaryListing = selectedBooking.type === 'Trade'
                  ? selectedBooking.offeredListing
                  : selectedBooking.listings;
                const imageUrl = getImageUrl(primaryListing);
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
                <span className="font-medium text-dark">
                  {selectedBooking.type === 'Trade' 
                    ? (() => {
                        const isInitiator = selectedBooking.booked_by === selectedBooking.trades?.initiator_id;
                        const collecting = isInitiator
                          ? selectedBooking.requestedListing?.title
                          : selectedBooking.offeredListing?.title;
                        const droppingOff = isInitiator
                          ? selectedBooking.offeredListing?.title
                          : selectedBooking.requestedListing?.title;
                        return `Collects: ${collecting || 'N/A'} · Drops off: ${droppingOff || 'N/A'}`;
                      })()
                    : selectedBooking.listings?.title || 'N/A'
                  }
                </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Buyer</span>
                  <span className="font-medium text-dark">
                    {selectedBooking.buyer?.username || selectedBooking.buyer?.email?.split('@')[0] || 'N/A'}
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
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Payment</span>
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${badgeClasses(isPaymentClear ? 'Payment clear' : 'Cash outstanding')}`}>
                    {isPaymentClear ? 'Clear' : 'Outstanding'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleReleaseItem(selectedBooking)}
                disabled={actionLoading === selectedBooking.id || !canRelease}
                className="w-full bg-primary text-white py-3 rounded-2xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {actionLoading === selectedBooking.id ? 'Processing...' : 'Release'}
              </button>
              {hasCashOutstanding && (
                <button
                  onClick={() => handleMarkCashSettled(selectedBooking)}
                  disabled={actionLoading === `cash-${selectedBooking.id}`}
                  className="w-full bg-dark text-white py-3 rounded-2xl text-sm font-semibold hover:bg-dark/90 transition-colors disabled:opacity-50"
                >
                  {actionLoading === `cash-${selectedBooking.id}` ? 'Processing...' : 'Mark Settled'}
                </button>
              )}
              <button
                onClick={() => setSelectedBooking(null)}
                className="w-full py-3 rounded-2xl text-sm font-semibold text-text-muted hover:bg-light transition-colors"
              >
                Close
              </button>
            </div>
          </>
        );
      })()}
    </div>
  );
}