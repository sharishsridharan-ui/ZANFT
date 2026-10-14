import React, { useState, useMemo } from 'react';
import { Search, Building2, Award, Calendar, MapPin, CheckCircle, ArrowLeft, Instagram, Crown } from 'lucide-react';
import { Studio, Anime } from '../types';

interface StudiosDirectoryProps {
  studios: Studio[];
  animeList: Anime[];
  selectedStudio: Studio | null;
  onSelectStudio: (studio: Studio | null) => void;
  onSelectAnime: (anime: Anime) => void;
  onRegisterStudio?: () => void;
  ownerSession?: { isOwner: boolean; username: string } | null;
  studioSession?: { studioId: string; studioName: string } | null;
  onOpenOwnerDashboard?: () => void;
  onOpenStudioDashboard?: () => void;
}

export const StudiosDirectory: React.FC<StudiosDirectoryProps> = ({
  studios,
  animeList,
  selectedStudio,
  onSelectStudio,
  onSelectAnime,
  onRegisterStudio,
  ownerSession,
  studioSession,
  onOpenOwnerDashboard,
  onOpenStudioDashboard
}) => {
  const handleRegisterStudio = onRegisterStudio;
  const [studioSearch, setStudioSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'TV Series' | 'Movie'>('all');

  // Real-time filtered studios
  const filteredStudios = useMemo(() => {
    if (!studioSearch.trim()) return studios;
    const query = studioSearch.toLowerCase();
    return studios.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.country.toLowerCase().includes(query) ||
        (s.bio && s.bio.toLowerCase().includes(query))
    );
  }, [studios, studioSearch]);

  // Anime belonging to selected studio
  const studioAnime = useMemo(() => {
    if (!selectedStudio) return [];
    return animeList.filter((a) => {
      const matchStudio =
        a.studioId === selectedStudio.id ||
        a.studioName.toLowerCase() === selectedStudio.name.toLowerCase();
      if (!matchStudio) return false;
      if (activeFilter === 'all') return true;
      return a.type === activeFilter;
    });
  }, [animeList, selectedStudio, activeFilter]);

  // -------------------------------------------------------------
  // STUDIO PROFILE VIEW (When a studio is clicked)
  // -------------------------------------------------------------
  if (selectedStudio) {
    const totalWorks = animeList.filter(
      (a) =>
        a.studioId === selectedStudio.id ||
        a.studioName.toLowerCase() === selectedStudio.name.toLowerCase()
    ).length;

    return (
      <div className="min-h-screen pt-28 sm:pt-32 pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
        {/* Back Button */}
        <div>
          <button
            onClick={() => onSelectStudio(null)}
            className="inline-flex items-center space-x-2 text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-semibold">Back to Studios Directory</span>
          </button>
        </div>

        {/* Studio Hero Profile Header */}
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-surface shadow-2xl">
          {/* Banner */}
          <div className="h-48 sm:h-64 lg:h-72 w-full relative bg-zinc-900">
            {selectedStudio.banner ? (
              <img
                src={selectedStudio.banner}
                alt={selectedStudio.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-zinc-900 via-zinc-800 to-black" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
          </div>

          {/* Profile Meta Bar */}
          <div className="relative px-6 sm:px-10 pb-8 -mt-16 sm:-mt-20 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
              {/* Studio Logo */}
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-4 border-surface shadow-2xl bg-black flex-shrink-0 flex items-center justify-center">
                {selectedStudio.logo ? (
                  <img
                    src={selectedStudio.logo}
                    alt={selectedStudio.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black text-3xl sm:text-4xl">
                    {selectedStudio.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Studio Title & Stats */}
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <h1 className="font-display text-3xl sm:text-5xl font-black text-white tracking-tight">
                    {selectedStudio.name}
                  </h1>
                  {selectedStudio.verified && (
                    <span title="Verified Official ZANFT Partner">
                      <CheckCircle className="w-5 h-5 text-brand" />
                    </span>
                  )}
                </div>

                {/* Clean Unboxed Metadata */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 font-medium">
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{selectedStudio.country}</span>
                  </span>
                  <span aria-hidden="true" className="text-zinc-600">·</span>
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Est. {selectedStudio.established}</span>
                  </span>
                  <span aria-hidden="true" className="text-zinc-600">·</span>
                  <span className="text-zinc-300 font-bold">
                    Studio Joined On: {new Date(selectedStudio.createdAt || '2025-01-01').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span aria-hidden="true" className="text-zinc-600">·</span>
                  <span className="text-brand font-bold">{totalWorks} Productions on ZANFT</span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Master Owner Full Control */}
            <div className="flex flex-wrap items-center gap-3">
              {ownerSession?.isOwner && (
                <button
                  onClick={() => {
                    if (onOpenOwnerDashboard) onOpenOwnerDashboard();
                  }}
                  className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black px-4 py-2.5 rounded-xl text-xs font-black shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all cursor-pointer active:scale-95"
                  title="Master Owner: Full Platform Authority & Studio Control"
                >
                  <Crown className="w-4 h-4 text-black" />
                  <span>Master Owner Full Control</span>
                </button>
              )}

              {studioSession && studioSession.studioId === selectedStudio.id && (
                <button
                  onClick={() => {
                    if (onOpenStudioDashboard) onOpenStudioDashboard();
                  }}
                  className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer active:scale-95"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Manage My Studio</span>
                </button>
              )}

              {handleRegisterStudio && !studioSession && !ownerSession?.isOwner && (
                <button
                  onClick={handleRegisterStudio}
                  className="flex items-center space-x-2 bg-brand hover:bg-brand-deep text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-[0_0_15px_rgba(229,9,20,0.4)] transition-all cursor-pointer"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Studio Portal & Uploads</span>
                </button>
              )}
            </div>
          </div>

          {/* Bio & Manifestos */}
          <div className="px-6 sm:px-10 pb-8 pt-2 border-t border-white/5 space-y-4">
            <p className="text-sm text-zinc-300 max-w-3xl leading-relaxed">
              {selectedStudio.bio}
            </p>

            {/* Awards / Highlights */}
            {selectedStudio.awards && selectedStudio.awards.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-xs text-zinc-500 flex items-center space-x-1 mr-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Accolades:</span>
                </span>
                {selectedStudio.awards.map((award, i) => (
                  <span
                    key={i}
                    className="text-xs text-zinc-300 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg"
                  >
                    {award}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Studio Production Catalog Section */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-wide">
                Studio Productions
              </h2>
              <p className="text-xs text-zinc-400">
                Exclusive titles animated and broadcasted by {selectedStudio.name}
              </p>
            </div>

            {/* Interactive Filter Buttons */}
            <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeFilter === 'all'
                    ? 'bg-brand text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                All Works ({totalWorks})
              </button>
              <button
                onClick={() => setActiveFilter('TV Series')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeFilter === 'TV Series'
                    ? 'bg-brand text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                TV Series
              </button>
              <button
                onClick={() => setActiveFilter('Movie')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeFilter === 'Movie'
                    ? 'bg-brand text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Movies
              </button>
            </div>
          </div>

          {/* Anime Grid */}
          {studioAnime.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {studioAnime.map((anime) => (
                <div
                  key={anime.id}
                  onClick={() => onSelectAnime(anime)}
                  className="group cursor-pointer bg-surface rounded-xl overflow-hidden border border-white/10 hover:border-brand/60 transition-all duration-300 hover:-translate-y-1 shadow-lg flex flex-col"
                >
                  <div className="aspect-[2/3] overflow-hidden relative bg-black">
                    {(anime.poster || anime.banner) ? (
                      <img
                        src={anime.poster || anime.banner}
                        alt={anime.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-500 font-bold text-xs p-2 text-center">
                        {anime.title}
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-brand text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow">
                      {anime.episodesCount} EPS
                    </div>
                  </div>

                  <div className="p-3 flex-1 flex flex-col justify-between space-y-1">
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-brand transition-colors line-clamp-1">
                        {anime.title}
                      </h3>
                      <p className="text-[11px] text-zinc-400 line-clamp-1">
                        {anime.genres.slice(0, 2).join(' · ')}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/5">
                      <span className="text-zinc-300 font-semibold">{anime.type}</span>
                      {anime.crew && anime.crew.length > 0 ? (
                        <span className="flex items-center space-x-1 text-pink-400 font-medium text-[10px]">
                          <Instagram className="w-3 h-3" />
                          <span>{anime.crew.length} Staff Contacts</span>
                        </span>
                      ) : (
                        <span>{anime.year}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <Building2 className="w-10 h-10 text-zinc-600 mx-auto" />
              <p className="text-zinc-400 text-sm">
                No productions found under this filter for {selectedStudio.name}.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ALL STUDIOS DIRECTORY GRID VIEW (Default)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen pt-28 sm:pt-32 pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Page Title & Search Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center flex-wrap gap-2 text-brand text-xs font-bold uppercase tracking-widest">
            <div className="flex items-center space-x-1.5">
              <Building2 className="w-4 h-4" />
              <span>Fandub Studios</span>
            </div>
            <span className="text-zinc-600">•</span>
            <span className="bg-brand/20 text-brand border border-brand/40 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold shadow-sm">
              Total {studios.length} {studios.length === 1 ? 'Studio' : 'Studios'} Registered
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-black text-white tracking-tight flex flex-wrap items-baseline gap-3">
            <span>Studios Directory</span>
            <span className="text-xs sm:text-sm font-sans font-medium text-zinc-300 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
              Total <strong className="text-white font-extrabold">{studios.length}</strong> Studios
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl">
            Independent fandub creators & studio profiles. Select any studio to explore their complete anime catalog and production details.
          </p>
        </div>

        {/* Real-time Studio Search Input (Clean & Focused) */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Search ${studios.length} studios by name, city...`}
            value={studioSearch}
            onChange={(e) => setStudioSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand transition-colors"
          />
        </div>
      </div>

      {/* Directory Grid Header */}
      <div className="flex items-center justify-between pt-2">
        <h3 className="font-display text-base sm:text-lg font-bold text-white flex items-center space-x-2">
          <span>All Fandub Studios</span>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/10 text-white font-bold border border-white/10">
            {filteredStudios.length} {filteredStudios.length === 1 ? 'Studio' : 'Studios'}
            {studioSearch.trim() && ` (Total ${studios.length})`}
          </span>
        </h3>
        {studioSearch.trim() && (
          <button
            onClick={() => setStudioSearch('')}
            className="text-xs text-brand hover:underline cursor-pointer"
          >
            Reset Search ({studios.length} total studios)
          </button>
        )}
      </div>

      {/* Studios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudios.map((studio) => {
          const worksCount = animeList.filter(
            (a) =>
              a.studioId === studio.id ||
              a.studioName.toLowerCase() === studio.name.toLowerCase()
          ).length;

          return (
            <div
              key={studio.id}
              onClick={() => onSelectStudio(studio)}
              className="group cursor-pointer rounded-2xl overflow-hidden border border-white/10 bg-surface hover:border-brand/60 transition-all duration-300 hover:-translate-y-1 shadow-xl flex flex-col"
            >
              {/* Studio Banner */}
              <div className="h-32 sm:h-36 w-full relative overflow-hidden bg-zinc-900">
                {studio.banner ? (
                  <img
                    src={studio.banner}
                    alt={studio.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-zinc-900 via-zinc-800 to-black" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
              </div>

              {/* Studio Card Content */}
              <div className="p-5 flex-1 flex flex-col justify-between -mt-10 relative z-10 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-end justify-between">
                    {/* Studio Logo */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white/20 bg-black shadow-lg flex-shrink-0 flex items-center justify-center">
                      {studio.logo ? (
                        <img
                          src={studio.logo}
                          alt={studio.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black text-xl">
                          {studio.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-brand block">
                        {worksCount} Titles
                      </span>
                      <span className="text-[10px] text-zinc-400 block font-mono">
                        Studio Joined On: {new Date(studio.createdAt || '2025-01-01').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center space-x-1.5">
                      <h3 className="font-display text-lg font-bold text-white group-hover:text-brand transition-colors">
                        {studio.name}
                      </h3>
                      {studio.verified && (
                        <CheckCircle className="w-4 h-4 text-brand" />
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 flex items-center space-x-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-zinc-500" />
                      <span>{studio.country}</span>
                      <span>·</span>
                      <span>Est. {studio.established}</span>
                    </p>
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {studio.bio}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-zinc-300 group-hover:text-white">
                  <span>View Studio Portfolio</span>
                  <span className="text-brand group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredStudios.length === 0 && (
        <div className="p-16 text-center rounded-3xl bg-white/5 border border-white/10 space-y-4 max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/30 flex items-center justify-center mx-auto text-brand">
            <Building2 className="w-7 h-7" />
          </div>
          <h4 className="font-display font-bold text-white text-lg">
            {studioSearch.trim() ? 'No Studios Found' : 'No Studios Registered Yet'}
          </h4>
          <p className="text-zinc-400 text-xs leading-relaxed">
            {studioSearch.trim()
              ? `No studios matched your search for "${studioSearch}".`
              : 'Register your independent fandub studio and start streaming anime releases on ZANFT today.'}
          </p>
          {handleRegisterStudio && (
            <button
              onClick={handleRegisterStudio}
              className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-deep text-white text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              Register Your Studio
            </button>
          )}
        </div>
      )}
    </div>
  );
};
