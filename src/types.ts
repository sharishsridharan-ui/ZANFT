export interface Episode {
  id: string;
  animeId?: string;
  number: number;
  title: string;
  duration?: string;
  thumbnail?: string;
  synopsis?: string;
  videoUrl: string; // Drive link (Server 1) - may be empty if only a bot link is given
  botStreamUrl?: string; // Telegram bot stream link
  telegramFileId?: string;
  releaseDate?: string;
  isTrailer?: boolean; // true for the synthetic episode used to play a trailer
}

export interface Trailer {
  title: string;
  videoUrl: string; // Drive link
  botStreamUrl?: string; // Telegram bot stream link
}

export type AnimeType = 'Series' | 'Movie' | 'TV Series' | 'OVA';

export interface StudioSession {
  studioId: string;
  studioName: string;
  createdAt?: string;
  logo?: string;
  banner?: string; // PC Wide Banner (16:9)
  mobileBanner?: string; // Mobile Compact Banner
  location?: string; // Studio City/Location
  bio?: string;
  theme?: string;
}

export interface OwnerSession {
  isOwner: boolean;
  username: string;
  loginTime: string;
}

export type CrewRole = 'Dubber' | 'Scriptwriter' | 'Editor' | 'Director' | 'Sound Engineer' | 'Translator';

export interface CrewMember {
  id: string;
  name: string;
  role: CrewRole | string;
  instagramHandle: string; // e.g. "zen_dubber" or "https://instagram.com/..."
  characterOrWork?: string; // e.g. "Ren (Tamil Dubbing)", "Lead Dialogues", "Action Sequences Editor"
  language?: string; // e.g. "Tamil", "English", "Japanese"
  avatar?: string;
}

export type CastRole = 'Main' | 'Side' | 'Background';

export interface CastMember {
  id: string;
  characterName: string; // the character the dubber voiced
  role: CastRole;
  telegramId: string; // handle only, e.g. zen_dubber
  instagramId: string; // handle only
}

export interface Anime {
  id: string;
  title: string;
  japaneseTitle?: string;
  studioId: string;
  studioName: string;
  type: AnimeType;
  poster: string;
  banner: string;
  rating: string;
  matchPercentage: number;
  year: number;
  seasons: number;
  episodesCount: number;
  genres: string[];
  synopsis: string;
  featured?: boolean;
  trending?: boolean;
  topTenRank?: number;
  trailerUrl?: string;
  crew?: CrewMember[];
  cast?: CastMember[]; // voice cast shown on the detail page
  trailer?: Trailer;
  episodes: Episode[];
  createdAt?: string;
}

export interface Studio {
  id: string;
  name: string;
  slug: string;
  logo: string;
  banner: string; // PC Wide Banner (16:9)
  mobileBanner?: string; // Mobile Compact Banner
  location?: string; // Studio City/Location
  bio: string;
  established: number;
  country: string;
  verified: boolean;
  telegramHandle?: string;
  awards?: string[];
  followersCount: string;
  createdAt?: string;
  theme?: string;
}

export interface WatchProgress {
  animeId: string;
  episodeId: string;
  episodeNumber: number;
  episodeTitle: string;
  currentTime: number;
  duration: number;
  progressPercent: number;
  lastWatched: number;
  thumbnail?: string;
}

export interface UserReview {
  id: string;
  animeId: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
}

export interface UpcomingAnime {
  id: string;
  title: string;
  japaneseTitle?: string;
  studioId: string;
  studioName: string;
  format: 'TV Series' | 'Theatrical Film' | 'OVA Special';
  releaseDate: string;
  banner: string;
  genres: string[];
  synopsis: string;
  trailerUrl?: string;
  expectedRuntime?: string;
  anticipatedScore?: number;
}
