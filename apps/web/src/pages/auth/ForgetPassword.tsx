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

  // Optional: prefill from ?email=alice@site.com
  const [params] = useSearchParams();
  useEffect(() => {
    const prefill = params.get('email');
    if (prefill) setEmail(prefill);
  }, [params]);

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
      <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
        <h1 className="text-xl font-semibold">Forgot your password?</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Enter your email. We’ll send a link to reset it.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <label className="block text-sm text-neutral-300" htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            placeholder="you@business.com"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
          />

          <button
            type="submit"
            disabled={loading || !email}
            className="mt-2 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>

          {/* Inline messages */}
          {msg && <p className="mt-3 text-sm text-emerald-400">{msg}</p>}
          {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
        </form>

        {/* Helpful links */}
        <div className="mt-5 flex flex-col gap-2 text-sm">
          <Link to="/auth/signin" className="text-indigo-400 hover:underline">
            Back to Sign in
          </Link>
          <Link to={`/auth/signup${email ? `?email=${encodeURIComponent(email)}` : ''}`} className="text-indigo-400 hover:underline">
            Create a new account
          </Link>
        </div>

        {/* Small note */}
        <p className="mt-4 text-xs text-neutral-500">
          Didn’t get the email? Check spam or try again.
        </p>
      </div>
    </div>
  );
}
