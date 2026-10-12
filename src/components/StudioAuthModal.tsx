import React, { useState } from 'react';
import {
  Building2,
  Lock,
  Key,
  X,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  UserCheck
} from 'lucide-react';
import {
  registerStudio,
  loginStudio,
  verifyMasterOwner,
  signInWithGooglePopup,
  loginOrCreateWithGoogle
} from '../services/firestoreService';
import { MAX_STUDIO_CAPACITY } from '../firebase';
import { StudioSession, OwnerSession } from '../types';

interface StudioAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  studiosCount: number;
  onStudioLoginSuccess: (session: StudioSession) => void;
  onOwnerLoginSuccess: (session: OwnerSession) => void;
  initialTab?: 'register' | 'login' | 'owner';
}

export const StudioAuthModal: React.FC<StudioAuthModalProps> = ({
  isOpen,
  onClose,
  studiosCount,
  onStudioLoginSuccess,
  onOwnerLoginSuccess,
  initialTab = 'register'
}) => {
  const [activeTab, setActiveTab] = useState<'register' | 'login' | 'owner'>(initialTab);

  // Sync activeTab whenever the modal is opened with a new initialTab
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, initialTab]);

  // Registration form states
  const [regStudioName, setRegStudioName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Login form states
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Google User state
  const [googleUser, setGoogleUser] = useState<{
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  } | null>(null);

  // Master Owner form states
  const [ownerUsername, setOwnerUsername] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);

  // Status & Validation
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const remainingSlots = Math.max(0, MAX_STUDIO_CAPACITY - studiosCount);
  const isCapacityFull = remainingSlots === 0;

  // Handle Google Sign-In Popup with Instant Login & Firebase Linking
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const user = await signInWithGooglePopup();
      if (user) {
        setGoogleUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        });

        // Fast auto-login or auto-registration with Google:
        const studio = await loginOrCreateWithGoogle({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        });

        if (studio) {
          onStudioLoginSuccess({
            studioId: studio.id,
            studioName: studio.name,
            createdAt: studio.createdAt,
            logo: studio.logo || user.photoURL || undefined,
            banner: studio.banner,
            theme: studio.theme
          });
          onClose();
          return;
        }
      }
    } catch (err: any) {
      if (err.code === 'auth/configuration-not-found') {
        setErrorMessage(
          'Firebase Error (auth/configuration-not-found): Authentication & Google Provider are not enabled yet in the Firebase Console. Please enable Google Sign-in in Firebase Console -> Authentication -> Sign-in Method, or register and log in instantly with Studio Name & Password below.'
        );
      } else if (err.code === 'auth/unauthorized-domain') {
        setErrorMessage(
          'Firebase Error (auth/unauthorized-domain): This domain is not in Firebase Authorized Domains. Please add this domain in Firebase Console -> Authentication -> Settings -> Authorized Domains.'
        );
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(err.message || 'Google Sign-In failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Quick Studio Login Fallback if Google Auth isn't enabled in console yet
  const handleQuickFallbackLogin = () => {
    const defaultStudioName = regStudioName.trim() || loginIdentifier.trim() || 'CreatorStudio';
    onStudioLoginSuccess({
      studioId: `studio_${Date.now()}`,
      studioName: defaultStudioName,
      createdAt: new Date().toISOString(),
      logo: ''
    });
    onClose();
  };

  // Handle Registration with Password & Confirm Password validation
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (isCapacityFull) {
      setErrorMessage(`Capacity limit reached: All ${MAX_STUDIO_CAPACITY} studio slots are filled.`);
      return;
    }

    const cleanName = regStudioName.trim();
    const cleanPass = regPassword.trim();
    const cleanConfirm = regConfirmPassword.trim();

    if (!cleanName || cleanName.length < 2) {
      setErrorMessage('Studio Name must be at least 2 characters long.');
      return;
    }

    if (!cleanPass || cleanPass.length < 4) {
      setErrorMessage('Password must be at least 4 characters long.');
      return;
    }

    // REQUIRE PASSWORD AND CONFIRM PASSWORD TO MATCH
    if (cleanPass !== cleanConfirm) {
      setErrorMessage('Validation Alert: Password and Confirm Password do not match. Please verify both fields.');
      return;
    }

    setLoading(true);
    try {
      const studio = await registerStudio(cleanName, cleanPass, googleUser || undefined);
      onStudioLoginSuccess({
        studioId: studio.id,
        studioName: studio.name,
        createdAt: studio.createdAt,
        logo: studio.logo,
        banner: studio.banner,
        theme: studio.theme
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to register studio. Please choose another name.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Studio Login with immediate error feedback
  const handleStudioLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanIdentifier = loginIdentifier.trim();
    const cleanPass = loginPassword.trim();

    if (!cleanPass) {
      setErrorMessage('Please enter your studio password.');
      return;
    }

    setLoading(true);
    try {
      const studio = await loginStudio(cleanIdentifier, cleanPass, googleUser?.uid);
      onStudioLoginSuccess({
        studioId: studio.id,
        studioName: studio.name,
        createdAt: studio.createdAt,
        logo: studio.logo,
        banner: studio.banner,
        theme: studio.theme
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid Studio Name or Password. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Master Owner Login strictly with hardcoded credentials
  const handleOwnerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (verifyMasterOwner(ownerUsername, ownerPassword)) {
      onOwnerLoginSuccess({
        isOwner: true,
        username: ownerUsername,
        loginTime: new Date().toISOString()
      });
      onClose();
    } else {
      setErrorMessage('Access Denied: Invalid Master Owner credentials.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#0F111D] border border-white/15 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden my-auto">
        {/* Glow Header Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#E50914] via-[#FF5E62] to-[#E50914]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E50914]/20 border border-[#E50914]/40 flex items-center justify-center text-[#E50914]">
              {activeTab === 'owner' ? (
                <Crown className="w-5 h-5 text-amber-400" />
              ) : (
                <Building2 className="w-5 h-5 text-[#E50914]" />
              )}
            </div>
            <div>
              <h2 className="font-syne font-black text-white text-lg sm:text-xl tracking-tight">
                {activeTab === 'register' && 'Studio Registration'}
                {activeTab === 'login' && 'Studio Creator Login'}
                {activeTab === 'owner' && 'Master Owner Access'}
              </h2>
              <p className="text-xs text-zinc-400">
                {activeTab === 'owner'
                  ? 'Super-Admin Control with global database authority'
                  : 'Fast Authentication with Firebase Google Login & Cloud Storage'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Studio Capacity Banner */}
        {activeTab !== 'owner' && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isCapacityFull ? 'bg-red-500 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
              <span className="text-xs text-zinc-300 font-semibold">
                Studio Capacity Slots:
              </span>
            </div>
            <div className="flex items-center space-x-1.5 font-mono text-xs">
              <span className={`font-bold px-2 py-0.5 rounded-md ${isCapacityFull ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'}`}>
                {remainingSlots} / {MAX_STUDIO_CAPACITY} Available
              </span>
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex border-b border-white/10 mx-6 mt-4 text-xs font-bold">
          <button
            onClick={() => {
              setActiveTab('register');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 pb-3 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'register'
                ? 'border-[#E50914] text-[#E50914]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            New Studio Sign-Up
          </button>
          <button
            onClick={() => {
              setActiveTab('login');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 pb-3 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'login'
                ? 'border-[#E50914] text-[#E50914]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            Studio Login
          </button>
          <button
            onClick={() => {
              setActiveTab('owner');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 pb-3 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'owner'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            Owner Access
          </button>
        </div>

        {/* Form Container */}
        <div className="p-6 space-y-4">
          {/* Notification Messages */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
              {errorMessage.includes('configuration-not-found') && (
                <div className="pt-2 border-t border-red-500/30 flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
                  <span className="text-[11px] text-zinc-300">You can still proceed with instant direct login:</span>
                  <button
                    type="button"
                    onClick={handleQuickFallbackLogin}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap self-start sm:self-auto"
                  >
                    Quick Studio Login (Direct Access)
                  </button>
                </div>
              )}
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 1: STUDIO REGISTRATION (GOOGLE SIGN-IN + PASSWORD)    */}
          {/* ======================================================== */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Google Fast Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/15 rounded-xl text-white text-xs font-bold flex items-center justify-center space-x-2.5 transition-all active:scale-98 cursor-pointer shadow-md"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>{googleUser ? `Connected: ${googleUser.email}` : 'Sign Up with Google for Instant Setup'}</span>
              </button>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-white/10 w-full" />
                <span className="bg-[#0F111D] px-3 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                  Studio Credentials
                </span>
              </div>

              {/* Studio Name Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>Unique Studio Name</span>
                  <span className="text-[10px] text-zinc-500">Immutable after creation</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={regStudioName}
                    onChange={(e) => setRegStudioName(e.target.value)}
                    placeholder="e.g. AnimeStudio, TamilFandub"
                    className="w-full px-3.5 py-2.5 bg-black/50 border border-white/15 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#E50914] transition-colors"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Studio Password</label>
                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    minLength={4}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="At least 4 characters"
                    className="w-full px-3.5 py-2.5 pr-10 bg-black/50 border border-white/15 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#E50914] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>Confirm Password</span>
                  {regPassword && regConfirmPassword && (
                    <span className={`text-[10px] font-bold ${regPassword === regConfirmPassword ? 'text-emerald-400' : 'text-red-400'}`}>
                      {regPassword === regConfirmPassword ? '✓ Passwords Match' : '✗ Passwords Do Not Match'}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showRegConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={4}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Re-enter password to confirm"
                    className={`w-full px-3.5 py-2.5 pr-10 bg-black/50 border rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none transition-colors ${
                      regConfirmPassword && regPassword !== regConfirmPassword
                        ? 'border-red-500/80 focus:border-red-500'
                        : 'border-white/15 focus:border-[#E50914]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || isCapacityFull}
                className="w-full py-3 bg-gradient-to-r from-[#E50914] to-[#B0000D] hover:brightness-110 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-lg shadow-[#E50914]/25 transition-all cursor-pointer mt-2"
              >
                {loading ? 'Registering Studio...' : 'Complete Studio Registration'}
              </button>
            </form>
          )}

          {/* ======================================================== */}
          {/* TAB 2: STUDIO LOGIN                                      */}
          {/* ======================================================== */}
          {activeTab === 'login' && (
            <form onSubmit={handleStudioLogin} className="space-y-4">
              {/* Google Fast Login Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/15 rounded-xl text-white text-xs font-bold flex items-center justify-center space-x-2.5 transition-all active:scale-98 cursor-pointer shadow-md"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>{googleUser ? `Autofilled: ${googleUser.email}` : 'Sign In with Google Account'}</span>
              </button>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-white/10 w-full" />
                <span className="bg-[#0F111D] px-3 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                  Or Enter Credentials
                </span>
              </div>

              {/* Studio Name or Email */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Studio Name or Google Email</label>
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="e.g. MappaTamil or email@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-black/50 border border-white/15 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#E50914] transition-colors"
                />
              </div>

              {/* Enter Password Once */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Studio Password</label>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your studio password"
                    className="w-full px-3.5 py-2.5 pr-10 bg-black/50 border border-white/15 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#E50914] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#E50914] hover:bg-[#B0000D] disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-lg shadow-[#E50914]/25 transition-all cursor-pointer mt-2"
              >
                {loading ? 'Authenticating...' : 'Sign In to Studio Portal'}
              </button>
            </form>
          )}

          {/* ======================================================== */}
          {/* TAB 3: MASTER OWNER (SUPER-ADMIN ONLY)                   */}
          {/* ======================================================== */}
          {activeTab === 'owner' && (
            <form onSubmit={handleOwnerLogin} className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-[11px] text-amber-200">
                <span className="font-bold block text-amber-400">Master Owner Authority:</span>
                Owner logs in strictly with master credentials to view, edit, or delete any studio, anime folder, or episode across all users.
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Owner Username</label>
                <input
                  type="text"
                  required
                  value={ownerUsername}
                  onChange={(e) => setOwnerUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/50 border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Owner Password</label>
                <div className="relative">
                  <input
                    type={showOwnerPassword ? 'text' : 'password'}
                    required
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 bg-black/50 border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    {showOwnerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-black font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer mt-2"
              >
                {loading ? 'Verifying Authorization...' : 'Access Master Owner Dashboard'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
