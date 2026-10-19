import React from 'react';
import { Building2, ChevronRight } from 'lucide-react';
import { Anime } from '../types';
import { countText } from '../data/labels';

import { categoryOf } from '../utils/content';
interface HeroBannerProps {
  anime?: Anime | null;
  onPlay?: (anime: Anime) => void;
  onMoreInfo?: (anime: Anime) => void;
  onSelectStudio: (studioName: string) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  anime,
  onPlay,
  onMoreInfo,
  onSelectStudio
}) => {
  if (!anime) {
    return (
      <div className="relative w-full min-h-[460px] sm:min-h-[520px] select-none overflow-hidden bg-gradient-to-b from-[#111322] via-[#08080C] to-[#08080C] flex items-center justify-center pt-24 pb-12">
        <div className="max-w-2xl mx-auto px-4 text-center space-y-4 z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#E50914]/10 border border-[#E50914]/30 text-[#E50914] text-xs font-semibold">
            <span>Fan Dub Streaming Website</span>
          </div>
          <h1 className="font-syne text-3xl sm:text-5xl font-black text-white tracking-tight">
            Welcome to <span className="text-[#E50914]">ZANFT</span>
          </h1>
          <p className="text-sm text-zinc-300 max-w-md mx-auto leading-relaxed">
            Watch fandub movies, series, anime and K-Drama published directly by the studios that dub them.
          </p>
        </div>
      </div>
    );
  }

  // Option A (Landscape Banner for PC / Laptop screens)
  // Option B (2:3 Portrait Poster for Mobile screens)
  const desktopBannerSrc = [anime.banner, anime.poster].find((u) => u && u.trim().length > 0) || null;
  const mobilePosterSrc = [anime.poster, anime.banner].find((u) => u && u.trim().length > 0) || null;

  return (
    <div className="relative w-full min-h-[580px] sm:min-h-[640px] lg:min-h-[720px] h-[80vh] sm:h-[86vh] select-none overflow-hidden">
      {/* Background Image / Banner: Responsive Behavior */}
      <div className="absolute inset-0">
        {/* On Mobile Screens: Display Option B (2:3 Portrait Poster) */}
        {mobilePosterSrc && (
          <img
            src={mobilePosterSrc}
            alt={anime.title}
            className="block sm:hidden w-full h-full object-cover object-center filter brightness-[0.9]"
          />
        )}
        {/* On PC/Desktop Screens: Display Option A (Landscape Banner) */}
        {desktopBannerSrc && (
          <img
            src={desktopBannerSrc}
            alt={anime.title}
            className="hidden sm:block w-full h-full object-cover sm:object-[80%_25%] lg:object-[85%_25%] transform scale-[1.02] hover:scale-105 transition-all duration-1000 ease-out filter brightness-[0.95]"
          />
        )}
        {/* Layered Vignette Gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#08080C] via-[#08080C]/80 to-transparent w-full lg:w-3/4 z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080C] via-[#08080C]/35 to-transparent z-10" />
        <div className="absolute inset-0 bg-radial-at-c from-transparent via-[#08080C]/40 to-[#08080C] z-10 opacity-70" />
      </div>

      {/* Stylized English Brand Watermark in Background */}
      <div className="absolute right-4 sm:right-12 top-24 select-none pointer-events-none opacity-[0.04] z-10 hidden lg:block">
        <span className="font-syne text-[140px] font-black text-white tracking-widest leading-none uppercase">
          ZANFT
        </span>
      </div>

      {/* Hero Content Information Container with Perfect Alignment */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-end pt-28 sm:pt-32 pb-14 sm:pb-20">
        <div className="max-w-2xl space-y-3.5 sm:space-y-4">
          {/* Studio Tag & Type */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <button
              onClick={() => onSelectStudio(anime.studioName)}
              className="inline-flex items-center space-x-1.5 bg-[#E50914] hover:bg-[#B0000D] text-white font-bold px-3 py-1.5 rounded-lg shadow-[0_0_15px_rgba(229,9,20,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{anime.studioName}</span>
              <ChevronRight className="w-3 h-3 opacity-70" />
            </button>
            <div className="flex items-center space-x-2 text-zinc-300 font-semibold text-xs">
              <span>{categoryOf(anime)}</span>
              <span aria-hidden="true" className="text-zinc-600">·</span>
              <span className="text-zinc-400 font-mono">{countText(anime, anime.episodesCount)}</span>
            </div>
          </div>

          {/* Title Typography */}
          <div className="space-y-1">
            {anime.japaneseTitle && (
              <p className="text-xs sm:text-sm font-bold tracking-[0.2em] sm:tracking-[0.25em] text-[#E50914] uppercase">
                {anime.japaneseTitle}
              </p>
            )}
            <h1 className="font-syne text-2xl xs:text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight sm:leading-none drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] break-words">
              {anime.title}
            </h1>
          </div>

          {/* Unboxed Typographic Metadata (Zero-Pill Discipline) */}
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-zinc-300 font-medium">
            <span>{anime.year}</span>
            <span aria-hidden="true" className="text-zinc-600">·</span>
            <span>{countText(anime, anime.episodesCount)}</span>
          </div>

          {/* Synopsis */}
          <p className="text-xs sm:text-sm lg:text-base text-zinc-300/90 line-clamp-3 font-normal max-w-xl leading-relaxed drop-shadow-md">
            {anime.synopsis}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 pt-2">
            {onPlay && (
              <button
                onClick={() => onPlay(anime)}
                className="px-6 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#B0000D] text-white font-black text-xs sm:text-sm flex items-center space-x-2 shadow-[0_0_25px_rgba(229,9,20,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <span>▶</span>
                <span>Stream Now</span>
              </button>
            )}
            {onMoreInfo && (
              <button
                onClick={() => onMoreInfo(anime)}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm backdrop-blur-md border border-white/20 transition-all cursor-pointer hover:border-white/40"
              >
                View Details
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
