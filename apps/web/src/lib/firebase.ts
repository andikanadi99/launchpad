// apps/web/src/lib/firebase.ts
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MSG_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
  measurementId: import.meta.env.VITE_FB_MEASUREMENT_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
console.log('Firebase Config:', firebaseConfig);
// Services
export const auth = getAuth(app);

// Add persistence to maintain auth across redirects
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Auth persistence error:', error);
});

export const db = getFirestore(app);
export const storage = getStorage(app);
export { app };

// Optional analytics (safe-guarded for SSR/dev)
export const analytics: Promise<Analytics | null> =
  typeof window !== 'undefined'
    ? isSupported().then(s => (s ? getAnalytics(app) : null))
    : Promise.resolve(null);

// Debug logs (optional)
if (typeof window !== 'undefined') {
  console.log('[firebase] projectId:', firebaseConfig.projectId);
  console.log('[firebase] storageBucket:', firebaseConfig.storageBucket);
}