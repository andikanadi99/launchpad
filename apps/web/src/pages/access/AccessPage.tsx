import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { 
  Check, Download, ExternalLink, File, Video, Link, 
  Loader, Mail, AlertCircle, FileText, Lock, ArrowRight
} from 'lucide-react';
import { generateFullPreviewHTML, Alignment } from '../products/product page components/ContentBuilderPage';

// ============================================
// TYPES (mirrors PurchaseData from DeliverySuccessPage)
// ============================================
interface DeliveryData {
  deliveryMethod: string;
  email: {
    subject: string;
    body: string;
    includeAccessButton: boolean;
  };
  hosted: {
    files: Array<{ id?: string; url: string; name: string; size: number; type?: string }>;
    videos: Array<{ id?: string; url: string; title: string; platform: string }>;
    notionUrl: string;
    hasCustomContent: boolean;
    contentBlocks: string;
    pageTitle: string;
    pageSubtitle: string;
    headerStyles: any;
    pageBgColor: string;
    pageTheme: 'light' | 'dark';
  };
  redirect: {
    url: string;
    delay: number;
    showThankYou: boolean;
  };
  design: {
    backgroundColor: string;
    accentColor: string;
    logoUrl: string;
    headingText: string;
    subText: string;
    fontFamily?: string;
    headingSize?: string;
    headingColor?: string;
    headingAlign?: string;
    stextSize?: string;
    stextColor?: string;
    stextAlign?: string;
    bodySize?: string;
    bodyColor?: string;
    logoSize?: string;
    logoShape?: string;
    logoBorder?: string;
    contentOrder?: string[];
    filesSectionTitle?: string;
    videosSectionTitle?: string;
    resourcesSectionTitle?: string;
    filesTitleSize?: string;
    filesTitleColor?: string;
    filesTitleAlign?: string;
    videosTitleSize?: string;
    videosTitleColor?: string;
    videosTitleAlign?: string;
    resourcesTitleSize?: string;
    resourcesTitleColor?: string;
    resourcesTitleAlign?: string;
    redirectButtonText?: string;
  };
  status?: string;
}

interface PurchaseRecord {
  customerEmail: string;
  customerName: string;
  productName: string;
  slug: string;
  sellerId: string;
  productId: string;
}

