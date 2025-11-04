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
import { doc, getDoc, setDoc, serverTimestamp, runTransaction } from 'firebase/firestore';

/* ============================================
   TIER DETECTION HOOK (SILENT - NOT SHOWN IN UI)
   ============================================ */

interface TierInfo {
  tier: 'founding-beta' | 'founding-member' | 'regular';
  price: number;
  source: 'auto' | 'invite';
}

function useSignupTier() {
  const [searchParams] = useSearchParams();
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    determineTier();
  }, []);

  const determineTier = async () => {
    const inviteCode = searchParams.get('invite');

    // PRIORITY 1: Invite code (future use - check Firebase)
    if (inviteCode) {
      // TODO: Check /invites/{inviteCode} in Firebase
      // For now, just fall through to auto-assignment
    }

    // PRIORITY 2: Automatic tier assignment based on count (SILENT)
    try {
      const configRef = doc(db, 'config', 'membership');
      const configSnap = await getDoc(configRef);

      if (configSnap.exists()) {
        const data = configSnap.data();
        const foundingBetaCount = data.foundingBetaCount || 0;
        const foundingMemberCount = data.foundingMemberCount || 0;

        // Founding Beta (First 5) - Silent assignment
        if (foundingBetaCount < 5) {
          setTierInfo({
            tier: 'founding-beta',
            price: 0,
            source: 'auto'
          });
          setLoading(false);
          return;
        }

        // Founding Member (Next 10) - Silent assignment
        if (foundingMemberCount < 10) {
          setTierInfo({
            tier: 'founding-member',
            price: 29,
            source: 'auto'
          });
          setLoading(false);
          return;
        }
      }

      // Regular tier (after first 15)
      setTierInfo({
        tier: 'regular',
        price: 49,
        source: 'auto'
      });
    } catch (error) {
      console.error('Error determining tier:', error);
      // Fallback to regular
      setTierInfo({
        tier: 'regular',
        price: 49,
        source: 'auto'
      });
    }
    
    setLoading(false);
  };

  return { tierInfo, loading };
}

/* ============================================
   USER DOCUMENT CREATION
   ============================================ */

async function ensureUserDoc(
  uid: string, 
  tierOverride?: { tier: string; price: number; source: string }
) {
  if (!uid) return;
  
  await runTransaction(db, async (transaction) => {
    const userRef = doc(db, 'users', uid);
    const userSnap = await transaction.get(userRef);
    
    if (!userSnap.exists()) {
      // Increment the appropriate counter if this is a new user
      if (tierOverride) {
        const configRef = doc(db, 'config', 'membership');
        const configSnap = await transaction.get(configRef);
        
        if (tierOverride.tier === 'founding-beta') {
          const currentCount = configSnap.data()?.foundingBetaCount || 0;
          transaction.update(configRef, { foundingBetaCount: currentCount + 1 });
        } else if (tierOverride.tier === 'founding-member') {
          const currentCount = configSnap.data()?.foundingMemberCount || 0;
          transaction.update(configRef, { foundingMemberCount: currentCount + 1 });
        }
      }
      
      // Create the user document - ALWAYS start as free
      transaction.set(userRef, {
        email: auth.currentUser?.email ?? '',
        photoURL: auth.currentUser?.photoURL ?? null,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        
        // Core account fields
        accountType: 'free', // ALWAYS free initially
        tier: tierOverride?.tier || 'regular', // Silent tier assignment
        tierSource: tierOverride?.source || 'auto',
        monthlyPrice: tierOverride?.price || 49, // Future upgrade price
        
        // Trial tracking
        trialStartDate: serverTimestamp(),
        salesPagesCreated: 0,
        
        // Onboarding
        onboardingPath: null, // Set when they choose on onboarding page
        onboardingComplete: false,
        
        // Stripe (not connected initially)
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripeConnected: false,
        
        // Profile
        profileComplete: false,
      });
    } else {
      // Just update last login for existing users
      transaction.update(userRef, { 
        lastLogin: serverTimestamp() 
      });
    }
  });
}

/* ============================================
   ADMIN USER CREATION (SEPARATE FLOW)
   ============================================ */

async function ensureAdminDoc(uid: string) {
  if (!uid) return;
  
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      email: auth.currentUser?.email ?? '',
      photoURL: auth.currentUser?.photoURL ?? null,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      
      // Admin account type
      accountType: 'admin',
      tier: 'admin',
      tierSource: 'admin',
      monthlyPrice: 0,
      
      // No trial needed
      trialStartDate: null,
      salesPagesCreated: 0,
      
      // Skip onboarding
      onboardingPath: null,
      onboardingComplete: true,
      
      // Full access
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripeConnected: true, // Admin doesn't need Stripe
      
      profileComplete: true,
    });
  } else {
    await setDoc(userRef, { 
      lastLogin: serverTimestamp() 
    }, { merge: true });
  }
}

/* ============================================
   MAIN SIGNUP COMPONENT
   ============================================ */

