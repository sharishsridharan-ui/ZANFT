import { CastMember, CastRole } from '../types';

export const CAST_ROLES: CastRole[] = ['Main', 'Side', 'Background'];

/** Accepts "@name", "name" or a full t.me / instagram.com link and returns just the handle. */
export function normalizeHandle(value: string): string {
  let v = (value || '').trim();
  if (!v) return '';
  v = v.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  v = v.replace(/^(t\.me|telegram\.me|instagram\.com)\//i, '');
  v = v.split(/[/?#]/)[0];
  return v.replace(/^@/, '').trim();
}

export const telegramUrl = (handle: string) => `https://t.me/${normalizeHandle(handle)}`;
export const instagramUrl = (handle: string) => `https://instagram.com/${normalizeHandle(handle)}`;

export function newCastMember(): CastMember {
  return {
    id: `cast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    characterName: '',
    role: 'Main',
    telegramId: '',
    instagramId: ''
  };
}

/** True when the row has anything typed in it. */
export const castRowStarted = (m: CastMember) =>
  Boolean(m.characterName.trim() || m.telegramId.trim() || m.instagramId.trim());

/** Cleans the list before saving: drops empty rows and tidies the handles. */
export function cleanCast(list?: CastMember[] | null): CastMember[] {
  return (list || [])
    .filter((m) => m.characterName.trim())
    .map((m) => ({
      id: m.id,
      characterName: m.characterName.trim(),
      role: CAST_ROLES.includes(m.role) ? m.role : 'Main',
      telegramId: normalizeHandle(m.telegramId),
      instagramId: normalizeHandle(m.instagramId)
    }));
}
