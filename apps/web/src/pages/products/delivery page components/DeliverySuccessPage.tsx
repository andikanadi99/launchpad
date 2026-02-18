import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Check, Download, ExternalLink, File, Video, Link, 
  Loader, Mail, AlertCircle, FileText
} from 'lucide-react';
import { generateFullPreviewHTML, Alignment } from '../product page components/ContentBuilderPage';

// ============================================
// TYPES
// ============================================
interface PurchaseData {
  product: {
    name: string;
    description: string;
  };
  delivery: {
    method: 'email-only' | 'quick-page' | 'custom-editor' | 'redirect';
    email: {
      subject: string;
      body: string;
      includeAccessButton: boolean;
    };
    hosted: {
      files: Array<{
        id: string;
        url: string;
        name: string;
        size: number;
        type: string;
      }>;
      videos: Array<{
        id: string;
        url: string;
        title: string;
        platform: string;
        titleSize?: string;
        titleColor?: string;
        titleAlign?: string;
      }>;
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
  };
  customerEmail: string;
  customerName: string;
}

// ============================================
// HELPERS
// ============================================
const FUNCTIONS_BASE = 'https://us-central1-launchpad-ec0b0.cloudfunctions.net';

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
export default function DeliverySuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [data, setData] = useState<PurchaseData | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Verify purchase on mount
  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setErrorMessage('No session ID found. Please check your purchase confirmation email.');
      return;
    }

    const verifyPurchase = async () => {
      try {
        const response = await fetch(`${FUNCTIONS_BASE}/verifyPurchase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Verification failed');
        }

        const result = await response.json();
        setData(result);
        setStatus('success');

        // Start redirect countdown if applicable
        if (result.delivery.method === 'redirect' && result.delivery.redirect.url) {
          const delay = result.delivery.redirect.delay || 5;
          setRedirectCountdown(delay);
        }
      } catch (err: any) {
        console.error('Purchase verification failed:', err);
        setStatus('error');
        setErrorMessage(err.message || 'Unable to verify your purchase. Please contact the seller.');
      }
    };

    verifyPurchase();
  }, [sessionId]);

  // Handle redirect countdown
  useEffect(() => {
    if (redirectCountdown === null || redirectCountdown <= 0) return;

    redirectTimerRef.current = setInterval(() => {
      setRedirectCountdown(prev => {
        if (prev === null || prev <= 1) {
          if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
          // Redirect
          if (data?.delivery.redirect.url) {
            window.location.href = data.delivery.redirect.url;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
    };
  }, [redirectCountdown, data]);

  // Resolve template variables
  const resolveText = (text: string) => {
    if (!data) return text;
    return text
      .replace(/\{\{product_name\}\}/g, data.product.name)
      .replace(/\{\{customer_name\}\}/g, data.customerName || 'there');
  };

  // ==========================================
  // LOADING STATE
  // ==========================================
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-10 h-10 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-neutral-800">Verifying your purchase...</p>
          <p className="text-sm text-neutral-500 mt-1">This will only take a moment</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // ERROR STATE
  // ==========================================
  if (status === 'error' || !data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-neutral-800 mb-2">Something went wrong</h2>
          <p className="text-neutral-500 text-sm mb-6">{errorMessage}</p>
          <p className="text-xs text-neutral-400">
            If you believe this is a mistake, please contact the seller or check your email for a confirmation receipt.
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // DESIGN VARIABLES
  // ==========================================
  const design = data.delivery.design;
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
  const stextColor = design.stextColor || subtextColor;
  const stextAlign = design.stextAlign || 'center';
  const bodySize = design.bodySize || '14px';
  const bodyColor = design.bodyColor || textColor;

  const logoSize = design.logoSize || 'md';
  const logoShape = design.logoShape || 'rounded';
  const logoBorder = design.logoBorder || 'none';
  const logoSizeMap: Record<string, string> = { sm: 'h-8', md: 'h-14', lg: 'h-20' };
  const logoShapeClass = () => {
    const base = logoShape === 'circle' ? 'rounded-full' : logoShape === 'rounded' ? 'rounded-xl' : 'rounded-none';
    const border = logoBorder === 'subtle' ? `border ${dark ? 'border-white/10' : 'border-black/10'}` : logoBorder === 'shadow' ? 'shadow-lg' : '';
    return `${base} ${border}`;
  };

  const contentOrder: string[] = design.contentOrder || ['header', 'files', 'videos', 'resources'];
  const redirectButtonText = design.redirectButtonText || 'Access Your Purchase';

  const hosted = data.delivery.hosted;
  const fileCount = hosted.files.length;
  const videoCount = hosted.videos.length;
  const hasEmbed = hosted.notionUrl.trim().length > 0;

  // Section title styles
  const filesTitleSize = design.filesTitleSize || '22px';
  const filesTitleColor = design.filesTitleColor || textColor;
  const filesTitleAlign = design.filesTitleAlign || 'left';
  const videosTitleSize = design.videosTitleSize || '22px';
  const videosTitleColor = design.videosTitleColor || textColor;
  const videosTitleAlign = design.videosTitleAlign || 'left';
  const resourcesTitleSize = design.resourcesTitleSize || '22px';
  const resourcesTitleColor = design.resourcesTitleColor || textColor;
  const resourcesTitleAlign = design.resourcesTitleAlign || 'left';
  const filesSectionTitle = design.filesSectionTitle || 'Files';
  const videosSectionTitle = design.videosSectionTitle || 'Videos';
  const resourcesSectionTitle = design.resourcesSectionTitle || 'Resources';

  // ==========================================
  // SHARED HEADER
  // ==========================================
  const renderHeader = () => (
    <div className="text-center mb-8">
      {design.logoUrl && (
        <img 
          src={design.logoUrl} 
          alt="Logo" 
          className={`object-contain mx-auto overflow-hidden ${logoSizeMap[logoSize]} mb-6 ${logoShapeClass()}`}
        />
      )}
      <div 
        className="rounded-full flex items-center justify-center mx-auto w-16 h-16 mb-4"
        style={{ backgroundColor: accent + '20' }}
      >
        <Check className="w-8 h-8" style={{ color: accent }} />
      </div>
      <h1 
        className="font-bold" 
        style={{ 
          color: headingColor,
          fontSize: headingSize,
          marginBottom: '8px',
          lineHeight: 1.2,
          textAlign: headingAlign as any
        }}
      >
        {resolveText(design.headingText || 'Thank you for your purchase!')}
      </h1>
      <p style={{ 
        color: stextColor,
        fontSize: stextSize,
        textAlign: stextAlign as any
      }}>
        {resolveText(design.subText || "Here's your access to {{product_name}}")}
      </p>
    </div>
  );

  // ==========================================
  // EMAIL ONLY
  // ==========================================
  if (data.delivery.method === 'email-only') {
    return (
      <div className="min-h-screen" style={{ backgroundColor: bgColor, fontFamily }}>
        <div className="px-4 sm:px-8 py-12 max-w-lg mx-auto">
          {renderHeader()}

          <div 
            className="rounded-xl p-6 text-center"
            style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
          >
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: accent + '15' }}
            >
              <Mail className="w-6 h-6" style={{ color: accent }} />
            </div>
            <p className="font-medium mb-1" style={{ color: textColor, fontSize: bodySize }}>
              Check your email
            </p>
            <p className="text-sm" style={{ color: subtextColor }}>
              We've sent a confirmation to <strong style={{ color: textColor }}>{data.customerEmail || 'your email'}</strong> with everything you need to get started.
            </p>
          </div>

          <div className="text-center mt-12 pt-6" style={{ borderTop: `1px solid ${borderColor}` }}>
            <p className="text-xs" style={{ color: subtextColor }}>
              Powered by LaunchPad
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // REDIRECT
  // ==========================================
  if (data.delivery.method === 'redirect') {
    return (
      <div className="min-h-screen" style={{ backgroundColor: bgColor, fontFamily }}>
        <div className="px-4 sm:px-8 py-12 max-w-lg mx-auto text-center">
          {renderHeader()}

          <div className="mt-8">
            <a
              href={data.delivery.redirect.url}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-white font-semibold text-base transition-opacity hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              {redirectButtonText}
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {redirectCountdown !== null && redirectCountdown > 0 && (
            <p className="mt-4 text-sm" style={{ color: subtextColor }}>
              Redirecting in {redirectCountdown} second{redirectCountdown !== 1 ? 's' : ''}...
            </p>
          )}

          <div className="mt-12 pt-6" style={{ borderTop: `1px solid ${borderColor}` }}>
            <p className="text-xs" style={{ color: subtextColor }}>
              Powered by LaunchPad
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // CUSTOM EDITOR
  // ==========================================
  if (data.delivery.method === 'custom-editor') {
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

    // Render as full-page iframe
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

    // Fallback if no content
    return (
      <div className="min-h-screen" style={{ backgroundColor: bgColor, fontFamily }}>
        <div className="px-4 sm:px-8 py-12 max-w-lg mx-auto">
          {renderHeader()}
          <div 
            className="rounded-xl p-6 text-center"
            style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
          >
            <p className="text-sm" style={{ color: subtextColor }}>
              Content is being prepared. Please check your email for access details.
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
  // QUICK PAGE
  // ==========================================
  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor, fontFamily }}>
      <div className="px-4 sm:px-8 py-12 max-w-3xl mx-auto">
        <div className="space-y-8">
          {contentOrder.map(section => {
            // HEADER
            if (section === 'header') return (
              <div key="header">
                {renderHeader()}
                <div style={{ borderBottom: `1px solid ${borderColor}` }} />
              </div>
            );

            // FILES
            if (section === 'files' && fileCount > 0) return (
              <div key="files">
                <p className="font-semibold" style={{ 
                  color: filesTitleColor,
                  fontSize: filesTitleSize,
                  marginBottom: '16px',
                  textAlign: filesTitleAlign as any
                }}>
                  {filesSectionTitle}
                </p>
                <div className="space-y-3">
                  {hosted.files.map(file => (
                    <div 
                      key={file.id} 
                      className="flex items-center gap-4 rounded-xl p-4"
                      style={{ border: `1px solid ${borderColor}`, backgroundColor: cardBg }}
                    >
                      <div 
                        className="rounded-xl flex items-center justify-center flex-shrink-0 w-12 h-12"
                        style={{ backgroundColor: accent + '15' }}
                      >
                        <File className="w-6 h-6" style={{ color: accent }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" style={{ color: bodyColor, fontSize: bodySize }}>
                          {file.name}
                        </p>
                        <p style={{ color: subtextColor, fontSize: `${Math.max(parseInt(bodySize) - 2, 10)}px` }}>
                          {formatFileSize(file.size)}
                        </p>
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

            // VIDEOS
            if (section === 'videos' && videoCount > 0) return (
              <div key="videos">
                <p className="font-semibold" style={{ 
                  color: videosTitleColor,
                  fontSize: videosTitleSize,
                  marginBottom: '16px',
                  textAlign: videosTitleAlign as any
                }}>
                  {videosSectionTitle}
                </p>
                <div className="space-y-5">
                  {hosted.videos.map((video) => {
                    const embedUrl = getVideoEmbedUrl(video.url, video.platform);
                    const vTitleSize = video.titleSize || bodySize;
                    const vTitleColor = video.titleColor || bodyColor;
                    const vTitleAlign = video.titleAlign || 'left';
                    return (
                      <div key={video.id}>
                        <p 
                          className="font-medium"
                          style={{ 
                            color: vTitleColor,
                            fontSize: vTitleSize,
                            marginBottom: '8px',
                            textAlign: vTitleAlign as any
                          }}
                        >
                          {video.title}
                        </p>
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
                          <div 
                            className="rounded-xl p-4 flex items-center gap-3"
                            style={{ border: `1px solid ${borderColor}`, backgroundColor: cardBg }}
                          >
                            <Video className="w-5 h-5" style={{ color: accent }} />
                            <a 
                              href={video.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="underline truncate text-sm"
                              style={{ color: accent }}
                            >
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

            // RESOURCES (Notion embed)
            if (section === 'resources' && hasEmbed) return (
              <div key="resources">
                <p className="font-semibold" style={{ 
                  color: resourcesTitleColor,
                  fontSize: resourcesTitleSize,
                  marginBottom: '16px',
                  textAlign: resourcesTitleAlign as any
                }}>
                  {resourcesSectionTitle}
                </p>
                <div 
                  className="rounded-xl p-4 flex items-center gap-4"
                  style={{ border: `1px solid ${borderColor}`, backgroundColor: cardBg }}
                >
                  <div 
                    className="rounded-xl flex items-center justify-center flex-shrink-0 w-12 h-12"
                    style={{ backgroundColor: accent + '15' }}
                  >
                    <Link className="w-6 h-6" style={{ color: accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium" style={{ color: bodyColor, fontSize: bodySize }}>
                      External Resource
                    </p>
                    <p className="truncate text-sm" style={{ color: subtextColor }}>
                      {hosted.notionUrl}
                    </p>
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
          <p className="text-xs" style={{ color: subtextColor }}>
            Powered by LaunchPad
          </p>
        </div>
      </div>
    </div>
  );
}