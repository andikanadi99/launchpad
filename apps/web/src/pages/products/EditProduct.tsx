import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
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
  
  if (previewMode === 'locked') {
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
    
    if (!showVideo) {
      return (
        <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800 relative group cursor-pointer"
             onClick={() => setShowVideo(true)}>
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
        
        <div className="absolute top-4 right-4 bg-black/70 px-3 py-2 rounded-lg">
          <p className="text-sm text-white font-mono">
            Preview ends in: {timeRemaining}s
          </p>
        </div>
        
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

export default function EditProduct() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'locked' | 'unlocked'>('locked');
  const [activeSection, setActiveSection] = useState<string>('basic');
  
  const [formData, setFormData] = useState({
    title: '',
    price: '10',
    description: '',
    content: '',
    videoUrl: '',
    features: ['', '', ''],
    testimonial: '',
    guarantee: '30-day money-back guarantee',
    urgency: '',
    color: 'green',
    buttonGradient: false,
    featuresTitle: 'What\'s Included',
    customUrgency: '',
    guaranteeItems: [
      'Secure payment via Stripe',
      'Instant access to content',
      '30-day money-back guarantee'
    ],
    elementOrder: ['hero', 'video', 'urgency', 'features', 'testimonial', 'content', 'purchase'],
    urgencyIcon: '⏰',
    useUrgencyIcon: true,
    themePreset: 'dark' as 'dark' | 'light' | 'purple' | 'blue' | 'ocean' | 'forest' | 'sunset' | 'midnight' | 'cream' | 'mint',
    customTheme: {
      bg: '#0B0B0D',
      text: '#FFFFFF',
      subtext: '#A0A0A0'
    },
    videoPreviewType: 'limited' as 'separate' | 'limited' | 'none',
    videoPreviewDuration: 30,
    salesVideoUrl: '',
    videoThumbnailUrl: '',
    videoTitle: 'Watch This First 👇',
    published: false,
    previewContent: ''
  });

  const themePresets = {
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
    custom: formData.customTheme
  };

  const currentTheme = themePresets[formData.themePreset];
  const urgencyIcons = ['⏰', '🔥', '⚡', '🚨', '💥', '⭐', '🎯', '📢'];

  useEffect(() => {
    loadProduct();
  }, [productId]);

  async function loadProduct() {
    try {
      if (!auth.currentUser || !productId) {
        setError('Invalid request');
        return;
      }

      const productRef = doc(db, 'users', auth.currentUser.uid, 'products', productId);
      const snap = await getDoc(productRef);

      if (!snap.exists()) {
        setError('Product not found');
        return;
      }

      const data = snap.data();
      
      setFormData({
        title: data.title || '',
        price: String(data.price / 100),
        description: data.description || '',
        content: data.content || '',
        videoUrl: data.videoUrl || '',
        features: data.features || ['', '', ''],
        testimonial: data.testimonial || '',
        guarantee: data.guarantee || '30-day money-back guarantee',
        urgency: data.urgency || '',
        color: data.color || 'green',
        buttonGradient: data.buttonGradient || false,
        featuresTitle: data.featuresTitle || 'What\'s Included',
        customUrgency: data.customUrgency || '',
        guaranteeItems: data.guaranteeItems || [
          'Secure payment via Stripe',
          'Instant access to content',
          '30-day money-back guarantee'
        ],
        elementOrder: data.elementOrder || ['hero', 'video', 'urgency', 'features', 'testimonial', 'content', 'purchase'],
        urgencyIcon: data.urgencyIcon || '⏰',
        useUrgencyIcon: data.useUrgencyIcon !== undefined ? data.useUrgencyIcon : true,
        themePreset: data.themePreset || 'dark',
        customTheme: data.customTheme || { bg: '#0B0B0D', text: '#FFFFFF', subtext: '#A0A0A0' },
        videoPreviewType: data.videoPreviewType || 'limited',
        videoPreviewDuration: data.videoPreviewDuration || 30,
        salesVideoUrl: data.salesVideoUrl || '',
        videoThumbnailUrl: data.videoThumbnailUrl || '',
        videoTitle: data.videoTitle || 'Watch This First 👇',
        published: data.published || false,
        previewContent: data.previewContent || data.content?.substring(0, 500) || ''
      });

    } catch (error) {
      console.error('Error loading product:', error);
      setError('Failed to load product');
    } finally {
      setLoading(false);
    }
  }

  async function saveProduct() {
    if (!auth.currentUser || !productId) return;

    setSaving(true);
    try {
      const productRef = doc(db, 'users', auth.currentUser.uid, 'products', productId);
      
      await updateDoc(productRef, {
        title: formData.title,
        price: Math.round(parseFloat(formData.price) * 100),
        description: formData.description,
        content: formData.content || null,
        videoUrl: getEmbedUrl(formData.videoUrl) || null,
        features: formData.features.filter(f => f.trim()),
        testimonial: formData.testimonial || null,
        guarantee: formData.guarantee,
        urgency: formData.urgency || null,
        color: formData.color,
        buttonGradient: formData.buttonGradient,
        featuresTitle: formData.featuresTitle,
        customUrgency: formData.customUrgency || null,
        guaranteeItems: formData.guaranteeItems.filter(item => item.trim()),
        elementOrder: formData.elementOrder,
        urgencyIcon: formData.urgencyIcon,
        useUrgencyIcon: formData.useUrgencyIcon,
        themePreset: formData.themePreset,
        customTheme: formData.customTheme,
        videoPreviewType: formData.videoPreviewType,
        videoPreviewDuration: formData.videoPreviewDuration,
        salesVideoUrl: formData.salesVideoUrl || null,
        videoThumbnailUrl: formData.videoThumbnailUrl || null,
        videoTitle: formData.videoTitle,
        published: formData.published,
        previewContent: formData.previewContent || formData.content?.substring(0, 500) || ''
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error saving product. Please try again.');
    } finally {
      setSaving(false);
    }
  }

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

  const moveElement = (arr: string[], fromIndex: number, toIndex: number) => {
    const newArr = [...arr];
    const [element] = newArr.splice(fromIndex, 1);
    newArr.splice(toIndex, 0, element);
    return newArr;
  };

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

  return (
    <div className="min-h-screen" style={{ backgroundColor: currentTheme.bg }}>
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 p-4">
        <div className="mx-auto max-w-7xl flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="font-bold text-white">Edit Product</h2>
              <p className="text-xs text-neutral-400">Make changes and see them live</p>
            </div>
            
            {/* Preview Mode Toggle */}
            <div className="flex bg-neutral-800 rounded-lg p-1">
              <button
                onClick={() => setPreviewMode('locked')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  previewMode === 'locked' 
                    ? 'bg-neutral-700 text-white' 
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                🔒 Sales View
              </button>
              <button
                onClick={() => setPreviewMode('unlocked')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  previewMode === 'unlocked' 
                    ? 'bg-neutral-700 text-white' 
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                After Purchase
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 rounded-lg border border-neutral-700 hover:bg-neutral-800 text-white"
            >
              Cancel
            </button>
            <button
              onClick={saveProduct}
              disabled={saving || !formData.title || !formData.description}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Split View */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Panel - Editor */}
        <div className="w-[450px] bg-neutral-950 border-r border-neutral-800 overflow-y-auto">
          {/* Section Dropdown */}
          <div className="border-b border-neutral-800 p-4">
            <label className="block text-xs text-neutral-500 mb-2">Edit Section</label>
            <select
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value)}
              className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-neutral-600 transition-colors"
            >
              <option value="basic">📝 Basic Information</option>
              <option value="content">📄 Content & Preview</option>
              <option value="video">🎥 Video Settings</option>
              <option value="features">✨ Features & Benefits</option>
              <option value="sales">💰 Sales Elements</option>
              <option value="design">🎨 Design & Theme</option>
              <option value="layout">📐 Page Layout Order</option>
            </select>
          </div>

          {/* Section Content */}
          <div className="p-6 space-y-4 text-white">
            {/* Basic Info Section */}
            {activeSection === 'basic' && (
              <>
                <div>
                  <label className="block text-sm text-neutral-300 mb-2">Product Name</label>
                  <input
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-neutral-300 mb-2">Price (USD)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-neutral-300 mb-2">Description</label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm resize-none"
                  />
                </div>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.published}
                    onChange={(e) => setFormData({...formData, published: e.target.checked})}
                    className="rounded"
                  />
                  <span className="text-sm">Published</span>
                </label>
              </>
            )}

            {/* Content Section */}
            {activeSection === 'content' && (
              <>
                <div>
                  <label className="block text-sm text-neutral-300 mb-2">Main Content</label>
                  <textarea
                    rows={10}
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm font-mono resize-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-neutral-300 mb-2">Preview Content (for sales page)</label>
                  <textarea
                    rows={6}
                    value={formData.previewContent}
                    onChange={(e) => setFormData({...formData, previewContent: e.target.value})}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm resize-none"
                    placeholder="What customers see before purchasing..."
                  />
                </div>
              </>
            )}

            {/* Video Section */}
            {activeSection === 'video' && (
              <>
                <div>
                  <label className="block text-sm text-neutral-300 mb-2">Video Title</label>
                  <input
                    value={formData.videoTitle}
                    onChange={(e) => setFormData({...formData, videoTitle: e.target.value})}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-neutral-300 mb-2">Main Video URL</label>
                  <input
                    type="url"
                    value={formData.videoUrl}
                    onChange={(e) => setFormData({...formData, videoUrl: e.target.value})}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
                    placeholder="YouTube, Loom, or Vimeo link"
                  />
                </div>
                
                {formData.videoUrl && (
                  <>
                    <div>
                      <label className="block text-sm text-neutral-300 mb-2">Preview Type</label>
                      <select
                        value={formData.videoPreviewType}
                        onChange={(e) => setFormData({...formData, videoPreviewType: e.target.value as any})}
                        className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
                      >
                        <option value="limited">Limited Preview</option>
                        <option value="separate">Separate Sales Video</option>
                        <option value="none">No Preview</option>
                      </select>
                    </div>
                    
                    {formData.videoPreviewType === 'limited' && (
                      <div>
                        <label className="block text-sm text-neutral-300 mb-2">
                          Preview Duration: {formData.videoPreviewDuration}s
                        </label>
                        <input
                          type="range"
                          value={formData.videoPreviewDuration}
                          onChange={(e) => setFormData({...formData, videoPreviewDuration: Number(e.target.value)})}
                          min={10}
                          max={120}
                          step={5}
                          className="w-full"
                        />
                      </div>
                    )}
                    
                    {formData.videoPreviewType === 'separate' && (
                      <div>
                        <label className="block text-sm text-neutral-300 mb-2">Sales Video URL</label>
                        <input
                          type="url"
                          value={formData.salesVideoUrl}
                          onChange={(e) => setFormData({...formData, salesVideoUrl: e.target.value})}
                          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
                        />
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Features Section */}
            {activeSection === 'features' && (
              <>
                <div>
                  <label className="block text-sm text-neutral-300 mb-2">Section Title</label>
                  <input
                    value={formData.featuresTitle}
                    onChange={(e) => setFormData({...formData, featuresTitle: e.target.value})}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-neutral-300 mb-2">Benefits</label>
                  {formData.features.map((feature, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input
                        value={feature}
                        onChange={(e) => {
                          const newFeatures = [...formData.features];
                          newFeatures[i] = e.target.value;
                          setFormData({...formData, features: newFeatures});
                        }}
                        className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm"
                        placeholder={`Benefit ${i + 1}`}
                      />
                      <button
                        onClick={() => {
                          setFormData({
                            ...formData,
                            features: formData.features.filter((_, idx) => idx !== i)
                          });
                        }}
                        className="px-2 text-red-400 hover:text-red-300"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setFormData({...formData, features: [...formData.features, '']})}
                    className="w-full mt-2 py-2 border border-dashed border-neutral-700 rounded text-xs text-green-400"
                  >
                    + Add Benefit
                  </button>
                </div>
              </>
            )}

            {/* Sales Section */}
            {activeSection === 'sales' && (
              <>
                <div>
                  <label className="block text-sm text-neutral-300 mb-2">Testimonial</label>
                  <textarea
                    rows={3}
                    value={formData.testimonial}
                    onChange={(e) => setFormData({...formData, testimonial: e.target.value})}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm resize-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-neutral-300 mb-2">Urgency</label>
                  <select
                    value={formData.urgency}
                    onChange={(e) => setFormData({...formData, urgency: e.target.value})}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
                  >
                    <option value="">No urgency</option>
                    <option value="limited">Limited spots</option>
                    <option value="price">Price increases</option>
                    <option value="bonus">Bonus expires</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                
                {formData.urgency === 'custom' && (
                  <input
                    value={formData.customUrgency}
                    onChange={(e) => setFormData({...formData, customUrgency: e.target.value})}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
                    placeholder="Custom urgency message..."
                  />
                )}
                
                {formData.urgency && (
                  <div>
                    <label className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={formData.useUrgencyIcon}
                        onChange={(e) => setFormData({...formData, useUrgencyIcon: e.target.checked})}
                        className="rounded"
                      />
                      <span className="text-sm">Show icon</span>
                    </label>
                    {formData.useUrgencyIcon && (
                      <div className="flex gap-1">
                        {urgencyIcons.map(icon => (
                          <button
                            key={icon}
                            onClick={() => setFormData({...formData, urgencyIcon: icon})}
                            className={`p-1 rounded ${
                              formData.urgencyIcon === icon
                                ? 'bg-yellow-950/30 border border-yellow-600'
                                : 'hover:bg-neutral-800'
                            }`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm text-neutral-300 mb-2">Guarantee Items</label>
                  {formData.guaranteeItems.map((item, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input
                        value={item}
                        onChange={(e) => {
                          const newItems = [...formData.guaranteeItems];
                          newItems[i] = e.target.value;
                          setFormData({...formData, guaranteeItems: newItems});
                        }}
                        className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm"
                      />
                      <button
                        onClick={() => {
                          setFormData({
                            ...formData,
                            guaranteeItems: formData.guaranteeItems.filter((_, idx) => idx !== i)
                          });
                        }}
                        className="px-2 text-red-400"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setFormData({...formData, guaranteeItems: [...formData.guaranteeItems, '']})}
                    className="w-full mt-2 py-2 border border-dashed border-neutral-700 rounded text-xs text-green-400"
                  >
                    + Add Item
                  </button>
                </div>
              </>
            )}

            {/* Design Section */}
            {activeSection === 'design' && (
              <>
                <div>
                  <label className="block text-sm text-neutral-300 mb-3">Theme</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(themePresets).slice(0, -1).map(([key, theme]) => (
                      <button
                        key={key}
                        onClick={() => setFormData({...formData, themePreset: key as any})}
                        className={`p-2 rounded-lg border capitalize text-xs ${
                          formData.themePreset === key
                            ? 'border-green-600 bg-green-950/20'
                            : 'border-neutral-700'
                        }`}
                        style={{ backgroundColor: theme.bg, borderWidth: '2px' }}
                      >
                        <span style={{ color: theme.text }}>{key}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-neutral-300 mb-2">Button Color</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: 'green', color: '#16a34a' },
                      { value: 'blue', color: '#2563eb' },
                      { value: 'purple', color: '#7c3aed' },
                      { value: 'red', color: '#dc2626' }
                    ].map(option => (
                      <button
                        key={option.value}
                        onClick={() => setFormData({...formData, color: option.value})}
                        className={`h-12 rounded border-2 ${
                          formData.color === option.value ? 'border-white' : 'border-neutral-700'
                        }`}
                        style={{ backgroundColor: option.color }}
                      />
                    ))}
                  </div>
                </div>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.buttonGradient}
                    onChange={(e) => setFormData({...formData, buttonGradient: e.target.checked})}
                    className="rounded"
                  />
                  <span className="text-sm">Gradient button</span>
                </label>
              </>
            )}

            {/* Layout Section */}
            {activeSection === 'layout' && (
              <div>
                <label className="block text-sm text-neutral-300 mb-3">Page Element Order</label>
                <p className="text-xs text-neutral-500 mb-4">
                  Click arrows up or down to change their order on the page
                </p>
                
                {(() => {
                  const activeElements = formData.elementOrder.filter(element => {
                    if (element === 'hero') return true;
                    if (element === 'video') return !!formData.videoUrl;
                    if (element === 'urgency') return !!formData.urgency;
                    if (element === 'features') return formData.features.some(f => f.trim());
                    if (element === 'testimonial') return !!formData.testimonial;
                    if (element === 'content') return !!formData.content;
                    if (element === 'purchase') return true;
                    return false;
                  });

                  const elementIcons: { [key: string]: string } = {
                    hero: '📝',
                    video: '🎥',
                    urgency: '⏰',
                    features: '✨',
                    testimonial: '💬',
                    content: '📄',
                    purchase: '💳'
                  };

                  return (
                    <div className="space-y-2">
                      {activeElements.map((element, index) => (
                        <div key={element} className="flex items-center gap-3 p-3 bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors">
                          <span className="text-lg">{elementIcons[element]}</span>
                          <span className="flex-1 text-sm text-neutral-200 font-medium">
                            {element === 'hero' ? 'Title & Description' :
                             element === 'video' ? 'Video Section' :
                             element === 'urgency' ? 'Urgency Message' :
                             element === 'features' ? 'Features & Benefits' :
                             element === 'testimonial' ? 'Customer Testimonial' :
                             element === 'content' ? 'Content Preview' :
                             element === 'purchase' ? 'Purchase Button' : element}
                          </span>
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => {
                                const currentIndex = formData.elementOrder.indexOf(element);
                                const prevElement = activeElements[index - 1];
                                if (prevElement) {
                                  const prevIndex = formData.elementOrder.indexOf(prevElement);
                                  setFormData({
                                    ...formData,
                                    elementOrder: moveElement(formData.elementOrder, currentIndex, prevIndex)
                                  });
                                }
                              }}
                              className={`px-3 py-1 text-xs rounded transition-all ${
                                index === 0 
                                  ? 'bg-neutral-900 text-neutral-600 cursor-not-allowed' 
                                  : 'bg-neutral-700 hover:bg-neutral-600 text-white'
                              }`}
                              disabled={index === 0}
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => {
                                const currentIndex = formData.elementOrder.indexOf(element);
                                const nextElement = activeElements[index + 1];
                                if (nextElement) {
                                  const nextIndex = formData.elementOrder.indexOf(nextElement);
                                  setFormData({
                                    ...formData,
                                    elementOrder: moveElement(formData.elementOrder, currentIndex, nextIndex)
                                  });
                                }
                              }}
                              className={`px-3 py-1 text-xs rounded transition-all ${
                                index === activeElements.length - 1
                                  ? 'bg-neutral-900 text-neutral-600 cursor-not-allowed'
                                  : 'bg-neutral-700 hover:bg-neutral-600 text-white'
                              }`}
                              disabled={index === activeElements.length - 1}
                            >
                              ↓
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                
                <div className="mt-4 p-3 bg-blue-950/20 border border-blue-800/30 rounded-lg">
                  <p className="text-xs text-blue-400">
                    💡 Tip: The order changes are applied instantly in the preview
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Live Preview */}
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: currentTheme.bg }}>
          <div className="p-6">
            <div className="mx-auto max-w-3xl">
              {/* Preview Mode Indicator */}
              {previewMode === 'unlocked' && (
                <div className="mb-6 p-3 bg-green-950/20 border border-green-800/30 rounded-lg">
                  <p className="text-green-400 text-sm flex items-center gap-2">
                    <span>✅</span>
                    Viewing post-purchase experience
                  </p>
                </div>
              )}
              
              {/* Render elements in custom order */}
              {formData.elementOrder.map((element: string) => {
                switch(element) {
                  case 'hero':
                    return (
                      <div className="mb-8" key="hero">
                        <h1 className="text-4xl font-bold mb-4" style={{ color: currentTheme.text }}>
                          {formData.title || 'Product Title'}
                        </h1>
                        <p className="text-xl" style={{ color: currentTheme.subtext }}>
                          {formData.description || 'Product description'}
                        </p>
                      </div>
                    );
                  
                  case 'video':
                    return formData.videoUrl ? (
                      <div className="mb-12" key="video">
                        <h2 className="text-2xl font-semibold mb-4" style={{ color: currentTheme.text }}>
                          {formData.videoTitle || 'Watch This First 👇'}
                        </h2>
                        <VideoPreview 
                          embedUrl={getEmbedUrl(formData.videoUrl)}
                          previewMode={previewMode}
                          settings={{
                            ...formData,
                            getEmbedUrl,
                            videoPreviewType: formData.videoPreviewType || 'limited',
                            videoPreviewDuration: formData.videoPreviewDuration || 30
                          }}
                          isCustomizing={true}
                        />
                      </div>
                    ) : null;
                  
                  case 'urgency':
                    return formData.urgency ? (
                      <div className="mb-8 p-4 bg-yellow-950/20 border border-yellow-800/30 rounded-lg" key="urgency">
                        <p className="text-yellow-400 font-medium flex items-center gap-2">
                          {formData.useUrgencyIcon && <span>{formData.urgencyIcon}</span>}
                          {formData.urgency === 'custom' 
                            ? formData.customUrgency
                            : formData.urgency === 'limited' ? 'Limited spots available - only a few left!'
                            : formData.urgency === 'price' ? 'Price increases soon - lock in this rate now'
                            : formData.urgency === 'bonus' ? 'Special bonus expires at midnight tonight'
                            : ''}
                        </p>
                      </div>
                    ) : null;
                  
                  case 'features':
                    return formData.features.filter(f => f).length > 0 ? (
                      <div className="mb-12" key="features">
                        <h2 className="text-2xl font-semibold mb-4" style={{ color: currentTheme.text }}>
                          {formData.featuresTitle}
                        </h2>
                        <div className="rounded-lg p-6 border" style={{ 
                          backgroundColor: currentTheme.cardBg,
                          borderColor: currentTheme.border 
                        }}>
                          <ul className="space-y-3">
                            {formData.features.filter(f => f).map((feature, i) => (
                              <li key={i} className="flex items-start gap-3">
                                <span className="text-green-400 text-xl mt-0.5">✓</span>
                                <span className="text-lg" style={{ color: currentTheme.text }}>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : null;
                  
                  case 'testimonial':
                    return formData.testimonial ? (
                      <div className="mb-8 p-6 rounded-lg border" style={{
                        backgroundColor: currentTheme.cardBg,
                        borderColor: currentTheme.border
                      }} key="testimonial">
                        <p className="text-lg italic mb-2" style={{ color: currentTheme.subtext }}>
                          "{formData.testimonial}"
                        </p>
                        <p className="text-sm" style={{ color: currentTheme.subtext, opacity: 0.7 }}>
                          — Happy Customer
                        </p>
                      </div>
                    ) : null;
                  
                  case 'content':
                    return formData.previewContent ? (
                      <div className="mb-12" key="content">
                        <h2 className="text-2xl font-semibold mb-4" style={{ color: currentTheme.text }}>
                          {previewMode === 'locked' ? 'Content Preview' : 'Full Content'}
                        </h2>
                        <div className="rounded-lg p-6 border" style={{
                          backgroundColor: currentTheme.cardBg,
                          borderColor: currentTheme.border
                        }}>
                          <div className={`prose max-w-none ${
                            formData.themePreset === 'light' || 
                            formData.themePreset === 'cream' || 
                            formData.themePreset === 'mint' 
                              ? 'prose-neutral' 
                              : 'prose-invert prose-purple'
                          }`}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {previewMode === 'locked' ? formData.previewContent : formData.content}
                            </ReactMarkdown>
                          </div>
                          {previewMode === 'locked' && formData.content && formData.content.length > formData.previewContent.length && (
                            <div className="mt-6 p-4 bg-gradient-to-t from-black/20 to-transparent rounded-lg">
                              <p className="text-center" style={{ color: currentTheme.subtext }}>
                                <span className="text-2xl mb-2 block">🔒</span>
                                Full content unlocked after purchase
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null;
                  
                  case 'purchase':
                    return previewMode === 'locked' ? (
                      <div className="rounded-lg p-6 border" style={{
                        backgroundColor: currentTheme.cardBg,
                        borderColor: currentTheme.border
                      }} key="purchase">
                        <div className="text-4xl font-bold mb-2" style={{ color: currentTheme.text }}>
                          ${formData.price}
                        </div>
                        <p className="text-sm mb-4" style={{ color: currentTheme.subtext }}>
                          One-time payment
                        </p>
                        
                        <button 
                          className={`w-full rounded-lg py-4 text-white font-bold text-lg ${
                            formData.buttonGradient
                              ? formData.color === 'green' ? 'bg-gradient-to-r from-green-600 to-emerald-500' :
                                formData.color === 'blue' ? 'bg-gradient-to-r from-blue-600 to-blue-500' :
                                formData.color === 'purple' ? 'bg-gradient-to-r from-purple-600 to-purple-500' :
                                'bg-gradient-to-r from-red-600 to-red-500'
                              : formData.color === 'green' ? 'bg-green-600 hover:bg-green-500' :
                                formData.color === 'blue' ? 'bg-blue-600 hover:bg-blue-500' :
                                formData.color === 'purple' ? 'bg-purple-600 hover:bg-purple-500' :
                                'bg-red-600 hover:bg-red-500'
                          }`}
                        >
                          Get Instant Access →
                        </button>
                        
                        <div className="mt-4 space-y-2 text-sm">
                          {formData.guaranteeItems.filter(item => item).map((item, i) => (
                            <p key={i} className="flex items-center gap-2" style={{ color: currentTheme.subtext }}>
                              <span className="text-green-400">✓</span>
                              {item}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  
                  default:
                    return null;
                }
              }).filter(Boolean)}
              
              {/* Thank You Message for unlocked mode */}
              {previewMode === 'unlocked' && (
                <div className="mt-8 border border-green-800/30 rounded-lg p-6 bg-gradient-to-br from-neutral-900/90 to-green-950/20">
                  <h3 className="text-xl font-semibold mb-2 text-green-400">Thank you for your purchase!</h3>
                  <p className="text-neutral-300">You now have lifetime access to this content.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}