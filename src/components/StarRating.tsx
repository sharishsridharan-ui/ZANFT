import React, { useState, useEffect } from 'react';
import { Star, Check, Sparkles } from 'lucide-react';
import { saveUserRatingForAnime, getCommunityRatingForAnime } from '../data/storage';

interface StarRatingProps {
  animeId: string;
  className?: string;
  onRatingChanged?: (newRating: number) => void;
}

export const StarRating: React.FC<StarRatingProps> = ({
  animeId,
  className = '',
  onRatingChanged
}) => {
  const [ratingData, setRatingData] = useState(() =>
    getCommunityRatingForAnime(animeId)
  );
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [justRated, setJustRated] = useState(false);

  useEffect(() => {
    setRatingData(getCommunityRatingForAnime(animeId));
  }, [animeId]);

  const handleStarClick = (rating: number) => {
    saveUserRatingForAnime(animeId, rating);
    const updated = getCommunityRatingForAnime(animeId);
    setRatingData(updated);
    setJustRated(true);
    if (onRatingChanged) {
      onRatingChanged(rating);
    }
    setTimeout(() => {
      setJustRated(false);
    }, 2500);
  };

  const currentDisplayUserRating = hoverRating !== null ? hoverRating : ratingData.userRating;

  return (
    <div className={`p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3 ${className}`}>
      {/* Top: Community Average & Vote Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
        <div className="flex items-center space-x-2.5">
          {ratingData.totalVotes > 0 ? (
            <>
              <div className="flex items-center space-x-1 text-amber-400">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                <span className="font-display font-black text-white text-lg sm:text-xl">
                  {ratingData.average.toFixed(1)}
                </span>
                <span className="text-zinc-500 text-xs font-semibold">/ 5.0</span>
              </div>
              <span aria-hidden="true" className="text-zinc-700">·</span>
              <span className="text-xs text-zinc-400 font-medium">
                {ratingData.totalVotes} viewer {ratingData.totalVotes === 1 ? 'rating' : 'ratings'}
              </span>
            </>
          ) : (
            <div className="flex items-center space-x-1.5 text-zinc-400 text-xs font-medium">
              <Star className="w-4 h-4 text-zinc-600" />
              <span>No ratings yet · Be the first to review!</span>
            </div>
          )}
        </div>

        {/* User rating indicator */}
        <div className="text-xs">
          {ratingData.userRating ? (
            <span className="text-emerald-400 font-semibold flex items-center space-x-1">
              <Check className="w-3.5 h-3.5" />
              <span>Your rating: {ratingData.userRating} / 5 stars</span>
            </span>
          ) : null}
        </div>
      </div>

      {/* Bottom: Interactive 5-Star Submitter */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
        <div className="flex items-center space-x-1.5">
          <span className="text-xs text-zinc-400 font-semibold mr-1">
            Rate this anime:
          </span>

          <div
            className="flex items-center space-x-1"
            onMouseLeave={() => setHoverRating(null)}
          >
            {[1, 2, 3, 4, 5].map((starValue) => {
              const isFilled =
                currentDisplayUserRating !== null && starValue <= currentDisplayUserRating;
              const isHovered = hoverRating !== null && starValue <= hoverRating;

              return (
                <button
                  key={starValue}
                  type="button"
                  onClick={() => handleStarClick(starValue)}
                  onMouseEnter={() => setHoverRating(starValue)}
                  className="p-1 rounded-md hover:bg-white/5 transition-transform active:scale-110 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-400"
                  title={`Rate ${starValue} of 5 stars`}
                >
                  <Star
                    className={`w-6 h-6 transition-all duration-150 ${
                      isFilled
                        ? 'fill-amber-400 text-amber-400 filter drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]'
                        : isHovered
                        ? 'fill-amber-400/70 text-amber-400'
                        : 'text-zinc-600 hover:text-zinc-400'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Success toast feedback */}
        {justRated && (
          <div className="text-xs text-emerald-400 font-bold flex items-center space-x-1.5 animate-in fade-in zoom-in-95 duration-150">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Rating saved!</span>
          </div>
        )}
      </div>
    </div>
  );
};
