import { Anime, Episode, Studio } from '../types';
import type { CloudAnime, CloudEpisode, CloudStudio } from '../services/firestoreService';

type SortKey = 'popular' | 'rating' | 'newest' | 'episodes';
export type { SortKey };

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'popular', label: 'Most popular' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'newest', label: 'Newest' },
  { value: 'episodes', label: 'Most episodes' },
];

/** First non-empty image URL from a list (poster/banner fallbacks). */
export const pickImage = (...urls: (string | undefined)[]): string =>
  urls.find((u) => u && u.trim().length > 0) || '';

export function cloudEpisodeToEpisode(ep: CloudEpisode, anime: CloudAnime): Episode {
  return {
    id: ep.id,
    animeId: anime.id,
    number: ep.number,
    title: ep.title,
    duration: ep.duration || '24m',
    thumbnail: ep.thumbnail || anime.poster,
    synopsis: ep.synopsis,
    videoUrl: ep.videoUrl,
  };
}

export function cloudAnimeToAnime(ca: CloudAnime): Anime {
  const episodes = (ca.episodes || []).map((ep) => cloudEpisodeToEpisode(ep, ca));
  return {
    id: ca.id,
    title: ca.title,
    japaneseTitle: ca.japaneseTitle,
    type: ca.type,
    genres: ca.genres || [],
    synopsis: ca.synopsis,
    poster: ca.poster,
    banner: ca.banner || ca.poster,
    studioId: ca.studioId,
    studioName: ca.studioName,
    episodes,
    rating: ca.rating || 'TV-14',
    matchPercentage: ca.matchPercentage || 95,
    year: ca.year || new Date().getFullYear(),
    seasons: 1,
    episodesCount: episodes.length,
  };
}

export function cloudStudioToStudio(cs: CloudStudio): Studio {
  return {
    id: cs.id,
    name: cs.name,
    slug: cs.slug || cs.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    logo: cs.logo || '',
    banner: cs.banner || '',
    bio: cs.bio || '',
    established: 2025,
    country: 'International',
    verified: cs.verified !== false,
    followersCount: '0',
    theme: cs.theme,
  };
}

export function sortAnime(list: Anime[], key: SortKey): Anime[] {
  if (key === 'rating') return [...list].sort((a, b) => b.matchPercentage - a.matchPercentage);
  if (key === 'newest') return [...list].sort((a, b) => b.year - a.year);
  if (key === 'episodes') return [...list].sort((a, b) => b.episodesCount - a.episodesCount);
  return list;
}