export default function SignUp() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  
  // Form state
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  
  // Validation state
  const [emailTouched, setEmailTouched] = useState(false);
  const [pwTouched, setPwTouched] = useState(false);
  
  // Tier detection (silent)
  const { tierInfo, loading: tierLoading } = useSignupTier();
  
  // Check for admin key
  const isAdmin = params.get('admin') === import.meta.env.VITE_ADMIN_SECRET_KEY;

  // Navigate after auth
  useEffect(() => {
    if (auth.currentUser) {
      // Admins go to dashboard, everyone else goes to onboarding
      const next = isAdmin ? '/dashboard' : '/onboarding';
      nav(next, { replace: true });
    }
  }, [params, isAdmin]);

  // Validation helpers
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const emailValid = isValidEmail(email);
  const pwValid = pw.length >= 6;

  async function afterAuth() {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    
    if (isAdmin) {
      // Admin flow - bypass everything
      await ensureAdminDoc(uid);
      nav('/dashboard', { replace: true });
    } else {
      // Regular flow - everyone starts as free
      const tierOverride = tierInfo ? {
        tier: tierInfo.tier,
        price: tierInfo.price,
        source: tierInfo.source
      } : undefined;
      
      await ensureUserDoc(uid, tierOverride);
      nav('/onboarding', { replace: true });
    }
  }

  async function onEmailCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      await setPersistence(auth, browserLocalPersistence);
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

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-neutral-100 grid place-items-center p-6 relative">
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full filter blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full filter blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative">
        {/* Main card */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-8 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
              Create your free account
            </h1>
            <p className="mt-3 text-neutral-400">
              Start building your sales page in minutes.{' '}
              <Link to="/auth/signin" className="text-indigo-400 hover:text-indigo-300 hover:underline font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={onEmailCreate} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-neutral-200 mb-2" htmlFor="email">
                Email address
              </label>
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
                  className={`w-full rounded-lg border-2 ${
                    emailTouched 
                      ? emailValid 
                        ? 'border-green-500/50 bg-green-500/5 focus:border-green-400' 
                        : 'border-red-500/50 bg-red-500/5 focus:border-red-400'
                      : 'border-neutral-700 bg-neutral-950/50 focus:border-indigo-500'
                  } px-4 py-3 pr-12 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all`}
                />
                {emailTouched && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
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
                <p className="mt-2 text-xs text-red-400">Enter a valid email address</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-200 mb-2" htmlFor="password">
                Password
              </label>
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
                  className={`w-full rounded-lg border-2 ${
                    pwTouched 
                      ? pwValid 
                        ? 'border-green-500/50 bg-green-500/5 focus:border-green-400' 
                        : 'border-red-500/50 bg-red-500/5 focus:border-red-400'
                      : 'border-neutral-700 bg-neutral-950/50 focus:border-indigo-500'
                  } px-4 py-3 pr-12 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all`}
                />
                {pwTouched && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
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
              {pwTouched && !pwValid && (
                <p className="mt-2 text-xs text-red-400">Password must be at least 6 characters</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !emailValid || !pwValid}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating account...' : 'Create free account'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-neutral-800" />
            <span className="text-xs text-neutral-500">or</span>
            <div className="h-px flex-1 bg-neutral-800" />
          </div>

          {/* Google button */}
          <button
            onClick={onGoogleClick}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-3 rounded-lg bg-white text-black px-4 py-3 text-sm font-semibold hover:bg-white/90 disabled:opacity-60 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 533.5 544.3">
              <path fill="#EA4335" d="M533.5 278.4c0-18.6-1.5-37-4.7-54.8H272.1v103.8h147c-6.3 34-25 62.8-53.6 82.1v68.1h86.5c50.6-46.5 81.5-115.1 81.5-199.2z"/>
              <path fill="#34A853" d="M272.1 544.3c73.7 0 135.7-24.4 180.9-66.5l-86.5-68.1c-24 16.1-54.7 25.7-94.4 25.7-72.6 0-134.2-49-156.3-115.1H26.3v72.2c45.3 89.9 138.4 151.8 245.8 151.8z"/>
              <path fill="#4A90E2" d="M115.8 320.3c-10.4-30.9-10.4-64.4 0-95.3V152.8H26.3c-44.7 88.9-44.7 195.5 0 284.4l89.5-72.2z"/>
              <path fill="#FBBC05" d="M272.1 106.9c39.9-.6 78.1 14 107.4 41.1l80.2-80.2C408.1 24 345.8 0 272.1 0 164.7 0 71.7 61.9 26.3 151.8l89.5 72.2c22-66.1 83.6-117.1 156.3-117.1z"/>
            </svg>
            Continue with Google
          </button>

          {/* Error message */}
          {msg && (
            <div className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-300">{msg}</p>
            </div>
          )}

          {/* Legal note */}
          <p className="mt-6 text-xs text-neutral-500 text-center">
            By continuing, you agree to the{' '}
            <Link to="/terms" className="text-neutral-400 hover:text-neutral-300 underline">Terms</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-neutral-400 hover:text-neutral-300 underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}