import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  onSnapshot,
  where
} from 'firebase/firestore';
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { db, auth, googleProvider, MAX_STUDIO_CAPACITY, MASTER_OWNER_CREDENTIALS, getGoogleDriveStreamInfo } from '../firebase';
import { Anime, Episode, Studio } from '../types';
import {
  getStoredAnime,
  saveStoredAnime,
  getStoredStudios,
  saveStoredStudios,
  notifyDataChanged,
  subscribeToDataChanges
} from '../data/storage';

export interface CloudStudio {
  id: string;
  name: string;
  password?: string;
  createdAt: string;
  animeCount?: number;
  slug?: string;
  bio?: string;
  logo?: string;
  banner?: string;
  mobileBanner?: string;
  location?: string;
  theme?: string;
  verified?: boolean;
}

export interface CloudEpisode {
  id: string;
  number: number;
  title: string;
  videoUrl: string; // Google Drive Public Video URL or stream
  duration?: string;
  synopsis?: string;
  thumbnail?: string;
  releaseDate?: string;
}

export interface CloudAnime {
  id: string;
  title: string;
  japaneseTitle?: string;
  type: 'Series' | 'Movie';
  genres: string[];
  synopsis: string;
  poster: string;
  banner?: string;
  studioId: string;
  studioName: string;
  episodes: CloudEpisode[];
  rating?: string;
  matchPercentage?: number;
  year?: number;
  createdAt?: string;
  featured?: boolean;
  trending?: boolean;
  topTenRank?: number;
}

// -------------------------------------------------------------
// FIRESTORE SAFETY HELPERS
// -------------------------------------------------------------

// Firestore rejects `undefined` values, so strip them before writing.
function cleanForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// Studio documents in Firestore are PUBLIC (everyone can read them),
// so passwords and emails must never be written there.
function toPublicStudio(studio: Record<string, any>): Record<string, any> {
  const { password, googleEmail, ...rest } = studio;
  return cleanForFirestore(rest);
}

// -------------------------------------------------------------
// IN-MEMORY CACHES FOR 0ms INSTANT LOCAL-FIRST PERFORMANCE
// -------------------------------------------------------------
type StudioWithAuth = CloudStudio & { password?: string; googleUid?: string | null; googleEmail?: string | null };

let memoryStudiosCache: StudioWithAuth[] = [];
let memoryAnimeCache: CloudAnime[] = [];

// Initialize memory caches from local storage
function initCachesFromStorage() {
  if (typeof window === 'undefined') return;
  try {
    const storedStudios = getStoredStudios();
    if (storedStudios && storedStudios.length > 0) {
      memoryStudiosCache = storedStudios.map((s) => ({
        id: s.id,
        name: s.name,
        createdAt: s.createdAt || new Date().toISOString(),
        animeCount: 0,
        bio: s.bio || '',
        logo: s.logo || '',
        banner: s.banner || '',
        mobileBanner: s.mobileBanner || '',
        location: s.location || '',
        theme: s.theme || 'crimson',
        verified: s.verified !== false
      }));
    }

    const rawLocalStudios = localStorage.getItem('zanft_local_registered_studios');
    if (rawLocalStudios) {
      const parsed = JSON.parse(rawLocalStudios);
      if (Array.isArray(parsed)) {
        parsed.forEach((ls: StudioWithAuth) => {
          if (!memoryStudiosCache.some((m) => m.id === ls.id || m.name.toLowerCase() === ls.name.toLowerCase())) {
            memoryStudiosCache.push(ls);
          } else {
            const idx = memoryStudiosCache.findIndex((m) => m.id === ls.id || m.name.toLowerCase() === ls.name.toLowerCase());
            if (idx !== -1 && ls.password) {
              memoryStudiosCache[idx].password = ls.password;
              memoryStudiosCache[idx].googleUid = ls.googleUid;
              memoryStudiosCache[idx].googleEmail = ls.googleEmail;
            }
          }
        });
      }
    }

    const storedAnime = getStoredAnime();
    if (storedAnime && storedAnime.length > 0) {
      memoryAnimeCache = storedAnime.map((a) => ({
        id: a.id,
        title: a.title,
        japaneseTitle: a.japaneseTitle,
        type: a.type === 'Movie' ? 'Movie' : 'Series',
        genres: a.genres || ['Action'],
        synopsis: a.synopsis || '',
        poster: a.poster || '',
        banner: a.banner || a.poster || '',
        studioId: a.studioId,
        studioName: a.studioName,
        episodes: (a.episodes || []).map((ep) => ({
          id: ep.id,
          number: ep.number,
          title: ep.title,
          videoUrl: ep.videoUrl,
          duration: ep.duration || '24m',
          thumbnail: ep.thumbnail || a.poster || '',
          releaseDate: ep.releaseDate || new Date().toISOString()
        })),
        rating: a.rating || 'TV-14',
        matchPercentage: a.matchPercentage || 95,
        year: a.year || new Date().getFullYear(),
        createdAt: a.createdAt || new Date().toISOString(),
        featured: !!a.featured,
        trending: !!a.trending,
        topTenRank: a.topTenRank
      }));
    }
  } catch (err) {
    console.warn('Cache initialization error:', err);
  }
}

