import React, { useState, useEffect } from 'react';
import { 
  Globe, Search, MessageSquare, ExternalLink, Copy, Check, 
  AlertCircle, Sparkles, Shield, Zap, Eye, EyeOff,
  Facebook, Twitter, Linkedin, Instagram, Code
} from 'lucide-react';

interface PublishData {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  ogImage?: string;
  thankYouMessage: string;
  thankYouRedirect?: string;
  status: 'draft' | 'published';
  publishedAt?: Date;
  liveUrl?: string;
  analytics?: {
    googleAnalyticsId?: string;
    facebookPixelId?: string;
  };
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
  };
  embedSettings?: {
    allowEmbed: boolean;
    embedDomains?: string[];
  };
}

interface StepPublishProps {
  data: any;
  updateData: (stepKey: string, data: any) => void;
}

const SalesStepPublish: React.FC<StepPublishProps> = ({ data, updateData }) => {
  const [localData, setLocalData] = useState<PublishData>({
    slug: '',
    metaTitle: '',
    metaDescription: '',
    ogImage: data.visuals?.headerImage || '',
    thankYouMessage: 'Thank you for your purchase! You will receive an email with access details shortly.',
    thankYouRedirect: '',
    status: 'draft',
    publishedAt: undefined,
    liveUrl: '',
    analytics: {
      googleAnalyticsId: '',
      facebookPixelId: ''
    },
    socialLinks: {
      facebook: '',
      twitter: '',
      linkedin: '',
      instagram: ''
    },
    embedSettings: {
      allowEmbed: false,
      embedDomains: []
    },
    ...data.publish
  });

  const [activeTab, setActiveTab] = useState<'basic' | 'seo' | 'thankyou' | 'advanced'>('basic');
  const [slugError, setSlugError] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [customDomain, setCustomDomain] = useState('');

  const productName = data.coreInfo?.name || 'Your Product';
  const priceType = data.coreInfo?.priceType || 'one-time';
  const baseUrl = 'https://launchpad.app/p/';

  // Generate slug from product name
  useEffect(() => {
    if (!localData.slug && productName) {
      const generatedSlug = productName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .substring(0, 50);
      setLocalData(prev => ({ ...prev, slug: generatedSlug }));
    }
  }, [productName]);

  // Auto-generate meta title and description if empty
  useEffect(() => {
    if (!localData.metaTitle && productName) {
      setLocalData(prev => ({ 
        ...prev, 
        metaTitle: `${productName} - ${data.coreInfo?.tagline || 'Available Now'}`.substring(0, 60)
      }));
    }
    if (!localData.metaDescription && data.valueProp?.description) {
      setLocalData(prev => ({ 
        ...prev, 
        metaDescription: data.valueProp.description.substring(0, 160)
      }));
    }
  }, [productName, data.coreInfo?.tagline, data.valueProp?.description]);

  // Update parent when data changes
  useEffect(() => {
    updateData('publish', localData);
  }, [localData]);

  const updateField = (field: keyof PublishData | string, value: any) => {
    if (field.includes('.')) {
      // Handle nested fields like analytics.googleAnalyticsId
      const [parent, child] = field.split('.');
      setLocalData(prev => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: value
        }
      }));
    } else {
      setLocalData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const validateSlug = (value: string) => {
    const slug = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (slug !== value) {
      setSlugError('Only lowercase letters, numbers, and hyphens allowed');
    } else if (slug.length < 3) {
      setSlugError('Slug must be at least 3 characters');
    } else {
      setSlugError('');
    }
    updateField('slug', slug);
  };

  const copyToClipboard = () => {
    const url = `${baseUrl}${localData.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const getDefaultThankYouMessage = () => {
    if (priceType === 'free') {
      return "Success! Check your email for access to your free resource.";
    } else if (priceType === 'subscription') {
      return "Welcome to the community! Your subscription is now active. Check your email for login details.";
    } else {
      return "Thank you for your purchase! You'll receive an email with access details shortly.";
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">Step 5: Publish Settings</h2>
        <p className="text-neutral-400 mt-1">
          Configure your page URL, SEO, and post-purchase experience
        </p>
      </div>

      {/* Status Banner */}
      <div className={`p-4 rounded-lg border ${
        localData.status === 'published' 
          ? 'bg-green-500/10 border-green-500/30' 
          : 'bg-amber-500/10 border-amber-500/30'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {localData.status === 'published' ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-green-500">Live & Published</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-500">Draft Mode - Not Yet Published</span>
              </>
            )}
          </div>
          {localData.status === 'published' && localData.publishedAt && (
            <span className="text-xs text-neutral-400">
              Published {new Date(localData.publishedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-neutral-800">
        {[
          { id: 'basic', label: 'Basic Settings', icon: <Globe className="w-4 h-4" /> },
          { id: 'seo', label: 'SEO & Meta', icon: <Search className="w-4 h-4" /> },
          { id: 'thankyou', label: 'Thank You Page', icon: <MessageSquare className="w-4 h-4" /> },
          { id: 'advanced', label: 'Advanced', icon: <Shield className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {tab.icon}
            <span className="text-sm font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Basic Settings Tab */}
      {activeTab === 'basic' && (
        <div className="space-y-6">
          {/* URL Slug */}
          <div>
            <label className="block text-sm font-medium mb-2">
              URL Slug
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <div className="flex items-center">
                  <span className="px-3 py-3 bg-neutral-800 border border-r-0 border-neutral-700 rounded-l-lg text-sm text-neutral-400">
                    {baseUrl}
                  </span>
                  <input
                    type="text"
                    value={localData.slug}
                    onChange={(e) => validateSlug(e.target.value)}
                    placeholder="your-product-name"
                    className={`flex-1 px-3 py-3 bg-neutral-900 border rounded-r-lg focus:border-indigo-500 focus:outline-none ${
                      slugError ? 'border-red-500' : 'border-neutral-700'
                    }`}
                    maxLength={50}
                  />
                </div>
                {slugError && (
                  <p className="text-xs text-red-400 mt-1">{slugError}</p>
                )}
              </div>
              <button
                onClick={copyToClipboard}
                disabled={!localData.slug || !!slugError}
                className="px-4 py-3 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {copiedUrl ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              This will be your page's permanent URL. Choose wisely!
            </p>
          </div>

          {/* Custom Domain (Coming Soon) */}
          <div className="opacity-50 pointer-events-none">
            <label className="block text-sm font-medium mb-2">
              Custom Domain
              <span className="ml-2 text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded">Coming Soon</span>
            </label>
            <input
              type="text"
              placeholder="yourdomain.com"
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg"
              disabled
            />
            <p className="text-xs text-neutral-500 mt-1">
              Connect your own domain for a professional look
            </p>
          </div>

          {/* Social Links */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Social Links
              <span className="text-neutral-500 ml-2 text-xs">(Optional - displayed in footer)</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'facebook', icon: <Facebook className="w-4 h-4" />, placeholder: 'facebook.com/yourpage' },
                { id: 'twitter', icon: <Twitter className="w-4 h-4" />, placeholder: 'twitter.com/yourhandle' },
                { id: 'linkedin', icon: <Linkedin className="w-4 h-4" />, placeholder: 'linkedin.com/company/...' },
                { id: 'instagram', icon: <Instagram className="w-4 h-4" />, placeholder: 'instagram.com/yourhandle' }
              ].map(social => (
                <div key={social.id} className="flex items-center gap-2">
                  <div className="p-2 bg-neutral-800 rounded-lg">
                    {social.icon}
                  </div>
                  <input
                    type="url"
                    value={localData.socialLinks?.[social.id as keyof typeof localData.socialLinks] || ''}
                    onChange={(e) => updateField(`socialLinks.${social.id}`, e.target.value)}
                    placeholder={social.placeholder}
                    className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEO & Meta Tab */}
      {activeTab === 'seo' && (
        <div className="space-y-6">
          {/* Meta Title */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Page Title
              <span className="text-neutral-500 ml-2 text-xs">(Shows in browser tabs & search results)</span>
            </label>
            <input
              type="text"
              value={localData.metaTitle}
              onChange={(e) => updateField('metaTitle', e.target.value)}
              placeholder={productName}
              maxLength={60}
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none"
            />
            <div className="mt-1 flex justify-between">
              <p className="text-xs text-neutral-500">Recommended: 50-60 characters</p>
              <span className={`text-xs ${localData.metaTitle.length > 60 ? 'text-orange-500' : 'text-neutral-500'}`}>
                {localData.metaTitle.length}/60
              </span>
            </div>
          </div>

          {/* Meta Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Meta Description
              <span className="text-neutral-500 ml-2 text-xs">(Shows in search results)</span>
            </label>
            <textarea
              value={localData.metaDescription}
              onChange={(e) => updateField('metaDescription', e.target.value)}
              placeholder="A compelling description that makes people want to click..."
              rows={3}
              maxLength={160}
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none resize-none"
            />
            <div className="mt-1 flex justify-between">
              <p className="text-xs text-neutral-500">Recommended: 150-160 characters</p>
              <span className={`text-xs ${localData.metaDescription.length > 160 ? 'text-orange-500' : 'text-neutral-500'}`}>
                {localData.metaDescription.length}/160
              </span>
            </div>
          </div>

          {/* OG Image */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Social Share Image
              <span className="text-neutral-500 ml-2 text-xs">(When shared on social media)</span>
            </label>
            <div className="flex items-center gap-4">
              {localData.ogImage ? (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-neutral-700">
                  {localData.ogImage.startsWith('gradient:') ? (
                    <div className={`w-full h-full ${localData.ogImage.replace('gradient:', '')}`} />
                  ) : (
                    <img 
                      src={localData.ogImage} 
                      alt="OG Image" 
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              ) : (
                <div className="w-32 h-32 bg-neutral-800 rounded-lg flex items-center justify-center border border-neutral-700">
                  <Eye className="w-6 h-6 text-neutral-500" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm text-neutral-300 mb-2">
                  Using your header image by default
                </p>
                <button className="text-sm text-indigo-400 hover:text-indigo-300">
                  Upload custom image
                </button>
                <p className="text-xs text-neutral-500 mt-1">
                  Recommended: 1200x630px
                </p>
              </div>
            </div>
          </div>

          {/* SEO Preview */}
          <div className="bg-neutral-800/50 rounded-lg p-4">
            <p className="text-xs text-neutral-400 mb-3">Google Search Preview</p>
            <div>
              <div className="text-blue-500 text-lg hover:underline cursor-pointer">
                {localData.metaTitle || productName}
              </div>
              <div className="text-green-600 text-sm mt-1">
                {baseUrl}{localData.slug || 'your-product'}
              </div>
              <div className="text-neutral-400 text-sm mt-1">
                {localData.metaDescription || 'Your product description will appear here...'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Thank You Page Tab */}
      {activeTab === 'thankyou' && (
        <div className="space-y-6">
          {/* Thank You Message */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Thank You Message
              <span className="text-red-500 ml-1">*</span>
            </label>
            <textarea
              value={localData.thankYouMessage}
              onChange={(e) => updateField('thankYouMessage', e.target.value)}
              placeholder={getDefaultThankYouMessage()}
              rows={4}
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none resize-none"
            />
            <p className="text-xs text-neutral-500 mt-1">
              Shown after successful {priceType === 'free' ? 'signup' : 'purchase'}
            </p>
          </div>

          {/* Redirect URL */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Redirect After Purchase
              <span className="text-neutral-500 ml-2 text-xs">(Optional)</span>
            </label>
            <input
              type="url"
              value={localData.thankYouRedirect || ''}
              onChange={(e) => updateField('thankYouRedirect', e.target.value)}
              placeholder="https://members.yoursite.com"
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none"
            />
            <p className="text-xs text-neutral-500 mt-1">
              Automatically redirect to another page after 5 seconds
            </p>
          </div>

          {/* Quick Templates */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Quick Templates
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { 
                  label: 'Digital Product', 
                  message: "Success! Check your email for download links and access instructions.",
                  icon: <Package className="w-4 h-4" />
                },
                { 
                  label: 'Course Access', 
                  message: "Welcome! Your course access has been activated. Check your email for login details.",
                  icon: <Sparkles className="w-4 h-4" />
                },
                { 
                  label: 'Membership', 
                  message: "You're in! Welcome to our community. Your member portal access is being set up.",
                  icon: <Shield className="w-4 h-4" />
                },
                { 
                  label: 'Free Resource', 
                  message: "All set! Your free resource is on its way to your inbox.",
                  icon: <Zap className="w-4 h-4" />
                }
              ].map(template => (
                <button
                  key={template.label}
                  onClick={() => updateField('thankYouMessage', template.message)}
                  className="p-3 border border-neutral-700 hover:border-indigo-500 hover:bg-indigo-500/10 rounded-lg text-left transition-all"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-neutral-400">{template.icon}</div>
                    <span className="text-sm font-medium">{template.label}</span>
                  </div>
                  <p className="text-xs text-neutral-500 line-clamp-2">{template.message}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Advanced Tab */}
      {activeTab === 'advanced' && (
        <div className="space-y-6">
          {/* Analytics */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium">Analytics & Tracking</h3>
                <p className="text-xs text-neutral-500 mt-1">Track visitor behavior and conversions</p>
              </div>
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  showAnalytics ? 'bg-indigo-600' : 'bg-neutral-700'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  showAnalytics ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {showAnalytics && (
              <div className="space-y-4 pl-4 border-l-2 border-neutral-800">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Google Analytics ID
                  </label>
                  <input
                    type="text"
                    value={localData.analytics?.googleAnalyticsId || ''}
                    onChange={(e) => updateField('analytics.googleAnalyticsId', e.target.value)}
                    placeholder="G-XXXXXXXXXX"
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Facebook Pixel ID
                  </label>
                  <input
                    type="text"
                    value={localData.analytics?.facebookPixelId || ''}
                    onChange={(e) => updateField('analytics.facebookPixelId', e.target.value)}
                    placeholder="1234567890"
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Embed Settings */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium">Allow Embedding</h3>
                <p className="text-xs text-neutral-500 mt-1">Let others embed your sales page</p>
              </div>
              <button
                onClick={() => updateField('embedSettings.allowEmbed', !localData.embedSettings?.allowEmbed)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  localData.embedSettings?.allowEmbed ? 'bg-indigo-600' : 'bg-neutral-700'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  localData.embedSettings?.allowEmbed ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {localData.embedSettings?.allowEmbed && (
              <div className="bg-neutral-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Code className="w-4 h-4 text-neutral-400" />
                  <span className="text-sm font-medium">Embed Code</span>
                </div>
                <pre className="bg-neutral-900 rounded p-3 text-xs overflow-x-auto">
                  <code className="text-blue-400">
{`<iframe 
  src="${baseUrl}${localData.slug}"
  width="100%" 
  height="800" 
  frameborder="0">
</iframe>`}
                  </code>
                </pre>
              </div>
            )}
          </div>

          {/* URL Protection */}
          <div className="opacity-50 pointer-events-none">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium">
                  Password Protection
                  <span className="ml-2 text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded">Pro</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-1">Require password to view page</p>
              </div>
              <button className="relative w-12 h-6 rounded-full bg-neutral-700" disabled>
                <div className="absolute top-1 w-4 h-4 bg-white rounded-full translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publishing Checklist */}
      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-indigo-300 mb-2">Ready to Publish Checklist</p>
            <div className="space-y-1">
              {[
                { label: 'Product name set', done: !!data.coreInfo?.name },
                { label: 'URL slug configured', done: !!localData.slug && !slugError },
                { label: 'Header image added', done: !!data.visuals?.headerImage },
                { label: 'Product description written', done: !!data.valueProp?.description },
                { label: 'Thank you message configured', done: !!localData.thankYouMessage }
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  {item.done ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-neutral-600" />
                  )}
                  <span className={item.done ? 'text-neutral-300' : 'text-neutral-500'}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesStepPublish;