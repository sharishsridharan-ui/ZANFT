import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  onSnapshot,
  where,
  writeBatch
} from 'firebase/firestore';
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { db, auth, googleProvider, MAX_STUDIO_CAPACITY, MASTER_OWNER_CREDENTIALS, getGoogleDriveStreamInfo } from '../firebase';
import { Anime, Studio, Trailer, CastMember, ContentCategory } from '../types';
import { cleanCast } from '../utils/cast';
import {
  getStoredAnime,
  saveStoredAnime,
  getStoredStudios,
  saveStoredStudios,
  notifyDataChanged,
  subscribeToDataChanges,
  removeWatchProgressForAnime
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
  videoUrl: string; // Drive link (Server 1). May be empty if only a bot stream link is given.
  botStreamUrl?: string; // Telegram bot stream link
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
  trailer?: Trailer | null;
  cast?: CastMember[];
  category?: ContentCategory;
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

// Keeps the first entry of every id. Two copies of the same folder happened when the live
// Firestore listener and the create call both added it to the cache.
function dedupeById<T extends { id: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.filter((x) => {
    if (seen.has(x.id)) return false;
    seen.add(x.id);
    return true;
  });
}

// A Firestore document can hold about 1 MB. Uploaded images are stored inside the folder
// document, so refuse early with a clear reason instead of a vague "save failed".
const MAX_DOC_BYTES = 950_000;
function assertDocSize(data: unknown) {
  const bytes = new Blob([JSON.stringify(data)]).size;
  if (bytes > MAX_DOC_BYTES) {
    throw new Error(
      `This folder is too big to save (${Math.round(bytes / 1024)} KB, the limit is about 930 KB). Images take the most space: use smaller thumbnails, or paste image links instead of uploading.`
    );
  }
}

// Older saves copied the whole poster into every episode as its thumbnail, which filled the
// document after 2 episodes. A thumbnail equal to the poster/banner is dropped (the screens
// already fall back to the poster when an episode has no thumbnail).
function slimEpisodes(episodes: CloudEpisode[], anime: { poster?: string; banner?: string }): CloudEpisode[] {
  return episodes.map((ep) =>
    ep.thumbnail && (ep.thumbnail === anime.poster || ep.thumbnail === anime.banner) ? { ...ep, thumbnail: '' } : ep
  );
}

// Turns a Firestore error into a message the studio can actually read.
function cloudSaveError(err: any, action: string): Error {
  console.error(`Firestore ${action} failed:`, err);
  const tooBig = /maximum allowed size|exceeds|too large/i.test(String(err?.message || ''));
  if (tooBig) {
    return new Error('This folder is too big to save. Use smaller thumbnails, or paste image links instead of uploading.');
  }
  return new Error(
    err?.code === 'permission-denied'
      ? `Cloud save blocked by Firestore rules. Signed in as: ${auth.currentUser?.email || 'nobody'} - Google sign-in pannitu thirumba try pannunga.`
      : 'Cloud save failed. Check internet and try again.'
  );
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
          botStreamUrl: ep.botStreamUrl,
          duration: ep.duration || '24m',
          thumbnail: ep.thumbnail && ep.thumbnail !== a.poster && ep.thumbnail !== a.banner ? ep.thumbnail : '',
          releaseDate: ep.releaseDate || new Date().toISOString()
        })),
        rating: a.rating || 'TV-14',
        matchPercentage: a.matchPercentage || 95,
        year: a.year || new Date().getFullYear(),
        createdAt: a.createdAt || new Date().toISOString(),
        featured: !!a.featured,
        trending: !!a.trending,
        trailer: a.trailer,
        cast: a.cast,
        category: a.category,
        topTenRank: a.topTenRank
      }));
    }
  } catch (err) {
    console.warn('Cache initialization error:', err);
  }
}

initCachesFromStorage();
memoryAnimeCache = dedupeById(memoryAnimeCache);
memoryStudiosCache = dedupeById(memoryStudiosCache);