// ============================================
// HELPERS
// ============================================
function isDarkBackground(color: string): boolean {
  const hex = color.replace('#', '');
  if (hex.length !== 6) return false;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getVideoEmbedUrl(url: string, platform: string): string | null {
  try {
    if (platform === 'youtube') {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
      if (match) return `https://www.youtube.com/embed/${match[1]}`;
    }
    if (platform === 'vimeo') {
      const match = url.match(/vimeo\.com\/(\d+)/);
      if (match) return `https://player.vimeo.com/video/${match[1]}`;
    }
    if (platform === 'loom') {
      const match = url.match(/loom\.com\/share\/([\w]+)/);
      if (match) return `https://www.loom.com/embed/${match[1]}`;
    }
  } catch { /* fallback */ }
  return null;
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function AccessPage() {
  const { token } = useParams<{ token: string }>();

  const [step, setStep] = useState<'loading' | 'verify' | 'content' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [purchaseRecord, setPurchaseRecord] = useState<PurchaseRecord | null>(null);
  const [delivery, setDelivery] = useState<DeliveryData | null>(null);
  const [productName, setProductName] = useState('');

  // Step 1: Load purchase record from Firestore
  useEffect(() => {
    if (!token) {
      setStep('error');
      setErrorMessage('Invalid access link.');
      return;
    }

    const loadPurchase = async () => {
      try {
        const purchaseRef = doc(db, 'purchases', token);
        const purchaseSnap = await getDoc(purchaseRef);

        if (!purchaseSnap.exists()) {
          setStep('error');
          setErrorMessage('This access link is invalid or has expired.');
          return;
        }

        const data = purchaseSnap.data() as PurchaseRecord;
        setPurchaseRecord(data);
        setProductName(data.productName || 'Your Product');
        setStep('verify');
      } catch (err) {
        console.error('Error loading purchase:', err);
        setStep('error');
        setErrorMessage('Unable to load your purchase. Please try again later.');
      }
    };

    loadPurchase();
  }, [token]);

  // Step 2: Verify email and load delivery content
  const handleEmailVerify = async () => {
    if (!emailInput.trim()) {
      setEmailError('Please enter your email');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim())) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setEmailError('');
    setIsVerifying(true);

    try {
      // Compare emails (case-insensitive)
      if (emailInput.toLowerCase().trim() !== purchaseRecord?.customerEmail?.toLowerCase()) {
        setEmailError('This email does not match the purchase. Please enter the email you used when buying.');
        setIsVerifying(false);
        return;
      }

      // Load delivery data from published_pages
      const pageRef = doc(db, 'published_pages', purchaseRecord.slug);
      const pageSnap = await getDoc(pageRef);

      if (!pageSnap.exists()) {
        setStep('error');
        setErrorMessage('Product not found. The seller may have removed it.');
        return;
      }

      const pageData = pageSnap.data();
      setDelivery(pageData.delivery || null);
      setStep('content');
    } catch (err) {
      console.error('Error verifying access:', err);
      setEmailError('Something went wrong. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // ==========================================
  // LOADING
  // ==========================================
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-10 h-10 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-neutral-800">Loading your purchase...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // ERROR
  // ==========================================
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-neutral-800 mb-2">Access Denied</h2>
          <p className="text-neutral-500 text-sm mb-6">{errorMessage}</p>
          <p className="text-xs text-neutral-400">
            If you believe this is a mistake, please contact the seller.
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // EMAIL VERIFICATION GATE
  // ==========================================
  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-800 p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-indigo-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7 text-indigo-400" />
              </div>
              <h1 className="text-xl font-bold text-white mb-1">
                Access Your Purchase
              </h1>
              <p className="text-sm text-neutral-400">
                Enter the email you used to purchase <strong className="text-white">{productName}</strong>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    setEmailError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEmailVerify();
                  }}
                  placeholder="you@example.com"
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors text-white placeholder-neutral-500 ${
                    emailError 
                      ? 'border-red-500/50 bg-red-500/10' 
                      : 'border-neutral-700 bg-neutral-800 focus:bg-neutral-800'
                  }`}
                  autoFocus
                />
                {emailError && (
                  <p className="text-sm text-red-400 mt-1.5">{emailError}</p>
                )}
              </div>

              <button
                onClick={handleEmailVerify}
                disabled={isVerifying}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-wait"
              >
                {isVerifying ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Access My Purchase
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-800 text-center">
              <p className="text-xs text-neutral-500">
                Your content is protected. Only the email used during purchase can access it.
              </p>
            </div>
          </div>

          <div className="text-center mt-6">
            <p className="text-xs text-neutral-600">
              Powered by LaunchPad
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // CONTENT DELIVERY (after email verified)
  // ==========================================
  if (!delivery) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
          <p className="text-neutral-700">No delivery content found for this product.</p>
          <p className="text-sm text-neutral-400 mt-1">Please contact the seller.</p>
        </div>
      </div>
    );
  }

  // Design variables
  const design = delivery.design || {} as any;
  const accent = design.accentColor || '#4f46e5';
  const bgColor = design.backgroundColor || '#ffffff';
  const dark = isDarkBackground(bgColor);
  const textColor = dark ? '#f5f5f5' : '#111827';
  const subtextColor = dark ? '#a3a3a3' : '#6b7280';
  const borderColor = dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb';
  const cardBg = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)';
  const fontFamily = design.fontFamily || 'system-ui, sans-serif';
  const headingSize = design.headingSize || '28px';
  const headingColor = design.headingColor || textColor;
  const headingAlign = design.headingAlign || 'center';
  const stextSize = design.stextSize || '16px';
  const stextColorVal = design.stextColor || subtextColor;
  const stextAlign = design.stextAlign || 'center';
  const bodySize = design.bodySize || '14px';
  const bodyColor = design.bodyColor || textColor;

  const resolveText = (text: string) => {
    return text
      .replace(/\{\{product_name\}\}/g, productName)
      .replace(/\{\{customer_name\}\}/g, purchaseRecord?.customerName || 'there');
  };

  const hosted = delivery.hosted || { files: [], videos: [], notionUrl: '', hasCustomContent: false, contentBlocks: '[]', pageTitle: '', pageSubtitle: '', headerStyles: {}, pageBgColor: '#ffffff', pageTheme: 'light' as const };
  const contentOrder: string[] = design.contentOrder || ['header', 'files', 'videos', 'resources'];
  const fileCount = hosted.files?.length || 0;
  const videoCount = hosted.videos?.length || 0;
  const hasEmbed = (hosted.notionUrl || '').trim().length > 0;
  const filesSectionTitle = design.filesSectionTitle || 'Files';
  const videosSectionTitle = design.videosSectionTitle || 'Videos';
  const resourcesSectionTitle = design.resourcesSectionTitle || 'Resources';
  const filesTitleSize = design.filesTitleSize || '22px';
  const filesTitleColor = design.filesTitleColor || textColor;
  const filesTitleAlign = design.filesTitleAlign || 'left';
  const videosTitleSize = design.videosTitleSize || '22px';
  const videosTitleColor = design.videosTitleColor || textColor;
  const videosTitleAlign = design.videosTitleAlign || 'left';
  const resourcesTitleSize = design.resourcesTitleSize || '22px';
  const resourcesTitleColor = design.resourcesTitleColor || textColor;
  const resourcesTitleAlign = design.resourcesTitleAlign || 'left';

  // Header renderer
  const renderHeader = () => (
    <div className="text-center mb-8">
      {design.logoUrl && (
        <img src={design.logoUrl} alt="Logo" className="object-contain mx-auto h-14 mb-6 rounded-xl" />
      )}
      <div 
        className="rounded-full flex items-center justify-center mx-auto w-16 h-16 mb-4"
        style={{ backgroundColor: accent + '20' }}
      >
        <Check className="w-8 h-8" style={{ color: accent }} />
      </div>
      <h1 
        className="font-bold" 
        style={{ color: headingColor, fontSize: headingSize, marginBottom: '8px', lineHeight: 1.2, textAlign: headingAlign as any }}
      >
        {resolveText(design.headingText || 'Thank you for your purchase!')}
      </h1>
      <p style={{ color: stextColorVal, fontSize: stextSize, textAlign: stextAlign as any }}>
        {resolveText(design.subText || "Here's your access to {{product_name}}")}
      </p>
    </div>
  );

  // ==========================================
  // EMAIL-ONLY
  // ==========================================
  if (delivery.deliveryMethod === 'email-only') {
    return (
      <div className="min-h-screen" style={{ backgroundColor: bgColor, fontFamily }}>
        <div className="px-4 sm:px-8 py-12 max-w-lg mx-auto">
          {renderHeader()}
          <div className="rounded-xl p-6 text-center" style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: accent + '15' }}>
              <Mail className="w-6 h-6" style={{ color: accent }} />
            </div>
            <p className="font-medium mb-1" style={{ color: textColor, fontSize: bodySize }}>Check your email</p>
            <p className="text-sm" style={{ color: subtextColor }}>
              We've sent a confirmation to <strong style={{ color: textColor }}>{purchaseRecord?.customerEmail || 'your email'}</strong> with everything you need to get started.
            </p>
          </div>
          <div className="text-center mt-12 pt-6" style={{ borderTop: `1px solid ${borderColor}` }}>
            <p className="text-xs" style={{ color: subtextColor }}>Powered by LaunchPad</p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // REDIRECT
  // ==========================================
  if (delivery.deliveryMethod === 'redirect') {
    return (
      <div className="min-h-screen" style={{ backgroundColor: bgColor, fontFamily }}>
        <div className="px-4 sm:px-8 py-12 max-w-lg mx-auto text-center">
          {renderHeader()}
          <div className="mt-8">
            <a
              href={delivery.redirect?.url || '#'}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-white font-semibold text-base transition-opacity hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              {design.redirectButtonText || 'Access Your Purchase'}
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <div className="mt-12 pt-6" style={{ borderTop: `1px solid ${borderColor}` }}>
            <p className="text-xs" style={{ color: subtextColor }}>Powered by LaunchPad</p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // CUSTOM EDITOR
  // ==========================================
  if (delivery.deliveryMethod === 'custom-editor') {
    let customHTML = '';
    try {
      const blocks = JSON.parse(hosted.contentBlocks || '[]');
      if (blocks.length > 0) {
        const hs = hosted.headerStyles || {};
        customHTML = generateFullPreviewHTML(
          blocks,
          hosted.pageTitle || '',
          hosted.pageSubtitle || '',
          hs.showTitle !== false,
          hs.titleSize || '2rem',
          (hs.titleAlign || 'center') as Alignment,
          hs.titleColor || '',
          hs.subtitleSize || '1rem',
          (hs.subtitleAlign || 'center') as Alignment,
          hs.subtitleColor || '',
          hosted.pageBgColor || '#ffffff',
          hosted.pageTheme || 'light',
          true
        );
      }
    } catch (err) {
      console.error('Error parsing content blocks:', err);
    }

    if (customHTML) {
      return (
        <iframe
          srcDoc={customHTML}
          title="Your Product"
          className="w-full min-h-screen border-0"
          style={{ height: '100vh', width: '100%', border: 'none' }}
        />
      );
    }

    return (
      <div className="min-h-screen" style={{ backgroundColor: bgColor, fontFamily }}>
        <div className="px-4 sm:px-8 py-12 max-w-lg mx-auto">
          {renderHeader()}
          <div className="rounded-xl p-6 text-center" style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}>
            <p className="text-sm" style={{ color: subtextColor }}>Content is being prepared. Please check your email for access details.</p>
          </div>
          <div className="text-center mt-12 pt-6" style={{ borderTop: `1px solid ${borderColor}` }}>
            <p className="text-xs" style={{ color: subtextColor }}>Powered by LaunchPad</p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // QUICK PAGE (default)
  // ==========================================
  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor, fontFamily }}>
      <div className="px-4 sm:px-8 py-12 max-w-3xl mx-auto">
        <div className="space-y-8">
          {contentOrder.map(section => {
            if (section === 'header') return (
              <div key="header">
                {renderHeader()}
                <div style={{ borderBottom: `1px solid ${borderColor}` }} />
              </div>
            );

            if (section === 'files' && fileCount > 0) return (
              <div key="files">
                <p className="font-semibold" style={{ color: filesTitleColor, fontSize: filesTitleSize, marginBottom: '16px', textAlign: filesTitleAlign as any }}>
                  {filesSectionTitle}
                </p>
                <div className="space-y-3">
                  {hosted.files.map((file, index) => (
                    <div 
                      key={file.id || `file-${index}`}
                      className="flex items-center gap-4 rounded-xl p-4"
                      style={{ border: `1px solid ${borderColor}`, backgroundColor: cardBg }}
                    >
                      <div className="rounded-xl flex items-center justify-center flex-shrink-0 w-12 h-12" style={{ backgroundColor: accent + '15' }}>
                        <File className="w-6 h-6" style={{ color: accent }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" style={{ color: bodyColor, fontSize: bodySize }}>{file.name}</p>
                        <p style={{ color: subtextColor, fontSize: `${Math.max(parseInt(bodySize) - 2, 10)}px` }}>{formatFileSize(file.size)}</p>
                      </div>
                      <a
                        href={file.url}
                        download={file.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white font-medium flex items-center gap-2 flex-shrink-0 px-5 py-2.5 rounded-lg text-sm transition-opacity hover:opacity-90"
                        style={{ backgroundColor: accent }}
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            );

            if (section === 'videos' && videoCount > 0) return (
              <div key="videos">
                <p className="font-semibold" style={{ color: videosTitleColor, fontSize: videosTitleSize, marginBottom: '16px', textAlign: videosTitleAlign as any }}>
                  {videosSectionTitle}
                </p>
                <div className="space-y-5">
                  {hosted.videos.map((video, index) => {
                    const embedUrl = getVideoEmbedUrl(video.url, video.platform);
                    return (
                      <div key={video.id || `video-${index}`}>
                        <p className="font-medium" style={{ color: bodyColor, fontSize: bodySize, marginBottom: '8px' }}>{video.title}</p>
                        {embedUrl ? (
                          <div className="overflow-hidden rounded-xl" style={{ border: `1px solid ${borderColor}` }}>
                            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                              <iframe
                                src={embedUrl}
                                className="absolute inset-0 w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title={video.title}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl p-4 flex items-center gap-3" style={{ border: `1px solid ${borderColor}`, backgroundColor: cardBg }}>
                            <Video className="w-5 h-5" style={{ color: accent }} />
                            <a href={video.url} target="_blank" rel="noopener noreferrer" className="underline truncate text-sm" style={{ color: accent }}>
                              {video.url}
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );

            if (section === 'resources' && hasEmbed) return (
              <div key="resources">
                <p className="font-semibold" style={{ color: resourcesTitleColor, fontSize: resourcesTitleSize, marginBottom: '16px', textAlign: resourcesTitleAlign as any }}>
                  {resourcesSectionTitle}
                </p>
                <div className="rounded-xl p-4 flex items-center gap-4" style={{ border: `1px solid ${borderColor}`, backgroundColor: cardBg }}>
                  <div className="rounded-xl flex items-center justify-center flex-shrink-0 w-12 h-12" style={{ backgroundColor: accent + '15' }}>
                    <Link className="w-6 h-6" style={{ color: accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium" style={{ color: bodyColor, fontSize: bodySize }}>External Resource</p>
                    <p className="truncate text-sm" style={{ color: subtextColor }}>{hosted.notionUrl}</p>
                  </div>
                  <a
                    href={hosted.notionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white font-medium flex items-center gap-2 flex-shrink-0 px-5 py-2.5 rounded-lg text-sm transition-opacity hover:opacity-90"
                    style={{ backgroundColor: accent }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open
                  </a>
                </div>
              </div>
            );

            return null;
          })}
        </div>

        <div className="text-center mt-12 pt-6" style={{ borderTop: `1px solid ${borderColor}` }}>
          <p className="text-xs" style={{ color: subtextColor }}>Powered by LaunchPad</p>
        </div>
      </div>
    </div>
  );
}