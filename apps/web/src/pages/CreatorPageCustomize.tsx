// src/pages/CreatorPageCustomize.tsx
// Phase 2.1 — Creator Page Style Editor
// Route: /settings/customize (protected)
// Uses shared CreatorPageRenderer for live preview
// Supports ?from=dashboard for back navigation

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import {
  saveCreatorProfile,
  publishCreatorProfile,
  uploadCoverImage,
  deleteCoverImage,
} from '../lib/UserDocumentHelpers';
import type { CreatorPageStyle, CreatorProfile, SectionKey, ProductOverride, ProductSection, SocialLinks, CustomLink } from '../lib/Usermodel';
import { DEFAULT_PAGE_STYLE, ACCENT_PRESETS } from '../lib/Usermodel';
import CreatorPageRenderer from './CreatorPageRenderer';
import type { ProductCardData } from './CreatorPageRenderer';
import ConfirmModal from './ConfirmModal';

// ============================================
// HELPERS
// ============================================

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
      {children}
    </h3>
  );
}

const BG_DARK_PRESETS = [
  { label: 'Default',   value: '#0B0B0D' },
  { label: 'Charcoal',  value: '#1a1a2e' },
  { label: 'Midnight',  value: '#0f0f23' },
  { label: 'Deep Navy', value: '#0a192f' },
  { label: 'Dark Wine', value: '#1a0a0a' },
  { label: 'Forest',    value: '#0a1a0a' },
];

const BG_LIGHT_PRESETS = [
  { label: 'Default',    value: '#f5f5f5' },
  { label: 'White',      value: '#ffffff' },
  { label: 'Warm',       value: '#faf5ef' },
  { label: 'Cool',       value: '#f0f4f8' },
  { label: 'Lavender',   value: '#f3f0ff' },
  { label: 'Mint',       value: '#f0fdf4' },
];

const SECTION_LABELS: Record<SectionKey, string> = {
  profile: 'Profile',
  about: 'About',
  links: 'Links',
  products: 'Products',
};

// ============================================
// SECTION ORDER ITEM
// ============================================

function SectionOrderItem({
  section,
  index,
  total,
  onMoveUp,
  onMoveDown,
}: {
  section: SectionKey;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
      <div className="text-neutral-400">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 5A.75.75 0 0 1 2.75 9h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 9.75Zm0 5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
        </svg>
      </div>
      <span className="flex-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {SECTION_LABELS[section]}
      </span>
      <div className="flex gap-1">
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M10.53 13.53a.75.75 0 0 1-1.06 0l-4.25-4.25a.75.75 0 1 1 1.06-1.06L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ============================================
// TOGGLE SWITCH
// ============================================

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-10 h-5 rounded-full transition-colors ${
        checked ? 'bg-purple-600' : 'bg-neutral-300 dark:bg-neutral-700'
      }`}
    >
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-[22px]' : 'translate-x-0.5'
      }`} />
    </button>
  );
}

// ============================================
// UNSPLASH CONFIG
// ============================================

const UNSPLASH_ACCESS_KEY = 'zE8QX3xsv_LTbWSbcK9tPD9TXnYVLldiJt_r-HmLfo4';

const COVER_SUGGESTED_SEARCHES = [
  'abstract background gradient',
  'landscape mountains',
  'minimal workspace',
  'creative desk flat lay',
  'technology abstract',
  'nature sky clouds',
];

// ============================================
// COVER IMAGE PICKER MODAL
// ============================================

interface CoverPickerProps {
  onClose: () => void;
  onSelectUrl: (url: string) => void;
  onUploadFile: (file: File) => void;
}

