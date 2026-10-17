import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { Film, Send } from 'lucide-react';
import { Anime, Episode, WatchProgress, StudioSession, OwnerSession, Studio } from './types';
import {
  getStoredStudios,
  getStoredAnime,
  subscribeToDataChanges,
  getWatchProgressList,
  removeWatchProgress,
  getAutoPlayNextSetting,
  setAutoPlayNextSetting,
} from './data/storage';
import {
  subscribeToStudios,
  subscribeToAnime,
  CloudStudio,
  CloudAnime,
  CloudEpisode,
} from './services/firestoreService';
import { SHORTCUTS } from './data/shortcuts';
import {
  cloudAnimeToAnime,
  cloudEpisodeToEpisode,
  cloudStudioToStudio,
} from './utils/mappers';
import {
  loadStudioSession,
  saveStudioSession,
  clearStudioSession,
  loadOwnerSession,
  saveOwnerSession,
  clearOwnerSession,
} from './utils/session';
import { Navbar, TabId } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { AnimeRow } from './components/AnimeRow';
import { CatalogPage } from './components/CatalogPage';
import { ContinueWatchingRow } from './components/ContinueWatchingRow';
import { StudiosDirectory } from './components/StudiosDirectory';
import { AnimeDetailModal } from './components/AnimeDetailModal';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { StudioAuthModal } from './components/StudioAuthModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { ShortcutToast } from './components/ShortcutToast';
import { ZanftLogo } from './components/ZanftLogo';

const StudioDashboard = lazy(() => import('./components/StudioDashboard').then((m) => ({ default: m.StudioDashboard })));
const MasterOwnerDashboard = lazy(() => import('./components/MasterOwnerDashboard').then((m) => ({ default: m.MasterOwnerDashboard })));

