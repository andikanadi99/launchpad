'use client';

import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { auth, db } from '../../lib/firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

/*
  Ensure a Firestore user profile exists.
  - If missing: create users/{uid} with basic info.
  - If it exists: update lastLoginAt.
*/
async function ensureUserDoc(uid: string) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const u = auth.currentUser;
  if (!snap.exists()) {
    await setDoc(ref, {
      email: u?.email ?? null,
      displayName: u?.displayName ?? null,
      photoURL: u?.photoURL ?? null,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, { lastLoginAt: serverTimestamp() }, { merge: true });
  }
}

export default function SignIn() {
  const nav = useNavigate();
  const [params] = useSearchParams();

  // Form + UI state
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Validation states
  const [emailTouched, setEmailTouched] = useState(false);
  const [pwTouched, setPwTouched] = useState(false);

  // Password visibility state
  const [showPw, setShowPw] = useState(false);

  // If user was redirected from a protected page, show a small pop-up
  const [showGuardModal, setShowGuardModal] = useState(false);

  // Where to go after sign-in (defaults to dashboard)
  const next = params.get('next') || '/';

  useEffect(() => {
    if (params.get('reason') === 'protected') {
      setShowGuardModal(true);
    }
    // Prefill email if provided
    const prefill = params.get('email');
    if (prefill) {
      setEmail(prefill);
      setEmailTouched(true);
    }
  }, [params]);

  // Validation helpers
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const emailValid = isValidEmail(email);
  const pwValid = pw.length >= 6;

  /* After successful auth:
     1) Ensure users/{uid} exists (or update lastLoginAt)
     2) Go to `next`
  */
  async function afterAuth() {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await ensureUserDoc(uid);
    nav(next, { replace: true });
  }

  /* Primary: Email sign-in.
     - If the email isn't found → redirect to Sign Up with the email prefilled.
     - If creds are wrong → friendly message (and if no account exists, send to Sign Up).
  */
  async function onEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email, pw);
      await afterAuth();
    } catch (e: any) {
      const code = e?.code as string | undefined;

      // Wrong password, user not found, or invalid credentials
      if (code === 'auth/wrong-password' || 
          code === 'auth/invalid-credential' || 
          code === 'auth/user-not-found') {
        setMsg("We couldn't sign you in. Check your email and password, or create an account if you're new.");
        return;
      }

      if (code === 'auth/too-many-requests') {
        setMsg('Too many attempts. Please wait a bit or reset your password.');
      } else if (code === 'auth/invalid-email') {
        setMsg('Please enter a valid email address.');
      } else {
        setMsg('Email sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  /* Secondary: Google sign-in (creates the account on first use). */
  async function onGoogleClick() {
    setLoading(true);
    setMsg(null);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      await afterAuth();
    } catch (e: any) {
      setMsg(e?.code === 'auth/popup-closed-by-user'
        ? 'Popup closed—try again.'
        : (e?.message ?? 'Google sign-in failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-neutral-100 grid place-items-center p-6 relative">
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full filter blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full filter blur-3xl" />
      </div>

      <div className="w-full max-w-xl relative">
        {/* Main card with gradient border */}
        <div className="p-[1px] rounded-3xl bg-gradient-to-b from-neutral-700 via-neutral-800 to-neutral-900 shadow-2xl">
          <div className="rounded-3xl bg-gradient-to-b from-neutral-900 via-[#0B0B0D] to-neutral-950 p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
                Welcome back to LaunchPad
              </h1>
              <p className="mt-3 text-neutral-400">
                New here?{' '}
                <Link
                  to={`/auth/signup?next=${encodeURIComponent(next)}${email ? `&email=${encodeURIComponent(email)}` : ''}`}
                  className="text-indigo-400 hover:text-indigo-300 hover:underline font-medium transition-colors"
                >
                  Create an account
                </Link>
              </p>
            </div>

            {/* Form */}
            <form onSubmit={onEmailSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-neutral-200 mb-2" htmlFor="email">
                  Email address
                </label>
                <div className="relative group">
                  <input
                    id="email"
                    name="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (!emailTouched) setEmailTouched(true);
                    }}
                    onBlur={() => setEmailTouched(true)}
                    placeholder="you@business.com"
                    type="email"
                    autoComplete="email"
                    required
                    className={`w-full rounded-xl border-2 ${
                      emailTouched 
                        ? emailValid 
                          ? 'border-green-500/50 bg-green-500/5 focus:border-green-400' 
                          : 'border-red-500/50 bg-red-500/5 focus:border-red-400'
                        : 'border-neutral-700 bg-neutral-950/50 focus:border-indigo-500'
                    } px-4 py-3.5 pr-12 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200`}
                  />
                  {emailTouched && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {emailValid ? (
                        <div className="w-6 h-6 rounded-full bg-green-500 grid place-items-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-red-500 grid place-items-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {emailTouched && !emailValid && (
                  <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Enter a valid email address
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-neutral-200" htmlFor="password">
                    Password
                  </label>
                  <Link
                    to={`/auth/forgetpassword?next=${encodeURIComponent(next)}${email ? `&email=${encodeURIComponent(email)}` : ''}`}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    value={pw}
                    onChange={(e) => {
                      setPw(e.target.value);
                      if (!pwTouched) setPwTouched(true);
                    }}
                    onBlur={() => setPwTouched(true)}
                    placeholder="••••••••"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    className={`w-full rounded-xl border-2 ${
                      pwTouched 
                        ? pwValid 
                          ? 'border-green-500/50 bg-green-500/5 focus:border-green-400' 
                          : 'border-red-500/50 bg-red-500/5 focus:border-red-400'
                        : 'border-neutral-700 bg-neutral-950/50 focus:border-indigo-500'
                    } px-4 py-3.5 pr-20 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200`}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {/* Password visibility toggle */}
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="text-neutral-400 hover:text-neutral-200 transition-colors p-1"
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                    {/* Validation indicator */}
                    {pwTouched && (
                      <>
                        {pwValid ? (
                          <div className="w-6 h-6 rounded-full bg-green-500 grid place-items-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-red-500 grid place-items-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !emailValid || !pwValid}
                className="relative w-full group"
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 opacity-100 group-hover:opacity-90 group-disabled:opacity-50 transition-opacity" />
                <div className="relative rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 px-6 py-4 text-white font-semibold text-lg shadow-xl hover:shadow-2xl disabled:cursor-not-allowed transition-all duration-200 hover:-translate-y-0.5">
                  {loading ? (
                    <div className="flex items-center justify-center gap-3">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Signing in...
                    </div>
                  ) : (
                    'Sign in'
                  )}
                </div>
              </button>
            </form>

            {/* Divider */}
            <div className="my-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-700 to-transparent" />
              <span className="text-xs text-neutral-500 font-medium uppercase tracking-wider">or continue with</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-700 to-transparent" />
            </div>

            {/* Google button */}
            <button
              onClick={onGoogleClick}
              disabled={loading}
              className="relative w-full group"
            >
              <div className="absolute inset-0 rounded-xl bg-white/10 group-hover:bg-white/20 transition-colors" />
              <div className="relative flex items-center justify-center gap-3 rounded-xl border-2 border-neutral-700 bg-neutral-900/50 px-6 py-4 font-semibold hover:border-neutral-600 hover:bg-neutral-900 disabled:opacity-60 transition-all duration-200">
                <svg width="20" height="20" viewBox="0 0 533.5 544.3">
                  <path fill="#EA4335" d="M533.5 278.4c0-18.6-1.5-37-4.7-54.8H272.1v103.8h147c-6.3 34-25 62.8-53.6 82.1v68.1h86.5c50.6-46.5 81.5-115.1 81.5-199.2z"/>
                  <path fill="#34A853" d="M272.1 544.3c73.7 0 135.7-24.4 180.9-66.5l-86.5-68.1c-24 16.1-54.7 25.7-94.4 25.7-72.6 0-134.2-49-156.3-115.1H26.3v72.2c45.3 89.9 138.4 151.8 245.8 151.8z"/>
                  <path fill="#4A90E2" d="M115.8 320.3c-10.4-30.9-10.4-64.4 0-95.3V152.8H26.3c-44.7 88.9-44.7 195.5 0 284.4l89.5-72.2z"/>
                  <path fill="#FBBC05" d="M272.1 106.9c39.9-.6 78.1 14 107.4 41.1l80.2-80.2C408.1 24 345.8 0 272.1 0 164.7 0 71.7 61.9 26.3 151.8l89.5 72.2c22-66.1 83.6-117.1 156.3-117.1z"/>
                </svg>
                <span className="text-white">Continue with Google</span>
              </div>
            </button>

            {/* Error message */}
            {msg && (
              <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-300 flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 0016 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {msg}
                </p>
              </div>
            )}

            {/* Legal note */}
            <p className="mt-8 text-xs text-neutral-500 text-center leading-relaxed">
              By continuing, you agree to the{' '}
              <Link to="/terms" className="text-neutral-400 hover:text-neutral-300 underline">Terms</Link>
              {' '}and acknowledge the{' '}
              <Link to="/privacy" className="text-neutral-400 hover:text-neutral-300 underline">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>

      {/* Small pop-up when redirected from a protected page */}
      {showGuardModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowGuardModal(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-required-title"
            className="w-full max-w-md rounded-2xl border border-neutral-700/50 bg-gradient-to-b from-neutral-900 to-neutral-950 p-8 shadow-2xl"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 grid place-items-center flex-shrink-0">
                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 id="login-required-title" className="text-xl font-semibold text-white">
                  Sign in required
                </h2>
                <p className="mt-2 text-sm text-neutral-300">
                  You need to be signed in to access that page. Please sign in to continue.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowGuardModal(false)}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}