function CoverImagePickerModal({ onClose, onSelectUrl, onUploadFile }: CoverPickerProps) {
  const [tab, setTab] = useState<'suggested' | 'search' | 'upload'>('suggested');
  const [searchQuery, setSearchQuery] = useState('');
  const [stockImages, setStockImages] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  const fetchImages = async (q: string) => {
    if (!UNSPLASH_ACCESS_KEY) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=9&orientation=landscape`,
        { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
      );
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      setStockImages(data.results || []);
    } catch (e) {
      console.error('Unsplash fetch error:', e);
      setStockImages([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Load suggested on open
  useEffect(() => {
    if (tab === 'suggested') {
      const randomQuery = COVER_SUGGESTED_SEARCHES[Math.floor(Math.random() * COVER_SUGGESTED_SEARCHES.length)];
      fetchImages(randomQuery);
    }
  }, [tab]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) fetchImages(searchQuery);
  };

  const selectStock = (image: any) => {
    onSelectUrl(image.urls.regular);
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setUploadPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    onUploadFile(file);
  };

  const tabClass = (active: boolean) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      active ? 'bg-purple-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'
    }`;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-neutral-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Choose Cover Image</h3>
            <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setTab('suggested')} className={tabClass(tab === 'suggested')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 inline mr-2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
              Suggested
            </button>
            <button onClick={() => setTab('search')} className={tabClass(tab === 'search')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 inline mr-2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              Search Stock
            </button>
            <button onClick={() => setTab('upload')} className={tabClass(tab === 'upload')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 inline mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
              Upload Your Own
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* SUGGESTED */}
          {tab === 'suggested' && (
            <div>
              <p className="text-sm text-neutral-400 mb-3">Suggested Stock Photos</p>
              {isSearching ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {stockImages.map((image: any) => (
                    <div
                      key={image.id}
                      onClick={() => selectStock(image)}
                      className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group"
                    >
                      <img src={image.urls.small} alt={image.alt_description || ''} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-8 h-8 text-white"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                      <div className="absolute bottom-2 left-2 text-xs text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
                        by {image.user?.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SEARCH */}
          {tab === 'search' && (
            <div>
              <form onSubmit={handleSearch} className="mb-6">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for stock images..."
                    className="w-full px-4 py-3 bg-neutral-800 rounded-lg pr-12 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    autoFocus
                  />
                  <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-neutral-700 rounded-lg transition-colors text-neutral-400">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                  </button>
                </div>
              </form>
              {isSearching ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : stockImages.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {stockImages.map((image: any) => (
                    <div
                      key={image.id}
                      onClick={() => selectStock(image)}
                      className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group"
                    >
                      <img src={image.urls.small} alt={image.alt_description || ''} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-8 h-8 text-white"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                      <div className="absolute bottom-2 left-2 text-xs text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
                        by {image.user?.name}
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="text-center py-12 text-neutral-400">No images found for "{searchQuery}"</div>
              ) : (
                <div className="text-center py-12 text-neutral-400">Enter a search term to find stock images</div>
              )}
            </div>
          )}

          {/* UPLOAD */}
          {tab === 'upload' && (
            <div>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-neutral-700 hover:border-neutral-600'
                }`}
              >
                {uploadPreview ? (
                  <div className="space-y-4">
                    <img src={uploadPreview} alt="Upload preview" className="max-h-48 mx-auto rounded-lg" />
                    <p className="text-sm text-neutral-400">Image uploaded!</p>
                  </div>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 mx-auto mb-4 text-neutral-500">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
                    </svg>
                    <p className="text-neutral-300 mb-2">Drag and drop your image here</p>
                    <p className="text-sm text-neutral-500 mb-4">or</p>
                    <label className="inline-block">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                      />
                      <span className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg cursor-pointer transition-colors text-white text-sm font-medium">
                        Choose File
                      </span>
                    </label>
                    <p className="text-xs text-neutral-500 mt-4">Recommended: 1500×500px, JPG or PNG</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Attribution */}
        {tab !== 'upload' && (
          <div className="px-6 pb-4 text-xs text-neutral-500">
            Stock photos provided by Unsplash.
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// COMPONENT
// ============================================

export default function CreatorPageCustomize() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = searchParams.get('from');

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [realProducts, setRealProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);

  const [style, setStyle] = useState<CreatorPageStyle>({ ...DEFAULT_PAGE_STYLE });
  const [savedStyle, setSavedStyle] = useState<CreatorPageStyle>({ ...DEFAULT_PAGE_STYLE });
  const [customAccentHex, setCustomAccentHex] = useState('');
  const [showCustomAccentHex, setShowCustomAccentHex] = useState(false);
  const [customBgHex, setCustomBgHex] = useState('');
  const [showCustomBgHex, setShowCustomBgHex] = useState(false);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Cover image state
  const [coverImageURL, setCoverImageURL] = useState('');
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverDirty, setCoverDirty] = useState(false);

  // Product overrides state
  const [productOverrides, setProductOverrides] = useState<Record<string, ProductOverride>>({});
  const [savedOverrides, setSavedOverrides] = useState<Record<string, ProductOverride>>({});
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  // About section state
  const [bioLong, setBioLong] = useState('');
  const [savedBioLong, setSavedBioLong] = useState('');

  // Editable profile content (syncs to Settings too)
  const [displayName, setDisplayName] = useState('');
  const [savedDisplayName, setSavedDisplayName] = useState('');
  const [bioShort, setBioShort] = useState('');
  const [savedBioShort, setSavedBioShort] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({ website: '', youtube: '', instagram: '', twitter: '', tiktok: '', linkedin: '' });
  const [savedSocialLinks, setSavedSocialLinks] = useState<SocialLinks>({ website: '', youtube: '', instagram: '', twitter: '', tiktok: '', linkedin: '' });
  const [customLinks, setCustomLinks] = useState<CustomLink[]>([]);
  const [savedCustomLinks, setSavedCustomLinks] = useState<CustomLink[]>([]);

  // Product sections state
  const [productSections, setProductSections] = useState<ProductSection[]>([]);
  const [savedSections, setSavedSections] = useState<ProductSection[]>([]);

  const styleDirty = useMemo(
    () => JSON.stringify(style) !== JSON.stringify(savedStyle),
    [style, savedStyle]
  );
  const overridesDirty = useMemo(
    () => JSON.stringify(productOverrides) !== JSON.stringify(savedOverrides),
    [productOverrides, savedOverrides]
  );
  const bioLongDirty = bioLong !== savedBioLong;
  const profileContentDirty = useMemo(
    () => displayName !== savedDisplayName
      || bioShort !== savedBioShort
      || JSON.stringify(socialLinks) !== JSON.stringify(savedSocialLinks)
      || JSON.stringify(customLinks) !== JSON.stringify(savedCustomLinks),
    [displayName, savedDisplayName, bioShort, savedBioShort, socialLinks, savedSocialLinks, customLinks, savedCustomLinks]
  );
  const sectionsDirty = useMemo(
    () => JSON.stringify(productSections) !== JSON.stringify(savedSections),
    [productSections, savedSections]
  );
  const isDirty = styleDirty || coverDirty || overridesDirty || bioLongDirty || profileContentDirty || sectionsDirty;

  const backPath = from === 'dashboard' ? '/dashboard' : '/settings';
  const backLabel = from === 'dashboard' ? '← Back to Dashboard' : '← Back to Settings';

  // Manual navigation guard — stores pending path when dirty
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  const isDirtyRef = useRef(false);
  const skipGuardRef = useRef(false);
  useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);

  // Block browser refresh/tab close
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Intercept all in-app navigation (NavLink clicks, sidebar tabs, etc.)
  useEffect(() => {
    const originalPushState = window.history.pushState.bind(window.history);

    window.history.pushState = function (data: any, unused: string, url?: string | URL | null) {
      const targetUrl = url ? String(url) : undefined;
      if (!skipGuardRef.current && isDirtyRef.current && targetUrl && targetUrl !== window.location.pathname) {
        setPendingNav(targetUrl);
        return; // Block the navigation
      }
      return originalPushState(data, unused, url);
    };

    // Browser back/forward button
    const handlePopState = () => {
      if (isDirtyRef.current) {
        // Re-push current URL to cancel the back navigation
        window.history.pushState(null, '', window.location.href);
        setPendingNav('__back__');
      }
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.history.pushState = originalPushState;
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const guardedNavigate = (path: string) => {
    if (isDirty) {
      setPendingNav(path);
    } else {
      navigate(path);
    }
  };

  const handleBack = () => guardedNavigate(backPath);

  // ============================================
  // AUTH + LOAD
  // ============================================

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { navigate('/auth/signin'); return; }
      setUser(u);

      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists()) {
          const data = snap.data();
          const prof = data.profile || {};
          setProfile(prof as CreatorProfile);

          const ps: CreatorPageStyle = { ...DEFAULT_PAGE_STYLE, ...prof.pageStyle };

          // Migrate old backgroundStyle
          if ((prof.pageStyle as any)?.backgroundStyle && !prof.pageStyle?.backgroundColor) {
            const oldBg = (prof.pageStyle as any).backgroundStyle;
            if (oldBg === 'gradient-purple') {
              ps.backgroundGradient = true;
              ps.backgroundGradientColor = '#a855f7';
            } else if (oldBg === 'gradient-blue') {
              ps.backgroundGradient = true;
              ps.backgroundGradientColor = '#3b82f6';
            } else if (oldBg === 'gradient-warm') {
              ps.backgroundGradient = true;
              ps.backgroundGradientColor = '#f97316';
            }
          }

          // Migrate: ensure 'about' key exists in sectionOrder
          if (!ps.sectionOrder.includes('about')) {
            const profileIdx = ps.sectionOrder.indexOf('profile');
            ps.sectionOrder.splice(profileIdx + 1, 0, 'about');
          }

          setStyle(ps);
          setSavedStyle(ps);
          setCoverImageURL(prof.coverImageURL || '');

          const overridesData = prof.productOverrides || {};
          setProductOverrides(overridesData);
          setSavedOverrides(overridesData);

          setBioLong(prof.bioLong || '');
          setSavedBioLong(prof.bioLong || '');

          // Editable profile content
          setDisplayName(prof.displayName || '');
          setSavedDisplayName(prof.displayName || '');
          setBioShort(prof.bioShort || '');
          setSavedBioShort(prof.bioShort || '');
          const sl = prof.socialLinks || { website: '', youtube: '', instagram: '', twitter: '', tiktok: '', linkedin: '' };
          setSocialLinks(sl);
          setSavedSocialLinks(sl);
          const cl = prof.customLinks || [];
          setCustomLinks(cl);
          setSavedCustomLinks(cl);

          const sectionsData = prof.productSections || [];
          setProductSections(sectionsData);
          setSavedSections(sectionsData);

          if (!ACCENT_PRESETS.find((p) => p.value === ps.accentColor)) {
            setCustomAccentHex(ps.accentColor);
            setShowCustomAccentHex(true);
          }
        }

        // Fetch real products for preview
        const pagesQuery = query(collection(db, 'published_pages'), where('userId', '==', u.uid));
        const pagesSnap = await getDocs(pagesQuery);
        const cards: ProductCardData[] = [];
        pagesSnap.docs.forEach((d: any) => {
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
        setRealProducts(cards);
      } catch (e) {
        console.error('Failed to load profile:', e);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  // ============================================
  // SAVE
  // ============================================

  const handleSave = async () => {
    if (!user) return;
    setSaveStatus('saving');

    try {
      // Build save payload
      const saveData: Partial<CreatorProfile> = {};
      if (styleDirty) saveData.pageStyle = style;
      if (overridesDirty) saveData.productOverrides = productOverrides;
      if (bioLongDirty) saveData.bioLong = bioLong;
      if (sectionsDirty) saveData.productSections = productSections;
      if (profileContentDirty) {
        saveData.displayName = displayName;
        saveData.bioShort = bioShort;
        saveData.socialLinks = socialLinks;
        saveData.customLinks = customLinks;
      }

      if (Object.keys(saveData).length > 0) {
        await saveCreatorProfile(user.uid, saveData);
      }

      // Always publish (covers style, cover image, and override changes)
      await autoPublish();
      setSavedStyle({ ...style });
      setSavedOverrides({ ...productOverrides });
      setSavedBioLong(bioLong);
      setSavedSections([...productSections]);
      setSavedDisplayName(displayName);
      setSavedBioShort(bioShort);
      setSavedSocialLinks({ ...socialLinks });
      setSavedCustomLinks([...customLinks]);
      setCoverDirty(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('Save failed:', e);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // ============================================
  // STYLE UPDATERS
  // ============================================

  const update = useCallback((partial: Partial<CreatorPageStyle>) => {
    setStyle((s) => ({ ...s, ...partial }));
    setSaveStatus('idle');
  }, []);

  const moveSection = useCallback((fromIdx: number, toIdx: number) => {
    setStyle((s) => {
      const order = [...s.sectionOrder];
      const [item] = order.splice(fromIdx, 1);
      order.splice(toIdx, 0, item);
      return { ...s, sectionOrder: order };
    });
    setSaveStatus('idle');
  }, []);

  // ============================================
  // COVER IMAGE HANDLERS
  // ============================================

  // Robust publish — reads username directly from user doc to avoid stale state
  const autoPublish = async () => {
    if (!user) return;
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      const username = snap.data()?.profile?.username;
      if (username) {
        await publishCreatorProfile(user.uid);
        console.log('✅ Auto-published after cover change');
      } else {
        console.log('⏭ No username — skipped publish');
      }
    } catch (e) {
      console.error('❌ Auto-publish failed:', e);
    }
  };

  // Stock image selected — save Unsplash URL directly to profile
  // Stock image selected — save URL to user doc, let Save button publish
  const handleCoverSelectUrl = async (url: string) => {
    if (!user) return;
    setCoverImageURL(url);
    setShowCoverPicker(false);
    setCoverDirty(true);
    try {
      await saveCreatorProfile(user.uid, { coverImageURL: url });
    } catch (e) {
      console.error('Failed to save cover URL:', e);
    }
  };

  // File uploaded — upload to Firebase Storage, then save URL
  // File uploaded — upload to Firebase Storage, let Save button publish
  const handleCoverUploadFile = async (file: File) => {
    if (!user) return;
    setCoverUploading(true);
    setCoverDirty(true);
    try {
      const url = await uploadCoverImage(user.uid, file);
      setCoverImageURL(url);
      setShowCoverPicker(false);
    } catch (e: any) {
      console.error('Failed to upload cover:', e);
      alert(e.message || 'Failed to upload cover image');
    } finally {
      setCoverUploading(false);
    }
  };

  // Remove cover image
  // Remove cover image — delete from Storage, let Save button publish
  const handleCoverRemove = async () => {
    if (!user) return;
    setCoverUploading(true);
    setCoverDirty(true);
    try {
      await deleteCoverImage(user.uid);
      setCoverImageURL('');
    } catch (e) {
      console.error('Failed to remove cover:', e);
    } finally {
      setCoverUploading(false);
    }
  };

  // ============================================
  // LOADING
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0B0B0D] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isDark = style.theme === 'dark';
  const bgPresets = isDark ? BG_DARK_PRESETS : BG_LIGHT_PRESETS;

  // Build renderer data from profile + live cover state
  const rendererData = {
    displayName: displayName || 'Your Name',
    bioShort: bioShort,
    bioLong: bioLong,
    photoURL: profile?.photoURL || '',
    coverImageURL: coverImageURL,
    socialLinks: { ...socialLinks } as Record<string, string>,
    customLinks: customLinks,
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0B0B0D]">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-[#111113]/80 backdrop-blur border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
            >
              {backLabel}
            </button>
            <span className="text-neutral-300 dark:text-neutral-700">|</span>
            <h1 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Customize Creator Page
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {profile?.username && (
              <a
                href={`/creator/${profile.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-purple-500 hover:text-purple-400 transition-colors hidden sm:inline-flex items-center gap-1"
              >
                View live page ↗
              </a>
            )}

            <button
              onClick={handleSave}
              disabled={!isDirty}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                saveStatus === 'saved'
                  ? 'bg-green-600 text-white'
                  : isDirty
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-500/20'
                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
              }`}
            >
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? '✓ Saved!' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ============================================ */}
          {/* LEFT: CONTROLS                              */}
          {/* ============================================ */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-5">

            {/* PROFILE CONTENT */}
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111113] p-5 space-y-4">
              <SectionLabel>Profile Content</SectionLabel>

              {/* Display Name */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">Name</label>
                  <span className={`text-[10px] ${displayName.length > 40 ? 'text-amber-400' : 'text-neutral-400'}`}>{displayName.length}/50</span>
                </div>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => { if (e.target.value.length <= 50) setDisplayName(e.target.value); }}
                  placeholder="Your display name"
                  className="w-full px-3 py-2 rounded-lg text-sm bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                />
              </div>

              {/* Short Bio */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">Bio</label>
                  <span className={`text-[10px] ${bioShort.length > 140 ? 'text-amber-400' : 'text-neutral-400'}`}>{bioShort.length}/160</span>
                </div>
                <textarea
                  ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                  value={bioShort}
                  onChange={(e) => {
                    if (e.target.value.length <= 160) setBioShort(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  placeholder="One-liner about what you do..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none overflow-hidden break-words"
                />
              </div>

              {/* Social Links */}
              <div>
                <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider block mb-2">Social Links</label>
                <div className="space-y-2">
                  {(['website', 'youtube', 'instagram', 'twitter', 'tiktok', 'linkedin'] as const).map((platform) => (
                    <div key={platform} className="flex items-center gap-2">
                      <span className="text-[10px] text-neutral-400 w-16 capitalize">{platform === 'twitter' ? 'X' : platform}</span>
                      <input
                        type="url"
                        value={socialLinks[platform]}
                        onChange={(e) => setSocialLinks((prev) => ({ ...prev, [platform]: e.target.value }))}
                        placeholder={`${platform} URL`}
                        className="flex-1 px-2.5 py-1.5 rounded-lg text-xs bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Links */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">Custom Links</label>
                  <button
                    onClick={() => setCustomLinks((prev) => [...prev, { id: `cl_${Date.now()}`, label: '', url: '' }])}
                    className="text-[10px] font-medium text-purple-400 hover:text-purple-300"
                  >
                    + Add
                  </button>
                </div>
                {customLinks.length === 0 ? (
                  <p className="text-[10px] text-neutral-500">No custom links yet</p>
                ) : (
                  <div className="space-y-2">
                    {customLinks.map((link, idx) => (
                      <div key={link.id} className="flex items-start gap-1.5">
                        <div className="flex-1 space-y-1">
                          <input
                            type="text"
                            value={link.label}
                            onChange={(e) => setCustomLinks((prev) => prev.map((l, i) => i === idx ? { ...l, label: e.target.value } : l))}
                            placeholder="Label"
                            className="w-full px-2.5 py-1 rounded-lg text-xs bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                          />
                          <input
                            type="url"
                            value={link.url}
                            onChange={(e) => setCustomLinks((prev) => prev.map((l, i) => i === idx ? { ...l, url: e.target.value } : l))}
                            placeholder="https://..."
                            className="w-full px-2.5 py-1 rounded-lg text-xs bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                          />
                        </div>
                        <button
                          onClick={() => setCustomLinks((prev) => prev.filter((_, i) => i !== idx))}
                          className="mt-1 text-red-400 hover:text-red-300 transition-colors"
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* COVER IMAGE */}
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111113] p-5">
              <SectionLabel>Cover Image</SectionLabel>
              <p className="text-xs text-neutral-500 mb-3">
                Banner displayed at the top of your creator page. Recommended: 1500×500px.
              </p>

              {coverImageURL ? (
                <div className="relative group rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
                  <img
                    src={coverImageURL}
                    alt="Cover"
                    className="w-full aspect-[3/1] object-cover"
                    style={{
                      objectPosition: style.coverPosition || 'center',
                      transform: (style.coverZoom || 1) !== 1 ? `scale(${style.coverZoom})` : undefined,
                    }}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => setShowCoverPicker(true)}
                      disabled={coverUploading}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/90 text-neutral-900 hover:bg-white transition-colors disabled:opacity-50"
                    >
                      {coverUploading ? 'Uploading...' : 'Change'}
                    </button>
                    <button
                      onClick={handleCoverRemove}
                      disabled={coverUploading}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/90 text-white hover:bg-red-500 transition-colors disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCoverPicker(true)}
                  disabled={coverUploading}
                  className="w-full aspect-[3/1] rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-purple-500/50 dark:hover:border-purple-500/30 transition-colors flex flex-col items-center justify-center gap-2 bg-neutral-50 dark:bg-neutral-900/30 disabled:opacity-50"
                >
                  {coverUploading ? (
                    <div className="flex items-center gap-2 text-purple-400">
                      <span className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Uploading...</span>
                    </div>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-neutral-400">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                      </svg>
                      <span className="text-sm text-neutral-500">Add a cover image</span>
                    </>
                  )}
                </button>
              )}

              {/* Position & Zoom (only when cover exists) */}
              {coverImageURL && (
                <div className="mt-4 space-y-3">
                  {/* Position */}
                  <div>
                    <span className="text-xs text-neutral-500 block mb-2">Vertical position</span>
                    <div className="flex gap-2">
                      {[
                        { value: 'top' as const, label: 'Top' },
                        { value: 'center' as const, label: 'Center' },
                        { value: 'bottom' as const, label: 'Bottom' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => update({ coverPosition: opt.value })}
                          className={`flex-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                            (style.coverPosition || 'center') === opt.value
                              ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                              : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:border-neutral-400 dark:hover:border-neutral-600'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Zoom */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-neutral-500">Zoom</span>
                      <span className="text-xs text-neutral-400">{Math.round((style.coverZoom || 1) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="1.5"
                      step="0.05"
                      value={style.coverZoom || 1}
                      onChange={(e) => update({ coverZoom: parseFloat(e.target.value) })}
                      className="w-full accent-purple-500"
                    />
                  </div>

                  {/* Height */}
                  <div>
                    <span className="text-xs text-neutral-500 block mb-2">Banner height</span>
                    <div className="flex gap-2">
                      {[
                        { value: 'short' as const, label: 'Short' },
                        { value: 'medium' as const, label: 'Medium' },
                        { value: 'tall' as const, label: 'Tall' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => update({ coverHeight: opt.value })}
                          className={`flex-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                            (style.coverHeight || 'medium') === opt.value
                              ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                              : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:border-neutral-400 dark:hover:border-neutral-600'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* THEME */}
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111113] p-5">
              <SectionLabel>Theme</SectionLabel>
              <div className="flex gap-3">
                {[
                  { value: 'dark' as const, label: 'Dark', bgClass: 'bg-[#0B0B0D]', textClass: 'text-white' },
                  { value: 'light' as const, label: 'Light', bgClass: 'bg-neutral-100', textClass: 'text-neutral-900' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      update({
                        theme: opt.value,
                        backgroundColor: opt.value === 'dark' ? '#0B0B0D' : '#f5f5f5',
                      });
                    }}
                    className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                      style.theme === opt.value
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600'
                    }`}
                  >
                    <div className={`w-full h-8 rounded-lg ${opt.bgClass} border border-neutral-700/30 flex items-center justify-center`}>
                      <div className={`text-[8px] font-bold ${opt.textClass}`}>Aa</div>
                    </div>
                    <span className={`text-xs font-medium ${style.theme === opt.value ? 'text-purple-400' : 'text-neutral-500'}`}>
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* ACCENT COLOR */}
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111113] p-5">
              <SectionLabel>Accent Color</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {ACCENT_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => { update({ accentColor: preset.value }); setShowCustomAccentHex(false); }}
                    title={preset.label}
                    className={`w-9 h-9 rounded-full transition-all ${
                      style.accentColor === preset.value && !showCustomAccentHex
                        ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#111113] scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: preset.value, '--tw-ring-color': preset.value } as React.CSSProperties}
                  />
                ))}
                <button
                  onClick={() => {
                    setShowCustomAccentHex(!showCustomAccentHex);
                    if (!showCustomAccentHex && customAccentHex) update({ accentColor: customAccentHex });
                  }}
                  className={`w-9 h-9 rounded-full border-2 border-dashed transition-all flex items-center justify-center text-xs font-bold ${
                    showCustomAccentHex ? 'border-white text-white scale-110' : 'border-neutral-500 text-neutral-500 hover:border-neutral-300 hover:text-neutral-300'
                  }`}
                  style={showCustomAccentHex ? { background: 'conic-gradient(from 0deg, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)', borderColor: 'transparent' } : {}}
                  title="Custom color"
                >
                  {!showCustomAccentHex && '#'}
                </button>
              </div>
              {showCustomAccentHex && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg border border-neutral-700 flex-shrink-0" style={{ backgroundColor: customAccentHex || style.accentColor }} />
                  <input
                    type="text" value={customAccentHex} placeholder="#a855f7" maxLength={7}
                    onChange={(e) => { setCustomAccentHex(e.target.value); if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) update({ accentColor: e.target.value }); }}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0B0B0D] text-neutral-900 dark:text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm font-mono"
                  />
                </div>
              )}
            </div>

            {/* BACKGROUND */}
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111113] p-5">
              <SectionLabel>Background Color</SectionLabel>
              <div className="flex flex-wrap gap-2 mb-3">
                {bgPresets.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => { update({ backgroundColor: preset.value }); setShowCustomBgHex(false); }}
                    title={preset.label}
                    className={`w-9 h-9 rounded-lg border transition-all ${
                      style.backgroundColor === preset.value && !showCustomBgHex
                        ? 'ring-2 ring-purple-500 ring-offset-1 ring-offset-white dark:ring-offset-[#111113] scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: preset.value, borderColor: isDark ? '#333' : '#ddd' }}
                  />
                ))}
                <button
                  onClick={() => { setShowCustomBgHex(!showCustomBgHex); if (!showCustomBgHex && customBgHex) update({ backgroundColor: customBgHex }); }}
                  className={`w-9 h-9 rounded-lg border-2 border-dashed transition-all flex items-center justify-center text-xs font-bold ${
                    showCustomBgHex ? 'border-purple-500 text-purple-400 scale-110' : 'border-neutral-500 text-neutral-500 hover:border-neutral-300 hover:text-neutral-300'
                  }`}
                  title="Custom color"
                >#</button>
              </div>
              {showCustomBgHex && (
                <div className="mb-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg border border-neutral-700 flex-shrink-0" style={{ backgroundColor: customBgHex || style.backgroundColor }} />
                  <input
                    type="text" value={customBgHex} placeholder={isDark ? '#0B0B0D' : '#f5f5f5'} maxLength={7}
                    onChange={(e) => { setCustomBgHex(e.target.value); if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) update({ backgroundColor: e.target.value }); }}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0B0B0D] text-neutral-900 dark:text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm font-mono"
                  />
                </div>
              )}

              {/* Gradient overlay */}
              <div className="border-t border-neutral-200 dark:border-neutral-800 pt-3 mt-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Gradient overlay</span>
                  <Toggle checked={style.backgroundGradient} onChange={() => update({ backgroundGradient: !style.backgroundGradient })} />
                </div>
                {style.backgroundGradient && (
                  <div className="space-y-3">
                    {/* Direction */}
                    <div>
                      <span className="text-xs text-neutral-500 block mb-2">Direction</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { value: 'to-bottom' as const, label: '↓', title: 'Top to Bottom' },
                          { value: 'to-top' as const, label: '↑', title: 'Bottom to Top' },
                          { value: 'to-right' as const, label: '→', title: 'Left to Right' },
                          { value: 'to-left' as const, label: '←', title: 'Right to Left' },
                          { value: 'to-br' as const, label: '↘', title: 'Diagonal Down' },
                          { value: 'to-bl' as const, label: '↙', title: 'Diagonal Up' },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => update({ gradientDirection: opt.value })}
                            title={opt.title}
                            className={`px-2 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                              (style.gradientDirection || 'to-bottom') === opt.value
                                ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                                : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:border-neutral-400 dark:hover:border-neutral-600'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Position / Spread */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-neutral-500">Spread</span>
                        <span className="text-xs text-neutral-400">{style.gradientPosition ?? 50}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="90"
                        step="5"
                        value={style.gradientPosition ?? 50}
                        onChange={(e) => update({ gradientPosition: parseInt(e.target.value) })}
                        className="w-full accent-purple-500"
                      />
                      <div className="flex justify-between mt-0.5">
                        <span className="text-[10px] text-neutral-400">Tight</span>
                        <span className="text-[10px] text-neutral-400">Wide</span>
                      </div>
                    </div>

                    {/* Color */}
                    <div>
                      <span className="text-xs text-neutral-500 block mb-2">Color</span>
                      <div className="flex flex-wrap gap-2">
                        {ACCENT_PRESETS.map((preset) => (
                          <button
                            key={preset.value}
                            onClick={() => update({ backgroundGradientColor: preset.value })}
                            title={preset.label}
                            className={`w-7 h-7 rounded-full transition-all ${
                              style.backgroundGradientColor === preset.value
                                ? 'ring-2 ring-offset-1 ring-offset-white dark:ring-offset-[#111113] ring-purple-500 scale-110'
                                : 'hover:scale-105'
                            }`}
                            style={{ backgroundColor: preset.value }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* PHOTO SHAPE */}
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111113] p-5">
              <SectionLabel>Photo Shape</SectionLabel>
              <div className="flex gap-3">
                {[
                  { value: 'square' as const, label: 'Square', icon: 'rounded-xl' },
                  { value: 'circle' as const, label: 'Circle', icon: 'rounded-full' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => update({ photoShape: opt.value })}
                    className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                      style.photoShape === opt.value ? 'border-purple-500 bg-purple-500/10' : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600'
                    }`}
                  >
                    <div className={`w-10 h-10 bg-neutral-300 dark:bg-neutral-600 ${opt.icon}`} />
                    <span className={`text-xs font-medium ${style.photoShape === opt.value ? 'text-purple-400' : 'text-neutral-500'}`}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* PRODUCTS */}
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111113] p-5 space-y-4">
              <SectionLabel>Products</SectionLabel>

              {/* Card style */}
              <div>
                <span className="text-xs text-neutral-500 block mb-2">Card style</span>
                <div className="flex gap-2">
                  {[
                    { value: 'compact' as const, label: 'Compact' },
                    { value: 'standard' as const, label: 'Standard' },
                    { value: 'featured' as const, label: 'Featured' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => update({ productCardStyle: opt.value })}
                      className={`flex-1 px-2 py-2 rounded-lg border text-xs font-medium transition-all ${
                        style.productCardStyle === opt.value
                          ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                          : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:border-neutral-400 dark:hover:border-neutral-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-neutral-500 mt-1.5">
                  {style.productCardStyle === 'compact' && 'Text only, no images'}
                  {style.productCardStyle === 'standard' && 'Image with 16:9 ratio'}
                  {style.productCardStyle === 'featured' && 'Larger image with 4:3 ratio'}
                </p>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Show tagline</span>
                  <Toggle checked={style.productShowTagline} onChange={() => update({ productShowTagline: !style.productShowTagline })} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Show price</span>
                  <Toggle checked={style.productShowPrice} onChange={() => update({ productShowPrice: !style.productShowPrice })} />
                </div>
              </div>

              {/* Per-product overrides */}
              {realProducts.length > 0 && (
                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700/50">
                  <span className="text-xs text-neutral-500 block mb-3">Per-product customization</span>
                  <div className="space-y-3">
                    {realProducts.map((product) => {
                      const override = productOverrides[product.slug] || {};
                      const isExpanded = expandedProduct === product.slug;

                      const updateOverride = (field: keyof ProductOverride, value: string) => {
                        setProductOverrides((prev) => ({
                          ...prev,
                          [product.slug]: {
                            ...prev[product.slug],
                            [field]: value,
                          },
                        }));
                      };

                      const clearOverride = (field: keyof ProductOverride) => {
                        setProductOverrides((prev) => {
                          const updated = { ...prev };
                          if (updated[product.slug]) {
                            const o = { ...updated[product.slug] };
                            delete o[field];
                            if (Object.keys(o).length === 0) {
                              delete updated[product.slug];
                            } else {
                              updated[product.slug] = o;
                            }
                          }
                          return updated;
                        });
                      };

                      const hasOverrides = override.thumbnail || override.description || override.ctaText;
                      const descLen = (override.description ?? '').length;
                      const ctaLen = (override.ctaText ?? '').length;

                      return (
                        <div
                          key={product.slug}
                          className="rounded-lg border border-neutral-200 dark:border-neutral-700/50 overflow-hidden"
                        >
                          {/* Collapsed header */}
                          <button
                            onClick={() => setExpandedProduct(isExpanded ? null : product.slug)}
                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors"
                          >
                            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-100 dark:bg-neutral-800">
                              {(override.thumbnail || product.imageUrl) ? (
                                <img
                                  src={override.thumbnail || product.imageUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-neutral-400">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-neutral-900 dark:text-neutral-200 truncate">
                                {product.name}
                              </p>
                              {hasOverrides && (
                                <p className="text-[10px] text-purple-400">Customized</p>
                              )}
                            </div>
                            <svg
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className={`w-4 h-4 text-neutral-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            >
                              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06z" clipRule="evenodd" />
                            </svg>
                          </button>

                          {/* Expanded editor */}
                          {isExpanded && (
                            <div className="px-3 pb-3 space-y-3 border-t border-neutral-200 dark:border-neutral-700/50 pt-3">
                              {/* Custom Description */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                                    Description
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] ${descLen > 140 ? 'text-amber-400' : 'text-neutral-400'}`}>
                                      {descLen}/160
                                    </span>
                                    {override.description && (
                                      <button
                                        onClick={() => clearOverride('description')}
                                        className="text-[10px] text-red-400 hover:text-red-300"
                                      >
                                        Reset
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <textarea
                                  ref={(el) => {
                                    if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
                                  }}
                                  value={override.description ?? ''}
                                  onChange={(e) => {
                                    if (e.target.value.length <= 160) {
                                      updateOverride('description', e.target.value);
                                    }
                                    // Auto-expand
                                    e.target.style.height = 'auto';
                                    e.target.style.height = e.target.scrollHeight + 'px';
                                  }}
                                  placeholder={product.tagline || 'Short description...'}
                                  rows={1}
                                  className="w-full px-3 py-2 rounded-lg text-xs bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none overflow-hidden break-words"
                                />
                              </div>

                              {/* Custom CTA Text */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                                    Button Text
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] ${ctaLen > 24 ? 'text-amber-400' : 'text-neutral-400'}`}>
                                      {ctaLen}/30
                                    </span>
                                    {override.ctaText && (
                                      <button
                                        onClick={() => clearOverride('ctaText')}
                                        className="text-[10px] text-red-400 hover:text-red-300"
                                      >
                                        Reset
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <input
                                  type="text"
                                  value={override.ctaText ?? ''}
                                  onChange={(e) => {
                                    if (e.target.value.length <= 30) {
                                      updateOverride('ctaText', e.target.value);
                                    }
                                  }}
                                  placeholder="View Product"
                                  className="w-full px-3 py-2 rounded-lg text-xs bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                />
                              </div>

                              {/* Custom Thumbnail */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                                    Thumbnail
                                  </label>
                                  {override.thumbnail && (
                                    <button
                                      onClick={() => clearOverride('thumbnail')}
                                      className="text-[10px] text-red-400 hover:text-red-300"
                                    >
                                      Reset
                                    </button>
                                  )}
                                </div>
                                {override.thumbnail ? (
                                  <div className="relative group rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
                                    <img
                                      src={override.thumbnail}
                                      alt=""
                                      className="w-full aspect-video object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                      <label className="px-2 py-1 text-[10px] font-medium rounded bg-white/90 text-neutral-900 cursor-pointer hover:bg-white">
                                        Replace
                                        <input
                                          type="file"
                                          accept="image/jpeg,image/png,image/webp"
                                          className="hidden"
                                          onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file || !user) return;
                                            try {
                                              const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
                                              const { storage } = await import('../lib/firebase');
                                              const fileName = `thumb_${Date.now()}_${file.name}`;
                                              const fileRef = ref(storage, `users/${user.uid}/images/${fileName}`);
                                              const snap = await uploadBytes(fileRef, file);
                                              const url = await getDownloadURL(snap.ref);
                                              updateOverride('thumbnail', url);
                                            } catch (err) {
                                              console.error('Thumbnail upload failed:', err);
                                            }
                                          }}
                                        />
                                      </label>
                                      <button
                                        onClick={() => clearOverride('thumbnail')}
                                        className="px-2 py-1 text-[10px] font-medium rounded bg-red-500/90 text-white hover:bg-red-500"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-purple-500/50 transition-colors cursor-pointer">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-neutral-400">
                                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
                                    </svg>
                                    <span className="text-xs text-neutral-500">Upload custom image</span>
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp"
                                      className="hidden"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file || !user) return;
                                        try {
                                          const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
                                          const { storage } = await import('../lib/firebase');
                                          const fileName = `thumb_${Date.now()}_${file.name}`;
                                          const fileRef = ref(storage, `users/${user.uid}/images/${fileName}`);
                                          const snap = await uploadBytes(fileRef, file);
                                          const url = await getDownloadURL(snap.ref);
                                          updateOverride('thumbnail', url);
                                        } catch (err) {
                                          console.error('Thumbnail upload failed:', err);
                                        }
                                      }}
                                    />
                                  </label>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ABOUT SECTION */}
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111113] p-5">
              <SectionLabel>About</SectionLabel>
              <p className="text-xs text-neutral-500 mb-3">
                Longer bio shown in the "About" section of your page. Leave empty to hide.
              </p>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-neutral-400">{bioLong.length}/1000</span>
                  {bioLong && (
                    <button onClick={() => setBioLong('')} className="text-[10px] text-red-400 hover:text-red-300">Clear</button>
                  )}
                </div>
                <textarea
                  ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                  value={bioLong}
                  onChange={(e) => {
                    if (e.target.value.length <= 1000) setBioLong(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  placeholder="Tell visitors more about yourself, your expertise, and what you offer..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg text-xs bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none overflow-hidden break-words"
                />
              </div>
            </div>

            {/* PRODUCT SECTIONS */}
            {realProducts.length > 1 && (
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111113] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <SectionLabel>Product Sections</SectionLabel>
                  <button
                    onClick={() => {
                      const id = `ps_${Date.now()}`;
                      setProductSections((prev) => [...prev, { id, title: 'New Section', productSlugs: [], layout: 'list' }]);
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                  >
                    + Add Section
                  </button>
                </div>
                <p className="text-xs text-neutral-500 -mt-2">
                  Group products under named headings. Unassigned products appear under "Other Products".
                </p>

                {productSections.length === 0 ? (
                  <div className="text-center py-4 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
                    <p className="text-xs text-neutral-500">No sections yet — all products display together</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {productSections.map((section, sIdx) => {
                      const assignedSet = new Set(productSections.flatMap((s, i) => i !== sIdx ? s.productSlugs : []));
                      const availableProducts = realProducts.filter(p => !assignedSet.has(p.slug) && !section.productSlugs.includes(p.slug));

                      return (
                        <div key={section.id} className="rounded-xl border border-neutral-200 dark:border-neutral-700/50 bg-neutral-50 dark:bg-neutral-900/30 p-3 space-y-3">
                          {/* Section header: title + actions */}
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={section.title}
                              onChange={(e) => {
                                if (e.target.value.length <= 40) {
                                  setProductSections((prev) => prev.map((s, i) => i === sIdx ? { ...s, title: e.target.value } : s));
                                }
                              }}
                              className="flex-1 px-2 py-1.5 rounded-lg text-sm font-medium bg-transparent border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                            />
                            <span className="text-[10px] text-neutral-400 whitespace-nowrap">{section.title.length}/40</span>
                            {/* Move up */}
                            <button
                              onClick={() => {
                                if (sIdx === 0) return;
                                setProductSections((prev) => {
                                  const arr = [...prev];
                                  [arr[sIdx - 1], arr[sIdx]] = [arr[sIdx], arr[sIdx - 1]];
                                  return arr;
                                });
                              }}
                              disabled={sIdx === 0}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-700 disabled:opacity-20 transition-colors"
                              title="Move up"
                            >
                              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z" clipRule="evenodd" /></svg>
                            </button>
                            {/* Move down */}
                            <button
                              onClick={() => {
                                if (sIdx === productSections.length - 1) return;
                                setProductSections((prev) => {
                                  const arr = [...prev];
                                  [arr[sIdx], arr[sIdx + 1]] = [arr[sIdx + 1], arr[sIdx]];
                                  return arr;
                                });
                              }}
                              disabled={sIdx === productSections.length - 1}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-700 disabled:opacity-20 transition-colors"
                              title="Move down"
                            >
                              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-4.25-4.25a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
                            </button>
                            {/* Delete */}
                            <button
                              onClick={() => setProductSections((prev) => prev.filter((_, i) => i !== sIdx))}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                              title="Delete section"
                            >
                              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.519.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 1 .7.797l-.5 6a.75.75 0 0 1-1.497-.124l.5-6a.75.75 0 0 1 .797-.672Zm2.84 0a.75.75 0 0 1 .796.672l.5 6a.75.75 0 0 1-1.496.124l-.5-6a.75.75 0 0 1 .7-.797Z" clipRule="evenodd" /></svg>
                            </button>
                          </div>

                          {/* Section customization */}
                          <div className="flex flex-wrap gap-x-4 gap-y-2 px-1">
                            {/* Layout toggle */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-neutral-500">Layout:</span>
                              {(['list', 'grid'] as const).map((layout) => (
                                <button
                                  key={layout}
                                  onClick={() => setProductSections((prev) => prev.map((s, i) => i === sIdx ? { ...s, layout } : s))}
                                  className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all ${
                                    (section.layout || 'list') === layout
                                      ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-400'
                                  }`}
                                >
                                  {layout === 'list' ? '☰ List' : '⊞ Grid'}
                                </button>
                              ))}
                            </div>

                            {/* Header size */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-neutral-500">Size:</span>
                              {(['sm', 'md', 'lg'] as const).map((size) => (
                                <button
                                  key={size}
                                  onClick={() => setProductSections((prev) => prev.map((s, i) => i === sIdx ? { ...s, headerSize: size } : s))}
                                  className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all ${
                                    (section.headerSize || 'sm') === size
                                      ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-400'
                                  }`}
                                >
                                  {size.toUpperCase()}
                                </button>
                              ))}
                            </div>

                            {/* Header color */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-neutral-500">Color:</span>
                              {[
                                { value: '', label: 'Default' },
                                { value: style.accentColor, label: 'Accent' },
                                { value: '#ffffff', label: '' },
                                { value: '#a3a3a3', label: '' },
                                { value: '#ef4444', label: '' },
                                { value: '#f97316', label: '' },
                                { value: '#22c55e', label: '' },
                                { value: '#3b82f6', label: '' },
                              ].map((opt, ci) => (
                                <button
                                  key={ci}
                                  onClick={() => setProductSections((prev) => prev.map((s, i) =>
                                    i === sIdx ? { ...s, headerColor: opt.value || undefined } : s
                                  ))}
                                  title={opt.label || opt.value}
                                  className={`w-5 h-5 rounded-full border transition-all ${
                                    (section.headerColor || '') === opt.value
                                      ? 'ring-2 ring-offset-1 ring-offset-neutral-900 ring-purple-500 scale-110'
                                      : 'hover:scale-105'
                                  }`}
                                  style={{
                                    backgroundColor: opt.value || 'transparent',
                                    borderColor: opt.value ? 'transparent' : undefined,
                                    ...(opt.value === '' ? { backgroundImage: 'linear-gradient(135deg, #a3a3a3 50%, #525252 50%)' } : {}),
                                  }}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Assigned products */}
                          {section.productSlugs.length > 0 && (
                            <div className="space-y-1.5">
                              {section.productSlugs.map((slug, pIdx) => {
                                const product = realProducts.find(p => p.slug === slug);
                                if (!product) return null;
                                return (
                                  <div key={slug} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/50">
                                    {product.imageUrl && (
                                      <img src={product.imageUrl} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />
                                    )}
                                    <span className="flex-1 text-xs text-neutral-700 dark:text-neutral-300 truncate">{product.name}</span>
                                    {/* Move up within section */}
                                    <button
                                      onClick={() => {
                                        if (pIdx === 0) return;
                                        setProductSections((prev) => prev.map((s, i) => {
                                          if (i !== sIdx) return s;
                                          const slugs = [...s.productSlugs];
                                          [slugs[pIdx - 1], slugs[pIdx]] = [slugs[pIdx], slugs[pIdx - 1]];
                                          return { ...s, productSlugs: slugs };
                                        }));
                                      }}
                                      disabled={pIdx === 0}
                                      className="text-neutral-400 hover:text-neutral-200 disabled:opacity-20 transition-colors"
                                    >
                                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z" clipRule="evenodd" /></svg>
                                    </button>
                                    {/* Move down within section */}
                                    <button
                                      onClick={() => {
                                        if (pIdx === section.productSlugs.length - 1) return;
                                        setProductSections((prev) => prev.map((s, i) => {
                                          if (i !== sIdx) return s;
                                          const slugs = [...s.productSlugs];
                                          [slugs[pIdx], slugs[pIdx + 1]] = [slugs[pIdx + 1], slugs[pIdx]];
                                          return { ...s, productSlugs: slugs };
                                        }));
                                      }}
                                      disabled={pIdx === section.productSlugs.length - 1}
                                      className="text-neutral-400 hover:text-neutral-200 disabled:opacity-20 transition-colors"
                                    >
                                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-4.25-4.25a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
                                    </button>
                                    {/* Remove from section */}
                                    <button
                                      onClick={() => {
                                        setProductSections((prev) => prev.map((s, i) =>
                                          i === sIdx ? { ...s, productSlugs: s.productSlugs.filter((_, j) => j !== pIdx) } : s
                                        ));
                                      }}
                                      className="text-red-400 hover:text-red-300 transition-colors"
                                      title="Remove from section"
                                    >
                                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Add product dropdown */}
                          {availableProducts.length > 0 && (
                            <select
                              value=""
                              onChange={(e) => {
                                if (!e.target.value) return;
                                setProductSections((prev) => prev.map((s, i) =>
                                  i === sIdx ? { ...s, productSlugs: [...s.productSlugs, e.target.value] } : s
                                ));
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-neutral-50 dark:bg-neutral-800/50 border border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                            >
                              <option value="">+ Add product to this section...</option>
                              {availableProducts.map((p) => (
                                <option key={p.slug} value={p.slug}>{p.name}</option>
                              ))}
                            </select>
                          )}

                          {section.productSlugs.length === 0 && availableProducts.length === 0 && (
                            <p className="text-[10px] text-neutral-400 text-center py-1">All products are assigned to other sections</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SECTION ORDER */}
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111113] p-5">
              <SectionLabel>Section Order</SectionLabel>
              <div className="space-y-2">
                {style.sectionOrder.map((section, i) => (
                  <SectionOrderItem
                    key={section}
                    section={section}
                    index={i}
                    total={style.sectionOrder.length}
                    onMoveUp={() => moveSection(i, i - 1)}
                    onMoveDown={() => moveSection(i, i + 1)}
                  />
                ))}
              </div>
              <p className="text-xs text-neutral-500 mt-2">Use arrows to reorder sections</p>
            </div>

            {/* Mobile save */}
            <div className="lg:hidden">
              <button
                onClick={handleSave}
                disabled={!isDirty}
                className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  saveStatus === 'saved' ? 'bg-green-600 text-white' : isDirty ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                }`}
              >
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? '✓ Saved!' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* ============================================ */}
          {/* RIGHT: LIVE PREVIEW (shared renderer)       */}
          {/* ============================================ */}
          <div className="flex-1 min-w-0">
            <div className="sticky top-20">
              {/* Preview header with mode toggle */}
              <div className="flex items-center justify-center gap-3 mb-3">
                <p className="text-xs font-medium text-neutral-500">Live Preview</p>
                <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5">
                  <button
                    onClick={() => setPreviewMode('desktop')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                      previewMode === 'desktop'
                        ? 'bg-white dark:bg-neutral-700 text-purple-600 dark:text-purple-400 shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                    }`}
                    title="Desktop preview"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 inline mr-1"><path fillRule="evenodd" d="M2 4.25A2.25 2.25 0 0 1 4.25 2h11.5A2.25 2.25 0 0 1 18 4.25v8.5A2.25 2.25 0 0 1 15.75 15H4.25A2.25 2.25 0 0 1 2 12.75v-8.5Zm2.25-.75a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h11.5a.75.75 0 0 0 .75-.75v-8.5a.75.75 0 0 0-.75-.75H4.25Z" clipRule="evenodd" /><path d="M5 18a1 1 0 0 1 1-1h8a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1Z" /></svg>
                    Desktop
                  </button>
                  <button
                    onClick={() => setPreviewMode('mobile')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                      previewMode === 'mobile'
                        ? 'bg-white dark:bg-neutral-700 text-purple-600 dark:text-purple-400 shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                    }`}
                    title="Mobile preview"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 inline mr-1"><path d="M8 16.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z" /><path fillRule="evenodd" d="M4 4.25A2.25 2.25 0 0 1 6.25 2h7.5A2.25 2.25 0 0 1 16 4.25v11.5A2.25 2.25 0 0 1 13.75 18h-7.5A2.25 2.25 0 0 1 4 15.75V4.25ZM6.25 3.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h7.5a.75.75 0 0 0 .75-.75V4.25a.75.75 0 0 0-.75-.75h-7.5Z" clipRule="evenodd" /></svg>
                    Mobile
                  </button>
                </div>
              </div>

              {/* Preview container */}
              <div className={`mx-auto transition-all duration-300 ${previewMode === 'mobile' ? 'max-w-[375px]' : ''}`}>
                <div
                  className={`overflow-y-auto overflow-x-hidden rounded-2xl ${previewMode === 'mobile' ? 'border-[6px] border-neutral-300 dark:border-neutral-700 rounded-[2rem]' : ''}`}
                  style={{ maxHeight: 'calc(100vh - 160px)' }}
                >
                  <div
                    className="origin-top-left"
                    style={previewMode === 'desktop'
                      ? { transform: 'scale(0.75)', width: '133.33%' }
                      : { transform: 'scale(1)', width: '100%' }
                    }
                  >
                    <CreatorPageRenderer
                      creator={rendererData}
                      products={realProducts}
                      style={style}
                      productOverrides={productOverrides}
                      productSections={productSections}
                      preview
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cover Image Picker Modal */}
      {showCoverPicker && (
        <CoverImagePickerModal
          onClose={() => setShowCoverPicker(false)}
          onSelectUrl={handleCoverSelectUrl}
          onUploadFile={handleCoverUploadFile}
        />
      )}

      {/* Unsaved Changes Modal */}
      <ConfirmModal
        isOpen={pendingNav !== null}
        title="Unsaved Changes"
        message="You have unsaved changes that will be lost. Are you sure you want to leave?"
        confirmText="Leave"
        cancelText="Stay"
        variant="warning"
        onConfirm={() => {
          const path = pendingNav!;
          setPendingNav(null);
          skipGuardRef.current = true;
          if (path === '__back__') {
            window.history.back();
          } else {
            navigate(path);
          }
        }}
        onCancel={() => setPendingNav(null)}
      />
    </div>
  );
}