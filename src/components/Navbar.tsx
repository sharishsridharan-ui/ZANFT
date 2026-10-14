import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Film, Tv, Building2, Home, Crown } from 'lucide-react';
import { Studio, Anime, StudioSession, OwnerSession } from '../types';
import { ZanftLogo } from './ZanftLogo';
import { pickImage } from '../utils/mappers';

export type TabId = 'home' | 'anime' | 'movies' | 'studios' | 'studio-dashboard' | 'owner-dashboard';

interface NavbarProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  studios: Studio[];
  animeList: Anime[];
  onSelectAnime: (anime: Anime) => void;
  studioSession?: StudioSession | null;
  ownerSession?: OwnerSession | null;
  onOpenStudioAuth: (tab?: 'register' | 'login' | 'owner') => void;
  onOpenStudioDashboard: () => void;
  onOpenOwnerDashboard: () => void;
}

const NAV_ITEMS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'anime', label: 'Series', icon: Tv },
  { id: 'movies', label: 'Movies', icon: Film },
  { id: 'studios', label: 'Studios', icon: Building2 },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  studios,
  animeList,
  onSelectAnime,
  studioSession,
  ownerSession,
  onOpenStudioAuth,
  onOpenStudioDashboard,
  onOpenOwnerDashboard,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const studioLogo =
    studioSession?.logo || studios.find((s) => s.id === studioSession?.studioId)?.logo;

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // "S" shortcut from App
  useEffect(() => {
    const focusSearch = () => {
      setIsSearchOpen(true);
      setTimeout(() => inputRef.current?.focus(), 30);
    };
    window.addEventListener('zanft:focus-search', focusSearch);
    return () => window.removeEventListener('zanft:focus-search', focusSearch);
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const results = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return animeList.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.japaneseTitle?.toLowerCase().includes(q) ||
        a.studioName.toLowerCase().includes(q)
    );
  }, [animeList, searchQuery]);

  const pickResult = (anime: Anime) => {
    onSelectAnime(anime);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const goTo = (tab: TabId) => {
    setActiveTab(tab);
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showResults = isSearchOpen && searchQuery.trim().length > 0;

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-colors duration-300 ${
        isScrolled
          ? 'bg-ink/95 backdrop-blur-xl border-b border-line'
          : 'bg-gradient-to-b from-ink/90 to-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex flex-wrap md:flex-nowrap items-center gap-x-6 gap-y-2">
        <button onClick={() => goTo('home')} className="flex-shrink-0 mr-auto md:mr-0 rounded-lg" aria-label="ZANFT home">
          <ZanftLogo size="md" showText showSubtext={false} />
        </button>

        {/* One nav for every screen size: sits beside the logo on desktop, on its own row on mobile */}
        <nav
          aria-label="Main"
          className="order-last md:order-none w-full md:w-auto md:mr-auto flex items-center justify-around sm:justify-start gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar"
        >
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id && !searchQuery;
            return (
              <button
                key={id}
                onClick={() => goTo(id)}
                aria-current={active ? 'page' : undefined}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  active ? 'bg-brand text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="hidden sm:block w-4 h-4" />
                {label}
                {id === 'studios' && studios.length > 0 && (
                  <span className={`hidden sm:inline font-mono text-[11px] px-1.5 rounded-full ${active ? 'bg-black/30' : 'bg-white/10'}`}>
                    {studios.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div ref={searchRef} className="relative">
            <div
              className={`flex items-center rounded-full border transition-all duration-300 ${
                isSearchOpen || searchQuery
                  ? 'w-44 sm:w-72 bg-surface border-brand/60'
                  : 'w-10 h-10 bg-white/5 border-line hover:border-white/25'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(true);
                  setTimeout(() => inputRef.current?.focus(), 30);
                }}
                className="w-10 h-10 flex items-center justify-center text-zinc-300 hover:text-white flex-shrink-0 rounded-full"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>

              {(isSearchOpen || searchQuery) && (
                <>
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchOpen(true)}
                    placeholder="Search titles or studios"
                    className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none pr-2"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        inputRef.current?.focus();
                      }}
                      className="p-2 mr-1 text-zinc-400 hover:text-white"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>

            {showResults && (
              <div className="absolute right-0 top-12 w-[min(24rem,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto bg-surface border border-line rounded-2xl shadow-2xl p-2 z-50">
                {results.length === 0 ? (
                  <p className="p-4 text-center text-sm text-zinc-400">Nothing matches &quot;{searchQuery}&quot;.</p>
                ) : (
                  results.slice(0, 8).map((anime) => {
                    const img = pickImage(anime.poster, anime.banner);
                    return (
                      <button
                        key={anime.id}
                        onClick={() => pickResult(anime)}
                        className="w-full p-2 rounded-xl hover:bg-white/10 flex items-center gap-3 text-left group"
                      >
                        {img ? (
                          <img src={img} alt="" className="w-10 h-14 object-cover rounded-md border border-line flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-14 rounded-md border border-line bg-ink flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate group-hover:text-brand">{anime.title}</p>
                          <p className="text-xs text-zinc-400 truncate">
                            {anime.studioName}, {anime.type}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* One account button: studio avatar, owner panel, or sign in */}
          {studioSession ? (
            <button
              onClick={onOpenStudioDashboard}
              className="w-10 h-10 rounded-full border-2 border-emerald-400/80 overflow-hidden bg-surface flex items-center justify-center flex-shrink-0"
              title={`Open ${studioSession.studioName} dashboard`}
              aria-label={`Open ${studioSession.studioName} dashboard`}
            >
              {studioLogo ? (
                <img src={studioLogo} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-display font-bold text-emerald-300">
                  {studioSession.studioName.charAt(0).toUpperCase()}
                </span>
              )}
            </button>
          ) : ownerSession ? (
            <button
              onClick={onOpenOwnerDashboard}
              className="h-10 flex items-center gap-1.5 px-3.5 rounded-full border border-amber/60 bg-amber/10 text-amber text-sm font-bold"
            >
              <Crown className="w-4 h-4" />
              <span className="hidden xs:inline">Owner panel</span>
            </button>
          ) : (
            <button
              onClick={() => onOpenStudioAuth('login')}
              className="h-10 flex items-center gap-2 px-3.5 rounded-full bg-white/10 hover:bg-white/15 border border-line text-sm font-semibold text-white"
            >
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Studio login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
