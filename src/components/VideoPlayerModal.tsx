import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Tv,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  Film,
  Building2,
  Play,
  RotateCcw,
  CheckCircle2,
  Share2,
  Check,
  Clock,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Server,
  Ratio
} from 'lucide-react';
import { Anime, Episode } from '../types';
import { getGoogleDriveStreamInfo, extractYouTubeId } from '../firebase';
import { itemLabel, itemShortLabel, isMovie } from '../data/labels';

interface VideoPlayerModalProps {
  anime: Anime | null;
  episode: Episode | null;
  onClose: () => void;
  onNextEpisode: () => void;
  onSelectEpisode?: (episode: Episode) => void;
  hasNextEpisode: boolean;
  nextEpisode?: Episode | null;
  resumeTime?: number;
  autoPlayNext?: boolean;
  onToggleAutoPlayNext?: () => void;
  allAnime?: Anime[];
}

// Shared class for the 5 option buttons (equal size, centered content)
const optionBtn =
  'w-full min-w-0 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-medium text-zinc-200 hover:text-white transition-all cursor-pointer active:scale-95';

// Height of Google Drive's own top bar (file name + pop-out button).
// Black strip still visible at the top? Increase (64-72). Video top cut? Decrease.
const DRIVE_HEADER_PX = 60;

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  anime,
  episode,
  onClose,
  onNextEpisode,
  onSelectEpisode,
  hasNextEpisode,
  nextEpisode = null,
  resumeTime = 0
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [serverIdx, setServerIdx] = useState(0); // 0 = Server 1, 1 = Server 2
  const [aspectMode, setAspectMode] = useState<'16:9' | 'fill' | 'contain' | 'cinema'>('16:9');
  const [hasPlayError, setHasPlayError] = useState(false);

  // Auto Post-Credits / End Prompt States
  const [showEndPrompt, setShowEndPrompt] = useState(false);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number>(10);
  const [isCountdownPaused, setIsCountdownPaused] = useState(false);

  // Share state & feedback
  const [isCopied, setIsCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastText, setToastText] = useState('Link copied to clipboard!');
  const [isReloading, setIsReloading] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  // Reset states on new episode
  useEffect(() => {
    setShowEndPrompt(false);
    setAutoAdvanceCountdown(10);
    setIsCountdownPaused(false);
    setHasPlayError(false);
    setServerIdx(0);
  }, [episode?.id]);

  // Toast auto-hide
  useEffect(() => {
    if (!showToast) return;
    const timer = setTimeout(() => setShowToast(false), 2500);
    return () => clearTimeout(timer);
  }, [showToast]);

  // Auto-advance countdown timer when end prompt is shown
  useEffect(() => {
    if (!showEndPrompt || !hasNextEpisode || isCountdownPaused) return;

    if (autoAdvanceCountdown <= 0) {
      onNextEpisode();
      return;
    }

    const timer = setTimeout(() => {
      setAutoAdvanceCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [showEndPrompt, autoAdvanceCountdown, isCountdownPaused, hasNextEpisode, onNextEpisode]);

  // Resume timestamp playback for native video
  useEffect(() => {
    if (resumeTime > 0 && videoRef.current) {
      videoRef.current.currentTime = resumeTime;
    }
  }, [resumeTime, episode?.id]);

  if (!anime || !episode) return null;

  // Server list: Drive link -> Server 1, Telegram bot stream link -> Server 2.
  // If only one link exists it is Server 1.
  const sources = [episode.videoUrl, episode.botStreamUrl].map((u) => (u || '').trim()).filter(Boolean);
  const activeIdx = Math.min(serverIdx, Math.max(sources.length - 1, 0));
  const rawUrl = sources[activeIdx] || '';
  const driveInfo = getGoogleDriveStreamInfo(rawUrl);
  const youtubeId = extractYouTubeId(rawUrl);

  const isYouTube = Boolean(youtubeId);
  const isDrive = driveInfo.isDrive;
  const isDirectVideo =
    !isDrive &&
    !isYouTube &&
    (rawUrl.endsWith('.mp4') ||
      rawUrl.endsWith('.webm') ||
      rawUrl.endsWith('.m3u8') ||
      rawUrl.startsWith('http://') ||
      rawUrl.startsWith('https://') ||
      rawUrl.startsWith('blob:'));

  const handleVideoEnded = () => {
    if (episode.isTrailer) return; // no "next episode" prompt after a trailer
    setShowEndPrompt(true);
    setAutoAdvanceCountdown(10);
    setIsCountdownPaused(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (playerContainerRef.current) {
        playerContainerRef.current
          .requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch(() => {});
      } else {
        document.documentElement
          .requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch(() => {});
      }
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'Escape') {
        if (isFullscreen) {
          document.exitFullscreen().catch(() => {});
          setIsFullscreen(false);
        } else {
          onClose();
        }
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'n' || e.key === 'N') {
        if (hasNextEpisode) onNextEpisode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isFullscreen, hasNextEpisode, onNextEpisode]);

  // Share episode implementation
  const handleShareEpisode = async () => {
    const shareTitle = `${anime.title} - ${itemShortLabel(anime, episode)}`;
    const shareText = 'Check out this anime episode on ZANFT!';
    const shareUrl = `${window.location.origin}${window.location.pathname}?anime=${encodeURIComponent(anime.id)}${episode.isTrailer ? '' : `&ep=${encodeURIComponent(episode.id)}`}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch {}
    }
    setToastText('Link copied to clipboard!');
    setShowToast(true);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleReloadStream = () => {
    setIsReloading(true);
    setToastText('Reloading stream...');
    setShowToast(true);
    if (iframeRef.current) {
      const src = iframeRef.current.src;
      iframeRef.current.src = 'about:blank';
      setTimeout(() => {
        if (iframeRef.current) iframeRef.current.src = src;
        setIsReloading(false);
      }, 150);
    } else if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
      setTimeout(() => setIsReloading(false), 200);
    } else {
      setTimeout(() => setIsReloading(false), 200);
    }
  };

  const handleToggleAspectMode = () => {
    setAspectMode((prev) => {
      if (prev === '16:9') {
        setToastText('Aspect: Fill / Zoom');
        return 'fill';
      }
      if (prev === 'fill') {
        setToastText('Aspect: Cinema (21:9)');
        return 'cinema';
      }
      if (prev === 'cinema') {
        setToastText('Aspect: Original (Fit)');
        return 'contain';
      }
      setToastText('Aspect: 16:9 Standard');
      return '16:9';
    });
    setShowToast(true);
  };

  const episodes = anime.episodes || [];

  const serverBtn = (active: boolean) =>
    `px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
      active
        ? 'bg-[#E50914] text-white shadow-md shadow-[#E50914]/30 ring-1 ring-[#E50914]'
        : 'bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10'
    }`;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl text-white overflow-y-auto overflow-x-hidden select-none animate-in fade-in duration-200">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-top duration-200">
          <Check className="w-4 h-4 text-white" />
          <span>{toastText}</span>
        </div>
      )}

      {/* Top Bar Navigation */}
      <header className="sticky top-0 z-40 bg-[#08080C]/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white transition-all text-xs font-bold border border-white/10 cursor-pointer active:scale-95"
            title="Back to Catalog (Esc)"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="min-w-0">
            <h2 className="font-syne font-bold text-white text-xs sm:text-sm truncate">
              {anime.title}
            </h2>
            <p className="text-[11px] text-zinc-400 truncate">
              {itemShortLabel(anime, episode)}: {episode.title}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          {hasNextEpisode && (
            <button
              onClick={onNextEpisode}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-[#E50914] hover:bg-[#B0000D] text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              title={nextEpisode ? `Next: ${itemLabel(anime, nextEpisode)}` : 'Next'}
            >
              <span className="hidden xs:inline">Next {nextEpisode ? itemShortLabel(anime, nextEpisode) : ''}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white transition-all cursor-pointer border border-white/10"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-all cursor-pointer border border-white/10"
            title="Close Stream (Esc)"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* ========================================================= */}
        {/* 1. VIDEO CONTAINER                                        */}
        {/* ========================================================= */}
        <div
          ref={playerContainerRef}
          className={`w-full max-w-5xl mx-auto rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl relative bg-black border border-white/10 transition-all duration-300 ${
            aspectMode === 'cinema' ? 'aspect-[21/9]' : 'aspect-video'
          }`}
        >
          {/* A. GOOGLE DRIVE STREAMING (preview player) */}
          {isDrive ? (
            driveInfo.previewUrl ? (
              <div className="relative w-full h-full overflow-hidden bg-black">
                {/* Iframe is pulled up so Drive's own header bar is clipped by the container */}
                <iframe
                  ref={iframeRef}
                  id="zanft-stream-iframe"
                  key={`preview-${driveInfo.fileId}-${aspectMode}`}
                  src={driveInfo.previewUrl}
                  title={`${anime.title} - ${episode.title}`}
                  className="absolute left-0 w-full border-0"
                  style={{
                    top: -DRIVE_HEADER_PX,
                    height: `calc(100% + ${DRIVE_HEADER_PX}px)`
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                />

                {/* Small ZANFT badge, inset from the edges, clicks pass through */}
                <div className="absolute top-2 left-2 z-30 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-[10px] font-bold text-zinc-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E50914] animate-pulse" />
                  <span>ZANFT</span>
                  <span className="text-[9px] text-zinc-400 font-mono">HD</span>
                </div>
              </div>
            ) : null
          ) : isYouTube && youtubeId ? (
            /* B. YOUTUBE EMBEDDED STREAM */
            <div className="relative w-full h-full overflow-hidden bg-black">
              <iframe
                key={`yt-${youtubeId}`}
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&playsinline=1`}
                title={`${anime.title} - ${episode.title}`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
          ) : isDirectVideo && rawUrl ? (
            /* C. DIRECT VIDEO FILE (MP4 / WEBM / HLS) */
            <video
              ref={videoRef}
              key={rawUrl}
              src={rawUrl}
              controls
              autoPlay
              playsInline
              preload="auto"
              onEnded={handleVideoEnded}
              onError={() => setHasPlayError(true)}
              className={`w-full h-full border-0 bg-black ${
                aspectMode === 'fill' ? 'object-cover' : 'object-contain'
              }`}
            />
          ) : (
            /* D. MISSING OR INVALID VIDEO URL */
            <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-[#0D0F1B]">
              <Tv className="w-12 h-12 text-[#E50914]" />
              <h4 className="font-syne font-bold text-white text-base">Video Stream Pending Upload</h4>
              <p className="text-xs text-zinc-400 max-w-sm">
                No video stream link attached to this episode yet. Please verify the episode streaming link in the Studio Dashboard.
              </p>
              {rawUrl && (
                <span className="text-[11px] text-zinc-500 font-mono max-w-xs truncate">
                  Provided: {rawUrl}
                </span>
              )}
            </div>
          )}

          {/* Playback error: offer the other server when there is one */}
          {hasPlayError && (
            <div className="absolute top-4 left-4 right-4 z-30 p-3 bg-red-950/90 border border-red-500/50 rounded-xl backdrop-blur-md flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2 text-red-200">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>
                  {activeIdx < sources.length - 1
                    ? `Server ${activeIdx + 1} is not playing.`
                    : 'Playback error. Try Reload.'}
                </span>
              </div>
              {activeIdx < sources.length - 1 && (
                <button
                  onClick={() => {
                    setServerIdx(activeIdx + 1);
                    setHasPlayError(false);
                  }}
                  className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-xs flex-shrink-0 cursor-pointer"
                >
                  Switch to Server {activeIdx + 2}
                </button>
              )}
            </div>
          )}

          {/* End of Episode Prompt Overlay */}
          {showEndPrompt && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-0 z-40 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300"
            >
              <div className="max-w-md w-full bg-[#0D101C] border border-white/15 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
                <span className="px-3 py-1 rounded-full bg-[#E50914]/20 border border-[#E50914]/40 text-[#E50914] text-xs font-black uppercase tracking-wider inline-flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isMovie(anime) ? 'Movie' : 'Episode'} Complete</span>
                </span>

                {hasNextEpisode && nextEpisode ? (
                  <>
                    <h3 className="font-syne font-bold text-white text-lg">
                      Up Next: {itemLabel(anime, nextEpisode)}
                    </h3>
                    <p className="text-xs text-zinc-300 truncate">
                      {nextEpisode.title}
                    </p>

                    <div className="text-xs text-emerald-400 font-medium">
                      Auto-playing in <strong className="font-mono text-white">{autoAdvanceCountdown}s</strong>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        onClick={onNextEpisode}
                        className="px-5 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#B0000D] text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg active:scale-95 cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>Play Now</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowEndPrompt(false);
                          if (videoRef.current) {
                            videoRef.current.currentTime = 0;
                            videoRef.current.play().catch(() => {});
                          }
                        }}
                        className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Replay</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                    <h3 className="font-syne font-bold text-white text-base">You're All Caught Up!</h3>
                    <p className="text-xs text-zinc-400">
                      {isMovie(anime) ? "You've watched everything available in this folder." : "You've watched all available episodes for this series."}
                    </p>
                    <button
                      onClick={() => setShowEndPrompt(false)}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer"
                    >
                      Close Prompt
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 2. STREAMING OPTIONS CONSOLE                              */}
        {/* ========================================================= */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 sm:p-4 backdrop-blur-md shadow-xl space-y-3.5">
          {/* Stream Server Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-[#E50914]" />
              <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                Streaming Server:
              </span>
            </div>

            {/* flex-wrap: chips never get cut off */}
            <div className="flex flex-wrap items-center gap-2">
              {sources.length === 0 ? (
                <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 text-zinc-400 border border-white/10">
                  No stream link
                </span>
              ) : (
                sources.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setServerIdx(i);
                      setHasPlayError(false);
                      setToastText(`Switched to Server ${i + 1}`);
                      setShowToast(true);
                    }}
                    className={serverBtn(i === activeIdx)}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${i === activeIdx ? 'bg-white' : 'bg-emerald-400'}`} />
                    <span>Server {i + 1}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Options grid: 2 cols on mobile, 4 equal cols on desktop (Quality selector removed, Share prominent) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Share (Triggers native navigator.share or copies link to clipboard) */}
            <button
              onClick={handleShareEpisode}
              className={`w-full min-w-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer active:scale-95 ${
                isCopied
                  ? 'bg-emerald-600 text-white border border-emerald-500'
                  : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-zinc-200 hover:text-white'
              }`}
              title="Share Video Link"
            >
              {isCopied ? (
                <Check className="w-3.5 h-3.5 text-emerald-200 flex-shrink-0" />
              ) : (
                <Share2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              )}
              <span className="truncate">{isCopied ? 'Link Copied!' : 'Share'}</span>
            </button>

            {/* Screen fit */}
            <button onClick={handleToggleAspectMode} className={optionBtn} title="Switch Screen Aspect Ratio">
              <Ratio className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="truncate">
                Screen:{' '}
                <strong>
                  {aspectMode === '16:9'
                    ? '16:9 Fit'
                    : aspectMode === 'fill'
                    ? 'Fill (Zoom)'
                    : aspectMode === 'cinema'
                    ? '21:9 Cinema'
                    : 'Original'}
                </strong>
              </span>
            </button>

            {/* Reload */}
            <button onClick={handleReloadStream} className={optionBtn} title="Reload Stream">
              <RefreshCw className={`w-3.5 h-3.5 text-[#E50914] flex-shrink-0 ${isReloading ? 'animate-spin' : ''}`} />
              <span className="truncate">{isReloading ? 'Reloading...' : 'Reload'}</span>
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className={optionBtn}
              title="Toggle Fullscreen"
            >
              {isFullscreen ? (
                <Minimize className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
              ) : (
                <Maximize className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
              )}
              <span className="truncate">Fullscreen</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. EPISODE DETAILS & SYNOPSIS                             */}
        {/* ========================================================= */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-[#E50914] text-white text-[10px] font-black uppercase tracking-wider">
                  {anime.type || 'Anime'}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-semibold bg-white/5 px-3 py-1 rounded-full border border-white/10 min-w-0">
                  <Building2 className="w-3.5 h-3.5 text-[#E50914] flex-shrink-0" />
                  <span className="truncate">Studio: {anime.studioName}</span>
                </div>
              </div>

              <div className="min-w-0">
                <h1 className="font-syne font-black text-xl sm:text-2xl text-white truncate">
                  {anime.title}
                </h1>
                <p className="text-sm font-semibold text-zinc-300 mt-0.5 truncate">
                  {itemLabel(anime, episode)}: {episode.title}
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed pt-2 border-t border-white/5">
            {episode.synopsis || anime.synopsis || 'Enjoy streaming this high-quality fan-dubbed production exclusively on ZANFT.'}
          </p>
        </div>

        {/* ========================================================= */}
        {/* 4. EPISODE LIST & "MORE EPISODES" SECTION                 */}
        {/* ========================================================= */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Film className="w-4 h-4 text-[#E50914] flex-shrink-0" />
              <h3 className="font-syne font-bold text-white text-base truncate">
                More {isMovie(anime) ? 'Movies' : 'Episodes'} ({episodes.length})
              </h3>
            </div>
            <span className="text-xs text-zinc-400 font-mono flex-shrink-0">
              Playing {itemShortLabel(anime, episode)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {episodes.map((ep) => {
              const isCurrent = ep.id === episode.id;
              const epDrive = getGoogleDriveStreamInfo(ep.videoUrl);
              const epThumb = ep.thumbnail || epDrive.thumbnailUrl || anime.poster;

              return (
                <div
                  key={ep.id}
                  onClick={() => onSelectEpisode && onSelectEpisode(ep)}
                  className={`group min-w-0 rounded-xl overflow-hidden border p-2.5 transition-all cursor-pointer text-left flex flex-col justify-between space-y-2.5 ${
                    isCurrent
                      ? 'bg-slate-900 border-[#E50914] shadow-[0_0_20px_rgba(229,9,20,0.25)] ring-1 ring-[#E50914]'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black border border-white/5">
                    {epThumb ? (
                      <img
                        src={epThumb}
                        alt={ep.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600">
                        <Tv className="w-6 h-6" />
                      </div>
                    )}

                    <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-mono font-bold text-white">
                      {itemShortLabel(anime, ep)}
                    </div>

                    {isCurrent && (
                      <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[9px] font-black tracking-wider uppercase shadow-md flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span>Playing</span>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-white truncate group-hover:text-[#E50914] transition-colors">
                      {ep.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      <span>{ep.duration || '24m'}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
