import { useRef, useState, useEffect } from 'react';
import { auth, db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
//Styling Imports
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Video Preview Component
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
  const [timeRemaining, setTimeRemaining] = useState(settings.videoPreviewDuration);
  const videoRef = useRef<HTMLIFrameElement>(null);
  
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (showVideo && previewMode === 'locked' && settings.videoPreviewType === 'limited') {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setShowVideo(false);
            return settings.videoPreviewDuration;
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
    
    // Limited preview of main video
    if (settings.videoPreviewType === 'limited') {
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
                  {settings.videoPreviewDuration}s free preview
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
                    setTimeRemaining(settings.videoPreviewDuration);
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
  }
  
  // Full video for unlocked mode
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

type ContentType = 'text' | 'video' | 'both';
type Step = 'basics' | 'content' | 'preview' | 'customize' | 'success';

export default function NewProduct() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('basics');
  const [saving, setSaving] = useState(false);
  const [productUrl, setProductUrl] = useState('');
  const [contentType, setContentType] = useState<ContentType>('text');
  const [previewStart, setPreviewStart] = useState(0);
  const [previewLength, setPreviewLength] = useState(500);
  
  // Content method states
  const [contentMethod, setContentMethod] = useState<'upload' | 'paste' | 'link'>('upload');
  const [contentLink, setContentLink] = useState('');
  const [fetchingContent, setFetchingContent] = useState(false);
  
  // Preview mode state - moved here from inside the conditional
  const [previewMode, setPreviewMode] = useState<'locked' | 'unlocked'>('locked');

  // File upload states
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [videoRefreshKey, setVideoRefreshKey] = useState(0);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadError, setUploadError] = useState('');

  //References of each section
  const heroRef = useRef<HTMLDivElement>(null);
  const urgencyRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const testimonialRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const purchaseRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);

  // Scroll function
  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
    
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
    previewType: 'auto' as 'auto' | 'custom',
    customPreview: '',
    buttonGradient: false, // gradient off by default
    featuresTitle: 'What\'s Included', // customizable title
    customUrgency: '', // for custom urgency message
    pageTheme: 'dark' as 'dark' | 'light', // theme option
    guaranteeItems: [
      'Secure payment via Stripe',
      'Instant access to content',
      '30-day money-back guarantee'
    ], // editable guarantee items
    elementOrder: ['hero', 'video', 'urgency', 'features', 'testimonial', 'content', 'purchase'], // element ordering
    urgencyIcon: '⏰', // default icon
      useUrgencyIcon: true, // toggle for icon
      // Theme colors - expanded options
      themePreset: 'dark' as 'dark' | 'light' | 'purple' | 'blue' | 'custom',
      customTheme: {
        bg: '#0B0B0D',
        text: '#FFFFFF',
        subtext: '#A0A0A0'
      },
      videoPreviewType: 'limited' as 'separate' | 'limited' | 'none',
      videoPreviewDuration: 10, 
      salesVideoUrl: '',
      videoStartTime: 0, 
      videoThumbnailUrl: '',
      videoTitle: 'Watch This First 👇',
    });

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

  function formatContent(rawText: string): string {
    let formatted = rawText;
    
    // Clean up excessive newlines but preserve intentional spacing
    formatted = formatted.replace(/\n{4,}/g, '\n\n\n');
    
    // Convert Notion-style callouts to markdown blockquotes with emoji markers
    formatted = formatted.replace(/<aside>\s*([🔊💡✍️🎯⚠️ℹ️])\s*([\s\S]*?)<\/aside>/g, '\n> $1 $2\n');
    
    // Extract video URLs and set them
    const videoMatch = formatted.match(/https:\/\/(www\.)?(loom\.com|youtube\.com|youtu\.be|vimeo\.com)[^\s\n]*/);
    if (videoMatch && !formData.videoUrl) {
      setFormData(prev => ({...prev, videoUrl: videoMatch[0]}));
      if (contentType === 'text') {
        setContentType('both');
      }
    }
    
    // Preserve headers as they are
    formatted = formatted.replace(/^#\s+(.+)$/gm, '# $1');
    formatted = formatted.replace(/^##\s+(.+)$/gm, '## $1');
    formatted = formatted.replace(/^###\s+(.+)$/gm, '### $1');
    
    // Convert emoji bullets to markdown lists
    formatted = formatted.replace(/^[•◦▪︎✅❌🔊💡🎯✍️]\s+/gm, '- ');
    
    // Fix numbered lists
    formatted = formatted.replace(/^(\d+)[.)]\s+/gm, '$1. ');
    
    // Ensure horizontal rules are properly formatted
    formatted = formatted.replace(/^-{3,}$/gm, '\n---\n');
    
    // Preserve bold text
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '**$1**');
    
    return formatted;
  }
  async function processUploadedFile(file: File) {
    setIsProcessingFile(true);
    setUploadError('');
    
    try {
      const text = await file.text();
      
      // Check if it's HTML (Notion export)
      if (file.name.endsWith('.html') || text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        // Parse HTML to extract text content
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        
        // Extract text from body, preserving structure
        const bodyContent = doc.body?.innerText || doc.body?.textContent || '';
        const formatted = formatContent(bodyContent);
        setFormData({...formData, content: formatted});
        
      } else if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        // Process as markdown or plain text
        const formatted = formatContent(text);
        setFormData({...formData, content: formatted});
        
      } else {
        setUploadError('Unsupported file type. Please upload .txt, .md, or .html files.');
      }
      
      setUploadedFile(file);
    } catch (error) {
      console.error('Error processing file:', error);
      setUploadError('Error processing file. Please try again.');
    } finally {
      setIsProcessingFile(false);
    }
  }

  function getPreviewContent(): string {
    if (formData.previewType === 'custom' && formData.customPreview) {
      return formData.customPreview;
    }
    return formData.content.substring(previewStart, previewStart + previewLength);
  }

  async function fetchContentFromLink() {
    setFetchingContent(true);
    try {
      alert('For now, please open your link, select all content (Ctrl+A), copy it (Ctrl+C), and paste it below. Direct link import coming soon!');
    } catch (error) {
      alert('Unable to fetch from link. Please copy and paste your content instead.');
    } finally {
      setFetchingContent(false);
    }
  }

  async function publishProduct() {
      if (!auth.currentUser) return;

      setSaving(true);
      try {
        const productsRef = collection(db, 'users', auth.currentUser.uid, 'products');
        const embedUrl = getEmbedUrl(formData.videoUrl);
        
        const docRef = await addDoc(productsRef, {
          title: formData.title,
          price: Math.round(parseFloat(formData.price) * 100),
          description: formData.description,
          content: formData.content || null,
          videoUrl: embedUrl || null,
          features: formData.features.filter(f => f.trim()),
          testimonial: formData.testimonial || null,
          guarantee: formData.guarantee,
          urgency: formData.urgency || null,
          color: formData.color,
          previewContent: getPreviewContent(),
          published: true,
          views: 0,
          sales: 0,
          createdAt: serverTimestamp(),
          videoPreviewType: formData.videoPreviewType,
          salesVideoUrl: formData.salesVideoUrl || null,
          videoPreviewDuration: formData.videoPreviewDuration,
          videoStartTime: formData.videoStartTime,
          videoThumbnailUrl: formData.videoThumbnailUrl || null,
          videoTitle: formData.videoTitle || 'Watch This First 👇',
          themePreset: formData.themePreset,
          customTheme: formData.customTheme,
          buttonGradient: formData.buttonGradient,
          featuresTitle: formData.featuresTitle,
          customUrgency: formData.customUrgency || null,
          pageTheme: formData.pageTheme,
          guaranteeItems: formData.guaranteeItems.filter(item => item.trim()),
          elementOrder: formData.elementOrder,
          urgencyIcon: formData.urgencyIcon,
          useUrgencyIcon: formData.useUrgencyIcon,
          previewType: formData.previewType,
          customPreview: formData.customPreview || null,
        });
      
      const url = `${window.location.origin}/p/${auth.currentUser.uid}/${docRef.id}`;
      setProductUrl(url);
      navigator.clipboard.writeText(url);
      setCurrentStep('success');
      
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Error creating product. Please try again.');
    } finally {
      setSaving(false);
    }
  }
  // Helper function to move elements in an array across the page.
  const moveElement = (arr: string[], fromIndex: number, toIndex: number) => {
    const newArr = [...arr];
    const [element] = newArr.splice(fromIndex, 1);
    newArr.splice(toIndex, 0, element);
    return newArr;
  };

  // Step 1: Basic Information