initCachesFromStorage();

function syncCachesToStorage() {
  try {
    const mappedStudios: Studio[] = memoryStudiosCache.map((cs) => {
      const resolvedLocation = (cs.location && cs.location.trim()) ? cs.location.trim() : 'International';
      return {
        id: cs.id,
        name: cs.name,
        slug: cs.slug || cs.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        logo: cs.logo || '',
        banner: cs.banner || '',
        mobileBanner: cs.mobileBanner || '',
        location: resolvedLocation,
        bio: cs.bio || '',
        established: 2025,
        country: resolvedLocation,
        verified: cs.verified !== false,
        followersCount: '0',
        createdAt: cs.createdAt,
        theme: cs.theme
      };
    });
    saveStoredStudios(mappedStudios);

    const mappedAnime: Anime[] = memoryAnimeCache.map((ca) => ({
      id: ca.id,
      title: ca.title,
      japaneseTitle: ca.japaneseTitle,
      type: ca.type,
      genres: ca.genres || ['Action'],
      synopsis: ca.synopsis,
      poster: ca.poster,
      banner: ca.banner || ca.poster,
      studioId: ca.studioId,
      studioName: ca.studioName,
      episodes: (ca.episodes || []).map((ep) => ({
        id: ep.id,
        animeId: ca.id,
        number: ep.number,
        title: ep.title,
        duration: ep.duration || '24m',
        thumbnail: ep.thumbnail || ca.poster,
        synopsis: ep.synopsis,
        videoUrl: ep.videoUrl
      })),
      rating: ca.rating || 'TV-14',
      matchPercentage: ca.matchPercentage || 95,
      year: ca.year || new Date().getFullYear(),
      seasons: 1,
      episodesCount: (ca.episodes || []).length,
      createdAt: ca.createdAt
    }));
    saveStoredAnime(mappedAnime);

    localStorage.setItem('zanft_local_registered_studios', JSON.stringify(memoryStudiosCache));
  } catch (err) {
    console.warn('Storage sync error:', err);
  }
}

// -------------------------------------------------------------
// REAL-TIME SUBSCRIPTIONS
// -------------------------------------------------------------

