import React, { useState, useEffect } from 'react';
import { supabase } from './utils/supabase';
import { ArrowLeft, ArrowLeftRight, Clock, ShoppingBag } from 'lucide-react';
import LeaveReviewModal from './components/LeaveReviewModal';
import UserProfileModal from './components/UserProfileModal';

const MyOrders = ({ user, onBack }) => {
  const [activeTab, setActiveTab] = useState('buying');
  const [buyingOrders, setBuyingOrders] = useState([]);
  const [sellingOrders, setSellingOrders] = useState([]);
  const [tradeOrders, setTradeOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewLoadingMap, setReviewLoadingMap] = useState({});
  const [profileModal, setProfileModal] = useState({ open: false, userId: null });
  const [reviewModal, setReviewModal] = useState({
    open: false,
    order: null,
    trade: null,
    transactionType: null,
    onReviewSuccess: null,
  });

  const completedTradeBadge =
    'px-3 py-1 rounded-full text-[0.7rem] font-bold uppercase tracking-wider border whitespace-nowrap bg-green-50 text-green-700 border-green-200';

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // 1. Fetch Buying Orders
      const { data: bData, error: bError } = await supabase
        .from('orders')
        .select(`
          id, amount_due, status, buyer_status, seller_status, placed_at,
          listings!inner ( id, title, image_path, seller_id ),
          bookings ( date, time_slot, status )
        `)
        .eq('buyer_id', user.id)
        .order('placed_at', { ascending: false });

      if (bError) throw bError;

      // 2. Fetch Selling Orders
      const { data: sData, error: sError } = await supabase
        .from('orders')
        .select(`
          id, amount_due, status, buyer_status, seller_status, buyer_id, placed_at,
          listings!inner ( id, title, image_path, seller_id ),
          bookings ( date, time_slot, status )
        `)
        .eq('listings.seller_id', user.id)
        .order('placed_at', { ascending: false });

      if (sError) throw sError;

      // Fetch buyer names for selling orders
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
        buyerName: buyerMap[o.buyer_id] || 'Buyer'
      }));

      // Fetch seller names for buying orders
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
        sellerName: sellerMap[o.listings.seller_id] || 'Seller'
      }));

      setBuyingOrders(formattedBuying);
      setSellingOrders(formattedSelling);

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
        .or(`initiator_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (tError) throw tError;

      const completedTrades = (tData || []).filter(trade => {
        const bookings = trade.bookings || [];
        return bookings.length >= 2 && bookings.every(b => b.status === 'collected');
      });

      const counterpartyIds = [
        ...new Set(
          completedTrades.map(t =>
            t.initiator_id === user.id ? t.receiver_id : t.initiator_id
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
        const isInitiator = trade.initiator_id === user.id;
        const counterpartyId = isInitiator ? trade.receiver_id : trade.initiator_id;
        return {
          ...trade,
          counterpartyId,
          counterpartyName: partnerMap[counterpartyId] || 'Partner',
          myListing: isInitiator ? trade.offered_listing : trade.requested_listing,
          partnerListing: isInitiator ? trade.requested_listing : trade.offered_listing,
          myBooking:
            (trade.bookings || []).find(b => b.booked_by === user.id) ||
            trade.bookings?.[0] ||
            null,
        };
      });

      setTradeOrders(formattedTrades);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status, type = null) => {
    const base = "px-3 py-1 rounded-full text-[0.7rem] font-bold uppercase tracking-wider border whitespace-nowrap ";
    
    // Handle null/undefined per type
    if (!status) {
      if (type === 'buyer') {
        return base + "bg-yellow-50 text-yellow-700 border-yellow-200";
      }
      if (type === 'seller') {
        return base + "bg-yellow-50 text-yellow-700 border-yellow-200";
      }
    }
    
    const s = status.toLowerCase();
    
    // Handle buyer status values
    if (type === 'buyer') {
      if (s === 'awaiting_confirmation') return base + "bg-yellow-50 text-yellow-700 border-yellow-200";
      if (s === 'ready_for_collection') return base + "bg-blue-50 text-blue-700 border-blue-200";
      if (s === 'collected') return base + "bg-green-50 text-green-700 border-green-200";
    }
    
    // Handle seller status values
    if (type === 'seller') {
      if (s === 'awaiting_booking') return base + "bg-yellow-50 text-yellow-700 border-yellow-200";
      if (s === 'ready_for_dropoff') return base + "bg-blue-50 text-blue-700 border-blue-200";
      if (s === 'dropped_off') return base + "bg-green-50 text-green-700 border-green-200";
    }
    
    // Default/payment status
    if (s.includes('pending')) return base + "bg-yellow-50 text-yellow-700 border-yellow-200";
    if (s.includes('paid') || s.includes('succeeded')) return base + "bg-green-50 text-green-700 border-green-200";
    if (s === 'confirmed') return base + "bg-blue-50 text-blue-700 border-blue-200";
    if (s === 'completed') return base + "bg-green-50 text-green-700 border-green-200";
    if (s === 'booked') return base + "bg-blue-50 text-blue-700 border-blue-200";
    if (s.includes('cancelled') || s.includes('failed')) return base + "bg-red-50 text-red-700 border-red-200";
    return base + "bg-gray-50 text-gray-700 border-gray-200";
  };

  const getStatusLabel = (status, type = null) => {
    // Handle null per type
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
  };

  const OrderCard = ({ order, isSelling }) => {
    const [hasReviewed, setHasReviewed] = useState(null);
    const listing = order.listings || {};
    const booking = order.bookings ? (Array.isArray(order.bookings) ? order.bookings.find(b => b.status !== 'cancelled') || order.bookings[0] : order.bookings) : null;
    const imageUrl = listing.image_path ? `https://keposlpyrewldohbmesq.supabase.co/storage/v1/object/public/Listings/${listing.image_path}` : 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80';

    useEffect(() => {
      checkExistingReview();
    }, [order.id]);

    const checkExistingReview = async () => {
      setReviewLoadingMap(prev => ({ ...prev, [order.id]: true }));
      try {
        const isCompleted =
          order.status === 'completed' &&
          order.buyer_status === 'collected';

        if (!isCompleted) {
          setHasReviewed(false);
          return;
        }

        const { data } = await supabase
          .from('reviews')
          .select('id')
          .eq('reviewer_id', user.id)
          .eq('order_id', order.id)
          .maybeSingle();

        setHasReviewed(!!data);
      } catch (error) {
        console.error('Error checking review:', error);
        setHasReviewed(false);
      } finally {
        setReviewLoadingMap(prev => ({ ...prev, [order.id]: false }));
      }
    };

    const canReview =
      !reviewLoadingMap[order.id] &&
      order.status === 'completed' &&
      order.buyer_status === 'collected' &&
      hasReviewed === false;

    return (
      <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-6 hover:shadow-md transition-all duration-300">
        <div className="w-full sm:w-36 h-40 shrink-0 bg-gray-50 rounded-2xl overflow-hidden relative group">
          <img src={imageUrl} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
        
        <div className="flex-1 flex flex-col justify-between py-1">
          <div>
            <div className="flex justify-between items-start gap-4 mb-2">
              <h3 className="font-display font-bold text-xl text-dark leading-tight">{listing.title || 'Unknown Item'}</h3>
              <span className="font-bold text-xl text-primary shrink-0">
                R{parseFloat(order.amount_due || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            {isSelling && (
              <p className="text-sm text-gray-500 mb-4">
                Buyer:{' '}
                <button
                  onClick={() => setProfileModal({ open: true, userId: order.buyer_id })}
                  className="font-semibold text-dark hover:text-blue-600 hover:underline transition-colors"
                >
                  {order.buyerName}
                </button>
              </p>
            )}
            
            {!isSelling && listing.seller_id && (
              <p className="text-sm text-gray-500 mb-4">
                Seller:{' '}
                <button
                  onClick={() => setProfileModal({ open: true, userId: listing.seller_id })}
                  className="font-semibold text-dark hover:text-blue-600 hover:underline transition-colors"
                >
                  {order.sellerName}
                </button>
              </p>
            )}
            
            <div className="flex flex-wrap gap-2 mt-3">
               <span className={getStatusBadge(order.status)}>
                 status: {order.status}
               </span>
               <span className={getStatusBadge(isSelling ? order.seller_status : order.buyer_status, isSelling ? 'seller' : 'buyer')}>
                 {isSelling ? 'Drop-off' : 'Collection'}: {getStatusLabel(isSelling ? order.seller_status : order.buyer_status, isSelling ? 'seller' : 'buyer')}
               </span>
            </div>

            {hasReviewed === false && canReview && (
              <button
                onClick={() =>
                  setReviewModal({
                    open: true,
                    order,
                    trade: null,
                    transactionType: 'order',
                    onReviewSuccess: () => setHasReviewed(true),
                  })
                }
                className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 font-semibold rounded-lg hover:bg-blue-100 transition-colors text-sm"
              >
                Leave a Review
              </button>
            )}
          </div>
          
          {booking && booking.status !== 'cancelled' && (
            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-3 text-sm text-gray-700 bg-gray-50/50 p-3 rounded-xl">
               <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
                 <Clock size={16} className="text-primary" />
               </div>
               <span>Booked for <strong className="text-dark">{new Date(booking.date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}</strong> at <strong className="text-dark">{booking.time_slot}</strong></span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const TradeCard = ({ trade }) => {
    const [hasReviewed, setHasReviewed] = useState(null);
    const myListing = trade.myListing || {};
    const partnerListing = trade.partnerListing || {};
    const booking = trade.myBooking;
    const imageUrl = myListing.image_path
      ? `https://keposlpyrewldohbmesq.supabase.co/storage/v1/object/public/Listings/${myListing.image_path}`
      : 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80';
    const tradeTitle = [myListing.title, partnerListing.title]
      .filter(Boolean)
      .join(' ↔ ') || 'Trade exchange';

    useEffect(() => {
      const checkExistingReview = async () => {
        setReviewLoadingMap(prev => ({ ...prev, [trade.id]: true }));
        try {
          const { data } = await supabase
            .from('reviews')
            .select('id')
            .eq('reviewer_id', user.id)
            .eq('trade_id', trade.id)
            .maybeSingle();
          setHasReviewed(!!data);
        } catch (error) {
          console.error('Error checking trade review:', error);
          setHasReviewed(false);
        } finally {
          setReviewLoadingMap(prev => ({ ...prev, [trade.id]: false }));
        }
      };
      checkExistingReview();
    }, [trade.id]);

    const canReview = !reviewLoadingMap[trade.id] && hasReviewed === false;

    return (
      <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-6 hover:shadow-md transition-all duration-300">
        <div className="w-full sm:w-36 h-40 shrink-0 bg-gray-50 rounded-2xl overflow-hidden relative group">
          <img src={imageUrl} alt={tradeTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>

        <div className="flex-1 flex flex-col justify-between py-1">
          <div>
            <div className="flex justify-between items-start gap-4 mb-2">
              <h3 className="font-display font-bold text-xl text-dark leading-tight">{tradeTitle}</h3>
            </div>

            <p className="text-sm text-gray-500 mb-2">
              Your item: <span className="font-semibold text-dark">{myListing.title || '—'}</span>
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Partner item: <span className="font-semibold text-dark">{partnerListing.title || '—'}</span>
            </p>

            <p className="text-sm text-gray-500 mb-4">
              Trade partner:{' '}
              <button
                onClick={() => setProfileModal({ open: true, userId: trade.counterpartyId })}
                className="font-semibold text-dark hover:text-blue-600 hover:underline transition-colors"
              >
                {trade.counterpartyName}
              </button>
            </p>

            <div className="flex flex-wrap gap-2 mt-3">
              <span className={completedTradeBadge}>Completed Trade</span>
            </div>

            {hasReviewed === false && canReview && (
              <button
                onClick={() =>
                  setReviewModal({
                    open: true,
                    order: null,
                    trade,
                    transactionType: 'trade',
                    onReviewSuccess: () => setHasReviewed(true),
                  })
                }
                className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 font-semibold rounded-lg hover:bg-blue-100 transition-colors text-sm"
              >
                Leave a Review
              </button>
            )}
          </div>

          {booking && (
            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-3 text-sm text-gray-700 bg-gray-50/50 p-3 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
                <Clock size={16} className="text-primary" />
              </div>
              <span>
                Booked for{' '}
                <strong className="text-dark">
                  {new Date(booking.date).toLocaleDateString('en-ZA', {
                    weekday: 'short', day: 'numeric', month: 'short',
                  })}
                </strong>{' '}
                at <strong className="text-dark">{booking.time_slot}</strong>
              </span>
            </div>
          )}
        </div>
      </div>
    );
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
      {/* Header */}
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
        {/* Custom Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-2xl mb-8">
          <button
            onClick={() => setActiveTab('buying')}
            role="tab"
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider rounded-xl transition-all duration-300 ${
              activeTab === 'buying' 
                ? 'bg-white text-dark shadow-sm border-primary' 
                : 'text-gray-500 hover:text-dark'
            }`}
          >
            Buying
          </button>
          <button
            onClick={() => setActiveTab('selling')}
            role="tab"
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider rounded-xl transition-all duration-300 ${
              activeTab === 'selling' 
                ? 'bg-white text-dark shadow-sm border-primary' 
                : 'text-gray-500 hover:text-dark'
            }`}
          >
            Selling
          </button>
          <button
            onClick={() => setActiveTab('trades')}
            role="tab"
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider rounded-xl transition-all duration-300 ${
              activeTab === 'trades'
                ? 'bg-white text-dark shadow-sm border-primary'
                : 'text-gray-500 hover:text-dark'
            }`}
          >
            Trades
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-[24px] p-5 border border-gray-100 h-48 animate-pulse flex gap-6">
                <div className="w-36 h-full bg-gray-100 rounded-2xl"></div>
                <div className="flex-1 py-2 flex flex-col justify-between">
                  <div>
                    <div className="h-6 bg-gray-100 w-1/2 rounded mb-4"></div>
                    <div className="flex gap-2">
                      <div className="h-6 bg-gray-100 w-24 rounded-full"></div>
                      <div className="h-6 bg-gray-100 w-32 rounded-full"></div>
                    </div>
                  </div>
                  <div className="h-12 bg-gray-100 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {activeTab === 'buying' && (
              buyingOrders.length > 0 
                ? buyingOrders.map(order => <OrderCard key={order.id} order={order} isSelling={false} />)
                : <EmptyState type="buying" />
            )}
            {activeTab === 'selling' && (
              sellingOrders.length > 0 
                ? sellingOrders.map(order => <OrderCard key={order.id} order={order} isSelling={true} />)
                : <EmptyState type="selling" />
            )}
            {activeTab === 'trades' && (
              tradeOrders.length > 0
                ? tradeOrders.map(trade => <TradeCard key={trade.id} trade={trade} />)
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
        revieweeId={
          reviewModal.transactionType === 'trade'
            ? reviewModal.trade?.counterpartyId
            : activeTab === 'buying'
              ? reviewModal.order?.listings?.seller_id
              : reviewModal.order?.buyer_id
        }
        revieweeName={
          reviewModal.transactionType === 'trade'
            ? reviewModal.trade?.counterpartyName || 'Partner'
            : activeTab === 'buying'
              ? reviewModal.order?.sellerName || 'Seller'
              : reviewModal.order?.buyerName
        }
        reviewerId={user.id}
        submitReview={async (reviewData) => {
          const { error } = await supabase.from('reviews').insert([reviewData]);
          if (error) throw error;
          reviewModal.onReviewSuccess?.();
          setReviewModal({
            open: false,
            order: null,
            trade: null,
            transactionType: null,
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
