import React, { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { badgeClasses, formatDate, formatTime } from './facilUtils';

export default function QueueView() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

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
            listings (id, title)
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
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-light bg-light">
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
                <td colSpan="7" className="px-3 sm:px-6 py-6 sm:py-8 text-center text-xs sm:text-sm text-text-muted">
                  No pending or confirmed bookings
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr key={booking.id} className="border-b border-light hover:bg-light/50 transition-colors">
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}