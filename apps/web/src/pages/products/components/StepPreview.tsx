// step-components/StepPreview.tsx

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { StepComponentProps, PreviewMode } from '../utils/products.types';
import { themePresets } from '../utils/ThemePresets';
import { getEmbedUrl, getPreviewContent } from '../utils/ProductHelpers';
import VideoPreview from '../components/VideoPreview';

export default function StepPreview({ 
  formData, 
  setFormData, 
  setCurrentStep 
}: StepComponentProps) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>('locked');
  const [previewStart] = useState(0);
  const [previewLength] = useState(500);
  
  const embedUrl = getEmbedUrl(formData.videoUrl);
  const currentTheme = themePresets[formData.themePreset] || themePresets.dark;
  
  const renderElement = (element: string) => {
    switch(element) {
      case 'hero':
        return (
          <div className="mb-8" key="hero">
            <h1 className="text-4xl font-bold mb-4" style={{ color: currentTheme.text }}>
              {formData.title}
            </h1>
            <p className="text-xl" style={{ color: currentTheme.subtext }}>
              {formData.description}
            </p>
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
                      : (
                        <>
                          Redirect URL:{' '}
                          <a 
                            href={formData.content.replace('[REDIRECT:', '').replace(']', '')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-400 hover:text-green-300 underline"
                          >
                            {formData.content.replace('[REDIRECT:', '').replace(']', '')}
                          </a>
                        </>
                      )}
                  </p>
                  {previewMode === 'unlocked' && (
                    <button
                      onClick={() => window.open(formData.content.replace('[REDIRECT:', '').replace(']', ''), '_blank')}
                      className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500"
                    >
                      Test Redirect Link →
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {previewMode === 'locked' ? (
                    <>
                      <div className="prose prose-invert prose-purple max-w-none">
                        {formData.content.includes('<') ? (
                          <div 
                            dangerouslySetInnerHTML={{ 
                              __html: getPreviewContent(formData, previewStart, previewLength) 
                            }}
                            className="prose prose-invert prose-purple max-w-none"
                          />
                        ) : (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {getPreviewContent(formData, previewStart, previewLength)}
                          </ReactMarkdown>
                        )}
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
                      {formData.content.includes('<') ? (
                        <div 
                          dangerouslySetInnerHTML={{ __html: formData.content }}
                          className="prose prose-invert prose-purple max-w-none"
                        />
                      ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {formData.content}
                        </ReactMarkdown>
                      )}
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
  };

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
              onClick={() => setCurrentStep('content')}
              className="px-4 py-2 rounded-lg border border-neutral-700 hover:bg-neutral-800 flex items-center gap-2"
            >
              <span>←</span> Back to Content
            </button>
            <button
              onClick={() => setCurrentStep('customize')}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium hover:from-green-500 hover:to-emerald-500"
            >
              Customize Design →
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
          {formData.elementOrder.map(element => renderElement(element)).filter(Boolean)}

          {/* Thank You Message - Only show in unlocked mode */}
          {previewMode === 'unlocked' && (
            <div className="border border-green-800/30 rounded-lg p-6 bg-gradient-to-br from-neutral-900/90 to-green-950/20">
              <h3 className="text-xl font-semibold mb-2 text-green-400">Thank you for your purchase!</h3>
              <p className="text-neutral-300">You now have lifetime access to this content.</p>
              
              {/* Show resources if any */}
              {formData.resources.filter(r => r.title && r.url).length > 0 && (
                <div className="mt-4 pt-4 border-t border-neutral-800">
                  <h4 className="text-sm font-semibold mb-2 text-neutral-300">📦 Your Downloads</h4>
                  <div className="space-y-2">
                    {formData.resources.filter(r => r.title && r.url).map((resource, i) => (
                      <a 
                        key={i}
                        href={resource.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block p-2 bg-neutral-800/50 rounded hover:bg-neutral-800 transition-colors"
                      >
                        <p className="text-sm text-green-400 hover:text-green-300">
                          {resource.title} →
                        </p>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}