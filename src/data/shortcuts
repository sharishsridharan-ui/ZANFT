export type ShortcutAction = 'home' | 'anime' | 'movies' | 'studios' | 'search' | 'help';

export interface ShortcutDef {
  keys: string[];
  display: string;
  action: ShortcutAction;
  label: string;
  description: string;
  category: 'Navigation' | 'General';
}

/** Single source of truth: App.tsx handles these keys and the help modal lists them. */
export const SHORTCUTS: ShortcutDef[] = [
  { keys: ['h'], display: 'H', action: 'home', label: 'Home', description: 'Go to the home page', category: 'Navigation' },
  { keys: ['a'], display: 'A', action: 'anime', label: 'Series', description: 'Browse anime series', category: 'Navigation' },
  { keys: ['m', 'f'], display: 'M', action: 'movies', label: 'Movies', description: 'Browse anime movies', category: 'Navigation' },
  { keys: ['d'], display: 'D', action: 'studios', label: 'Studios', description: 'Open the studios directory', category: 'Navigation' },
  { keys: ['s', '/'], display: 'S', action: 'search', label: 'Search', description: 'Focus the search box', category: 'Navigation' },
  { keys: ['?'], display: '?', action: 'help', label: 'Shortcuts', description: 'Show or hide this list', category: 'General' },
];
