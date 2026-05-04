import React, { useState, useEffect } from 'react';
import { Loader, ChevronRight } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { badgeClasses, formatDate, formatTime } from './facilUtils';
import { getImageUrl } from './imageUtils';

export default function QueueView() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    const fetchQueue = async () => {
      setLoading(true);
      try {
        // Step 1 — fetch bookings + listings
        const { data: bookingsData, error } = await supabase
          .from('bookings')
          .select(`
            id,
            listing_id,
            buyer_id,
            seller_id,
            date,
            time_slot,
            location,
            status,
            listings (id, title, image_path)
          `)
          .in('status', ['pending', 'confirmed'])
          .order('date', { ascending: true })
          .order('time_slot', { ascending: true });

        if (error) throw error;
        if (!bookingsData || bookingsData.length === 0) {
          setBookings([]);
          return;
        }

        // Step 2 — fetch all involved users in one query
        const userIds = [...new Set([
          ...bookingsData.map(b => b.buyer_id),
          ...bookingsData.map(b => b.seller_id),
        ].filter(Boolean))];

        const { data: usersData } = await supabase
          .from('users')
          .select('id, username, email')
          .in('id', userIds);

        const userMap = (usersData || []).reduce((acc, u) => {
          acc[u.id] = u;
          return acc;
        }, {});

        // Step 3 — merge
        setBookings(bookingsData.map(b => ({
          ...b,
          buyer: userMap[b.buyer_id] ?? null,
          seller: userMap[b.seller_id] ?? null,
        })));
      } catch (err) {
        console.error('Queue fetch error:', err);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchQueue();
  }, []);

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
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-semibold text-dark uppercase tracking-wider">Buyer</th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-semibold text-dark uppercase tracking-wider">Seller</th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-semibold text-dark uppercase tracking-wider">Date</th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-semibold text-dark uppercase tracking-wider">Time</th>
              <th className="hidden sm:table-cell px-6 py-4 text-left font-semibold text-dark uppercase tracking-wider">Location</th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-semibold text-dark uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-3 sm:px-6 py-6 sm:py-8 text-center text-xs sm:text-sm text-text-muted">
                  No pending or confirmed bookings
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
                    {booking.buyer?.username || booking.buyer?.email?.split('@')[0] || 'N/A'}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-text-muted text-xs sm:text-sm">
                    {booking.seller?.username || booking.seller?.email?.split('@')[0] || 'N/A'}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-text-muted text-xs sm:text-sm">{formatDate(booking.date)}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-text-muted text-xs sm:text-sm">{formatTime(booking.time_slot)}</td>
                  <td className="hidden sm:table-cell px-6 py-4 text-text-muted">{booking.location || 'N/A'}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <span className={`inline-flex rounded-full px-2 sm:px-3 py-1 text-xs font-semibold ${badgeClasses(booking.status)}`}>
                      {booking.status}
                    </span>
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
            No pending or confirmed bookings
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
                    {booking.buyer?.username || booking.buyer?.email?.split('@')[0] || 'N/A'}
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
                <span className="text-text-muted">Buyer</span>
                <span className="font-medium text-dark">
                  {selectedBooking.buyer?.username || selectedBooking.buyer?.email?.split('@')[0] || 'N/A'}
                </span>
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
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Location</span>
                <span className="font-medium text-dark">{selectedBooking.location || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Status</span>
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${badgeClasses(selectedBooking.status)}`}>
                  {selectedBooking.status}
                </span>
              </div>
            </div>
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