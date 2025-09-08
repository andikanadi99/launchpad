'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useLocation, useNavigate } from 'react-router-dom';

export default function RequireAuth({ children }: { children: JSX.Element }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [authChecked, setAuthChecked] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthChecked(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Only redirect after auth has been checked
    if (authChecked && user === null) {
      const signedOut = sessionStorage.getItem('lp_signed_out') === '1';
      if (signedOut) {
        sessionStorage.removeItem('lp_signed_out');
        return;
      }
      const next = loc.pathname + loc.search;
      nav(`/auth/signin?next=${encodeURIComponent(next)}&reason=protected`, { replace: true });
    }
  }, [user, authChecked, nav, loc]);

  if (!authChecked || user === undefined) {
    return <div className="p-6 text-neutral-300">Loading…</div>;
  }
  
  if (user === null) {
    return null;
  }
  
  return children;
}