// Subscribe to real-time anime list
export function subscribeToAnime(
  onData: (animeList: CloudAnime[]) => void,
  onError?: (err: Error) => void
) {
  // 1. Immediately push current live real anime (0ms)
  onData([...memoryAnimeCache]);

  // 2. Listen to local data changes so UI reacts instantly across the app
  const unsubLocal = subscribeToDataChanges(() => {
    onData([...memoryAnimeCache]);
  });

  // 3. Listen to Firestore for remote sync
  let unsubFirestore = () => {};
  try {
    const animeCol = collection(db, 'anime');
    unsubFirestore = onSnapshot(
      animeCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteList: CloudAnime[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            remoteList.push({
              id: docSnap.id,
              title: data.title || 'Untitled',
              japaneseTitle: data.japaneseTitle,
              type: data.type === 'Movie' ? 'Movie' : 'Series',
              genres: Array.isArray(data.genres) ? data.genres : ['Action'],
              synopsis: data.synopsis || '',
              poster: data.poster || '',
              banner: data.banner || data.poster || '',
              studioId: data.studioId || 'unknown',
              studioName: data.studioName || 'Independent Studio',
              episodes: Array.isArray(data.episodes) ? data.episodes : [],
              rating: data.rating || 'TV-14',
              matchPercentage: data.matchPercentage || 95,
              year: data.year || new Date().getFullYear(),
              createdAt: data.createdAt || new Date().toISOString(),
              featured: !!data.featured,
              trending: !!data.trending,
              topTenRank: data.topTenRank
            });
          });

          // Merge with local cache
          remoteList.forEach((ra) => {
            const existingIdx = memoryAnimeCache.findIndex((a) => a.id === ra.id);
            if (existingIdx !== -1) {
              memoryAnimeCache[existingIdx] = ra;
            } else {
              memoryAnimeCache.push(ra);
            }
          });

          memoryAnimeCache.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
          syncCachesToStorage();
          onData([...memoryAnimeCache]);
        }
      },
      (err) => {
        console.warn('Firestore anime sync note (operating local-first):', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Firestore snapshot setup note:', err);
  }

  return () => {
    unsubLocal();
    unsubFirestore();
  };
}

