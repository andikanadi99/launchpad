import { useState } from 'react';
import { DeliveryData } from './DeliveryBuilder';
import { auth, storage } from '../../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import {
  ExternalLink, AlertCircle, Check, Palette, Image,
  Loader, Eye, EyeOff, Monitor, Smartphone, ArrowLeft,
  ChevronRight, Maximize2, X
} from 'lucide-react';

interface DeliveryStepRedirectProps {
  data: DeliveryData;
  updateRedirect: (updates: Partial<DeliveryData['redirect']>) => void;
  updateDesign: (updates: Partial<DeliveryData['design']>) => void;
  productName: string;
  productId: string;
  onBack: () => void;
  onNext: () => void;
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    const parts = parsed.hostname.split('.');
    return parts.length >= 2 && parts[parts.length - 1].length >= 2;
  } catch {
    return false;
  }
}

export default function DeliveryStepRedirect({
  data, updateRedirect, updateDesign, productName, productId, onBack, onNext
}: DeliveryStepRedirectProps) {
  const [touched, setTouched] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [pendingTheme, setPendingTheme] = useState<'light' | 'dark' | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [showFullPreview, setShowFullPreview] = useState(false);

  const url = data.redirect.url;
  const showError = touched && url.length > 0 && !isValidUrl(url);
  const showEmpty = touched && url.length === 0;
  const canProceed = isValidUrl(url);

  // ==========================================
  // DESIGN HELPERS
  // ==========================================
  const designExt = data.design as any;
  const accent = data.design.accentColor || '#4f46e5';
  const bgColor = data.design.backgroundColor || '#ffffff';

  const isDarkBackground = (color: string): boolean => {
    const hex = color.replace('#', '');
    if (hex.length !== 6) return false;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
  };

  const dark = isDarkBackground(bgColor);
  const textColor = dark ? '#f5f5f5' : '#111827';
  const subtextColor = dark ? '#a3a3a3' : '#6b7280';
  const borderColor = dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb';
  const fontFamily: string = designExt.fontFamily || 'system-ui, sans-serif';

  const headingSize: string = designExt.headingSize || '28px';
  const headingColor: string = designExt.headingColor || textColor;
  const headingAlign: string = designExt.headingAlign || 'center';
  const stextSize: string = designExt.stextSize || '16px';
  const stextColor: string = designExt.stextColor || subtextColor;
  const stextAlign: string = designExt.stextAlign || 'center';

  const logoSize: string = designExt.logoSize || 'md';
  const logoShape: string = designExt.logoShape || 'rounded';
  const logoBorder: string = designExt.logoBorder || 'none';
  const redirectButtonText: string = designExt.redirectButtonText || 'Access Your Purchase';

  const logoSizeMap: Record<string, string> = { sm: 'h-8', md: 'h-14', lg: 'h-20' };
  const logoSizeMapCompact: Record<string, string> = { sm: 'h-6', md: 'h-10', lg: 'h-14' };
  const logoShapeClass = (full: boolean) => {
    const base = logoShape === 'circle' ? 'rounded-full' : logoShape === 'rounded' ? (full ? 'rounded-xl' : 'rounded-lg') : 'rounded-none';
    const border = logoBorder === 'subtle' ? `border ${dark ? 'border-white/10' : 'border-black/10'}` : logoBorder === 'shadow' ? 'shadow-lg' : '';
    return `${base} ${border}`;
  };

  const resolveText = (text: string) =>
    text.replace(/\{\{product_name\}\}/g, productName || 'Your Product');

  const updateDesignExt = (updates: Record<string, any>) => {
    updateDesign(updates as any);
  };

  // ==========================================
  // THEME PRESETS
  // ==========================================
  const applyThemePreset = (theme: 'light' | 'dark') => {
    if (theme === 'light') {
      updateDesign({ backgroundColor: '#ffffff', accentColor: '#4f46e5' });
      updateDesignExt({ headingColor: '#111827', stextColor: '#6b7280' });
    } else {
      updateDesign({ backgroundColor: '#1a1a2e', accentColor: '#6366f1' });
      updateDesignExt({ headingColor: '#f5f5f5', stextColor: '#a3a3a3' });
    }
    setPendingTheme(null);
  };

  // ==========================================
  // LOGO UPLOAD
  // ==========================================
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, SVG)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo must be under 2MB');
      return;
    }

    setUploadingLogo(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('Not authenticated');

      const timestamp = Date.now();
      const fileName = `logo_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `users/${userId}/delivery-assets/${productId}/${fileName}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        () => {},
        (error) => {
          console.error('Logo upload error:', error);
          alert('Failed to upload logo');
          setUploadingLogo(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          updateDesign({ logoUrl: downloadURL });
          setUploadingLogo(false);
        }
      );
    } catch (error) {
      console.error('Logo upload error:', error);
      alert('Failed to upload logo');
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (data.design.logoUrl) {
      try {
        const storageRef = ref(storage, data.design.logoUrl);
        await deleteObject(storageRef);
      } catch (error) {
        console.error('Error deleting logo from storage:', error);
      }
      updateDesign({ logoUrl: '' });
    }
  };

  // ==========================================
  // TEXT STYLE BAR
  // ==========================================
  const TextStyleBar = ({
    prefix, size, color, align, sizes
  }: {
    prefix: string;
    size: string;
    color: string;
    align: string;
    sizes: { value: string; label: string }[];
  }) => (
    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
      <div className="flex items-center gap-0.5">
        {sizes.map(s => (
          <button
            key={s.value}
            onClick={() => updateDesignExt({ [`${prefix}Size`]: s.value })}
            className={`w-6 h-6 rounded text-[9px] font-medium transition-all ${
              size === s.value
                ? 'bg-indigo-600 text-white'
                : 'bg-neutral-800 text-neutral-500 hover:text-neutral-300 border border-neutral-700'
            }`}
          >
            {s.label}
          </button>
        ))}
        <input
          type="number" min="10" max="60"
          value={parseInt(size)}
          onChange={(e) => e.target.value && updateDesignExt({ [`${prefix}Size`]: `${e.target.value}px` })}
          className="w-10 h-6 px-1 bg-neutral-800 border border-neutral-700 rounded text-[9px] text-white text-center focus:border-indigo-500 focus:outline-none"
        />
      </div>
      <div className="w-px h-4 bg-neutral-700" />
      <div className="flex items-center gap-0.5">
        {['#ffffff', '#000000', '#6b7280', '#111827', '#f5f5f5'].map(c => (
          <button
            key={c}
            onClick={() => updateDesignExt({ [`${prefix}Color`]: c })}
            className={`w-5 h-5 rounded border transition-all ${
              color === c ? 'border-indigo-500 scale-110' : 'border-neutral-600 hover:border-neutral-500'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
        <input
          type="color" value={color}
          onChange={(e) => updateDesignExt({ [`${prefix}Color`]: e.target.value })}
          className="w-5 h-5 rounded cursor-pointer border border-dashed border-neutral-600 bg-transparent ml-0.5"
        />
      </div>
      <div className="w-px h-4 bg-neutral-700" />
      <div className="flex items-center gap-0.5">
        {(['left', 'center', 'right'] as const).map(a => (
          <button
            key={a}
            onClick={() => updateDesignExt({ [`${prefix}Align`]: a })}
            className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
              align === a
                ? 'bg-indigo-600 text-white'
                : 'bg-neutral-800 text-neutral-500 hover:text-neutral-300 border border-neutral-700'
            }`}
          >
            {a === 'left' && <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor"><rect x="0" y="1" width="12" height="1.5" rx="0.5"/><rect x="0" y="5" width="8" height="1.5" rx="0.5"/><rect x="0" y="9" width="10" height="1.5" rx="0.5"/></svg>}
            {a === 'center' && <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor"><rect x="0" y="1" width="12" height="1.5" rx="0.5"/><rect x="2" y="5" width="8" height="1.5" rx="0.5"/><rect x="1" y="9" width="10" height="1.5" rx="0.5"/></svg>}
            {a === 'right' && <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor"><rect x="0" y="1" width="12" height="1.5" rx="0.5"/><rect x="4" y="5" width="8" height="1.5" rx="0.5"/><rect x="2" y="9" width="10" height="1.5" rx="0.5"/></svg>}
          </button>
        ))}
      </div>
    </div>
  );

  // ==========================================
  // LIVE PREVIEW
  // ==========================================
  const LivePreview = ({ fullSize = false }: { fullSize?: boolean }) => (
     <div
      className={`overflow-hidden ${
        fullSize ? '' : 'rounded-xl border border-neutral-700 h-full'
      } ${!fullSize && previewDevice === 'mobile' ? 'max-w-[375px] mx-auto' : ''}`}
      style={{ backgroundColor: fullSize ? 'transparent' : bgColor, fontFamily }}
    >
      <div className={`flex flex-col items-center justify-center ${
        fullSize ? 'px-8 py-10 max-w-lg mx-auto' : 'px-5 py-6 h-full'
      } text-center`}>
        {/* Logo */}
        {data.design.logoUrl && (
          <img
            src={data.design.logoUrl}
            alt="Logo"
            className={`object-contain mx-auto overflow-hidden ${
              fullSize ? `${logoSizeMap[logoSize]} mb-6` : `${logoSizeMapCompact[logoSize]} mb-4`
            } ${logoShapeClass(fullSize)}`}
          />
        )}

        {/* Checkmark */}
        <div
          className={`rounded-full flex items-center justify-center mx-auto ${
            fullSize ? 'w-16 h-16 mb-4' : 'w-12 h-12 mb-3'
          }`}
          style={{ backgroundColor: accent + '20' }}
        >
          <Check className={fullSize ? 'w-8 h-8' : 'w-6 h-6'} style={{ color: accent }} />
        </div>

        {/* Heading */}
        <h3
          className="font-bold"
          style={{
            color: headingColor,
            fontSize: fullSize ? headingSize : `${Math.max(Math.round(parseInt(headingSize) * 0.75), 16)}px`,
            marginBottom: fullSize ? '8px' : '6px',
            lineHeight: 1.2,
            textAlign: headingAlign as any
          }}
        >
          {data.design.headingText || 'Thank you for your purchase!'}
        </h3>

        {/* Subtext */}
        <p style={{
          color: stextColor,
          fontSize: fullSize ? stextSize : `${Math.max(Math.round(parseInt(stextSize) * 0.75), 12)}px`,
          textAlign: stextAlign as any
        }}>
          {resolveText(data.design.subText || "Here's your access to {{product_name}}")}
        </p>

        {/* CTA Button */}
        <div className={fullSize ? 'mt-8' : 'mt-5'}>
          <span
            className={`inline-flex items-center gap-2 text-white font-semibold cursor-pointer ${
              fullSize ? 'px-8 py-3 rounded-lg text-base' : 'px-6 py-2.5 rounded-lg text-sm'
            }`}
            style={{ backgroundColor: accent }}
          >
            {redirectButtonText || 'Access Your Purchase'}
            <ExternalLink className={fullSize ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
          </span>
        </div>

        {/* Footer */}
        <div
          className={`w-full ${fullSize ? 'mt-12 pt-6' : 'mt-8 pt-4'}`}
          style={{ borderTop: `1px solid ${borderColor}` }}
        >
          <p className={fullSize ? 'text-xs' : 'text-[10px]'} style={{ color: subtextColor }}>
            Powered by LaunchPad
          </p>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // RENDER — FULL-SCREEN SPLIT PANE
  // ==========================================
  return (
    <>
      <div className="fixed inset-0 z-40 flex flex-col bg-neutral-950">

        {/* TOP BAR */}
        <div className="bg-neutral-900 border-b border-neutral-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-white">Redirect Setup</h1>
                {canProceed && (
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-medium rounded">
                    URL Set
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500">{productName || 'Your Product'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Full Preview */}
            <button
              onClick={() => setShowFullPreview(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-neutral-400 hover:text-white transition-colors text-sm"
            >
              <Maximize2 className="w-4 h-4" />
              Full Preview
            </button>

            {/* Show/Hide Preview */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-sm text-neutral-300 transition-colors"
            >
              {showPreview ? (
                <><EyeOff className="w-4 h-4" /> Hide Preview</>
              ) : (
                <><Eye className="w-4 h-4" /> Show Preview</>
              )}
            </button>

            {/* Device Toggle */}
            {showPreview && (
              <div className="hidden lg:flex items-center bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-2 transition-colors ${
                    previewDevice === 'desktop'
                      ? 'bg-neutral-700 text-white'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-2 transition-colors ${
                    previewDevice === 'mobile'
                      ? 'bg-neutral-700 text-white'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* MAIN CONTENT: SPLIT PANE */}
        <div className="flex-1 flex overflow-hidden">

          {/* LEFT PANEL: INPUTS */}
          <div className={`${showPreview ? 'w-1/2 lg:w-[55%]' : 'flex-1 max-w-3xl mx-auto'} overflow-y-auto border-r border-neutral-800`}>
            <div className="p-6 space-y-6">

              {/* REDIRECT URL */}
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                    <ExternalLink className="w-4 h-4 text-amber-400" />
                  </div>
                  <h3 className="font-semibold">Redirect Settings</h3>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                      Redirect URL <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => updateRedirect({ url: e.target.value })}
                      onBlur={() => setTouched(true)}
                      placeholder="https://your-platform.com/course-access"
                      className={`w-full px-3 py-2.5 bg-neutral-800 border rounded-lg focus:outline-none text-white text-sm ${
                        showError || showEmpty
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-neutral-700 focus:border-indigo-500'
                      }`}
                    />
                    {showEmpty && (
                      <p className="text-xs text-red-400 mt-1">Please enter a redirect URL</p>
                    )}
                    {showError && (
                      <p className="text-xs text-red-400 mt-1">Please enter a valid URL starting with https:// or http://</p>
                    )}
                    {!showError && !showEmpty && (
                      <p className="text-[10px] text-neutral-500 mt-1">Customers will be sent to this URL after purchase</p>
                    )}
                  </div>

                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3">
                    <p className="text-xs text-indigo-300">
                      After purchase, customers will see a branded thank you page with a button linking to this URL.
                    </p>
                  </div>
                </div>
              </div>

              {/* DESIGN SECTION */}
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Palette className="w-4 h-4 text-purple-400" />
                  </div>
                  <h3 className="font-semibold">Page Design</h3>
                </div>

                <div className="space-y-5">
                  {/* Heading */}
                  <div>
                    <label className="text-xs font-medium text-neutral-300 mb-1.5 block">Heading</label>
                    <input
                      type="text"
                      value={data.design.headingText}
                      onChange={(e) => updateDesign({ headingText: e.target.value })}
                      maxLength={80}
                      placeholder="Thank you for your purchase!"
                      className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none text-white text-sm"
                    />
                    <TextStyleBar
                      prefix="heading"
                      size={headingSize}
                      color={headingColor}
                      align={headingAlign}
                      sizes={[{ value: '22px', label: 'S' }, { value: '28px', label: 'M' }, { value: '36px', label: 'L' }]}
                    />
                  </div>

                  {/* Subtext */}
                  <div>
                    <label className="text-xs font-medium text-neutral-300 mb-1.5 block">
                      Subtext
                      <span className="text-[10px] text-neutral-500 ml-1">{'{{product_name}}'} = product name</span>
                    </label>
                    <input
                      type="text"
                      value={data.design.subText}
                      onChange={(e) => updateDesign({ subText: e.target.value })}
                      maxLength={120}
                      placeholder="Here's your access to {{product_name}}"
                      className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none text-white text-sm"
                    />
                    <TextStyleBar
                      prefix="stext"
                      size={stextSize}
                      color={stextColor}
                      align={stextAlign}
                      sizes={[{ value: '13px', label: 'S' }, { value: '16px', label: 'M' }, { value: '20px', label: 'L' }]}
                    />
                  </div>

                  {/* Button Text */}
                  <div>
                    <label className="text-xs font-medium text-neutral-300 mb-1.5 block">Button Text</label>
                    <input
                      type="text"
                      value={redirectButtonText}
                      onChange={(e) => updateDesignExt({ redirectButtonText: e.target.value })}
                      maxLength={40}
                      placeholder="Access Your Purchase"
                      className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none text-white text-sm"
                    />
                    <p className="text-[10px] text-neutral-500 mt-1">The call-to-action button on the thank you page</p>
                  </div>

                  <div className="border-t border-neutral-800" />

                  {/* Logo */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">Logo</label>
                    {data.design.logoUrl ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-16 h-16 bg-neutral-800 border border-neutral-700 flex items-center justify-center overflow-hidden ${logoShapeClass(false)}`}>
                            <img src={data.design.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                          </div>
                          <button
                            onClick={handleRemoveLogo}
                            className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 rounded-lg transition-colors"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-neutral-500 w-10">Size</span>
                          <div className="flex gap-1">
                            {[{ value: 'sm', label: 'S' }, { value: 'md', label: 'M' }, { value: 'lg', label: 'L' }].map(s => (
                              <button
                                key={s.value}
                                onClick={() => updateDesignExt({ logoSize: s.value })}
                                className={`w-7 h-6 rounded text-[10px] font-medium transition-all ${
                                  logoSize === s.value
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-neutral-800 text-neutral-500 hover:text-neutral-300 border border-neutral-700'
                                }`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-neutral-500 w-10">Shape</span>
                          <div className="flex gap-1">
                            {[{ value: 'square', label: 'Square' }, { value: 'rounded', label: 'Round' }, { value: 'circle', label: 'Circle' }].map(s => (
                              <button
                                key={s.value}
                                onClick={() => updateDesignExt({ logoShape: s.value })}
                                className={`px-2 h-6 rounded text-[10px] font-medium transition-all ${
                                  logoShape === s.value
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-neutral-800 text-neutral-500 hover:text-neutral-300 border border-neutral-700'
                                }`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-neutral-500 w-10">Border</span>
                          <div className="flex gap-1">
                            {[{ value: 'none', label: 'None' }, { value: 'subtle', label: 'Subtle' }, { value: 'shadow', label: 'Shadow' }].map(s => (
                              <button
                                key={s.value}
                                onClick={() => updateDesignExt({ logoBorder: s.value })}
                                className={`px-2 h-6 rounded text-[10px] font-medium transition-all ${
                                  logoBorder === s.value
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-neutral-800 text-neutral-500 hover:text-neutral-300 border border-neutral-700'
                                }`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 px-3 py-3 bg-neutral-800 border border-neutral-700 hover:border-neutral-600 rounded-lg cursor-pointer transition-colors">
                        {uploadingLogo ? (
                          <Loader className="w-4 h-4 animate-spin text-neutral-400" />
                        ) : (
                          <Image className="w-4 h-4 text-neutral-400" />
                        )}
                        <span className="text-sm text-neutral-400">
                          {uploadingLogo ? 'Uploading...' : 'Upload logo (PNG, JPG, SVG)'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* Theme Preset */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-2">Theme Preset</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPendingTheme('light')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                          !dark
                            ? 'bg-white text-neutral-900 border-2 border-indigo-500'
                            : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:border-neutral-600'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-white border border-neutral-300" />
                        Light
                      </button>
                      <button
                        onClick={() => setPendingTheme('dark')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                          dark
                            ? 'bg-neutral-800 text-white border-2 border-indigo-500'
                            : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:border-neutral-600'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-neutral-900 border border-neutral-600" />
                        Dark
                      </button>
                    </div>
                    {pendingTheme && (
                      <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <p className="text-xs text-amber-400 mb-2">
                          Switching to <span className="font-semibold">{pendingTheme}</span> theme will reset color settings. Continue?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => applyThemePreset(pendingTheme)}
                            className="px-3 py-1.5 text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg transition-colors"
                          >
                            Apply {pendingTheme} theme
                          </button>
                          <button
                            onClick={() => setPendingTheme(null)}
                            className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Background Color */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-2">Background Color</label>
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-1">
                        {['#ffffff', '#f8f9fa', '#f3f0ff', '#fef3c7', '#ecfdf5', '#1a1a2e', '#0f172a', '#18181b'].map(color => (
                          <button
                            key={color}
                            onClick={() => updateDesign({ backgroundColor: color })}
                            className={`w-7 h-7 rounded border-2 transition-all ${
                              data.design.backgroundColor === color
                                ? 'border-indigo-500 scale-110'
                                : 'border-neutral-600 hover:border-neutral-500'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <input
                        type="color"
                        value={data.design.backgroundColor}
                        onChange={(e) => updateDesign({ backgroundColor: e.target.value })}
                        className="w-7 h-7 rounded cursor-pointer border border-dashed border-neutral-600 bg-transparent"
                      />
                    </div>
                  </div>

                  {/* Brand Color */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-2">
                      Brand Color
                      <span className="text-[10px] text-neutral-500 ml-1.5">Button, icons, accents</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-1">
                        {['#4f46e5', '#7c3aed', '#059669', '#dc2626', '#ea580c', '#0284c7'].map(color => (
                          <button
                            key={color}
                            onClick={() => updateDesign({ accentColor: color })}
                            className={`w-7 h-7 rounded border-2 transition-all ${
                              data.design.accentColor === color
                                ? 'border-white scale-110'
                                : 'border-neutral-600 hover:border-neutral-500'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <input
                        type="color"
                        value={data.design.accentColor}
                        onChange={(e) => updateDesign({ accentColor: e.target.value })}
                        className="w-7 h-7 rounded cursor-pointer border border-dashed border-neutral-600 bg-transparent"
                      />
                    </div>
                  </div>

                  <div className="border-t border-neutral-800" />

                  {/* Font */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-2">Font</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'system-ui, sans-serif', label: 'Clean', preview: 'Aa' },
                        { value: 'Georgia, serif', label: 'Classic', preview: 'Aa' },
                        { value: '"Courier New", monospace', label: 'Mono', preview: 'Aa' },
                      ].map(font => (
                        <button
                          key={font.value}
                          onClick={() => updateDesignExt({ fontFamily: font.value })}
                          className={`p-3 rounded-lg text-center transition-all ${
                            fontFamily === font.value
                              ? 'bg-indigo-600/20 border-2 border-indigo-500'
                              : 'bg-neutral-800 border border-neutral-700 hover:border-neutral-600'
                          }`}
                        >
                          <span className="text-xl font-semibold block mb-0.5" style={{ fontFamily: font.value }}>
                            {font.preview}
                          </span>
                          <span className="text-[10px] text-neutral-400">{font.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* INFO BOX */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-neutral-300">
                    Make sure your redirect URL is set up to handle incoming customers. They'll arrive with no additional context from LaunchPad.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: LIVE PREVIEW */}
          {showPreview && (
            <div className="hidden lg:flex flex-1 flex-col overflow-hidden bg-neutral-900/30">
              <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-800 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-neutral-500" />
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Live Preview</span>
                </div>
                <span className="text-xs text-neutral-600">
                  {previewDevice === 'desktop' ? 'Desktop view' : 'Mobile view'}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <LivePreview />
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM NAVIGATION BAR */}
        <div className="bg-neutral-900 border-t border-neutral-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-sm font-medium text-neutral-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex items-center gap-3">
            {!canProceed && (
              <p className="text-xs text-amber-400 hidden sm:block">
                Enter a valid URL to continue
              </p>
            )}
            <button
              onClick={onNext}
              disabled={!canProceed}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-700 disabled:text-neutral-500 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* FULL-SCREEN PREVIEW OVERLAY */}
      {showFullPreview && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="bg-neutral-900 border-b border-neutral-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-indigo-400" />
              <span className="text-sm font-medium text-neutral-200">Thank You Page Preview</span>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">Preview Mode</span>
            </div>
            <button
              onClick={() => setShowFullPreview(false)}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-sm text-neutral-300 transition-colors"
            >
              <X className="w-4 h-4" />
              Close Preview
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-y-auto" style={{ backgroundColor: bgColor }}>
            <LivePreview fullSize />
          </div>
        </div>
      )}
    </>
  );
}