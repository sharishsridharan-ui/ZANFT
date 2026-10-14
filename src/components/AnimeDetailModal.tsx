import React, { useState, useEffect } from 'react';
import { X, Play, Film, Building2, Share2, Check, Clock, Sparkles } from 'lucide-react';
import { Anime, Episode } from '../types';
import { StarRating } from './StarRating';
import { getGoogleDriveStreamInfo } from '../firebase';

interface AnimeDetailModalProps {
  anime: Anime | null;
  onClose: () => void;
  onPlayEpisode: (anime: Anime, episode: Episode) => void;
  onSelectStudio: (studioName: string) => void;
}

export const AnimeDetailModal: React.FC<AnimeDetailModalProps> = ({
  anime,
  onClose,
  onPlayEpisode,
  onSelectStudio
}) => {
  const [showShareToast, setShowShareToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Link copied to clipboard!');
  const [isCopied, setIsCopied] = useState(false);
  const [copiedEpisodeId, setCopiedEpisodeId] = useState<string | null>(null);

  useEffect(() => {
    if (!showShareToast) return;
    const timer = setTimeout(() => setShowShareToast(false), 2500);
    return () => clearTimeout(timer);
  }, [showShareToast]);

  if (!anime) return null;

  const episodes = anime.episodes || [];

  const handleShareEpisode = async (ep?: Episode) => {
    const targetEpisode = ep || (episodes.length > 0 ? episodes[0] : null);
    const episodeSuffix = targetEpisode ? ` - Ep ${targetEpisode.number}` : '';
    const shareTitle = `${anime.title}${episodeSuffix}`;
    const shareText = 'Check out this anime episode on ZANFT!';
    const shareUrl = `${window.location.origin}${window.location.pathname}?anime=${encodeURIComponent(anime.id)}${targetEpisode ? `&ep=${encodeURIComponent(targetEpisode.id)}` : ''}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
        triggerCopiedFeedback(targetEpisode?.id);
        return;
      } catch (err: any) {
        // If user cancelled, do not fallback
        if (err?.name === 'AbortError') return;
      }
    }

    // Fallback to Clipboard API
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch {
        // Fallback prompt or continue
      }
    }
    setToastMessage('Link copied to clipboard!');
    setShowShareToast(true);
    triggerCopiedFeedback(targetEpisode?.id);
  };

  const triggerCopiedFeedback = (epId?: string) => {
    if (epId) {
      setCopiedEpisodeId(epId);
      setTimeout(() => setCopiedEpisodeId(null), 2000);
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-surface border border-white/15 rounded-3xl shadow-2xl overflow-y-auto my-auto no-scrollbar">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-black/75 hover:bg-brand text-white flex items-center justify-center transition-all cursor-pointer border border-white/10 shadow-lg"
          title="Close Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Global Toast Notification */}
        {showShareToast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-emerald-600/90 border border-emerald-400 text-white text-xs font-semibold shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-top duration-200">
            <Check className="w-4 h-4 text-white" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Desktop 2-Column Responsive Layout */}
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Left Column: Hero/Poster Artwork & Quick Actions */}
            <div className="lg:col-span-5 space-y-4">
              <div className="relative aspect-[16/10] sm:aspect-video lg:aspect-[3/4] w-full rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl group">
                {[anime.poster, anime.banner].find((u) => u && u.trim().length > 0) ? (
                  <img
                    src={[anime.poster, anime.banner].find((u) => u && u.trim().length > 0)}
                    alt={anime.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-600">
                    <Film className="w-12 h-12" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent" />

                {/* Floating Badges */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-brand text-white text-[10px] font-black uppercase tracking-wider shadow-lg">
                    {anime.type}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    {anime.matchPercentage || 98}% Score
                  </span>
                </div>
              </div>

              {/* Quick Action Buttons Bar */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {episodes.length > 0 && (
                  <button
                    onClick={() => onPlayEpisode(anime, episodes[0])}
                    className="flex-1 min-w-[140px] flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-deep text-white font-bold text-sm shadow-lg shadow-brand/40 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Play Ep #1</span>
                  </button>
                )}

                {/* Modern Sleek Share Episode Pill Button */}
                <button
                  onClick={() => handleShareEpisode()}
                  className={`flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm font-medium text-white transition-all cursor-pointer active:scale-95 ${
                    isCopied ? 'bg-emerald-700/80 border-emerald-500 text-emerald-100' : ''
                  }`}
                  title="Share this episode"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 text-zinc-300" />
                      <span>Share Episode</span>
                    </>
                  )}
                </button>
              </div>

              {/* Studio Info Badge */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center text-brand flex-shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] text-zinc-400 block font-medium">Produced By</span>
                    <span className="text-xs font-bold text-white truncate block">{anime.studioName}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    onSelectStudio(anime.studioName);
                  }}
                  className="text-xs font-bold text-brand hover:underline px-2 py-1 flex-shrink-0 cursor-pointer"
                >
                  View Studio
                </button>
              </div>
            </div>

            {/* Right Column: Title, Metadata, Synopsis, Ratings & Episode List */}
            <div className="lg:col-span-7 space-y-5">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    HD Stream
                  </span>
                  <span className="text-zinc-400 text-xs font-semibold">{anime.rating || 'TV-14'}</span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-zinc-400 text-xs font-semibold">{anime.year || 2025}</span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-zinc-400 text-xs font-semibold">{episodes.length} Episodes</span>
                </div>

                <h1 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight leading-tight">
                  {anime.title}
                </h1>

                {anime.japaneseTitle && (
                  <p className="text-xs text-zinc-400 font-mono mt-1">
                    {anime.japaneseTitle}
                  </p>
                )}
              </div>

              {/* Genres */}
              {anime.genres && anime.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {anime.genres.map((genre, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-zinc-300 text-xs font-medium"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* Synopsis */}
              <div className="space-y-1.5">
                <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-bold flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand" />
                  <span>Storyline & Synopsis</span>
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal">
                  {anime.synopsis || 'No synopsis provided for this title.'}
                </p>
              </div>

              {/* Viewer Reviews & Rating */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-bold">
                  Viewer Reviews & Rating
                </h3>
                <StarRating animeId={anime.id} />
              </div>

              {/* Episode List */}
              <div className="pt-3 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-white text-base sm:text-lg">
                    Available Episodes ({episodes.length})
                  </h3>
                  <span className="text-xs text-zinc-400">Google Drive Video Streaming</span>
                </div>

                {episodes.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic py-4">
                    No episodes uploaded yet for this title.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {episodes.map((ep) => {
                      const driveInfo = getGoogleDriveStreamInfo(ep.videoUrl);
                      const thumb = [ep.thumbnail, driveInfo.thumbnailUrl, anime.poster].find((u) => u && u.trim().length > 0) || null;
                      const isThisEpCopied = copiedEpisodeId === ep.id;

                      return (
                        <div
                          key={ep.id}
                          className="group p-3 rounded-2xl bg-black/40 hover:bg-white/5 border border-white/5 hover:border-white/20 transition-all flex items-center justify-between gap-3"
                        >
                          <div
                            onClick={() => onPlayEpisode(anime, ep)}
                            className="flex items-center space-x-3 min-w-0 flex-1 cursor-pointer"
                          >
                            <span className="w-8 h-8 rounded-xl bg-white/5 group-hover:bg-brand text-zinc-300 group-hover:text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 transition-colors">
                              #{ep.number}
                            </span>

                            {thumb ? (
                              <div className="relative w-16 aspect-video rounded-lg overflow-hidden border border-white/10 flex-shrink-0 bg-black">
                                <img
                                  src={thumb}
                                  alt={ep.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Play className="w-4 h-4 text-white fill-white" />
                                </div>
                              </div>
                            ) : null}

                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-white text-xs sm:text-sm truncate group-hover:text-brand transition-colors">
                                {ep.title}
                              </h4>
                              <p className="text-[11px] text-zinc-400 font-mono mt-0.5 flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-zinc-500" />
                                <span>{ep.duration || '24m'}</span>
                              </p>
                            </div>
                          </div>

                          {/* Actions: Share & Play */}
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShareEpisode(ep);
                              }}
                              className={`p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 transition-all cursor-pointer ${
                                isThisEpCopied ? 'text-emerald-400 bg-emerald-500/20' : 'text-zinc-400 hover:text-white'
                              }`}
                              title={`Share Episode ${ep.number}`}
                            >
                              {isThisEpCopied ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Share2 className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onPlayEpisode(anime, ep);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-brand hover:bg-brand-deep text-xs font-bold text-white transition-all flex items-center space-x-1 shadow-md active:scale-95 cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" />
                              <span>Play</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
