import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Film,
  Tv,
  Building2,
  Home,
  Check,
  Sparkles,
  ExternalLink,
  PlusCircle,
  Key,
  Crown,
  Users,
  Play,
  ArrowUpLeft,
  ChevronDown,
  LogIn
} from 'lucide-react';
import { Studio, Anime, StudioSession, OwnerSession } from '../types';
import { ZanftLogo } from './ZanftLogo';
import { MAX_STUDIO_CAPACITY } from '../firebase';

interface NavbarProps {
  activeTab: 'home' | 'anime' | 'movies' | 'studios' | 'studio-dashboard' | 'owner-dashboard';
  setActiveTab: (tab: 'home' | 'anime' | 'movies' | 'studios' | 'studio-dashboard' | 'owner-dashboard') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  studios: Studio[];
  animeList: Anime[];
  onSelectAnime: (anime: Anime) => void;
  onSelectStudio: (studio: Studio | null) => void;
  studioSession?: StudioSession | null;
  ownerSession?: OwnerSession | null;
  onOpenStudioAuth: (tab?: 'register' | 'login' | 'owner') => void;
  onOpenStudioDashboard: () => void;
  onOpenOwnerDashboard: () => void;
  studiosCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  studios,
  animeList,
  onSelectAnime,
  onSelectStudio,
  studioSession,
  ownerSession,
  onOpenStudioAuth,
  onOpenStudioDashboard,
  onOpenOwnerDashboard,
  studiosCount
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [showStudioDropdown, setShowStudioDropdown] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const remainingSlots = Math.max(0, MAX_STUDIO_CAPACITY - studiosCount);

