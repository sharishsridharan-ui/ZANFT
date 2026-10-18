import React from 'react';
import { CheckCircle2, Clapperboard, X, Check, Trash2, Send, ImageIcon } from 'lucide-react';
import { compressImage } from '../utils/image';
import { getGoogleDriveStreamInfo } from '../firebase';
import { Trailer } from '../types';

const inputCls =
  'w-full px-3.5 py-2 bg-black/50 border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-[#E50914]';
const labelCls = 'font-semibold text-zinc-300';

// -------------------------------------------------------------
// Two link boxes used for every video: episode, movie and trailer
//   Bot Link   -> Server 1 (the link @Zanft_bot gives you)
//   Drive Link -> Server 2 (optional backup)
// -------------------------------------------------------------
export const BOT_USERNAME = 'Zanft_bot';

interface StreamLinkFieldsProps {
  driveUrl: string;
  botUrl: string;
  onDriveChange: (v: string) => void;
  onBotChange: (v: string) => void;
  /** Marks both boxes red (used when the form is sent without any link). */
  invalid?: boolean;
}

export const StreamLinkFields: React.FC<StreamLinkFieldsProps> = ({ driveUrl, botUrl, onDriveChange, onBotChange, invalid }) => {
  const hasDrive = driveUrl.trim().length > 0;
  const hasBot = botUrl.trim().length > 0;
  const driveOk = getGoogleDriveStreamInfo(driveUrl).isDrive;
  const redBox = invalid && !hasDrive && !hasBot ? ' !border-red-500' : '';

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className={`${labelCls} flex items-center justify-between gap-2`}>
          <span>Bot Link</span>
          <a
            href={`https://t.me/${BOT_USERNAME}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[11px] font-bold hover:bg-sky-500/25"
          >
            <Send className="w-3 h-3" /> @{BOT_USERNAME}
          </a>
        </label>
        <input
          type="text"
          value={botUrl}
          onChange={(e) => onBotChange(e.target.value)}
          placeholder={`Paste the link @${BOT_USERNAME} sent you`}
          className={inputCls + redBox}
        />
        <p className="text-[11px] text-zinc-400">
          Send your video to <strong className="text-zinc-200">@{BOT_USERNAME}</strong> on Telegram. It replies with a link, paste that link here.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className={labelCls}>
          Drive Link <span className="text-zinc-500 font-normal">(optional backup)</span>
        </label>
        <input
          type="text"
          value={driveUrl}
          onChange={(e) => onDriveChange(e.target.value)}
          placeholder="https://drive.google.com/file/d/.../view"
          className={inputCls + redBox}
        />
        {driveOk && (
          <p className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Drive link verified
          </p>
        )}
      </div>

      <p className={`text-[11px] text-zinc-400 ${invalid && !hasDrive && !hasBot ? 'hidden' : ''}`}>
        {hasDrive && hasBot
          ? 'Viewers will see: Server 1 (Bot) + Server 2 (Drive)'
          : hasBot
          ? 'Viewers will see: Server 1 (Bot)'
          : hasDrive
          ? 'Viewers will see: Server 1 (Drive)'
          : 'Add at least one link'}
      </p>
      {invalid && !hasDrive && !hasBot && (
        <p className="text-[11px] font-bold text-red-400">Add at least one link: the Bot link or the Drive link.</p>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// Thumbnail for ONE video (an episode or a movie), not for the folder
// -------------------------------------------------------------
interface ThumbnailFieldProps {
  value: string;
  onChange: (v: string) => void;
  /** Shows the box in red (used when the form is submitted without a thumbnail). */
  invalid?: boolean;
  noun?: string; // 'Movie' or 'Episode'
}

export const ThumbnailField: React.FC<ThumbnailFieldProps> = ({ value, onChange, invalid, noun = 'video' }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const pick = async (file?: File) => {
    if (!file) return;
    setErr(null);
    try {
      // small on purpose: every thumbnail is stored inside the folder document
      onChange(await compressImage(file, 640, 360, 0.78));
    } catch (e: any) {
      setErr(e.message || 'Could not use that image.');
    }
  };

  return (
    <div className="space-y-1.5">
      <label className={`${labelCls} flex items-center gap-1.5`}>
        <ImageIcon className="w-3.5 h-3.5 text-brand" />
        <span>Upload Your Thumbnail</span>
        <span className="text-zinc-500 font-normal">(for this {noun.toLowerCase()})</span>
      </label>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <div
        className={`flex items-center gap-3 p-3 rounded-2xl bg-black/50 border transition-colors ${
          invalid && !value ? 'border-red-500 bg-red-500/5' : 'border-white/15'
        }`}
      >
        <div className="w-28 aspect-video rounded-lg overflow-hidden border border-white/15 bg-zinc-900 flex-shrink-0">
          {value ? (
            <img src={value} alt="Thumbnail preview" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500">16:9</div>
          )}
        </div>
        <div className="min-w-0 space-y-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer"
          >
            {value ? 'Change thumbnail' : 'Choose thumbnail'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="ml-2 text-[11px] text-zinc-400 hover:text-red-300 cursor-pointer"
            >
              Remove
            </button>
          )}
          <p className="text-[11px] text-zinc-400">Shown on this {noun.toLowerCase()}'s card, not on the folder.</p>
        </div>
      </div>
      {invalid && !value && <p className="text-[11px] font-bold text-red-400">Thumbnail is required.</p>}
      {err && <p className="text-[11px] font-bold text-red-400">{err}</p>}
    </div>
  );
};

// -------------------------------------------------------------
// Trailer fields (name + the two links)
// -------------------------------------------------------------
export interface TrailerDraft {
  title: string;
  driveUrl: string;
  botUrl: string;
}

export const emptyTrailerDraft: TrailerDraft = { title: '', driveUrl: '', botUrl: '' };

export const trailerToDraft = (t?: Trailer | null): TrailerDraft =>
  t ? { title: t.title || '', driveUrl: t.videoUrl || '', botUrl: t.botStreamUrl || '' } : emptyTrailerDraft;

export const draftToTrailer = (d: TrailerDraft): Trailer | null => {
  const videoUrl = d.driveUrl.trim();
  const botStreamUrl = d.botUrl.trim();
  if (!videoUrl && !botStreamUrl) return null;
  return { title: d.title.trim() || 'Official Trailer', videoUrl, botStreamUrl };
};

export const TrailerFields: React.FC<{ value: TrailerDraft; onChange: (v: TrailerDraft) => void }> = ({ value, onChange }) => (
  <div className="space-y-3">
    <div className="space-y-1">
      <label className={labelCls}>Trailer Name</label>
      <input
        type="text"
        value={value.title}
        onChange={(e) => onChange({ ...value, title: e.target.value })}
        placeholder="Official Trailer"
        className="w-full px-3.5 py-2 bg-black/50 border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-[#E50914]"
      />
    </div>
    <StreamLinkFields
      driveUrl={value.driveUrl}
      botUrl={value.botUrl}
      onDriveChange={(v) => onChange({ ...value, driveUrl: v })}
      onBotChange={(v) => onChange({ ...value, botUrl: v })}
    />
  </div>
);

// -------------------------------------------------------------
// Create-folder step: "Trailer" -> Now / Maybe later
// -------------------------------------------------------------
export type TrailerMode = 'now' | 'later';

interface TrailerStepFieldsProps {
  mode: TrailerMode;
  onModeChange: (m: TrailerMode) => void;
  draft: TrailerDraft;
  onDraftChange: (d: TrailerDraft) => void;
}

export const TrailerStepFields: React.FC<TrailerStepFieldsProps> = ({ mode, onModeChange, draft, onDraftChange }) => {
  const choiceCls = (active: boolean) =>
    `flex-1 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
      active
        ? 'bg-[#E50914] border-[#E50914] text-white shadow-md shadow-[#E50914]/30'
        : 'bg-white/5 border-white/15 text-zinc-300 hover:bg-white/10'
    }`;

  return (
    <div className="space-y-4">
      <div className="p-3 bg-black/40 rounded-2xl border border-white/10 text-[11px] text-zinc-300 flex items-start gap-2">
        <Clapperboard className="w-4 h-4 text-[#E50914] flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white">Trailer</span>
          <p className="text-zinc-400 mt-0.5">Trailer upload panradhu ungal choice. Ippo add pannalaam, illa pinnaadi add pannalaam.</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => onModeChange('now')} className={choiceCls(mode === 'now')}>
          Now
        </button>
        <button type="button" onClick={() => onModeChange('later')} className={choiceCls(mode === 'later')}>
          Maybe Later
        </button>
      </div>

      {mode === 'now' ? (
        <TrailerFields value={draft} onChange={onDraftChange} />
      ) : (
        <p className="text-[11px] text-zinc-500 italic">
          Trailer skip aagum. Folder kulla "Trailer" button la eppo venalum add pannalaam.
        </p>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// "Trailer" popup opened from a folder (add / edit / remove)
// -------------------------------------------------------------
interface TrailerEditorModalProps {
  animeTitle: string;
  initial?: Trailer | null;
  loading?: boolean;
  onSave: (trailer: Trailer) => void;
  onRemove?: () => void;
  onClose: () => void;
}

export const TrailerEditorModal: React.FC<TrailerEditorModalProps> = ({ animeTitle, initial, loading, onSave, onRemove, onClose }) => {
  const [draft, setDraft] = React.useState<TrailerDraft>(trailerToDraft(initial));
  const [error, setError] = React.useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trailer = draftToTrailer(draft);
    if (!trailer) {
      setError('Add at least one link: Bot link or Drive link.');
      return;
    }
    setError(null);
    onSave(trailer);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <form
        onSubmit={handleSave}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#0D101C] border border-white/15 rounded-3xl p-5 sm:p-6 space-y-4 text-xs shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-syne font-bold text-white text-base flex items-center gap-2">
              <Clapperboard className="w-4 h-4 text-[#E50914]" />
              {initial ? 'Edit Trailer' : 'Add Trailer'}
            </h3>
            <p className="text-zinc-400 text-[11px] truncate mt-0.5">{animeTitle}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 cursor-pointer" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <TrailerFields value={draft} onChange={setDraft} />

        {error && <p className="text-[11px] text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">{error}</p>}

        <div className="flex items-center justify-between gap-2 pt-1">
          {initial && onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 font-bold cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#E50914] hover:bg-[#B0000D] disabled:opacity-50 text-white font-bold cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{loading ? 'Saving...' : 'Save Trailer'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
