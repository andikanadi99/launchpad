import { useState } from 'react';
import { auth, db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

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
  const [contentMethod, setContentMethod] = useState<'paste' | 'link'>('paste');
  const [contentLink, setContentLink] = useState('');
  const [fetchingContent, setFetchingContent] = useState(false);
  
  // Preview mode state - moved here from inside the conditional
  const [previewMode, setPreviewMode] = useState<'locked' | 'unlocked'>('locked');
  
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
    customPreview: ''
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
    
    formatted = formatted.replace(/\n{4,}/g, '\n\n');
    formatted = formatted.replace(/<aside>/g, '\n> ');
    formatted = formatted.replace(/<\/aside>/g, '\n');
    
    const videoMatch = formatted.match(/https:\/\/(www\.)?(loom\.com|youtube\.com|youtu\.be|vimeo\.com)[^\s\n]*/);
    if (videoMatch && !formData.videoUrl) {
      setFormData(prev => ({...prev, videoUrl: videoMatch[0]}));
      if (contentType === 'text') {
        setContentType('both');
      }
    }
    
    formatted = formatted.replace(/^#\s+(.+)$/gm, '# $1');
    formatted = formatted.replace(/^([A-Z][A-Za-z\s&]{3,50})$/gm, (match) => {
      if (!match.match(/[.!?,]$/)) {
        return `## ${match}`;
      }
      return match;
    });
    
    formatted = formatted.replace(/^[•◦▪︎✅❌🔊💡]\s+/gm, '- ');
    formatted = formatted.replace(/^(\d+)[.)]\s+/gm, '$1. ');
    formatted = formatted.replace(/^-{3,}$/gm, '\n---\n');
    
    return formatted;
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
        createdAt: serverTimestamp()
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

  // Step 1: Basic Information
  if (currentStep === 'basics') {
    return (
      <div className="min-h-screen bg-[#0B0B0D] text-neutral-100 p-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Step 1: Basic Info</h1>
            <p className="text-neutral-400">Tell us what you're selling</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm text-neutral-300 mb-2">Product Name</label>
              <input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3"
                placeholder="e.g., 10 Cold Email Templates That Convert"
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-300 mb-2">Price</label>
              <div className="flex gap-2">
                {['5', '10', '15', '20'].map(price => (
                  <button
                    key={price}
                    type="button"
                    onClick={() => setFormData({...formData, price})}
                    className={`px-4 py-2 rounded-lg border ${
                      formData.price === price 
                        ? 'border-green-600 bg-green-950/30 text-green-400' 
                        : 'border-neutral-700 hover:bg-neutral-800'
                    }`}
                  >
                    ${price}
                  </button>
                ))}
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2"
                  placeholder="Custom"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-neutral-300 mb-2">Sales Hook</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3"
                placeholder="What problem does this solve? Why should they buy?"
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-300 mb-2">What's Included (3 key benefits)</label>
              {formData.features.map((feature, i) => (
                <input
                  key={i}
                  type="text"
                  value={feature}
                  onChange={(e) => {
                    const newFeatures = [...formData.features];
                    newFeatures[i] = e.target.value;
                    setFormData({...formData, features: newFeatures});
                  }}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2 mb-2"
                  placeholder={`Benefit ${i + 1}`}
                />
              ))}
            </div>

            <button
              onClick={() => setCurrentStep('content')}
              disabled={!formData.title || !formData.description}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium disabled:opacity-50"
            >
              Next: Add Your Content →
            </button>
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
                <label className="block text-sm text-neutral-300 mb-2">Your Content</label>
                
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setContentMethod('paste')}
                    className={`flex-1 py-2 rounded-lg border ${
                      contentMethod === 'paste'
                        ? 'border-green-600 bg-green-950/20 text-green-400'
                        : 'border-neutral-700 hover:bg-neutral-800'
                    }`}
                  >
                    Host on LaunchPad
                  </button>
                  <button
                    onClick={() => setContentMethod('link')}
                    className={`flex-1 py-2 rounded-lg border ${
                      contentMethod === 'link'
                        ? 'border-green-600 bg-green-950/20 text-green-400'
                        : 'border-neutral-700 hover:bg-neutral-800'
                    }`}
                  >
                    Link to External
                  </button>
                </div>

                {contentMethod === 'link' ? (
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
                        // Store this as redirect URL instead of content
                        setFormData({...formData, content: `[REDIRECT:${e.target.value}]`});
                      }}
                      placeholder="https://your-product-link.com"
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3"
                    />
                    <p className="text-xs text-neutral-500">
                      Examples: Gumroad link, Google Drive link, Notion page, your website
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-indigo-950/20 border border-indigo-800/30 rounded-lg p-3 mb-3">
                      <p className="text-xs text-indigo-400">
                        Paste your content here - we'll host it and deliver instantly after payment
                      </p>
                    </div>
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
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 font-mono text-sm"
                      placeholder="Paste or type your content here..."
                    />
                    {formData.content && !formData.content.startsWith('[REDIRECT:') && (
                      <p className="text-xs text-green-500 mt-1">
                        ✓ {formData.content.split(/\s+/).length} words will be hosted on LaunchPad
                      </p>
                    )}
                  </>
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
    const embedUrl = getEmbedUrl(formData.videoUrl);
    // Note: previewMode state is now declared at the top of the component
    
    return (
      <div className="min-h-screen bg-[#0B0B0D] text-neutral-100">
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
                  🔓 Full Content
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
        <div className="p-6">
          <div className="mx-auto max-w-4xl">
            {/* Hero */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-4">{formData.title}</h1>
              <p className="text-xl text-neutral-300">{formData.description}</p>
            </div>

            {/* Show this banner only in unlocked mode */}
            {previewMode === 'unlocked' && (
              <div className="mb-8 p-4 bg-green-950/20 border border-green-800/30 rounded-lg">
                <p className="text-green-400 font-medium flex items-center gap-2">
                  <span>✅</span>
                  This is what customers see after purchasing
                </p>
              </div>
            )}

            {/* Urgency Message if set (only in locked mode) */}
            {formData.urgency && previewMode === 'locked' && (
              <div className="mb-8 p-4 bg-yellow-950/20 border border-yellow-800/30 rounded-lg">
                <p className="text-yellow-400 font-medium flex items-center gap-2">
                  <span>⏰</span>
                  {formData.urgency === 'limited' && 'Limited spots available - only a few left!'}
                  {formData.urgency === 'price' && 'Price increases soon - lock in this rate now'}
                  {formData.urgency === 'bonus' && 'Special bonus expires at midnight tonight'}
                </p>
              </div>
            )}

            {/* Video */}
            {embedUrl && (
              <div className="mb-12">
                <h2 className="text-2xl font-semibold mb-4">
                  {previewMode === 'locked' ? 'Watch This First 👇' : 'Video Content'}
                </h2>
                <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
                  <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Product Video"
                  />
                </div>
              </div>
            )}

            {/* Features */}
            {formData.features.filter(f => f).length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-semibold mb-4">What's Included</h2>
                <div className="bg-neutral-900/50 rounded-lg p-6 border border-neutral-800">
                  <ul className="space-y-3">
                    {formData.features.filter(f => f).map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="text-green-400 text-xl mt-0.5">✓</span>
                        <span className="text-lg">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Testimonial if added (only in locked mode) */}
            {formData.testimonial && previewMode === 'locked' && (
              <div className="mb-8 p-6 bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-lg border border-neutral-800">
                <p className="text-lg italic text-neutral-300 mb-2">"{formData.testimonial}"</p>
                <p className="text-sm text-neutral-500">— Happy Customer</p>
              </div>
            )}

            {/* Content Section - Different for locked/unlocked */}
            {formData.content && (
              <div className="mb-12">
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
                          <pre className="whitespace-pre-wrap font-sans text-neutral-300 text-sm leading-relaxed">
                            {getPreviewContent()}
                            {formData.content.length > previewLength && '...'}
                          </pre>
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
                        <div className="max-h-96 overflow-y-auto">
                          <pre className="whitespace-pre-wrap font-sans text-neutral-300 text-sm leading-relaxed">
                            {formData.content}
                          </pre>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Purchase Card - Only show in locked mode */}
            {previewMode === 'locked' && (
              <div className={`border rounded-lg p-6 bg-gradient-to-br from-neutral-900/90 to-${formData.color}-950/20 border-${formData.color}-800/30`}>
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
                  <p className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    Secure payment via Stripe
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    {formData.content.startsWith('[REDIRECT:') 
                      ? 'Instant redirect to product' 
                      : 'Instant access to content'}
                  </p>
                  {formData.guarantee && (
                    <p className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      {formData.guarantee}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Thank You Message - Only show in unlocked mode */}
            {previewMode === 'unlocked' && (
              <div className="border border-green-800/30 rounded-lg p-6 bg-gradient-to-br from-neutral-900/90 to-green-950/20">
                <h3 className="text-xl font-semibold mb-2 text-green-400">Thank you for your purchase!</h3>
                <p className="text-neutral-300">You now have lifetime access to this content.</p>
              </div>
            )}

            {/* What Happens Next - Only in locked mode */}
            {previewMode === 'locked' && (
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
            )}
          </div>
        </div>
      </div>
    );
  }

  // Step 4: Customize Preview
  if (currentStep === 'customize') {
    return (
      <div className="min-h-screen bg-[#0B0B0D] text-neutral-100 p-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Customize Your Preview</h1>
            <p className="text-neutral-400">Control what customers see before buying</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm text-neutral-300 mb-2">Preview Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFormData({...formData, previewType: 'auto'})}
                  className={`p-4 rounded-lg border text-center ${
                    formData.previewType === 'auto'
                      ? 'border-green-600 bg-green-950/20'
                      : 'border-neutral-700'
                  }`}
                >
                  <div className="font-medium mb-1">Automatic</div>
                  <div className="text-xs text-neutral-400">Show first 500 characters</div>
                </button>
                <button
                  onClick={() => setFormData({...formData, previewType: 'custom'})}
                  className={`p-4 rounded-lg border text-center ${
                    formData.previewType === 'custom'
                      ? 'border-green-600 bg-green-950/20'
                      : 'border-neutral-700'
                  }`}
                >
                  <div className="font-medium mb-1">Custom</div>
                  <div className="text-xs text-neutral-400">Write your own preview</div>
                </button>
              </div>
            </div>

            {formData.previewType === 'auto' && formData.content && !formData.content.startsWith('[REDIRECT:') && (
              <div>
                <label className="block text-sm text-neutral-300 mb-2">Preview Settings</label>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-neutral-400">Start from character</label>
                    <input
                      type="number"
                      value={previewStart}
                      onChange={(e) => setPreviewStart(Number(e.target.value))}
                      min={0}
                      max={Math.max(0, formData.content.length - 100)}
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400">Preview length</label>
                    <input
                      type="range"
                      value={previewLength}
                      onChange={(e) => setPreviewLength(Number(e.target.value))}
                      min={100}
                      max={1000}
                      className="w-full"
                    />
                    <p className="text-xs text-neutral-500">{previewLength} characters</p>
                  </div>
                </div>
              </div>
            )}

            {formData.previewType === 'custom' && (
              <div>
                <label className="block text-sm text-neutral-300 mb-2">Custom Preview Text</label>
                <textarea
                  rows={8}
                  value={formData.customPreview}
                  onChange={(e) => setFormData({...formData, customPreview: e.target.value})}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3"
                  placeholder="Write what you want customers to see in the preview..."
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-neutral-300 mb-2">Add Urgency</label>
              <select
                value={formData.urgency}
                onChange={(e) => setFormData({...formData, urgency: e.target.value})}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3"
              >
                <option value="">No urgency message</option>
                <option value="limited">Limited spots available</option>
                <option value="price">Price increases soon</option>
                <option value="bonus">Bonus expires today</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-neutral-300 mb-2">Button Color</label>
              <div className="flex gap-2">
                {['green', 'blue', 'purple', 'red'].map(color => (
                  <button
                    key={color}
                    onClick={() => setFormData({...formData, color})}
                    className={`w-12 h-12 rounded-lg border-2 ${
                      formData.color === color ? 'border-white' : 'border-neutral-700'
                    }`}
                    style={{
                      backgroundColor: color === 'green' ? '#10b981' : 
                                     color === 'blue' ? '#3b82f6' :
                                     color === 'purple' ? '#8b5cf6' : '#ef4444'
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep('preview')}
                className="flex-1 py-3 rounded-lg border border-neutral-700 hover:bg-neutral-800"
              >
                ← Back to Preview
              </button>
              <button
                onClick={publishProduct}
                disabled={saving}
                className="flex-1 py-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium"
              >
                {saving ? 'Publishing...' : 'Publish Now 🚀'}
              </button>
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