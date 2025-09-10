import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { auth, db } from '../../lib/firebase';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

/* Ensure a Firestore user profile exists.
   - If missing: create users/{uid} with basic info.
   - If it exists: just update lastLoginAt.
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

export default function SignUp() {
  const nav = useNavigate();
  const [params] = useSearchParams();

  // Form state
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Validation states
  const [emailTouched, setEmailTouched] = useState(false);
  const [pwTouched, setPwTouched] = useState(false);

  // Where to go after creating the account
  const next = params.get('next') || '/';

  // Prefill email from URL (?email=alice@site.com) to reduce typing
  useEffect(() => {
    const prefill = params.get('email');
    if (prefill) {
      setEmail(prefill);
      setEmailTouched(true); // Mark as touched to show validation
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
     1) Make sure users/{uid} exists (or update lastLoginAt)
     2) Redirect to the next page (home by default) 
  */
  async function afterAuth() {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await ensureUserDoc(uid);
    nav(next, { replace: true });
  }

  /* Create a new account using email + password.
     - Uses local persistence so the session survives refreshes.
     - Shows friendly error messages for common cases. 
  */
  async function onEmailCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      await setPersistence(auth, browserLocalPersistence); // keep user logged in
      await createUserWithEmailAndPassword(auth, email, pw);
      await afterAuth();
    } catch (e: any) {
      const code = e?.code as string | undefined;
      if (code === 'auth/email-already-in-use') {
        setMsg('This email already has an account. Try signing in instead.');
      } else if (code === 'auth/weak-password') {
        setMsg('Please choose a stronger password (at least 6 characters).');
      } else if (code === 'auth/invalid-email') {
        setMsg('Please enter a valid email address.');
      } else {
        setMsg(e?.message ?? 'Could not create your account.');
      }
    } finally {
      setLoading(false);
    }
  }

  /* Create/sign in with Google (first time creates the account automatically).
     - Also uses local persistence.
     - If the popup is closed, show a simple retry message. 
  */
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
      const code = e?.code as string | undefined;
      setMsg(code === 'auth/popup-closed-by-user'
        ? 'Popup closed—try again.'
        : (e?.message ?? 'Google sign-in failed.'));
    } finally {
      setLoading(false);
    }
  }

  /* UI */
  return (
    <div className="min-h-screen bg-[#0B0B0D] text-neutral-100 grid place-items-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
        <h1 className="text-xl font-semibold">Create your LaunchPad account</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Already have one?{' '}
          <Link to="/auth/signin" className="text-indigo-400 hover:underline">
            Sign in
          </Link>.
        </p>

        {/* Primary: Email + Password */}
        <form onSubmit={onEmailCreate} className="mt-5 space-y-3">
          <div>
            <label className="block text-sm text-neutral-300" htmlFor="email">Email</label>
            <div className="relative">
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
                className={`w-full rounded-lg border ${
                  emailTouched 
                    ? emailValid 
                      ? 'border-green-600 focus:ring-green-500/60' 
                      : 'border-red-600 focus:ring-red-500/60'
                    : 'border-neutral-700 focus:ring-indigo-500/60'
                } bg-neutral-950 px-3 py-2 pr-8 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2`}
              />
              {emailTouched && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  {emailValid ? (
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
              )}
            </div>
            {emailTouched && !emailValid && (
              <p className="mt-1 text-xs text-red-400">Enter a valid email address (e.g., name@example.com)</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-neutral-300" htmlFor="password">Password</label>
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
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                className={`w-full rounded-lg border ${
                  pwTouched 
                    ? pwValid 
                      ? 'border-green-600 focus:ring-green-500/60' 
                      : 'border-red-600 focus:ring-red-500/60'
                    : 'border-neutral-700 focus:ring-indigo-500/60'
                } bg-neutral-950 px-3 py-2 pr-8 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2`}
              />
              {pwTouched && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  {pwValid ? (
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
              )}
            </div>
            <div className="mt-1 text-xs text-neutral-400">
              <p className={pwTouched ? (pwValid ? 'text-green-400' : 'text-red-400') : ''}>
                {pwTouched && !pwValid ? '✗' : pwTouched && pwValid ? '✓' : '•'} At least 6 characters
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !emailValid || !pwValid}
            className="mt-2 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating…' : 'Create account'}
          </button>
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
          {/* Google "G" logo */}
          <svg width="18" height="18" viewBox="0 0 533.5 544.3" aria-hidden="true">
            <path fill="#EA4335" d="M533.5 278.4c0-18.6-1.5-37-4.7-54.8H272.1v103.8h147c-6.3 34-25 62.8-53.6 82.1v68.1h86.5c50.6-46.5 81.5-115.1 81.5-199.2z"/>
            <path fill="#34A853" d="M272.1 544.3c73.7 0 135.7-24.4 180.9-66.5l-86.5-68.1c-24 16.1-54.7 25.7-94.4 25.7-72.6 0-134.2-49-156.3-115.1H26.3v72.2c45.3 89.9 138.4 151.8 245.8 151.8z"/>
            <path fill="#4A90E2" d="M115.8 320.3c-10.4-30.9-10.4-64.4 0-95.3V152.8H26.3c-44.7 88.9-44.7 195.5 0 284.4l89.5-72.2z"/>
            <path fill="#FBBC05" d="M272.1 106.9c39.9-.6 78.1 14 107.4 41.1l80.2-80.2C408.1 24 345.8 0 272.1 0 164.7 0 71.7 61.9 26.3 151.8l89.5 72.2c22-66.1 83.6-117.1 156.3-117.1z"/>
          </svg>
          Continue with Google
        </button>

        {/* Inline feedback */}
        {msg && <p className="mt-4 text-sm text-red-400">{msg}</p>}

        {/* Legal note */}
        <p className="mt-4 text-xs text-neutral-500">
          By continuing, you agree to the Terms and acknowledge the Privacy Policy.
        </p>
      </div>
    </div>
  );
}