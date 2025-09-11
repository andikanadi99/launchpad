import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';

// EmailJS Setup Instructions:
// 1. Go to https://www.emailjs.com and create free account (200 emails/month free)
// 2. Add your Gmail as an email service
// 3. Create an email template with variables: {{category}}, {{subject}}, {{message}}, {{user_email}}, {{user_id}}
// 4. Get your Service ID, Template ID, and Public Key
// 5. Install: npm install @emailjs/browser

import emailjs from '@emailjs/browser'; // Uncomment after installing

// Replace these with your actual EmailJS credentials
const EMAILJS_SERVICE_ID = 'launchpad-mvp-support';
const EMAILJS_TEMPLATE_ID = 'template_9b37ui3';
const EMAILJS_PUBLIC_KEY = 'EXagMP3TRGNn3u5Hz';

export default function Support() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const userEmail = auth.currentUser?.email || '';

  const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        setError('');

        try {
            const templateParams = {
            category: category,
            subject: subject,
            message: message,
            user_email: userEmail || 'Not logged in',
            user_id: auth.currentUser?.uid || 'Not logged in',
            };

            await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            templateParams,
            EMAILJS_PUBLIC_KEY
            );

            setSubmitted(true);
            
            // Clear form after success
            setTimeout(() => {
            setSubject('');
            setMessage('');
            setCategory('general');
            setSubmitted(false);
            }, 5000);
        } catch (err) {
            console.error('Failed to send email:', err);
            setError('Failed to send message. Please try again or email directly to andikanadi10@gmail.com');
        } finally {
            setSending(false);
        }
        };

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-neutral-100">
      <div className="mx-auto max-w-2xl p-6">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-200"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {/* Header */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
          <h1 className="text-2xl font-semibold">Get Help</h1>
          <p className="mt-2 text-neutral-400">
            Having issues? Send us a message and we'll get back to you within 24 hours.
          </p>
        </div>

        {/* Support Form */}
        <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
          {submitted ? (
            <div className="rounded-lg border border-green-600/30 bg-green-500/10 p-4">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="text-green-400">Message sent successfully!</p>
                  <p className="mt-1 text-sm text-green-400/80">We'll get back to you within 24 hours.</p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm text-neutral-300">
                  What do you need help with?
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                >
                  <option value="general">General Question</option>
                  <option value="bug">Report a Bug</option>
                  <option value="payment">Payment Issue</option>
                  <option value="account">Account Problem</option>
                  <option value="feature">Feature Request</option>
                </select>
              </div>

              {/* Subject */}
              <div>
                <label htmlFor="subject" className="block text-sm text-neutral-300">
                  Subject
                </label>
                <input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description of your issue"
                  required
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                />
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm text-neutral-300">
                  Message
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  rows={6}
                  required
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                />
              </div>

              {/* User Email */}
              {userEmail && (
                <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-3">
                  <p className="text-xs text-neutral-400">
                    We'll reply to: <span className="text-neutral-200">{userEmail}</span>
                  </p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="rounded-lg border border-red-600/30 bg-red-500/10 p-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>

        {/* Quick Contact */}
        <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 text-center">
          <p className="text-sm text-neutral-400">
            Need immediate help? Email directly: {' '}
            <a href="mailto:andikanadi10@gmail.com" className="text-indigo-400 hover:underline">
              andikanadi10@gmail.com
            </a>
          </p>
        </div>

        {/* Common Issues */}
        {/* <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
          <h2 className="text-lg font-semibold">Common Issues</h2>
          <div className="mt-4 space-y-3">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
                <span className="text-sm font-medium">Can't see my products</span>
                <svg className="h-4 w-4 text-neutral-400 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <div className="mt-2 px-3 pb-3 text-sm text-neutral-400">
                Make sure you're logged in with the correct account. Products are tied to your user account and won't appear if you're logged in with a different email.
              </div>
            </details>

            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
                <span className="text-sm font-medium">Payment not received</span>
                <svg className="h-4 w-4 text-neutral-400 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <div className="mt-2 px-3 pb-3 text-sm text-neutral-400">
                Payments are processed by Stripe and typically arrive within 7 business days. Check your Stripe dashboard for payout status.
              </div>
            </details>

            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
                <span className="text-sm font-medium">Video not playing</span>
                <svg className="h-4 w-4 text-neutral-400 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <div className="mt-2 px-3 pb-3 text-sm text-neutral-400">
                Ensure you're using a supported video platform (YouTube, Vimeo, or Loom) and that the video is set to public or unlisted.
              </div>
            </details>
          </div>
        </div> */}
      </div>
    </div>
  );
}