// Subscribe to real-time studios list
export function subscribeToStudios(
  onData: (studios: CloudStudio[]) => void,
  onError?: (err: Error) => void
) {
  // 1. Immediately emit live memory cache (0ms)
  onData([...memoryStudiosCache]);

  // 2. Listen to local events
  const unsubLocal = subscribeToDataChanges(() => {
    onData([...memoryStudiosCache]);
  });

  // 3. Listen to Firestore
  let unsubFirestore = () => {};
  try {
    const studiosCol = collection(db, 'studios');
    unsubFirestore = onSnapshot(
      studiosCol,
      (snapshot) => {
        if (!snapshot.empty) {
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const existingIdx = memoryStudiosCache.findIndex((s) => s.id === docSnap.id || s.name.toLowerCase() === (data.name || '').toLowerCase());
            const existing = existingIdx !== -1 ? memoryStudiosCache[existingIdx] : undefined;
            const studioObj: StudioWithAuth = {
              id: docSnap.id,
              name: data.name,
              createdAt: data.createdAt || new Date().toISOString(),
              animeCount: data.animeCount || 0,
              bio: data.bio || '',
              logo: data.logo || '',
              banner: data.banner || '',
              mobileBanner: data.mobileBanner || existing?.mobileBanner || '',
              location: data.location || existing?.location || '',
              theme: data.theme || 'crimson',
              verified: data.verified !== false,
              password: data.password || existing?.password,
              googleUid: data.googleUid ?? existing?.googleUid,
              googleEmail: existing?.googleEmail
            };

            if (existingIdx !== -1) {
              memoryStudiosCache[existingIdx] = { ...memoryStudiosCache[existingIdx], ...studioObj };
            } else {
              memoryStudiosCache.push(studioObj);
            }
          });

          memoryStudiosCache.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
          syncCachesToStorage();
          onData([...memoryStudiosCache]);
        }
      },
      (err) => {
        console.warn('Firestore studios sync note (operating local-first):', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Firestore studios setup note:', err);
  }

  return () => {
    unsubLocal();
    unsubFirestore();
  };
}

// -------------------------------------------------------------
// AUTHENTICATION & STUDIO REGISTRATION
// -------------------------------------------------------------

export async function signInWithGooglePopup() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function loginOrCreateWithGoogle(user: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}): Promise<CloudStudio> {
  const existing = memoryStudiosCache.find((s) => {
    const uidMatch = user.uid && s.googleUid === user.uid;
    const emailMatch = user.email && (s.googleEmail || '').toLowerCase() === user.email.toLowerCase();
    return uidMatch || emailMatch;
  });

  if (existing) {
    return existing;
  }

  const rawBase = (user.displayName || user.email?.split('@')[0] || 'StudioCreator')
    .replace(/[^a-zA-Z0-9]/g, '')
    .trim();
  let cleanName = rawBase.length >= 2 ? `${rawBase}Studio` : 'AnimeStudio';

  let candidate = cleanName;
  let counter = 1;
  while (memoryStudiosCache.some((s) => s.name.toLowerCase() === candidate.toLowerCase())) {
    candidate = `${cleanName}${counter++}`;
  }
  cleanName = candidate;

  const now = new Date().toISOString();
  const studioId = `studio-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const studioPayload = {
    name: cleanName,
    password: user.uid,
    googleUid: user.uid,
    googleEmail: user.email || '',
    logo: user.photoURL || '',
    banner: '',
    location: 'International',
    createdAt: now,
    animeCount: 0,
    verified: true
  };

  const newStudio: StudioWithAuth = {
    id: studioId,
    ...studioPayload
  };

  memoryStudiosCache.unshift(newStudio);
  syncCachesToStorage();
  notifyDataChanged();

  // Background Firestore write (non-blocking). Password/email are NOT sent.
  try {
    const studioDocRef = doc(db, 'studios', studioId);
    setDoc(studioDocRef, toPublicStudio(studioPayload)).catch((err) => {
      console.warn('Firestore studio write failed:', err);
    });
  } catch {}

  return newStudio;
}

export async function registerStudio(
  name: string,
  password: string,
  googleMeta?: {
    uid?: string;
    email?: string | null;
    photoURL?: string | null;
    displayName?: string | null;
  }
): Promise<CloudStudio> {
  const cleanName = name.trim();
  const cleanPassword = password.trim();

  if (!cleanName || cleanName.length < 2) {
    throw new Error('Studio Name must be at least 2 characters.');
  }
  if (!cleanPassword || cleanPassword.length < 4) {
    throw new Error('Password must be at least 4 characters.');
  }

  if (memoryStudiosCache.length >= MAX_STUDIO_CAPACITY) {
    throw new Error(`Studio Capacity Limit Reached: All ${MAX_STUDIO_CAPACITY} studio slots are filled.`);
  }

  const existing = memoryStudiosCache.find(
    (d) => d.name.toLowerCase() === cleanName.toLowerCase()
  );
  if (existing) {
    throw new Error(`The studio name "${cleanName}" is already registered. Please choose another name.`);
  }

  const now = new Date().toISOString();
  const studioId = `studio-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const studioPayload = {
    name: cleanName,
    password: cleanPassword,
    googleUid: googleMeta?.uid || null,
    googleEmail: googleMeta?.email || null,
    logo: googleMeta?.photoURL || '',
    banner: '',
    location: 'International',
    createdAt: now,
    animeCount: 0,
    verified: true
  };

  const newStudio: StudioWithAuth = {
    id: studioId,
    ...studioPayload
  };

  // 1. Immediately store in live caches and persistent storage
  memoryStudiosCache.unshift(newStudio);
  syncCachesToStorage();
  notifyDataChanged();

  // 2. Non-blocking Firestore write. Password/email are NOT sent.
  try {
    const studioDocRef = doc(db, 'studios', studioId);
    setDoc(studioDocRef, toPublicStudio(studioPayload)).catch((err) => {
      console.warn('Firestore studio write failed:', err);
    });
  } catch {}

  return newStudio;
}

