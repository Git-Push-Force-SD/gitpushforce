import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import StarRating from './StarRating';
import Transactions from './../Transactions';
import { getInitials } from '../utils/avatarUtils';

const UserProfileModal = ({ isOpen, onClose, userId }) => {
  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserProfile();
    }
  }, [isOpen, userId]);

  const fetchUserProfile = async () => {
    setLoading(true);
    setError('');
    setUser(null);
    setReviews([]);

    try {
      // 1. Fetch user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, username, profile_picture_url')
        .eq('id', userId)
        .maybeSingle();

      if (userError) throw userError;
      if (!userData) {
        setError('User not found');
        return;
      }

      setUser(userData);

      // 2. Fetch reviews for this user
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          id, rating, comment, created_at,
          listing:listing_id (id, title),
          reviewer:reviewer_id (id, username, profile_picture_url)
        `)
        .eq('reviewee_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;

      setReviews(reviewsData || []);

      if (reviewsData && reviewsData.length > 0) {
        const avg =
          reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length;
        setAvgRating(avg.toFixed(1));
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getRelativeDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 shrink-0">
          <h2 className="text-xl font-bold text-gray-900">Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {loading && (
            <div className="space-y-4">
              {/* Avatar skeleton */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-gray-100 w-2/3 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-100 w-1/2 rounded animate-pulse"></div>
                </div>
              </div>
              {/* Reviews skeleton */}
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2 p-3 bg-gray-50 rounded-lg">
                    <div className="h-4 bg-gray-100 w-1/3 rounded animate-pulse"></div>
                    <div className="h-3 bg-gray-100 w-full rounded animate-pulse"></div>
                    <div className="h-3 bg-gray-100 w-2/3 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm font-medium">{error}</p>
            </div>
          )}

          {!loading && !error && user && (
            <>
              {/* User Info Section */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                  {user.profile_picture_url ? (
                    <img
                      src={user.profile_picture_url}
                      alt={user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-bold text-lg">
                      {getInitials(user.username)}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">
                    {user.username}
                  </h3>
                  {/* Rating Summary */}
                  <div className="mt-2 flex items-center gap-2">
                    {avgRating ? (
                      <>
                        <div className="flex items-center gap-1">
                          <StarRating rating={parseFloat(avgRating)} interactive={false} />
                          <span className="text-sm font-semibold text-gray-900">
                            {avgRating}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600">
                          ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                        </span>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">No reviews yet</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Transactions Section */}
              <div className = "space-y-3 pt-2">
              <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wider">
                Completed Transactions
                </h4>
              
              <Transactions
              user = {user}
              compact = {true}
               />
               </div>


              {/* Reviews Section */}
              {reviews.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wider">
                    Reviews
                  </h4>
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                      >
                        {/* Reviewer Info */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                            {review.reviewer?.profile_picture_url ? (
                              <img
                                src={review.reviewer.profile_picture_url}
                                alt={review.reviewer.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-white font-bold text-xs">
                                {getInitials(review.reviewer?.username)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">
                              {review.reviewer?.username || 'Anonymous'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {getRelativeDate(review.created_at)}
                            </p>
                          </div>
                        </div>

                        {/* Rating */}
                        <div className="mb-2">
                          <StarRating
                            rating={review.rating}
                            interactive={false}
                          />
                        </div>

                        {/* Listing Context */}
                        {review.listing && (
                          <p className="text-xs text-gray-600 mb-2">
                            for{' '}
                            <span className="font-medium italic">
                              "{review.listing.title}"
                            </span>
                          </p>
                        )}

                        {/* Comment */}
                        {review.comment && (
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {review.comment}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
