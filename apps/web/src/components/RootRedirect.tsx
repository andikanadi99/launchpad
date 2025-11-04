// apps/web/src/components/RootRedirect.tsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function RootRedirect() {
  const [loading, setLoading] = useState(true);
  const [hasProducts, setHasProducts] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Not authenticated - RequireAuth will handle redirect to signin
        setLoading(false);
        return;
      }

      try {
        // Check if user has any products
        const productsRef = collection(db, 'users', user.uid, 'products');
        const productsSnap = await getDocs(productsRef);
        
        setHasProducts(!productsSnap.empty);
      } catch (error) {
        console.error('Error checking products:', error);
        setHasProducts(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Show loading state while checking
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-4 text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect based on product state
  if (hasProducts) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/onboarding" replace />;
}