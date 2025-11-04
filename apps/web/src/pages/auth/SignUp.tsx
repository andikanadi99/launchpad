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
   TIER DETECTION HOOK
   ============================================ */

interface TierInfo {
  tier: 'founding-beta' | 'founding-member' | 'regular' | 'admin';
  displayName: string;
  price: number;
  priceDisplay: string;
  spotsLeft: number | null;
  benefits: string[];
  badge: {
    emoji: string;
    text: string;
    color: string;
  };
  source: 'auto' | 'admin' | 'invite';
}

function useSignupTier() {
  const [searchParams] = useSearchParams();
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    determineTier();
  }, []);

  const determineTier = async () => {
    const adminKey = searchParams.get('admin');
    const inviteCode = searchParams.get('invite');

    // PRIORITY 1: Admin override
    if (adminKey === import.meta.env.VITE_ADMIN_SECRET_KEY) { 
      setTierInfo({
        tier: 'admin',
        displayName: 'Admin Account',
        price: 0,
        priceDisplay: 'FREE',
        spotsLeft: null,
        benefits: [
          'Full platform access',
          'Admin dashboard',
          'All features unlocked',
          'Priority support'
        ],
        badge: {
          emoji: '👑',
          text: 'Admin Account',
          color: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/30'
        },
        source: 'admin'
      });
      setLoading(false);
      return;
    }

    // PRIORITY 2: Invite code (future use - check Firebase)
    if (inviteCode) {
      // TODO: Check /invites/{inviteCode} in Firebase
      // For now, just fall through to auto-assignment
    }

    // PRIORITY 3: Automatic assignment based on count
    try {
      const configRef = doc(db, 'config', 'membership');
      const configSnap = await getDoc(configRef);

      if (configSnap.exists()) {
        const data = configSnap.data();
        const foundingBetaCount = data.foundingBetaCount || 0;
        const foundingMemberCount = data.foundingMemberCount || 0;

        // Founding Beta (First 5)
        if (foundingBetaCount < 5) {
          setTierInfo({
            tier: 'founding-beta',
            displayName: 'Founding Beta Tester',
            price: 0,
            priceDisplay: 'FREE forever',
            spotsLeft: 5 - foundingBetaCount,
            benefits: [
              'Free access forever',
              'AI Product Idea Generator',
              'AI Sales Copywriter',
              'Personal Sales Page Review',
              'Launch Day Promotion'
            ],
            badge: {
              emoji: '🎉',
              text: 'Founding Beta Tester',
              color: 'text-purple-300 bg-purple-500/10 border-purple-500/30'
            },
            source: 'auto'
          });
          setLoading(false);
          return;
        }

        // Founding Member (Next 10)
        if (foundingMemberCount < 10) {
          setTierInfo({
            tier: 'founding-member',
            displayName: 'Founding Member',
            price: 29,
            priceDisplay: '$29/month (locked forever)',
            spotsLeft: 10 - foundingMemberCount,
            benefits: [
              '$29/month locked in forever',
              'AI Product Idea Generator',
              'AI Sales Copywriter',
              'Personal Sales Page Review',
              'Launch Day Promotion'
            ],
            badge: {
              emoji: '🚀',
              text: 'Founding Member',
              color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
            },
            source: 'auto'
          });
          setLoading(false);
          return;
        }
      }

      // Regular tier (after first 15)
      setTierInfo({
        tier: 'regular',
        displayName: 'Member',
        price: 49,
        priceDisplay: '$49/month',
        spotsLeft: null,
        benefits: [
          'Sales page builder',
          'Product delivery system',
          'Custom URLs',
          'Unlimited products'
        ],
        badge: {
          emoji: '✨',
          text: 'Join LaunchPad',
          color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30'
        },
        source: 'auto'
      });
    } catch (error) {
      console.error('Error determining tier:', error);
      // Fallback to regular
      setTierInfo({
        tier: 'regular',
        displayName: 'Member',
        price: 49,
        priceDisplay: '$49/month',
        spotsLeft: null,
        benefits: ['Sales page builder', 'Product delivery', 'Custom URLs'],
        badge: {
          emoji: '✨',
          text: 'Join LaunchPad',
          color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30'
        },
        source: 'auto'
      });
    }
    
    setLoading(false);
  };

  return { tierInfo, loading };
}

