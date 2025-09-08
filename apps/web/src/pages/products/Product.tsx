import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Video Preview Component (same as in NewProduct.tsx)
const VideoPreview = ({ 
  embedUrl, 
  previewMode, 
  settings,
  isCustomizing = false 
}: { 
  embedUrl: string; 
  previewMode: 'locked' | 'unlocked';
  settings: any;
  isCustomizing?: boolean;
}) => {
  const [showVideo, setShowVideo] = useState(isCustomizing);
  const [timeRemaining, setTimeRemaining] = useState(settings.videoPreviewDuration || 30);
  const videoRef = useRef<HTMLIFrameElement>(null);
  
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (showVideo && previewMode === 'locked' && settings.videoPreviewType === 'limited') {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setShowVideo(false);
            return settings.videoPreviewDuration || 30;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => clearInterval(timer);
  }, [showVideo, previewMode, settings.videoPreviewType, settings.videoPreviewDuration]);
  
  // For locked mode - show preview or sales video
  if (previewMode === 'locked') {
    // No video preview at all
    if (settings.videoPreviewType === 'none') {
      return (
        <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800 flex items-center justify-center">
          <div className="text-center p-8">
            <span className="text-5xl mb-4 block">🔒</span>
            <p className="text-xl text-neutral-300 mb-2">Premium Video Content</p>
            <p className="text-sm text-neutral-500">Purchase to unlock full video access</p>
          </div>
        </div>
      );
    }
    
    // Separate sales/trailer video
    if (settings.videoPreviewType === 'separate' && settings.salesVideoUrl) {
      const salesEmbedUrl = settings.getEmbedUrl(settings.salesVideoUrl);
      return (
        <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
          <iframe
            src={salesEmbedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Sales Video"
          />
        </div>
      );
    }
    
    // Limited preview of main video (default)
    if (!showVideo) {
      return (
        <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800 relative group cursor-pointer"
             onClick={() => setShowVideo(true)}>
          {/* Thumbnail or placeholder */}
          {settings.videoThumbnailUrl ? (
            <img 
              src={settings.videoThumbnailUrl} 
              alt="Video thumbnail" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
              <span className="text-6xl opacity-50">🎬</span>
            </div>
          )}
          
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
            <div className="bg-white/90 rounded-full p-4 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-neutral-900" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 4.5v11l8-5.5-8-5.5z" />
              </svg>
            </div>
            <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded">
              <p className="text-xs text-white">
                {settings.videoPreviewDuration || 30}s free preview
              </p>
            </div>
          </div>
        </div>
      );
    }
    
    // Show limited preview with countdown
    return (
      <div className="relative">
        <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
          <iframe
            ref={videoRef}
            src={`${embedUrl}${embedUrl.includes('?') ? '&' : '?'}autoplay=1`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Video Preview"
          />
        </div>
        
        {/* Countdown overlay */}
        <div className="absolute top-4 right-4 bg-black/70 px-3 py-2 rounded-lg">
          <p className="text-sm text-white font-mono">
            Preview ends in: {timeRemaining}s
          </p>
        </div>
        
        {/* Preview ended overlay */}
        {!showVideo && (
          <div className="absolute inset-0 bg-black/80 rounded-lg flex items-center justify-center">
            <div className="text-center p-8">
              <span className="text-4xl mb-3 block">⏱️</span>
              <p className="text-xl text-white mb-2">Preview Ended</p>
              <p className="text-sm text-neutral-300 mb-4">Purchase to watch the full video</p>
              <button 
                onClick={() => {
                  setShowVideo(true);
                  setTimeRemaining(settings.videoPreviewDuration || 30);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500"
              >
                Watch Preview Again
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Full video for unlocked mode (not used in Product page)
  return (
    <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Full Video"
      />
    </div>
  );
};

export default function ProductPage() {
    const { userId, productId } = useParams(); 
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [purchasing, setPurchasing] = useState(false);

    useEffect(() => {
        loadProduct();
    }, [userId, productId]);

    async function loadProduct() {
        try {
            if (!userId || !productId) {
                setError('Invalid product link');
                return;
            }
            
            const productRef = doc(db, 'users', userId, 'products', productId);
            const snap = await getDoc(productRef);
            
            if (!snap.exists()) {
                setError('Product not found');
                return;
            }

            const data = snap.data();
            
            if (!data.published) {
                setError('Product is not available');
                return;
            }

            setProduct({ id: snap.id, ...data });
            
            updateDoc(productRef, { views: increment(1) }).catch(console.error);
            
        } catch (error) {
            console.error('Error loading product:', error);
            setError('Failed to load product');
        } finally {
            setLoading(false);
        }
    }

    async function handlePurchase() {
        setPurchasing(true);
        try {
            const response = await fetch('https://us-central1-launchpad-ec0b0.cloudfunctions.net/createCheckoutSession', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    productId: productId,
                    sellerId: userId,
                    origin: window.location.origin
                })
            });
            
            const data = await response.json();
            
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'Failed to create checkout');
            }
        } catch (error) {
            console.error('Error creating checkout:', error);
            alert('Unable to process payment. Please try again.');
        } finally {
            setPurchasing(false);
        }
    }

    // Helper function to get embed URL
    function getEmbedUrl(url: string): string {
        if (!url) return '';
        
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
            return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
        }
        
        if (url.includes('loom.com')) {
            const videoId = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)?.[1];
            return videoId ? `https://www.loom.com/embed/${videoId}` : url;
        }
        
        if (url.includes('vimeo.com')) {
            const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
            return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
        }
        
        return url;
    }

    if (loading) return (
        <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center">
            <div className="text-neutral-400">Loading...</div>
        </div>
    );
        
    if (error) return (
        <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center">
            <div className="text-red-400">{error}</div>
        </div>
    );

    // Theme presets (same as in NewProduct.tsx)
    const themePresets: { [key: string]: any } = {
        dark: { bg: '#0B0B0D', text: '#FFFFFF', subtext: '#D4D4D4', cardBg: 'rgba(23, 23, 23, 0.5)', border: '#404040' },
        light: { bg: '#FFFFFF', text: '#000000', subtext: '#525252', cardBg: '#F9FAFB', border: '#E5E5E5' },
        purple: { bg: '#1A0B2E', text: '#FFFFFF', subtext: '#E0D5FF', cardBg: 'rgba(139, 92, 246, 0.1)', border: '#6B46C1' },
        blue: { bg: '#0F172A', text: '#FFFFFF', subtext: '#CBD5E1', cardBg: 'rgba(30, 58, 138, 0.2)', border: '#3B82F6' },
        ocean: { bg: '#0A1628', text: '#E8F4F8', subtext: '#A0C4D3', cardBg: 'rgba(32, 82, 149, 0.2)', border: '#2E5C76' },
        forest: { bg: '#0D1F0F', text: '#E8F5E9', subtext: '#AED5B0', cardBg: 'rgba(46, 87, 49, 0.2)', border: '#4A7C4E' },
        sunset: { bg: '#1F1315', text: '#FFF5F0', subtext: '#FFD4C3', cardBg: 'rgba(194, 65, 12, 0.15)', border: '#D97706' },
        midnight: { bg: '#0A0E1A', text: '#E0E7FF', subtext: '#A5B4FC', cardBg: 'rgba(55, 48, 163, 0.15)', border: '#4C1D95' },
        cream: { bg: '#FAF8F3', text: '#1F1F1F', subtext: '#6B6B6B', cardBg: '#F5F3ED', border: '#D4D4D8' },
        mint: { bg: '#F0FDF4', text: '#14532D', subtext: '#166534', cardBg: '#DCFCE7', border: '#86EFAC' },
        custom: product?.customTheme || { bg: '#0B0B0D', text: '#FFFFFF', subtext: '#A0A0A0' }
    };
    
    const currentTheme = themePresets[product?.themePreset || 'dark'];
    const elementOrder = product?.elementOrder || ['hero', 'video', 'urgency', 'features', 'testimonial', 'content', 'purchase'];
    
    // Element render map
    const elements: { [key: string]: JSX.Element | null } = {
        hero: (
            <div className="mb-8" key="hero">
                <h1 className="text-4xl font-bold mb-4" style={{ color: currentTheme.text }}>
                    {product.title}
                </h1>
                <p className="text-xl" style={{ color: currentTheme.subtext }}>
                    {product.description}
                </p>
            </div>
        ),
        
        video: product.videoUrl ? (
            <div className="mb-12" key="video">
                <h2 className="text-2xl font-semibold mb-4" style={{ color: currentTheme.text }}>
                    {product.videoTitle || 'Watch This First 👇'}
                </h2>
                <VideoPreview 
                    embedUrl={product.videoUrl}
                    previewMode="locked"
                    settings={{
                        ...product,
                        getEmbedUrl,
                        videoPreviewType: product.videoPreviewType || 'limited',
                        videoPreviewDuration: product.videoPreviewDuration || 30
                    }}
                />
            </div>
        ) : null,
        
        urgency: product.urgency ? (
            <div className="mb-8 p-4 bg-yellow-950/20 border border-yellow-800/30 rounded-lg" key="urgency">
                <p className="text-yellow-400 font-medium flex items-center gap-2">
                    {product.useUrgencyIcon && <span>{product.urgencyIcon || '⏰'}</span>}
                    {product.urgency === 'custom' 
                        ? product.customUrgency
                        : product.urgency === 'limited' ? 'Limited spots available - only a few left!'
                        : product.urgency === 'price' ? 'Price increases soon - lock in this rate now'
                        : product.urgency === 'bonus' ? 'Special bonus expires at midnight tonight'
                        : ''}
                </p>
            </div>
        ) : null,
        
        features: product.features && product.features.length > 0 ? (
            <div className="mb-12" key="features">
                <h2 className="text-2xl font-semibold mb-4" style={{ color: currentTheme.text }}>
                    {product.featuresTitle || "What's Included"}
                </h2>
                <div className="rounded-lg p-6 border" style={{ 
                    backgroundColor: currentTheme.cardBg,
                    borderColor: currentTheme.border 
                }}>
                    <ul className="space-y-3">
                        {product.features.map((feature: string, i: number) => (
                            <li key={i} className="flex items-start gap-3">
                                <span className="text-green-400 text-xl mt-0.5">✓</span>
                                <span className="text-lg" style={{ color: currentTheme.text }}>{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        ) : null,
        
        testimonial: product.testimonial ? (
            <div className="mb-8 p-6 rounded-lg border" style={{
                backgroundColor: currentTheme.cardBg,
                borderColor: currentTheme.border
            }} key="testimonial">
                <p className="text-lg italic mb-2" style={{ color: currentTheme.subtext }}>
                    "{product.testimonial}"
                </p>
                <p className="text-sm" style={{ color: currentTheme.subtext, opacity: 0.7 }}>
                    — Happy Customer
                </p>
            </div>
        ) : null,
        
        content: product.previewContent ? (
            <div className="mb-12" key="content">
                <h2 className="text-2xl font-semibold mb-4" style={{ color: currentTheme.text }}>
                    Content Preview
                </h2>
                <div className="rounded-lg p-6 border" style={{
                    backgroundColor: currentTheme.cardBg,
                    borderColor: currentTheme.border
                }}>
                    <div className={`prose max-w-none ${
                        product.themePreset === 'light' || 
                        product.themePreset === 'cream' || 
                        product.themePreset === 'mint' 
                            ? 'prose-neutral' 
                            : 'prose-invert prose-purple'
                    }`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {product.previewContent}
                        </ReactMarkdown>
                    </div>
                    {product.content && product.content.length > product.previewContent.length && (
                        <div className="mt-6 p-4 bg-gradient-to-t from-black/20 to-transparent rounded-lg">
                            <p className="text-center" style={{ color: currentTheme.subtext }}>
                                <span className="text-2xl mb-2 block">🔒</span>
                                Full content unlocked after purchase
                                <span className="block text-xs mt-1">
                                    ({Math.round(product.content.length / 5)} words of content)
                                </span>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        ) : null,
        
        purchase: (
            <div className="rounded-lg p-6 border" style={{
                backgroundColor: currentTheme.cardBg,
                borderColor: currentTheme.border
            }} key="purchase">
                <div className="text-4xl font-bold mb-2" style={{ color: currentTheme.text }}>
                    ${(product.price / 100).toFixed(2)}
                </div>
                <p className="text-sm mb-4" style={{ color: currentTheme.subtext }}>
                    One-time payment
                </p>
                
                <button
                    onClick={handlePurchase}
                    disabled={purchasing}
                    className={`w-full rounded-lg py-4 text-white font-bold text-lg transition-all transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100 ${
                        product.buttonGradient
                            ? product.color === 'green' ? 'bg-gradient-to-r from-green-600 to-emerald-500' :
                              product.color === 'blue' ? 'bg-gradient-to-r from-blue-600 to-blue-500' :
                              product.color === 'purple' ? 'bg-gradient-to-r from-purple-600 to-purple-500' :
                              'bg-gradient-to-r from-red-600 to-red-500'
                            : product.color === 'green' ? 'bg-green-600 hover:bg-green-500' :
                              product.color === 'blue' ? 'bg-blue-600 hover:bg-blue-500' :
                              product.color === 'purple' ? 'bg-purple-600 hover:bg-purple-500' :
                              'bg-red-600 hover:bg-red-500'
                    }`}
                >
                    {purchasing ? 'Processing...' : 'Get Instant Access →'}
                </button>
                
                <div className="mt-4 space-y-2 text-sm">
                    {product.guaranteeItems && product.guaranteeItems.length > 0 ? (
                        product.guaranteeItems.map((item: string, i: number) => (
                            <p key={i} className="flex items-center gap-2" style={{ color: currentTheme.subtext }}>
                                <span className="text-green-400">✓</span>
                                {item}
                            </p>
                        ))
                    ) : (
                        <>
                            <p className="flex items-center gap-2" style={{ color: currentTheme.subtext }}>
                                <span className="text-green-400">✓</span>
                                Secure payment via Stripe
                            </p>
                            <p className="flex items-center gap-2" style={{ color: currentTheme.subtext }}>
                                <span className="text-green-400">✓</span>
                                Instant access after payment
                            </p>
                            <p className="flex items-center gap-2" style={{ color: currentTheme.subtext }}>
                                <span className="text-green-400">✓</span>
                                {product.guarantee || '30-day money-back guarantee'}
                            </p>
                        </>
                    )}
                </div>
            </div>
        )
    };

    return (
        <div className="min-h-screen p-6" style={{ backgroundColor: currentTheme.bg, color: currentTheme.text }}>
            <div className="mx-auto max-w-4xl">
                {/* Render elements in the custom order */}
                {elementOrder.map((element: string) => elements[element]).filter(Boolean)}
                
                {/* Social proof if high sales */}
                {product.sales >= 5 && (
                    <div className="mt-8 p-4 bg-green-950/20 border border-green-800/30 rounded-lg text-center">
                        <p className="text-green-400 font-medium">
                            🔥 {product.sales} people already getting results with this
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}