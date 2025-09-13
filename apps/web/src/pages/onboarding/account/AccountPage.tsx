import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import Cropper from 'react-easy-crop';

/*
  ACCOUNT PROFILE SETUP (MVP) + AVATAR (Data URL)
  ------------------------------------------------
  • User picks an image → optional crop/zoom (1:1) → we downscale client-side
    to ~320×320 JPEG and save it as a Data URL in Firestore: users/{uid}.photoURL
  • No Firebase Storage is used (keeps MVP simple; no CORS/App Check headaches)
  • You can migrate to Storage later without changing the UI
*/

type Profile = {
  displayName?: string | null;
  supportEmail?: string | null;
  theme?: string | null;           // kept for compatibility; UI can be hidden
  notifyOnPurchase?: boolean;
  bio?: string | null;
  photoURL?: string | null;        // now stores a data: URL for MVP
  profileComplete?: boolean;
};

const THEMES = [
  { id: 'dark',     label: 'Dark (default)' },
  { id: 'midnight', label: 'Midnight Purple' },
  { id: 'ocean',    label: 'Ocean Blue' },
  { id: 'sunset',   label: 'Sunset Orange' },
  { id: 'forest',   label: 'Forest Green' },
  { id: 'system',   label: 'Match System' },
] as const;

export default function AccountPage() {
  const u = auth.currentUser;

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [theme, setTheme] = useState<string>('dark'); // can keep fixed
  const [notifyOnPurchase, setNotifyOnPurchase] = useState(true);
  const [bio, setBio] = useState('');

  // Avatar state
  const [photoURL, setPhotoURL] = useState<string | null>(null); // persisted value (data URL in MVP)
  const [file, setFile] = useState<File | null>(null);           // current picked/cropped file (unsaved)
  const [preview, setPreview] = useState<string | null>(null);   // local preview (blob URL)

  // File input ref so selecting the same file re-triggers onChange
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Cropper state
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState<{x: number; y: number}>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    width: number; height: number; x: number; y: number;
  } | null>(null);
  const [cropping, setCropping] = useState(false);

  //States to detect change
  const [originalValues, setOriginalValues] = useState<{
  displayName: string;
  supportEmail: string;
  theme: string;
  notifyOnPurchase: boolean;
  bio: string;
  photoURL: string | null;
}>({
  displayName: '',
  supportEmail: '',
  theme: 'dark',
  notifyOnPurchase: true,
  bio: '',
  photoURL: null
});

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Revoke object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // Update the useEffect that loads the profile 
useEffect(() => {
  (async () => {
    try {
      if (!u) return;
      const refUser = doc(db, 'users', u.uid);
      const snap = await getDoc(refUser);
      const data = (snap.exists() ? snap.data() : {}) as Profile;

      const loadedValues = {
        displayName: data.displayName || u.displayName || '',
        supportEmail: data.supportEmail || u.email || '',
        theme: data.theme || 'dark',
        notifyOnPurchase: typeof data.notifyOnPurchase === 'boolean' ? data.notifyOnPurchase : true,
        bio: data.bio || '',
        photoURL: data.photoURL || null
      };

      setDisplayName(loadedValues.displayName);
      setSupportEmail(loadedValues.supportEmail);
      setTheme(loadedValues.theme);
      setNotifyOnPurchase(loadedValues.notifyOnPurchase);
      setBio(loadedValues.bio);
      setPhotoURL(loadedValues.photoURL);
      
      setOriginalValues(loadedValues);  // Store original values
    } finally {
      setLoading(false);
    }
  })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [u?.uid]);

  // Pick file → validate → open cropper
  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;

    if (!f) {
      setFile(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (!f.type.startsWith('image/')) {
      setMsg('Please choose an image file.');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setMsg('Image must be under 5 MB.');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const url = URL.createObjectURL(f);
    setFile(f);
    setPreview(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setShowCropper(true);

    // Allow selecting the same file again next time
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Click avatar: open picker if none; otherwise open cropper to adjust
  function onClickAvatar() {
    if (!preview && !photoURL) {
      fileInputRef.current?.click();
      return;
    }
    const source = preview || photoURL!;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    if (!preview) setPreview(source);
    setShowCropper(true);
  }

  // Helper: load an image element
  const loadImage = (src: string | Blob): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      if (typeof src === 'string') {
        img.src = src;
      } else {
        img.src = URL.createObjectURL(src);
      }
    });

  // Helper: crop a source image according to pixelCrop and return a Blob (JPEG)
  const getCroppedBlob = useCallback(async (imageSrc: string, pixelCrop: { x: number; y: number; width: number; height: number; }): Promise<Blob> => {
    const image = await loadImage(imageSrc);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(pixelCrop.width));
    canvas.height = Math.max(1, Math.floor(pixelCrop.height));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');

    ctx.drawImage(
      image,
      pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
      0, 0, canvas.width, canvas.height
    );

    const blob: Blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b as Blob), 'image/jpeg', 0.92);
    });
    return blob;
  }, []);

  // Downscale any image Blob to a square data URL (JPEG) for storage in Firestore
  async function downscaleToDataURL(blob: Blob, size = 320, quality = 0.9): Promise<string> {
    const img = await loadImage(blob);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    // Fit-cover into square (center crop/letterbox safety)
    const scale = Math.max(size / img.width, size / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const dx = (size - drawW) / 2;
    const dy = (size - drawH) / 2;
    ctx.drawImage(img, dx, dy, drawW, drawH);
    return canvas.toDataURL('image/jpeg', quality);
  }

  // Confirm crop → create a new cropped File + local preview
  const finishCrop = useCallback(async () => {
    if (!preview || !croppedAreaPixels) return;
    try {
      setCropping(true);

      // 1) Crop to the selected area
      const croppedBlob = await getCroppedBlob(preview, croppedAreaPixels);

      // 2) Downscale to ~320x320 and convert to Data URL (for Firestore)
      // (We still keep a File locally so UI/validation logic can use it)
      const dataURL = await downscaleToDataURL(croppedBlob, 320, 0.9);

      // 3) Update local state: show preview from the downscaled image
      if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
      const nextFile = new File([croppedBlob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const nextPreview = URL.createObjectURL(nextFile);

      setFile(nextFile);
      setPreview(nextPreview);
      setPhotoURL(dataURL); // <-- immediate local reflect; this is what we'll save
      setShowCropper(false);
      setMsg(null);
    } catch (e) {
      setMsg('Could not crop image. Please try again.');
    } finally {
      setCropping(false);
    }
  }, [preview, croppedAreaPixels, getCroppedBlob]);

  const onCropComplete = useCallback((_area: any, areaPixels: any) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  // Save profile
  async function onSave() {
    if (!u) return;
    if (!displayName.trim()) {
      setMsg('Please enter your name.');
      return;
    }
    if (!THEMES.some(t => t.id === theme)) {
      setMsg('Please select a valid theme.');
      return;
    }
    if (showCropper || cropping) {
      setMsg('Finish adjusting your photo first.');
      return;
    }

    setSaving(true);
    setMsg(null);
    try {
      // For MVP, photoURL already holds the latest Data URL if the user cropped.
      // If user picked but didn't hit "Save" in the cropper, we can auto-downscale here as a fallback.
      let finalPhotoURL = photoURL || null;
      if (!finalPhotoURL && file) {
        // Downscale raw file if no crop step happened
        const fallbackDataURL = await downscaleToDataURL(file, 320, 0.9);
        finalPhotoURL = fallbackDataURL;
      }

      const refUser = doc(db, 'users', u.uid);
      await setDoc(refUser, {
        displayName: displayName.trim(),
        supportEmail: supportEmail.trim() || null,
        theme,
        notifyOnPurchase,
        bio: bio.trim() || null,
        photoURL: finalPhotoURL, // <-- Data URL stored in Firestore
        profileComplete: true,
        updatedAt: serverTimestamp(),
      } as Profile, { merge: true });

      // Optional: reflect in Firebase Auth profile too (may store a large string)
      try {
        await updateProfile(u, {
          displayName: displayName.trim(),
          photoURL: finalPhotoURL || undefined, // data: URL is accepted by Auth, but you can skip if you prefer
        });
      } catch { /* ignore */ }

      // Clean up local blob preview
      if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
      setPreview(null);
      setFile(null);
      setOriginalValues({
        displayName: displayName.trim(),
        supportEmail: supportEmail.trim() || '',
        theme,
        notifyOnPurchase,
        bio: bio.trim() || '',
        photoURL: finalPhotoURL || null
      });
      setMsg('Saved!');
    } catch (e: any) {
      console.error('[onSave] error:', e);
      setMsg('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = useMemo(() => {
  return (
    displayName !== originalValues.displayName ||
    supportEmail !== originalValues.supportEmail ||
    theme !== originalValues.theme ||
    notifyOnPurchase !== originalValues.notifyOnPurchase ||
    bio !== originalValues.bio ||
    photoURL !== originalValues.photoURL
  );
}, [displayName, supportEmail, theme, notifyOnPurchase, bio, photoURL, originalValues]);


  const themeSwatch = useMemo(() => {
    switch (theme) {
      case 'midnight': return 'linear-gradient(135deg,#2a174a,#3b2463)';
      case 'ocean':    return 'linear-gradient(135deg,#0b3d91,#1677c2)';
      case 'sunset':   return 'linear-gradient(135deg,#b25b2a,#ff7a59)';
      case 'forest':   return 'linear-gradient(135deg,#0f5032,#1e7a55)';
      case 'system':   return 'linear-gradient(135deg,#262626,#171717)';
      default:         return 'linear-gradient(135deg,#1f1f22,#0b0b0d)'; // dark
    }
  }, [theme]);

  const hasAnyPhoto = Boolean(preview || photoURL || file);

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-neutral-100 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <header className="rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 to-black p-6 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
          <h1 className="text-2xl font-semibold">Set up your profile</h1>
          <p className="mt-1 text-neutral-300">
            Make it yours. Your name, profile photo, and contact email appear on your product pages and emails.
          </p>
        </header>

        {/* Form */}
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6">
          {loading ? (
            <div className="text-neutral-400">Loading…</div>
          ) : (
            <>
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={onClickAvatar}
                  className="h-16 w-16 rounded-full border border-neutral-700 bg-neutral-950 overflow-hidden focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                  title={hasAnyPhoto ? 'Click to adjust' : undefined}
                >
                  {preview ? (
                    <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                  ) : photoURL ? (
                    <img src={photoURL} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-neutral-600 text-sm">No photo</div>
                  )}
                </button>

                <div className="flex items-center gap-3">
                  <label className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800 cursor-pointer">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={onPickFile}
                      className="hidden"
                    />
                    {hasAnyPhoto ? 'Replace Photo' : 'Choose Photo'}
                  </label>
                  {hasAnyPhoto && (
                    <button
                      type="button"
                      onClick={() => {
                        if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
                        setPhotoURL(null);
                        setPreview(null);
                        setFile(null);
                        setMsg(null);
                        setShowCropper(false);
                        setCropping(false);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-sm text-neutral-400 hover:text-neutral-200"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {/* Display name */}
                <div className="sm:col-span-2">
                  <label className="block text-sm text-neutral-300">
                    Your Name<span className="text-red-500"> *</span>
                  </label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your Full Name"
                    className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                  />
                </div>

                {/* Support email */}
                <div>
                  <label className="block text-sm text-neutral-300">Support Email</label>
                  <input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    placeholder="support@yourbrand.com"
                    className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                  />
                  <p className="mt-1 text-xs text-neutral-500">We’ll use this on receipts and notifications.</p>
                </div>

                {/* Theme (optional UI is commented out) */}
                {/* <div> ... your theme radios ... </div> */}

                {/* Notify on purchase */}
                {/* <div className="sm:col-span-2">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={notifyOnPurchase}
                      onChange={(e) => setNotifyOnPurchase(e.target.checked)}
                      className="h-4 w-4 rounded border-neutral-700 bg-neutral-950"
                    />
                    <span className="text-sm text-neutral-300">Email me when someone buys</span>
                  </label>
                </div> */}

                {/* Bio */}
                <div className="sm:col-span-2">
                  <label className="block text-sm text-neutral-300">Short Bio (optional)</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell customers who you are and what you offer."
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={onSave}
                  disabled={saving || showCropper || cropping || !hasChanges}
                  className={`rounded-lg px-3 py-2 text-sm font-medium text-white ${
                    hasChanges && !saving && !showCropper && !cropping
                      ? 'bg-indigo-600 hover:bg-indigo-500'
                      : 'bg-neutral-700 cursor-not-allowed'
                  } disabled:opacity-60`}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                {/* <Link
                  to="/onboarding/stripe"
                  className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
                >
                  Next: Connect Stripe →
                </Link> */}
                {/* <Link
                  to="/products/new"
                  className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
                >
                  Add first product
                </Link> */}
                <Link
                  to="/"
                  className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
                >
                  Go Back Home
                </Link> 
              </div>

              {msg && (
                <p className={`mt-3 text-sm ${msg === 'Saved!' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {msg}
                </p>
              )}
            </>
          )}
        </section>

      </div>

      {/* CROPPER MODAL */}
      {showCropper && (preview || photoURL) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="relative h-[320px] w-full rounded-2xl overflow-hidden border border-neutral-700 bg-neutral-900">
              <Cropper
                image={preview || photoURL!}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                objectFit="contain"
                restrictPosition={true}
              />
            </div>

            <div className="mt-4">
              <input
                aria-label="Zoom"
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
              <div className="mt-1 text-xs text-neutral-400">Zoom</div>
            </div>

            <div className="mt-5 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowCropper(false)}
                disabled={cropping}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={finishCrop}
                disabled={cropping}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {cropping ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