const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [studios, setStudios] = useState<Studio[]>([]);
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [cloudStudios, setCloudStudios] = useState<CloudStudio[]>([]);
  const [cloudAnimeList, setCloudAnimeList] = useState<CloudAnime[]>([]);
  const [watchProgressList, setWatchProgressList] = useState<WatchProgress[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoPlayNext, setAutoPlayNext] = useState<boolean>(true);

  const [studioSession, setStudioSession] = useState<StudioSession | null>(loadStudioSession);
  const [ownerSession, setOwnerSession] = useState<OwnerSession | null>(loadOwnerSession);

  const [isStudioAuthModalOpen, setIsStudioAuthModalOpen] = useState(false);
  const [studioAuthInitialTab, setStudioAuthInitialTab] = useState<'login' | 'owner'>('login');

  const [selectedStudio, setSelectedStudio] = useState<Studio | null>(null);
  const [detailAnime, setDetailAnime] = useState<Anime | null>(null);

  const [playingAnime, setPlayingAnime] = useState<Anime | null>(null);
  const [playingEpisode, setPlayingEpisode] = useState<Episode | null>(null);
  const [resumeTimestamp, setResumeTimestamp] = useState<number>(0);

  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [shortcutToast, setShortcutToast] = useState<{ key: string; action: string } | null>(null);
  const clearToast = useCallback(() => setShortcutToast(null), []);

  const openStudioAuth = (tab: 'login' | 'owner' = 'login') => {
    setStudioAuthInitialTab(tab);
    setIsStudioAuthModalOpen(true);
  };

  const openDashboard = (tab: 'studio-dashboard' | 'owner-dashboard') => {
    setActiveTab(tab);
    scrollTop();
  };

  /* ---------- sessions ---------- */

  const handleUpdateStudioSession = (session: StudioSession) => {
    setStudioSession(session);
    saveStudioSession(session);
  };

  const handleStudioLoginSuccess = (session: StudioSession) => {
    handleUpdateStudioSession(session);
    refreshData();
    setActiveTab('studio-dashboard');
  };

  const handleOwnerLoginSuccess = (session: OwnerSession) => {
    setOwnerSession(session);
    saveOwnerSession(session);
    setActiveTab('owner-dashboard');
  };

  const handleStudioLogout = () => {
    setStudioSession(null);
    clearStudioSession();
    setActiveTab('home');
  };

  const handleOwnerLogout = () => {
    setOwnerSession(null);
    clearOwnerSession();
    setActiveTab('home');
  };

  // Keep the session in sync with the cloud copy of the studio profile
  useEffect(() => {
    if (!studioSession) return;
    const match = cloudStudios.find((s) => s.id === studioSession.studioId);
    if (!match) return;
    const merged: StudioSession = {
      ...studioSession,
      studioName: match.name,
      logo: match.logo || studioSession.logo,
      banner: match.banner || studioSession.banner,
      mobileBanner: match.mobileBanner || studioSession.mobileBanner,
      location: match.location || studioSession.location,
      bio: match.bio || studioSession.bio,
      theme: match.theme || studioSession.theme,
    };
    const changed = (Object.keys(merged) as (keyof StudioSession)[]).some((k) => merged[k] !== studioSession[k]);
    if (changed) handleUpdateStudioSession(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudStudios]);

  // Profile edited in the dashboard
  useEffect(() => {
    const onProfileUpdate = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d || !studioSession || d.studioId !== studioSession.studioId) return;
      handleUpdateStudioSession({
        ...studioSession,
        studioName: d.name || studioSession.studioName,
        logo: d.logo ?? studioSession.logo,
        banner: d.banner ?? studioSession.banner,
        mobileBanner: d.mobileBanner ?? studioSession.mobileBanner,
        location: d.location ?? studioSession.location,
        bio: d.bio ?? studioSession.bio,
        theme: d.theme || studioSession.theme,
      });
    };
    window.addEventListener('zanft_studio_profile_updated', onProfileUpdate);
    return () => window.removeEventListener('zanft_studio_profile_updated', onProfileUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studioSession]);

  // Studio deleted elsewhere: sign this session out
  useEffect(() => {
    const onDeleted = () => {
      setStudioSession(null);
      setActiveTab('home');
    };
    window.addEventListener('zanft_studio_deleted', onDeleted);
    return () => window.removeEventListener('zanft_studio_deleted', onDeleted);
  }, []);

  /* ---------- keyboard shortcuts ---------- */

  const playerOpen = Boolean(playingAnime && playingEpisode);
  const overlayOpen = playerOpen || Boolean(detailAnime) || isStudioAuthModalOpen;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Escape') {
        setIsShortcutsModalOpen(false);
        setDetailAnime(null);
        return;
      }

      // The player owns its own keys (F = fullscreen), so don't navigate behind it.
      if (overlayOpen) return;

      const shortcut = SHORTCUTS.find((s) => s.keys.includes(e.key.toLowerCase()));
      if (!shortcut) return;
      e.preventDefault();
      setShortcutToast({ key: shortcut.display, action: shortcut.label });

      switch (shortcut.action) {
        case 'help':
          setIsShortcutsModalOpen((prev) => !prev);
          break;
        case 'search':
          window.dispatchEvent(new Event('zanft:focus-search'));
          break;
        default:
          setActiveTab(shortcut.action);
          setSelectedStudio(null);
          setSearchQuery('');
          scrollTop();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [overlayOpen]);

  /* ---------- data ---------- */

  const refreshData = () => {
    setStudios(getStoredStudios());
    setAnimeList(getStoredAnime());
    setWatchProgressList(getWatchProgressList());
    setAutoPlayNext(getAutoPlayNextSetting());
  };

  useEffect(() => {
    refreshData();
    const unsubStorage = subscribeToDataChanges(refreshData);

    const unsubStudios = subscribeToStudios(
      (incoming) => {
        setCloudStudios(incoming || []);
        setStudios((incoming || []).map(cloudStudioToStudio));
      },
      () => {}
    );

    const unsubAnime = subscribeToAnime(
      (incoming) => {
        setCloudAnimeList(incoming || []);
        setAnimeList((incoming || []).map(cloudAnimeToAnime));
      },
      () => {}
    );

    return () => {
      unsubStorage();
      unsubStudios();
      unsubAnime();
    };
  }, []);

  const tvAnime = useMemo(() => animeList.filter((a) => a.type === 'Series' || a.type === 'TV Series'), [animeList]);
  const movieAnime = useMemo(() => animeList.filter((a) => a.type === 'Movie'), [animeList]);

  /* ---------- playback ---------- */

  const handlePlayEpisode = (anime: Anime, episode: Episode, resumeTime = 0) => {
    setResumeTimestamp(resumeTime);
    setPlayingAnime(anime);
    setPlayingEpisode(episode);
  };

  const handlePlayAnime = (anime: Anime) => {
    const first = anime.episodes?.[0];
    if (first) handlePlayEpisode(anime, first);
    else setDetailAnime(anime);
  };

  // Trailer plays through the same player using a synthetic episode
  const handlePlayTrailer = (anime: Anime) => {
    if (!anime.trailer) return;
    const trailerEp: Episode = {
      id: `trailer-${anime.id}`,
      animeId: anime.id,
      number: 0,
      title: anime.trailer.title || 'Official Trailer',
      thumbnail: anime.banner || anime.poster,
      videoUrl: anime.trailer.videoUrl,
      botStreamUrl: anime.trailer.botStreamUrl,
      isTrailer: true,
    };
    handlePlayEpisode(anime, trailerEp, 0);
  };

  const handlePlayEpisodeFromCloud = (anime: CloudAnime, ep: CloudEpisode) => {
    handlePlayEpisode(cloudAnimeToAnime(anime), cloudEpisodeToEpisode(ep, anime));
  };

  // Shared links look like ?anime=<id>&ep=<id>. Open them once the catalogue has loaded.
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);
  useEffect(() => {
    if (deepLinkHandled || animeList.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const animeId = params.get('anime');
    if (!animeId) {
      setDeepLinkHandled(true);
      return;
    }
    const anime = animeList.find((a) => a.id === animeId);
    if (!anime) return; // may still be syncing from the cloud
    const ep = anime.episodes.find((e) => e.id === params.get('ep'));
    if (ep) handlePlayEpisode(anime, ep);
    else setDetailAnime(anime);
    setDeepLinkHandled(true);
    window.history.replaceState({}, '', window.location.pathname);
  }, [animeList, deepLinkHandled]);

  const { nextEpisode } = useMemo(() => {
    const episodes = playingAnime?.episodes || [];
    const index = episodes.findIndex((e) => e.id === playingEpisode?.id);
    return { nextEpisode: index >= 0 && index < episodes.length - 1 ? episodes[index + 1] : null };
  }, [playingAnime, playingEpisode]);

  const handleToggleAutoPlayNext = () => {
    const next = !autoPlayNext;
    setAutoPlayNext(next);
    setAutoPlayNextSetting(next);
  };

  const handleSelectStudioByName = (studioName: string) => {
    const found = studios.find((s) => s.name.toLowerCase() === studioName.toLowerCase());
    if (found) setSelectedStudio(found);
    setActiveTab('studios');
    scrollTop();
  };

  const rowProps = { onSelectAnime: setDetailAnime, onPlayAnime: handlePlayAnime };
  const featuredAnime = animeList[0] ?? null;

  return (
    <div className="min-h-screen bg-ink text-zinc-100 flex flex-col">
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'studios') setSelectedStudio(null);
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        studios={studios}
        animeList={animeList}
        onSelectAnime={setDetailAnime}
        studioSession={studioSession}
        ownerSession={ownerSession}
        onOpenStudioAuth={openStudioAuth}
        onOpenStudioDashboard={() => openDashboard('studio-dashboard')}
        onOpenOwnerDashboard={() => openDashboard('owner-dashboard')}
      />

      <main className="flex-1">
        <Suspense fallback={<div className="pt-40 text-center text-sm text-zinc-400">Loading dashboard...</div>}>
        {activeTab === 'studio-dashboard' && studioSession && (
          <StudioDashboard
            session={studioSession}
            allAnime={cloudAnimeList}
            studios={cloudStudios}
            onLogout={handleStudioLogout}
            onUpdateSession={handleUpdateStudioSession}
            onPlayEpisode={handlePlayEpisodeFromCloud}
          />
        )}

        {activeTab === 'owner-dashboard' && ownerSession && (
          <MasterOwnerDashboard
            session={ownerSession}
            studios={cloudStudios}
            allAnime={cloudAnimeList}
            onLogout={handleOwnerLogout}
            onPlayEpisode={handlePlayEpisodeFromCloud}
            isOpen={true}
            onClose={() => setActiveTab('home')}
          />
        )}

        </Suspense>

        {activeTab === 'home' && (
          <div className="pb-20">
            <HeroBanner
              anime={featuredAnime}
              onPlay={handlePlayAnime}
              onMoreInfo={setDetailAnime}
              onSelectStudio={handleSelectStudioByName}
            />

            <div className="space-y-10 -mt-8 sm:-mt-12 relative z-20">
              {watchProgressList.length > 0 && animeList.length > 0 && (
                <ContinueWatchingRow
                  progressList={watchProgressList}
                  animeList={animeList}
                  onResume={handlePlayEpisode}
                  onOpenDetails={setDetailAnime}
                  onRemoveItem={(animeId: string, episodeId: string) => {
                    removeWatchProgress(animeId, episodeId);
                    setWatchProgressList(getWatchProgressList());
                  }}
                />
              )}

              {animeList.length > 0 ? (
                <>
                  <AnimeRow title="New from fandub studios" subtitle="Latest uploads" items={animeList} {...rowProps} />
                  <AnimeRow title="Series" subtitle="Multi-episode fandubs" items={tvAnime} {...rowProps} />
                  <AnimeRow title="Movies" subtitle="Full-length releases" items={movieAnime} {...rowProps} />
                </>
              ) : (
                <div className="py-16 text-center space-y-4 max-w-md mx-auto px-4">
                  <div className="w-14 h-14 rounded-2xl bg-surface border border-line flex items-center justify-center mx-auto text-brand">
                    <Film className="w-7 h-7" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-white">Nothing published yet</h2>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Sign up with your studio and upload your first episode. It goes live on this page right away.
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-1">
                    <button
                      onClick={() => openStudioAuth('login')}
                      className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-deep text-white font-bold text-sm transition-colors"
                    >
                      Login / Sign up
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'anime' && (
          <CatalogPage title="Series" noun="series" plural="series" items={tvAnime} onSelectAnime={setDetailAnime} onPlayAnime={handlePlayAnime} />
        )}

        {activeTab === 'movies' && (
          <CatalogPage title="Movies" noun="movie" plural="movies" items={movieAnime} onSelectAnime={setDetailAnime} onPlayAnime={handlePlayAnime} />
        )}

        {activeTab === 'studios' && (
          <StudiosDirectory
            studios={studios}
            animeList={animeList}
            selectedStudio={selectedStudio}
            onSelectStudio={setSelectedStudio}
            onSelectAnime={setDetailAnime}
            ownerSession={ownerSession}
            studioSession={studioSession}
            onOpenOwnerDashboard={() => openDashboard('owner-dashboard')}
            onOpenStudioDashboard={() => openDashboard('studio-dashboard')}
            onRegisterStudio={() => openStudioAuth('login')}
          />
        )}
      </main>

      {detailAnime && (
        <AnimeDetailModal
          anime={detailAnime}
          onClose={() => setDetailAnime(null)}
          onPlayEpisode={(anime, ep) => {
            setDetailAnime(null);
            handlePlayEpisode(anime, ep);
          }}
          onPlayTrailer={(anime) => {
            setDetailAnime(null);
            handlePlayTrailer(anime);
          }}
          onSelectStudio={(name) => {
            setDetailAnime(null);
            handleSelectStudioByName(name);
          }}
        />
      )}

      {playingAnime && playingEpisode && (
        <VideoPlayerModal
          anime={playingAnime}
          episode={playingEpisode}
          onClose={() => {
            setResumeTimestamp(0);
            setPlayingAnime(null);
            setPlayingEpisode(null);
          }}
          resumeTime={resumeTimestamp}
          onNextEpisode={() => nextEpisode && setPlayingEpisode(nextEpisode)}
          onSelectEpisode={(ep) => handlePlayEpisode(playingAnime, ep, 0)}
          hasNextEpisode={Boolean(nextEpisode)}
          nextEpisode={nextEpisode}
          autoPlayNext={autoPlayNext}
          onToggleAutoPlayNext={handleToggleAutoPlayNext}
        />
      )}

      <StudioAuthModal
        isOpen={isStudioAuthModalOpen}
        onClose={() => setIsStudioAuthModalOpen(false)}
        studiosCount={studios.length}
        onStudioLoginSuccess={handleStudioLoginSuccess}
        onOwnerLoginSuccess={handleOwnerLoginSuccess}
        initialTab={studioAuthInitialTab}
      />

      <KeyboardShortcutsModal isOpen={isShortcutsModalOpen} onClose={() => setIsShortcutsModalOpen(false)} />

      {shortcutToast && (
        <ShortcutToast shortcutKey={shortcutToast.key} actionName={shortcutToast.action} onDone={clearToast} />
      )}

      <footer className="border-t border-line bg-ink-deep py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex flex-col items-center sm:items-start gap-2">
            <ZanftLogo size="sm" showSubtext={false} />
            <p className="text-xs text-zinc-500">
              Built by <span className="text-zinc-300 font-semibold">Matrix Builds</span>
            </p>
          </div>

          <a
            href="https://t.me/MatrixBuilds_D"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-line text-sm font-semibold text-zinc-200 transition-colors"
          >
            <Send className="w-4 h-4 text-sky-400" />
            Report a problem on Telegram
          </a>
        </div>
      </footer>
    </div>
  );
}
