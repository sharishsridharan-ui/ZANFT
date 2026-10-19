import { StudioSession, OwnerSession } from '../types';

const STUDIO_KEY = 'zanft_current_studio';
const LEGACY_STUDIO_KEY = 'zanft_studio_session'; // older builds wrote a second copy here
const OWNER_KEY = 'zanft_owner_session';

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function loadStudioSession(): StudioSession | null {
  const current = read<StudioSession>(STUDIO_KEY);
  if (current) return current;
  const legacy = read<StudioSession>(LEGACY_STUDIO_KEY);
  if (legacy) saveStudioSession(legacy); // migrate once
  return legacy;
}

export function saveStudioSession(session: StudioSession): void {
  try {
    localStorage.setItem(STUDIO_KEY, JSON.stringify(session));
    localStorage.removeItem(LEGACY_STUDIO_KEY);
  } catch {}
}

export function clearStudioSession(): void {
  try {
    localStorage.removeItem(STUDIO_KEY);
    localStorage.removeItem(LEGACY_STUDIO_KEY);
  } catch {}
}

export const loadOwnerSession = (): OwnerSession | null => read<OwnerSession>(OWNER_KEY);

export function saveOwnerSession(session: OwnerSession): void {
  try {
    localStorage.setItem(OWNER_KEY, JSON.stringify(session));
  } catch {}
}

export function clearOwnerSession(): void {
  try {
    localStorage.removeItem(OWNER_KEY);
  } catch {}
}