export async function loginStudio(
  nameOrEmail: string,
  password: string,
  googleUid?: string
): Promise<CloudStudio> {
  const cleanIdentifier = nameOrEmail.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (!cleanPassword && !googleUid) {
    throw new Error('Please enter your Studio Password.');
  }
  if (!cleanIdentifier && !googleUid) {
    throw new Error('Please enter Studio Name or connect your Google Account.');
  }

  // 1. Instant check in memory cache (0ms)
  const matched = memoryStudiosCache.find((s) => {
    const nameMatch = cleanIdentifier && s.name.toLowerCase() === cleanIdentifier;
    const emailMatch = cleanIdentifier && (s.googleEmail || '').toLowerCase() === cleanIdentifier;
    const uidMatch = googleUid && s.googleUid === googleUid;
    return (nameMatch || emailMatch || uidMatch) && (uidMatch || !cleanPassword || s.password === cleanPassword);
  });

  if (matched) {
    return matched;
  }

  // 2. Safe timeout Firestore check
  try {
    const studiosCol = collection(db, 'studios');
    const snapshotPromise = getDocs(studiosCol);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200));
    const snapshot: any = await Promise.race([snapshotPromise, timeoutPromise]);

    if (snapshot && !snapshot.empty) {
      const docMatch = snapshot.docs.find((d: any) => {
        const data = d.data();
        const nameMatch = cleanIdentifier && (data.name || '').toLowerCase() === cleanIdentifier;
        const emailMatch = cleanIdentifier && (data.googleEmail || '').toLowerCase() === cleanIdentifier;
        const uidMatch = googleUid && data.googleUid === googleUid;
        return (nameMatch || emailMatch || uidMatch) && (uidMatch || !cleanPassword || data.password === cleanPassword);
      });

      if (docMatch) {
        const data = docMatch.data();
        const studioObj: StudioWithAuth = {
          id: docMatch.id,
          name: data.name,
          createdAt: data.createdAt,
          animeCount: data.animeCount || 0,
          bio: data.bio || '',
          logo: data.logo || '',
          banner: data.banner || '',
          theme: data.theme || 'crimson',
          verified: data.verified !== false,
          password: data.password,
          googleUid: data.googleUid,
          googleEmail: data.googleEmail
        };
        memoryStudiosCache.unshift(studioObj);
        syncCachesToStorage();
        notifyDataChanged();
        return studioObj;
      }
    }
  } catch {}

  throw new Error('Invalid Studio Name, Email, or Password. Please check your credentials.');
}

export function verifyMasterOwner(username: string, password: string): boolean {
  return (
    username.trim() === MASTER_OWNER_CREDENTIALS.username &&
    password.trim() === MASTER_OWNER_CREDENTIALS.password
  );
}

