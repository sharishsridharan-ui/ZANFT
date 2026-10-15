import { Episode } from '../types';

type HasType = { type?: string } | null | undefined;

export const isMovie = (anime: HasType): boolean => anime?.type === 'Movie';

// "Movie 2" / "Episode 3" / "Trailer"
export function itemLabel(anime: HasType, ep: Pick<Episode, 'number' | 'isTrailer'>): string {
  if (ep.isTrailer) return 'Trailer';
  return isMovie(anime) ? `Movie ${ep.number}` : `Episode ${ep.number}`;
}

// Short form for tight spaces: "Movie 2" / "Ep 3" / "Trailer"
export function itemShortLabel(anime: HasType, ep: Pick<Episode, 'number' | 'isTrailer'>): string {
  if (ep.isTrailer) return 'Trailer';
  return isMovie(anime) ? `Movie ${ep.number}` : `Ep ${ep.number}`;
}

// "1 Movie" / "3 Movies" / "1 Episode" / "12 Episodes"
export function countText(anime: HasType, count: number): string {
  const word = isMovie(anime) ? 'Movie' : 'Episode';
  return `${count} ${count === 1 ? word : word + 's'}`;
}

// Exact join date + time, e.g. "13 Oct 2026, 7:10 PM". Returns null when unknown.
export function formatJoinDate(createdAt?: string | null): string | null {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
