'use client';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { auth, db } from '../../../lib/firebase'; 
import { doc, getDoc } from 'firebase/firestore';

type ConnectionStatus = 'idle' | 'connecting' | 'checking' | 'connected' | 'incomplete' | 'error';

const FUNCTIONS_BASE = 'https://us-central1-launchpad-ec0b0.cloudfunctions.net';

export default function StripePage() {
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // On mount: check existing connection status from Firestore
  // If user has a stripeConnectAccountId but isn't fully connected, auto-check with Stripe
  useEffect(() => {
    (async () => {
      try {
        if (!user) {
          setLoading(false);
          return;
        }

        const refUser = doc(db, 'users', user.uid);
        const snap = await getDoc(refUser);
        const data = snap.exists() ? snap.data() : {};

        if (data.stripeConnected && data.stripeConnectAccountId) {
          // Already fully connected
          setStatus('connected');
          setAccountId(data.stripeConnectAccountId);
        } else if (data.stripeConnectAccountId) {
          // Has an account but not fully connected — check status with Stripe
          // This handles the case where user returns from Stripe onboarding
          setAccountId(data.stripeConnectAccountId);
          await checkAccountStatus();
        } else {
          setStatus('idle');
        }
      } catch (err) {
        console.error('[StripePage] error loading:', err);
        setStatus('error');
        setErrorMessage('Failed to check connection status');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // Call checkStripeAccountStatus cloud function
  const checkAccountStatus = async () => {
    if (!user) return;

    setStatus('checking');
    try {
      const response = await fetch(`${FUNCTIONS_BASE}/checkStripeAccountStatus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.connected) {
        setStatus('connected');
        setAccountId(data.stripeConnectAccountId || '');
      } else if (data.detailsSubmitted === false) {
        // User started onboarding but didn't finish
        setStatus('incomplete');
      } else {
        setStatus('idle');
      }
    } catch (err: any) {
      console.error('Error checking account status:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Failed to verify Stripe account');
    }
  };

  // Call createConnectAccountLink and redirect to Stripe onboarding
  const handleConnectStripe = async () => {
    if (!user) return;

    setStatus('connecting');
    try {
      const returnUrl = returnTo
        ? `${window.location.origin}/onboarding/stripe?returnTo=${encodeURIComponent(returnTo)}`
        : `${window.location.origin}/onboarding/stripe`;

      const response = await fetch(`${FUNCTIONS_BASE}/createConnectAccountLink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          returnUrl,
          refreshUrl: returnUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      // Redirect to Stripe's hosted onboarding
      window.location.href = result.url;
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Failed to start Stripe onboarding');
    }
  };

  const handleContinue = () => {
    if (returnTo) {
      navigate(returnTo);
    } else {
      navigate('/');
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0D] text-neutral-100">
        <div className="mx-auto max-w-2xl p-6">
          <div className="text-center text-neutral-400">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0B0B0D] text-neutral-100">
        <div className="mx-auto max-w-2xl p-6">
          <div className="text-center text-neutral-400">Please sign in to continue.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-neutral-100">
      <div className="mx-auto max-w-2xl p-6">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="mb-4 flex items-center gap-2 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5m7-7l-7 7 7 7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-semibold">Connect to Stripe</h1>
          <p className="mt-2 text-neutral-300">
            Connect your Stripe account to start accepting payments.
          </p>
        </div>

        {/* Main Content Card */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-8 backdrop-blur-sm shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
          
          {/* IDLE — Ready to connect */}
          {status === 'idle' && (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
                <svg className="h-8 w-8 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/>
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-3">Ready to Connect Stripe?</h2>
              <p className="text-neutral-300 mb-6">
                You'll be redirected to Stripe to complete the setup. This usually takes 2-3 minutes.
              </p>
              
              {/* Benefits */}
              <div className="mb-8 space-y-3">
                <div className="flex items-center gap-3 text-left">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30">
                    <svg className="h-3 w-3 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <span className="text-neutral-200">Secure payment processing</span>
                </div>
                <div className="flex items-center gap-3 text-left">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30">
                    <svg className="h-3 w-3 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <span className="text-neutral-200">Automatic payouts to your bank</span>
                </div>
                <div className="flex items-center gap-3 text-left">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30">
                    <svg className="h-3 w-3 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <span className="text-neutral-200">Support for cards, Apple Pay, Google Pay</span>
                </div>
              </div>

              <button
                onClick={handleConnectStripe}
                disabled={!user}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 font-semibold text-white hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition-all disabled:opacity-50"
              >
                Connect with Stripe
              </button>
            </div>
          )}

          {/* CONNECTING — Redirecting to Stripe */}
          {status === 'connecting' && (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
                <svg className="h-8 w-8 text-indigo-400 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-3">Redirecting to Stripe...</h2>
              <p className="text-neutral-300">
                You'll be taken to Stripe to complete your account setup.
              </p>
            </div>
          )}

          {/* CHECKING — Verifying account after return from Stripe */}
          {status === 'checking' && (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
                <svg className="h-8 w-8 text-indigo-400 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-3">Verifying your account...</h2>
              <p className="text-neutral-300">
                Checking your Stripe account status. This will only take a moment.
              </p>
            </div>
          )}

          {/* CONNECTED — Fully set up */}
          {status === 'connected' && (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30">
                <svg className="h-8 w-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-3">Stripe Connected!</h2>
              <p className="text-neutral-300 mb-6">
                Your Stripe account is set up and ready to accept payments.
                {accountId && (
                  <span className="block mt-2 text-sm text-neutral-400">
                    Account ID: {accountId}
                  </span>
                )}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleBackToHome}
                  className="flex-1 rounded-xl border border-neutral-700 bg-neutral-950 px-6 py-3 font-medium text-neutral-200 hover:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-600"
                >
                  Back to Dashboard
                </button>
                {returnTo && (
                  <button
                    onClick={handleContinue}
                    className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 font-semibold text-white hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                  >
                    Continue Editing
                  </button>
                )}
              </div>
            </div>
          )}

          {/* INCOMPLETE — Started onboarding but didn't finish */}
          {status === 'incomplete' && (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/30">
                <svg className="h-8 w-8 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4m0 4h.01" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-3">Setup Incomplete</h2>
              <p className="text-neutral-300 mb-6">
                Your Stripe account was created, but the setup wasn't finished. Click below to pick up where you left off.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleBackToHome}
                  className="flex-1 rounded-xl border border-neutral-700 bg-neutral-950 px-6 py-3 font-medium text-neutral-200 hover:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-600"
                >
                  Back to Dashboard
                </button>
                <button
                  onClick={handleConnectStripe}
                  className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 font-semibold text-white hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                >
                  Finish Setup
                </button>
              </div>
            </div>
          )}

          {/* ERROR */}
          {status === 'error' && (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/20 to-pink-500/20 border border-red-500/30">
                <svg className="h-8 w-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M15 9l-6 6m0-6l6 6" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-3">Connection Failed</h2>
              <p className="text-neutral-300 mb-6">
                {errorMessage || "We couldn't connect your Stripe account. Please try again."}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleBackToHome}
                  className="flex-1 rounded-xl border border-neutral-700 bg-neutral-950 px-6 py-3 font-medium text-neutral-200 hover:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-600"
                >
                  Back to Dashboard
                </button>
                <button
                  onClick={handleConnectStripe}
                  className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 font-semibold text-white hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Help Section */}
        <div className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
          <h3 className="font-medium mb-3">Need Help?</h3>
          <div className="space-y-2 text-sm text-neutral-300">
            <p>• Make sure you have a valid business email and bank account</p>
            <p>• Stripe may require additional verification for some businesses</p>
            <p>• The process typically takes 2-3 minutes to complete</p>
          </div>
        </div>

      </div>
    </div>
  );
}