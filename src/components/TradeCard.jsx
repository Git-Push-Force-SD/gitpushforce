import React from 'react';
import { Clock } from 'lucide-react';

const TradeCard = ({
  trade,
  reviewsLoaded,
  hasReviewed,
  completedTradeBadge,
  onOpenProfile,
  onLeaveReview,
}) => {
  const myListing = trade.myListing || {};
  const partnerListing = trade.partnerListing || {};
  const booking = trade.myBooking;
  const imageUrl = myListing.image_path
    ? `https://keposlpyrewldohbmesq.supabase.co/storage/v1/object/public/Listings/${myListing.image_path}`
    : 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80';
  const tradeTitle = [myListing.title, partnerListing.title]
    .filter(Boolean)
    .join(' ↔ ') || 'Trade exchange';

  const canReview = reviewsLoaded && !hasReviewed;

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
              onClick={() => onOpenProfile(trade.counterpartyId)}
              className="font-semibold text-dark hover:text-blue-600 hover:underline transition-colors"
            >
              {trade.counterpartyName}
            </button>
          </p>

          <div className="flex flex-wrap gap-2 mt-3">
            <span className={completedTradeBadge}>Completed Trade</span>
          </div>

          {canReview && (
            <button
              onClick={() => onLeaveReview(trade)}
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

export default TradeCard;
