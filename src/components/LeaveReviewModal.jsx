import { useState } from 'react';

const LeaveReviewModal = ({
  isOpen,
  onClose,
  transactionType,
  transactionId,
  listingId,
  revieweeId,
  revieweeName,
  submitReview,
  reviewerId,
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleStarClick = (star) => {
    setRating(star);
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess(false);

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setLoading(true);

    try {
      const reviewData = {
        reviewer_id: reviewerId,
        reviewee_id: revieweeId,
        listing_id: listingId,
        rating,
        comment: comment.trim() || null,
        ...(transactionType === 'order' && { order_id: transactionId }),
        ...(transactionType === 'trade' && { trade_id: transactionId }),
      };

      await submitReview(reviewData);
      setSuccess(true);
      setRating(0);
      setComment('');

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err) {
      // Check for unique constraint error (already reviewed)
      if (err.code === '23505' || err.message?.includes('unique')) {
        setError("You've already reviewed this transaction.");
      } else {
        setError(err.message || 'Failed to submit review. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setRating(0);
      setComment('');
      setError('');
      setSuccess(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Leave a Review for {revieweeName}
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
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
        <div className="p-6 space-y-6">
          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-green-800 font-medium">
                ✓ Review submitted successfully!
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          )}

          {/* Star Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Rating <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleStarClick(star)}
                  disabled={loading}
                  className="focus:outline-none transition-transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`Rate ${star} stars`}
                >
                  <span className="text-4xl">
                    {star <= rating ? '★' : '☆'}
                  </span>
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                {rating} out of 5 stars
              </p>
            )}
          </div>

          {/* Comment Textarea */}
          <div>
            <label
              htmlFor="comment"
              className="block text-sm font-medium text-gray-900 mb-2"
            >
              Comment (optional)
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={loading}
              placeholder="Share your experience... (max 500 characters)"
              maxLength={500}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
              {comment.length}/500 characters
            </p>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-900 font-medium rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || success}
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading && (
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              {loading ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveReviewModal;
