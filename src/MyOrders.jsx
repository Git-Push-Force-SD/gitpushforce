import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './utils/supabase';
import { ArrowLeft, ArrowLeftRight, ShoppingBag } from 'lucide-react';
import LeaveReviewModal from './components/LeaveReviewModal';
import UserProfileModal from './components/UserProfileModal';
import OrderCard from './components/OrderCard';
import TradeCard from './components/TradeCard';

const completedTradeBadge =
  'px-3 py-1 rounded-full text-[0.7rem] font-bold uppercase tracking-wider border whitespace-nowrap bg-green-50 text-green-700 border-green-200';

const MyOrders = ({ user, onBack }) => {
  const [activeTab, setActiveTab] = useState('buying');
  const [buyingOrders, setBuyingOrders] = useState([]);
  const [sellingOrders, setSellingOrders] = useState([]);
  const [tradeOrders, setTradeOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [reviewedOrderIds, setReviewedOrderIds] = useState(() => new Set());
  const [reviewedTradeIds, setReviewedTradeIds] = useState(() => new Set());
  const [profileModal, setProfileModal] = useState({ open: false, userId: null });
  const [reviewModal, setReviewModal] = useState({
    open: false,
    order: null,
    trade: null,
    transactionType: null,
    revieweeId: null,
    revieweeName: null,
    onReviewSuccess: null,
  });

  const isInitialLoad = useRef(true);

  const getStatusBadge = useCallback((status, type = null) => {
    const base = 'px-3 py-1 rounded-full text-[0.7rem] font-bold uppercase tracking-wider border whitespace-nowrap ';

    if (!status) {
      if (type === 'buyer' || type === 'seller') {
        return base + 'bg-yellow-50 text-yellow-700 border-yellow-200';
      }
    }

    const s = status.toLowerCase();

    if (type === 'buyer') {
      if (s === 'awaiting_confirmation') return base + 'bg-yellow-50 text-yellow-700 border-yellow-200';
      if (s === 'ready_for_collection') return base + 'bg-blue-50 text-blue-700 border-blue-200';
      if (s === 'collected') return base + 'bg-green-50 text-green-700 border-green-200';
    }

    if (type === 'seller') {
      if (s === 'awaiting_booking') return base + 'bg-yellow-50 text-yellow-700 border-yellow-200';
      if (s === 'ready_for_dropoff') return base + 'bg-blue-50 text-blue-700 border-blue-200';
      if (s === 'dropped_off') return base + 'bg-green-50 text-green-700 border-green-200';
    }

    if (s.includes('pending')) return base + 'bg-yellow-50 text-yellow-700 border-yellow-200';
    if (s.includes('paid') || s.includes('succeeded')) return base + 'bg-green-50 text-green-700 border-green-200';
    if (s === 'confirmed') return base + 'bg-blue-50 text-blue-700 border-blue-200';
    if (s === 'completed') return base + 'bg-green-50 text-green-700 border-green-200';
    if (s === 'booked') return base + 'bg-blue-50 text-blue-700 border-blue-200';
    if (s.includes('cancelled') || s.includes('failed')) return base + 'bg-red-50 text-red-700 border-red-200';
    return base + 'bg-gray-50 text-gray-700 border-gray-200';
  }, []);

  const getStatusLabel = useCallback((status, type = null) => {
    if (!status) {
      if (type === 'buyer') return 'Awaiting Confirmation';
      if (type === 'seller') return 'Awaiting Booking';
      return 'Unknown';
    }

    const s = status.toLowerCase();

    if (type === 'buyer') {
      if (s === 'awaiting_confirmation') return 'Awaiting Confirmation';
      if (s === 'ready_for_collection') return 'Ready for Collection';
      if (s === 'collected') return 'Collected';
    }

    if (type === 'seller') {
      if (s === 'awaiting_booking') return 'Awaiting Booking';
      if (s === 'ready_for_dropoff') return 'Ready for Drop-Off';
      if (s === 'dropped_off') return 'Dropped Off';
    }

    return status;
  }, []);

  const isOrderReviewable = (order) =>
    order.status === 'completed' && order.buyer_status === 'collected';

  const fetchReviewStatus = async (buying, selling, trades, userId) => {
    setReviewsLoaded(false);

    const ordersById = new Map();
    [...buying, ...selling].forEach(o => ordersById.set(o.id, o));
    const reviewableOrderIds = [...ordersById.values()]
      .filter(isOrderReviewable)
      .map(o => o.id);
    const tradeIds = trades.map(t => t.id);

    const reviewedOrders = new Set();
    const reviewedTrades = new Set();

    if (reviewableOrderIds.length > 0) {
      const { data } = await supabase
        .from('reviews')
        .select('order_id')
        .in('order_id', reviewableOrderIds)
        .eq('reviewer_id', userId);
      (data || []).forEach(r => {
        if (r.order_id) reviewedOrders.add(r.order_id);
      });
    }

    if (tradeIds.length > 0) {
      const { data } = await supabase
        .from('reviews')
        .select('trade_id')
        .in('trade_id', tradeIds)
        .eq('reviewer_id', userId);
      (data || []).forEach(r => {
        if (r.trade_id) reviewedTrades.add(r.trade_id);
      });
    }

    setReviewedOrderIds(reviewedOrders);
    setReviewedTradeIds(reviewedTrades);
    setReviewsLoaded(true);
  };

  const fetchOrders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    const userId = session.user.id;

    if (isInitialLoad.current) {
      setLoading(true);
    }

    try {
      const { data: bData, error: bError } = await supabase
        .from('orders')
        .select(`
          id, amount_due, status, buyer_status, seller_status, placed_at,
          listings!inner ( id, title, image_path, seller_id ),
          bookings ( date, time_slot, status )
        `)
        .eq('buyer_id', userId)
        .order('placed_at', { ascending: false });

      if (bError) throw bError;

      const { data: sData, error: sError } = await supabase
        .from('orders')
        .select(`
          id, amount_due, status, buyer_status, seller_status, buyer_id, placed_at,
          listings!inner ( id, title, image_path, seller_id ),
          bookings ( date, time_slot, status )
        `)
        .eq('listings.seller_id', userId)
        .order('placed_at', { ascending: false });

      if (sError) throw sError;

      const buyerIds = [...new Set((sData || []).map(o => o.buyer_id))];
      let buyerMap = {};
      if (buyerIds.length > 0) {
        const { data: buyers } = await supabase
          .from('users')
          .select('id, username, email')
          .in('id', buyerIds);
        if (buyers) {
          buyerMap = buyers.reduce((acc, b) => {
            acc[b.id] = b.username || b.email?.split('@')[0] || 'Buyer';
            return acc;
          }, {});
        }
      }

      const formattedSelling = (sData || []).map(o => ({
        ...o,
        buyerName: buyerMap[o.buyer_id] || 'Buyer',
      }));

      const sellerIds = [...new Set((bData || []).map(o => o.listings.seller_id))];
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

      const formattedBuying = (bData || []).map(o => ({
        ...o,
        sellerName: sellerMap[o.listings.seller_id] || 'Seller',
      }));

      const { data: tData, error: tError } = await supabase
        .from('trades')
        .select(`
          id,
          initiator_id,
          receiver_id,
          created_at,
          offered_listing_id,
          requested_listing_id,
          offered_listing:listings!trades_offered_listing_id_fkey(id, title, image_path),
          requested_listing:listings!trades_requested_listing_id_fkey(id, title, image_path),
          bookings ( id, date, time_slot, status, booked_by )
        `)
        .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (tError) throw tError;

      const completedTrades = (tData || []).filter(trade => {
        const bookings = trade.bookings || [];
        return bookings.length >= 2 && bookings.every(b => b.status === 'collected');
      });

      const counterpartyIds = [
        ...new Set(
          completedTrades.map(t =>
            t.initiator_id === userId ? t.receiver_id : t.initiator_id
          )
        ),
      ];
      let partnerMap = {};
      if (counterpartyIds.length > 0) {
        const { data: partners } = await supabase
          .from('users')
          .select('id, username, email')
          .in('id', counterpartyIds);
        if (partners) {
          partnerMap = partners.reduce((acc, p) => {
            acc[p.id] = p.username || p.email?.split('@')[0] || 'Partner';
            return acc;
          }, {});
        }
      }

      const formattedTrades = completedTrades.map(trade => {
        const isInitiator = trade.initiator_id === userId;
        const counterpartyId = isInitiator ? trade.receiver_id : trade.initiator_id;
        return {
          ...trade,
          counterpartyId,
          counterpartyName: partnerMap[counterpartyId] || 'Partner',
          myListing: isInitiator ? trade.offered_listing : trade.requested_listing,
          partnerListing: isInitiator ? trade.requested_listing : trade.offered_listing,
          myBooking:
            (trade.bookings || []).find(b => b.booked_by === userId) ||
            trade.bookings?.[0] ||
            null,
        };
      });

      setBuyingOrders(formattedBuying);
      setSellingOrders(formattedSelling);
      setTradeOrders(formattedTrades);

      await fetchReviewStatus(formattedBuying, formattedSelling, formattedTrades, userId);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setReviewsLoaded(true);
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchOrders();
  }, [user?.id]);

  const handleOrderReviewSuccess = (orderId) => {
    setReviewedOrderIds(prev => new Set([...prev, orderId]));
  };

  const handleTradeReviewSuccess = (tradeId) => {
    setReviewedTradeIds(prev => new Set([...prev, tradeId]));
  };

  const EmptyState = ({ type }) => (
    <div className="flex flex-col items-center justify-center py-24 px-5 text-center bg-white rounded-[32px] border border-gray-200 border-dashed mt-8">
      <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
        {type === 'trades' ? (
          <ArrowLeftRight size={40} className="text-gray-300" />
        ) : (
          <ShoppingBag size={40} className="text-gray-300" />
        )}
      </div>
      <h3 className="text-2xl font-display font-bold text-dark mb-3">
        {type === 'buying' && 'No purchases yet'}
        {type === 'selling' && 'No sales yet'}
        {type === 'trades' && 'No completed trades yet'}
      </h3>
      <p className="text-gray-500 max-w-md text-base leading-relaxed">
        {type === 'buying' &&
          "When you buy an item on the marketplace, you'll be able to track its collection status here."}
        {type === 'selling' &&
          "When someone buys your listed items, you'll see the drop-off details and schedule here."}
        {type === 'trades' &&
          'Completed trade exchanges appear here once both you and your trade partner have collected your items at the Trade Facility.'}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-offwhite font-main text-dark pb-20">
      <div className="sticky top-0 z-20 bg-offwhite/80 backdrop-blur-md px-6 py-4 flex items-center gap-4 border-b border-gray-200">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-display font-bold tracking-tight">My Orders</h1>
      </div>

      <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-8">
        <div className="flex bg-gray-100 p-1 rounded-2xl mb-8">
          {[
            { id: 'buying', label: 'Buying' },
            { id: 'selling', label: 'Selling' },
            { id: 'trades', label: 'Trades' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              role="tab"
              className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider rounded-xl transition-all duration-300 ${
                activeTab === id
                  ? 'bg-white text-dark shadow-sm border-primary'
                  : 'text-gray-500 hover:text-dark'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-[24px] p-5 border border-gray-100 h-48 animate-pulse flex gap-6">
                <div className="w-36 h-full bg-gray-100 rounded-2xl" />
                <div className="flex-1 py-2 flex flex-col justify-between">
                  <div>
                    <div className="h-6 bg-gray-100 w-1/2 rounded mb-4" />
                    <div className="flex gap-2">
                      <div className="h-6 bg-gray-100 w-24 rounded-full" />
                      <div className="h-6 bg-gray-100 w-32 rounded-full" />
                    </div>
                  </div>
                  <div className="h-12 bg-gray-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {activeTab === 'buying' && (
              buyingOrders.length > 0
                ? buyingOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      isSelling={false}
                      reviewsLoaded={reviewsLoaded}
                      hasReviewed={reviewedOrderIds.has(order.id)}
                      getStatusBadge={getStatusBadge}
                      getStatusLabel={getStatusLabel}
                      onOpenProfile={userId => setProfileModal({ open: true, userId })}
                      onLeaveReview={order =>
                        setReviewModal({
                          open: true,
                          order,
                          trade: null,
                          transactionType: 'order',
                          revieweeId: order.listings?.seller_id,
                          revieweeName: order.sellerName || 'Seller',
                          onReviewSuccess: () => handleOrderReviewSuccess(order.id),
                        })
                      }
                    />
                  ))
                : <EmptyState type="buying" />
            )}
            {activeTab === 'selling' && (
              sellingOrders.length > 0
                ? sellingOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      isSelling
                      reviewsLoaded={reviewsLoaded}
                      hasReviewed={reviewedOrderIds.has(order.id)}
                      getStatusBadge={getStatusBadge}
                      getStatusLabel={getStatusLabel}
                      onOpenProfile={userId => setProfileModal({ open: true, userId })}
                      onLeaveReview={order =>
                        setReviewModal({
                          open: true,
                          order,
                          trade: null,
                          transactionType: 'order',
                          revieweeId: order.buyer_id,
                          revieweeName: order.buyerName || 'Buyer',
                          onReviewSuccess: () => handleOrderReviewSuccess(order.id),
                        })
                      }
                    />
                  ))
                : <EmptyState type="selling" />
            )}
            {activeTab === 'trades' && (
              tradeOrders.length > 0
                ? tradeOrders.map(trade => (
                    <TradeCard
                      key={trade.id}
                      trade={trade}
                      reviewsLoaded={reviewsLoaded}
                      hasReviewed={reviewedTradeIds.has(trade.id)}
                      completedTradeBadge={completedTradeBadge}
                      onOpenProfile={userId => setProfileModal({ open: true, userId })}
                      onLeaveReview={trade =>
                        setReviewModal({
                          open: true,
                          order: null,
                          trade,
                          transactionType: 'trade',
                          revieweeId: trade.counterpartyId,
                          revieweeName: trade.counterpartyName || 'Partner',
                          onReviewSuccess: () => handleTradeReviewSuccess(trade.id),
                        })
                      }
                    />
                  ))
                : <EmptyState type="trades" />
            )}
          </div>
        )}
      </div>

      <LeaveReviewModal
        isOpen={reviewModal.open}
        onClose={() =>
          setReviewModal({
            open: false,
            order: null,
            trade: null,
            transactionType: null,
            revieweeId: null,
            revieweeName: null,
            onReviewSuccess: null,
          })
        }
        transactionType={reviewModal.transactionType}
        transactionId={
          reviewModal.transactionType === 'trade'
            ? reviewModal.trade?.id
            : reviewModal.order?.id
        }
        listingId={
          reviewModal.transactionType === 'trade'
            ? reviewModal.trade?.myListing?.id
            : reviewModal.order?.listings?.id
        }
        revieweeId={reviewModal.revieweeId}
        revieweeName={reviewModal.revieweeName || 'User'}
        reviewerId={user.id}
        submitReview={async reviewData => {
          const { error } = await supabase.from('reviews').insert([reviewData]);
          if (error) throw error;
          reviewModal.onReviewSuccess?.();
          setReviewModal({
            open: false,
            order: null,
            trade: null,
            transactionType: null,
            revieweeId: null,
            revieweeName: null,
            onReviewSuccess: null,
          });
        }}
      />

      <UserProfileModal
        isOpen={profileModal.open}
        userId={profileModal.userId}
        onClose={() => setProfileModal({ open: false, userId: null })}
      />
    </div>
  );
};

export default MyOrders;
