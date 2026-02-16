import { DeliveryData } from './DeliveryBuilder';
import { 
  Mail, Check, File, Video, Link, Download, ExternalLink, 
  Package, Globe, ArrowRight
} from 'lucide-react';

interface DeliveryPreviewProps {
  data: DeliveryData;
  productName: string;
}

export default function DeliveryPreview({ data, productName }: DeliveryPreviewProps) {

  // ==========================================
  // HELPERS
  // ==========================================
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const resolveText = (text: string) => {
    return text
      .replace(/\{\{product_name\}\}/g, productName || 'Your Product')
      .replace(/\{\{customer_name\}\}/g, 'John');
  };

  const isDarkBackground = (color: string): boolean => {
    const hex = color.replace('#', '');
    if (hex.length !== 6) return false;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
  };

  const getVideoEmbedUrl = (url: string, platform: string): string | null => {
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
  };

  // Method labels
  const methodLabels: Record<string, { label: string; desc: string; icon: React.ReactNode }> = {
    'email-only': { 
      label: 'Email Only', 
      desc: 'Customers receive a confirmation email with no additional delivery page.',
      icon: <Mail className="w-5 h-5 text-blue-400" />
    },
    'quick-page': { 
      label: 'Quick Page', 
      desc: 'Customers are directed to a branded delivery page with your content.',
      icon: <Package className="w-5 h-5 text-indigo-400" />
    },
    'redirect': { 
      label: 'External Redirect', 
      desc: 'Customers see a branded thank you page, then access your external URL.',
      icon: <Globe className="w-5 h-5 text-green-400" />
    },
    'custom-editor': { 
      label: 'Custom Content Page', 
      desc: 'Customers see a custom-built content page.',
      icon: <ArrowRight className="w-5 h-5 text-purple-400" />
    },
  };

  const method = methodLabels[data.deliveryMethod] || methodLabels['email-only'];

  // Design variables
  const designExt = data.design as any;
  const accent = data.design.accentColor || '#4f46e5';
  const bgColor = data.design.backgroundColor || '#ffffff';
  const dark = isDarkBackground(bgColor);
  const textColor = dark ? '#f5f5f5' : '#111827';
  const subtextColor = dark ? '#a3a3a3' : '#6b7280';
  const borderColor = dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb';
  const cardBg = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)';
  const fontFamily: string = designExt.fontFamily || 'system-ui, sans-serif';

  const headingSize: string = designExt.headingSize || '28px';
  const headingColor: string = designExt.headingColor || textColor;
  const headingAlign: string = designExt.headingAlign || 'center';
  const stextSize: string = designExt.stextSize || '16px';
  const stextColor: string = designExt.stextColor || subtextColor;
  const stextAlign: string = designExt.stextAlign || 'center';
  const bodySize: string = designExt.bodySize || '14px';
  const bodyColor: string = designExt.bodyColor || textColor;

  const filesTitleSize: string = designExt.filesTitleSize || '22px';
  const filesTitleColor: string = designExt.filesTitleColor || textColor;
  const filesTitleAlign: string = designExt.filesTitleAlign || 'left';
  const videosTitleSize: string = designExt.videosTitleSize || '22px';
  const videosTitleColor: string = designExt.videosTitleColor || textColor;
  const videosTitleAlign: string = designExt.videosTitleAlign || 'left';
  const resourcesTitleSize: string = designExt.resourcesTitleSize || '22px';
  const resourcesTitleColor: string = designExt.resourcesTitleColor || textColor;
  const resourcesTitleAlign: string = designExt.resourcesTitleAlign || 'left';

  const filesSectionTitle: string = designExt.filesSectionTitle || 'Files';
  const videosSectionTitle: string = designExt.videosSectionTitle || 'Videos';
  const resourcesSectionTitle: string = designExt.resourcesSectionTitle || 'Resources';

  const logoSize: string = designExt.logoSize || 'md';
  const logoShape: string = designExt.logoShape || 'rounded';
  const logoBorder: string = designExt.logoBorder || 'none';
  const logoSizeMap: Record<string, string> = { sm: 'h-8', md: 'h-14', lg: 'h-20' };
  const logoShapeClass = () => {
    const base = logoShape === 'circle' ? 'rounded-full' : logoShape === 'rounded' ? 'rounded-xl' : 'rounded-none';
    const border = logoBorder === 'subtle' ? `border ${dark ? 'border-white/10' : 'border-black/10'}` : logoBorder === 'shadow' ? 'shadow-lg' : '';
    return `${base} ${border}`;
  };

  const contentOrder: string[] = designExt.contentOrder || ['header', 'files', 'videos', 'resources'];
  const redirectButtonText: string = designExt.redirectButtonText || 'Access Your Purchase';

  // Content counts
  const fileCount = data.hosted.files.length;
  const videoCount = data.hosted.videos.length;
  const hasEmbed = data.hosted.notionUrl.trim().length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Preview & Save</h2>
        <p className="text-neutral-400 mt-1">
          Review your delivery configuration before saving.
        </p>
      </div>

      {/* ==========================================
          CONFIGURATION SUMMARY
          ========================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-neutral-800 rounded-lg flex items-center justify-center">
              {method.icon}
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wider">Delivery Method</p>
              <p className="font-semibold text-sm">{method.label}</p>
            </div>
          </div>
          <p className="text-xs text-neutral-400">{method.desc}</p>
        </div>

        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4">
          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3">Content Included</p>
          {data.deliveryMethod === 'email-only' ? (
            <p className="text-sm text-neutral-400">Confirmation email only — no additional content.</p>
          ) : data.deliveryMethod === 'redirect' ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-green-400" />
                <span className="text-sm truncate">{data.redirect.url || 'No URL set'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-neutral-500" />
                <span className="text-xs text-neutral-400">Branded thank you page before redirect</span>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {fileCount > 0 && (
                <div className="flex items-center gap-2">
                  <File className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-sm">{fileCount} file{fileCount !== 1 ? 's' : ''}</span>
                </div>
              )}
              {videoCount > 0 && (
                <div className="flex items-center gap-2">
                  <Video className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-sm">{videoCount} video{videoCount !== 1 ? 's' : ''}</span>
                </div>
              )}
              {hasEmbed && (
                <div className="flex items-center gap-2">
                  <Link className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-sm">Embedded resource</span>
                </div>
              )}
              {fileCount === 0 && videoCount === 0 && !hasEmbed && (
                <p className="text-sm text-neutral-500">No content added yet.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ==========================================
          EMAIL PREVIEW
          ========================================== */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-800 flex items-center gap-2">
          <Mail className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium">Confirmation Email</span>
        </div>
        <div className="p-5">
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-neutral-500 uppercase w-14">Subject</span>
              <span className="text-sm font-medium">{data.email.subject}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-neutral-500 uppercase w-14">To</span>
              <span className="text-sm text-neutral-400">customer@example.com</span>
            </div>
          </div>

          <div className="bg-white rounded-lg p-5 text-neutral-800">
            <div className="text-sm whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'system-ui, sans-serif' }}>
              {resolveText(data.email.body).split('\n').map((line, i) => {
                if (line.includes('{{access_button}}')) {
                  return data.email.includeAccessButton ? (
                    <div key={i} className="my-4">
                      <span
                        className="inline-block px-6 py-3 rounded-lg text-white text-sm font-medium"
                        style={{ backgroundColor: accent }}
                      >
                        Access Your Product →
                      </span>
                    </div>
                  ) : null;
                }
                return <span key={i}>{line}{'\n'}</span>;
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          DELIVERY PAGE PREVIEW (Quick Page)
          ========================================== */}
      {data.deliveryMethod === 'quick-page' && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-medium">Delivery Page Preview</span>
            <span className="text-xs text-neutral-500">— what your customer sees</span>
          </div>

          <div 
            className="rounded-xl overflow-hidden border border-neutral-700"
            style={{ backgroundColor: bgColor, fontFamily }}
          >
            <div className="px-4 sm:px-8 py-10 max-w-3xl mx-auto">
              <div className="space-y-8">
                {contentOrder.map(section => {
                  if (section === 'header') return (
                    <div key="header">
                      <div className="mb-2">
                        {data.design.logoUrl && (
                          <img 
                            src={data.design.logoUrl} 
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
                        <h3 
                          className="font-bold" 
                          style={{ 
                            color: headingColor,
                            fontSize: headingSize,
                            marginBottom: '8px',
                            lineHeight: 1.2,
                            textAlign: headingAlign as any
                          }}
                        >
                          {data.design.headingText || 'Thank you for your purchase!'}
                        </h3>
                        <p style={{ 
                          color: stextColor,
                          fontSize: stextSize,
                          textAlign: stextAlign as any
                        }}>
                          {resolveText(data.design.subText || "Here's your access to {{product_name}}")}
                        </p>
                      </div>
                      <div className="mt-6" style={{ borderBottom: `1px solid ${borderColor}` }} />
                    </div>
                  );

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
                        {data.hosted.files.map(file => (
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
                              <p className="font-medium truncate" style={{ 
                                color: bodyColor,
                                fontSize: bodySize
                              }}>
                                {file.name}
                              </p>
                              <p style={{ 
                                color: subtextColor,
                                fontSize: `${Math.max(parseInt(bodySize) - 2, 10)}px`
                              }}>
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                            <span 
                              className="text-white font-medium flex items-center gap-2 flex-shrink-0 px-5 py-2.5 rounded-lg text-sm"
                              style={{ backgroundColor: accent }}
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );

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
                        {data.hosted.videos.map((video: any) => {
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
                                  <span className="underline truncate text-sm" style={{ color: accent }}>
                                    {video.url}
                                  </span>
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
                            {data.hosted.notionUrl}
                          </p>
                        </div>
                        <span 
                          className="text-white font-medium flex items-center gap-2 flex-shrink-0 px-5 py-2.5 rounded-lg text-sm"
                          style={{ backgroundColor: accent }}
                        >
                          <ExternalLink className="w-4 h-4" />
                          Open
                        </span>
                      </div>
                    </div>
                  );

                  return null;
                })}
              </div>

              <div 
                className="text-center mt-12 pt-6"
                style={{ borderTop: `1px solid ${borderColor}` }}
              >
                <p className="text-xs" style={{ color: subtextColor }}>
                  Powered by LaunchPad
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          REDIRECT PREVIEW — Branded Thank You Page
          ========================================== */}
      {data.deliveryMethod === 'redirect' && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium">Thank You Page Preview</span>
            <span className="text-xs text-neutral-500">— what your customer sees</span>
          </div>

          <div
            className="rounded-xl overflow-hidden border border-neutral-700"
            style={{ backgroundColor: bgColor, fontFamily }}
          >
            <div className="px-8 py-10 max-w-lg mx-auto text-center">
              {data.design.logoUrl && (
                <img
                  src={data.design.logoUrl}
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

              <h3
                className="font-bold"
                style={{
                  color: headingColor,
                  fontSize: headingSize,
                  marginBottom: '8px',
                  lineHeight: 1.2,
                  textAlign: headingAlign as any
                }}
              >
                {data.design.headingText || 'Thank you for your purchase!'}
              </h3>

              <p style={{
                color: stextColor,
                fontSize: stextSize,
                textAlign: stextAlign as any
              }}>
                {resolveText(data.design.subText || "Here's your access to {{product_name}}")}
              </p>

              <div className="mt-8">
                <span
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-white font-semibold text-base"
                  style={{ backgroundColor: accent }}
                >
                  {redirectButtonText || 'Access Your Purchase'}
                  <ExternalLink className="w-4 h-4" />
                </span>
              </div>

              <p className="mt-4 text-xs" style={{ color: subtextColor }}>
                Links to: {data.redirect.url || 'https://...'}
              </p>

              <div
                className="mt-12 pt-6"
                style={{ borderTop: `1px solid ${borderColor}` }}
              >
                <p className="text-xs" style={{ color: subtextColor }}>
                  Powered by LaunchPad
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ready message */}
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
        <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-400">Ready to save</p>
          <p className="text-xs text-green-400/70 mt-0.5">
            Click "Save Configuration" below to finalize your delivery setup.
          </p>
        </div>
      </div>
    </div>
  );
}