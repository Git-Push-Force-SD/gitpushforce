const StarRating = ({ rating, interactive = false, onChange }) => {
  if (!interactive) {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-2xl ${
              star <= rating ? 'text-amber-400' : 'text-gray-300'
            }`}
            aria-label={`${star} stars`}
          >
            {star <= rating ? '★' : '☆'}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-1 cursor-pointer">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange && onChange(star)}
          className="transition-transform hover:scale-110 focus:outline-none"
          aria-label={`Rate ${star} stars`}
        >
          <span
            className={`text-2xl ${
              star <= rating ? 'text-amber-400' : 'text-gray-300'
            }`}
          >
            {star <= rating ? '★' : '☆'}
          </span>
        </button>
      ))}
    </div>
  );
};

export default StarRating;