  // Dynamic studio logo resolution
  const resolvedStudioLogo =
    studioSession?.logo ||
    studios.find(
      (s) =>
        s.id === studioSession?.studioId ||
        s.name.toLowerCase() === (studioSession?.studioName || '').toLowerCase()
    )?.logo;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsInputFocused(false);
        if (!searchQuery) {
          setIsSearchOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchQuery]);

  // Real-time matched anime
  const searchResults = searchQuery.trim()
    ? animeList.filter(
        (a) =>
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (a.japaneseTitle && a.japaneseTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
          a.studioName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSelectResult = (anime: Anime) => {
    onSelectAnime(anime);
    setSearchQuery('');
    setIsInputFocused(false);
    setIsSearchOpen(false);
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#08080C]/95 backdrop-blur-xl border-b border-white/10 py-2.5 shadow-2xl'
            : 'bg-gradient-to-b from-[#08080C]/90 via-[#08080C]/50 to-transparent py-3.5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Desktop Nav Links */}
          <div className="flex items-center space-x-5 sm:space-x-8">
            <button
              onClick={() => {
                setActiveTab('home');
                setSearchQuery('');
              }}
              className="text-left focus:outline-none flex-shrink-0 cursor-pointer group"
            >
              <ZanftLogo size="md" showText={true} showSubtext={true} subtext="Fan Dub Streaming Website" />
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 text-sm font-semibold">
              <button
                onClick={() => {
                  setActiveTab('home');
                  setSearchQuery('');
                }}
                className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'home' && !searchQuery
                    ? 'text-white bg-[#E50914] shadow-md shadow-red-600/30'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('anime');
                  setSearchQuery('');
                }}
                className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'anime' && !searchQuery
                    ? 'text-white bg-[#E50914] shadow-md shadow-red-600/30'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Tv className="w-4 h-4" />
                <span>Series</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('movies');
                  setSearchQuery('');
                }}
                className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'movies' && !searchQuery
                    ? 'text-white bg-[#E50914] shadow-md shadow-red-600/30'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Film className="w-4 h-4" />
                <span>Movies</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('studios');
                  onSelectStudio(null);
                  setSearchQuery('');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'studios' && !searchQuery
                    ? 'text-white bg-[#E50914] shadow-md shadow-red-600/30'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
                title={`Explore all ${studios.length} Fandub Studios`}
              >
                <Building2 className="w-4 h-4" />
                <span>Studios</span>
                {studios.length > 0 && (
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full leading-none ${
                      activeTab === 'studios' && !searchQuery
                        ? 'bg-black/35 text-white'
                        : 'bg-white/10 text-zinc-300'
                    }`}
                  >
                    {studios.length}
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            {/* Real-time Search Box */}
            <div ref={searchContainerRef} className="relative">
              <div
                className={`flex items-center rounded-full transition-all duration-300 ${
                  isSearchOpen || isInputFocused || searchQuery
                    ? 'w-36 xs:w-52 sm:w-72 bg-[#121422] border border-[#E50914]/50 shadow-[0_0_15px_rgba(229,9,20,0.25)]'
                    : 'w-9 h-9 sm:w-10 sm:h-10 bg-white/5 border border-white/10 hover:border-white/20'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchOpen(true);
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  }}
                  className="w-9 sm:w-10 h-9 sm:h-10 flex items-center justify-center text-zinc-400 hover:text-white flex-shrink-0 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                </button>

                {(isSearchOpen || isInputFocused || searchQuery) && (
                  <>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setIsInputFocused(true)}
                      placeholder="Search series, movies, studios..."
                      className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none pr-2"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          searchInputRef.current?.focus();
                        }}
                        className="p-1.5 mr-2 text-zinc-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Search Dropdown Results */}
              {isInputFocused && searchQuery.trim() && (
                <div className="absolute right-0 top-12 w-80 sm:w-96 max-h-[75vh] overflow-y-auto bg-[#0E101D] border border-white/15 rounded-2xl shadow-2xl p-2 z-50 text-xs space-y-1.5 animate-in fade-in duration-150">
                  <div className="px-3 py-1.5 text-zinc-400 font-semibold border-b border-white/5 flex items-center justify-between">
                    <span>Search Results</span>
                    <span className="text-[10px] text-zinc-500">{searchResults.length} found</span>
                  </div>

                  {searchResults.length === 0 ? (
                    <div className="p-4 text-center text-zinc-500">
                      No results found for &quot;{searchQuery}&quot;
                    </div>
                  ) : (
                    searchResults.slice(0, 8).map((anime) => (
                      <button
                        key={anime.id}
                        onClick={() => handleSelectResult(anime)}
                        className="w-full p-2 rounded-xl hover:bg-white/10 flex items-center space-x-3 text-left transition-colors cursor-pointer group"
                      >
                        {(anime.poster || anime.banner) ? (
                          <img
                            src={anime.poster || anime.banner}
                            alt={anime.title}
                            className="w-10 h-14 object-cover rounded-lg border border-white/10 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-14 rounded-lg border border-white/10 flex-shrink-0 bg-zinc-900 flex items-center justify-center text-zinc-500 font-bold text-[9px] text-center">
                            Anime
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-syne font-bold text-white text-xs truncate group-hover:text-[#E50914] transition-colors">
                            {anime.title}
                          </p>
                          <p className="text-[10px] text-zinc-400 truncate">
                            {anime.studioName} · {anime.type}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Single clean circular avatar/button for User/Studio Portfolio navigation */}
            <div className="relative flex items-center">
              {studioSession ? (
                /* Dynamic Studio Logo Display in Header: small circular avatar directly navigating to Studio Portfolio */
                <button
                  onClick={onOpenStudioDashboard}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full p-0.5 border-2 border-emerald-400/80 hover:border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_rgba(16,185,129,0.7)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center bg-[#0E1322] overflow-hidden group select-none flex-shrink-0"
                  title={`Studio Portfolio: ${studioSession.studioName}`}
                  aria-label={`Studio Portfolio: ${studioSession.studioName}`}
                >
                  {resolvedStudioLogo ? (
                    <img
                      src={resolvedStudioLogo}
                      alt={studioSession.studioName}
                      className="w-full h-full rounded-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black text-xs">
                      {studioSession.studioName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>
              ) : ownerSession ? (
                /* Master Owner Active Button */
                <button
                  onClick={onOpenOwnerDashboard}
                  className="h-9 sm:h-10 flex items-center space-x-1.5 bg-gradient-to-r from-amber-500/20 to-amber-600/30 hover:from-amber-500/30 hover:to-amber-600/40 text-amber-300 border border-amber-500/60 px-3 sm:px-3.5 rounded-full text-xs font-black transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95 cursor-pointer"
                  title="Master Owner Control Dashboard"
                >
                  <Crown className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span className="hidden xs:inline tracking-wide">Owner Panel</span>
                </button>
              ) : (
                /* Clean circular avatar button: Seamlessly navigates to Studio Portfolio / Login */
                <button
                  onClick={() => onOpenStudioAuth('login')}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#E50914] to-[#8A000A] p-0.5 border-2 border-white/20 hover:border-white/50 text-white flex items-center justify-center shadow-[0_0_15px_rgba(229,9,20,0.4)] hover:shadow-[0_0_25px_rgba(229,9,20,0.7)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex-shrink-0"
                  title="Studio Portfolio & Login"
                  aria-label="Studio Portfolio & Login"
                >
                  <Building2 className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* MOBILE SCREEN TOP ALIGNED CATEGORY BAR */}
        <div className="md:hidden mt-2 px-2 sm:px-4 flex items-center justify-center">
          <div className="inline-flex items-center p-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-lg max-w-full overflow-x-auto no-scrollbar gap-0.5 sm:gap-1">
            <button
              onClick={() => {
                setActiveTab('home');
                setSearchQuery('');
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 flex-shrink-0 ${
                activeTab === 'home' && !searchQuery
                  ? 'bg-[#E50914] text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('anime');
                setSearchQuery('');
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 flex-shrink-0 ${
                activeTab === 'anime' && !searchQuery
                  ? 'bg-[#E50914] text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Series</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('movies');
                setSearchQuery('');
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 flex-shrink-0 ${
                activeTab === 'movies' && !searchQuery
                  ? 'bg-[#E50914] text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Movies</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('studios');
                onSelectStudio(null);
                setSearchQuery('');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 flex-shrink-0 ${
                activeTab === 'studios' && !searchQuery
                  ? 'bg-[#E50914] text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Studios</span>
              {studios.length > 0 && (
                <span
                  className={`text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded-full leading-none ${
                    activeTab === 'studios' && !searchQuery
                      ? 'bg-black/35 text-white'
                      : 'bg-white/10 text-zinc-300'
                  }`}
                >
                  {studios.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>
    </>
  );
};