/* ============================================
   TIER BADGE COMPONENT (ENHANCED DESIGN)
   ============================================ */

function TierBadge({ tierInfo }: { tierInfo: TierInfo }) {
  // Don't show badge for regular tier
  if (tierInfo.tier === 'regular') return null;

  return (
    <div className={`mb-6 p-6 rounded-xl border-2 ${tierInfo.badge.color}`}>
      {/* Header with emoji and title */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-4xl">{tierInfo.badge.emoji}</span>
        <div className="flex-1">
          <div className="font-bold text-xl">
            {tierInfo.badge.text}
          </div>
          <div className="text-base font-semibold mt-0.5">
            {tierInfo.priceDisplay}
          </div>
        </div>
        {tierInfo.spotsLeft !== null && (
          <div className="text-center px-3 py-1.5 bg-white/10 rounded-lg">
            <div className="text-lg font-bold">{tierInfo.spotsLeft}</div>
            <div className="text-[10px] uppercase tracking-wide opacity-80">
              {tierInfo.spotsLeft === 1 ? 'spot left' : 'spots left'}
            </div>
          </div>
        )}
      </div>

      {/* Benefits list */}
      <div className="space-y-2.5 mt-4">
        {tierInfo.benefits.slice(0, 4).map((benefit, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm text-neutral-200 leading-relaxed">{benefit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================
   ENSURE USER DOC (UPDATED)
   ============================================ */

async function ensureUserDoc(uid: string, tierOverride?: { tier: string; price: number; source: string }) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const u = auth.currentUser;
  
  if (!snap.exists()) {
    // NEW USER - Assign membership tier using transaction
    let membershipTier = 'regular';
    let pricingLocked = 49;
    let tierSource = 'auto';
    
    // PRIORITY 1: Use tier override if provided (from URL)
    if (tierOverride) {
      membershipTier = tierOverride.tier;
      pricingLocked = tierOverride.price;
      tierSource = tierOverride.source;
      
      console.log(`✅ Tier override applied: ${membershipTier} (${tierSource})`);
      
      // For admin/invite overrides, don't increment counters
      // Just create the user document
      await setDoc(ref, {
        email: u?.email ?? null,
        displayName: u?.displayName ?? null,
        photoURL: u?.photoURL ?? null,
        membershipTier: membershipTier,
        pricingLocked: pricingLocked,
        tierSource: tierSource,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });
      
      console.log(`✅ New user created: ${membershipTier} ($${pricingLocked}/mo)`);
    } else {
      // PRIORITY 2: Automatic assignment based on count (ATOMIC TRANSACTION)
      const configRef = doc(db, 'config', 'membership');
      
      try {
        const result = await runTransaction(db, async (transaction) => {
          const configDoc = await transaction.get(configRef);
          
          let tier = 'regular';
          let price = 49;
          
          if (!configDoc.exists()) {
            // First user ever - initialize config
            transaction.set(configRef, {
              foundingBetaCount: 1,
              foundingMemberCount: 0,
              regularCount: 0,
              currentCount: 1,
              foundingBetaLimit: 5,
              foundingMemberLimit: 10,
              createdAt: serverTimestamp(),
            });
            tier = 'founding-beta';
            price = 0;
          } else {
            const data = configDoc.data();
            const foundingBetaCount = data.foundingBetaCount || 0;
            const foundingMemberCount = data.foundingMemberCount || 0;
            const currentCount = data.currentCount || 0;
            
            // Assign tier based on count
            if (foundingBetaCount < 5) {
              tier = 'founding-beta';
              price = 0;
              transaction.update(configRef, {
                foundingBetaCount: foundingBetaCount + 1,
                currentCount: currentCount + 1,
              });
            } else if (foundingMemberCount < 10) {
              tier = 'founding-member';
              price = 29;
              transaction.update(configRef, {
                foundingMemberCount: foundingMemberCount + 1,
                currentCount: currentCount + 1,
              });
            } else {
              tier = 'regular';
              price = 49;
              transaction.update(configRef, {
                regularCount: (data.regularCount || 0) + 1,
                currentCount: currentCount + 1,
              });
            }
          }
          
          return { tier, price };
        });
        
        membershipTier = result.tier;
        pricingLocked = result.price;
        
        // Create user document outside transaction (faster)
        await setDoc(ref, {
          email: u?.email ?? null,
          displayName: u?.displayName ?? null,
          photoURL: u?.photoURL ?? null,
          membershipTier: membershipTier,
          pricingLocked: pricingLocked,
          tierSource: 'auto',
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        });
        
        console.log(`✅ New user created: ${membershipTier} ($${pricingLocked}/mo)`);
      } catch (error) {
        console.error('❌ Transaction failed:', error);
        throw error;
      }
    }
  } else {
    // Existing user - just update last login
    await setDoc(ref, { lastLoginAt: serverTimestamp() }, { merge: true });
  }
}


/* ============================================
   SIGNUP COMPONENT
   ============================================ */

export default function SignUp() {
  const nav = useNavigate();
  const [params] = useSearchParams();

  // Tier detection
  const { tierInfo, loading: tierLoading } = useSignupTier();

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

  // Prefill email from URL (?email=alice@site.com)
  useEffect(() => {
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

  async function afterAuth() {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    
    // Pass tier info to ensureUserDoc
    const tierOverride = tierInfo ? {
      tier: tierInfo.tier,
      price: tierInfo.price,
      source: tierInfo.source
    } : undefined;
    
    await ensureUserDoc(uid, tierOverride);
    nav(next, { replace: true });
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
    <div className="min-h-screen bg-[#0B0B0D] text-neutral-100 grid place-items-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900/70 p-8 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
        <h1 className="text-2xl font-semibold">Create your LaunchPad account</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Already have one?{' '}
          <Link to="/auth/signin" className="text-indigo-400 hover:underline">
            Sign in
          </Link>.
        </p>

        {/* Tier Badge - shows automatically if special tier */}
        {!tierLoading && tierInfo && <TierBadge tierInfo={tierInfo} />}

        {/* Primary: Email + Password */}
        <form onSubmit={onEmailCreate} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5" htmlFor="email">Email</label>
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
                } bg-neutral-950 px-3 py-2.5 pr-10 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 transition-colors`}
              />
              {emailTouched && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
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
              <p className="mt-1.5 text-xs text-red-400">Enter a valid email address (e.g., name@example.com)</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5" htmlFor="password">Password</label>
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
                } bg-neutral-950 px-3 py-2.5 pr-10 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 transition-colors`}
              />
              {pwTouched && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
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
            <div className="mt-1.5 text-xs text-neutral-400">
              <p className={pwTouched ? (pwValid ? 'text-green-400' : 'text-red-400') : ''}>
                {pwTouched && !pwValid ? '✗' : pwTouched && pwValid ? '✓' : '•'} At least 6 characters
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !emailValid || !pwValid}
            className="mt-2 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-neutral-800" />
          <span className="text-xs text-neutral-500">or</span>
          <div className="h-px flex-1 bg-neutral-800" />
        </div>

        {/* Secondary: Google */}
        <button
          onClick={onGoogleClick}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-3 rounded-lg bg-white text-black px-4 py-2.5 text-sm font-semibold hover:bg-white/90 disabled:opacity-60 transition-colors"
          aria-label="Continue with Google"
        >
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
        <p className="mt-6 text-xs text-neutral-500 text-center">
          By continuing, you agree to the Terms and acknowledge the Privacy Policy.
        </p>
      </div>
    </div>
  );
}