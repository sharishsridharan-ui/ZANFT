import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Play, Info, X, Clock } from 'lucide-react';
import { Anime, Episode, WatchProgress } from '../types';
import { itemShortLabel } from '../data/labels';

interface ContinueWatchingRowProps {
  progressList: WatchProgress[];
  animeList: Anime[];
  onResume: (anime: Anime, episode: Episode, resumeTime: number) => void;
  onOpenDetails: (anime: Anime) => void;
  onRemoveItem: (animeId: string, episodeId: string) => void;
}

export const ContinueWatchingRow: React.FC<ContinueWatchingRowProps> = ({
  progressList,
  animeList,
  onResume,
  onOpenDetails,
  onRemoveItem
}) => {
  const rowRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.75;
      rowRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const validItems = progressList
    .map((item) => {
      const anime = animeList.find((a) => a.id === item.animeId);
      if (!anime) return null;
      const episode = anime.episodes.find((e) => e.id === item.episodeId) || anime.episodes[0];
      if (!episode) return null;
      return {
        progress: item,
        anime,
        episode
      };
    })
    .filter((entry): entry is { progress: WatchProgress; anime: Anime; episode: Episode } => entry !== null);

  if (validItems.length === 0) return null;

  const formatRemainingTime = (current: number, total: number) => {
    const remainingSeconds = Math.max(0, total - current);
    const mins = Math.ceil(remainingSeconds / 60);
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}h ${remMins}m left`;
    }
    return `${mins}m left`;
  };

  return (
    <div className="space-y-3 py-2 relative group/row">
      {/* Header */}
      <div className="px-4 sm:px-8 flex items-baseline justify-between">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#E50914] animate-ping" />
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-wide">
            Continue Watching
          </h2>
          <span className="text-xs text-zinc-400 font-normal hidden sm:inline">
            — Pick up right where you left off
          </span>
        </div>
      </div>

      <div className="relative">
        <button
          onClick={() => handleScroll('left')}
          className="absolute left-0 top-0 bottom-0 z-30 w-10 sm:w-12 bg-[#08080C]/80 hover:bg-[#08080C]/95 text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 backdrop-blur-sm border-r border-white/5"
          title="Scroll Left"
        >
          <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>

        {/* Horizontal Carousel */}
        <div
          ref={rowRef}
          className="flex space-x-4 overflow-x-auto no-scrollbar px-4 sm:px-8 py-3 scroll-smooth"
        >
          {validItems.map(({ progress, anime, episode }) => {
            const percent = Math.min(100, Math.max(0, progress.progressPercent || 0));
            const remainingText = formatRemainingTime(progress.currentTime, progress.duration);

            return (
              <div
                key={`${progress.animeId}-${progress.episodeId}`}
                className="flex-shrink-0 w-64 sm:w-72 md:w-80 group/card relative rounded-xl overflow-hidden bg-[#10121A] border border-white/10 hover:border-[#E50914]/60 transition-all duration-300 shadow-lg hover:shadow-[0_0_20px_rgba(229,9,20,0.2)]"
              >
                {/* Thumbnail Container */}
                {(() => {
                  const thumb = [episode.thumbnail, anime.banner, anime.poster].find((u) => u && u.trim().length > 0) || null;
                  return (
                    <div
                      onClick={() => onResume(anime, episode, progress.currentTime)}
                      className="aspect-video w-full overflow-hidden relative cursor-pointer bg-black"
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={episode.title}
                          className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600">
                          <Play className="w-8 h-8 opacity-40" />
                        </div>
                      )}

                      {/* Dark Vignette Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#10121A] via-black/20 to-black/30" />

                      {/* Studio Badge */}
                      <div className="absolute top-2.5 left-2.5 bg-[#08080C]/85 backdrop-blur-xs text-[10px] font-bold text-white px-2 py-0.5 rounded-md border border-white/10">
                        {anime.studioName}
                      </div>

                      {/* Dismiss from row button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveItem(progress.animeId, progress.episodeId);
                    }}
                    className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-black/70 hover:bg-[#E50914] text-white flex items-center justify-center transition-colors shadow-md"
                    title="Remove from Continue Watching"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {/* Center Play Button Overlay on Hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity bg-black/40">
                    <div className="w-12 h-12 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-[0_0_20px_rgba(229,9,20,0.6)] transform scale-90 group-hover/card:scale-100 transition-transform">
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    </div>
                  </div>

                  {/* Bottom Progress Bar inside thumbnail */}
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-800">
                    <div
                      className="h-full bg-gradient-to-r from-[#E50914] to-red-400 shadow-[0_0_8px_rgba(229,9,20,0.8)]"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })()}

                {/* Card Meta Content */}
                <div className="p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-xs font-bold text-white truncate hover:text-[#E50914] cursor-pointer"
                        onClick={() => onOpenDetails(anime)}
                      >
                        {anime.title}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                        {itemShortLabel(anime, episode)}: {episode.title}
                      </p>
                    </div>

                    <button
                      onClick={() => onOpenDetails(anime)}
                      className="text-zinc-500 hover:text-white p-1 rounded transition-colors"
                      title="Series Details"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/5">
                    <div className="flex items-center space-x-1 text-zinc-400">
                      <Clock className="w-3 h-3 text-[#E50914]" />
                      <span>{remainingText}</span>
                    </div>

                    <button
                      onClick={() => onResume(anime, episode, progress.currentTime)}
                      className="text-xs font-bold text-[#E50914] hover:text-white flex items-center space-x-1 transition-colors"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Resume</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => handleScroll('right')}
          className="absolute right-0 top-0 bottom-0 z-30 w-10 sm:w-12 bg-[#08080C]/80 hover:bg-[#08080C]/95 text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 backdrop-blur-sm border-l border-white/5"
          title="Scroll Right"
        >
          <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>
      </div>
    </div>
  );
};
