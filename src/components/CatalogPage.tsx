import React, { useMemo, useState } from 'react';
import { Film } from 'lucide-react';
import { Anime } from '../types';
import { PosterCard } from './PosterCard';
import { SORT_OPTIONS, SortKey, sortAnime } from '../utils/mappers';

interface CatalogPageProps {
  title: string;
  noun: string;
  items: Anime[];
  onSelectAnime: (anime: Anime) => void;
  onPlayAnime: (anime: Anime) => void;
}

/** One catalogue page for both Series and Movies. */
export const CatalogPage: React.FC<CatalogPageProps> = ({ title, noun, items, onSelectAnime, onPlayAnime }) => {
  const [sortBy, setSortBy] = useState<SortKey>('popular');
  const sorted = useMemo(() => sortAnime(items, sortBy), [items, sortBy]);

  return (
    <div className="pt-32 sm:pt-28 pb-20 px-4 sm:px-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white">{title}</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {sorted.length} {noun}{sorted.length === 1 ? '' : 's'}
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-400">
          Sort by
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="bg-surface border border-line rounded-lg px-3 py-2 text-white font-medium"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      {sorted.length === 0 ? (
        <div className="py-16 text-center max-w-md mx-auto space-y-3">
          <Film className="w-10 h-10 text-zinc-600 mx-auto" />
          <h2 className="font-display text-lg font-bold text-white">No {noun}s yet</h2>
          <p className="text-sm text-zinc-400">
            Studios publish from their dashboard. New releases show up here as soon as they go live.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-7 sm:gap-x-6">
          {sorted.map((anime) => (
            <PosterCard key={anime.id} anime={anime} onSelect={onSelectAnime} onPlay={onPlayAnime} />
          ))}
        </div>
      )}
    </div>
  );
};
