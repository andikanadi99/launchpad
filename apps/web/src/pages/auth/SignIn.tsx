'use client';

import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { auth, db } from '../../lib/firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  fetchSignInMethodsForEmail,
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

  // If user was redirected from a protected page, show a small pop-up
  const [showGuardModal, setShowGuardModal] = useState(false);

  // Where to go after sign-in (defaults to onboarding)
  const next = params.get('next') || '/onboarding/account_page';

  useEffect(() => {
    if (params.get('reason') === 'protected') {
      setShowGuardModal(true);
    }
  }, [params]);

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
      await signInWithEmailAndPassword(auth, email, pw);
      await afterAuth();
    } catch (e: any) {
      const code = e?.code as string | undefined;

      // No account → go create one
      if (code === 'auth/user-not-found') {
        nav(`/auth/signup?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`, { replace: true });
        return;
      }

      // Wrong password OR generic invalid credentials
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        try {
          // Check if this email exists at all; if not, send to Sign Up
          const methods = await fetchSignInMethodsForEmail(auth, email);
          if (!methods || methods.length === 0) {
            nav(`/auth/signup?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`, { replace: true });
            return;
          }
        } catch {/* ignore lookup errors */}
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
    <div className="min-h-screen bg-[#0B0B0D] text-neutral-100 grid place-items-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
        <h1 className="text-xl font-semibold">Sign in to LaunchPad</h1>
        <p className="mt-1 text-sm text-neutral-400">
          New here?{' '}
          <Link
            to={`/auth/signup?next=${encodeURIComponent(next)}${email ? `&email=${encodeURIComponent(email)}` : ''}`}
            className="text-indigo-400 hover:underline"
          >
            Create an account
          </Link>
          .
        </p>

        {/* Primary: Email + Password */}
        <form onSubmit={onEmailSubmit} className="mt-5 space-y-3">
          <label className="block text-sm text-neutral-300">Email</label>
          <input
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            placeholder="you@business.com"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
          />
          <label className="block text-sm text-neutral-300">Password</label>
          <input
            value={pw}
            onChange={(e)=>setPw(e.target.value)}
            placeholder="••••••••"
            type="password"
            autoComplete="current-password"
            minLength={6}
            required
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {loading ? 'Please wait…' : 'Continue'}
          </button>

          {/* Forgot password */}
          <div className="mt-1 flex justify-end">
            <Link
              to={`/auth/forgetpassword?next=${encodeURIComponent(next)}${email ? `&email=${encodeURIComponent(email)}` : ''}`}
              className="text-xs text-indigo-400 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {/* Helper link */}
          <div className="mt-2 text-xs text-neutral-500">
            Don’t have an account?{' '}
            <Link
              to={`/auth/signup?next=${encodeURIComponent(next)}${email ? `&email=${encodeURIComponent(email)}` : ''}`}
              className="text-indigo-400 hover:underline"
            >
              Create one
            </Link>
            .
          </div>
        </form>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-neutral-800" />
          <span className="text-xs text-neutral-500">or</span>
          <div className="h-px flex-1 bg-neutral-800" />
        </div>

        {/* Secondary: Google with logo */}
        <button
          onClick={onGoogleClick}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-3 rounded-lg bg-white text-black px-3 py-2 text-sm font-medium hover:bg-white/90 disabled:opacity-60"
          aria-label="Continue with Google"
        >
          {/* Google 'G' logo (SVG) */}
          <svg width="18" height="18" viewBox="0 0 533.5 544.3" aria-hidden="true">
            <path fill="#EA4335" d="M533.5 278.4c0-18.6-1.5-37-4.7-54.8H272.1v103.8h147c-6.3 34-25 62.8-53.6 82.1v68.1h86.5c50.6-46.5 81.5-115.1 81.5-199.2z"/>
            <path fill="#34A853" d="M272.1 544.3c73.7 0 135.7-24.4 180.9-66.5l-86.5-68.1c-24 16.1-54.7 25.7-94.4 25.7-72.6 0-134.2-49-156.3-115.1H26.3v72.2c45.3 89.9 138.4 151.8 245.8 151.8z"/>
            <path fill="#4A90E2" d="M115.8 320.3c-10.4-30.9-10.4-64.4 0-95.3V152.8H26.3c-44.7 88.9-44.7 195.5 0 284.4l89.5-72.2z"/>
            <path fill="#FBBC05" d="M272.1 106.9c39.9-.6 78.1 14 107.4 41.1l80.2-80.2C408.1 24 345.8 0 272.1 0 164.7 0 71.7 61.9 26.3 151.8l89.5 72.2c22-66.1 83.6-117.1 156.3-117.1z"/>
          </svg>
          Continue with Google
        </button>

        {msg && <p className="mt-4 text-sm text-red-400">{msg}</p>}

        <p className="mt-4 text-xs text-neutral-500">
          By continuing, you agree to the Terms and acknowledge the Privacy Policy.
        </p>
      </div>

      {/* Small pop-up when redirected from a protected page */}
      {showGuardModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowGuardModal(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-required-title"
            className="w-full max-w-sm rounded-2xl border border-neutral-700 bg-neutral-900 p-5 shadow-xl"
          >
            <h2 id="login-required-title" className="text-lg font-semibold">Please sign in</h2>
            <p className="mt-2 text-sm text-neutral-300">
              You need to be signed in to view that page.
            </p>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowGuardModal(false)}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
