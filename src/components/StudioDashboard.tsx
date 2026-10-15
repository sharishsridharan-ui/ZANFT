import React, { useState, useRef } from 'react';
import {
  Building2,
  Plus,
  Film,
  Tv,
  Trash2,
  Edit3,
  Video,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Play,
  Image as ImageIcon,
  Check,
  ArrowRight,
  MapPin,
  Monitor,
  Smartphone,
  AlertTriangle,
  Clapperboard
} from 'lucide-react';
import {
  CloudStudio,
  CloudAnime,
  CloudEpisode,
  createAnimeFolder,
  updateAnimeFolder,
  deleteAnimeFolder,
  addEpisodeToAnime,
  deleteEpisodeFromAnime,
  updateStudioProfile,
  deleteStudio,
  setAnimeTrailer
} from '../services/firestoreService';
import { StudioSession, Trailer } from '../types';
import { getGoogleDriveStreamInfo } from '../firebase';
import { countText, formatJoinDate } from '../data/labels';
import {
  StreamLinkFields,
  TrailerStepFields,
  TrailerEditorModal,
  emptyTrailerDraft,
  draftToTrailer,
  TrailerMode,
  TrailerDraft
} from './StreamLinkFields';

export const PREDEFINED_GENRES = [
  'Action',
  'Fantasy',
  'Adventure',
  'Romance',
  'Sci-Fi',
  'Shonen',
  'Comedy',
  'Drama',
  'Mystery',
  'Supernatural',
  'Slice of Life',
  'Horror',
  'Sports',
  'Mecha',
  'Isekai',
  'Thriller',
  'Psychological',
  'Historical'
];

export const POPULAR_LOCATIONS = [
  'Chennai',
  'Coimbatore',
  'Madurai',
  'Bengaluru',
  'Trichy',
  'Salem',
  'Tirunelveli',
  'Erode',
  'Vellore',
  'Pondicherry',
  'Jaffna',
  'Singapore'
];

export interface StudioThemeOption {
  id: string;
  name: string;
  tagline: string;
  primary: string;
  secondary: string;
  borderClass: string;
  badgeClass: string;
  glowRgba: string;
}

export const STUDIO_THEMES: StudioThemeOption[] = [
  {
    id: 'crimson',
    name: 'Crimson Flame',
    tagline: 'Bold Shonen & Zanft Signature',
    primary: '#E50914',
    secondary: '#B0000D',
    borderClass: 'border-red-500/40',
    badgeClass: 'bg-red-500/20 text-red-400 border-red-500/30',
    glowRgba: 'rgba(229, 9, 20, 0.45)'
  },
  {
    id: 'cyan',
    name: 'Cyber Neon',
    tagline: 'Futuristic Sci-Fi & Cyberpunk',
    primary: '#00F0FF',
    secondary: '#00B4D8',
    borderClass: 'border-cyan-500/40',
    badgeClass: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    glowRgba: 'rgba(0, 240, 255, 0.45)'
  },
  {
    id: 'emerald',
    name: 'Emerald Mystic',
    tagline: 'Nature, Fantasy & Adventure',
    primary: '#10B981',
    secondary: '#059669',
    borderClass: 'border-emerald-500/40',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    glowRgba: 'rgba(16, 185, 129, 0.45)'
  },
  {
    id: 'purple',
    name: 'Violet Eclipse',
    tagline: 'Dark Fantasy & Supernatural',
    primary: '#8B5CF6',
    secondary: '#7C3AED',
    borderClass: 'border-purple-500/40',
    badgeClass: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    glowRgba: 'rgba(139, 92, 246, 0.45)'
  },
  {
    id: 'amber',
    name: 'Golden Sunset',
    tagline: 'Cinematic Golden Era & Classics',
    primary: '#F59E0B',
    secondary: '#D97706',
    borderClass: 'border-amber-500/40',
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    glowRgba: 'rgba(245, 158, 11, 0.45)'
  },
  {
    id: 'pink',
    name: 'Sakura Blossom',
    tagline: 'Romantic, Slice of Life & Shōjo',
    primary: '#EC4899',
    secondary: '#DB2777',
    borderClass: 'border-pink-500/40',
    badgeClass: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    glowRgba: 'rgba(236, 72, 153, 0.45)'
  }
];

interface StudioDashboardProps {
  session: StudioSession;
  allAnime: CloudAnime[];
  studios: CloudStudio[];
  onLogout: () => void;
  onUpdateSession?: (session: StudioSession) => void;
  onNavigateToStudioProfile?: (studioName: string) => void;
  onPlayEpisode: (anime: CloudAnime, episode: CloudEpisode) => void;
  onClose?: () => void;
  onBackToHome?: () => void;
}

