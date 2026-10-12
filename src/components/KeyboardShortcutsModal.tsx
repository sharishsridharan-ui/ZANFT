import React from 'react';
import { X, Keyboard, Search, Home, Bookmark, Tv, Film, Building2, PieChart, Sparkles } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  key: string;
  label: string;
  description: string;
  category: 'Navigation' | 'Actions' | 'General';
}

const SHORTCUTS: ShortcutItem[] = [
  {
    key: 'H',
    label: 'Home',
    description: 'Jump to Home featured view & cinema rows',
    category: 'Navigation'
  },
  {
    key: 'S',
    label: 'Search',
    description: 'Focus real-time search with instant autocomplete',
    category: 'Navigation'
  },
  {
    key: 'A',
    label: 'Anime Series',
    description: 'Browse serialized television productions',
    category: 'Navigation'
  },
  {
    key: 'F',
    label: 'Films / Movies',
    description: 'Browse cinematic theatrical movies',
    category: 'Navigation'
  },
  {
    key: 'D',
    label: 'Studios',
    description: 'Open verified fandub studios directory',
    category: 'Navigation'
  },
  {
    key: '?',
    label: 'Help / Shortcuts',
    description: 'Toggle this keyboard shortcuts cheatsheet modal',
    category: 'General'
  },
  {
    key: 'Esc',
    label: 'Dismiss / Close',
    description: 'Close active modal, video player, or clear search',
    category: 'General'
  }
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="fixed inset-0 -z-10" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#090C17] border border-white/15 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.9)] p-5 sm:p-7 my-auto animate-in zoom-in-95 duration-200 text-white space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#E50914]/20 border border-[#E50914]/40 flex items-center justify-center text-[#E50914] shadow-md">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-syne text-xl sm:text-2xl font-black text-white tracking-tight">
                  Keyboard Shortcuts
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Global
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Navigate ZANFT faster with single-key accessibility shortcuts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-[#E50914] text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close Shortcuts Modal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts List by Groups */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {SHORTCUTS.map((shortcut) => (
              <div
                key={shortcut.key}
                className="flex items-center justify-between p-3 rounded-xl bg-[#101424] border border-white/5 hover:border-white/20 transition-colors"
              >
                <div className="space-y-0.5 pr-2">
                  <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <span>{shortcut.label}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-tight">
                    {shortcut.description}
                  </p>
                </div>

                <kbd className="px-2.5 py-1 text-xs font-mono font-black text-white bg-black/60 border border-white/25 rounded-lg shadow-[0_2px_0_rgba(255,255,255,0.2)] flex-shrink-0 min-w-8 text-center text-[#00F2FE]">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info banner */}
        <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-400">
          <div className="flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#E50914]" />
            <span>Shortcuts automatically pause when typing in input fields.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Got it (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
