// apps/web/src/components/RootRedirect.tsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function RootRedirect() {
  const [loading, setLoading] = useState(true);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Not authenticated - RequireAuth will handle redirect to signin
        setLoading(false);
        return;
      }

      try {
        // Get user document
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          // User document doesn't exist (shouldn't happen, but handle it)
          setRedirectTo('/onboarding');
          setLoading(false);
          return;
        }

        const userData = userSnap.data();
        
        // Check if user is admin - admins always go to dashboard
        if (userData.accountType === 'admin') {
          setRedirectTo('/dashboard');
          setLoading(false);
          return;
        }

        // Check if user has products
        const productsRef = collection(db, 'users', user.uid, 'products');
        const productsSnap = await getDocs(productsRef);
        
        if (productsSnap.empty) {
          // No products - go to onboarding to create first product
          setRedirectTo('/onboarding');
        } else {
          // Has products - go to dashboard
          setRedirectTo('/dashboard');
        }
      } catch (error) {
        console.error('Error checking user state:', error);
        // Default to onboarding on error
        setRedirectTo('/onboarding');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Show loading state while checking
  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0B0B0D] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-4 text-neutral-600 dark:text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to determined location
  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  // Fallback (shouldn't reach here)
  return <Navigate to="/onboarding" replace />;
}