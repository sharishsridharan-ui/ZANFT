import React, { useState } from 'react';
import {
  Crown,
  ShieldAlert,
  Building2,
  Film,
  Tv,
  Trash2,
  Edit3,
  Plus,
  Video,
  Play,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Users,
  Search,
  Database,
  RefreshCw,
  Eye,
  ExternalLink
} from 'lucide-react';
import {
  CloudStudio,
  CloudAnime,
  CloudEpisode,
  deleteStudio,
  deleteAnimeFolder,
  updateAnimeFolder,
  createAnimeFolder,
  addEpisodeToAnime,
  deleteEpisodeFromAnime,
  updateStudioByOwner
} from '../services/firestoreService';
import { OwnerSession } from '../types';
import { MAX_STUDIO_CAPACITY } from '../firebase';

interface MasterOwnerDashboardProps {
  session: OwnerSession;
  studios: CloudStudio[];
  allAnime: CloudAnime[];
  onLogout: () => void;
  onPlayEpisode: (anime: CloudAnime, episode: CloudEpisode) => void;
  isOpen: boolean;
  onClose: () => void;
  onBackToHome?: () => void;
}

export const MasterOwnerDashboard: React.FC<MasterOwnerDashboardProps> = ({
  session,
  studios,
  allAnime,
  onLogout,
  onPlayEpisode,
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'studios' | 'anime'>('studios');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals for editing / adding
  const [editingStudio, setEditingStudio] = useState<CloudStudio | null>(null);
  const [editStudioName, setEditStudioName] = useState('');
  const [editStudioLogo, setEditStudioLogo] = useState('');
  const [editStudioBanner, setEditStudioBanner] = useState('');
  const [editStudioBio, setEditStudioBio] = useState('');

  const [editingAnime, setEditingAnime] = useState<CloudAnime | null>(null);
  const [selectedAnimeForEpisode, setSelectedAnimeForEpisode] = useState<CloudAnime | null>(null);
  const [isCreateAnimeOpen, setIsCreateAnimeOpen] = useState(false);

  // Forms
  const [animeTitle, setAnimeTitle] = useState('');
  const [animeType, setAnimeType] = useState<'Series' | 'Movie'>('Series');
  const [animeGenres, setAnimeGenres] = useState('Action, Fantasy');
  const [animeSynopsis, setAnimeSynopsis] = useState('');
  const [animePoster, setAnimePoster] = useState('');
  const [targetStudioId, setTargetStudioId] = useState('');

  // Episode form
  const [epNumber, setEpNumber] = useState(1);
  const [epTitle, setEpTitle] = useState('');
  const [epVideoUrl, setEpVideoUrl] = useState('');
  const [epDuration, setEpDuration] = useState('24m');

  // Status
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; error?: boolean } | null>(null);

  if (!isOpen) return null;

  const showNotify = (msg: string, error = false) => {
    setNotification({ msg, error });
    setTimeout(() => setNotification(null), 3500);
  };

  const remainingSlots = Math.max(0, MAX_STUDIO_CAPACITY - studios.length);
  const totalEpisodes = allAnime.reduce((acc, a) => acc + (a.episodes?.length || 0), 0);
  const totalMovies = allAnime.filter((a) => a.type === 'Movie').length;
  const totalSeries = allAnime.filter((a) => a.type === 'Series').length;

  // Filtered lists
  const filteredStudios = studios.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAnime = allAnime.filter((a) =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.studioName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.genres.some((g) => g.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDeleteStudio = async (studio: CloudStudio) => {
    setLoading(true);
    try {
      await deleteStudio(studio.id, true, true);
      showNotify(`Studio "${studio.name}" deleted. Slot freed up!`);
    } catch (err: any) {
      showNotify(err.message || 'Failed to delete studio', true);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditStudio = (studio: CloudStudio) => {
    setEditingStudio(studio);
    setEditStudioName(studio.name);
    setEditStudioLogo(studio.logo || '');
    setEditStudioBanner(studio.banner || '');
    setEditStudioBio(studio.bio || '');
  };

  const handleSaveStudioEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudio) return;
    setLoading(true);
    try {
      await updateStudioByOwner(editingStudio.id, {
        name: editStudioName.trim(),
        logo: editStudioLogo.trim(),
        banner: editStudioBanner.trim(),
        bio: editStudioBio.trim()
      });
      showNotify(`Studio "${editStudioName}" updated by Master Owner!`);
      setEditingStudio(null);
    } catch (err: any) {
      showNotify(err.message || 'Failed to update studio', true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnime = async (anime: CloudAnime) => {
    setLoading(true);
    try {
      await deleteAnimeFolder(anime.id, '', true);
      showNotify(`Anime "${anime.title}" deleted.`);
    } catch (err: any) {
      showNotify(err.message || 'Failed to delete anime', true);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditAnime = (anime: CloudAnime) => {
    setEditingAnime(anime);
    setAnimeTitle(anime.title);
    setAnimeType(anime.type);
    setAnimeGenres(anime.genres.join(', '));
    setAnimeSynopsis(anime.synopsis);
    setAnimePoster(anime.poster);
  };

  const handleSaveAnimeEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnime) return;
    setLoading(true);
    try {
      await updateAnimeFolder(
        editingAnime.id,
        {
          title: animeTitle.trim(),
          type: animeType,
          genres: animeGenres.split(',').map((g) => g.trim()).filter(Boolean),
          synopsis: animeSynopsis.trim(),
          poster: animePoster.trim()
        },
        '',
        true
      );
      showNotify(`Anime "${animeTitle}" updated by Master Owner!`);
      setEditingAnime(null);
    } catch (err: any) {
      showNotify(err.message || 'Failed to update anime', true);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNewEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnimeForEpisode) return;
    setLoading(true);
    try {
      await addEpisodeToAnime(
        selectedAnimeForEpisode.id,
        {
          number: Number(epNumber),
          title: epTitle.trim(),
          videoUrl: epVideoUrl.trim(),
          duration: epDuration.trim()
        },
        '',
        true
      );
      showNotify(`Episode ${epNumber} added by Master Owner!`);
      setSelectedAnimeForEpisode(null);
    } catch (err: any) {
      showNotify(err.message || 'Failed to add episode', true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEpisode = async (animeId: string, episodeId: string) => {
    try {
      await deleteEpisodeFromAnime(animeId, episodeId, '', true);
      showNotify('Episode deleted.');
    } catch (err: any) {
      showNotify(err.message || 'Failed to delete episode', true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-7xl max-h-[94vh] flex flex-col bg-[#07080F] border border-amber-500/30 rounded-3xl shadow-[0_0_60px_rgba(245,158,11,0.2)] overflow-hidden my-auto">
        {/* Master Gold Glow Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />

        {/* Master Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-[#111322] border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Crown className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-syne font-black text-white text-xl sm:text-2xl tracking-wide">
                  Master Owner Dashboard
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-black text-[11px] font-black uppercase tracking-wider">
                  Absolute Authority
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Logged in as <span className="text-amber-400 font-mono font-bold">{session.username}</span> · Full permissions to edit/delete any studio, anime folder, or episode across all users
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onLogout}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-amber-400" />
              <span>Exit Master Mode</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {notification && (
          <div className={`m-4 p-3 rounded-2xl text-xs flex items-center space-x-2 animate-in fade-in ${
            notification.error
              ? 'bg-red-500/20 border border-red-500/40 text-red-200'
              : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-200'
          }`}>
            {notification.error ? <AlertCircle className="w-4 h-4 text-red-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            <span>{notification.msg}</span>
          </div>
        )}

        {/* Master Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-6 bg-black/40 border-b border-white/5">
          {/* Studio Capacity */}
          <div className="p-3.5 rounded-2xl bg-[#121422] border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Studio Slots (Max 100)</span>
              <Users className="w-4 h-4 text-amber-400" />
            </div>
            <p className="font-syne font-black text-white text-xl sm:text-2xl">
              {studios.length} <span className="text-xs font-normal text-zinc-400">/ 100</span>
            </p>
            <p className="text-[11px] font-bold text-emerald-400">
              {remainingSlots} slots free for new studios
            </p>
          </div>

          {/* Total Anime Folders */}
          <div className="p-3.5 rounded-2xl bg-[#121422] border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Total Anime Folders</span>
              <Film className="w-4 h-4 text-[#E50914]" />
            </div>
            <p className="font-syne font-black text-white text-xl sm:text-2xl">
              {allAnime.length}
            </p>
            <p className="text-[11px] text-zinc-400">
              {totalSeries} Series · {totalMovies} Movies
            </p>
          </div>

          {/* Total Episodes Streamed */}
          <div className="p-3.5 rounded-2xl bg-[#121422] border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Total Episodes</span>
              <Video className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="font-syne font-black text-white text-xl sm:text-2xl">
              {totalEpisodes}
            </p>
            <p className="text-[11px] text-zinc-400">
              Unlisted YouTube streams
            </p>
          </div>

          {/* Cloud Database Status */}
          <div className="p-3.5 rounded-2xl bg-[#121422] border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Cloud DB Engine</span>
              <Database className="w-4 h-4 text-blue-400" />
            </div>
            <p className="font-syne font-black text-white text-base sm:text-lg text-emerald-400">
              Firebase Live
            </p>
            <p className="text-[11px] text-zinc-400 font-mono truncate">
              zanft-2026.firebaseapp.com
            </p>
          </div>
        </div>

        {/* Tab Selector & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-[#0E101D] border-b border-white/10">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('studios')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'studios'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'bg-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Studios Manager ({studios.length}/100)</span>
            </button>

            <button
              onClick={() => setActiveTab('anime')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'anime'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'bg-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>All Anime Folders ({allAnime.length})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search studios or anime..."
              className="w-full pl-9 pr-3 py-1.5 bg-black/60 border border-white/15 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: Studios Manager */}
          {activeTab === 'studios' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-syne font-bold text-white text-base">
                    All Registered Studios ({filteredStudios.length})
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Strict max capacity: 100 studios. Deleting a studio immediately opens a slot back up in the counter.
                  </p>
                </div>
              </div>

              {filteredStudios.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                  <p className="text-xs text-zinc-400">No registered studios match your query.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStudios.map((studio, idx) => (
                    <div
                      key={studio.id}
                      className="p-4 rounded-2xl bg-[#121422] border border-white/10 hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2.5">
                          <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 font-mono text-xs font-bold flex items-center justify-center border border-amber-500/30">
                            #{idx + 1}
                          </span>
                          <div>
                            <h4 className="font-syne font-bold text-white text-sm leading-tight">
                              {studio.name}
                            </h4>
                            <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                              Studio Joined On: {new Date(studio.createdAt || '2025-01-01').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleOpenEditStudio(studio)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                            title="Master Owner: Edit Studio Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudio(studio)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                            title="Master Owner: Delete Studio"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-white/5">
                        <span>
                          {allAnime.filter((a) => a.studioId === studio.id || a.studioName.toLowerCase() === studio.name.toLowerCase()).length} Anime Titles
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Active Slot
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: All Anime Folders & Content Control */}
          {activeTab === 'anime' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-syne font-bold text-white text-base">
                    Platform Global Anime Folders ({filteredAnime.length})
                  </h3>
                  <p className="text-xs text-zinc-400">
                    As Master Owner, you have complete authority to edit or delete any title or episode.
                  </p>
                </div>
              </div>

              {filteredAnime.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                  <p className="text-xs text-zinc-400">No anime titles found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredAnime.map((anime) => (
                    <div
                      key={anime.id}
                      className="p-4 rounded-2xl bg-[#121422] border border-white/10 flex flex-col justify-between space-y-3"
                    >
                      <div className="flex gap-3">
                        {(anime.poster || anime.banner) ? (
                          <img
                            src={anime.poster || anime.banner}
                            alt={anime.title}
                            className="w-20 aspect-[2/3] object-cover rounded-xl border border-white/10 flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-20 aspect-[2/3] rounded-xl border border-white/10 flex-shrink-0 bg-zinc-900 flex items-center justify-center text-zinc-500 font-bold text-[10px] text-center p-1">
                            No Poster
                          </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-syne font-bold text-white text-sm leading-tight truncate">
                                {anime.title}
                              </h4>
                              <p className="text-xs text-amber-400 font-medium">
                                By {anime.studioName}
                              </p>
                            </div>
                            <div className="flex items-center space-x-1 flex-shrink-0">
                              <button
                                onClick={() => handleOpenEditAnime(anime)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white"
                                title="Edit Anime"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteAnime(anime)}
                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                                title="Delete Anime"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-zinc-300">
                            {anime.type} · {anime.genres.join(', ')}
                          </span>

                          <p className="text-xs text-zinc-400 line-clamp-2">
                            {anime.synopsis}
                          </p>
                        </div>
                      </div>

                      {/* Episode Manager Subrow */}
                      <div className="pt-2 border-t border-white/5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-zinc-400">
                            {anime.episodes?.length || 0} Episodes published:
                          </span>
                          <button
                            onClick={() => {
                              setSelectedAnimeForEpisode(anime);
                              setEpNumber((anime.episodes?.length || 0) + 1);
                              setEpTitle(`Episode ${(anime.episodes?.length || 0) + 1}`);
                              setEpVideoUrl('');
                            }}
                            className="text-[11px] font-bold text-amber-400 hover:underline cursor-pointer"
                          >
                            + Master Add Episode
                          </button>
                        </div>

                        {anime.episodes && anime.episodes.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {anime.episodes.map((ep) => (
                              <div
                                key={ep.id}
                                className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-black/40 border border-white/10 text-[10px]"
                              >
                                <span className="font-bold text-white">#{ep.number}</span>
                                <span className="text-zinc-400 truncate max-w-[100px]">{ep.title}</span>
                                <button
                                  onClick={() => onPlayEpisode(anime, ep)}
                                  className="text-emerald-400 hover:text-emerald-300 ml-1"
                                  title="Test Stream"
                                >
                                  <Play className="w-2.5 h-2.5 fill-emerald-400" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEpisode(anime.id, ep.id)}
                                  className="text-red-400 hover:text-red-300 ml-1"
                                  title="Delete Episode"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* EDIT ANIME MODAL (MASTER) */}
        {editingAnime && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="relative w-full max-w-lg bg-[#0F111D] border border-amber-500/40 rounded-3xl shadow-2xl p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="font-syne font-bold text-white text-base">
                  Master Edit: &quot;{editingAnime.title}&quot;
                </h3>
                <button
                  onClick={() => setEditingAnime(null)}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveAnimeEdit} className="space-y-3">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Title</label>
                  <input
                    type="text"
                    required
                    value={animeTitle}
                    onChange={(e) => setAnimeTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-black/50 border border-white/15 rounded-xl text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-zinc-300">Format</label>
                    <select
                      value={animeType}
                      onChange={(e) => setAnimeType(e.target.value as 'Series' | 'Movie')}
                      className="w-full px-3 py-2 bg-black/50 border border-white/15 rounded-xl text-white"
                    >
                      <option value="Series">TV Series</option>
                      <option value="Movie">Theatrical Movie</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-zinc-300">Genres</label>
                    <input
                      type="text"
                      value={animeGenres}
                      onChange={(e) => setAnimeGenres(e.target.value)}
                      className="w-full px-3 py-2 bg-black/50 border border-white/15 rounded-xl text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Poster URL</label>
                  <input
                    type="url"
                    value={animePoster}
                    onChange={(e) => setAnimePoster(e.target.value)}
                    className="w-full px-3 py-2 bg-black/50 border border-white/15 rounded-xl text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Synopsis</label>
                  <textarea
                    rows={3}
                    value={animeSynopsis}
                    onChange={(e) => setAnimeSynopsis(e.target.value)}
                    className="w-full px-3 py-2 bg-black/50 border border-white/15 rounded-xl text-white"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingAnime(null)}
                    className="px-4 py-2 bg-white/5 text-zinc-300 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ADD EPISODE MODAL (MASTER) */}
        {selectedAnimeForEpisode && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="relative w-full max-w-md bg-[#0F111D] border border-amber-500/40 rounded-3xl shadow-2xl p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="font-syne font-bold text-white text-base">
                  Master: Add Episode
                </h3>
                <button
                  onClick={() => setSelectedAnimeForEpisode(null)}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveNewEpisode} className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-semibold text-zinc-300">Ep #</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={epNumber}
                      onChange={(e) => setEpNumber(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-black/50 border border-white/15 rounded-xl text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="font-semibold text-zinc-300">Ep Title</label>
                    <input
                      type="text"
                      required
                      value={epTitle}
                      onChange={(e) => setEpTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-black/50 border border-white/15 rounded-xl text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">YouTube Unlisted Link / ID</label>
                  <input
                    type="text"
                    required
                    value={epVideoUrl}
                    onChange={(e) => setEpVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3 py-2 bg-black/50 border border-white/15 rounded-xl text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Duration</label>
                  <input
                    type="text"
                    value={epDuration}
                    onChange={(e) => setEpDuration(e.target.value)}
                    className="w-full px-3 py-2 bg-black/50 border border-white/15 rounded-xl text-white"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAnimeForEpisode(null)}
                    className="px-4 py-2 bg-white/5 text-zinc-300 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl"
                  >
                    Add Episode
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT STUDIO MODAL (MASTER OWNER GLOBAL AUTHORITY) */}
        {editingStudio && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="relative w-full max-w-lg bg-[#0F111D] border border-amber-500/40 rounded-3xl shadow-2xl p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center space-x-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <h3 className="font-syne font-bold text-white text-base">
                    Master Edit: {editingStudio.name}
                  </h3>
                </div>
                <button
                  onClick={() => setEditingStudio(null)}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveStudioEdit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Studio Name</label>
                  <input
                    type="text"
                    required
                    value={editStudioName}
                    onChange={(e) => setEditStudioName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/50 border border-white/15 rounded-xl text-white text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Studio Logo URL</label>
                  <input
                    type="url"
                    value={editStudioLogo}
                    onChange={(e) => setEditStudioLogo(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 bg-black/50 border border-white/15 rounded-xl text-white text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Studio Background Cover URL</label>
                  <input
                    type="url"
                    value={editStudioBanner}
                    onChange={(e) => setEditStudioBanner(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 bg-black/50 border border-white/15 rounded-xl text-white text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Studio Bio</label>
                  <textarea
                    rows={2}
                    value={editStudioBio}
                    onChange={(e) => setEditStudioBio(e.target.value)}
                    className="w-full px-3.5 py-2 bg-black/50 border border-white/15 rounded-xl text-white text-xs"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingStudio(null)}
                    className="px-4 py-2 bg-white/5 text-zinc-300 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl"
                  >
                    {loading ? 'Saving...' : 'Save Studio Updates'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
