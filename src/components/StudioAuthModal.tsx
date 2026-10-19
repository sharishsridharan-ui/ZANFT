import React, { useState, useEffect } from 'react';
import { Building2, X, AlertCircle, Crown, Eye, EyeOff } from 'lucide-react';
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
  /** 'login' (default) opens Login / Sign up, 'owner' opens Owner login, 'register' opens Sign up. */
  initialTab?: 'register' | 'login' | 'owner';
}

const inputCls =
  'w-full px-3.5 py-2.5 bg-black/50 border border-white/15 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-brand transition-colors';

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
  </svg>
);

const PasswordField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  focusClass?: string;
  hint?: React.ReactNode;
}> = ({ label, value, onChange, placeholder, focusClass, hint }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
        <span>{label}</span>
        {hint}
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          required
          minLength={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${inputCls} pr-10 ${focusClass || ''}`}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export const StudioAuthModal: React.FC<StudioAuthModalProps> = ({
  isOpen,
  onClose,
  studiosCount,
  onStudioLoginSuccess,
  onOwnerLoginSuccess,
  initialTab = 'login'
}) => {
  const isOwnerView = initialTab === 'owner';
  const [mode, setMode] = useState<'login' | 'signup'>(initialTab === 'register' ? 'signup' : 'login');

  const [signupName, setSignupName] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [googleUser, setGoogleUser] = useState<{
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  } | null>(null);

  const [ownerUsername, setOwnerUsername] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Every time the modal opens, start from the view the button asked for
  useEffect(() => {
    if (isOpen) {
      setMode(initialTab === 'register' ? 'signup' : 'login');
      setErrorMessage(null);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const remainingSlots = Math.max(0, MAX_STUDIO_CAPACITY - studiosCount);
  const isCapacityFull = remainingSlots === 0;

  const finishStudioLogin = (
    studio: { id: string; name: string; createdAt?: string; logo?: string; banner?: string; theme?: string },
    fallbackLogo?: string | null
  ) => {
    onStudioLoginSuccess({
      studioId: studio.id,
      studioName: studio.name,
      createdAt: studio.createdAt,
      logo: studio.logo || fallbackLogo || undefined,
      banner: studio.banner,
      theme: studio.theme
    });
    onClose();
  };

  // One Google button for both log in and sign up: it signs in, or creates the studio the first time
  const handleGoogle = async () => {
    setErrorMessage(null);
    setLoading(true);
    try {
      const user = await signInWithGooglePopup();
      if (!user) return;
      setGoogleUser({ uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL });
      const studio = await loginOrCreateWithGoogle({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      });
      if (studio) finishStudioLogin(studio, user.photoURL);
    } catch (err: any) {
      if (err.code === 'auth/configuration-not-found') {
        setErrorMessage(
          'Google sign-in is not enabled in Firebase yet (Authentication, Sign-in method). Enable it, or use Studio Name and Password below.'
        );
      } else if (err.code === 'auth/unauthorized-domain') {
        setErrorMessage('This website domain is not in Firebase Authorized Domains (Authentication, Settings).');
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(err.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isCapacityFull) {
      setErrorMessage(`All ${MAX_STUDIO_CAPACITY} studio slots are filled.`);
      return;
    }
    const name = signupName.trim();
    const pass = signupPassword.trim();
    if (name.length < 2) {
      setErrorMessage('Studio name must be at least 2 characters.');
      return;
    }
    if (pass.length < 4) {
      setErrorMessage('Password must be at least 4 characters.');
      return;
    }
    if (pass !== signupConfirm.trim()) {
      setErrorMessage('Password and Confirm Password do not match.');
      return;
    }

    setLoading(true);
    try {
      const studio = await registerStudio(name, pass, googleUser || undefined);
      finishStudioLogin(studio);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not create the studio. Try another name.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const pass = loginPassword.trim();
    if (!pass) {
      setErrorMessage('Please enter your password.');
      return;
    }
    setLoading(true);
    try {
      const studio = await loginStudio(loginIdentifier.trim(), pass, googleUser?.uid);
      finishStudioLogin(studio);
    } catch (err: any) {
      setErrorMessage(err.message || 'Wrong studio name or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!verifyMasterOwner(ownerUsername, ownerPassword)) {
      setErrorMessage('Access denied: wrong owner username or password.');
      return;
    }
    // The owner needs a real Firebase identity so Firestore rules allow deleting across all studios
    try {
      await signInWithGooglePopup();
    } catch (err) {
      console.warn('Owner Google sign-in skipped/failed:', err);
      setErrorMessage('Google sign-in was cancelled. Owner actions need it, so please try again.');
      return;
    }
    onOwnerLoginSuccess({ isOwner: true, username: ownerUsername, loginTime: new Date().toISOString() });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={isOwnerView ? 'Owner login' : 'Log in or sign up'}
    >
      <div className="relative w-full max-w-md bg-surface border border-white/15 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden my-auto">
        <div className={`h-1.5 w-full ${isOwnerView ? 'bg-amber' : 'bg-brand'}`} />

        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl border flex items-center justify-center ${
                isOwnerView ? 'bg-amber/15 border-amber/40 text-amber' : 'bg-brand/15 border-brand/40 text-brand'
              }`}
            >
              {isOwnerView ? <Crown className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-display font-black text-white text-xl">
                {isOwnerView ? 'Owner login' : mode === 'login' ? 'Log in' : 'Sign up'}
              </h2>
              <p className="text-xs text-zinc-400">
                {isOwnerView
                  ? 'Full control of every studio and video'
                  : mode === 'login'
                  ? 'Welcome back to your studio'
                  : 'Create your fandub studio'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {errorMessage && (
            <div
              className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-200 text-xs flex items-start gap-2"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* ---------------- OWNER LOGIN ---------------- */}
          {isOwnerView && (
            <form onSubmit={handleOwnerLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">Owner username</label>
                <input
                  type="text"
                  required
                  value={ownerUsername}
                  onChange={(e) => setOwnerUsername(e.target.value)}
                  className={`${inputCls} focus:border-amber`}
                />
              </div>
              <PasswordField
                label="Owner password"
                value={ownerPassword}
                onChange={setOwnerPassword}
                focusClass="focus:border-amber"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-amber hover:brightness-110 text-black font-black rounded-xl text-sm transition-all"
              >
                {loading ? 'Checking...' : 'Open owner dashboard'}
              </button>
            </form>
          )}

          {/* ---------------- STUDIO LOG IN / SIGN UP ---------------- */}
          {!isOwnerView && (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-white hover:bg-zinc-200 text-zinc-900 rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 transition-colors disabled:opacity-60"
              >
                <GoogleIcon />
                <span>{googleUser ? `Connected: ${googleUser.email}` : 'Continue with Google'}</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-white/10 w-full" />
                <span className="bg-surface px-3 text-xs text-zinc-500 font-bold absolute">or</span>
              </div>

              {mode === 'signup' ? (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Studio name</label>
                    <input
                      type="text"
                      required
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      placeholder="e.g. Matrix Tamil"
                      className={inputCls}
                    />
                  </div>
                  <PasswordField
                    label="Password"
                    value={signupPassword}
                    onChange={setSignupPassword}
                    placeholder="At least 4 characters"
                  />
                  <PasswordField
                    label="Confirm password"
                    value={signupConfirm}
                    onChange={setSignupConfirm}
                    placeholder="Type it again"
                    hint={
                      signupPassword && signupConfirm ? (
                        <span
                          className={`text-[11px] font-bold ${
                            signupPassword === signupConfirm ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {signupPassword === signupConfirm ? 'Match' : 'Do not match'}
                        </span>
                      ) : undefined
                    }
                  />
                  <button
                    type="submit"
                    disabled={loading || isCapacityFull}
                    className="w-full py-3 bg-brand hover:bg-brand-deep disabled:opacity-50 text-white font-black rounded-xl text-sm transition-colors"
                  >
                    {loading ? 'Creating...' : 'Create studio'}
                  </button>
                  {isCapacityFull && (
                    <p className="text-center text-xs text-red-300">Sign-ups are closed: all studio slots are filled.</p>
                  )}
                  <p className="text-center text-xs text-zinc-400">
                    Already have a studio?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setErrorMessage(null);
                      }}
                      className="font-bold text-brand hover:underline"
                    >
                      Log in
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Studio name or Google email</label>
                    <input
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="e.g. Matrix Tamil"
                      className={inputCls}
                    />
                  </div>
                  <PasswordField
                    label="Password"
                    value={loginPassword}
                    onChange={setLoginPassword}
                    placeholder="Your studio password"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-brand hover:bg-brand-deep disabled:opacity-50 text-white font-black rounded-xl text-sm transition-colors"
                  >
                    {loading ? 'Logging in...' : 'Log in'}
                  </button>
                  <p className="text-center text-xs text-zinc-400">
                    New here?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup');
                        setErrorMessage(null);
                      }}
                      className="font-bold text-brand hover:underline"
                    >
                      Sign up
                    </button>
                  </p>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