export const StudioDashboard: React.FC<StudioDashboardProps> = ({
  session,
  allAnime,
  studios,
  onLogout,
  onUpdateSession,
  onNavigateToStudioProfile,
  onPlayEpisode,
  onClose,
  onBackToHome
}) => {
  // Current studio data from Firestore or local cache
  const currentStudio = studios.find(
    (s) => s.id === session.studioId || s.name.toLowerCase() === session.studioName.toLowerCase()
  );

  // Filter only this studio's anime folders
  const myAnimeList = allAnime.filter(
    (a) => a.studioId === session.studioId || a.studioName.toLowerCase() === session.studioName.toLowerCase()
  );

  // Modals & Flow State
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingAnime, setEditingAnime] = useState<CloudAnime | null>(null);
  const [selectedAnimeForEpisode, setSelectedAnimeForEpisode] = useState<CloudAnime | null>(null);
  const [isDeleteStudioModalOpen, setIsDeleteStudioModalOpen] = useState(false);

  // Studio Edit Details State
  const [studioName, setStudioName] = useState(currentStudio?.name || session.studioName);
  const [studioPassword, setStudioPassword] = useState('');
  const [logoUrl, setLogoUrl] = useState(currentStudio?.logo || session.logo || '');
  const [pcBannerUrl, setPcBannerUrl] = useState(currentStudio?.banner || session.banner || '');
  const [mobileBannerUrl, setMobileBannerUrl] = useState(currentStudio?.mobileBanner || session.mobileBanner || '');
  const [studioLocation, setStudioLocation] = useState(currentStudio?.location || session.location || '');
  const [studioBio, setStudioBio] = useState(currentStudio?.bio || '');
  const [studioTheme, setStudioTheme] = useState(currentStudio?.theme || session.theme || 'crimson');

  // Active theme helper
  const activeTheme = STUDIO_THEMES.find((t) => t.id === (currentStudio?.theme || session.theme || 'crimson')) || STUDIO_THEMES[0];
  const previewTheme = STUDIO_THEMES.find((t) => t.id === studioTheme) || STUDIO_THEMES[0];

  const handleOpenProfileModal = () => {
    setStudioName(currentStudio?.name || session.studioName);
    setLogoUrl(currentStudio?.logo || session.logo || '');
    setPcBannerUrl(currentStudio?.banner || session.banner || '');
    setMobileBannerUrl(currentStudio?.mobileBanner || session.mobileBanner || '');
    setStudioLocation(currentStudio?.location || session.location || '');
    setStudioBio(currentStudio?.bio || '');
    setStudioTheme(currentStudio?.theme || session.theme || 'crimson');
    setIsProfileModalOpen(true);
  };

  // -------------------------------------------------------------
  // FOLDER CREATION & EDITING STATE (Netflix & Crunchyroll Dual Posters)
  // -------------------------------------------------------------
  // Step 1: Format ("Series" vs "Movie")
  // Step 2: Details & Dual Posters (Landscape 16:9 + Portrait 2:3)
  // Step 3: Initial Episode & Drive Stream Link
  const [createStep, setCreateStep] = useState<1 | 2 | 3 | 4>(1);
  const [folderType, setFolderType] = useState<'Series' | 'Movie'>('Series');
  const [folderTitle, setFolderTitle] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['Action', 'Fantasy']);
  const [customGenreInput, setCustomGenreInput] = useState('');
  const [folderSynopsis, setFolderSynopsis] = useState('');

  // Dual Posters for Creation:
  const [folderPoster, setFolderPoster] = useState(''); // Portrait 2:3 (Mobile feed & Grid cards)
  const [folderBanner, setFolderBanner] = useState(''); // Landscape 16:9 (PC Screens & Top Hero)

  // Dual Posters for Editing:
  const [editFolderPoster, setEditFolderPoster] = useState('');
  const [editFolderBanner, setEditFolderBanner] = useState('');

  // Initial Episode Details for Folder Creation
  const [epNumber, setEpNumber] = useState<number>(1);
  const [epTitle, setEpTitle] = useState('');
  const [epVideoUrl, setEpVideoUrl] = useState(''); // Drive link
  const [epBotUrl, setEpBotUrl] = useState(''); // Telegram bot stream link
  const [trailerMode, setTrailerMode] = useState<TrailerMode>('now');
  const [trailerDraft, setTrailerDraft] = useState<TrailerDraft>(emptyTrailerDraft);
  const [trailerTarget, setTrailerTarget] = useState<CloudAnime | null>(null);
  const [epDuration, setEpDuration] = useState('24m');

  // Single Episode Add Modal (for existing folders)
  const [singleEpNumber, setSingleEpNumber] = useState<number>(1);
  const [singleEpTitle, setSingleEpTitle] = useState('');
  const [singleEpVideoUrl, setSingleEpVideoUrl] = useState(''); // Drive link
  const [singleEpBotUrl, setSingleEpBotUrl] = useState(''); // Telegram bot stream link
  const [singleEpDuration, setSingleEpDuration] = useState('24m');

  // In-App Delete Confirmation State
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: 'folder' | 'episode';
    animeId: string;
    episodeId?: string;
    title: string;
  } | null>(null);

  // File Input Refs
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const pcBannerFileInputRef = useRef<HTMLInputElement>(null);
  const mobileBannerFileInputRef = useRef<HTMLInputElement>(null);

  const createPortraitPosterFileInputRef = useRef<HTMLInputElement>(null);
  const createLandscapeBannerFileInputRef = useRef<HTMLInputElement>(null);

  const editPortraitPosterFileInputRef = useRef<HTMLInputElement>(null);
  const editLandscapeBannerFileInputRef = useRef<HTMLInputElement>(null);

  // Feedback State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setSuccessMsg(null);
    } else {
      setSuccessMsg(msg);
      setErrorMsg(null);
    }
    setTimeout(() => {
      setErrorMsg(null);
      setSuccessMsg(null);
    }, 3500);
  };

  // Reusable Image Compression Helper
  const processImageFile = (
    file: File,
    aspect: 'square' | 'landscape' | 'portrait' | 'mobileBanner',
    callback: (base64: string) => void
  ) => {
    if (!file.type.startsWith('image/')) {
      showNotification('Please select a valid image file (PNG, JPG, WebP).', true);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let maxWidth = 1280;
        let maxHeight = 720;

        if (aspect === 'square') {
          maxWidth = 400;
          maxHeight = 400;
        } else if (aspect === 'portrait') {
          maxWidth = 600;
          maxHeight = 900;
        } else if (aspect === 'mobileBanner') {
          maxWidth = 720;
          maxHeight = 900;
        } else {
          // landscape 16:9
          maxWidth = 1280;
          maxHeight = 720;
        }

        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.86);
        callback(compressed);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Genre helpers
  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleAddCustomGenre = () => {
    const trimmed = customGenreInput.trim();
    if (trimmed && !selectedGenres.includes(trimmed)) {
      setSelectedGenres((prev) => [...prev, trimmed]);
      setCustomGenreInput('');
    }
  };

  // Open "Create Folder" flow
  const handleOpenCreateFolder = () => {
    setCreateStep(1);
    setFolderType('Series');
    setFolderTitle('');
    setSelectedGenres(['Action', 'Fantasy']);
    setCustomGenreInput('');
    setFolderSynopsis('');
    setFolderPoster('');
    setFolderBanner('');
    setEpNumber(1);
    setEpTitle('');
    setEpVideoUrl('');
    setEpBotUrl('');
    setTrailerMode('now');
    setTrailerDraft(emptyTrailerDraft);
    setEpDuration('24m');
    setIsCreateFolderOpen(true);
  };

  // Studio Profile Save Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = studioName.trim();
    if (!cleanName || cleanName.length < 2) {
      showNotification('Studio Name minimum 2 characters irukanum.', true);
      return;
    }

    const resolvedLocation = studioLocation.trim() || 'International';

    const updatedProfileData: any = {
      name: cleanName,
      logo: logoUrl.trim(),
      banner: pcBannerUrl.trim(),
      mobileBanner: mobileBannerUrl.trim(),
      location: resolvedLocation,
      bio: studioBio.trim(),
      theme: studioTheme
    };

    if (studioPassword.trim()) {
      updatedProfileData.password = studioPassword.trim();
    }

    const updatedSession: StudioSession = {
      ...session,
      studioName: cleanName,
      logo: logoUrl.trim(),
      banner: pcBannerUrl.trim(),
      mobileBanner: mobileBannerUrl.trim(),
      location: resolvedLocation,
      bio: studioBio.trim(),
      theme: studioTheme
    };

    // 1. Instant local & session updates
    if (onUpdateSession) {
      onUpdateSession(updatedSession);
    }

    // 2. Dispatch global event so navbar & views refresh immediately
    window.dispatchEvent(
      new CustomEvent('zanft_studio_profile_updated', {
        detail: {
          studioId: session.studioId,
          ...updatedProfileData
        }
      })
    );

    // 3. Dismiss modal and notify user
    setIsProfileModalOpen(false);
    showNotification('Studio profile successfully update aayiduchu!');

    // 4. Background persistence to Firestore
    updateStudioProfile(session.studioId, updatedProfileData).catch((err: any) => {
      console.warn('Background profile sync:', err);
    });
  };

  // Delete Studio Permanently Handler
  const handleConfirmDeleteStudio = async () => {
    setLoading(true);
    try {
      await deleteStudio(session.studioId, true);
      showNotification('Studio profile permanently deleted.');
      setIsDeleteStudioModalOpen(false);
      setIsProfileModalOpen(false);
      // Smooth automatic logout and navigation to home
      onLogout();
    } catch (err: any) {
      showNotification(err.message || 'Unable to delete studio.', true);
    } finally {
      setLoading(false);
    }
  };

  // Submit new folder with initial episode
  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderTitle.trim()) {
      showNotification('Folder Name is required.', true);
      return;
    }
    if (selectedGenres.length === 0) {
      showNotification('Please select at least one genre.', true);
      return;
    }
    if (!epVideoUrl.trim() && !epBotUrl.trim()) {
      showNotification('Add at least one link: Drive link or Telegram bot stream link.', true);
      return;
    }

    // Fallback if one poster is provided
    const resolvedPoster = folderPoster.trim() || folderBanner.trim() || '';
    const resolvedBanner = folderBanner.trim() || folderPoster.trim() || '';

    setLoading(true);
    try {
      await createAnimeFolder(
        {
          title: folderTitle.trim(),
          type: folderType,
          genres: selectedGenres,
          synopsis: folderSynopsis.trim(),
          poster: resolvedPoster,
          banner: resolvedBanner,
          initialEpisode: {
            number: epNumber,
            title: epTitle.trim() || (folderType === 'Movie' ? 'Full Movie' : `Episode ${epNumber}`),
            videoUrl: epVideoUrl.trim(),
            botStreamUrl: epBotUrl.trim(),
            duration: epDuration.trim() || (folderType === 'Movie' ? '1h 45m' : '24m')
          },
          trailer: trailerMode === 'now' ? draftToTrailer(trailerDraft) : null
        },
        session.studioId,
        session.studioName
      );

      showNotification(`Anime folder "${folderTitle}" published successfully with ${folderType === 'Movie' ? 'Movie' : 'Episode'} ${epNumber}!`);
      setIsCreateFolderOpen(false);
    } catch (err: any) {
      showNotification(err.message || 'Unable to create anime folder.', true);
    } finally {
      setLoading(false);
    }
  };

  // Open Edit Folder Modal
  const handleOpenEditFolder = (anime: CloudAnime) => {
    setEditingAnime(anime);
    setFolderTitle(anime.title);
    setFolderType(anime.type);
    setSelectedGenres(anime.genres && anime.genres.length > 0 ? anime.genres : ['Action']);
    setFolderSynopsis(anime.synopsis || '');
    setEditFolderPoster(anime.poster || '');
    setEditFolderBanner(anime.banner || anime.poster || '');
  };

  // Edit existing folder details
  const handleSaveEditFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnime) return;
    if (selectedGenres.length === 0) {
      showNotification('Please select at least one genre.', true);
      return;
    }

    const resolvedPoster = editFolderPoster.trim() || editFolderBanner.trim() || editingAnime.poster;
    const resolvedBanner = editFolderBanner.trim() || editFolderPoster.trim() || editingAnime.banner;

    setLoading(true);
    try {
      await updateAnimeFolder(
        editingAnime.id,
        {
          title: folderTitle.trim(),
          type: folderType,
          genres: selectedGenres,
          synopsis: folderSynopsis.trim(),
          poster: resolvedPoster,
          banner: resolvedBanner
        },
        session.studioId,
        false
      );
      showNotification(`Folder "${folderTitle}" updated successfully.`);
      setEditingAnime(null);
    } catch (err: any) {
      showNotification(err.message || 'Unable to update anime folder.', true);
    } finally {
      setLoading(false);
    }
  };

  // Add individual episode to existing folder
  const handleAddSingleEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnimeForEpisode) return;
    if (!singleEpTitle.trim()) {
      showNotification('Title is required.', true);
      return;
    }
    if (!singleEpVideoUrl.trim() && !singleEpBotUrl.trim()) {
      showNotification('Add at least one link: Drive link or Telegram bot stream link.', true);
      return;
    }

    setLoading(true);
    try {
      await addEpisodeToAnime(
        selectedAnimeForEpisode.id,
        {
          number: Number(singleEpNumber),
          title: singleEpTitle.trim(),
          videoUrl: singleEpVideoUrl.trim(),
          botStreamUrl: singleEpBotUrl.trim(),
          duration: singleEpDuration.trim()
        },
        session.studioId,
        false
      );
      showNotification(`${selectedAnimeForEpisode.type === 'Movie' ? 'Movie' : 'Episode'} ${singleEpNumber} added successfully!`);
      setSelectedAnimeForEpisode(null);
    } catch (err: any) {
      showNotification(err.message || 'Unable to add episode.', true);
    } finally {
      setLoading(false);
    }
  };

  // Add / edit / remove the trailer of an existing folder
  const handleSaveTrailer = async (trailer: Trailer | null) => {
    if (!trailerTarget) return;
    setLoading(true);
    try {
      await setAnimeTrailer(trailerTarget.id, trailer, session.studioId, false);
      showNotification(trailer ? 'Trailer saved.' : 'Trailer removed.');
      setTrailerTarget(null);
    } catch (err: any) {
      showNotification(err.message || 'Unable to save trailer.', true);
    } finally {
      setLoading(false);
    }
  };

  // Confirmed Delete execution (Folder or Episode)
  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget) return;
    setLoading(true);
    try {
      if (deleteConfirmTarget.type === 'folder') {
        await deleteAnimeFolder(deleteConfirmTarget.animeId, session.studioId, false);
        showNotification(`Folder "${deleteConfirmTarget.title}" deleted.`);
      } else if (deleteConfirmTarget.type === 'episode' && deleteConfirmTarget.episodeId) {
        await deleteEpisodeFromAnime(deleteConfirmTarget.animeId, deleteConfirmTarget.episodeId, session.studioId, false);
        showNotification('Episode deleted successfully.');
      }
      setDeleteConfirmTarget(null);
    } catch (err: any) {
      showNotification(err.message || 'Unable to delete.', true);
    } finally {
      setLoading(false);
    }
  };


  const seriesCount = myAnimeList.filter((a) => a.type === 'Series').length;
  const moviesCount = myAnimeList.filter((a) => a.type === 'Movie').length;
  const totalEpisodes = myAnimeList.reduce((acc, a) => acc + (a.episodes?.length || 0), 0);

  return (
    <div className="min-h-screen bg-[#07080F] text-[#F3F4F6] pt-20 pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Studio Cover Banner & Profile Card */}
      <div
        className="relative rounded-3xl overflow-hidden border border-white/10 bg-[#0E101D] shadow-2xl transition-all duration-300"
        style={{
          boxShadow: `0 10px 40px -10px ${activeTheme.glowRgba}`
        }}
      >
        {/* Cover Banner (Clean UI: only single Edit Details button on top right) */}
        <div className="relative h-44 sm:h-64 w-full bg-gradient-to-r from-zinc-900 via-zinc-800 to-black group overflow-hidden">
          {[currentStudio?.banner, session.banner].find((u) => u && u.trim().length > 0) ? (
            <img
              src={[currentStudio?.banner, session.banner].find((u) => u && u.trim().length > 0)}
              alt="Studio Cover"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-[#0e101d] via-[#15192d] to-[#0a0c16] opacity-80" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0E101D] via-[#0E101D]/50 to-transparent" />

          {/* Clean Edit Option on Banner Top Right (No standalone banner button) */}
          <div className="absolute top-4 right-4 flex items-center">
            <button
              onClick={handleOpenProfileModal}
              className="px-3.5 py-1.5 rounded-xl bg-black/60 hover:bg-black/85 backdrop-blur-md border border-white/20 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg transition-all cursor-pointer active:scale-95"
              title="Edit studio details & banners"
            >
              <Edit3 className="w-3.5 h-3.5" style={{ color: activeTheme.primary }} />
              <span>Edit Details</span>
            </button>
          </div>
        </div>

        {/* Profile Info Bar */}
        <div className="relative px-4 sm:px-8 lg:px-10 pb-6 -mt-14 sm:-mt-20 flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-5 w-full md:w-auto">
            {/* Clean Studio Logo (No separate '+' button next to logo) */}
            <div className="relative flex-shrink-0">
              <div
                onClick={handleOpenProfileModal}
                title="Click to update studio logo"
                className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-4 border-[#0E101D] shadow-2xl bg-black cursor-pointer group"
                style={{
                  boxShadow: `0 0 25px ${activeTheme.glowRgba}`
                }}
              >
                {[currentStudio?.logo, session.logo].find((u) => u && u.trim().length > 0) ? (
                  <img
                    src={[currentStudio?.logo, session.logo].find((u) => u && u.trim().length > 0)}
                    alt={session.studioName}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black text-2xl sm:text-3xl">
                    {session.studioName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Edit3 className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>

            {/* Studio Identity Details */}
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-syne text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight break-words">
                  {currentStudio?.name || session.studioName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold inline-flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Verified Studio</span>
                </span>
                <span
                  className="px-2.5 py-0.5 rounded-full border text-[10px] font-bold inline-flex items-center space-x-1"
                  style={{
                    backgroundColor: `${activeTheme.primary}15`,
                    borderColor: `${activeTheme.primary}40`,
                    color: activeTheme.primary
                  }}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{activeTheme.name}</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/10 text-[10px] font-semibold inline-flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-[#E50914]" />
                  <span>{currentStudio?.location || session.location || 'International'}</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/10 text-[10px] font-medium inline-flex items-center space-x-1 font-mono">
                  <span>Joined {formatJoinDate(currentStudio?.createdAt || session.createdAt) ?? 'Date not available'}</span>
                </span>
              </div>
              <p className="text-xs text-zinc-300 max-w-xl line-clamp-2 leading-relaxed">
                {currentStudio?.bio || 'Fan Dub Streaming Platform - Direct Google Drive streaming with Sakuga HD.'}
              </p>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-zinc-400 pt-1">
                <span><strong className="text-white">{myAnimeList.length}</strong> Folders</span>
                <span>·</span>
                <span><strong className="text-white">{seriesCount}</strong> Series</span>
                <span>·</span>
                <span><strong className="text-white">{moviesCount}</strong> Movies</span>
                <span>·</span>
                <span><strong className="text-white">{totalEpisodes}</strong> Episodes</span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Edit, Delete Studio, Logout */}
          <div className="flex flex-row flex-wrap sm:flex-nowrap items-center gap-2.5 w-full md:w-auto pt-2 md:pt-0">
            <button
              onClick={handleOpenProfileModal}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Edit3 className="w-4 h-4" style={{ color: activeTheme.primary }} />
              <span>Edit Details</span>
            </button>

            <button
              onClick={() => setIsDeleteStudioModalOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3.5 py-2.5 bg-red-950/40 hover:bg-red-900/50 text-red-400 hover:text-red-300 border border-red-500/30 text-xs font-semibold rounded-xl transition-all active:scale-95 cursor-pointer"
              title="Delete this studio permanently"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Studio</span>
            </button>

            <button
              onClick={onLogout}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 text-xs font-semibold rounded-xl transition-all active:scale-95 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center space-x-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Dashboard Main Workspace: Sidebar & Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar Control Card */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-5 rounded-2xl bg-[#0E101D] border border-white/10 space-y-4 shadow-xl">
            {/* Primary Action: Create New Folder */}
            <button
              onClick={handleOpenCreateFolder}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#E50914] to-[#B0000D] hover:brightness-110 text-white font-bold rounded-xl shadow-lg shadow-[#E50914]/30 text-xs flex items-center justify-center space-x-2 transition-all hover:scale-102 active:scale-98 cursor-pointer group"
            >
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-extrabold tracking-wide">Create New Folder</span>
            </button>

            <div className="pt-2 border-t border-white/10 space-y-2 text-xs">
              <span className="font-semibold text-zinc-300 block">Uploading Guide:</span>
              <ul className="text-zinc-400 space-y-1.5 text-[11px] list-disc pl-4">
                <li>Choose format: TV Series or Theatrical Movie.</li>
                <li>Upload PC Banner (16:9) & Mobile Poster (2:3).</li>
                <li>Attach Google Drive video stream link.</li>
                <li>Instant HD video playback auto-syncs.</li>
              </ul>
            </div>
          </div>

          {/* Quick Existing Folders List in Sidebar */}
          <div className="p-4 rounded-2xl bg-[#0E101D] border border-white/10 space-y-3">
            <h4 className="font-syne font-bold text-white text-xs flex items-center justify-between">
              <span>Your Anime Folders</span>
              <span className="font-mono text-zinc-400">({myAnimeList.length})</span>
            </h4>

            {myAnimeList.length === 0 ? (
              <p className="text-[11px] text-zinc-500 italic py-2">
                No folders created yet. Click the button above to start!
              </p>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {myAnimeList.map((anime) => {
                  const sideThumb = [anime.poster, anime.banner].find((u) => u && u.trim().length > 0) || null;
                  return (
                    <div
                      key={anime.id}
                      className="flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      {sideThumb ? (
                        <img
                          src={sideThumb}
                          alt={anime.title}
                          className="w-8 h-11 object-cover rounded-md border border-white/10 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-11 rounded-md border border-white/10 flex-shrink-0 bg-zinc-900 flex items-center justify-center text-zinc-500 font-bold text-[8px]">
                          Anime
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white text-xs truncate">{anime.title}</p>
                        <p className="text-[10px] text-zinc-400">
                          {anime.type} · {anime.episodes?.length || 0} eps
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Content Area: Anime Folders Gallery */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-syne font-bold text-white text-lg sm:text-xl">
                Studio Anime Library ({myAnimeList.length})
              </h2>
              <p className="text-xs text-zinc-400">
                Edit, manage, and attach Google Drive video streams to your independent anime releases.
              </p>
            </div>
          </div>

          {myAnimeList.length === 0 ? (
            <div className="p-12 border-2 border-dashed border-white/10 rounded-3xl text-center space-y-3 bg-white/[0.01]">
              <Film className="w-12 h-12 mx-auto text-zinc-600" />
              <h3 className="font-syne font-bold text-white text-base">Your Studio Library is Empty</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Click &quot;Create New Folder&quot; to add a TV Series or Movie and upload dual posters for PC & Mobile!
              </p>
              <button
                onClick={handleOpenCreateFolder}
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#E50914] text-white text-xs font-bold rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Anime Folder</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {myAnimeList.map((anime) => (
                <div
                  key={anime.id}
                  className="rounded-2xl border border-white/10 bg-[#0E101D] p-4 flex flex-col justify-between space-y-4 hover:border-white/20 transition-all shadow-xl"
                >
                  <div className="flex gap-3.5">
                    {/* Vertical Poster Preview */}
                    <div className="w-24 aspect-[2/3] rounded-xl overflow-hidden bg-black border border-white/10 flex-shrink-0 relative">
                      {(anime.poster || anime.banner) ? (
                        <img
                          src={anime.poster || anime.banner}
                          alt={anime.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-500 font-bold text-[9px] text-center p-1">
                          No Poster
                        </div>
                      )}
                      <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[9px] font-bold text-white border border-white/10">
                        {anime.type}
                      </span>
                    </div>

                    {/* Meta Details */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="font-syne font-bold text-white text-sm sm:text-base leading-snug truncate">
                          {anime.title}
                        </h3>
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <button
                            onClick={() => handleOpenEditFolder(anime)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                            title="Edit Folder & Posters"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmTarget({ type: 'folder', animeId: anime.id, title: anime.title })}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-white transition-colors cursor-pointer"
                            title="Delete Folder"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 text-[10px]">
                        {anime.genres.map((g, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-white/5 text-zinc-300 border border-white/5"
                          >
                            {g}
                          </span>
                        ))}
                      </div>

                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {anime.synopsis || 'No synopsis provided.'}
                      </p>

                      <div className="pt-1 flex items-center justify-between text-xs text-zinc-400">
                        <span>{countText(anime, anime.episodes?.length || 0)} published</span>
                        <div className="flex items-center gap-3">
                        <button
                          onClick={() => setTrailerTarget(anime)}
                          className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-bold text-zinc-300 hover:text-white cursor-pointer"
                          title={anime.trailer ? 'Edit or remove trailer' : 'Add trailer'}
                        >
                          <Clapperboard className="w-3.5 h-3.5" />
                          <span>Trailer</span>
                          {anime.trailer && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAnimeForEpisode(anime);
                            const nextNum = (anime.episodes?.length || 0) + 1;
                            setSingleEpNumber(nextNum);
                            setSingleEpTitle(anime.type === 'Movie' ? 'Feature Film' : `Episode ${nextNum}`);
                            setSingleEpVideoUrl('');
                            setSingleEpBotUrl('');
                            setSingleEpDuration(anime.type === 'Movie' ? '1h 45m' : '24m');
                          }}
                          className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-bold text-[#E50914] hover:text-red-400 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add {anime.type === 'Movie' ? 'Movie' : 'Episode'}</span>
                        </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Episodes List */}
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <span className="text-[11px] font-semibold text-zinc-400 block">
                      Video Streaming {anime.type === 'Movie' ? 'Movies' : 'Episodes'} ({anime.episodes?.length || 0}):
                    </span>

                    {(!anime.episodes || anime.episodes.length === 0) ? (
                      <p className="text-xs text-zinc-500 italic py-1">
                        No {anime.type === 'Movie' ? 'movies' : 'episodes'} added yet. Click &quot;Add {anime.type === 'Movie' ? 'Movie' : 'Episode'}&quot; to attach your video stream.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {anime.episodes.map((ep) => {
                          const epDrive = getGoogleDriveStreamInfo(ep.videoUrl);
                          const epThumb = ep.thumbnail || epDrive.thumbnailUrl || anime.poster;
                          return (
                            <div
                              key={ep.id}
                              className="flex items-center justify-between gap-4 p-3 rounded-lg bg-slate-900/60 border border-white/5 text-xs hover:border-white/15 transition-all"
                            >
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <span className="font-mono font-bold text-[#E50914] w-6 text-center">
                                  #{ep.number}
                                </span>
                                {epThumb && epThumb.trim() !== '' && (
                                  <img
                                    src={epThumb}
                                    alt="thumb"
                                    className="w-10 h-6 object-cover rounded border border-white/10 flex-shrink-0"
                                  />
                                )}
                                <div className="truncate">
                                  <div className="flex items-center space-x-1.5">
                                    <p className="font-semibold text-white truncate">{ep.title}</p>
                                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold flex items-center space-x-0.5 flex-shrink-0">
                                      <CheckCircle2 className="w-2.5 h-2.5" />
                                      <span>Drive Stream</span>
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-zinc-400 font-mono">
                                    Drive: {epDrive.fileId ? `ID: ${epDrive.fileId.slice(0, 8)}...` : 'Linked'} · {ep.duration}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center space-x-1 flex-shrink-0">
                                <button
                                  onClick={() => onPlayEpisode(anime, ep)}
                                  className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 hover:text-white transition-colors cursor-pointer"
                                  title="Test Stream"
                                >
                                  <Play className="w-3.5 h-3.5 fill-emerald-400" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmTarget({
                                    type: 'episode',
                                    animeId: anime.id,
                                    episodeId: ep.id,
                                    title: `${anime.title} - ${anime.type === 'Movie' ? 'Movie' : 'Episode'} ${ep.number}: ${ep.title}`
                                  })}
                                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-white transition-colors cursor-pointer"
                                  title="Delete Episode"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: STEP-BY-STEP CREATE FOLDER WITH DUAL POSTERS     */}
      {/* ========================================================= */}
      {isCreateFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#0E101D] border border-white/15 rounded-3xl shadow-2xl p-6 space-y-5 my-auto max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#E50914]/20 border border-[#E50914]/40 flex items-center justify-center text-[#E50914]">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-syne font-bold text-white text-base sm:text-lg">
                    Create New Anime Folder
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Step {createStep} of 4: {createStep === 1 ? 'Format Selection' : createStep === 2 ? 'Details & Dual Posters' : createStep === 3 ? 'Trailer' : `Attach First ${folderType === 'Movie' ? 'Movie' : 'Episode'}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateFolderOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hidden File Inputs for Create Folder */}
            <input
              type="file"
              ref={createPortraitPosterFileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  processImageFile(e.target.files[0], 'portrait', (base64) => {
                    setFolderPoster(base64);
                    showNotification('Portrait poster selected from gallery!');
                  });
                }
              }}
            />
            <input
              type="file"
              ref={createLandscapeBannerFileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  processImageFile(e.target.files[0], 'landscape', (base64) => {
                    setFolderBanner(base64);
                    showNotification('Landscape banner selected from gallery!');
                  });
                }
              }}
            />

            {/* STEP 1: Format Selection (Movie vs Series) */}
            {createStep === 1 && (
              <div className="space-y-4 py-2">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Step 1: Select Content Format:
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <div
                    onClick={() => setFolderType('Series')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                      folderType === 'Series'
                        ? 'bg-[#E50914]/20 border-[#E50914] shadow-lg shadow-[#E50914]/20'
                        : 'bg-black/40 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Tv className={`w-6 h-6 ${folderType === 'Series' ? 'text-[#E50914]' : 'text-zinc-400'}`} />
                      {folderType === 'Series' && <Check className="w-4 h-4 text-[#E50914]" />}
                    </div>
                    <h4 className="font-syne font-bold text-white text-base">TV Series</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Multiple episodes, seasons & sequential Google Drive links.
                    </p>
                  </div>

                  <div
                    onClick={() => setFolderType('Movie')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                      folderType === 'Movie'
                        ? 'bg-[#E50914]/20 border-[#E50914] shadow-lg shadow-[#E50914]/20'
                        : 'bg-black/40 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Film className={`w-6 h-6 ${folderType === 'Movie' ? 'text-[#E50914]' : 'text-zinc-400'}`} />
                      {folderType === 'Movie' && <Check className="w-4 h-4 text-[#E50914]" />}
                    </div>
                    <h4 className="font-syne font-bold text-white text-base">Theatrical Movie</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Single standalone feature film or cinematic special broadcast.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => setCreateStep(2)}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-[#E50914] hover:bg-[#B0000D] text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
                  >
                    <span>Next: Dual Posters & Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Name, Genres, Dual Posters (Netflix & Crunchyroll style) */}
            {createStep === 2 && (
              <div className="flex-1 overflow-y-auto space-y-4 py-1 pr-1 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Anime / Folder Name</label>
                  <input
                    type="text"
                    required
                    value={folderTitle}
                    onChange={(e) => setFolderTitle(e.target.value)}
                    placeholder="e.g. Solo Leveling Tamil Dub, Bleach, etc."
                    className="w-full px-3.5 py-2 bg-black/50 border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-[#E50914]"
                  />
                </div>

                {/* Genre Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-zinc-300">
                      Genres ({selectedGenres.length} selected)
                    </label>
                  </div>

                  {selectedGenres.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-black/40 rounded-xl border border-white/10">
                      {selectedGenres.map((genre) => (
                        <span
                          key={genre}
                          className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#E50914] text-white text-xs font-bold shadow-sm"
                        >
                          <span>{genre}</span>
                          <button
                            type="button"
                            onClick={() => toggleGenre(genre)}
                            className="hover:bg-black/20 rounded p-0.5 transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {PREDEFINED_GENRES.map((genre) => {
                      const isSelected = selectedGenres.includes(genre);
                      return (
                        <button
                          type="button"
                          key={genre}
                          onClick={() => toggleGenre(genre)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
                            isSelected
                              ? 'bg-[#E50914] text-white border border-[#E50914]'
                              : 'bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          <span>{genre}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* RESPONSIVE DUAL-POSTER SPECIFICATION: Landscape (16:9) + Portrait (2:3) */}
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-xs flex items-center space-x-1.5">
                        <ImageIcon className="w-4 h-4 text-[#E50914]" />
                        <span>Responsive Dual Poster Uploads</span>
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        Upload both formats for optimal display across desktop and mobile screens.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Option A: Landscape Banner Image URL (for PC / Laptop screens) */}
                    <div className="p-3.5 rounded-2xl bg-black/60 border border-white/15 space-y-2.5 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-200 text-xs flex items-center space-x-1">
                            <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Option A: Landscape Banner (16:9)</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 text-[10px] font-bold">
                            PC / Desktop
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400">
                          Landscape 16:9 aspect ratio. Displayed on PC / Desktop screens and top hero section.
                        </p>
                      </div>

                      {(folderBanner && folderBanner.trim() !== '') ? (
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-white/20 bg-zinc-900 group">
                          <img src={folderBanner.trim()} alt="Landscape Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => createLandscapeBannerFileInputRef.current?.click()}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs cursor-pointer"
                          >
                            Change 16:9 Banner
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => createLandscapeBannerFileInputRef.current?.click()}
                          className="aspect-video rounded-xl border-2 border-dashed border-white/20 hover:border-cyan-400/80 bg-zinc-900/60 hover:bg-zinc-900 transition-all flex flex-col items-center justify-center text-center p-3 cursor-pointer group"
                        >
                          <Monitor className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform mb-1" />
                          <span className="font-bold text-white text-[11px]">Upload Landscape Banner</span>
                          <span className="text-[10px] text-zinc-500">Tap to browse gallery</span>
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={folderBanner}
                          onChange={(e) => setFolderBanner(e.target.value)}
                          placeholder="Landscape Banner Image URL (16:9)..."
                          className="flex-1 px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white text-[10px] focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>

                    {/* Option B: 2:3 Portrait Poster Image URL (for Mobile screens) */}
                    <div className="p-3.5 rounded-2xl bg-black/60 border border-white/15 space-y-2.5 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-200 text-xs flex items-center space-x-1">
                            <Smartphone className="w-3.5 h-3.5 text-[#E50914]" />
                            <span>Option B: 2:3 Portrait Poster</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-red-500/15 text-red-300 text-[10px] font-bold">
                            Mobile & Catalog
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400">
                          Vertical 2:3 portrait ratio. Displayed on Mobile screens, series rows, and catalog listings.
                        </p>
                      </div>

                      {(folderPoster && folderPoster.trim() !== '') ? (
                        <div className="relative aspect-[2/3] max-h-36 mx-auto rounded-xl overflow-hidden border border-white/20 bg-zinc-900 group">
                          <img src={folderPoster.trim()} alt="Portrait Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => createPortraitPosterFileInputRef.current?.click()}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs cursor-pointer"
                          >
                            Change 2:3 Poster
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => createPortraitPosterFileInputRef.current?.click()}
                          className="aspect-[2/3] max-h-36 mx-auto w-24 rounded-xl border-2 border-dashed border-white/20 hover:border-red-500/80 bg-zinc-900/60 hover:bg-zinc-900 transition-all flex flex-col items-center justify-center text-center p-2 cursor-pointer group"
                        >
                          <Smartphone className="w-5 h-5 text-[#E50914] group-hover:scale-110 transition-transform mb-1" />
                          <span className="font-bold text-white text-[10px]">Upload 2:3 Poster</span>
                          <span className="text-[9px] text-zinc-500">Device Gallery</span>
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={folderPoster}
                          onChange={(e) => setFolderPoster(e.target.value)}
                          placeholder="2:3 Portrait Poster Image URL..."
                          className="flex-1 px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white text-[10px] focus:outline-none focus:border-[#E50914]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Synopsis / Description</label>
                  <textarea
                    rows={2}
                    value={folderSynopsis}
                    onChange={(e) => setFolderSynopsis(e.target.value)}
                    placeholder="Enter storyline, voice cast, and fan dub production summary..."
                    className="w-full px-3.5 py-2 bg-black/50 border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-[#E50914]"
                  />
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateStep(1)}
                    className="px-4 py-2 bg-white/5 text-zinc-300 rounded-xl hover:bg-white/10 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!folderTitle.trim()) {
                        showNotification('Please enter an anime title', true);
                        return;
                      }
                      setCreateStep(3);
                    }}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-[#E50914] hover:bg-[#B0000D] text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
                  >
                    <span>Next: Trailer</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Initial Episode & Drive Video URL */}
            {createStep === 3 && (
              <div className="space-y-4 py-2 text-xs">
                <TrailerStepFields
                  mode={trailerMode}
                  onModeChange={setTrailerMode}
                  draft={trailerDraft}
                  onDraftChange={setTrailerDraft}
                />

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateStep(2)}
                    className="px-4 py-2 bg-white/5 text-zinc-300 rounded-xl hover:bg-white/10 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (trailerMode === 'now' && !draftToTrailer(trailerDraft)) {
                        showNotification('Trailer link add pannunga, illana "Maybe Later" select pannunga.', true);
                        return;
                      }
                      setCreateStep(4);
                    }}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-[#E50914] hover:bg-[#B0000D] text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
                  >
                    <span>Next: Attach First {folderType === 'Movie' ? 'Movie' : 'Episode'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {createStep === 4 && (
              <form onSubmit={handleCreateFolderSubmit} className="space-y-4 py-2 text-xs">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-zinc-300">{folderType === 'Movie' ? 'Movie #' : 'Episode #'}</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={epNumber}
                      onChange={(e) => setEpNumber(Number(e.target.value))}
                      className="w-full px-3.5 py-2 bg-black/50 border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-[#E50914]"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="font-semibold text-zinc-300">{folderType === 'Movie' ? 'Movie Title' : 'Episode Title'}</label>
                    <input
                      type="text"
                      required
                      value={epTitle}
                      onChange={(e) => setEpTitle(e.target.value)}
                      placeholder={folderType === 'Movie' ? 'Full Theatrical Cut' : 'Episode 1: Thodakkam'}
                      className="w-full px-3.5 py-2 bg-black/50 border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-[#E50914]"
                    />
                  </div>
                </div>

                <StreamLinkFields
                  driveUrl={epVideoUrl}
                  botUrl={epBotUrl}
                  onDriveChange={setEpVideoUrl}
                  onBotChange={setEpBotUrl}
                />

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateStep(3)}
                    className="px-4 py-2 bg-white/5 text-zinc-300 rounded-xl hover:bg-white/10 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center space-x-2 px-6 py-2.5 bg-[#E50914] hover:bg-[#B0000D] disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-lg shadow-[#E50914]/30 transition-all cursor-pointer"
                  >
                    {loading ? (
                      <span>Creating Folder...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Publish Folder</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: STUDIO PROFILE & EDIT FLOW (Location & Dual Banners) */}
      {/* ========================================================= */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#0F111D] border border-white/15 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <div
              className="h-1.5 w-full transition-all duration-300"
              style={{ backgroundColor: previewTheme.primary }}
            />

            <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: `${previewTheme.primary}25`, color: previewTheme.primary }}
                >
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-syne font-black text-white text-lg tracking-tight">
                    Studio Details & Dual Banners Setup
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Edit location, PC banner (16:9), Mobile banner, and branding details
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hidden File Inputs for Profile */}
            <input
              type="file"
              ref={logoFileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  processImageFile(e.target.files[0], 'square', (base64) => {
                    setLogoUrl(base64);
                    showNotification('Studio logo selected from gallery!');
                  });
                }
              }}
            />
            <input
              type="file"
              ref={pcBannerFileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  processImageFile(e.target.files[0], 'landscape', (base64) => {
                    setPcBannerUrl(base64);
                    showNotification('PC widescreen banner (16:9) selected!');
                  });
                }
              }}
            />
            <input
              type="file"
              ref={mobileBannerFileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  processImageFile(e.target.files[0], 'mobileBanner', (base64) => {
                    setMobileBannerUrl(base64);
                    showNotification('Mobile banner selected!');
                  });
                }
              }}
            />

            <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs pr-4">
              {/* 1. STUDIO NAME */}
              <div className="space-y-1.5">
                <label className="font-bold text-zinc-200 flex items-center justify-between text-xs">
                  <span>1. Studio Name (Public Brand)</span>
                  <span className="text-[10px] text-zinc-500 font-mono">{studioName.length}/40</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={40}
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                  placeholder="e.g. Zen Dub Studios"
                  className="w-full px-4 py-2.5 bg-black/60 border border-white/15 rounded-xl text-white text-sm font-semibold focus:outline-none focus:border-emerald-400"
                />
                <p className="text-[11px] text-zinc-400">
                  Your studio name will appear across anime folders, video player, and header titles.
                </p>
              </div>

              {/* 2. STUDIO LOCATION FIELD */}
              <div className="space-y-1.5">
                <label className="font-bold text-zinc-200 flex items-center justify-between text-xs">
                  <span className="flex items-center space-x-1.5">
                    <MapPin className="w-4 h-4 text-[#E50914]" />
                    <span>2. Studio Location / Oor</span>
                  </span>
                  <span className="text-[10px] text-zinc-400">Type or select below</span>
                </label>
                <input
                  type="text"
                  value={studioLocation}
                  onChange={(e) => setStudioLocation(e.target.value)}
                  placeholder="e.g. Chennai, Coimbatore, Madurai, Bengaluru..."
                  className="w-full px-4 py-2.5 bg-black/60 border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-red-400"
                />
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] text-zinc-400 block font-medium">Quick Select Popular Cities:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_LOCATIONS.map((city) => (
                      <button
                        type="button"
                        key={city}
                        onClick={() => setStudioLocation(city)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                          studioLocation.toLowerCase() === city.toLowerCase()
                            ? 'bg-[#E50914] text-white shadow-sm'
                            : 'bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10'
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. STUDIO LOGO / AVATAR */}
              <div className="space-y-2">
                <label className="font-bold text-zinc-200 flex items-center justify-between text-xs">
                  <span>3. Studio Logo / Avatar (Square)</span>
                  <span className="text-[10px] text-emerald-400 font-bold">Square 1:1</span>
                </label>
                <div className="p-3.5 rounded-2xl bg-black/60 border border-white/15 flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/20 bg-zinc-900 flex-shrink-0">
                      {logoUrl && logoUrl.trim() !== '' ? (
                        <img src={logoUrl.trim()} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold text-lg">
                          {(studioName || 'S').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {logoUrl && logoUrl.trim() !== '' ? 'Studio Logo Set' : 'No Logo Uploaded'}
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        Square avatar for navigation bar & player watermarks.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => logoFileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer flex-shrink-0"
                  >
                    Select Logo
                  </button>
                </div>
              </div>

              {/* 4. DUAL-BANNER SPECIFICATIONS (PC Banner + Mobile Banner) */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div>
                  <h4 className="font-bold text-white text-xs flex items-center space-x-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                    <span>4. Dual Banner Uploads (PC & Mobile Optimized)</span>
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Upload a widescreen 16:9 banner for desktop/laptop displays, and a compact banner for mobile devices separately.
                  </p>
                </div>

                {/* A) PC Banner (16:9 Widescreen) */}
                <div className="p-3.5 rounded-2xl bg-black/60 border border-white/15 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-200 text-xs flex items-center space-x-1.5">
                      <Monitor className="w-4 h-4 text-cyan-400" />
                      <span>a) PC Banner (Optimized Wide Screen 16:9 Layout)</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 text-[10px] font-bold">
                      Desktop 16:9
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    Widescreen cinematic cover banner for laptops, desktops, and large displays.
                  </p>

                  <div className="flex items-center space-x-3 pt-1">
                    <div className="w-24 h-14 rounded-xl overflow-hidden border border-white/20 bg-zinc-900 flex-shrink-0">
                      {pcBannerUrl && pcBannerUrl.trim() !== '' ? (
                        <img src={pcBannerUrl.trim()} alt="PC Banner" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500">
                          No 16:9 Banner
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <input
                        type="text"
                        value={pcBannerUrl}
                        onChange={(e) => setPcBannerUrl(e.target.value)}
                        placeholder="PC Banner image link or choose gallery below..."
                        className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        type="button"
                        onClick={() => pcBannerFileInputRef.current?.click()}
                        className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold rounded-lg text-[10px] cursor-pointer"
                      >
                        Choose PC Banner from Gallery
                      </button>
                    </div>
                  </div>
                </div>

                {/* B) Mobile Banner (Compact / Vertical layout) */}
                <div className="p-3.5 rounded-2xl bg-black/60 border border-white/15 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-200 text-xs flex items-center space-x-1.5">
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      <span>b) Mobile Banner (Optimized Compact / Phone Layout)</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 text-[10px] font-bold">
                      Mobile Screen
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    Optimized compact layout tailored for smartphone screens without being clipped.
                  </p>

                  <div className="flex items-center space-x-3 pt-1">
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/20 bg-zinc-900 flex-shrink-0">
                      {mobileBannerUrl && mobileBannerUrl.trim() !== '' ? (
                        <img src={mobileBannerUrl.trim()} alt="Mobile Banner" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500 text-center p-1">
                          No Mobile Banner
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <input
                        type="text"
                        value={mobileBannerUrl}
                        onChange={(e) => setMobileBannerUrl(e.target.value)}
                        placeholder="Mobile Banner link or select below..."
                        className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-400"
                      />
                      <button
                        type="button"
                        onClick={() => mobileBannerFileInputRef.current?.click()}
                        className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold rounded-lg text-[10px] cursor-pointer"
                      >
                        Choose Mobile Banner from Gallery
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. VISUAL THEME ACCENT */}
              <div className="space-y-2">
                <label className="font-bold text-zinc-200 flex items-center justify-between text-xs">
                  <span>5. Studio Profile Theme Accent</span>
                  <span className="text-[10px] text-zinc-400">{previewTheme.name}</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STUDIO_THEMES.map((theme) => {
                    const isSelected = studioTheme === theme.id;
                    return (
                      <button
                        type="button"
                        key={theme.id}
                        onClick={() => setStudioTheme(theme.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-center space-x-2.5 cursor-pointer ${
                          isSelected ? 'border-white/40 shadow-lg' : 'border-white/10 bg-black/40'
                        }`}
                        style={{
                          backgroundColor: isSelected ? `${theme.primary}18` : undefined,
                          borderColor: isSelected ? theme.primary : undefined
                        }}
                      >
                        <span
                          className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: theme.primary }}
                        >
                          {isSelected && <Check className="w-3 h-3 text-black stroke-[3]" />}
                        </span>
                        <span className="text-xs font-bold text-white truncate">{theme.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6. STUDIO BIO */}
              <div className="space-y-1.5">
                <label className="font-bold text-zinc-200 flex items-center justify-between text-xs">
                  <span>6. Studio Bio / Philosophy</span>
                  <span className="text-[10px] text-zinc-500 font-mono">{studioBio.length}/300</span>
                </label>
                <textarea
                  rows={2}
                  maxLength={300}
                  value={studioBio}
                  onChange={(e) => setStudioBio(e.target.value)}
                  placeholder="Write about your fandub crew details, voice actors, upcoming releases, and milestones..."
                  className="w-full px-4 py-2 bg-black/60 border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* DANGER ZONE: DELETE STUDIO OPTION */}
              <div className="p-3.5 rounded-2xl bg-red-950/20 border border-red-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-red-300 text-xs flex items-center space-x-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                      <span>Studio Deletion (Danger Zone)</span>
                    </h5>
                    <p className="text-[10px] text-zinc-400">
                      Permanently delete your studio profile and all associated anime folders.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteStudioModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md transition-all active:scale-95"
                  >
                    Delete Studio
                  </button>
                </div>
              </div>

              {/* Sticky Footer inside Form */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 text-black font-extrabold rounded-xl shadow-lg transition-all text-xs cursor-pointer flex items-center space-x-1.5"
                  style={{
                    backgroundColor: previewTheme.primary,
                    boxShadow: `0 0 20px ${previewTheme.glowRgba}`
                  }}
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Save Studio Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {trailerTarget && (
        <TrailerEditorModal
          key={trailerTarget.id}
          animeTitle={trailerTarget.title}
          initial={trailerTarget.trailer}
          loading={loading}
          onSave={(t) => handleSaveTrailer(t)}
          onRemove={() => handleSaveTrailer(null)}
          onClose={() => setTrailerTarget(null)}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL 3: ADD SINGLE EPISODE (To an existing folder)       */}
      {/* ========================================================= */}
      {selectedAnimeForEpisode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#0E101D] border border-white/15 rounded-3xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <Video className="w-5 h-5 text-[#E50914]" />
                <h3 className="font-syne font-bold text-white text-base">
                  Add {selectedAnimeForEpisode.type === 'Movie' ? 'Movie' : 'Episode'}: {selectedAnimeForEpisode.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAnimeForEpisode(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSingleEpisode} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-zinc-300">{selectedAnimeForEpisode.type === 'Movie' ? 'Movie #' : 'Ep #'}</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={singleEpNumber}
                    onChange={(e) => setSingleEpNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-black/50 border border-white/15 rounded-xl text-white text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-semibold text-zinc-300">{selectedAnimeForEpisode.type === 'Movie' ? 'Movie Title' : 'Episode Title'}</label>
                  <input
                    type="text"
                    required
                    value={singleEpTitle}
                    onChange={(e) => setSingleEpTitle(e.target.value)}
                    placeholder="e.g. Episode Title"
                    className="w-full px-3 py-2 bg-black/50 border border-white/15 rounded-xl text-white text-sm"
                  />
                </div>
              </div>

              <StreamLinkFields
                driveUrl={singleEpVideoUrl}
                botUrl={singleEpBotUrl}
                onDriveChange={setSingleEpVideoUrl}
                onBotChange={setSingleEpBotUrl}
              />

              <div className="flex justify-end space-x-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedAnimeForEpisode(null)}
                  className="px-4 py-2 bg-white/5 text-zinc-300 rounded-xl hover:bg-white/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#E50914] hover:bg-[#B0000D] disabled:opacity-50 text-white font-bold rounded-xl cursor-pointer"
                >
                  {loading ? 'Adding...' : `Add ${selectedAnimeForEpisode.type === 'Movie' ? 'Movie' : 'Episode'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: EDIT FOLDER (With Dual Posters & Delete Folder)  */}
      {/* ========================================================= */}
      {editingAnime && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-[#0E101D] border border-white/15 rounded-3xl shadow-2xl p-6 space-y-4 text-xs my-auto max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-shrink-0">
              <h3 className="font-syne font-bold text-white text-base">
                Edit Folder: {editingAnime.title}
              </h3>
              <button
                onClick={() => setEditingAnime(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hidden File Inputs for Edit Folder */}
            <input
              type="file"
              ref={editPortraitPosterFileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  processImageFile(e.target.files[0], 'portrait', (base64) => {
                    setEditFolderPoster(base64);
                    showNotification('Portrait poster updated!');
                  });
                }
              }}
            />
            <input
              type="file"
              ref={editLandscapeBannerFileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  processImageFile(e.target.files[0], 'landscape', (base64) => {
                    setEditFolderBanner(base64);
                    showNotification('Landscape banner updated!');
                  });
                }
              }}
            />

            <form onSubmit={handleSaveEditFolder} className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Folder Title</label>
                <input
                  type="text"
                  required
                  value={folderTitle}
                  onChange={(e) => setFolderTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-black/50 border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-[#E50914]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Format</label>
                <select
                  value={folderType}
                  onChange={(e) => setFolderType(e.target.value as 'Series' | 'Movie')}
                  className="w-full px-3.5 py-2 bg-black/50 border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-[#E50914]"
                >
                  <option value="Series">TV Series</option>
                  <option value="Movie">Theatrical Movie</option>
                </select>
              </div>

              {/* Genre selection */}
              <div className="space-y-2">
                <label className="font-semibold text-zinc-300">Genres ({selectedGenres.length} selected)</label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {PREDEFINED_GENRES.map((g) => {
                    const isSelected = selectedGenres.includes(g);
                    return (
                      <button
                        type="button"
                        key={g}
                        onClick={() => toggleGenre(g)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
                          isSelected ? 'bg-[#E50914] text-white' : 'bg-white/5 text-zinc-300 border border-white/10'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        <span>{g}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DUAL POSTERS IN EDIT MODE (Landscape 16:9 + Portrait 2:3) */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <span className="font-bold text-white text-xs block">
                  Responsive Dual Poster Formats
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option A: Landscape 16:9 Banner */}
                  <div className="p-3 rounded-2xl bg-black/60 border border-white/15 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-200 text-xs flex items-center space-x-1">
                        <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Option A: Landscape (16:9)</span>
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-bold">
                        PC / Desktop
                      </span>
                    </div>

                    <div className="aspect-video rounded-xl overflow-hidden border border-white/15 bg-zinc-900 relative">
                      {editFolderBanner && editFolderBanner.trim() !== '' ? (
                        <img src={editFolderBanner.trim()} alt="Landscape" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500">
                          No 16:9 Banner
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => editLandscapeBannerFileInputRef.current?.click()}
                      className="w-full py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold rounded-lg text-[10px] cursor-pointer"
                    >
                      Change 16:9 Banner
                    </button>
                  </div>

                  {/* Option B: Portrait 2:3 Poster */}
                  <div className="p-3 rounded-2xl bg-black/60 border border-white/15 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-200 text-xs flex items-center space-x-1">
                        <Smartphone className="w-3.5 h-3.5 text-[#E50914]" />
                        <span>Option B: Portrait (2:3)</span>
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[9px] font-bold">
                        Mobile & Catalog
                      </span>
                    </div>

                    <div className="aspect-[2/3] max-h-24 mx-auto rounded-xl overflow-hidden border border-white/15 bg-zinc-900 relative">
                      {editFolderPoster && editFolderPoster.trim() !== '' ? (
                        <img src={editFolderPoster.trim()} alt="Portrait" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500">
                          No 2:3 Poster
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => editPortraitPosterFileInputRef.current?.click()}
                      className="w-full py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold rounded-lg text-[10px] cursor-pointer"
                    >
                      Change 2:3 Poster
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Synopsis</label>
                <textarea
                  rows={2}
                  value={folderSynopsis}
                  onChange={(e) => setFolderSynopsis(e.target.value)}
                  className="w-full px-3.5 py-2 bg-black/50 border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-[#E50914]"
                />
              </div>

              {/* Action buttons including Delete Folder */}
              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    const targetAnime = editingAnime;
                    setEditingAnime(null);
                    setDeleteConfirmTarget({
                      type: 'folder',
                      animeId: targetAnime.id,
                      title: targetAnime.title
                    });
                  }}
                  className="px-3.5 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Folder</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingAnime(null)}
                    className="px-4 py-2 bg-white/5 text-zinc-300 rounded-xl hover:bg-white/10 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-[#E50914] hover:bg-[#B0000D] disabled:opacity-50 text-white font-bold rounded-xl transition-all cursor-pointer"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: CONFIRM DELETE FOLDER OR EPISODE                 */}
      {/* ========================================================= */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#0E101D] border border-red-500/40 rounded-3xl shadow-[0_0_50px_rgba(229,9,20,0.3)] p-6 space-y-4 text-xs">
            <div className="flex items-center space-x-3 pb-3 border-b border-white/10">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-500 flex-shrink-0 shadow-lg">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-syne font-bold text-white text-base">
                  Delete Confirmation
                </h3>
                <p className="text-[11px] text-zinc-400">
                  {deleteConfirmTarget.type === 'folder' ? 'Are you sure you want to delete this Anime Folder?' : 'Are you sure you want to remove this Episode?'}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-red-950/30 border border-red-500/30 rounded-2xl space-y-1.5">
              <p className="text-zinc-100 font-semibold text-xs">
                This item will be permanently deleted:
              </p>
              <p className="text-red-400 font-bold text-sm break-words bg-black/40 p-2 rounded-xl border border-red-500/20">
                &quot;{deleteConfirmTarget.title}&quot;
              </p>
              <p className="text-[11px] text-zinc-400 leading-relaxed pt-1">
                {deleteConfirmTarget.type === 'folder'
                  ? 'All episodes and data inside this folder will be completely removed.'
                  : 'This episode will be removed from the streaming list.'}
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                disabled={loading}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 font-bold rounded-xl cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={loading}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-600/30 cursor-pointer text-xs disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 6: PERMANENT STUDIO DELETION CONFIRMATION           */}
      {/* ========================================================= */}
      {isDeleteStudioModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#0F101A] border-2 border-red-500/60 rounded-3xl shadow-[0_0_60px_rgba(229,9,20,0.4)] p-6 space-y-4 text-xs">
            <div className="flex items-center space-x-3 pb-3 border-b border-red-500/20">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-500 flex-shrink-0 shadow-lg animate-pulse">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-syne font-black text-white text-base sm:text-lg">
                  Delete Studio Profile?
                </h3>
                <p className="text-[11px] text-red-400 font-semibold">
                  Permanent removal confirmation
                </p>
              </div>
            </div>

            <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-2xl space-y-2">
              <p className="text-white font-bold text-xs">
                Studio: &quot;{currentStudio?.name || session.studioName}&quot;
              </p>
              <p className="text-zinc-300 text-[11px] leading-relaxed">
                Your studio profile, anime folders, episodes, and directory listings will be permanently deleted. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteStudioModalOpen(false)}
                disabled={loading}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-zinc-200 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStudio}
                disabled={loading}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-red-600/40 flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>Deleting Studio...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Delete Studio</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
