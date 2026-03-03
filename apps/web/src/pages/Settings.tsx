// src/pages/Settings.tsx
// Phase 2.1 — Creator Profile Settings Page
// Features: profile editing, photo upload, username claiming, social links,
//           custom links, URL validation, account info, sign out, delete account

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, deleteDoc, onSnapshot, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { signOut, deleteUser, updateEmail } from 'firebase/auth';
import {
  validateUsername,
  checkUsernameAvailability,
  claimUsername,
  saveCreatorProfile,
  publishCreatorProfile,
  uploadProfilePhoto,
  deleteProfilePhoto,
} from '../lib/UserDocumentHelpers';
import type { CreatorProfile, SocialLinks, CustomLink } from '../lib/Usermodel';

// ============================================
// TYPES
// ============================================

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'current';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ============================================
// HELPERS
// ============================================

function isValidUrl(str: string): boolean {
  if (!str) return true; // Empty is OK
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// ============================================
// SOCIAL LINK CONFIG
// ============================================

const SOCIAL_PLATFORMS: { key: keyof SocialLinks; label: string; placeholder: string; icon: string }[] = [
  { key: 'website',   label: 'Website',     placeholder: 'https://yoursite.com',              icon: '🌐' },
  { key: 'youtube',   label: 'YouTube',     placeholder: 'https://youtube.com/@yourhandle',   icon: '▶️' },
  { key: 'instagram', label: 'Instagram',   placeholder: 'https://instagram.com/yourhandle',  icon: '📷' },
  { key: 'twitter',   label: 'X / Twitter', placeholder: 'https://x.com/yourhandle',          icon: '𝕏' },
  { key: 'tiktok',    label: 'TikTok',      placeholder: 'https://tiktok.com/@yourhandle',    icon: '♪' },
  { key: 'linkedin',  label: 'LinkedIn',    placeholder: 'https://linkedin.com/in/yourhandle', icon: 'in' },
];

const MAX_CUSTOM_LINKS = 10;

// ============================================
// COMPONENT
// ============================================

export default function Settings() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  // Profile form state
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [savedUsername, setSavedUsername] = useState('');
  const [bioShort, setBioShort] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    website: '', youtube: '', instagram: '', twitter: '', tiktok: '', linkedin: '',
  });
  const [customLinks, setCustomLinks] = useState<CustomLink[]>([]);

  // Snapshot of saved data (for dirty checking)
  const [savedState, setSavedState] = useState({
    displayName: '', bioShort: '', socialLinks: {} as SocialLinks, customLinks: [] as CustomLink[],
  });

  // Account info state
  const [email, setEmail] = useState('');
  const [isGoogleUser, setIsGoogleUser] = useState(true);
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [membershipTier, setMembershipTier] = useState('');
  const [stripeConnected, setStripeConnected] = useState(false);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState('');
  const [urlErrors, setUrlErrors] = useState<Record<string, string>>({});
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Photo upload state
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [cropZoom, setCropZoom] = useState(1);
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const cropImgRef = useRef<HTMLImageElement>(null);

  // Refs
  const usernameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bioRef = useRef<HTMLTextAreaElement>(null);

  // ============================================
  // DIRTY STATE TRACKING
  // ============================================

  const isDirty = useMemo(() => {
    if (username !== savedUsername) return true;
    if (displayName !== savedState.displayName) return true;
    if (bioShort !== savedState.bioShort) return true;
    for (const key of Object.keys(socialLinks) as (keyof SocialLinks)[]) {
      if (socialLinks[key] !== (savedState.socialLinks[key] || '')) return true;
    }
    if (JSON.stringify(customLinks) !== JSON.stringify(savedState.customLinks)) return true;
    return false;
  }, [username, savedUsername, displayName, bioShort, socialLinks, customLinks, savedState]);

  // Warn on browser tab close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Block in-app navigation when dirty
  const [pendingNavHref, setPendingNavHref] = useState<string | null>(null);

  useEffect(() => {
    if (!isDirty) return;
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('mailto:')) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingNavHref(href);
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [isDirty]);

  // ============================================
  // LOAD USER DATA
  // ============================================

  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (!snap.exists()) { setLoading(false); return; }

      const data = snap.data();
      const profile = data.profile || {};

      const dn = profile.displayName || data.displayName || '';
      const bio = profile.bioShort || '';
      const links: SocialLinks = {
        website:   profile.socialLinks?.website || '',
        youtube:   profile.socialLinks?.youtube || '',
        instagram: profile.socialLinks?.instagram || '',
        twitter:   profile.socialLinks?.twitter || '',
        tiktok:    profile.socialLinks?.tiktok || '',
        linkedin:  profile.socialLinks?.linkedin || '',
      };
      const cLinks: CustomLink[] = profile.customLinks || [];

      setDisplayName(dn);
      setUsername(profile.username || '');
      setSavedUsername(profile.username || '');
      setBioShort(bio);
      setPhotoURL(profile.photoURL || data.photoURL || user.photoURL || '');
      setSocialLinks(links);
      setCustomLinks(cLinks);
      setSavedState({ displayName: dn, bioShort: bio, socialLinks: links, customLinks: cLinks });

      setEmail(data.email || user.email || '');
      setMembershipTier(data.membershipTier || 'free-trial');
      setStripeConnected(data.stripeConnected || false);

      const googleProvider = user.providerData?.some((p: any) => p.providerId === 'google.com');
      setIsGoogleUser(!!googleProvider);

      if (profile.username) setUsernameStatus('current');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // ============================================
  // BIO AUTO-GROW
  // ============================================

  useEffect(() => {
    if (bioRef.current) {
      bioRef.current.style.height = 'auto';
      bioRef.current.style.height = bioRef.current.scrollHeight + 'px';
    }
  }, [bioShort]);

  // ============================================
  // PROFILE PHOTO UPLOAD WITH CROP
  // ============================================

  // Step 1: File selected → open crop modal
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate before opening modal
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setPhotoError('Please upload a JPG, PNG, GIF, or WebP image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image must be under 5MB');
      return;
    }

    setPhotoError('');
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setCropZoom(1);
      setCropPos({ x: 0, y: 0 });
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Step 2: Drag handlers for repositioning
  const handleCropMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - cropPos.x, y: e.clientY - cropPos.y });
  };

  const handleCropMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setCropPos({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleCropMouseUp = () => setIsDragging(false);

  // Touch handlers for mobile
  const handleCropTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - cropPos.x, y: touch.clientY - cropPos.y });
  };

  const handleCropTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setCropPos({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  // Step 3: Crop to circle-safe square and upload
  const handleCropSave = async () => {
    if (!user || !cropImgRef.current) return;

    setPhotoUploading(true);
    setPhotoError('');

    try {
      const img = cropImgRef.current;
      const canvas = document.createElement('canvas');
      const outputSize = 400; // Output 400x400
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;
      const viewSize = 192; // w-48 = 12rem = 192px

      // The image uses min-w-full min-h-full + absolute centering
      // Calculate how the browser displays it (cover behavior)
      const coverScale = Math.max(viewSize / imgW, viewSize / imgH);
      const dispW = imgW * coverScale * cropZoom;
      const dispH = imgH * coverScale * cropZoom;

      // Image center is at view center + crop offset
      const imgCenterX = viewSize / 2 + cropPos.x;
      const imgCenterY = viewSize / 2 + cropPos.y;

      // Top-left of displayed image in view coords
      const imgLeft = imgCenterX - dispW / 2;
      const imgTop = imgCenterY - dispH / 2;

      // Map visible view (0,0 → viewSize,viewSize) back to natural image pixels
      const srcX = (0 - imgLeft) / dispW * imgW;
      const srcY = (0 - imgTop) / dispH * imgH;
      const srcW = viewSize / dispW * imgW;
      const srcH = viewSize / dispH * imgH;

      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outputSize, outputSize);

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => b ? resolve(b) : reject(new Error('Failed to create image')),
          'image/jpeg',
          0.9
        );
      });

      const file = new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' });
      const newURL = await uploadProfilePhoto(user.uid, file);
      setPhotoURL(newURL);
      setCropModalOpen(false);
    } catch (error: any) {
      setPhotoError(error.message || 'Failed to upload photo');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handlePhotoRemove = async () => {
    if (!user) return;
    setPhotoUploading(true);
    setPhotoError('');
    try {
      await deleteProfilePhoto(user.uid);
      setPhotoURL(user.photoURL || '');
    } catch (error: any) {
      setPhotoError(error.message || 'Failed to remove photo');
    } finally {
      setPhotoUploading(false);
    }
  };

  const isCustomPhoto = photoURL.includes('firebasestorage.googleapis.com');

  // ============================================
  // USERNAME VALIDATION (debounced)
  // ============================================

  const generateSuggestions = useCallback((base: string): string[] => {
    const clean = base.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    if (!clean) return [];
    const parts = clean.split(/\s+/);
    const suggestions: string[] = [];
    if (parts.length >= 2) suggestions.push(parts.join('-'));
    suggestions.push(parts.join(''));
    const base1 = parts.length >= 2 ? parts.join('-') : parts.join('');
    suggestions.push(`${base1}-1`);
    suggestions.push(`${base1}-2`);
    return [...new Set(suggestions)].filter(s => s.length >= 3 && s.length <= 30).slice(0, 3);
  }, []);

  const handleUsernameChange = useCallback((value: string) => {
    const lowered = value.toLowerCase();
    setUsername(lowered);
    setUsernameSuggestions([]);

    if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current);

    if (lowered === savedUsername && savedUsername !== '') {
      setUsernameStatus('current'); setUsernameError(''); return;
    }
    if (!lowered) { setUsernameStatus('idle'); setUsernameError(''); return; }

    const validation = validateUsername(lowered);
    if (!validation.valid) {
      setUsernameStatus('invalid'); setUsernameError(validation.error || 'Invalid username'); return;
    }

    setUsernameStatus('checking');
    setUsernameError('');

    usernameTimerRef.current = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailability(lowered);
        if (available) {
          setUsernameStatus('available'); setUsernameError('');
        } else {
          setUsernameStatus('taken');
          setUsernameError('This username is already taken');
          setUsernameSuggestions(generateSuggestions(displayName));
        }
      } catch {
        setUsernameStatus('invalid'); setUsernameError('Could not check availability');
      }
    }, 500);
  }, [savedUsername, displayName, generateSuggestions]);

  useEffect(() => {
    return () => { if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current); };
  }, []);

  // ============================================
  // URL VALIDATION
  // ============================================

  const validateAllUrls = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate social links
    for (const { key, label } of SOCIAL_PLATFORMS) {
      if (socialLinks[key] && !isValidUrl(socialLinks[key])) {
        errors[`social_${key}`] = `${label}: Please enter a valid URL starting with https://`;
      }
    }

    // Validate custom links
    customLinks.forEach((link, i) => {
      if (link.url && !isValidUrl(link.url)) {
        errors[`custom_${i}`] = `"${link.label || 'Link ' + (i + 1)}": Please enter a valid URL`;
      }
      if (link.url && !link.label.trim()) {
        errors[`custom_label_${i}`] = `Link ${i + 1}: Label is required`;
      }
    });

    setUrlErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ============================================
  // CUSTOM LINKS HANDLERS
  // ============================================

  const addCustomLink = () => {
    if (customLinks.length >= MAX_CUSTOM_LINKS) return;
    setCustomLinks(prev => [...prev, {
      id: `cl_${Date.now()}`,
      label: '',
      url: '',
    }]);
  };

  const updateCustomLink = (id: string, field: 'label' | 'url', value: string) => {
    setCustomLinks(prev => prev.map(link =>
      link.id === id ? { ...link, [field]: value } : link
    ));
    // Clear error for this link when editing
    setUrlErrors(prev => {
      const next = { ...prev };
      const idx = customLinks.findIndex(l => l.id === id);
      delete next[`custom_${idx}`];
      delete next[`custom_label_${idx}`];
      return next;
    });
  };

  const removeCustomLink = (id: string) => {
    setCustomLinks(prev => prev.filter(link => link.id !== id));
  };

  // ============================================
  // SAVE PROFILE
  // ============================================

  const handleSave = async () => {
    if (!user) return;

    // Validate URLs before saving
    if (!validateAllUrls()) {
      setSaveStatus('error');
      setSaveError('Please fix the invalid URLs above');
      return;
    }

    setSaveStatus('saving');
    setSaveError('');

    try {
      // 1. If username changed, claim it
      if (username !== savedUsername && username !== '') {
        if (usernameStatus !== 'available') {
          setSaveError('Please choose an available username before saving.');
          setSaveStatus('error');
          return;
        }
        const result = await claimUsername(user.uid, username);
        if (!result.success) {
          setSaveError(result.error || 'Failed to claim username');
          setSaveStatus('error');
          return;
        }
        setSavedUsername(username);
        setUsernameStatus('current');
      }

      // 2. Filter out empty custom links
      const cleanedCustomLinks = customLinks.filter(l => l.url.trim() && l.label.trim());

      // 3. Save profile
      await saveCreatorProfile(user.uid, {
        displayName,
        bioShort,
        photoURL,
        socialLinks,
        customLinks: cleanedCustomLinks,
      });

      // 4. Publish to public_profiles
      if (username || savedUsername) {
        try { await publishCreatorProfile(user.uid); }
        catch (e) { console.warn('Public profile publish failed:', e); }
      }

      // 5. Update saved state
      setSavedState({
        displayName, bioShort,
        socialLinks: { ...socialLinks },
        customLinks: cleanedCustomLinks,
      });
      setCustomLinks(cleanedCustomLinks);

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error: any) {
      console.error('Failed to save profile:', error);
      setSaveError(error.message || 'Something went wrong');
      setSaveStatus('error');
    }
  };

  // ============================================
  // SIGN OUT
  // ============================================

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut(auth);
      navigate('/auth/signin');
    } catch (error) {
      console.error('Sign out failed:', error);
      setSigningOut(false);
    }
  };

  // ============================================
  // UPDATE EMAIL
  // ============================================

  const handleEmailUpdate = async () => {
    if (!user || !newEmail.trim()) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      setEmailError('Please enter a valid email address'); return;
    }

    setEmailSaving(true);
    setEmailError('');
    try {
      await updateEmail(user, newEmail.trim());
      const { updateDoc: ud } = await import('firebase/firestore');
      await ud(doc(db, 'users', user.uid), { email: newEmail.trim() });
      setEmail(newEmail.trim());
      setEditingEmail(false);
      setNewEmail('');
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        setEmailError('For security, please sign out, sign back in, and try again.');
      } else if (error.code === 'auth/email-already-in-use') {
        setEmailError('This email is already in use by another account.');
      } else {
        setEmailError(error.message || 'Failed to update email');
      }
    } finally {
      setEmailSaving(false);
    }
  };

  // ============================================
  // DELETE ACCOUNT
  // ============================================

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      try {
        const pagesQuery = query(collection(db, 'published_pages'), where('userId', '==', user.uid));
        const pagesSnap = await getDocs(pagesQuery);
        if (!pagesSnap.empty) {
          const batch = writeBatch(db);
          pagesSnap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (e) { console.warn(e); }

      try {
        const slugsQuery = query(collection(db, 'slugs'), where('userId', '==', user.uid));
        const slugsSnap = await getDocs(slugsQuery);
        if (!slugsSnap.empty) {
          const batch = writeBatch(db);
          slugsSnap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (e) { console.warn(e); }

      if (savedUsername) {
        try { await deleteDoc(doc(db, 'usernames', savedUsername)); } catch (e) { console.warn(e); }
        try { await deleteDoc(doc(db, 'public_profiles', savedUsername)); } catch (e) { console.warn(e); }
      }

      try { await deleteDoc(doc(db, 'users', user.uid)); } catch (e) { console.warn(e); }
      await deleteUser(user);
      navigate('/auth/signin');
    } catch (error: any) {
      setDeleting(false);
      setShowDeleteModal(false);
      if (error.code === 'auth/requires-recent-login') {
        alert('For security, please sign out, sign back in, and try again.');
      }
    }
  };

  // ============================================
  // COMPUTED
  // ============================================

  const canSave =
    saveStatus !== 'saving' &&
    isDirty &&
    displayName.trim() !== '' &&
    (usernameStatus === 'available' || usernameStatus === 'current' || username === '');

  const tierLabels: Record<string, string> = {
    'founding-beta': 'Founding Beta',
    'founding-member': 'Founding Member',
    'regular': 'Regular',
    'admin': 'Admin',
    'free-trial': 'Free',
  };

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">

      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Settings</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Manage your creator profile and account
        </p>
      </div>

      {/* ============================================ */}
      {/* CREATOR PROFILE SECTION */}
      {/* ============================================ */}
      <section className="rounded-xl border border-neutral-200 dark:border-purple-500/20 bg-white dark:bg-[#111113] p-6 space-y-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Creator Profile</h2>

        {/* Profile Photo */}
        <div className="flex items-center gap-4">
          {photoURL ? (
            <img
              src={photoURL}
              alt="Profile"
              className="w-16 h-16 rounded-full object-cover border-2 border-purple-500/30"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-xl font-bold">
              {displayName?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-200">Profile Photo</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={photoUploading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-50"
              >
                {photoUploading ? 'Uploading...' : 'Upload Photo'}
              </button>
              {isCustomPhoto && (
                <button
                  onClick={handlePhotoRemove}
                  disabled={photoUploading}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            {photoError && <p className="text-xs text-red-400">{photoError}</p>}
            <p className="text-xs text-neutral-500">JPG, PNG, GIF, or WebP. Max 5MB.</p>
          </div>
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            maxLength={50}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0B0B0D] text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-colors"
          />
        </div>

        {/* Username */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            Username
            <span className="ml-2 text-xs font-normal text-neutral-400">3–30 characters</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder="yourname"
              maxLength={30}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0B0B0D] text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-colors pr-10"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {usernameStatus === 'checking' && <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />}
              {usernameStatus === 'available' && <span className="text-green-500 text-sm font-bold">✓</span>}
              {usernameStatus === 'taken' && <span className="text-red-500 text-sm font-bold">✗</span>}
              {usernameStatus === 'invalid' && <span className="text-red-500 text-sm font-bold">!</span>}
              {usernameStatus === 'current' && <span className="text-purple-400 text-sm font-bold">✓</span>}
            </div>
          </div>
          <div className="mt-1 space-y-1">
            {usernameError && <p className="text-xs text-red-400">{usernameError}</p>}
            {usernameStatus === 'available' && <p className="text-xs text-green-400">Username is available!</p>}
            {usernameStatus === 'current' && <p className="text-xs text-purple-400">This is your current username</p>}
            {usernameStatus === 'taken' && usernameSuggestions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="text-xs text-neutral-500">Try:</span>
                {usernameSuggestions.map((s) => (
                  <button key={s} onClick={() => handleUsernameChange(s)}
                    className="text-xs px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors">{s}</button>
                ))}
              </div>
            )}
            {usernameStatus === 'idle' && !username && (
              <p className="text-xs text-neutral-500">Lowercase letters, numbers, and hyphens only</p>
            )}
          </div>
          {username && usernameStatus !== 'invalid' && (
            <p className="text-xs text-neutral-500 mt-1.5">
              Your creator page: <span className="text-purple-400">{window.location.origin}/creator/{username}</span>
            </p>
          )}
        </div>

        {/* Short Bio */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            Bio
            <span className="ml-2 text-xs font-normal text-neutral-400">Max 160 characters</span>
          </label>
          <textarea
            ref={bioRef}
            value={bioShort}
            onChange={(e) => setBioShort(e.target.value.slice(0, 160))}
            placeholder="A short intro about you and what you do..."
            rows={2}
            maxLength={160}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0B0B0D] text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-colors resize-none overflow-hidden"
          />
          <p className="text-xs text-neutral-500 text-right mt-1">{bioShort.length}/160</p>
        </div>

        {/* Social Links */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
            Social Links
          </label>
          <div className="space-y-3">
            {SOCIAL_PLATFORMS.map(({ key, label, placeholder, icon }) => (
              <div key={key}>
                <div className="flex items-center gap-2">
                  <span className="w-8 text-center text-sm flex-shrink-0 select-none" title={label}>{icon}</span>
                  <input
                    type="url"
                    value={socialLinks[key]}
                    onChange={(e) => {
                      setSocialLinks(prev => ({ ...prev, [key]: e.target.value }));
                      setUrlErrors(prev => { const n = { ...prev }; delete n[`social_${key}`]; return n; });
                    }}
                    placeholder={placeholder}
                    className={`flex-1 px-3 py-2 rounded-lg border bg-white dark:bg-[#0B0B0D] text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-colors text-sm ${
                      urlErrors[`social_${key}`] ? 'border-red-500/50' : 'border-neutral-300 dark:border-neutral-700 focus:border-purple-500'
                    }`}
                  />
                </div>
                {urlErrors[`social_${key}`] && (
                  <p className="text-xs text-red-400 mt-1 ml-10">{urlErrors[`social_${key}`]}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Custom Links */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Custom Links
              <span className="ml-2 text-xs font-normal text-neutral-400">{customLinks.length}/{MAX_CUSTOM_LINKS}</span>
            </label>
            {customLinks.length < MAX_CUSTOM_LINKS && (
              <button
                onClick={addCustomLink}
                className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors font-medium"
              >
                + Add Link
              </button>
            )}
          </div>

          {customLinks.length === 0 ? (
            <p className="text-xs text-neutral-500">
              Add links to anything — your podcast, free guide, booking page, etc.
            </p>
          ) : (
            <div className="space-y-3">
              {customLinks.map((link, i) => (
                <div key={link.id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-8 text-center text-sm flex-shrink-0 text-neutral-400">🔗</span>
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => updateCustomLink(link.id, 'label', e.target.value)}
                      placeholder="Label (e.g. My Podcast)"
                      maxLength={50}
                      className={`w-40 flex-shrink-0 px-3 py-2 rounded-lg border bg-white dark:bg-[#0B0B0D] text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-colors text-sm ${
                        urlErrors[`custom_label_${i}`] ? 'border-red-500/50' : 'border-neutral-300 dark:border-neutral-700 focus:border-purple-500'
                      }`}
                    />
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => updateCustomLink(link.id, 'url', e.target.value)}
                      placeholder="https://..."
                      className={`flex-1 px-3 py-2 rounded-lg border bg-white dark:bg-[#0B0B0D] text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-colors text-sm ${
                        urlErrors[`custom_${i}`] ? 'border-red-500/50' : 'border-neutral-300 dark:border-neutral-700 focus:border-purple-500'
                      }`}
                    />
                    <button
                      onClick={() => removeCustomLink(link.id)}
                      className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Remove link"
                    >
                      ✕
                    </button>
                  </div>
                  {(urlErrors[`custom_${i}`] || urlErrors[`custom_label_${i}`]) && (
                    <p className="text-xs text-red-400 ml-10">
                      {urlErrors[`custom_label_${i}`] || urlErrors[`custom_${i}`]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${
              saveStatus === 'saved'
                ? 'bg-green-600 text-white'
                : canSave
                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-500/20'
                  : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 cursor-not-allowed'
            }`}
          >
            {saveStatus === 'saving' ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            ) : saveStatus === 'saved' ? '✓ Saved!' : 'Save Profile'}
          </button>

          {saveStatus === 'error' && <span className="text-sm text-red-400">{saveError}</span>}
          {isDirty && saveStatus === 'idle' && <span className="text-xs text-amber-400">Unsaved changes</span>}
        </div>
      </section>

      {/* ============================================ */}
      {/* CUSTOMIZE CREATOR PAGE LINK */}
      {/* ============================================ */}
      <button
        onClick={() => navigate('/settings/customize')}
        className="w-full rounded-xl border border-neutral-200 dark:border-purple-500/20 bg-white dark:bg-[#111113] p-5 flex items-center justify-between group hover:border-purple-500/40 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">Customize Creator Page</p>
            <p className="text-xs text-neutral-500">Colors, layout, and background style</p>
          </div>
        </div>
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-neutral-400 group-hover:text-purple-400 transition-colors">
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02z" clipRule="evenodd" />
        </svg>
      </button>

      {/* ============================================ */}
      {/* ACCOUNT SECTION */}
      {/* ============================================ */}
      <section className="rounded-xl border border-neutral-200 dark:border-purple-500/20 bg-white dark:bg-[#111113] p-6 space-y-4">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Account</h2>

        {/* Email */}
        <div className="py-2">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Email</p>
              {!editingEmail ? (
                <>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{email}</p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-0.5">
                    {isGoogleUser ? 'Managed by your Google account' : 'Email & password account'}
                  </p>
                </>
              ) : (
                <div className="mt-1.5 space-y-2">
                  <input type="email" value={newEmail}
                    onChange={(e) => { setNewEmail(e.target.value); setEmailError(''); }}
                    placeholder="New email address"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0B0B0D] text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-colors text-sm"
                  />
                  {emailError && <p className="text-xs text-red-400">{emailError}</p>}
                  <div className="flex items-center gap-2">
                    <button onClick={handleEmailUpdate} disabled={emailSaving || !newEmail.trim()}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-50">
                      {emailSaving ? 'Updating...' : 'Update Email'}
                    </button>
                    <button onClick={() => { setEditingEmail(false); setNewEmail(''); setEmailError(''); }}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            {!isGoogleUser && !editingEmail && (
              <button onClick={() => { setEditingEmail(true); setNewEmail(email); }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                Change
              </button>
            )}
          </div>
        </div>

        {/* Membership Tier */}
        <div className="flex items-center justify-between py-2 border-t border-neutral-100 dark:border-neutral-800">
          <div>
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Plan</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{tierLabels[membershipTier] || membershipTier}</p>
          </div>
          {(membershipTier === 'founding-beta' || membershipTier === 'founding-member') && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">Founding</span>
          )}
        </div>

        {/* Stripe */}
        <div className="flex items-center justify-between py-2 border-t border-neutral-100 dark:border-neutral-800">
          <div>
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Stripe Payments</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {stripeConnected ? 'Connected — you can accept payments' : 'Not connected'}
            </p>
          </div>
          {stripeConnected ? (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Connected</span>
          ) : (
            <button onClick={() => navigate('/onboarding/stripe')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors">Connect</button>
          )}
        </div>
      </section>

      {/* ============================================ */}
      {/* LEGAL */}
      {/* ============================================ */}
      <section className="rounded-xl border border-neutral-200 dark:border-purple-500/20 bg-white dark:bg-[#111113] p-6 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white tracking-wide uppercase">Legal</h2>
        <div className="flex items-center gap-4">
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 transition-colors underline underline-offset-2"
          >
            Terms of Service
          </a>
          <span className="text-neutral-300 dark:text-neutral-700">|</span>
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 transition-colors underline underline-offset-2"
          >
            Privacy Policy
          </a>
        </div>
      </section>

      {/* ============================================ */}
      {/* DANGER ZONE */}
      {/* ============================================ */}
      <section className="rounded-xl border border-neutral-200 dark:border-red-500/10 bg-white dark:bg-[#111113] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Sign Out</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500">You can always sign back in with Google</p>
          </div>
          <button onClick={() => setShowSignOutConfirm(true)}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            Sign Out
          </button>
        </div>
        <div className="border-t border-neutral-100 dark:border-neutral-800" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Delete Account</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500">Permanently delete your account and all data</p>
          </div>
          <button onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">
            Delete Account
          </button>
        </div>
      </section>

      {/* ============================================ */}
      {/* PHOTO CROP MODAL */}
      {/* ============================================ */}
      {cropModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !photoUploading && setCropModalOpen(false)} />
          <div className="relative bg-white dark:bg-[#111113] rounded-xl border border-purple-500/20 shadow-2xl max-w-lg w-full p-6 space-y-5">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Adjust Photo</h3>

            {/* Crop area */}
            <div className="flex flex-col items-center gap-4">
              {/* Preview container */}
              <div className="flex items-center gap-6">
                {/* Circle preview (what it looks like on the profile) */}
                <div className="text-center space-y-2">
                  <div
                    className="w-48 h-48 rounded-full overflow-hidden border-2 border-purple-500/30 cursor-grab active:cursor-grabbing select-none relative"
                    onMouseDown={handleCropMouseDown}
                    onMouseMove={handleCropMouseMove}
                    onMouseUp={handleCropMouseUp}
                    onMouseLeave={handleCropMouseUp}
                    onTouchStart={handleCropTouchStart}
                    onTouchMove={handleCropTouchMove}
                    onTouchEnd={() => setIsDragging(false)}
                  >
                    <img
                      ref={cropImgRef}
                      src={cropImageSrc}
                      alt="Crop preview"
                      draggable={false}
                      crossOrigin="anonymous"
                      className="absolute min-w-full min-h-full pointer-events-none"
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: `translate(-50%, -50%) scale(${cropZoom}) translate(${cropPos.x / cropZoom}px, ${cropPos.y / cropZoom}px)`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-neutral-500">Circle preview</p>
                </div>

                {/* Square preview (full image crop) */}
                <div className="text-center space-y-2">
                  <div
                    className="w-48 h-48 rounded-lg overflow-hidden border border-neutral-300 dark:border-neutral-700 cursor-grab active:cursor-grabbing select-none relative"
                    onMouseDown={handleCropMouseDown}
                    onMouseMove={handleCropMouseMove}
                    onMouseUp={handleCropMouseUp}
                    onMouseLeave={handleCropMouseUp}
                    onTouchStart={handleCropTouchStart}
                    onTouchMove={handleCropTouchMove}
                    onTouchEnd={() => setIsDragging(false)}
                  >
                    <img
                      src={cropImageSrc}
                      alt="Square preview"
                      draggable={false}
                      className="absolute min-w-full min-h-full pointer-events-none"
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: `translate(-50%, -50%) scale(${cropZoom}) translate(${cropPos.x / cropZoom}px, ${cropPos.y / cropZoom}px)`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-neutral-500">Square preview</p>
                </div>
              </div>

              {/* Drag hint */}
              <p className="text-xs text-neutral-400">Drag the image to reposition</p>

              {/* Zoom slider */}
              <div className="w-full max-w-xs flex items-center gap-3">
                <span className="text-xs text-neutral-500">−</span>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={cropZoom}
                  onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-purple-500"
                />
                <span className="text-xs text-neutral-500">+</span>
              </div>
              <p className="text-xs text-neutral-500">Zoom: {Math.round(cropZoom * 100)}%</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleCropSave}
                disabled={photoUploading}
                className="px-5 py-2.5 text-sm font-medium rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-50"
              >
                {photoUploading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Uploading...
                  </span>
                ) : (
                  'Save Photo'
                )}
              </button>
              <button
                onClick={() => setCropModalOpen(false)}
                disabled={photoUploading}
                className="px-5 py-2.5 text-sm font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>

            {photoError && <p className="text-xs text-red-400">{photoError}</p>}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MODALS */}
      {/* ============================================ */}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !deleting && setShowDeleteModal(false)} />
          <div className="relative bg-white dark:bg-[#111113] rounded-xl border border-red-500/20 shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Delete Account</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Are you sure? This cannot be undone. Your profile, products, published pages, and all associated data will be permanently deleted.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button onClick={handleDeleteAccount} disabled={deleting}
                className="px-5 py-2.5 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50">
                {deleting ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Deleting...</span> : 'Yes, Delete My Account'}
              </button>
              <button onClick={() => setShowDeleteModal(false)} disabled={deleting}
                className="px-5 py-2.5 text-sm font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign Out Modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !signingOut && setShowSignOutConfirm(false)} />
          <div className="relative bg-white dark:bg-[#111113] rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Sign Out</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Are you sure you want to sign out?</p>
            <div className="flex items-center gap-3 pt-2">
              <button onClick={handleSignOut} disabled={signingOut}
                className="px-5 py-2.5 text-sm font-medium rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white transition-colors disabled:opacity-50">
                {signingOut ? 'Signing out...' : 'Yes, Sign Out'}
              </button>
              <button onClick={() => setShowSignOutConfirm(false)} disabled={signingOut}
                className="px-5 py-2.5 text-sm font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Modal */}
      {pendingNavHref && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-[#111113] rounded-xl border border-amber-500/20 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Unsaved Changes</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button onClick={() => { const href = pendingNavHref; setPendingNavHref(null); navigate(href); }}
                className="px-5 py-2.5 text-sm font-medium rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors">
                Leave Without Saving
              </button>
              <button onClick={() => setPendingNavHref(null)}
                className="px-5 py-2.5 text-sm font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                Stay on Page
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}