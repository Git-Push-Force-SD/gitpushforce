// src/hooks/useBookings.js
// All Supabase data fetching and mutations for the booking feature.
// Components stay pure UI — all DB logic lives here.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { DEFAULT_TIME_SLOTS, FACILITY_LOCATION } from '../utils/bookingConstants';

// ─────────────────────────────────────────────────────────────────────────────
// useBookings — fetch and manage a student's bookings
// ─────────────────────────────────────────────────────────────────────────────
export function useBookings(userId) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const fetchBookings = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch bookings for this buyer, join listing title and seller username
      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          id,
          order_id,
          trade_id,
          listing_id,
          date,
          time_slot,
          location,
          status,
          notes,
          cancelled_at,
          created_at,
          listings (
            id,
            title,
            image_path,
            price
          )
        `)
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Fetch seller usernames separately (seller_id is on the booking)
      const { data: bookingsWithSellers } = await supabase
        .from('bookings')
        .select('id, seller_id')
        .eq('buyer_id', userId);

      const sellerIds = [...new Set((bookingsWithSellers || []).map(b => b.seller_id))];
      let sellerMap = {};

      if (sellerIds.length > 0) {
        const { data: sellers } = await supabase
          .from('users')
          .select('id, username, email')
          .in('id', sellerIds);

        if (sellers) {
          sellerMap = sellers.reduce((acc, s) => {
            acc[s.id] = s.username || s.email?.split('@')[0] || 'Seller';
            return acc;
          }, {});
        }
      }

      // Merge seller names into bookings
      const merged = (data || []).map(b => {
        const sellerEntry = (bookingsWithSellers || []).find(bs => bs.id === b.id);
        return {
          ...b,
          sellerName: sellerEntry ? (sellerMap[sellerEntry.seller_id] || 'Seller') : 'Seller',
          seller_id: sellerEntry?.seller_id,
        };
      });

      setBookings(merged);
    } catch (err) {
      console.error('[useBookings] fetch error:', err);
      setError('Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return { bookings, loading, error, refetch: fetchBookings };
}

// ─────────────────────────────────────────────────────────────────────────────
// useEligibleOrders — fetch paid orders that don't have a booking yet
// These are the items a student can drop off
// ─────────────────────────────────────────────────────────────────────────────
export function useEligibleOrders(userId) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!userId) return;

    const fetch = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Get paid orders where the listing belongs to this seller
        const { data: paidOrders, error: ordersError } = await supabase
          .from('orders')
          .select(`
            id,
            buyer_id,
            listing_id,
            status,
            amount_due,
            placed_at,
            listings (
              id,
              title,
              image_path,
              seller_id,
              price
            )
          `)
          .eq('status', 'paid')
          .eq('listings.seller_id', userId);

  //       if (ordersError) throw ordersError;
  //       if (!paidOrders || paidOrders.length === 0) {
  //         setOrders([]);
  //         setLoading(false);
  //         return;
  //       }

        // 2. Get order IDs that already have an active booking
        const orderIds = paidOrders.map(o => o.id);
        const { data: existingBookings } = await supabase
          .from('bookings')
          .select('order_id, status')
          .in('order_id', orderIds)
          .neq('status', 'cancelled'); // cancelled bookings allow re-booking

        const bookedOrderIds = new Set((existingBookings || []).map(b => b.order_id));

        // 3. Filter out already-booked orders
        const eligible = paidOrders.filter(o => !bookedOrderIds.has(o.id));

        // 4. Fetch seller names
        const sellerIds = [...new Set(eligible.map(o => o.listings?.seller_id).filter(Boolean))];
        let sellerMap = {};
        if (sellerIds.length > 0) {
          const { data: sellers } = await supabase
            .from('users')
            .select('id, username, email')
            .in('id', sellerIds);
          if (sellers) {
            sellerMap = sellers.reduce((acc, s) => {
              acc[s.id] = s.username || s.email?.split('@')[0] || 'Seller';
              return acc;
            }, {});
          }
        }

        const formatted = eligible.map(o => ({
          orderId:    o.id,
          buyerId:    o.buyer_id,
          listingId:  o.listing_id,
          title:      o.listings?.title || 'Unknown Item',
          sellerId:   o.listings?.seller_id,
          sellerName: sellerMap[o.listings?.seller_id] || 'Seller',
          price:      o.amount_due,
          image:      o.listings?.image_path
            ? `https://keposlpyrewldohbmesq.supabase.co/storage/v1/object/public/Listings/${o.listings.image_path}`
            : null,
        }));

        setOrders(formatted);
      } catch (err) {
        console.error('[useEligibleOrders] error:', err);
        setError('Failed to load eligible orders.');
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [userId]);

  return { orders, loading, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// useAvailableSlots — fetch slots for a given date with booking counts
// ─────────────────────────────────────────────────────────────────────────────
export function useAvailableSlots(date) {
  const [slots, setSlots]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!date) return;

    const fetch = async () => {
      setLoading(true);
      setError(null);

      try {
        // Try to get admin-configured slots for this date
        const { data: facilitySlots } = await supabase
          .from('facility_slots')
          .select('time_slot, capacity')
          .eq('date', date);

        // Fall back to default slots if none configured
        const baseSlots = facilitySlots && facilitySlots.length > 0
          ? facilitySlots
          : DEFAULT_TIME_SLOTS.map(ts => ({ time_slot: ts, capacity: 5 }));

        // Count existing bookings per slot for this date
        const { data: existingBookings } = await supabase
          .from('bookings')
          .select('time_slot')
          .eq('date', date)
          .neq('status', 'cancelled');

        const slotCounts = (existingBookings || []).reduce((acc, b) => {
          acc[b.time_slot] = (acc[b.time_slot] || 0) + 1;
          return acc;
        }, {});

        const merged = baseSlots.map(s => ({
          timeSlot: s.time_slot,
          capacity: s.capacity,
          taken:    slotCounts[s.time_slot] || 0,
          available: (s.capacity - (slotCounts[s.time_slot] || 0)) > 0,
        }));

        setSlots(merged);
      } catch (err) {
        console.error('[useAvailableSlots] error:', err);
        setError('Failed to load time slots.');
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [date]);

  return { slots, loading, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// createBooking — insert a new booking row
// ─────────────────────────────────────────────────────────────────────────────
export async function createBooking({ orderId, buyerId, sellerId, listingId, date, timeSlot, notes }) {
  const { data, error } = await supabase
    .from('bookings')
    .insert([{
      order_id:   orderId,
      buyer_id:   buyerId,
      seller_id:  sellerId,
      listing_id: listingId,
      date,
      time_slot:  timeSlot,
      location:   FACILITY_LOCATION,
      status:     'pending',
      notes:      notes?.trim().slice(0, 500) || null,
    }])
    .select()
    .single();

  if (error) throw error;

  // Mark order as booked and update buyer/seller statuses via RPC
  // Uses SECURITY DEFINER to bypass RLS (seller cannot normally update buyer's orders)
  const { error: rpcError } = await supabase.rpc('update_order_after_booking', { p_order_id: orderId });

  if (rpcError) {
    console.error('Failed to update order status after booking:', rpcError);
    throw rpcError;
  }

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// cancelBooking — set status to cancelled and revert order to paid
// ─────────────────────────────────────────────────────────────────────────────
export async function cancelBooking({ bookingId, orderId, userId }) {
  const { error } = await supabase
    .from('bookings')
    .update({
      status:       'cancelled',
      cancelled_by: userId,
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  if (error) throw error;

  // Revert order status to 'paid' so student can rebook
  await supabase
    .from('orders')
    .update({ status: 'paid' })
    .eq('id', orderId);
}

// ─────────────────────────────────────────────────────────────────────────────
// createTradeBooking — insert a new booking row for trade exchange
// Both parties can book independently. Each booking tracks who booked it.
// ─────────────────────────────────────────────────────────────────────────────
export async function createTradeBooking({ tradeId, bookedBy, date, timeSlot, notes }) {
  // Guard: check if current user already has a booking for this trade
  const { data: existingBooking, error: checkError } = await supabase
    .from('bookings')
    .select('id')
    .eq('trade_id', tradeId)
    .eq('booked_by', bookedBy)
    .neq('status', 'cancelled')
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    // PGRST116 means no rows found, which is expected
    throw checkError;
  }

  if (existingBooking) {
    throw new Error('You have already booked a drop-off for this trade');
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert([{
      trade_id:    tradeId,
      booked_by:   bookedBy,
      booking_type: 'trade',
      date,
      time_slot:   timeSlot,
      location:    FACILITY_LOCATION,
      status:      'pending',
      notes:       notes?.trim().slice(0, 500) || null,
    }])
    .select()
    .single();

  if (error) throw error;

  return data;
}
// ─── useSellerPendingOrders ───────────────────────────────────────────────────
export function useSellerPendingOrders(userId) {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetch = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            id,
            status,
            amount_due,
            placed_at,
            listings (
              id,
              title,
              seller_id
            )
          `)
          .eq('status', 'paid');

        if (error) throw error;

        const sellerOrders = (data || []).filter(
          o => o.listings?.seller_id === userId
        );

        const orderIds = sellerOrders.map(o => o.id);
        let bookedIds = new Set();

        if (orderIds.length > 0) {
          const { data: bookings } = await supabase
            .from('bookings')
            .select('order_id')
            .in('order_id', orderIds)
            .neq('status', 'cancelled');

          bookedIds = new Set((bookings || []).map(b => b.order_id));
        }

        setPendingOrders(sellerOrders.filter(o => !bookedIds.has(o.id)));
      } catch (err) {
        console.error('[useSellerPendingOrders]', err);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [userId]);

  return { pendingOrders, loading };
}

// ─────────────────────────────────────────────────────────────────────────────
// useEligibleTrades — fetch accepted trades where user can book for exchange
// Both initiator and receiver can book independently
// ─────────────────────────────────────────────────────────────────────────────
export function useEligibleTrades(userId) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const fetch = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Get all accepted trades where user is initiator OR receiver
        const { data: acceptedTrades, error: tradesError } = await supabase
          .from('trades')
          .select(`
            id,
            offered_listing_id,
            requested_listing_id,
            initiator_id,
            receiver_id,
            status,
            listings_offered:offered_listing_id (
              id,
              title,
              image_path,
              price
            ),
            listings_requested:requested_listing_id (
              id,
              title,
              image_path,
              price
            )
          `)
          .eq('status', 'accepted')
          .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`);

        if (tradesError) throw tradesError;
        if (!acceptedTrades || acceptedTrades.length === 0) {
          setTrades([]);
          setLoading(false);
          return;
        }

        // 2. For each trade, check if current user already has a booking
        const tradeIds = acceptedTrades.map(t => t.id);
        const { data: userBookings } = await supabase
          .from('bookings')
          .select('trade_id, booked_by')
          .in('trade_id', tradeIds)
          .neq('status', 'cancelled');

        const userBookedTradesSet = new Set(
          (userBookings || [])
            .filter(b => b.booked_by === userId)
            .map(b => b.trade_id)
        );

        // 3. Filter out trades where user already has a booking
        const eligible = acceptedTrades.filter(t => !userBookedTradesSet.has(t.id));

        // 4. Fetch user info for both initiator and receiver
        const userIds = [...new Set([
          ...eligible.map(t => t.initiator_id).filter(Boolean),
          ...eligible.map(t => t.receiver_id).filter(Boolean),
        ])];
        let userMap = {};
        if (userIds.length > 0) {
          const { data: users } = await supabase
            .from('users')
            .select('id, username, email')
            .in('id', userIds);
          if (users) {
            userMap = users.reduce((acc, u) => {
              acc[u.id] = u.username || u.email?.split('@')[0] || 'User';
              return acc;
            }, {});
          }
        }

        const formatted = eligible.map(t => {
          const isInitiator = t.initiator_id === userId;
          const offeredListing = t.listings_offered;
          const requestedListing = t.listings_requested;
          const myListing = isInitiator ? offeredListing : requestedListing;
          const partnerListing = isInitiator ? requestedListing : offeredListing;
          const partnerId = isInitiator ? t.receiver_id : t.initiator_id;

          return {
            tradeId:    t.id,
            myListingId: myListing?.id,
            myListingTitle: myListing?.title || 'Trade Item',
            partnerListingId: partnerListing?.id,
            partnerListingTitle: partnerListing?.title || 'Trade Item',
            role: isInitiator ? 'initiator' : 'receiver',
            partnerId,
            partnerName: userMap[partnerId] || 'Partner',
            myImage: myListing?.image_path
              ? `https://keposlpyrewldohbmesq.supabase.co/storage/v1/object/public/Listings/${myListing.image_path}`
              : null,
            partnerImage: partnerListing?.image_path
              ? `https://keposlpyrewldohbmesq.supabase.co/storage/v1/object/public/Listings/${partnerListing.image_path}`
              : null,
          };
        });

        setTrades(formatted);
      } catch (err) {
        console.error('[useEligibleTrades] error:', err);
        setError('Failed to load eligible trades.');
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [userId]);

  return { trades, loading, error };
}