export async function updateStudioProfile(
  studioId: string,
  profile: {
    name?: string;
    logo?: string;
    banner?: string;
    mobileBanner?: string;
    location?: string;
    bio?: string;
    theme?: string;
    password?: string;
  }
): Promise<{ id: string; name: string; logo?: string; banner?: string; mobileBanner?: string; location?: string; bio?: string; theme?: string }> {
  const studioIdx = memoryStudiosCache.findIndex((s) => s.id === studioId);
  if (studioIdx === -1) {
    throw new Error('Studio not found.');
  }

  const current = memoryStudiosCache[studioIdx];
  const updates: Record<string, any> = {};

  if (profile.name !== undefined) {
    const cleanName = profile.name.trim();
    if (!cleanName || cleanName.length < 2) {
      throw new Error('Studio Name must be at least 2 characters.');
    }
    const collision = memoryStudiosCache.find(
      (s) => s.id !== studioId && s.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (collision) {
      throw new Error(`The studio name "${cleanName}" is already taken by another studio.`);
    }
    updates.name = cleanName;
    current.name = cleanName;
  }

  if (profile.logo !== undefined) {
    updates.logo = profile.logo.trim();
    current.logo = updates.logo;
  }
  if (profile.banner !== undefined) {
    updates.banner = profile.banner.trim();
    current.banner = updates.banner;
  }
  if (profile.mobileBanner !== undefined) {
    updates.mobileBanner = profile.mobileBanner.trim();
    current.mobileBanner = updates.mobileBanner;
  }
  if (profile.location !== undefined) {
    const cleanLoc = profile.location.trim();
    updates.location = cleanLoc || 'International';
    current.location = updates.location;
  }
  if (profile.bio !== undefined) {
    updates.bio = profile.bio.trim();
    current.bio = updates.bio;
  }
  if (profile.theme !== undefined) {
    updates.theme = profile.theme;
    current.theme = updates.theme;
  }
  if (profile.password !== undefined && profile.password.trim()) {
    updates.password = profile.password.trim();
    current.password = updates.password;
  }

  // Update studioName across all anime created by this studio
  if (updates.name) {
    memoryAnimeCache.forEach((a) => {
      if (a.studioId === studioId) {
        a.studioName = updates.name;
      }
    });
  }

  // Persist locally
  syncCachesToStorage();
  notifyDataChanged();

  // Non-blocking Firestore sync (password is never sent)
  try {
    const publicUpdates = toPublicStudio(updates);
    if (Object.keys(publicUpdates).length > 0) {
      const studioDocRef = doc(db, 'studios', studioId);
      updateDoc(studioDocRef, publicUpdates).catch((err) => {
        console.warn('Firestore studio update failed:', err);
      });
    }
  } catch {}

  return {
    id: studioId,
    name: current.name,
    logo: current.logo,
    banner: current.banner,
    mobileBanner: current.mobileBanner,
    location: current.location,
    bio: current.bio,
    theme: current.theme
  };
}

export async function updateStudioByOwner(
  studioId: string,
  data: {
    name?: string;
    logo?: string;
    banner?: string;
    bio?: string;
    password?: string;
  }
): Promise<void> {
  await updateStudioProfile(studioId, data);
}

// -------------------------------------------------------------
// ANIME FOLDER CREATION & MANAGEMENT (Real Creator Uploads)
// -------------------------------------------------------------

export async function createAnimeFolder(
  animeData: {
    title: string;
    type: 'Series' | 'Movie';
    genres: string[];
    synopsis: string;
    poster: string;
    banner?: string;
    initialEpisode?: {
      number?: number;
      title: string;
      videoUrl: string;
      duration?: string;
    };
  },
  studioId: string,
  studioName: string
): Promise<string> {
  if (!animeData.title.trim()) {
    throw new Error('Anime title is required.');
  }

  const animeId = `anime-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const episodes: CloudEpisode[] = [];
  if (animeData.initialEpisode && animeData.initialEpisode.videoUrl?.trim()) {
    const rawUrl = animeData.initialEpisode.videoUrl.trim();
    const driveInfo = getGoogleDriveStreamInfo(rawUrl);
    episodes.push({
      id: `ep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      number: animeData.initialEpisode.number || 1,
      title: animeData.initialEpisode.title?.trim() || (animeData.type === 'Movie' ? 'Full Feature Film' : 'Episode 1'),
      videoUrl: rawUrl,
      duration: animeData.initialEpisode.duration?.trim() || (animeData.type === 'Movie' ? '1h 45m' : '24m'),
      thumbnail: driveInfo.thumbnailUrl || animeData.poster.trim() || '',
      releaseDate: now
    });
  }

  const newAnime: CloudAnime = {
    id: animeId,
    title: animeData.title.trim(),
    type: animeData.type,
    genres: animeData.genres.length > 0 ? animeData.genres : ['Action'],
    synopsis: animeData.synopsis.trim(),
    poster: animeData.poster.trim() || '',
    banner: animeData.banner?.trim() || animeData.poster.trim() || '',
    studioId,
    studioName,
    episodes,
    rating: 'TV-14',
    matchPercentage: 96,
    year: new Date().getFullYear(),
    createdAt: now,
    featured: false,
    trending: true
  };

  // 1. Immediately store in live memory and persistent storage (0ms)
  memoryAnimeCache.unshift(newAnime);

  // Increment studio anime count in cache
  const studioIdx = memoryStudiosCache.findIndex((s) => s.id === studioId);
  if (studioIdx !== -1) {
    memoryStudiosCache[studioIdx].animeCount = (memoryStudiosCache[studioIdx].animeCount || 0) + 1;
  }

  syncCachesToStorage();
  notifyDataChanged();

  // 2. Non-blocking Firestore sync (try/catch ensures 0 UI failure)
  try {
    const animeDocRef = doc(db, 'anime', animeId);
    setDoc(animeDocRef, cleanForFirestore(newAnime)).catch((err) => {
      console.warn('Firestore anime write failed:', err);
    });

    const studioDocRef = doc(db, 'studios', studioId);
    getDoc(studioDocRef).then((snap) => {
      if (snap.exists()) {
        const count = snap.data().animeCount || 0;
        updateDoc(studioDocRef, { animeCount: count + 1 }).catch(() => {});
      }
    }).catch(() => {});
  } catch {}

  return animeId;
}

