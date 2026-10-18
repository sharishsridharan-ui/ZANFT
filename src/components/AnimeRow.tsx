import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { Anime } from '../types';
import { countText } from '../data/labels';

import { categoryOf } from '../utils/content';
interface AnimeRowProps {
  id?: string;
  title: string;
  subtitle?: string;
  items: Anime[];
  isTopTen?: boolean;
  onSelectAnime: (anime: Anime) => void;
  onPlayAnime: (anime: Anime) => void;
  onSelectStudio?: (studioName: string) => void;
}

export const AnimeRow: React.FC<AnimeRowProps> = ({
  id,
  title,
  subtitle,
  items,
  isTopTen = false,
  onSelectAnime,
  onPlayAnime
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

  if (!items || items.length === 0) return null;

  return (
    <div id={id} className="space-y-3 py-2 relative group/row">
      {/* Row Header */}
      <div className="px-4 sm:px-8 flex items-baseline justify-between">
        <div className="flex items-baseline space-x-3">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-wide flex items-center space-x-2">
            <span>{title}</span>
          </h2>
          {subtitle && (
            <span className="text-xs text-zinc-400 hidden sm:inline font-normal">
              — {subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Relative Carousel Container */}
      <div className="relative">
        {/* Navigation Left Arrow */}
        <button
          onClick={() => handleScroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 h-full w-10 sm:w-12 bg-black/60 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 cursor-pointer backdrop-blur-xs disabled:hidden"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>

        {/* Horizontal Scroll Area */}
        <div
          ref={rowRef}
          className="flex space-x-3 sm:space-x-4 overflow-x-auto px-4 sm:px-8 no-scrollbar scroll-smooth py-2"
        >
          {items.map((anime, index) => {
            return (
              <div
                key={anime.id}
                onClick={() => onSelectAnime(anime)}
                className={`flex-shrink-0 cursor-pointer transition-all duration-300 hover:scale-[1.03] group/card relative ${
                  isTopTen
                    ? 'w-48 sm:w-56 md:w-64 flex items-end'
                    : 'w-36 xs:w-40 sm:w-48 md:w-52 lg:w-56'
                }`}
              >
                {/* Top 10 Number Design */}
                {isTopTen && (
                  <div className="relative flex items-end justify-center w-16 sm:w-20 -mr-2 sm:-mr-4 select-none z-10 pointer-events-none">
                    <span className="font-syne font-black text-6xl sm:text-7xl md:text-8xl text-transparent stroke-text leading-none">
                      {index + 1}
                    </span>
                  </div>
                )}

                {/* Anime Card Poster (Always Option B 2:3 Portrait Poster across all screen sizes) */}
                <div
                  className={`relative rounded-xl overflow-hidden bg-[#121422] border border-white/5 group-hover/card:border-white/20 shadow-lg ${
                    isTopTen ? 'flex-1 aspect-[2/3]' : 'w-full aspect-[2/3]'
                  }`}
                >
                  {[anime.poster, anime.banner].find((u) => u && u.trim().length > 0) ? (
                    <img
                      src={[anime.poster, anime.banner].find((u) => u && u.trim().length > 0)}
                      alt={anime.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover/card:brightness-105 transition-all duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-500 font-bold text-xs p-2 text-center">
                      {anime.title}
                    </div>
                  )}

                  {/* Studio Watermark & Episode Count */}
                  <div className="absolute top-2 left-2 bg-[#08080C]/80 backdrop-blur-xs text-[9px] font-bold text-white px-2 py-0.5 rounded-md border border-white/10">
                    {anime.studioName}
                  </div>

                  <div className="absolute top-2 right-2 bg-[#E50914] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-md">
                    {anime.episodesCount} EPS
                  </div>

                  {/* Hover Overlay with Quick Action Icons */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#08080C] via-[#08080C]/60 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3 space-y-2">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-1">
                        {anime.title}
                      </h3>
                      <div className="flex items-center space-x-1.5 text-[10px] text-zinc-300 pt-0.5 font-medium">
                        <span>{anime.year}</span>
                        <span>·</span>
                        <span>{categoryOf(anime)}</span>
                        <span>·</span>
                        <span>{anime.type === 'Movie' ? countText(anime, anime.episodesCount) : `${anime.episodesCount} eps`}</span>
                      </div>
                    </div>

                    {/* Quick Play Button */}
                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayAnime(anime);
                        }}
                        className="w-full flex items-center justify-center space-x-1.5 bg-[#E50914] hover:bg-[#B0000D] text-white py-1.5 rounded-lg text-xs font-bold transition-transform active:scale-95 shadow"
                        title="Stream Now"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Watch</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Subtitle / Title below card for standard items */}
                {!isTopTen && (
                  <div className="pt-2 px-1">
                    <h4 className="text-xs sm:text-sm font-semibold text-zinc-200 truncate group-hover/card:text-[#E50914] transition-colors">
                      {anime.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {anime.studioName} · {categoryOf(anime)}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Navigation Right Arrow */}
        <button
          onClick={() => handleScroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 h-full w-10 sm:w-12 bg-black/60 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 cursor-pointer backdrop-blur-xs disabled:hidden"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>
      </div>
    </div>
  );
};
