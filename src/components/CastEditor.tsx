import React from 'react';
import { Plus, Trash2, Send, Instagram } from 'lucide-react';
import { CastMember, CastRole } from '../types';
import { CAST_ROLES, newCastMember, castRowStarted } from '../utils/cast';

interface CastEditorProps {
  cast: CastMember[];
  onChange: (cast: CastMember[]) => void;
  /** Turns on the red "missing" marks. */
  showErrors?: boolean;
}

const inputBase =
  'w-full px-3 py-2 bg-black/50 border rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-brand transition-colors';

export const CastEditor: React.FC<CastEditorProps> = ({ cast, onChange, showErrors }) => {
  const update = (id: string, patch: Partial<CastMember>) =>
    onChange(cast.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  const rows = cast.length > 0 ? cast : [];

  return (
    <div className="space-y-3">
      {rows.map((m, i) => {
        const missingName = showErrors && castRowStarted(m) && !m.characterName.trim();
        return (
          <div key={m.id} className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300">Voice {i + 1}</span>
              <button
                type="button"
                onClick={() => onChange(cast.filter((x) => x.id !== m.id))}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                aria-label={`Remove voice ${i + 1}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Character name</label>
              <input
                type="text"
                value={m.characterName}
                onChange={(e) => update(m.id, { characterName: e.target.value })}
                placeholder="e.g. Shoya Ishida"
                className={`${inputBase} ${missingName ? 'border-red-500' : 'border-white/15'}`}
              />
              {missingName && <p className="text-[11px] font-bold text-red-400">Character name is required.</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Character type</label>
              <div className="grid grid-cols-3 gap-2">
                {CAST_ROLES.map((role: CastRole) => (
                  <button
                    type="button"
                    key={role}
                    onClick={() => update(m.id, { role })}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      m.role === role
                        ? 'bg-brand text-white border-brand'
                        : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-sky-400" /> Telegram ID
                </label>
                <input
                  type="text"
                  value={m.telegramId}
                  onChange={(e) => update(m.id, { telegramId: e.target.value })}
                  placeholder="@username or paste link"
                  className={`${inputBase} border-white/15`}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Instagram className="w-3.5 h-3.5 text-pink-400" /> Instagram ID
                </label>
                <input
                  type="text"
                  value={m.instagramId}
                  onChange={(e) => update(m.id, { instagramId: e.target.value })}
                  placeholder="@username or paste link"
                  className={`${inputBase} border-white/15`}
                />
              </div>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onChange([...cast, newCastMember()])}
        className="w-full py-2.5 rounded-xl border-2 border-dashed border-white/20 hover:border-brand hover:bg-brand/5 text-zinc-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        {cast.length === 0 ? 'Add the first voice' : 'Add another voice'}
      </button>
    </div>
  );
};