export async function updateAnimeFolder(
  animeId: string,
  updateData: Partial<CloudAnime>,
  currentStudioId: string,
  isMasterOwner: boolean
): Promise<void> {
  const animeIdx = memoryAnimeCache.findIndex((a) => a.id === animeId);
  if (animeIdx === -1) {
    throw new Error('Anime not found.');
  }

  const currentAnime = memoryAnimeCache[animeIdx];
  if (!isMasterOwner && currentAnime.studioId !== currentStudioId) {
    throw new Error('Permission denied: You can only edit anime folders belonging to your studio.');
  }

  memoryAnimeCache[animeIdx] = {
    ...currentAnime,
    ...updateData
  };

  syncCachesToStorage();
  notifyDataChanged();

  // Non-blocking Firestore sync
  try {
    const animeDocRef = doc(db, 'anime', animeId);
    updateDoc(animeDocRef, cleanForFirestore({ ...updateData, updatedAt: new Date().toISOString() })).catch((err) => {
      console.warn('Firestore anime update failed:', err);
    });
  } catch {}
}

export async function deleteAnimeFolder(
  animeId: string,
  currentStudioId: string,
  isMasterOwner: boolean,
  currentStudioName?: string
): Promise<void> {
  const animeIdx = memoryAnimeCache.findIndex((a) => a.id === animeId);
  if (animeIdx === -1) return;

  const currentAnime = memoryAnimeCache[animeIdx];
  const belongsToStudio =
    currentAnime.studioId === currentStudioId ||
    (Boolean(currentStudioName) && (currentAnime.studioName || '').trim().toLowerCase() === (currentStudioName || '').trim().toLowerCase());

  if (!isMasterOwner && !belongsToStudio) {
    throw new Error('Permission denied: You can only delete anime folders belonging to your studio.');
  }

  memoryAnimeCache.splice(animeIdx, 1);

  // Decrement studio count
  const studioIdx = memoryStudiosCache.findIndex((s) => s.id === currentAnime.studioId);
  if (studioIdx !== -1) {
    memoryStudiosCache[studioIdx].animeCount = Math.max(0, (memoryStudiosCache[studioIdx].animeCount || 1) - 1);
  }

  syncCachesToStorage();
  notifyDataChanged();

  // Non-blocking Firestore sync
  try {
    const animeDocRef = doc(db, 'anime', animeId);
    deleteDoc(animeDocRef).catch(() => {});
  } catch {}
}

