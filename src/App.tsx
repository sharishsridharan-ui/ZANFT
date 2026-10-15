import React, { useState, useEffect, useMemo } from 'react';
import { Studio, Anime, Episode, WatchProgress, StudioSession, OwnerSession } from './types';
import {
  getStoredStudios,
  getStoredAnime,
  subscribeToDataChanges,
  getWatchProgressList,
  removeWatchProgress,
  getAutoPlayNextSetting,
  setAutoPlayNextSetting
} from './data/storage';
import { ContinueWatchingRow } from './components/ContinueWatchingRow';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { AnimeRow } from './components/AnimeRow';
import { StudiosDirectory } from './components/StudiosDirectory';
import { AnimeDetailModal } from './components/AnimeDetailModal';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { StudioAuthModal } from './components/StudioAuthModal';
import { StudioDashboard } from './components/StudioDashboard';
import { MasterOwnerDashboard } from './components/MasterOwnerDashboard';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { ShortcutToast } from './components/ShortcutToast';
import { ZanftLogo } from './components/ZanftLogo';
import {
  subscribeToStudios,
  subscribeToAnime,
  CloudStudio,
  CloudAnime,
  CloudEpisode
} from './services/firestoreService';
import { Film, Tv, ArrowUpDown, Building2, Send } from 'lucide-react';

