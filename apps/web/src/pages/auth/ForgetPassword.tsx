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
      setMsg('Check your inbox! If this email is registered, we sent you a password reset link.');
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
        setMsg('Check your inbox! If this email is registered, we sent you a password reset link.');
      }
    } finally {
      setLoading(false);
    }
  }

  /* UI */
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
            {/* Header with icon */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 grid place-items-center mx-auto mb-4">
                <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
                Reset your password
              </h1>
              <p className="mt-3 text-neutral-400">
                Enter your email and we'll send you instructions to reset your password
              </p>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="space-y-5">
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

              <button
                type="submit"
                disabled={loading || !emailValid}
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
                      Sending reset link...
                    </div>
                  ) : (
                    'Send reset link'
                  )}
                </div>
              </button>

              {/* Success message */}
              {msg && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 grid place-items-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm text-emerald-300">{msg}</p>
                  </div>
                </div>
              )}

              {/* Error message */}
              {err && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                  <p className="text-sm text-red-300 flex items-start gap-2">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {err}
                  </p>
                </div>
              )}
            </form>

            {/* Helpful links */}
            <div className="mt-8 pt-8 border-t border-neutral-800/50 space-y-3">
              <Link 
                to="/auth/signin" 
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-neutral-700 bg-neutral-900/50 px-6 py-3.5 font-semibold text-neutral-200 hover:border-neutral-600 hover:bg-neutral-900 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to sign in
              </Link>
              
              <Link 
                to={`/auth/signup${email ? `?email=${encodeURIComponent(email)}` : ''}`} 
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-neutral-700/50 px-6 py-3.5 text-sm text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 transition-all duration-200"
              >
                Don't have an account? 
                <span className="font-semibold text-indigo-400">Create one</span>
              </Link>
            </div>

            {/* Help tip */}
            <div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-indigo-500/5 to-violet-500/5 border border-indigo-500/20">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 grid place-items-center flex-shrink-0">
                  <span className="text-base">💡</span>
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-neutral-200">
                    Didn't receive the email?
                  </p>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Check your spam folder or try again in a few minutes. Reset links expire after 1 hour.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}