function syncCachesToStorage() {
  memoryAnimeCache = dedupeById(memoryAnimeCache);
  memoryStudiosCache = dedupeById(memoryStudiosCache);
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
        thumbnail: ep.thumbnail && ep.thumbnail !== ca.poster && ep.thumbnail !== ca.banner ? ep.thumbnail : '',
        synopsis: ep.synopsis,
        videoUrl: ep.videoUrl,
        botStreamUrl: ep.botStreamUrl
      })),
      rating: ca.rating || 'TV-14',
      matchPercentage: ca.matchPercentage || 95,
      year: ca.year || new Date().getFullYear(),
      seasons: 1,
      episodesCount: (ca.episodes || []).length,
      createdAt: ca.createdAt,
      trailer: ca.trailer || undefined,
      cast: ca.cast,
      category: ca.category
    }));
    saveStoredAnime(mappedAnime);

    localStorage.setItem('zanft_local_registered_studios', JSON.stringify(memoryStudiosCache));
  } catch (err) {
    console.warn('Storage sync error:', err);
  }
}

// Studio ids this browser/user legitimately owns (used so stale local copies
// of OTHER people's studios never get re-uploaded or kept after a remote delete).
function getOwnedStudioIds(): Set<string> {
  const ids = new Set<string>();
  try {
    const raw = localStorage.getItem('zanft_current_studio') || localStorage.getItem('zanft_studio_session');
    if (raw) {
      const sess = JSON.parse(raw);
      if (sess?.studioId) ids.add(sess.studioId);
      if (sess?.id) ids.add(sess.id);
    }
  } catch {}
  const uid = auth.currentUser?.uid;
  if (uid) {
    memoryStudiosCache.forEach((s) => {
      if (s.googleUid && s.googleUid === uid) ids.add(s.id);
    });
  }
  return ids;
}

// Master owner Google account - must match isMaster() in firestore.rules
export const MASTER_OWNER_EMAIL = 'sharishsridharan@gmail.com';

// Cloud writes need a real Firebase identity. The owner/studio session in
// localStorage survives a refresh, but the Firebase sign-in may not - so ask again.
// When the caller is the Master Owner, the Google account must be the owner Gmail.
async function ensureCloudSignIn(isMasterOwner = false): Promise<void> {
  if (!auth.currentUser) {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch {
      throw new Error('Cloud-la save aaga Google sign-in venum. Popup-a allow pannitu thirumba try pannunga.');
    }
  }
  if (isMasterOwner) {
    const email = (auth.currentUser?.email || '').toLowerCase();
    if (email !== MASTER_OWNER_EMAIL) {
      // sign out the wrong account so the next click asks for the right one
      try { await auth.signOut(); } catch {}
      throw new Error(`Master delete-ku ${MASTER_OWNER_EMAIL} account-la Google sign-in pannunga. (Ippo: ${email || 'unknown'})`);
    }
  }
}

// -------------------------------------------------------------
// TOMBSTONES: deleted ids are recorded in Firestore so EVERY visitor's
// browser purges them and stale local copies can never be re-uploaded.
// -------------------------------------------------------------
const deletedStudioIds = new Set<string>();
const deletedAnimeIds = new Set<string>();

function readTombstoneDocs(docs: { id: string }[]) {
  docs.forEach((d) => {
    if (d.id.startsWith('studio_')) deletedStudioIds.add(d.id.slice(7));
    else if (d.id.startsWith('anime_')) deletedAnimeIds.add(d.id.slice(6));
  });
}

// Removes every deleted studio/anime from memory + localStorage (+ watch history),
// and logs out a studio session whose studio was deleted.
function purgeDeleted(): boolean {
  let changed = false;

  const beforeStudios = memoryStudiosCache.length;
  memoryStudiosCache = memoryStudiosCache.filter((s) => !deletedStudioIds.has(s.id));
  if (memoryStudiosCache.length !== beforeStudios) changed = true;

  const removedAnimeIds: string[] = [];
  memoryAnimeCache = memoryAnimeCache.filter((a) => {
    const gone = deletedAnimeIds.has(a.id) || deletedStudioIds.has(a.studioId);
    if (gone) removedAnimeIds.push(a.id);
    return !gone;
  });
  if (removedAnimeIds.length) changed = true;
  removedAnimeIds.forEach((id) => removeWatchProgressForAnime(id));
  deletedAnimeIds.forEach((id) => removeWatchProgressForAnime(id));

  try {
    const raw = localStorage.getItem('zanft_current_studio') || localStorage.getItem('zanft_studio_session');
    if (raw) {
      const sess = JSON.parse(raw);
      if (sess?.studioId && deletedStudioIds.has(sess.studioId)) {
        localStorage.removeItem('zanft_current_studio');
        localStorage.removeItem('zanft_studio_session');
        window.dispatchEvent(new CustomEvent('zanft_studio_deleted'));
        changed = true;
      }
    }
  } catch {}

  if (changed) {
    syncCachesToStorage();
    notifyDataChanged();
  }
  return changed;
}

