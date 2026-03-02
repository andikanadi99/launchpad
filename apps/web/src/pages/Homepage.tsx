// apps/web/src/pages/HomePage.tsx
// Shows landing page for unauthenticated visitors, redirects authenticated users

import { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import LandingPage from './LandingPage';
import RootRedirect from '../components/RootRedirect';

export default function HomePage() {
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthState(user ? 'authenticated' : 'unauthenticated');
    });
    return () => unsubscribe();
  }, []);

  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-4 text-neutral-600 dark:text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (authState === 'authenticated') {
    return <RootRedirect />;
  }

  return <LandingPage />;
}