import React from 'react';
import { X } from 'lucide-react';
import { SHORTCUTS } from '../data/shortcuts';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="relative w-full max-w-lg bg-ink-deep border border-line rounded-2xl p-6 my-auto text-white space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold">Keyboard shortcuts</h2>
            <p className="text-sm text-zinc-400 mt-1">They pause while you type in a text field.</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-300"
            aria-label="Close shortcuts"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ul className="divide-y divide-line">
          {SHORTCUTS.map((s) => (
            <li key={s.action} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-semibold">{s.label}</p>
                <p className="text-xs text-zinc-400">{s.description}</p>
              </div>
              <kbd className="min-w-9 text-center px-2.5 py-1 rounded-md bg-surface-raised border border-line text-amber font-mono text-sm font-bold">
                {s.display}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
