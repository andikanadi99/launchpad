// apps/web/src/pages/Settings.tsx

import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../lib/firebase'; // adjust if your path differs
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';

/*
  Settings (test version)
  - Shows who is signed in.
  - "Sign out" opens a confirm pop-up.
  - If confirmed, we sign out and go to /auth/signin.
*/

export default function Settings() {
  const nav = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Pop-up state
  const [showConfirm, setShowConfirm] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Watch auth state so we can show the current user
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  // Close pop-up with ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && showConfirm) setShowConfirm(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showConfirm]);

  // When the pop-up opens, move focus to it (basic accessibility)
  useEffect(() => {
    if (showConfirm && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [showConfirm]);

  // Open confirm pop-up
  function askSignOut() {
    setMsg(null);
    setShowConfirm(true);
  }


  async function handleSignOut() {
      setLoading(true);
      setMsg(null);
      try {
        // Tell the auth guard we're intentionally signing out, avoid sign out pop-up
        sessionStorage.setItem('lp_signed_out', '1');

        await signOut(auth);

        nav('/auth/signin?reason=signout', { replace: true });
      } catch {
        setMsg('Could not sign you out. Please try again.');
        setLoading(false);
      }
    }


  return (
    <div className="min-h-screen bg-[#0B0B0D] text-neutral-100 p-6">
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-neutral-400">Account, theme, and billing (coming soon).</p>

        <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-950/70 p-4">
          <div className="text-sm text-neutral-400">Signed in as</div>
          {user ? (
            <div className="mt-1">
              <div className="font-medium">{user.displayName || 'Unnamed user'}</div>
              <div className="text-neutral-400 text-sm">{user.email || 'No email'}</div>
            </div>
          ) : (
            <div className="mt-1 text-neutral-400">
              Not signed in.{' '}
              <Link to="/auth/signin" className="text-indigo-400 hover:underline">Go to Sign in</Link>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <button
              onClick={askSignOut}
              disabled={!user}
              className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-60"
            >
              Sign out
            </button>
            <Link
              to="/"
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
            >
              Back to Home
            </Link>
          </div>

          {msg && <p className="mt-3 text-sm text-red-400">{msg}</p>}
        </div>
      </div>

      {/* ----- Confirm Sign Out Pop-up ----- */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          onMouseDown={(e) => {
            // click outside closes the dialog
            if (e.target === e.currentTarget) setShowConfirm(false);
          }}
        >
          <div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="signout-title"
            className="w-full max-w-sm rounded-2xl border border-neutral-700 bg-neutral-900 p-5 shadow-xl focus:outline-none"
          >
            <h2 id="signout-title" className="text-lg font-semibold">Sign out?</h2>
            <p className="mt-2 text-sm text-neutral-300">
              You’ll need to sign in again to access your account.
            </p>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-60"
              >
                {loading ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ----- /Pop-up ----- */}
    </div>
  );
}
