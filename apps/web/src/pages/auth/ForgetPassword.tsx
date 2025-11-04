import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { auth } from '../../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

/*
  Purpose: Let a user get a password reset email.
  Flow:
    1) User types their email.
    2) We ask Firebase to send a reset link.
    3) We show a simple success note.
  Notes:
    - We prefill the email if the URL has ?email=...
    - We keep messages simple so anyone can understand.
*/

export default function ForgetPassword() {
  // Form state
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);    // success or info message
  const [err, setErr] = useState<string | null>(null);    // error message (only for invalid inputs)

  // Validation state
  const [emailTouched, setEmailTouched] = useState(false);

  // Optional: prefill from ?email=alice@site.com
  const [params] = useSearchParams();
  useEffect(() => {
    const prefill = params.get('email');
    if (prefill) {
      setEmail(prefill);
      setEmailTouched(true);
    }
  }, [params]);

  // Validation helper
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const emailValid = isValidEmail(email);

  /* Handle form submit:
     - Ask Firebase to send a reset email.
     - On success: show a friendly note.
     - On invalid email: show a clear error.
  */
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setErr(null);

    try {
      await sendPasswordResetEmail(auth, email);
      setMsg('If this email is registered, we sent a reset link. Please check your inbox.');
    } catch (e: any) {
      const code = e?.code as string | undefined;
      if (code === 'auth/invalid-email') {
        setErr('Please enter a valid email address.');
      } else if (code === 'auth/missing-email') {
        setErr('Please enter your email.');
      } else if (code === 'auth/too-many-requests') {
        setErr('Too many tries. Please wait a bit and try again.');
      } else {
        // Keep it simple for all other cases.
        setMsg('If this email is registered, we sent a reset link. Please check your inbox.');
      }
    } finally {
      setLoading(false);
    }
  }

  /* UI */
  return (
    <div className="min-h-screen bg-[#0B0B0D] text-neutral-100 grid place-items-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900/70 p-8 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
        <h1 className="text-2xl font-semibold">Forgot your password?</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Enter your email and we'll send you a link to reset your password.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
              <p className="mt-1.5 text-xs text-red-400">Enter a valid email address</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !emailValid}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>

          {/* Inline messages */}
          {msg && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-sm text-emerald-400">{msg}</p>
            </div>
          )}
          {err && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">{err}</p>
            </div>
          )}
        </form>

        {/* Helpful links */}
        <div className="mt-6 pt-6 border-t border-neutral-800 flex flex-col gap-3 text-sm">
          <Link to="/auth/signin" className="text-indigo-400 hover:underline transition-colors">
            ← Back to Sign in
          </Link>
          <Link 
            to={`/auth/signup${email ? `?email=${encodeURIComponent(email)}` : ''}`} 
            className="text-neutral-400 hover:text-indigo-400 transition-colors"
          >
            Don't have an account? Create one
          </Link>
        </div>

        {/* Small note */}
        <div className="mt-6 p-3 rounded-lg bg-neutral-800/30">
          <p className="text-xs text-neutral-400">
            💡 <strong>Tip:</strong> Didn't receive the email? Check your spam folder or try again in a few minutes.
          </p>
        </div>
      </div>
    </div>
  );
}