import { Anime, ContentCategory } from '../types';

export const CATEGORIES: { id: ContentCategory; label: string; blurb: string }[] = [
  { id: 'Movies', label: 'Movies', blurb: 'Feature-length stories' },
  { id: 'Series', label: 'Series', blurb: 'Episodic releases' },
  { id: 'Anime Series', label: 'Anime Series', blurb: 'Latest anime episodes' },
  { id: 'Anime Movies', label: 'Anime Movies', blurb: 'Anime feature films' },
  { id: 'K-Drama', label: 'K-Drama', blurb: 'Korean drama series' },
  { id: 'K-Drama Movies', label: 'K-Drama Movies', blurb: 'Korean drama films' },
];

/** Returns an explicit category when present, otherwise derives a safe display category. */
export const categoryOf = (anime: Pick<Anime, 'category' | 'type' | 'genres'>): ContentCategory => {
  if (anime.category) return anime.category;
  const isKDrama = anime.genres?.some((genre) => /k-?drama|korean/i.test(genre));
  if (isKDrama) return anime.type === 'Movie' ? 'K-Drama Movies' : 'K-Drama';
  return anime.type === 'Movie' ? 'Anime Movies' : 'Anime Series';
};