function startTombstoneSync() {
  try {
    onSnapshot(
      collection(db, 'tombstones'),
      (snapshot) => {
        readTombstoneDocs(snapshot.docs);
        purgeDeleted();
      },
      (err) => console.warn('Tombstone sync note:', err)
    );
  } catch (err) {
    console.warn('Tombstone setup note:', err);
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
        {
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
              topTenRank: data.topTenRank,
              trailer: data.trailer || undefined,
              cast: Array.isArray(data.cast) ? data.cast : undefined,
              category: data.category
            });
          });

          // Remove anime deleted remotely (and stale local ghosts) from the cache
          const remoteAnimeIds = new Set(remoteList.map((r) => r.id));
          snapshot.docChanges().forEach((ch) => {
            if (ch.type === 'removed') {
              const i = memoryAnimeCache.findIndex((a) => a.id === ch.doc.id);
              if (i !== -1) memoryAnimeCache.splice(i, 1);
            }
          });
          if (!snapshot.metadata.fromCache) {
            const owned = getOwnedStudioIds();
            memoryAnimeCache = memoryAnimeCache.filter((a) => remoteAnimeIds.has(a.id) || owned.has(a.studioId));
          }

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
          purgeDeleted();
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
        {
          // Remove studios deleted remotely (and stale local ghosts) from the cache
          snapshot.docChanges().forEach((ch) => {
            if (ch.type === 'removed') {
              const i = memoryStudiosCache.findIndex((s) => s.id === ch.doc.id);
              if (i !== -1) memoryStudiosCache.splice(i, 1);
            }
          });
          if (!snapshot.metadata.fromCache) {
            const remoteStudioIds = new Set(snapshot.docs.map((d) => d.id));
            const owned = getOwnedStudioIds();
            memoryStudiosCache = memoryStudiosCache.filter((s) => remoteStudioIds.has(s.id) || owned.has(s.id));
          }

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
          purgeDeleted();
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
      publicUpdates.updatedAt = new Date().toISOString();
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

// Returns a clean trailer, or undefined when no link was given (trailer is optional).
function normalizeTrailer(t?: Trailer | null): Trailer | undefined {
  if (!t) return undefined;
  const videoUrl = (t.videoUrl || '').trim();
  const botStreamUrl = (t.botStreamUrl || '').trim();
  if (!videoUrl && !botStreamUrl) return undefined;
  return { title: (t.title || '').trim() || 'Official Trailer', videoUrl, botStreamUrl };
}

export async function createAnimeFolder(
  animeData: {
    title: string;
    type: 'Series' | 'Movie';
    category?: ContentCategory; // Movies, Series, Anime Series, Anime Movies, K-Drama, K-Drama Movies
    genres: string[];
    synopsis: string;
    poster: string;
    banner?: string;
    initialEpisode?: {
      number?: number;
      title: string;
      videoUrl?: string; // Drive link
      botStreamUrl?: string; // Telegram bot stream link
      duration?: string;
      thumbnail?: string; // thumbnail of this video
    };
    trailer?: Trailer | null; // optional - can also be added later
    cast?: CastMember[]; // optional voice cast
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
  if (animeData.initialEpisode && (animeData.initialEpisode.videoUrl?.trim() || animeData.initialEpisode.botStreamUrl?.trim())) {
    const rawUrl = (animeData.initialEpisode.videoUrl || '').trim();
    const botUrl = (animeData.initialEpisode.botStreamUrl || '').trim();
    const driveInfo = getGoogleDriveStreamInfo(rawUrl);
    episodes.push({
      id: `ep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      number: animeData.initialEpisode.number || 1,
      title: animeData.initialEpisode.title?.trim() || (animeData.type === 'Movie' ? 'Full Feature Film' : 'Episode 1'),
      videoUrl: rawUrl,
      botStreamUrl: botUrl,
      duration: animeData.initialEpisode.duration?.trim() || (animeData.type === 'Movie' ? '1h 45m' : '24m'),
      thumbnail: animeData.initialEpisode.thumbnail?.trim() || driveInfo.thumbnailUrl || '',
      releaseDate: now
    });
  }

  const newAnime: CloudAnime = {
    id: animeId,
    title: animeData.title.trim(),
    type: animeData.type,
    category: animeData.category,
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
    trending: true,
    trailer: normalizeTrailer(animeData.trailer),
    cast: cleanCast(animeData.cast)
  };

  // 1. Save to Firestore FIRST. If it fails the studio sees the real reason,
  //    instead of the folder showing locally and vanishing on the next sync.
  assertDocSize(newAnime);
  await ensureCloudSignIn(false);
  try {
    await setDoc(doc(db, 'anime', animeId), cleanForFirestore(newAnime));
  } catch (err: any) {
    throw cloudSaveError(err, 'anime create');
  }

  // 2. Then update the live caches. The Firestore listener may already have added this folder
  //    (it fires as soon as the write starts), so replace instead of adding a second copy.
  const alreadyIdx = memoryAnimeCache.findIndex((a) => a.id === animeId);
  if (alreadyIdx !== -1) memoryAnimeCache[alreadyIdx] = newAnime;
  else memoryAnimeCache.unshift(newAnime);

  // Increment studio anime count in cache
  const studioIdx = memoryStudiosCache.findIndex((s) => s.id === studioId);
  if (studioIdx !== -1) {
    memoryStudiosCache[studioIdx].animeCount = (memoryStudiosCache[studioIdx].animeCount || 0) + 1;
  }

  syncCachesToStorage();
  notifyDataChanged();

  // 3. The studio's anime counter is cosmetic, so it stays non-blocking
  try {
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
    throw new Error('Permission denied: You can only edit folders belonging to your studio.');
  }

  // Save to Firestore FIRST so a failure is visible and the edit survives a refresh
  assertDocSize({ ...currentAnime, ...updateData });
  await ensureCloudSignIn(isMasterOwner);
  try {
    await updateDoc(
      doc(db, 'anime', animeId),
      cleanForFirestore({ ...updateData, updatedAt: new Date().toISOString() })
    );
  } catch (err: any) {
    throw cloudSaveError(err, 'anime update');
  }

  const idxNow = memoryAnimeCache.findIndex((a) => a.id === animeId);
  if (idxNow !== -1) {
    memoryAnimeCache[idxNow] = { ...memoryAnimeCache[idxNow], ...updateData };
  }

  syncCachesToStorage();
  notifyDataChanged();
}

export async function deleteAnimeFolder(
  animeId: string,
  currentStudioId: string,
  isMasterOwner: boolean,
  currentStudioName?: string
): Promise<void> {
  await ensureCloudSignIn(isMasterOwner);
  const animeIdx = memoryAnimeCache.findIndex((a) => a.id === animeId);
  if (animeIdx === -1) return;

  const currentAnime = memoryAnimeCache[animeIdx];
  const belongsToStudio =
    currentAnime.studioId === currentStudioId ||
    (Boolean(currentStudioName) && (currentAnime.studioName || '').trim().toLowerCase() === (currentStudioName || '').trim().toLowerCase());

  if (!isMasterOwner && !belongsToStudio) {
    throw new Error('Permission denied: You can only delete folders belonging to your studio.');
  }

  // Delete from Firestore first so other users stop seeing it; surface errors.
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'anime', animeId));
    batch.set(doc(db, 'tombstones', `anime_${animeId}`), { deletedAt: new Date().toISOString() });
    await batch.commit();
    deletedAnimeIds.add(animeId);
  } catch (err: any) {
    console.error('Firestore anime delete failed:', err);
    throw new Error(
      err?.code === 'permission-denied'
        ? `Cloud delete blocked by Firestore rules. Signed in as: ${auth.currentUser?.email || 'nobody'} - indha email rules la isMaster() la irukkanu check pannunga.`
        : 'Cloud delete failed. Check internet and try again.'
    );
  }

  memoryAnimeCache.splice(animeIdx, 1);

  // Decrement studio count
  const studioIdx = memoryStudiosCache.findIndex((s) => s.id === currentAnime.studioId);
  if (studioIdx !== -1) {
    memoryStudiosCache[studioIdx].animeCount = Math.max(0, (memoryStudiosCache[studioIdx].animeCount || 1) - 1);
  }

  syncCachesToStorage();
  notifyDataChanged();
}

export async function addEpisodeToAnime(
  animeId: string,
  episodeData: {
    number: number;
    title: string;
    videoUrl?: string; // Drive link
    botStreamUrl?: string; // Telegram bot stream link
    duration?: string;
    thumbnail?: string; // thumbnail of this video
  },
  currentStudioId: string,
  isMasterOwner: boolean
): Promise<void> {
  if (!episodeData.title.trim()) {
    throw new Error('Title is required.');
  }
  if (!(episodeData.videoUrl || '').trim() && !(episodeData.botStreamUrl || '').trim()) {
    throw new Error('Add at least one link: Bot link or Drive link.');
  }

  const animeIdx = memoryAnimeCache.findIndex((a) => a.id === animeId);
  if (animeIdx === -1) {
    throw new Error('Anime folder not found.');
  }

  const currentAnime = memoryAnimeCache[animeIdx];
  if (!isMasterOwner && currentAnime.studioId !== currentStudioId) {
    throw new Error('Permission denied: You can only add episodes to your own folders.');
  }

  const rawUrl = (episodeData.videoUrl || '').trim();
  const driveInfo = getGoogleDriveStreamInfo(rawUrl);

  const currentEpisodes: CloudEpisode[] = Array.isArray(currentAnime.episodes) ? currentAnime.episodes : [];
  const newEpisode: CloudEpisode = {
    id: `ep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    number: episodeData.number || currentEpisodes.length + 1,
    title: episodeData.title.trim(),
    videoUrl: rawUrl,
    botStreamUrl: (episodeData.botStreamUrl || '').trim(),
    duration: episodeData.duration || '24m',
    thumbnail: episodeData.thumbnail?.trim() || driveInfo.thumbnailUrl || '',
    releaseDate: new Date().toISOString()
  };

  const updatedEpisodes = slimEpisodes([...currentEpisodes, newEpisode], currentAnime).sort((a, b) => a.number - b.number);

  // Save to Firestore FIRST. If it fails the studio sees the real reason,
  // instead of the episode showing locally and vanishing on the next sync.
  assertDocSize({ ...currentAnime, episodes: updatedEpisodes });
  await ensureCloudSignIn(isMasterOwner);
  try {
    await updateDoc(
      doc(db, 'anime', animeId),
      cleanForFirestore({ episodes: updatedEpisodes, updatedAt: new Date().toISOString() })
    );
  } catch (err: any) {
    throw cloudSaveError(err, 'episode add');
  }

  const idxAfterAdd = memoryAnimeCache.findIndex((a) => a.id === animeId);
  if (idxAfterAdd !== -1) memoryAnimeCache[idxAfterAdd].episodes = updatedEpisodes;

  syncCachesToStorage();
  notifyDataChanged();
}

// Edit an existing episode / movie (title, number, duration and its links).
export async function updateEpisodeInAnime(
  animeId: string,
  episodeId: string,
  episodeData: {
    number: number;
    title: string;
    videoUrl?: string; // Drive link
    botStreamUrl?: string; // Bot link
    duration?: string;
    thumbnail?: string; // new thumbnail (empty keeps the current one)
  },
  currentStudioId: string,
  isMasterOwner: boolean
): Promise<void> {
  if (!episodeData.title.trim()) {
    throw new Error('Title is required.');
  }
  if (!(episodeData.videoUrl || '').trim() && !(episodeData.botStreamUrl || '').trim()) {
    throw new Error('Add at least one link: Bot link or Drive link.');
  }

  const animeIdx = memoryAnimeCache.findIndex((a) => a.id === animeId);
  if (animeIdx === -1) throw new Error('Anime folder not found.');

  const currentAnime = memoryAnimeCache[animeIdx];
  if (!isMasterOwner && currentAnime.studioId !== currentStudioId) {
    throw new Error('Permission denied: You can only edit episodes of your own folders.');
  }

  const currentEpisodes: CloudEpisode[] = Array.isArray(currentAnime.episodes) ? currentAnime.episodes : [];
  if (!currentEpisodes.some((e) => e.id === episodeId)) throw new Error('Episode not found.');

  const rawUrl = (episodeData.videoUrl || '').trim();
  const driveInfo = getGoogleDriveStreamInfo(rawUrl);

  const updatedEpisodes = slimEpisodes(currentEpisodes, currentAnime)
    .map((ep) =>
      ep.id !== episodeId
        ? ep
        : {
            ...ep,
            number: episodeData.number || ep.number,
            title: episodeData.title.trim(),
            videoUrl: rawUrl,
            botStreamUrl: (episodeData.botStreamUrl || '').trim(),
            duration: episodeData.duration || ep.duration || '24m',
            thumbnail: episodeData.thumbnail?.trim() || ep.thumbnail || driveInfo.thumbnailUrl || ''
          }
    )
    .sort((a, b) => a.number - b.number);

  assertDocSize({ ...currentAnime, episodes: updatedEpisodes });
  await ensureCloudSignIn(isMasterOwner);
  try {
    await updateDoc(
      doc(db, 'anime', animeId),
      cleanForFirestore({ episodes: updatedEpisodes, updatedAt: new Date().toISOString() })
    );
  } catch (err: any) {
    throw cloudSaveError(err, 'episode update');
  }

  const idxAfterEdit = memoryAnimeCache.findIndex((a) => a.id === animeId);
  if (idxAfterEdit !== -1) memoryAnimeCache[idxAfterEdit].episodes = updatedEpisodes;
  syncCachesToStorage();
  notifyDataChanged();
}

// Add / replace / remove (pass null) the trailer of an anime folder.
export async function setAnimeTrailer(
  animeId: string,
  trailer: Trailer | null,
  currentStudioId: string,
  isMasterOwner: boolean
): Promise<void> {
  await ensureCloudSignIn(isMasterOwner);
  const animeIdx = memoryAnimeCache.findIndex((a) => a.id === animeId);
  if (animeIdx === -1) throw new Error('Anime folder not found.');

  const currentAnime = memoryAnimeCache[animeIdx];
  if (!isMasterOwner && currentAnime.studioId !== currentStudioId) {
    throw new Error('Permission denied: You can only edit trailers of your own folders.');
  }

  const clean = normalizeTrailer(trailer);
  if (trailer && !clean) {
    throw new Error('Add at least one link: Bot link or Drive link.');
  }

  try {
    await updateDoc(doc(db, 'anime', animeId), cleanForFirestore({ trailer: clean ?? null, updatedAt: new Date().toISOString() }));
  } catch (err: any) {
    console.error('Firestore trailer save failed:', err);
    throw new Error(
      err?.code === 'permission-denied'
        ? 'Cloud save blocked by Firestore rules - Google sign-in pannitu thirumba try pannunga.'
        : 'Cloud save failed. Check internet and try again.'
    );
  }

  const idxAfterTrailer = memoryAnimeCache.findIndex((a) => a.id === animeId);
  if (idxAfterTrailer !== -1) memoryAnimeCache[idxAfterTrailer] = { ...memoryAnimeCache[idxAfterTrailer], trailer: clean };
  syncCachesToStorage();
  notifyDataChanged();
}

export async function deleteEpisodeFromAnime(
  animeId: string,
  episodeId: string,
  currentStudioId: string,
  isMasterOwner: boolean,
  currentStudioName?: string
): Promise<void> {
  await ensureCloudSignIn(isMasterOwner);
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
  const updatedEpisodes = slimEpisodes(currentEpisodes.filter((ep) => ep.id !== episodeId), currentAnime);

  // Save to Firestore FIRST so the delete survives a refresh; surface errors.
  try {
    await updateDoc(doc(db, 'anime', animeId), cleanForFirestore({ episodes: updatedEpisodes, updatedAt: new Date().toISOString() }));
  } catch (err: any) {
    console.error('Firestore episode delete failed:', err);
    throw new Error(
      err?.code === 'permission-denied'
        ? `Cloud delete blocked by Firestore rules. Signed in as: ${auth.currentUser?.email || 'nobody'} - indha email rules la isMaster() la irukkanu check pannunga.`
        : 'Cloud delete failed. Check internet and try again.'
    );
  }

  const idxAfterDelete = memoryAnimeCache.findIndex((a) => a.id === animeId);
  if (idxAfterDelete !== -1) memoryAnimeCache[idxAfterDelete].episodes = updatedEpisodes;

  syncCachesToStorage();
  notifyDataChanged();
}

export async function deleteStudio(studioId: string, authorized = true, isMasterOwner = false): Promise<void> {
  if (!authorized) {
    throw new Error('Authorized credentials required to delete studio.');
  }

  // 1. Delete from Firestore FIRST (studio doc + ALL its anime docs) so other
  //    users stop seeing it. Errors are surfaced instead of being swallowed.
  await ensureCloudSignIn(isMasterOwner);
  try {
    const studioName = memoryStudiosCache.find((s) => s.id === studioId)?.name;
    const queries = [getDocs(query(collection(db, 'anime'), where('studioId', '==', studioId)))];
    if (studioName) {
      // also catch anime that only match by studio name
      queries.push(getDocs(query(collection(db, 'anime'), where('studioName', '==', studioName))));
    }
    const snaps = await Promise.all(queries);
    const batch = writeBatch(db);
    const seen = new Set<string>();
    snaps.forEach((snap) =>
      snap.forEach((d) => {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          batch.delete(d.ref);
        }
      })
    );
    batch.delete(doc(db, 'studios', studioId));
    batch.set(doc(db, 'tombstones', `studio_${studioId}`), { deletedAt: new Date().toISOString() });
    seen.forEach((id) => batch.set(doc(db, 'tombstones', `anime_${id}`), { deletedAt: new Date().toISOString() }));
    await batch.commit();
    deletedStudioIds.add(studioId);
    seen.forEach((id) => deletedAnimeIds.add(id));
  } catch (err: any) {
    console.error('Firestore studio delete failed:', err);
    throw new Error(
      err?.code === 'permission-denied'
        ? `Cloud delete blocked by Firestore rules. Signed in as: ${auth.currentUser?.email || 'nobody'} - indha email rules la isMaster() la irukkanu check pannunga.`
        : 'Cloud delete failed. Check internet and try again.'
    );
  }

  // 2. Then clear local caches
  const studioIdx = memoryStudiosCache.findIndex((s) => s.id === studioId);
  if (studioIdx !== -1) {
    memoryStudiosCache.splice(studioIdx, 1);
  }
  memoryAnimeCache = memoryAnimeCache.filter((a) => a.studioId !== studioId);
  purgeDeleted();

  syncCachesToStorage();
  notifyDataChanged();
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
    const [studioSnap, animeSnap, tombSnap] = await Promise.all([
      getDocs(collection(db, 'studios')),
      getDocs(collection(db, 'anime')),
      getDocs(collection(db, 'tombstones'))
    ]);
    readTombstoneDocs(tombSnap.docs);
    purgeDeleted();
    const remoteStudioIds = new Set(studioSnap.docs.map((d) => d.id));
    const remoteAnimeIds = new Set(animeSnap.docs.map((d) => d.id));

    // Only upload what THIS user owns - otherwise stale local copies of studios
    // deleted by someone else would be re-created ("zombie studios").
    const owned = getOwnedStudioIds();
    for (const studio of memoryStudiosCache) {
      if (!remoteStudioIds.has(studio.id) && owned.has(studio.id) && !deletedStudioIds.has(studio.id)) {
        await setDoc(doc(db, 'studios', studio.id), toPublicStudio(studio));
      }
    }
    for (const anime of memoryAnimeCache) {
      if (!remoteAnimeIds.has(anime.id) && owned.has(anime.studioId) && !deletedAnimeIds.has(anime.id) && !deletedStudioIds.has(anime.studioId)) {
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

  startTombstoneSync();
  subscribeToStudios(() => {});
  subscribeToAnime(() => {});

  onAuthStateChanged(auth, (user) => {
    if (user) {
      syncLocalToFirestore();
    }
  });
}

startCloudSync();


/*
 * MERGE NOTE
 * The second pasted module used a different Firestore schema (nested studio/anime/episodes
 * subcollections). This project uses top-level `anime/{animeId}` documents with episodes
 * embedded in the `episodes` array. Its management operations are therefore merged into the
 * existing functions above instead of being pasted as duplicate exports.
 */
