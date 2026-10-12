import React, { useEffect, useState } from 'react';
import { Sparkles, Command } from 'lucide-react';

interface ShortcutToastProps {
  shortcutKey: string;
  actionName: string;
}

export const ShortcutToast: React.FC<ShortcutToastProps> = ({ shortcutKey, actionName }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-center space-x-2.5 px-3.5 py-2 rounded-xl bg-[#0F1322]/95 border border-[#E50914]/50 shadow-[0_0_20px_rgba(229,9,20,0.35)] backdrop-blur-md text-white">
        <kbd className="px-2 py-0.5 rounded bg-black/70 border border-white/20 text-[#00F2FE] font-mono text-xs font-bold shadow-inner">
          {shortcutKey}
        </kbd>
        <span className="text-xs font-medium text-zinc-200">
          {actionName}
        </span>
      </div>
    </div>
  );
};
