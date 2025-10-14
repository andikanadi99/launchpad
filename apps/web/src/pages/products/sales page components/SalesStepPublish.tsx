import React, { useState, useEffect } from 'react';
import { 
  Copy, Check, AlertCircle, Sparkles, Shield, Zap,
  Facebook, Twitter, Linkedin, Instagram, Package, Search  
} from 'lucide-react';

import { auth } from '../../../lib/firebase';

interface PublishData {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  thankYouRedirect?: string;
  status: 'draft' | 'published';
  publishedAt?: Date;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
  };
}

interface StepPublishProps {
  data: any;
  updateData: (stepKey: string, data: any) => void;
}

const SalesStepPublish: React.FC<StepPublishProps> = ({ data, updateData }) => {
  const [localData, setLocalData] = useState<PublishData>(() => {
    const publishData = data.publish || {};
    return {
      slug: publishData.slug || '',
      metaTitle: publishData.metaTitle || '',
      metaDescription: publishData.metaDescription || '',
      thankYouRedirect: publishData.thankYouRedirect || '',
      status: publishData.status || 'draft',
      publishedAt: publishData.publishedAt,
      socialLinks: publishData.socialLinks || {
        facebook: '',
        twitter: '',
        linkedin: '',
        instagram: ''
      }
    };
  });

  const [slugError, setSlugError] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showSocialLinks, setShowSocialLinks] = useState(false);

  const productName = data.coreInfo?.name || 'Your Product';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localData]);

  // Validate slug on mount and when it changes
  useEffect(() => {
    if (localData.slug) {
      const slug = localData.slug.toLowerCase();
      if (slug !== localData.slug) {
        setSlugError('Only lowercase letters, numbers, and hyphens allowed');
      } else if (slug.length < 3) {
        setSlugError('Slug must be at least 3 characters');
      } else {
        setSlugError('');
      }
    }
  }, [localData.slug]);

  const updateField = (field: keyof PublishData | string, value: any) => {
    if (field.includes('.')) {
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">Step 5: Publish Settings</h2>
        <p className="text-neutral-400 mt-1">
          Set your page URL and SEO details
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
                <span className="text-sm font-medium text-amber-500">Draft Mode - Ready to Publish</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Order Confirmation Email Section */}
      <div>
        <div className="border-2 border-neutral-700 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-neutral-800/50 px-4 py-3 border-b border-neutral-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-neutral-400" />
                <h3 className="text-sm font-medium">Order Confirmation Email</h3>
              </div>
              <span className="text-xs px-2 py-1 bg-green-500/20 text-green-500 rounded-full">
                ✓ Auto-Configured
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 bg-neutral-900/30 space-y-4">
            {/* Info Box */}
            <div className="flex items-start gap-3 p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-indigo-300">
                  Customers automatically receive this email after purchase. Set up product delivery (files, content, or redirect) from your dashboard after publishing.
                </p>
              </div>
            </div>

            {/* From Address Display */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-2">
                From
              </label>
              <div className="px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-300">Launchpad</span>
                  <span className="text-neutral-500">&lt;orders@launchpad.app&gt;</span>
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  Replies go to: {auth.currentUser?.email || 'your-email@example.com'}
                </div>
              </div>
            </div>

            {/* Email Subject Field */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-2">
                Subject Line
              </label>
              <input
                type="text"
                value="Thank you for your purchase!"
                readOnly
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-sm text-neutral-400"
              />
            </div>

            {/* Email Body Field */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-2">
                Email Body
              </label>
              <textarea
                value={`Hi there! Thank you for purchasing ${productName}.\n\nYour order is confirmed. We're working on your product and will send access details to this email soon.\n\nQuestions? Reply to this email.\n\nThanks!`}
                readOnly
                rows={6}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-sm text-neutral-400 resize-none leading-relaxed"
              />
              <p className="text-xs text-neutral-500 mt-1">
                ✉️ Sent automatically after each successful purchase
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* URL Slug - REQUIRED */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Page URL
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
        </div>

        {/* SEO Title - REQUIRED */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Page Title (SEO)
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="text"
            value={localData.metaTitle}
            onChange={(e) => updateField('metaTitle', e.target.value)}
            placeholder={`${productName} - ${data.coreInfo?.tagline || 'Get Started Today'}`}
            maxLength={60}
            className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none"
          />
          <div className="mt-1 flex justify-between">
            <p className="text-xs text-neutral-500">Shows in browser tabs & search results</p>
            <span className={`text-xs ${localData.metaTitle.length > 60 ? 'text-orange-500' : 'text-neutral-500'}`}>
              {localData.metaTitle.length}/60
            </span>
          </div>
        </div>

        {/* Meta Description - REQUIRED */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Page Description (SEO)
            <span className="text-red-500 ml-1">*</span>
          </label>
          <textarea
            value={localData.metaDescription}
            onChange={(e) => updateField('metaDescription', e.target.value)}
            placeholder="A brief description of your product that will appear in search results..."
            rows={2}
            maxLength={160}
            className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none resize-none"
          />
          <div className="mt-1 flex justify-between">
            <p className="text-xs text-neutral-500">Shows in Google search results</p>
            <span className={`text-xs ${localData.metaDescription.length > 160 ? 'text-orange-500' : 'text-neutral-500'}`}>
              {localData.metaDescription.length}/160
            </span>
          </div>
        </div>

        {/* Google Search Preview */}
        {localData.metaTitle && localData.metaDescription && localData.slug && (
          <div className="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4 text-neutral-400" />
              <span className="text-sm font-medium text-neutral-300">Google Search Preview</span>
            </div>
            
            {/* Google Search Result Mockup */}
            <div className="bg-white p-4 rounded">
              {/* URL breadcrumb */}
              <div className="flex items-center gap-1 mb-1">
                <div className="w-4 h-4 bg-neutral-200 rounded-sm flex items-center justify-center text-xs">
                  🚀
                </div>
                <span className="text-sm text-neutral-600">launchpad.app › p › {localData.slug}</span>
              </div>
              
              {/* Title */}
              <h3 className="text-xl text-blue-600 hover:underline cursor-pointer mb-1 font-normal">
                {localData.metaTitle}
              </h3>
              
              {/* Description */}
              <p className="text-sm text-neutral-700 leading-relaxed">
                {localData.metaDescription}
              </p>
            </div>
            
            <p className="text-xs text-neutral-500 mt-2 flex items-center gap-1">
              ⚡ This is how your page will appear in Google search results
            </p>
          </div>
        )}

        {/* Redirect URL - OPTIONAL */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Post-Purchase Redirect
            <span className="text-neutral-500 ml-2 text-xs">(Optional)</span>
          </label>
          <input
            type="url"
            value={localData.thankYouRedirect || ''}
            onChange={(e) => updateField('thankYouRedirect', e.target.value)}
            placeholder="https://members.yoursite.com/welcome"
            className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none"
          />
          <p className="text-xs text-neutral-500 mt-1">
            Redirect customers to your course platform, membership site, or custom thank you page
          </p>
        </div>

        {/* Social Links - OPTIONAL (Collapsible) */}
        <div>
          <button
            onClick={() => setShowSocialLinks(!showSocialLinks)}
            className="text-sm font-medium text-neutral-400 hover:text-neutral-200 flex items-center gap-2"
          >
            {showSocialLinks ? '−' : '+'} 
            Social Links 
            <span className="text-xs font-normal">(Optional - shows in footer)</span>
          </button>
          
          {showSocialLinks && (
            <div className="grid grid-cols-2 gap-4 mt-3">
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
          )}
        </div>

        {/* Validation Notice */}
        {(!localData.slug || !localData.metaTitle || !localData.metaDescription) && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <p className="text-sm text-amber-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Complete all required fields (*) to publish
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesStepPublish;