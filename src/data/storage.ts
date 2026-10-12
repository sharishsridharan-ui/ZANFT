import { Anime, Studio, Episode, WatchProgress } from '../types';

const STORAGE_KEYS = {
  STUDIOS: 'zanft_creators_studios_v3',
  ANIME: 'zanft_creators_anime_v3',
  WATCH_PROGRESS: 'zanft_watch_progress_v2',
  AUTOPLAY_NEXT: 'zanft_autoplay_next_v2',
  USER_RATINGS: 'zanft_user_ratings_v2'
};

const SYNC_EVENT_NAME = 'zanft_data_updated';

// -------------------------------------------------------------
// PURGE ALL OLD MOCK DATA & LEGACY CACHES
// -------------------------------------------------------------
function purgeLegacyMockData() {
  if (typeof window === 'undefined') return;
  try {
    // Legacy keys that may hold old mock anime or dummy studios
    const legacyKeys = [
      'zanft_studios_v2',
      'zanft_anime_v2',
      'zanft_studios_v1',
      'zanft_anime_v1',
      'zanft_mock_data_cleaned'
    ];
    legacyKeys.forEach((k) => localStorage.removeItem(k));

    // Also check current keys for any residual mock data (e.g. names from old seeders)
    const mockNames = ['studio kurogane', 'aetherion works', 'solaria pictures', 'chrono blade', 'cyber samurai', 'eclipse requiem'];
    const mockIds = ['studio-1', 'studio-2', 'studio-3', 'studio-4', 'studio-5', 'anime-1', 'anime-2', 'anime-3', 'anime-4', 'anime-5'];
    
    const rawStudios = localStorage.getItem(STORAGE_KEYS.STUDIOS);
    if (rawStudios) {
      try {
        const parsed = JSON.parse(rawStudios);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(
            (s) => s && s.name && !mockNames.includes(s.name.toLowerCase()) && !mockIds.includes(s.id)
          );
          if (cleaned.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEYS.STUDIOS, JSON.stringify(cleaned));
          }
        }
      } catch {}
    }

    const rawAnime = localStorage.getItem(STORAGE_KEYS.ANIME);
    if (rawAnime) {
      try {
        const parsed = JSON.parse(rawAnime);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(
            (a) => a && a.title && !mockNames.includes(a.title.toLowerCase()) && !mockIds.includes(a.id)
          );
          if (cleaned.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEYS.ANIME, JSON.stringify(cleaned));
          }
        }
      } catch {}
    }

    const rawLocalReg = localStorage.getItem('zanft_local_registered_studios');
    if (rawLocalReg) {
      try {
        const parsed = JSON.parse(rawLocalReg);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(
            (s) => s && s.name && !mockNames.includes(s.name.toLowerCase()) && !mockIds.includes(s.id)
          );
          if (cleaned.length !== parsed.length) {
            localStorage.setItem('zanft_local_registered_studios', JSON.stringify(cleaned));
          }
        }
      } catch {}
    }
  } catch (err) {
    console.warn('Error purging legacy mock data:', err);
  }
}

// Execute purge immediately
purgeLegacyMockData();

export function getStoredStudios(): Studio[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STUDIOS);
    if (!data) {
      return [];
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed reading studios from localStorage', err);
    return [];
  }
}

export function saveStoredStudios(studios: Studio[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STUDIOS, JSON.stringify(studios));
    notifyDataChanged();
  } catch (err) {
    console.error('Failed saving studios to localStorage', err);
  }
}

export function getStoredAnime(): Anime[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ANIME);
    if (!data) {
      return [];
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed reading anime from localStorage', err);
    return [];
  }
}

export function saveStoredAnime(animeList: Anime[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ANIME, JSON.stringify(animeList));
    notifyDataChanged();
  } catch (err) {
    console.error('Failed saving anime to localStorage', err);
  }
}

export function addAnime(newAnime: Anime): Anime[] {
  const current = getStoredAnime();
  const filtered = current.filter((a) => a.id !== newAnime.id);
  const updated = [newAnime, ...filtered];
  saveStoredAnime(updated);
  return updated;
}

export function updateAnime(animeId: string, updates: Partial<Anime>): Anime[] {
  const current = getStoredAnime();
  const updated = current.map(item => item.id === animeId ? { ...item, ...updates } : item);
  saveStoredAnime(updated);
  return updated;
}

export function deleteAnime(animeId: string): Anime[] {
  const current = getStoredAnime();
  const updated = current.filter(item => item.id !== animeId);
  saveStoredAnime(updated);
  removeWatchProgressForAnime(animeId);
  return updated;
}

export function addEpisodeToAnime(animeId: string, episode: Episode): Anime | null {
  const current = getStoredAnime();
  let updatedAnime: Anime | null = null;
  const updated = current.map(item => {
    if (item.id === animeId) {
      const episodes = [...(item.episodes || []), episode];
      updatedAnime = {
        ...item,
        episodes,
        episodesCount: episodes.length
      };
      return updatedAnime;
    }
    return item;
  });
  saveStoredAnime(updated);
  return updatedAnime;
}

export function deleteEpisode(animeId: string, episodeId: string): Anime | null {
  const current = getStoredAnime();
  let updatedAnime: Anime | null = null;
  const updated = current.map(item => {
    if (item.id === animeId) {
      const episodes = (item.episodes || []).filter(e => e.id !== episodeId);
      updatedAnime = {
        ...item,
        episodes,
        episodesCount: episodes.length
      };
      return updatedAnime;
    }
    return item;
  });
  saveStoredAnime(updated);
  removeWatchProgress(animeId, episodeId);
  return updatedAnime;
}

export function addStudio(newStudio: Studio): Studio[] {
  const current = getStoredStudios();
  const filtered = current.filter((s) => s.id !== newStudio.id && s.name.toLowerCase() !== newStudio.name.toLowerCase());
  const updated = [newStudio, ...filtered];
  saveStoredStudios(updated);
  return updated;
}

// -------------------------------------------------------------
// WATCH PROGRESS STORAGE (Real user watch history only)
// -------------------------------------------------------------

export function getWatchProgressList(): WatchProgress[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.WATCH_PROGRESS);
    if (!data) {
      return [];
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed reading watch progress', err);
    return [];
  }
}

export function getWatchProgressForEpisode(animeId: string, episodeId: string): WatchProgress | null {
  const list = getWatchProgressList();
  return list.find(i => i.animeId === animeId && i.episodeId === episodeId) || null;
}

export function saveWatchProgress(progress: WatchProgress) {
  try {
    const list = getWatchProgressList();
    const filtered = list.filter(i => !(i.animeId === progress.animeId && i.episodeId === progress.episodeId));
    if (progress.progressPercent >= 95) {
      localStorage.setItem(STORAGE_KEYS.WATCH_PROGRESS, JSON.stringify(filtered));
    } else {
      const updated = [progress, ...filtered].slice(0, 15);
      localStorage.setItem(STORAGE_KEYS.WATCH_PROGRESS, JSON.stringify(updated));
    }
    notifyDataChanged();
  } catch (err) {
    console.error('Failed saving watch progress', err);
  }
}

export function removeWatchProgress(animeId: string, episodeId: string) {
  try {
    const list = getWatchProgressList();
    const updated = list.filter(i => !(i.animeId === animeId && i.episodeId === episodeId));
    localStorage.setItem(STORAGE_KEYS.WATCH_PROGRESS, JSON.stringify(updated));
    notifyDataChanged();
  } catch (err) {
    console.error('Failed removing watch progress', err);
  }
}

export function removeWatchProgressForAnime(animeId: string) {
  try {
    const list = getWatchProgressList();
    const updated = list.filter(i => i.animeId !== animeId);
    localStorage.setItem(STORAGE_KEYS.WATCH_PROGRESS, JSON.stringify(updated));
    notifyDataChanged();
  } catch (err) {
    console.error('Failed removing anime watch progress', err);
  }
}

// -------------------------------------------------------------
// AUTOPLAY NEXT EPISODE PREFERENCE
// -------------------------------------------------------------

export function getAutoPlayNextSetting(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.AUTOPLAY_NEXT);
    if (stored === null) return true;
    return stored === 'true';
  } catch {
    return true;
  }
}

export function setAutoPlayNextSetting(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_KEYS.AUTOPLAY_NEXT, String(enabled));
    notifyDataChanged();
  } catch (err) {
    console.error('Failed saving autoplay next setting', err);
  }
}

// -------------------------------------------------------------
// USER 5-STAR RATINGS & COMMUNITY RATINGS
// -------------------------------------------------------------

export interface StoredRatingData {
  [animeId: string]: number;
}

export function getAllUserRatings(): StoredRatingData {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_RATINGS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getUserRating(animeId: string): number {
  const all = getAllUserRatings();
  return all[animeId] || 0;
}

export const getUserRatingForAnime = getUserRating;

export function saveUserRating(animeId: string, rating: number): void {
  try {
    const all = getAllUserRatings();
    all[animeId] = rating;
    localStorage.setItem(STORAGE_KEYS.USER_RATINGS, JSON.stringify(all));
    notifyDataChanged();
  } catch (err) {
    console.error('Failed saving user rating', err);
  }
}

export const saveUserRatingForAnime = saveUserRating;

export interface CommunityRatingResult {
  average: number;
  totalVotes: number;
  userRating: number;
}

export function getCommunityRatingForAnime(animeId: string): CommunityRatingResult {
  const userRating = getUserRating(animeId);
  const anime = getStoredAnime().find(a => a.id === animeId);
  const baseRating = anime ? (parseFloat(anime.rating) || 0) : 0;
  
  if (userRating > 0) {
    const totalVotes = baseRating > 0 ? 2 : 1;
    const average = baseRating > 0 ? (baseRating + userRating) / 2 : userRating;
    return {
      average: Number(average.toFixed(1)),
      totalVotes,
      userRating
    };
  }

  return {
    average: baseRating,
    totalVotes: baseRating > 0 ? 1 : 0,
    userRating: 0
  };
}

// -------------------------------------------------------------
// CROSS-COMPONENT EVENT NOTIFICATION
// -------------------------------------------------------------

export function notifyDataChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SYNC_EVENT_NAME));
  }
}

export function subscribeToDataChanges(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(SYNC_EVENT_NAME, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(SYNC_EVENT_NAME, handler);
    window.removeEventListener('storage', handler);
  };
}

export function resetDemoData() {
  try {
    localStorage.removeItem(STORAGE_KEYS.STUDIOS);
    localStorage.removeItem(STORAGE_KEYS.ANIME);
    localStorage.removeItem(STORAGE_KEYS.WATCH_PROGRESS);
    notifyDataChanged();
  } catch {}
}
