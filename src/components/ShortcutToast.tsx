import React, { useEffect } from 'react';

interface ShortcutToastProps {
  shortcutKey: string;
  actionName: string;
  onDone: () => void;
}

/** Shows which shortcut just fired, then dismisses itself. */
export const ShortcutToast: React.FC<ShortcutToastProps> = ({ shortcutKey, actionName, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 1600);
    return () => clearTimeout(t);
  }, [shortcutKey, actionName, onDone]);

  return (
    <div className="fixed bottom-6 right-6 z-50 pointer-events-none" role="status">
      <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-surface-raised border border-line shadow-xl text-white">
        <kbd className="px-2 py-0.5 rounded bg-black/50 border border-line text-amber font-bold text-xs">
          {shortcutKey}
        </kbd>
        <span className="text-xs font-medium text-zinc-200">{actionName}</span>
      </div>
    </div>
  );
};
