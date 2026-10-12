import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  where,
  runTransaction
} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyArnOaFUCTJrVQAiqyrEQZ7Cs3xxoBKfbU",
  authDomain: "zanft-2026.firebaseapp.com",
  projectId: "zanft-2026",
  storageBucket: "zanft-2026.firebasestorage.app",
  messagingSenderId: "278757022754",
  appId: "1:278757022754:web:99e79b14afb5b38b77fe7b",
  measurementId: "G-MDVK2KDKJN"
};

// Initialize or reuse Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firebase Analytics if supported
export let analytics: any = null;
if (typeof window !== 'undefined') {
  isSupported()
    .then((yes) => {
      if (yes) analytics = getAnalytics(app);
    })
    .catch(() => {});
}

// Maximum allowed studio registrations
export const MAX_STUDIO_CAPACITY = 100;

// Master Owner exact credentials
export const MASTER_OWNER_CREDENTIALS = {
  username: "namma tha..",
  password: "athuvum namma tha.."
};

/**
 * Extracts a Google Drive file ID from any valid public Google Drive link:
 * - https://drive.google.com/file/d/FILE_ID/view...
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID
 * - https://docs.google.com/file/d/FILE_ID...
 * - Or raw FILE_ID
 */
export function extractGoogleDriveId(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();

  // 1. Matches /d/FILE_ID (works for /file/d/ID, /d/ID, /file/u/0/d/ID, etc.)
  const dMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (dMatch && dMatch[1]) return dMatch[1];

  // 2. Matches ?id=FILE_ID or &id=FILE_ID
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) return idMatch[1];

  // 3. Raw Google Drive file ID (usually 25-50 characters)
  if (/^[a-zA-Z0-9_-]{20,60}$/.test(trimmed)) {
    return trimmed;
  }
  return '';
}

export function getGoogleDriveStreamInfo(urlOrId: string) {
  const fileId = extractGoogleDriveId(urlOrId);
  return {
    isDrive: Boolean(fileId),
    fileId,
    previewUrl: fileId ? `https://drive.google.com/file/d/${fileId}/preview` : '',
    directStreamUrl: fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : urlOrId,
    altStreamUrl: fileId ? `https://drive.usercontent.google.com/download?id=${fileId}&export=download` : urlOrId,
    thumbnailUrl: fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1280` : ''
  };
}

/**
 * Extracts YouTube video ID from any valid YouTube URL
 */
export function extractYouTubeId(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  const regExp = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regExp);
  if (match && match[1]) {
    return match[1];
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  return '';
}