if (currentStep === 'basics') {
  return (
    <div className="min-h-screen bg-[#0B0B0D] text-neutral-100 p-6">
      <div className="mx-auto max-w-2xl">
        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-8 text-sm text-neutral-500">
          <span className="text-green-400">Step 1 of 5</span>
          <span>→</span>
          <span>Content</span>
          <span>→</span>
          <span>Preview</span>
          <span>→</span>
          <span>Customize</span>
          <span>→</span>
          <span>Launch</span>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">What are you selling?</h1>
          <p className="text-neutral-400">Just the basics - takes 30 seconds</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm text-neutral-300 mb-2">Product Name</label>
            <input
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 focus:border-green-600 focus:outline-none transition-colors"
              placeholder="e.g., 10 Cold Email Templates That Convert"
              maxLength={100}
            />
            <p className="text-xs text-neutral-500 mt-1">{formData.title.length}/100</p>
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-2">Price (USD)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 pl-8 pr-4 py-3 focus:border-green-600 focus:outline-none transition-colors"
                placeholder="10"
                min="1"
                max="9999"
              />
            </div>
            {/* Quick price suggestions */}
            <div className="flex gap-2 mt-2">
              <span className="text-xs text-neutral-500">Popular prices:</span>
              {['5', '10', '15', '25', '50'].map(price => (
                <button
                  key={price}
                  type="button"
                  onClick={() => setFormData({...formData, price})}
                  className="text-xs px-2 py-1 rounded border border-neutral-800 hover:border-green-600 hover:text-green-400 transition-colors"
                >
                  ${price}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-2">
              What problem does this solve?
              <span className="text-neutral-500 text-xs ml-2">(your sales pitch)</span>
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 focus:border-green-600 focus:outline-none transition-colors resize-none"
              placeholder="Help your customers understand why they need this..."
              maxLength={300}
            />
            <p className="text-xs text-neutral-500 mt-1">{formData.description.length}/300</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm text-neutral-300">
                Key Benefits
                <span className="text-neutral-500 text-xs ml-2">(at least 1)</span>
              </label>
              {formData.features.filter(f => f.trim()).length < 5 && (
                <button
                  type="button"
                  onClick={() => setFormData({...formData, features: [...formData.features, '']})}
                  className="text-xs text-green-400 hover:text-green-300"
                >
                  + Add benefit
                </button>
              )}
            </div>
            {formData.features.map((feature, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={feature}
                  onChange={(e) => {
                    const newFeatures = [...formData.features];
                    newFeatures[i] = e.target.value;
                    setFormData({...formData, features: newFeatures});
                  }}
                  className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2 focus:border-green-600 focus:outline-none transition-colors"
                  placeholder={`Benefit ${i + 1}`}
                  maxLength={100}
                />
                {formData.features.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newFeatures = formData.features.filter((_, index) => index !== i);
                      setFormData({...formData, features: newFeatures});
                    }}
                    className="px-3 py-2 rounded-lg border border-neutral-700 hover:border-red-600 hover:text-red-400 transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => setCurrentStep('content')}
            disabled={!formData.title || !formData.description || !formData.features.some(f => f.trim())}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-green-500 hover:to-emerald-500 transition-all"
          >
            Next: Add Your Content →
          </button>

          {/* Helpful tip */}
          <div className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-800">
            <p className="text-xs text-neutral-400">
              💡 <span className="text-neutral-300">Pro tip:</span> Keep your title under 50 characters and focus on the transformation or result your product delivers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

  // Step 2: Content
  if (currentStep === 'content') {
    return (
      <div className="min-h-screen bg-[#0B0B0D] text-neutral-100 p-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Step 2: Your Content</h1>
            <p className="text-neutral-400">What are you delivering to customers?</p>
          </div>

          <div className="space-y-6">
            <div className="bg-neutral-950/50 rounded-lg p-4 border border-neutral-700">
              <p className="text-sm text-neutral-300 mb-3">Content Type</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setContentType('text')}
                  className={`p-3 rounded-lg border text-center ${
                    contentType === 'text' 
                      ? 'border-green-600 bg-green-950/20 text-green-400' 
                      : 'border-neutral-700 hover:bg-neutral-800'
                  }`}
                >
                  <div className="text-2xl mb-1">📝</div>
                  <div className="text-xs">Text Only</div>
                </button>
                <button
                  onClick={() => setContentType('video')}
                  className={`p-3 rounded-lg border text-center ${
                    contentType === 'video' 
                      ? 'border-green-600 bg-green-950/20 text-green-400' 
                      : 'border-neutral-700 hover:bg-neutral-800'
                  }`}
                >
                  <div className="text-2xl mb-1">🎥</div>
                  <div className="text-xs">Video Only</div>
                </button>
                <button
                  onClick={() => setContentType('both')}
                  className={`p-3 rounded-lg border text-center ${
                    contentType === 'both' 
                      ? 'border-green-600 bg-green-950/20 text-green-400' 
                      : 'border-neutral-700 hover:bg-neutral-800'
                  }`}
                >
                  <div className="text-2xl mb-1">🎯</div>
                  <div className="text-xs">Both</div>
                </button>
              </div>
            </div>

            {(contentType === 'video' || contentType === 'both') && (
              <div>
                <label className="block text-sm text-neutral-300 mb-2">Video URL</label>
                <input
                  type="url"
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({...formData, videoUrl: e.target.value})}
                  placeholder="YouTube, Loom, or Vimeo link"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3"
                />
              </div>
            )}

            {(contentType === 'text' || contentType === 'both') && (
              <div>
                <label className="block text-sm text-neutral-300 mb-3">How will you add your content?</label>
                
                {/* Three-option cards */}
                <div className="grid grid-cols-1 gap-3 mb-6">
                  {/* Upload File Option */}
                  <button
                    onClick={() => setContentMethod('upload')}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      contentMethod === 'upload'
                        ? 'border-green-600 bg-green-950/20'
                        : 'border-neutral-700 hover:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">📁</span>
                      <div>
                        <div className="font-medium mb-1">Upload File</div>
                        <div className="text-xs text-neutral-400">
                          Import from Notion, Google Docs, or any .md/.txt file
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Paste Content Option */}
                  <button
                    onClick={() => setContentMethod('paste')}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      contentMethod === 'paste'
                        ? 'border-green-600 bg-green-950/20'
                        : 'border-neutral-700 hover:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">📝</span>
                      <div>
                        <div className="font-medium mb-1">Paste Content</div>
                        <div className="text-xs text-neutral-400">
                          Copy and paste your content directly
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* External Link Option */}
                  <button
                    onClick={() => setContentMethod('link')}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      contentMethod === 'link'
                        ? 'border-green-600 bg-green-950/20'
                        : 'border-neutral-700 hover:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">🔗</span>
                      <div>
                        <div className="font-medium mb-1">External Link</div>
                        <div className="text-xs text-neutral-400">
                          Redirect customers to your existing product page
                        </div>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Content input area based on selected method */}
                {contentMethod === 'upload' && (
                  <div>
                    {/* File upload area */}
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        isProcessingFile 
                          ? 'border-green-600 bg-green-950/10' 
                          : 'border-neutral-700 hover:border-neutral-600'
                      }`}
                    >
                      <input
                        type="file"
                        id="file-upload"
                        accept=".txt,.md,.html"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) processUploadedFile(file);
                        }}
                        className="hidden"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        {isProcessingFile ? (
                          <>
                            <div className="text-3xl mb-2">⏳</div>
                            <p className="text-neutral-300">Processing file...</p>
                          </>
                        ) : uploadedFile ? (
                          <>
                            <div className="text-3xl mb-2 text-green-400">✓</div>
                            <p className="text-green-400 font-medium">{uploadedFile.name}</p>
                            <p className="text-xs text-neutral-400 mt-1">
                              {formData.content.split(/\s+/).length} words imported
                            </p>
                            <p className="text-xs text-neutral-500 mt-2">
                              Click to upload a different file
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="text-3xl mb-2">⬆️</div>
                            <p className="text-neutral-300 mb-1">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-neutral-500">
                              Supports .txt, .md, and .html files (Notion exports)
                            </p>
                          </>
                        )}
                      </label>
                    </div>
                    {uploadError && (
                      <p className="text-red-400 text-sm mt-2">{uploadError}</p>
                    )}
                    
                    {/* Show content preview if file was uploaded */}
                    {formData.content && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm text-neutral-300">Content Preview</label>
                          <button
                            onClick={() => setContentMethod('paste')}
                            className="text-xs text-green-400 hover:text-green-300"
                          >
                            Edit manually →
                          </button>
                        </div>
                        <div className="bg-neutral-950 rounded-lg p-4 border border-neutral-800 max-h-48 overflow-y-auto">
                          <pre className="text-xs text-neutral-400 whitespace-pre-wrap font-mono">
                            {formData.content.substring(0, 500)}
                            {formData.content.length > 500 && '...'}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}

    {contentMethod === 'paste' && (
      <>
        <textarea
          rows={12}
          value={formData.content.startsWith('[REDIRECT:') ? '' : formData.content}
          onChange={(e) => setFormData({...formData, content: e.target.value})}
          onPaste={(e) => {
            e.preventDefault();
            const pastedText = e.clipboardData.getData('text');
            const formatted = formatContent(pastedText);
            setFormData({...formData, content: formatted});
          }}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 font-mono text-sm focus:border-green-600 focus:outline-none transition-colors"
          placeholder="Paste or type your content here..."
        />
        {formData.content && !formData.content.startsWith('[REDIRECT:') && (
          <p className="text-xs text-green-500 mt-1">
            ✓ {formData.content.split(/\s+/).length} words will be hosted on LaunchPad
          </p>
        )}
      </>
    )}

    {contentMethod === 'link' && (
      <div className="space-y-3">
        <div className="bg-yellow-950/20 border border-yellow-800/30 rounded-lg p-3">
          <p className="text-xs text-yellow-400">
            🔗 Redirect Mode: Customers will be sent to your external link after payment
          </p>
        </div>
        <input
          type="url"
          value={contentLink}
          onChange={(e) => {
            setContentLink(e.target.value);
            setFormData({...formData, content: `[REDIRECT:${e.target.value}]`});
          }}
          placeholder="https://your-product-link.com"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 focus:border-green-600 focus:outline-none transition-colors"
        />
        <p className="text-xs text-neutral-500">
          Examples: Gumroad link, Google Drive link, Notion page, your website
        </p>
      </div>
    )}
  </div>
)}

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep('basics')}
                className="flex-1 py-3 rounded-lg border border-neutral-700 hover:bg-neutral-800"
              >
                ← Back
              </button>
              <button
                onClick={() => setCurrentStep('preview')}
                disabled={
                  (contentType === 'text' && !formData.content) ||
                  (contentType === 'video' && !formData.videoUrl) ||
                  (contentType === 'both' && !formData.content && !formData.videoUrl)
                }
                className="flex-1 py-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium disabled:opacity-50"
              >
                Preview Your Page →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Live Preview
  if (currentStep === 'preview') {
    //Theme setting
    const embedUrl = getEmbedUrl(formData.videoUrl);
  
    // Add theme presets here too
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

    // Note: previewMode state is now declared at the top of the component
    
    return (
      <div className="min-h-screen" style={{ backgroundColor: currentTheme.bg, color: currentTheme.text }}>
        {/* Control Bar */}
        <div className="sticky top-0 z-10 bg-neutral-900 border-b border-neutral-800 p-4">
          <div className="mx-auto max-w-6xl flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="font-bold">Live Preview</h2>
                <p className="text-xs text-neutral-400">
                  {previewMode === 'locked' ? 'Customer view (before purchase)' : 'Full content (after purchase)'}
                </p>
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
                  🔒 Sales Page
                </button>
                <button
                  onClick={() => setPreviewMode('unlocked')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    previewMode === 'unlocked' 
                      ? 'bg-neutral-700 text-white' 
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Full Content
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep('customize')}
                className="px-4 py-2 rounded-lg border border-neutral-700 hover:bg-neutral-800"
              >
                Customize Preview
              </button>
              <button
                onClick={() => setCurrentStep('content')}
                className="px-4 py-2 rounded-lg border border-neutral-700 hover:bg-neutral-800"
              >
                Edit Content
              </button>
              <button
                onClick={publishProduct}
                disabled={saving}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium"
              >
                {saving ? 'Publishing...' : 'Publish Live 🚀'}
              </button>
            </div>
          </div>
        </div>

        {/* Preview Content */}
        <div className="p-6" style={{ backgroundColor: currentTheme.bg }}>
          <div className="mx-auto max-w-4xl">
            {/* Show this banner only in unlocked mode */}
            {previewMode === 'unlocked' && (
              <div className="mb-8 p-4 bg-green-950/20 border border-green-800/30 rounded-lg">
                <p className="text-green-400 font-medium flex items-center gap-2">
                  <span>✅</span>
                  This is what customers see after purchasing
                </p>
              </div>
            )}
            
            {/* Render elements in custom order */}
            {formData.elementOrder.map(element => {
              switch(element) {
                case 'hero':
                return (
                  <div className="mb-8" key="hero">
                    <h1 className="text-4xl font-bold mb-4" style={{ color: currentTheme.text }}>{formData.title}</h1>
                    <p className="text-xl" style={{ color: currentTheme.subtext }}>{formData.description}</p>
                  </div>
                );
                  
                case 'video':
                return embedUrl ? (
                  <div className="mb-12" key="video">
                    <h2 className="text-2xl font-semibold mb-4" style={{ color: currentTheme.text }}>
                      {formData.videoTitle || 'Watch This First 👇'}
                    </h2>
                    <VideoPreview 
                      embedUrl={embedUrl} 
                      previewMode={previewMode} 
                      settings={{...formData, getEmbedUrl}} 
                    />
                  </div>
                ) : null;
                  
                case 'urgency':
                  return (formData.urgency && previewMode === 'locked') ? (
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
                      {formData.featuresTitle || "What's Included"}
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
                  return (formData.testimonial && previewMode === 'locked') ? (
                    <div className="mb-8 p-6 bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-lg border border-neutral-800" key="testimonial">
                      <p className="text-lg italic text-neutral-300 mb-2">"{formData.testimonial}"</p>
                      <p className="text-sm text-neutral-500">— Happy Customer</p>
                    </div>
                  ) : null;
                  
                case 'content':
                  return formData.content ? (
                    <div className="mb-12" key="content">
                      <h2 className="text-2xl font-semibold mb-4">
                        {previewMode === 'locked' ? 'Content Preview' : 'Full Content'}
                      </h2>
                      <div className="border border-neutral-800 rounded-lg p-6 bg-neutral-900/50">
                        {formData.content.startsWith('[REDIRECT:') ? (
                          <div className="text-center py-8">
                            <span className="text-4xl mb-4 block">🔗</span>
                            <p className="text-xl text-neutral-300 mb-2">External Product</p>
                            <p className="text-sm text-neutral-500">
                              {previewMode === 'locked' 
                                ? 'After payment, customers will be redirected to your product'
                                : `Redirect URL: ${formData.content.replace('[REDIRECT:', '').replace(']', '')}`}
                            </p>
                          </div>
                        ) : (
                          <>
                            {previewMode === 'locked' ? (
                              <>
                                <div className="prose prose-invert prose-purple max-w-none">
                                  <ReactMarkdown 
                                    remarkPlugins={[remarkGfm]}
                                  >
                                    {getPreviewContent()}
                                  </ReactMarkdown>
                                </div>
                                {formData.content.length > previewLength && (
                                  <div className="mt-6 p-4 bg-gradient-to-t from-neutral-950 to-transparent rounded-lg">
                                    <p className="text-center text-neutral-400">
                                      <span className="text-2xl mb-2 block">🔒</span>
                                      Full content unlocked after purchase
                                      <span className="block text-xs mt-1">
                                        ({Math.round(formData.content.length / 5)} words of content)
                                      </span>
                                    </p>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="max-h-[600px] overflow-y-auto prose prose-invert prose-purple max-w-none">
                                <ReactMarkdown 
                                  remarkPlugins={[remarkGfm]}
                                >
                                  {formData.content}
                                </ReactMarkdown>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ) : null;
                  
                case 'purchase':
                  return previewMode === 'locked' ? (
                    <div className={`border rounded-lg p-6 bg-gradient-to-br from-neutral-900/90 to-${formData.color}-950/20 border-${formData.color}-800/30`} key="purchase">
                      <div className="text-4xl font-bold mb-2">
                        ${formData.price}
                      </div>
                      <p className="text-sm text-neutral-400 mb-4">One-time payment</p>
                      
                      <button 
                        className={`w-full rounded-lg bg-gradient-to-r from-${formData.color}-600 to-${formData.color === 'green' ? 'emerald' : formData.color}-500 py-4 text-white font-bold text-lg`}
                      >
                        Get Instant Access →
                      </button>
                      
                      <div className="mt-4 space-y-2 text-sm text-neutral-400">
                        {formData.guaranteeItems.filter(item => item).map((item, i) => (
                          <p key={i} className="flex items-center gap-2">
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

            {/* Thank You Message - Only show in unlocked mode */}
            {previewMode === 'unlocked' && (
              <div className="border border-green-800/30 rounded-lg p-6 bg-gradient-to-br from-neutral-900/90 to-green-950/20">
                <h3 className="text-xl font-semibold mb-2 text-green-400">Thank you for your purchase!</h3>
                <p className="text-neutral-300">You now have lifetime access to this content.</p>
              </div>
            )}

            {/* What Happens Next - Only in locked mode */}
            {/* {previewMode === 'locked' && (
              <div className="mt-12 p-6 bg-neutral-900/50 rounded-lg border border-neutral-800">
                <h3 className="text-xl font-semibold mb-4">What Happens After You Buy?</h3>
                <ol className="space-y-3 text-neutral-300">
                  <li className="flex gap-3">
                    <span className="text-green-400 font-bold">1.</span>
                    <span>Secure checkout through Stripe (takes 30 seconds)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-green-400 font-bold">2.</span>
                    <span>
                      {formData.content.startsWith('[REDIRECT:') 
                        ? 'Instant redirect to your product page' 
                        : 'Instant access to all content (no waiting)'}
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-green-400 font-bold">3.</span>
                    <span>Lifetime access - review anytime you want</span>
                  </li>
                </ol>
              </div>
            )} */}
          </div>
        </div>
      </div>
    );
  }
  // Step 4: Customize Preview
  if (currentStep === 'customize') {
    const embedUrl = getEmbedUrl(formData.videoUrl);
    
    // Theme presets
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
    
    // Element labels (more user-friendly)
    const elementLabels: { [key: string]: string } = {
      hero: 'Title & Description',
      urgency: 'Urgency Message',
      features: 'Benefits Section',
      testimonial: 'Customer Quote',
      content: 'Content Preview',
      purchase: 'Purchase Button',
      video: 'Video Section' 
    };
    
    // Urgency icon options
    const urgencyIcons = ['⏰', '🔥', '⚡', '🚨', '💥', '⭐', '🎯', '📢'];
    
    // Edit sections as components
    const editSections: { [key: string]: JSX.Element } = {
      hero: (
        <div className="space-y-3" key="hero-edit">
          <h3 className="text-sm font-semibold text-neutral-300">Basic Information</h3>
          
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Product Name</label>
            <input
              value={formData.title}
              onChange={(e) => {
                setFormData({...formData, title: e.target.value});
                scrollToSection(heroRef);
              }}
              className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Price (USD)</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => {
                setFormData({...formData, price: e.target.value});
                scrollToSection(purchaseRef);
              }}
              className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Description</label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => {
                setFormData({...formData, description: e.target.value});
                scrollToSection(heroRef);
              }}
              className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm resize-none text-white"
            />
          </div>
        </div>
      ),

      video: (
      <div className="space-y-3" key="video-edit">
        <h3 className="text-sm font-semibold text-neutral-300">
          Video Section
          {!formData.videoUrl && (
            <span className="text-xs font-normal text-neutral-500 ml-2">(optional - increases engagement)</span>
          )}
        </h3>
        
        {!formData.videoUrl ? (
          <>
            <div className="p-3 bg-neutral-900/50 rounded-lg border border-dashed border-neutral-700 text-xs text-neutral-400">
              💡 Add a video to demonstrate your product or explain its value
            </div>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Video URL</label>
              <input
                type="url"
                value={formData.videoUrl}
                onChange={(e) => {
                  setFormData({...formData, videoUrl: e.target.value});
                  if (e.target.value) scrollToSection(videoRef);
                }}
                className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm text-white"
                placeholder="YouTube, Loom, or Vimeo link"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Video Section Title</label>
              <input
                value={formData.videoTitle}
                onChange={(e) => {
                  setFormData({...formData, videoTitle: e.target.value});
                  scrollToSection(videoRef);
                }}
                className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm text-white"
                placeholder="e.g., Watch This First 👇"
              />
              <p className="text-xs text-neutral-500 mt-1">
                The heading that appears above your video
              </p>
            </div>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Main Video URL</label>
              <input
                type="url"
                value={formData.videoUrl}
                onChange={(e) => {
                  setFormData({...formData, videoUrl: e.target.value});
                  scrollToSection(videoRef);
                }}
                className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm text-white"
                placeholder="YouTube, Loom, or Vimeo link"
              />
              <p className="text-xs text-neutral-400 bg-neutral-800/50 rounded p-2 mb-3">
                ℹ️ This is your main content video that customers get full access to after purchase. 
                Below, you can control what they see on the sales page before purchasing.
              </p>
              {formData.videoUrl && (
                <button
                  onClick={() => setFormData({...formData, videoUrl: ''})}
                  className="text-xs text-red-400 hover:text-red-300 mt-1"
                >
                  Remove video
                </button>
              )}
            </div>
            
            
            {/* Preview Type Selection */}
            <div>
            <label className="text-xs text-neutral-400 mb-2 block">Sales Page Preview Setting</label>
            <p className="text-xs text-neutral-500 mb-2">How should the video appear BEFORE purchase?</p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setFormData({...formData, videoPreviewType: 'limited'});
                  scrollToSection(videoRef);
                }}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  formData.videoPreviewType === 'limited'
                    ? 'border-green-600 bg-green-950/20'
                    : 'border-neutral-700 hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg">⏱️</span>
                  <div>
                    <div className="font-medium text-sm">Limited Preview (Recommended)</div>
                    <div className="text-xs text-neutral-400">
                      Show first {formData.videoPreviewDuration} seconds of your content video
                    </div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => {
                  setFormData({...formData, videoPreviewType: 'separate'});
                  scrollToSection(videoRef);
                }}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  formData.videoPreviewType === 'separate'
                    ? 'border-green-600 bg-green-950/20'
                    : 'border-neutral-700 hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg">🎬</span>
                  <div>
                    <div className="font-medium text-sm">Different Sales Video</div>
                    <div className="text-xs text-neutral-400">
                      Upload a separate trailer/pitch video for the sales page
                    </div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => {
                  setFormData({...formData, videoPreviewType: 'none'});
                  scrollToSection(videoRef);
                }}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  formData.videoPreviewType === 'none'
                    ? 'border-green-600 bg-green-950/20'
                    : 'border-neutral-700 hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg">🔒</span>
                  <div>
                    <div className="font-medium text-sm">No Preview</div>
                    <div className="text-xs text-neutral-400">
                      Video is completely hidden until purchase
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
            
            {/* Separate Sales Video URL */}
            {formData.videoPreviewType === 'separate' && (
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Sales/Trailer Video URL</label>
                <input
                  type="url"
                  value={formData.salesVideoUrl}
                  onChange={(e) => {
                    setFormData({...formData, salesVideoUrl: e.target.value});
                    scrollToSection(videoRef);
                  }}
                  className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
                  placeholder="YouTube, Loom, or Vimeo link for your trailer"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  This video will be shown instead of your main content
                </p>
              </div>
            )}
            
            {/* Limited Preview Settings */}
            
            {formData.videoPreviewType === 'limited' && (
              <>
                <div>
                  <label className="text-xs text-neutral-400 mb-2 block">
                    Preview Duration: {formData.videoPreviewDuration} seconds
                  </label>
                  <input
                    type="range"
                    value={formData.videoPreviewDuration}
                    onChange={(e) => {
                      setFormData({...formData, videoPreviewDuration: Number(e.target.value)});
                      scrollToSection(videoRef);
                    }}
                    min={10}
                    max={120}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-neutral-500 mt-1">
                    <span>10s</span>
                    <span>60s</span>
                    <span>120s</span>
                  </div>
                </div>
                
                {/* Add refresh button here */}
                {/* Refresh button removed - no longer needed without start time */}
                
                {/* Start time input removed - preview always starts from beginning */}
                
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">
                    Video Thumbnail URL
                    <span className="text-neutral-500 ml-1">(optional)</span>
                  </label>
                  <input
                    type="url"
                    value={formData.videoThumbnailUrl}
                    onChange={(e) => {
                      setFormData({...formData, videoThumbnailUrl: e.target.value});
                      scrollToSection(videoRef);
                    }}
                    className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
                    placeholder="https://example.com/thumbnail.jpg"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Custom thumbnail shown before preview starts
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </div>
    ),
      
      urgency: (
        <div className="space-y-3" key="urgency-edit">
          <h3 className="text-sm font-semibold text-neutral-300">
            Urgency Message 
            <span className="text-xs font-normal text-neutral-500 ml-2">(optional - increases conversions)</span>
          </h3>
          
          {!formData.urgency && (
            <div className="p-3 bg-neutral-900/50 rounded-lg border border-dashed border-neutral-700 text-xs text-neutral-400">
              💡 Add urgency to create FOMO and drive sales
            </div>
          )}
          
          <select
            value={formData.urgency}
            onChange={(e) => {
              setFormData({...formData, urgency: e.target.value});
              if (e.target.value) scrollToSection(urgencyRef);
            }}
            className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm text-white"
          >
            <option value="">No urgency</option>
            <option value="limited">Limited spots available</option>
            <option value="price">Price increases soon</option>
            <option value="bonus">Bonus expires today</option>
            <option value="custom">Custom message...</option>
          </select>

          {formData.urgency && (
            <>
              <div>
                <label className="text-xs text-neutral-400 mb-2 block">Icon</label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.useUrgencyIcon}
                      onChange={(e) => setFormData({...formData, useUrgencyIcon: e.target.checked})}
                      className="rounded"
                    />
                    <span className="text-xs">Show icon</span>
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
              </div>

              {formData.urgency === 'custom' && (
                <input
                  value={formData.customUrgency}
                  onChange={(e) => {
                    setFormData({...formData, customUrgency: e.target.value});
                    scrollToSection(urgencyRef);
                  }}
                  className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm text-white"
                  placeholder="Enter custom urgency message..."
                />
              )}
            </>
          )}
        </div>
      ),
      
      features: (
        <div className="space-y-3" key="features-edit">
          <h3 className="text-sm font-semibold text-neutral-300">Benefits Section</h3>
          
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Section Title</label>
            <input
              value={formData.featuresTitle}
              onChange={(e) => {
                setFormData({...formData, featuresTitle: e.target.value});
                scrollToSection(featuresRef);
              }}
              className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm text-white"
              placeholder="What's Included"
            />
          </div>

          <div>
            <label className="text-xs text-neutral-400 mb-2 block">Benefits</label>
            {formData.features.map((feature, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  value={feature}
                  onChange={(e) => {
                    const newFeatures = [...formData.features];
                    newFeatures[i] = e.target.value;
                    setFormData({...formData, features: newFeatures});
                    scrollToSection(featuresRef);
                  }}
                  className="flex-1 rounded bg-neutral-900 border border-neutral-700 px-3 py-1.5 text-sm text-white"
                  placeholder={`Benefit ${i + 1}`}
                />
                {formData.features.length > 1 && (
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
                )}
              </div>
            ))}
            <button
              onClick={() => {
                setFormData({...formData, features: [...formData.features, '']});
                scrollToSection(featuresRef);
              }}
              className="w-full mt-2 py-2 border border-dashed border-neutral-700 rounded text-xs text-green-400 hover:border-green-600 hover:bg-green-950/20"
            >
              + Add Benefit
            </button>
          </div>
        </div>
      ),
      
      testimonial: (
        <div className="space-y-3" key="testimonial-edit">
          <h3 className="text-sm font-semibold text-neutral-300">
            Customer Testimonial
            <span className="text-xs font-normal text-neutral-500 ml-2">(optional - builds trust)</span>
          </h3>
          
          {!formData.testimonial && (
            <div className="p-3 bg-neutral-900/50 rounded-lg border border-dashed border-neutral-700 text-xs text-neutral-400">
              💡 Add a customer quote to build credibility
            </div>
          )}
          
          <textarea
            rows={3}
            value={formData.testimonial}
            onChange={(e) => {
              setFormData({...formData, testimonial: e.target.value});
              if (e.target.value) scrollToSection(testimonialRef);
            }}
            className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm text-white resize-none"
            placeholder="Add a customer quote to build trust..."
          />
        </div>
      ),
      
      content: (
        <div className="space-y-3" key="content-edit">
          <h3 className="text-sm font-semibold text-neutral-300">Content Preview</h3>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setFormData({...formData, previewType: 'auto'});
                scrollToSection(contentRef);
              }}
              className={`p-2 rounded border text-xs ${
                formData.previewType === 'auto'
                  ? 'border-green-600 bg-green-950/20'
                  : 'border-neutral-700 hover:bg-neutral-800'
              }`}
            >
              Automatic
            </button>
            <button
              onClick={() => {
                setFormData({...formData, previewType: 'custom'});
                scrollToSection(contentRef);
              }}
              className={`p-2 rounded border text-xs ${
                formData.previewType === 'custom'
                  ? 'border-green-600 bg-green-950/20'
                  : 'border-neutral-700 hover:bg-neutral-800'
              }`}
            >
              Custom
            </button>
          </div>

          {formData.previewType === 'auto' && formData.content && !formData.content.startsWith('[REDIRECT:') && (
            <div className="mt-3">
              <label className="text-xs text-neutral-400 block mb-2">
                Preview length: {previewLength} characters
              </label>
              <input
                type="range"
                value={previewLength}
                onChange={(e) => {
                  setPreviewLength(Number(e.target.value));
                  scrollToSection(contentRef);
                }}
                min={100}
                max={1000}
                step={50}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-neutral-500 mt-1">
                <span>Short</span>
                <span>Long</span>
              </div>
            </div>
          )}

          {formData.previewType === 'custom' && (
            <div className="mt-3">
              <label className="text-xs text-neutral-400 block mb-2">
                Custom preview text
              </label>
              <textarea
                rows={4}
                value={formData.customPreview}
                onChange={(e) => {
                  setFormData({...formData, customPreview: e.target.value});
                  scrollToSection(contentRef);
                }}
                className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm text-white resize-none"
                placeholder="Write what customers see before purchasing..."
              />
              <p className="text-xs text-neutral-500 mt-1">
                {formData.customPreview ? `${formData.customPreview.length} characters` : 'Preview will show placeholder text'}
              </p>
            </div>
          )}

          {!formData.content && (
            <div className="p-3 bg-neutral-900/50 rounded-lg border border-dashed border-neutral-700 text-xs text-neutral-400">
              💡 Add content in Step 2 to customize the preview
            </div>
          )}
        </div>
      ),
      
      purchase: (
        <div className="space-y-3" key="purchase-edit">
          <h3 className="text-sm font-semibold text-neutral-300">Purchase Section</h3>
          
          <div>
            <label className="text-xs text-neutral-400 mb-2 block">Button Color</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 'green', color: '#16a34a' },
                { value: 'blue', color: '#2563eb' },
                { value: 'purple', color: '#7c3aed' },
                { value: 'red', color: '#dc2626' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    setFormData({...formData, color: option.value});
                    scrollToSection(purchaseRef);
                  }}
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
              onChange={(e) => {
                setFormData({...formData, buttonGradient: e.target.checked});
                scrollToSection(purchaseRef);
              }}
              className="rounded"
            />
            <span className="text-xs">Use gradient effect</span>
          </label>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs text-neutral-400">Guarantee Items</label>
              <button
                onClick={() => {
                  setFormData({
                    ...formData,
                    guaranteeItems: [...formData.guaranteeItems, '']
                  });
                  scrollToSection(purchaseRef);
                }}
                className="text-xs text-green-400 hover:text-green-300"
              >
                + Add
              </button>
            </div>
            {formData.guaranteeItems.map((item, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  value={item}
                  onChange={(e) => {
                    const newItems = [...formData.guaranteeItems];
                    newItems[i] = e.target.value;
                    setFormData({...formData, guaranteeItems: newItems});
                    scrollToSection(purchaseRef);
                  }}
                  className="flex-1 rounded bg-neutral-900 border border-neutral-700 px-3 py-1.5 text-sm text-white"
                  placeholder="Guarantee item"
                />
                <button
                  onClick={() => {
                    setFormData({
                      ...formData,
                      guaranteeItems: formData.guaranteeItems.filter((_, idx) => idx !== i)
                    });
                  }}
                  className="px-2 text-red-400 hover:text-red-300"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )
    };
    
    // Element map for rendering on the right
    const elementMap: { [key: string]: JSX.Element | null } = {
      hero: (
        <div ref={heroRef} className="mb-8" key="hero">
          <h1 className="text-4xl font-bold mb-4" style={{ color: currentTheme.text }}>
            {formData.title || 'Product Title'}
          </h1>
          <p className="text-xl" style={{ color: currentTheme.subtext }}>
            {formData.description || 'Product description'}
          </p>
        </div>
      ),
       // In the elementMap video section for Customize (around line 2107):
        video: embedUrl ? (
        <div ref={videoRef} className="mb-12" key="video">
          <h2 className="text-2xl font-semibold mb-4" style={{ color: currentTheme.text }}>
            {formData.videoTitle || 'Watch This First 👇'}
          </h2>
          
          {formData.videoPreviewType === 'limited' ? (
            // Show the actual video preview
            <VideoPreview 
              key={videoRefreshKey}
              embedUrl={embedUrl} 
              previewMode="locked"
              settings={{...formData, getEmbedUrl}}
            />
          ) : formData.videoPreviewType === 'none' ? (
            <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800 flex items-center justify-center">
              <div className="text-center p-8">
                <span className="text-5xl mb-4 block">🔒</span>
                <p className="text-xl text-neutral-300 mb-2">Premium Video Content</p>
                <p className="text-sm text-neutral-500">Preview disabled - video hidden until purchase</p>
              </div>
            </div>
          ) : formData.videoPreviewType === 'separate' && formData.salesVideoUrl ? (
            <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
              <iframe
                src={getEmbedUrl(formData.salesVideoUrl)}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Sales Video Preview"
              />
            </div>
          ) : (
            <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800 flex items-center justify-center">
              <p className="text-neutral-400">Add a sales video URL to see preview</p>
            </div>
          )}
        </div>
      ) : null,
      urgency: formData.urgency ? (
        <div ref={urgencyRef} className="mb-8 p-4 bg-yellow-950/20 border border-yellow-800/30 rounded-lg" key="urgency">
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
      ) : null,
      features: formData.features.filter(f => f).length > 0 ? (
        <div ref={featuresRef} className="mb-12" key="features">
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
      ) : null,
      testimonial: formData.testimonial ? (
        <div ref={testimonialRef} className="mb-8 p-6 rounded-lg border" style={{
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
      ) : null,
      content: formData.content && !formData.content.startsWith('[REDIRECT:') ? (
        <div ref={contentRef} className="mb-12" key="content">
          <h2 className="text-2xl font-semibold mb-4" style={{ color: currentTheme.text }}>
            Content Preview
          </h2>
          <div className="rounded-lg p-6 border" style={{
            backgroundColor: currentTheme.cardBg,
            borderColor: currentTheme.border
          }}>
            <div 
              className={`prose max-w-none ${
                formData.themePreset === 'light' || 
                formData.themePreset === 'cream' || 
                formData.themePreset === 'mint' 
                  ? 'prose-neutral' 
                  : 'prose-invert prose-purple'
              }`}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {formData.previewType === 'custom' 
                  ? (formData.customPreview || '[Your custom preview text will appear here]')
                  : getPreviewContent()}
              </ReactMarkdown>
            </div>
            {formData.content.length > previewLength && formData.previewType !== 'custom' && (
              <div className="mt-6 p-4 bg-gradient-to-t from-black/20 to-transparent rounded-lg">
                <p className="text-center" style={{ color: currentTheme.subtext }}>
                  <span className="text-2xl mb-2 block">🔒</span>
                  Full content unlocked after purchase
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null,
      purchase: (
        <div ref={purchaseRef} className="rounded-lg p-6 border" style={{
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
      ),
    };
    
    return (
      <div className="min-h-screen" style={{ backgroundColor: currentTheme.bg }}>
        {/* Header */}
        <div className="bg-neutral-900 border-b border-neutral-800 p-4">
          <div className="mx-auto max-w-7xl flex justify-between items-center">
            <div>
              <h2 className="font-bold text-white">Customize Your Sales Page</h2>
              <p className="text-xs text-neutral-400">Full control over every element</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep('preview')}
                className="px-4 py-2 rounded-lg border border-neutral-700 hover:bg-neutral-800 text-white"
              >
                ← Back
              </button>
              <button
                onClick={publishProduct}
                disabled={saving}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium"
              >
                {saving ? 'Publishing...' : 'Publish Now 🚀'}
              </button>
            </div>
          </div>
        </div>

        {/* Split View */}
        <div className="flex h-[calc(100vh-73px)]">
          {/* Left Panel - Controls */}
          <div className="w-[450px] bg-neutral-950 border-r border-neutral-800 overflow-y-auto p-6 text-white">
            <div className="space-y-6">
              
              {/* Theme Selector - Always at top */}
              <div className="border-b border-neutral-800 pb-4">
                <label className="text-sm font-semibold text-neutral-300 mb-3 block">Page Theme</label>
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

              {/* Element Order - Always second */}
              <div className="border-b border-neutral-800 pb-4">
                <label className="text-sm font-semibold text-neutral-300 mb-3 block">Page Layout Order</label>
                
                {(() => {
                  const activeElements = formData.elementOrder.filter(element => {
                    if (element === 'hero') return true;
                    if (element === 'video') return !!formData.videoUrl;
                    if (element === 'urgency') return !!formData.urgency;
                    if (element === 'features') return formData.features.some(f => f.trim());
                    if (element === 'testimonial') return !!formData.testimonial;
                    if (element === 'content') return !!formData.content && !formData.content.startsWith('[REDIRECT:');
                    if (element === 'purchase') return true;
                    return false;
                  });

                  if (activeElements.length <= 2) {
                    return (
                      <p className="text-xs text-neutral-500 italic">
                        Add more content to customize the order
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {activeElements.map((element, index) => (
                        <div key={element} className="flex items-center gap-3 p-2 bg-neutral-900 rounded">
                          <span className="text-xs bg-neutral-800 w-6 h-6 rounded-full flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="flex-1 text-sm text-neutral-300">
                            {elementLabels[element]}
                          </span>
                          <div className="flex gap-1">
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
                              className="px-2 py-1 text-xs bg-neutral-800 rounded hover:bg-neutral-700"
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
                              className="px-2 py-1 text-xs bg-neutral-800 rounded hover:bg-neutral-700"
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
              </div>
              
              {/* Dynamically ordered edit sections */}
              {(() => {
                // Define which sections have content
                const hasContent = {
                  hero: true, // Always has content
                  video: !!formData.videoUrl,
                  urgency: !!formData.urgency,
                  features: formData.features.some(f => f.trim()),
                  testimonial: !!formData.testimonial,
                  content: !!formData.content && !formData.content.startsWith('[REDIRECT:'),
                  purchase: true // Always has content
                };
                
                // Separate filled and empty sections
                const filledSections = ['hero', 'video', 'urgency', 'features', 'testimonial', 'content', 'purchase']
                  .filter(section => hasContent[section]);
                const emptySections = ['video', 'urgency', 'testimonial']
                  .filter(section => !hasContent[section]);
                
                return (
                  <>
                    {/* Filled sections */}
                    {filledSections.map(element => editSections[element]).filter(Boolean)}
                    
                    {/* Divider if there are empty sections */}
                    {emptySections.length > 0 && (
                      <div className="border-t border-neutral-800 pt-4 mt-4">
                        <p className="text-xs text-neutral-500 mb-3">Optional Elements</p>
                      </div>
                    )}
                    
                    {/* Empty/optional sections */}
                    {emptySections.map(element => editSections[element]).filter(Boolean)}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Right Panel - Live Preview */}
          <div className="flex-1 overflow-y-auto" style={{ backgroundColor: currentTheme.bg }}>
            <div className="p-6">
              <div className="mx-auto max-w-3xl">
                {/* Render elements in custom order */}
                {formData.elementOrder.map(element => elementMap[element]).filter(Boolean)}
              </div>
            </div>
          </div>
        </div>
        
           </div>
        );
      }
  // Step 5: Success
  if (currentStep === 'success') {
    return (
      <div className="min-h-screen bg-[#0B0B0D] text-neutral-100 p-6 flex items-center justify-center">
        <div className="max-w-lg w-full rounded-2xl border border-neutral-800 bg-neutral-900/70 p-8 text-center">
          <div className="mb-4 text-5xl">🎉</div>
          <h2 className="text-3xl font-bold mb-2">You're Live!</h2>
          <p className="text-neutral-300 mb-6">Your product is ready to sell</p>
          
          <div className="bg-neutral-950 rounded-lg p-4 mb-6 border border-green-800/30">
            <p className="text-xs text-neutral-400 mb-2">Your product link:</p>
            <p className="text-sm font-mono break-all text-green-400">{productUrl}</p>
            <p className="text-xs text-green-500 mt-2">✓ Link copied to clipboard!</p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => window.open(productUrl, '_blank')}
              className="w-full rounded-lg bg-green-600 py-3 text-white font-medium hover:bg-green-500"
            >
              View Live Product →
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full rounded-lg border border-neutral-700 py-3 hover:bg-neutral-800"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}