type SortKey = 'popular' | 'rating' | 'newest' | 'episodes';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'anime' | 'movies' | 'studios' | 'studio-dashboard' | 'owner-dashboard'>('home');
  const [studios, setStudios] = useState<Studio[]>([]);
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [cloudStudios, setCloudStudios] = useState<CloudStudio[]>([]);
  const [cloudAnimeList, setCloudAnimeList] = useState<CloudAnime[]>([]);
  const [watchProgressList, setWatchProgressList] = useState<WatchProgress[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoPlayNext, setAutoPlayNext] = useState<boolean>(true);

  // Authentication & Sessions
  const [studioSession, setStudioSession] = useState<StudioSession | null>(() => {
    try {
      const saved = localStorage.getItem('zanft_current_studio') || localStorage.getItem('zanft_studio_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [ownerSession, setOwnerSession] = useState<OwnerSession | null>(() => {
    try {
      const saved = localStorage.getItem('zanft_owner_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isStudioAuthModalOpen, setIsStudioAuthModalOpen] = useState(false);
  const [studioAuthInitialTab, setStudioAuthInitialTab] = useState<'register' | 'login' | 'owner'>('login');

  const [animeSortBy, setAnimeSortBy] = useState<SortKey>('popular');
  const [movieSortBy, setMovieSortBy] = useState<SortKey>('popular');

  const [selectedStudio, setSelectedStudio] = useState<Studio | null>(null);
  const [detailAnime, setDetailAnime] = useState<Anime | null>(null);

  const [playingAnime, setPlayingAnime] = useState<Anime | null>(null);
  const [playingEpisode, setPlayingEpisode] = useState<Episode | null>(null);
  const [resumeTimestamp, setResumeTimestamp] = useState<number>(0);

  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [activeShortcutToast, setActiveShortcutToast] = useState<{ key: string; action: string } | null>(null);

  const showShortcutNotification = (key: string, action: string) => {
    setActiveShortcutToast({ key, action });
  };

  const handleStudioLoginSuccess = (session: StudioSession) => {
    setStudioSession(session);
    try {
      localStorage.setItem('zanft_current_studio', JSON.stringify(session));
      localStorage.setItem('zanft_studio_session', JSON.stringify(session));
    } catch {}
    refreshData();
    setActiveTab('studio-dashboard');
  };

  const handleUpdateStudioSession = (updatedSession: StudioSession) => {
    setStudioSession(updatedSession);
    try {
      localStorage.setItem('zanft_current_studio', JSON.stringify(updatedSession));
      localStorage.setItem('zanft_studio_session', JSON.stringify(updatedSession));
    } catch {}
  };

  // Keep studio session in permanent sync with cloudStudios without resetting on reload
  useEffect(() => {
    if (studioSession && cloudStudios.length > 0) {
      const match = cloudStudios.find((s) => s.id === studioSession.studioId);
      if (match) {
        const merged: StudioSession = {
          ...studioSession,
          studioName: match.name,
          logo: match.logo || studioSession.logo,
          banner: match.banner || studioSession.banner,
          mobileBanner: match.mobileBanner || studioSession.mobileBanner,
          location: match.location || studioSession.location,
          bio: match.bio || studioSession.bio,
          theme: match.theme || studioSession.theme
        };
        if (
          merged.studioName !== studioSession.studioName ||
          merged.logo !== studioSession.logo ||
          merged.banner !== studioSession.banner ||
          merged.mobileBanner !== studioSession.mobileBanner ||
          merged.location !== studioSession.location ||
          merged.bio !== studioSession.bio ||
          merged.theme !== studioSession.theme
        ) {
          handleUpdateStudioSession(merged);
        }
      }
    }
  }, [cloudStudios]);

  useEffect(() => {
    const onProfileUpdate = (e: any) => {
      if (e.detail && studioSession && e.detail.studioId === studioSession.studioId) {
        const merged: StudioSession = {
          ...studioSession,
          studioName: e.detail.name || studioSession.studioName,
          logo: e.detail.logo !== undefined ? e.detail.logo : studioSession.logo,
          banner: e.detail.banner !== undefined ? e.detail.banner : studioSession.banner,
          mobileBanner: e.detail.mobileBanner !== undefined ? e.detail.mobileBanner : studioSession.mobileBanner,
          location: e.detail.location !== undefined ? e.detail.location : studioSession.location,
          bio: e.detail.bio !== undefined ? e.detail.bio : studioSession.bio,
          theme: e.detail.theme || studioSession.theme
        };
        handleUpdateStudioSession(merged);
      }
    };
    window.addEventListener('zanft_studio_profile_updated', onProfileUpdate);
    return () => window.removeEventListener('zanft_studio_profile_updated', onProfileUpdate);
  }, [studioSession]);

  // Studio was deleted (by master or from another device) -> log this session out
  useEffect(() => {
    const onStudioDeleted = () => {
      setStudioSession(null);
      setActiveTab('home');
    };
    window.addEventListener('zanft_studio_deleted', onStudioDeleted);
    return () => window.removeEventListener('zanft_studio_deleted', onStudioDeleted);
  }, []);

  const handleOwnerLoginSuccess = (session: OwnerSession) => {
    setOwnerSession(session);
    try {
      localStorage.setItem('zanft_owner_session', JSON.stringify(session));
    } catch {}
    setActiveTab('owner-dashboard');
  };

  const handleStudioLogout = () => {
    setStudioSession(null);
    try {
      localStorage.removeItem('zanft_current_studio');
      localStorage.removeItem('zanft_studio_session');
    } catch {}
    setActiveTab('home');
  };

  const handleOwnerLogout = () => {
    setOwnerSession(null);
    try {
      localStorage.removeItem('zanft_owner_session');
    } catch {}
    setActiveTab('home');
  };

  // Keyboard Shortcuts navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const goTab = (
        tab: 'home' | 'anime' | 'movies' | 'studios',
        name: string,
        key: string
      ) => {
        setActiveTab(tab);
        setSelectedStudio(null);
        setSearchQuery('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showShortcutNotification(key, `Navigated to ${name}`);
      };

      switch (e.key) {
        case '?':
          e.preventDefault();
          setIsShortcutsModalOpen((prev) => !prev);
          break;
        case 'h':
        case 'H':
          goTab('home', 'Home', 'H');
          break;
        case 'a':
        case 'A':
          goTab('anime', 'Series', 'A');
          break;
        case 'f':
        case 'F':
        case 'm':
        case 'M':
          goTab('movies', 'Movies', 'M');
          break;
        case 'd':
        case 'D':
          goTab('studios', 'Studios', 'D');
          break;
        case 'Escape':
          setIsShortcutsModalOpen(false);
          setDetailAnime(null);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [playingAnime]);

  const refreshData = () => {
    setStudios(getStoredStudios());
    setAnimeList(getStoredAnime());
    setWatchProgressList(getWatchProgressList());
    setAutoPlayNext(getAutoPlayNextSetting());
  };

  useEffect(() => {
    refreshData();
    const unsubStorage = subscribeToDataChanges(() => {
      refreshData();
    });

    const unsubStudios = subscribeToStudios(
      (incomingStudios) => {
        setCloudStudios(incomingStudios || []);
        if (incomingStudios && incomingStudios.length > 0) {
          setStudios(() => {
            const mapped: Studio[] = incomingStudios.map((cs) => ({
              id: cs.id,
              name: cs.name,
              slug: cs.slug || cs.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
              logo: cs.logo || '',
              banner: cs.banner || '',
              bio: cs.bio || '',
              established: 2025,
              country: 'International',
              verified: cs.verified !== false,
              followersCount: '0',
              theme: cs.theme
            }));
            return mapped;
          });
        } else {
          setStudios([]);
        }
      },
      () => {}
    );

    const unsubAnime = subscribeToAnime(
      (incomingAnimeList) => {
        setCloudAnimeList(incomingAnimeList || []);
        if (incomingAnimeList && incomingAnimeList.length > 0) {
          setAnimeList(() => {
            const mapped: Anime[] = incomingAnimeList.map((ca) => ({
              id: ca.id,
              title: ca.title,
              japaneseTitle: ca.japaneseTitle,
              type: ca.type,
              genres: ca.genres || [],
              synopsis: ca.synopsis,
              poster: ca.poster,
              banner: ca.banner || ca.poster,
              studioId: ca.studioId,
              studioName: ca.studioName,
              episodes: (ca.episodes || []).map((ep) => ({
                id: ep.id,
                animeId: ca.id,
                number: ep.number,
                title: ep.title,
                duration: ep.duration || '24m',
                thumbnail: ep.thumbnail || ca.poster,
                synopsis: ep.synopsis,
                videoUrl: ep.videoUrl,
                botStreamUrl: ep.botStreamUrl
              })),
              rating: ca.rating || 'TV-14',
              matchPercentage: ca.matchPercentage || 95,
              year: ca.year || new Date().getFullYear(),
              seasons: 1,
              episodesCount: (ca.episodes || []).length,
              trailer: ca.trailer || undefined
            }));
            return mapped;
          });
        } else {
          setAnimeList([]);
        }
      },
      () => {}
    );

    return () => {
      unsubStorage();
      unsubStudios();
      unsubAnime();
    };
  }, []);

  // Filtered views by format
  const tvAnime = useMemo(() => {
    return animeList.filter((a) => a.type === 'Series' || a.type === 'TV Series');
  }, [animeList]);

  const movieAnime = useMemo(() => {
    return animeList.filter((a) => a.type === 'Movie');
  }, [animeList]);

  const filteredTvAnime = useMemo(() => {
    let list = tvAnime;
    if (animeSortBy === 'rating') {
      return [...list].sort((a, b) => b.matchPercentage - a.matchPercentage);
    }
    if (animeSortBy === 'newest') {
      return [...list].sort((a, b) => b.year - a.year);
    }
    if (animeSortBy === 'episodes') {
      return [...list].sort((a, b) => b.episodesCount - a.episodesCount);
    }
    return list;
  }, [tvAnime, animeSortBy]);

  const filteredMovieAnime = useMemo(() => {
    let list = movieAnime;
    if (movieSortBy === 'rating') {
      return [...list].sort((a, b) => b.matchPercentage - a.matchPercentage);
    }
    if (movieSortBy === 'newest') {
      return [...list].sort((a, b) => b.year - a.year);
    }
    if (movieSortBy === 'episodes') {
      return [...list].sort((a, b) => b.episodesCount - a.episodesCount);
    }
    return list;
  }, [movieAnime, movieSortBy]);

  const handleSelectAnime = (anime: Anime) => {
    setDetailAnime(anime);
  };

  const handlePlayAnime = (anime: Anime) => {
    const ep = anime.episodes && anime.episodes.length > 0 ? anime.episodes[0] : null;
    if (ep) {
      setResumeTimestamp(0);
      setPlayingAnime(anime);
      setPlayingEpisode(ep);
    } else {
      setDetailAnime(anime);
    }
  };

  const handlePlayEpisode = (anime: Anime, episode: Episode, resumeTime = 0) => {
    setResumeTimestamp(resumeTime);
    setPlayingAnime(anime);
    setPlayingEpisode(episode);
  };

  // Trailer plays in the same player as a synthetic "episode"
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
      isTrailer: true
    };
    handlePlayEpisode(anime, trailerEp, 0);
  };

  const handlePlayEpisodeFromCloud = (anime: CloudAnime, ep: CloudEpisode, resumeTime = 0) => {
    const fullAnime: Anime = {
      id: anime.id,
      title: anime.title,
      japaneseTitle: anime.japaneseTitle,
      studioId: anime.studioId,
      studioName: anime.studioName,
      type: anime.type,
      poster: anime.poster,
      banner: anime.banner || anime.poster,
      rating: anime.rating || 'TV-14',
      matchPercentage: anime.matchPercentage || 95,
      year: anime.year || new Date().getFullYear(),
      seasons: 1,
      episodesCount: (anime.episodes || []).length,
      trailer: anime.trailer || undefined,
      genres: anime.genres || [],
      synopsis: anime.synopsis,
      episodes: (anime.episodes || []).map((e) => ({
        id: e.id,
        animeId: anime.id,
        number: e.number,
        title: e.title,
        duration: e.duration || '24m',
        thumbnail: e.thumbnail || anime.poster,
        synopsis: e.synopsis,
        videoUrl: e.videoUrl,
        botStreamUrl: e.botStreamUrl
      }))
    };
    const fullEp: Episode = {
      id: ep.id,
      animeId: anime.id,
      number: ep.number,
      title: ep.title,
      duration: ep.duration || '24m',
      thumbnail: ep.thumbnail || anime.poster,
      synopsis: ep.synopsis,
      videoUrl: ep.videoUrl,
      botStreamUrl: ep.botStreamUrl
    };
    handlePlayEpisode(fullAnime, fullEp, resumeTime);
  };

  const handleNextEpisode = () => {
    if (!playingAnime || !playingEpisode) return;
    const episodes = playingAnime.episodes || [];
    const currentIndex = episodes.findIndex((e) => e.id === playingEpisode.id);
    if (currentIndex >= 0 && currentIndex < episodes.length - 1) {
      setPlayingEpisode(episodes[currentIndex + 1]);
    }
  };

  const handleSelectStudioByName = (studioName: string) => {
    const found = studios.find((s) => s.name.toLowerCase() === studioName.toLowerCase());
    if (found) {
      setSelectedStudio(found);
      setActiveTab('studios');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setActiveTab('studios');
    }
  };

  const hasNextEpisode = useMemo(() => {
    if (!playingAnime || !playingEpisode) return false;
    const episodes = playingAnime.episodes || [];
    const currentIndex = episodes.findIndex((e) => e.id === playingEpisode.id);
    return currentIndex >= 0 && currentIndex < episodes.length - 1;
  }, [playingAnime, playingEpisode]);

  const nextEpisode = useMemo(() => {
    if (!playingAnime || !playingEpisode) return null;
    const episodes = playingAnime.episodes || [];
    const currentIndex = episodes.findIndex((e) => e.id === playingEpisode.id);
    if (currentIndex >= 0 && currentIndex < episodes.length - 1) {
      return episodes[currentIndex + 1];
    }
    return null;
  }, [playingAnime, playingEpisode]);

  const handleToggleAutoPlayNext = () => {
    const nextVal = !autoPlayNext;
    setAutoPlayNext(nextVal);
    setAutoPlayNextSetting(nextVal);
  };

  const renderPosterGrid = (items: Anime[]) => {
    if (items.length === 0) {
      return (
        <div className="py-16 text-center space-y-3 bg-[#0E101D] border border-white/5 rounded-2xl p-8 max-w-lg mx-auto">
          <Film className="w-12 h-12 text-zinc-600 mx-auto" />
          <h3 className="font-syne font-bold text-white text-lg">No Titles Found in Catalog</h3>
          <p className="text-xs text-zinc-400">
            No anime titles available in this category yet. Registered studios can upload episodes directly from their dashboard.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
        {items.map((anime) => (
          <div
            key={anime.id}
            onClick={() => handleSelectAnime(anime)}
            className="group cursor-pointer bg-[#0E121E] rounded-xl overflow-hidden border border-white/10 hover:border-[#E50914]/60 transition-all duration-300 hover:-translate-y-1.5 shadow-lg flex flex-col"
          >
            <div className="aspect-[2/3] overflow-hidden relative bg-black">
              {[anime.poster, anime.banner].find((u) => u && u.trim().length > 0) ? (
                <img
                  src={[anime.poster, anime.banner].find((u) => u && u.trim().length > 0)}
                  alt={anime.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-500 font-bold text-xs p-2 text-center">
                  {anime.title}
                </div>
              )}
              <div className="absolute top-2 left-2 bg-[#07080F]/85 backdrop-blur-xs text-[9px] font-bold text-white px-2 py-0.5 rounded border border-white/10">
                {anime.studioName}
              </div>
            </div>
            <div className="p-3 flex-1 flex flex-col justify-between space-y-1.5">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#E50914] transition-colors line-clamp-1">
                  {anime.title}
                </h3>
                <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                  {anime.studioName} · {anime.type}
                </p>
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1.5 border-t border-white/5">
                <span className="text-emerald-400 font-bold">{anime.matchPercentage}% Score</span>
                <span>{anime.year}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const rowProps = {
    onSelectAnime: handleSelectAnime,
    onPlayAnime: handlePlayAnime,
    onSelectStudio: handleSelectStudioByName,
  };

  const featuredAnime = animeList.length > 0 ? animeList[0] : null;

  return (
    <div className="min-h-screen bg-[#08080C] text-[#F3F4F6] flex flex-col selection:bg-[#E50914] selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'studios') {
            setSelectedStudio(null);
          }
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        studios={studios}
        animeList={animeList}
        onSelectAnime={handleSelectAnime}
        onSelectStudio={(studio) => {
          setSelectedStudio(studio);
          setActiveTab('studios');
        }}
        studioSession={studioSession}
        ownerSession={ownerSession}
        onOpenStudioAuth={(tab) => {
          setStudioAuthInitialTab(tab || 'login');
          setIsStudioAuthModalOpen(true);
        }}
        onOpenStudioDashboard={() => {
          setActiveTab('studio-dashboard');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenOwnerDashboard={() => {
          setActiveTab('owner-dashboard');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        studiosCount={studios.length}
      />

      <main className="flex-1">
        {/* Render Studio Dashboard */}
        {activeTab === 'studio-dashboard' && studioSession && (
          <StudioDashboard
            session={studioSession}
            allAnime={cloudAnimeList}
            studios={cloudStudios}
            onLogout={handleStudioLogout}
            onUpdateSession={handleUpdateStudioSession}
            onPlayEpisode={(anime, ep) => handlePlayEpisodeFromCloud(anime, ep)}
            onClose={() => setActiveTab('home')}
            onBackToHome={() => setActiveTab('home')}
          />
        )}

        {/* Render Master Owner Dashboard */}
        {activeTab === 'owner-dashboard' && ownerSession && (
          <MasterOwnerDashboard
            session={ownerSession}
            studios={cloudStudios}
            allAnime={cloudAnimeList}
            onLogout={handleOwnerLogout}
            onPlayEpisode={(anime, ep) => handlePlayEpisodeFromCloud(anime, ep)}
            isOpen={true}
            onClose={() => setActiveTab('home')}
            onBackToHome={() => setActiveTab('home')}
          />
        )}

        {/* Standard Content Tabs */}
        {activeTab === 'home' && (
          <div className="space-y-6 pb-20">
            <HeroBanner
              anime={featuredAnime}
              onPlay={handlePlayAnime}
              onMoreInfo={handleSelectAnime}
              onSelectStudio={handleSelectStudioByName}
            />

            <div className="space-y-8 -mt-10 sm:-mt-16 relative z-20">
              {watchProgressList.length > 0 && animeList.length > 0 && (
                <ContinueWatchingRow
                  progressList={watchProgressList}
                  animeList={animeList}
                  onResume={(anime: Anime, ep: Episode, resumeTime: number) =>
                    handlePlayEpisode(anime, ep, resumeTime)
                  }
                  onOpenDetails={(anime: Anime) => setDetailAnime(anime)}
                  onRemoveItem={(animeId: string, episodeId: string) => {
                    removeWatchProgress(animeId, episodeId);
                    setWatchProgressList(getWatchProgressList());
                  }}
                />
              )}

              {animeList.length > 0 ? (
                <>
                  <AnimeRow
                    title="Fan Dubbed Titles"
                    subtitle="Latest releases published by registered fandub studios"
                    items={animeList}
                    {...rowProps}
                  />

                  {tvAnime.length > 0 && (
                    <AnimeRow
                      title="Ongoing Anime Series"
                      subtitle="Multi-episode ongoing fandub series"
                      items={tvAnime}
                      {...rowProps}
                    />
                  )}

                  {movieAnime.length > 0 && (
                    <AnimeRow
                      title="Theatrical Anime Movies"
                      subtitle="Full-length standalone cinematic releases"
                      items={movieAnime}
                      {...rowProps}
                    />
                  )}
                </>
              ) : (
                <div className="py-20 text-center space-y-4 max-w-md mx-auto px-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#E50914]">
                    <Film className="w-8 h-8" />
                  </div>
                  <h3 className="font-syne font-bold text-white text-xl">
                    No Anime Uploaded Yet
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Register your Fan Dub Studio and upload your first anime episode. All published titles will stream immediately in Ultra HD!
                  </p>
                  <div className="flex items-center justify-center space-x-3 pt-2">
                    <button
                      onClick={() => {
                        setStudioAuthInitialTab('register');
                        setIsStudioAuthModalOpen(true);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#B0000D] text-white font-bold text-xs transition-all shadow-lg active:scale-95 cursor-pointer"
                    >
                      Register Studio
                    </button>
                    <button
                      onClick={() => {
                        setStudioAuthInitialTab('login');
                        setIsStudioAuthModalOpen(true);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all border border-white/15 cursor-pointer"
                    >
                      Studio Login
                    </button>
                  </div>
                </div>
              )}

              {/* Home Screen Bottom Support & Report Problem Section */}
              <div className="px-4 sm:px-8 pt-4">
                <div className="max-w-7xl mx-auto rounded-2xl bg-gradient-to-r from-[#121422] via-[#0E101D] to-[#121422] border border-white/10 p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                  <div className="flex items-center space-x-3.5 text-center sm:text-left">
                    <div className="w-11 h-11 rounded-xl bg-[#0088cc]/10 border border-[#0088cc]/30 flex items-center justify-center text-[#0088cc] flex-shrink-0 shadow-[0_0_15px_rgba(0,136,204,0.25)]">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-white font-syne">
                        Report Issue / Need Assistance?
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Broken video link or playback issue? Reach out on the official Matrix Builds Telegram channel!
                      </p>
                    </div>
                  </div>

                  <a
                    href="https://t.me/MatrixBuilds_D"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(0,136,204,0.4)] hover:scale-105 active:scale-95 transition-all flex-shrink-0 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Report Problem</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'anime' && (
          <div className="pt-28 sm:pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
            <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-[#E50914] text-xs font-bold uppercase tracking-widest">
                  <Tv className="w-4 h-4" />
                  <span>Serialized Broadcast Catalog</span>
                </div>
                <h1 className="font-syne text-3xl sm:text-5xl font-black text-white tracking-tight">
                  Anime Series
                </h1>
              </div>

              {/* Clean Sort Selector */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-zinc-400">Sort by:</span>
                  <select
                    value={animeSortBy}
                    onChange={(e) => setAnimeSortBy(e.target.value as SortKey)}
                    className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="popular" className="bg-[#0E101D]">Most Popular</option>
                    <option value="rating" className="bg-[#0E101D]">Highest Rating</option>
                    <option value="newest" className="bg-[#0E101D]">Newest Added</option>
                    <option value="episodes" className="bg-[#0E101D]">Episode Count</option>
                  </select>
                </div>
                <div className="text-xs text-zinc-400 font-semibold bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl">
                  <span className="text-white font-bold">{filteredTvAnime.length}</span> titles
                </div>
              </div>
            </div>

            {renderPosterGrid(filteredTvAnime)}
          </div>
        )}

        {activeTab === 'movies' && (
          <div className="pt-28 sm:pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
            <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-[#E50914] text-xs font-bold uppercase tracking-widest">
                  <Film className="w-4 h-4" />
                  <span>Theatrical Releases</span>
                </div>
                <h1 className="font-syne text-3xl sm:text-5xl font-black text-white tracking-tight">
                  Anime Movies
                </h1>
              </div>

              {/* Clean Sort Selector */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-zinc-400">Sort by:</span>
                  <select
                    value={movieSortBy}
                    onChange={(e) => setMovieSortBy(e.target.value as SortKey)}
                    className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="popular" className="bg-[#0E101D]">Most Popular</option>
                    <option value="rating" className="bg-[#0E101D]">Highest Rating</option>
                    <option value="newest" className="bg-[#0E101D]">Newest Added</option>
                    <option value="episodes" className="bg-[#0E101D]">Episode Count</option>
                  </select>
                </div>
                <div className="text-xs text-zinc-400 font-semibold bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl">
                  <span className="text-white font-bold">{filteredMovieAnime.length}</span> films
                </div>
              </div>
            </div>

            {renderPosterGrid(filteredMovieAnime)}
          </div>
        )}

        {activeTab === 'studios' && (
          <StudiosDirectory
            studios={studios}
            animeList={animeList}
            selectedStudio={selectedStudio}
            onSelectStudio={(studio) => setSelectedStudio(studio)}
            onSelectAnime={handleSelectAnime}
            onPlayAnime={handlePlayAnime}
            ownerSession={ownerSession}
            studioSession={studioSession}
            onOpenOwnerDashboard={() => {
              setActiveTab('owner-dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenStudioDashboard={() => {
              setActiveTab('studio-dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onRegisterStudio={() => {
              setStudioAuthInitialTab('register');
              setIsStudioAuthModalOpen(true);
            }}
          />
        )}
      </main>

      {/* Modals & Overlays */}
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
          onSelectStudio={handleSelectStudioByName}
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
          onNextEpisode={handleNextEpisode}
          onSelectEpisode={(ep) => handlePlayEpisode(playingAnime, ep, 0)}
          hasNextEpisode={hasNextEpisode}
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

      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {activeShortcutToast && (
        <ShortcutToast
          shortcutKey={activeShortcutToast.key}
          actionName={activeShortcutToast.action}
        />
      )}

      <footer className="bg-[#05060A] border-t border-white/5 py-8 px-4 sm:px-6 lg:px-8 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-between gap-6">
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Logo branding area with application name and subtext */}
            <div className="flex items-center space-x-3">
              <ZanftLogo size="sm" showSubtext={true} subtext="Fan Dub Streaming Website" />
            </div>

            {/* Single clean circular avatar/button navigating directly to Studio / User Portfolio */}
            <div className="flex items-center space-x-3">
              {studioSession ? (
                <button
                  onClick={() => {
                    setActiveTab('studio-dashboard');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-10 h-10 rounded-full p-0.5 border-2 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_rgba(16,185,129,0.7)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center bg-[#0E1322] overflow-hidden group select-none flex-shrink-0"
                  title={`Studio Portfolio: ${studioSession.studioName}`}
                >
                  {studioSession.logo ? (
                    <img
                      src={studioSession.logo}
                      alt={studioSession.studioName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black text-xs">
                      {studioSession.studioName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => {
                    setStudioAuthInitialTab('login');
                    setIsStudioAuthModalOpen(true);
                  }}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E50914] to-[#8A000A] p-0.5 border-2 border-white/20 hover:border-white/50 text-white flex items-center justify-center shadow-[0_0_15px_rgba(229,9,20,0.4)] hover:shadow-[0_0_25px_rgba(229,9,20,0.7)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex-shrink-0"
                  title="Studio Portfolio & Login"
                >
                  <Building2 className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          </div>

          {/* At the very bottom of the footer: "Built by Matrix Builds" & "Report Problem" */}
          <div className="w-full pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-center gap-3">
            <p className="text-zinc-400 text-xs font-semibold tracking-wider">
              Built by <span className="text-[#E50914] font-bold">Matrix Builds</span>
            </p>

            <a
              href="https://t.me/MatrixBuilds_D"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-zinc-300 hover:text-white bg-white/5 hover:bg-[#0088cc]/20 border border-white/10 hover:border-[#0088cc]/50 px-3.5 py-1.5 rounded-full transition-all group cursor-pointer shadow-sm active:scale-95"
              title="Report Problem via Telegram Group"
            >
              <Send className="w-3.5 h-3.5 text-[#0088cc] group-hover:scale-110 transition-transform" />
              <span>Report Problem</span>
              <span className="text-[10px] text-zinc-500 font-normal">(@MatrixBuilds_D)</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