export async function addEpisodeToAnime(
  animeId: string,
  episodeData: {
    number: number;
    title: string;
    videoUrl: string; // Google Drive Public Video URL
    duration?: string;
  },
  currentStudioId: string,
  isMasterOwner: boolean
): Promise<void> {
  if (!episodeData.title.trim()) {
    throw new Error('Episode title is required.');
  }
  if (!episodeData.videoUrl.trim()) {
    throw new Error('Google Drive Public Video URL is required.');
  }

  const animeIdx = memoryAnimeCache.findIndex((a) => a.id === animeId);
  if (animeIdx === -1) {
    throw new Error('Anime folder not found.');
  }

  const currentAnime = memoryAnimeCache[animeIdx];
  if (!isMasterOwner && currentAnime.studioId !== currentStudioId) {
    throw new Error('Permission denied: You can only add episodes to your own anime folders.');
  }

  const rawUrl = episodeData.videoUrl.trim();
  const driveInfo = getGoogleDriveStreamInfo(rawUrl);

  const currentEpisodes: CloudEpisode[] = Array.isArray(currentAnime.episodes) ? currentAnime.episodes : [];
  const newEpisode: CloudEpisode = {
    id: `ep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    number: episodeData.number || currentEpisodes.length + 1,
    title: episodeData.title.trim(),
    videoUrl: rawUrl,
    duration: episodeData.duration || '24m',
    thumbnail: driveInfo.thumbnailUrl || currentAnime.poster || '',
    releaseDate: new Date().toISOString()
  };

  const updatedEpisodes = [...currentEpisodes, newEpisode].sort((a, b) => a.number - b.number);
  memoryAnimeCache[animeIdx].episodes = updatedEpisodes;

  syncCachesToStorage();
  notifyDataChanged();

  // Non-blocking Firestore sync
  try {
    const animeDocRef = doc(db, 'anime', animeId);
    updateDoc(animeDocRef, cleanForFirestore({ episodes: updatedEpisodes, updatedAt: new Date().toISOString() })).catch((err) => {
      console.warn('Firestore episode update failed:', err);
    });
  } catch {}
}

export async function deleteEpisodeFromAnime(
  animeId: string,
  episodeId: string,
  currentStudioId: string,
  isMasterOwner: boolean,
  currentStudioName?: string
): Promise<void> {
  const animeIdx = memoryAnimeCache.findIndex((a) => a.id === animeId);
  if (animeIdx === -1) {
    throw new Error('Anime not found.');
  }

  const currentAnime = memoryAnimeCache[animeIdx];
  const belongsToStudio =
    currentAnime.studioId === currentStudioId ||
    (Boolean(currentStudioName) && (currentAnime.studioName || '').trim().toLowerCase() === (currentStudioName || '').trim().toLowerCase());

  if (!isMasterOwner && !belongsToStudio) {
    throw new Error('Permission denied: You can only manage episodes belonging to your studio.');
  }

  const currentEpisodes: CloudEpisode[] = Array.isArray(currentAnime.episodes) ? currentAnime.episodes : [];
  const updatedEpisodes = currentEpisodes.filter((ep) => ep.id !== episodeId);

  memoryAnimeCache[animeIdx].episodes = updatedEpisodes;

  syncCachesToStorage();
  notifyDataChanged();

  // Non-blocking Firestore sync
  try {
    const animeDocRef = doc(db, 'anime', animeId);
    updateDoc(animeDocRef, cleanForFirestore({ episodes: updatedEpisodes, updatedAt: new Date().toISOString() })).catch((err) => {
      console.warn('Firestore episode delete failed:', err);
    });
  } catch {}
}

export async function deleteStudio(studioId: string, authorized = true): Promise<void> {
  if (!authorized) {
    throw new Error('Authorized credentials required to delete studio.');
  }

  const studioIdx = memoryStudiosCache.findIndex((s) => s.id === studioId);
  if (studioIdx !== -1) {
    memoryStudiosCache.splice(studioIdx, 1);
  }

  // Also remove anime from this studio
  memoryAnimeCache = memoryAnimeCache.filter((a) => a.studioId !== studioId);

  syncCachesToStorage();
  notifyDataChanged();

  // Non-blocking Firestore sync
  try {
    const studioDocRef = doc(db, 'studios', studioId);
    deleteDoc(studioDocRef).catch(() => {});
  } catch {}
}

/**
 * Clean real-creators policy: No dummy data seeded.
 */
export async function seedInitialFirestoreLibrary(): Promise<number> {
  return 0;
}

// -------------------------------------------------------------
// CLOUD SYNC: runs automatically for every visitor
// -------------------------------------------------------------

/**
 * Uploads studios/anime that exist only in this browser's storage
 * (and are missing in Firestore). Needs a logged-in Firebase user
 * because Firestore rules only allow writes for signed-in users.
 */
export async function syncLocalToFirestore(): Promise<void> {
  if (!auth.currentUser) return;
  try {
    const [studioSnap, animeSnap] = await Promise.all([
      getDocs(collection(db, 'studios')),
      getDocs(collection(db, 'anime'))
    ]);
    const remoteStudioIds = new Set(studioSnap.docs.map((d) => d.id));
    const remoteAnimeIds = new Set(animeSnap.docs.map((d) => d.id));

    for (const studio of memoryStudiosCache) {
      if (!remoteStudioIds.has(studio.id)) {
        await setDoc(doc(db, 'studios', studio.id), toPublicStudio(studio));
      }
    }
    for (const anime of memoryAnimeCache) {
      if (!remoteAnimeIds.has(anime.id)) {
        await setDoc(doc(db, 'anime', anime.id), cleanForFirestore(anime));
      }
    }
  } catch (err) {
    console.warn('Local to Firestore sync failed:', err);
  }
}

let cloudSyncStarted = false;

/**
 * Starts the Firestore listeners (so every visitor sees ALL studios/anime)
 * and uploads this browser's local studios once the user is signed in.
 */
export function startCloudSync(): void {
  if (cloudSyncStarted || typeof window === 'undefined') return;
  cloudSyncStarted = true;

  subscribeToStudios(() => {});
  subscribeToAnime(() => {});

  onAuthStateChanged(auth, (user) => {
    if (user) {
      syncLocalToFirestore();
    }
  });
}

startCloudSync();
