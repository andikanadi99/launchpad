// src/pages/CreatorPage.tsx
// Phase 2.1 — Public Creator Page
// Route: /creator/{username} (no auth required)
// Thin wrapper: fetches data, passes to shared renderer

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import CreatorPageRenderer from './CreatorPageRenderer';
import type { CreatorRendererData, ProductCardData } from './CreatorPageRenderer';
import type { CreatorPageStyle, ProductOverride, ProductSection } from '../lib/Usermodel';
import { DEFAULT_PAGE_STYLE } from '../lib/Usermodel';

export default function CreatorPage() {
  const { username } = useParams();
  const [creator, setCreator] = useState<CreatorRendererData | null>(null);
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [style, setStyle] = useState<CreatorPageStyle>(DEFAULT_PAGE_STYLE);
  const [overrides, setOverrides] = useState<Record<string, ProductOverride>>({});
  const [sections, setSections] = useState<ProductSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCreator();
  }, [username]);

  async function loadCreator() {
    try {
      if (!username) {
        setError('Invalid creator link');
        return;
      }

      // 1. Fetch public profile
      const profileRef = doc(db, 'public_profiles', username.toLowerCase());
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        setError('Creator not found');
        return;
      }

      const data = profileSnap.data();

      setCreator({
        displayName: data.displayName || '',
        bioShort: data.bioShort || '',
        bioLong: data.bioLong || '',
        photoURL: data.photoURL || '',
        coverImageURL: data.coverImageURL || '',
        socialLinks: data.socialLinks || {},
        customLinks: data.customLinks || [],
      });

      // Merge stored style with defaults
      setStyle({ ...DEFAULT_PAGE_STYLE, ...data.pageStyle });
      setOverrides(data.productOverrides || {});
      setSections(data.productSections || []);

      // 2. Fetch published products
      const pagesQuery = query(
        collection(db, 'published_pages'),
        where('userId', '==', data.userId)
      );
      const pagesSnap = await getDocs(pagesQuery);

      const cards: ProductCardData[] = [];
      pagesSnap.docs.forEach((d) => {
        const pd = d.data();
        const sp = pd.salesPage;
        if (!sp || sp.publish?.status !== 'published') return;

        cards.push({
          slug: d.id,
          name: sp.coreInfo?.name || 'Untitled Product',
          tagline: sp.coreInfo?.tagline || '',
          price: sp.coreInfo?.price || 0,
          priceType: sp.coreInfo?.priceType || 'one-time',
          imageUrl: sp.visuals?.headerImage || '',
        });
      });

      setProducts(cards);
    } catch (err) {
      console.error('Error loading creator:', err);
      setError('Failed to load creator page');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !creator) {
    return (
      <div className="min-h-screen bg-[#0B0B0D] flex flex-col items-center justify-center gap-4">
        <p className="text-neutral-400 text-lg">{error || 'Creator not found'}</p>
        <Link to="/" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
          Go to LaunchPad
        </Link>
      </div>
    );
  }

  return (
    <CreatorPageRenderer
      creator={creator}
      products={products}
      style={style}
      productOverrides={overrides}
      productSections={sections}
    />
  );
}