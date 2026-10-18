import React from 'react';
import { Play } from 'lucide-react';
import { Anime } from '../types';
import { pickImage } from '../utils/mappers';

import { categoryOf } from '../utils/content';
interface PosterCardProps {
  anime: Anime;
  onSelect: (anime: Anime) => void;
  onPlay?: (anime: Anime) => void;
  /** Fixed width for carousels; omit to fill the parent (grids). */
  className?: string;
}

/** The one poster card used by every carousel and grid. */
export const PosterCard: React.FC<PosterCardProps> = ({ anime, onSelect, onPlay, className = '' }) => {
  const image = pickImage(anime.poster, anime.banner);

  return (
    <div className={`group relative text-left ${className}`}>
      <button
        type="button"
        onClick={() => onSelect(anime)}
        className="block w-full text-left rounded-xl"
        aria-label={`${anime.title}, ${categoryOf(anime)}`}
      >
        <div className="poster-frame aspect-[2/3] rounded-xl overflow-hidden bg-surface border border-line">
          {image ? (
            <img
              src={image}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-3 text-center text-sm font-semibold text-zinc-500">
              {anime.title}
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
          <span className="absolute left-2 bottom-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[11px] text-amber">
            {anime.type === 'Movie' ? 'Film' : `${anime.episodesCount} ep`}
          </span>
        </div>

        <div className="pt-2.5 px-0.5">
          <h3 className="text-sm font-semibold text-zinc-100 truncate group-hover:text-brand transition-colors">
            {anime.title}
          </h3>
          <p className="text-xs text-zinc-400 truncate">
            {anime.studioName}, {anime.year}
          </p>
        </div>
      </button>

      {onPlay && (
        <button
          type="button"
          onClick={() => onPlay(anime)}
          className="absolute right-2 top-2 z-10 w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          aria-label={`Play ${anime.title}`}
        >
          <Play className="w-4 h-4 fill-white ml-0.5" />
        </button>
      )}
    </div>
  );
};
