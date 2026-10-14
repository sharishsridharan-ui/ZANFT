import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Anime } from '../types';
import { PosterCard } from './PosterCard';

interface AnimeRowProps {
  title: string;
  subtitle?: string;
  items: Anime[];
  onSelectAnime: (anime: Anime) => void;
  onPlayAnime: (anime: Anime) => void;
}

export const AnimeRow: React.FC<AnimeRowProps> = ({ title, subtitle, items, onSelectAnime, onPlayAnime }) => {
  const rowRef = useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) return null;

  const scroll = (direction: -1 | 1) => {
    const el = rowRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.75, behavior: 'smooth' });
  };

  const arrow =
    'hidden md:flex absolute top-0 bottom-8 z-20 w-12 items-center justify-center bg-ink/80 text-white opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 transition-opacity';

  return (
    <section className="group/row space-y-3" aria-label={title}>
      <div className="px-4 sm:px-8 max-w-7xl mx-auto">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-white">{title}</h2>
        {subtitle && <p className="text-sm text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="relative">
        <button onClick={() => scroll(-1)} className={`${arrow} left-0`} aria-label={`Scroll ${title} left`}>
          <ChevronLeft className="w-7 h-7" />
        </button>

        <div ref={rowRef} className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar px-4 sm:px-8 xl:pl-[calc((100vw-80rem)/2+2rem)] pb-2">
          {items.map((anime) => (
            <PosterCard
              key={anime.id}
              anime={anime}
              onSelect={onSelectAnime}
              onPlay={onPlayAnime}
              className="flex-shrink-0 w-36 xs:w-40 sm:w-44 lg:w-52"
            />
          ))}
        </div>

        <button onClick={() => scroll(1)} className={`${arrow} right-0`} aria-label={`Scroll ${title} right`}>
          <ChevronRight className="w-7 h-7" />
        </button>
      </div>
    </section>
  );
};
