import React from 'react';
import { Play, Info } from 'lucide-react';
import { Anime } from '../types';
import { pickImage } from '../utils/mappers';

interface HeroBannerProps {
  anime?: Anime | null;
  onPlay: (anime: Anime) => void;
  onMoreInfo: (anime: Anime) => void;
  onSelectStudio: (studioName: string) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ anime, onPlay, onMoreInfo, onSelectStudio }) => {
  if (!anime) {
    return (
      <section className="min-h-[360px] flex items-center pt-36 pb-10 bg-gradient-to-b from-surface to-ink">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-8">
          <h1 className="font-display text-4xl sm:text-6xl font-extrabold text-white max-w-3xl leading-[0.98]">
            Fandub anime, straight from the studios that make it.
          </h1>
          <p className="mt-5 text-base text-zinc-300 max-w-xl">
            Series and movies published by independent dubbing studios. New releases appear here the moment a studio uploads them.
          </p>
        </div>
      </section>
    );
  }

  const wide = pickImage(anime.banner, anime.poster);
  const tall = pickImage(anime.poster, anime.banner);
  const epLabel = `${anime.episodesCount} ${anime.episodesCount === 1 ? 'episode' : 'episodes'}`;

  return (
    <section className="relative w-full h-[78vh] min-h-[560px] max-h-[820px] overflow-hidden">
      <div className="absolute inset-0">
        {tall && <img src={tall} alt="" className="sm:hidden w-full h-full object-cover" />}
        {wide && <img src={wide} alt="" className="hidden sm:block w-full h-full object-cover object-[80%_25%]" />}
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/75 to-transparent lg:w-3/4" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto h-full px-4 sm:px-8 flex flex-col justify-end pb-20 sm:pb-24 pt-40">
        <div className="max-w-2xl space-y-4">
          <button
            onClick={() => onSelectStudio(anime.studioName)}
            className="text-sm font-semibold text-zinc-200 hover:text-white underline underline-offset-4 decoration-brand decoration-2"
          >
            {anime.studioName}
          </button>

          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[0.95] break-words drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
            {anime.title}
          </h1>
          {anime.japaneseTitle && <p className="text-sm text-zinc-300">{anime.japaneseTitle}</p>}

          <p className="font-mono text-sm text-amber">
            {anime.year} / {anime.type} / {epLabel}
          </p>

          <p className="text-sm sm:text-base text-zinc-200 line-clamp-3 max-w-xl leading-relaxed">{anime.synopsis}</p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onPlay(anime)}
              className="px-6 py-3 rounded-xl bg-brand hover:bg-brand-deep text-white font-bold text-sm flex items-center gap-2 transition-colors"
            >
              <Play className="w-4 h-4 fill-white" />
              {anime.type === 'Movie' ? 'Watch movie' : 'Watch episode 1'}
            </button>
            <button
              onClick={() => onMoreInfo(anime)}
              className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm flex items-center gap-2 backdrop-blur-md transition-colors"
            >
              <Info className="w-4 h-4" />
              Details
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
