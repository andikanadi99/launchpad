import React from 'react';
import { ShoppingCart, Check, Shield, Clock } from 'lucide-react';

interface SalesPagePreviewProps {
  data: any;
  isMobile?: boolean;
}

// Font mappings for the preview
const FONT_PAIRS = {
  'inter-system': { heading: 'Inter, sans-serif', body: 'system-ui, sans-serif' },
  'playfair-lato': { heading: '"Playfair Display", serif', body: 'Lato, sans-serif' },
  'montserrat-opensans': { heading: 'Montserrat, sans-serif', body: '"Open Sans", sans-serif' },
  'raleway-merriweather': { heading: 'Raleway, sans-serif', body: 'Merriweather, serif' },
  'poppins-roboto': { heading: 'Poppins, sans-serif', body: 'Roboto, sans-serif' }
};

const SalesPagePreview: React.FC<SalesPagePreviewProps> = ({ data, isMobile = false }) => {
  // Extract data with fallbacks
  const { coreInfo, valueProp, visuals, design, publish } = data;
  
  const name = coreInfo?.name || '';
  const tagline = coreInfo?.tagline || '';
  const price = coreInfo?.price || 0;
  const priceType = coreInfo?.priceType || 'one-time';
  const compareAtPrice = coreInfo?.compareAtPrice;
  const currency = coreInfo?.currency || 'USD';
  const billingFrequency = coreInfo?.billingFrequency || 'monthly';
  
  // Design settings with defaults
  const primaryColor = design?.primaryColor || '#6366F1';
  const secondaryColor = design?.secondaryColor || '#8B5CF6';
  const backgroundColor = design?.backgroundColor || '#0A0A0A';
  const textColor = design?.textColor || '#E5E5E5';
  const fontPair = FONT_PAIRS[design?.fontPair as keyof typeof FONT_PAIRS] || FONT_PAIRS['inter-system'];
  const buttonStyle = design?.buttonStyle || 'rounded';
  const cardStyle = design?.cardStyle || 'shadow';
  const spacing = design?.spacing || 'comfortable';
  const sectionOrder = design?.sectionOrder || ['hero', 'video', 'benefits', 'description', 'audience', 'gallery', 'pricing'];
  const hiddenSections = design?.hiddenSections || [];
  const ctaButtonText = design?.ctaButtonText || (priceType === 'free' ? 'Get Instant Access' : 'Buy Now');
  const animations = design?.animations !== false;
  
  // Get button border radius based on style
  const getButtonRadius = () => {
    switch(buttonStyle) {
      case 'square': return '0px';
      case 'pill': return '9999px';
      default: return '8px';
    }
  };
  
  // Get card styles
  const getCardStyle = () => {
    switch(cardStyle) {
      case 'flat': return { boxShadow: 'none', border: '1px solid rgba(255,255,255,0.1)' };
      case 'border': return { boxShadow: 'none', border: '2px solid rgba(255,255,255,0.2)' };
      default: return { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' };
    }
  };
  
  // Get spacing values
  const getSpacing = () => {
    switch(spacing) {
      case 'compact': return { section: 'mb-8', element: 'mb-4', padding: 'p-4' };
      case 'spacious': return { section: 'mb-16', element: 'mb-8', padding: 'p-8' };
      default: return { section: 'mb-12', element: 'mb-6', padding: 'p-6' };
    }
  };
  
  const spacingValues = getSpacing();
  
  // Currency symbols
  const currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'C$',
    AUD: 'A$'
  };
  
  const currencySymbol = currencySymbols[currency] || '$';
  
  // Format price display
  const formatPrice = (amount: number) => {
    return amount > 0 ? amount.toFixed(2) : '0.00';
  };
  
  // Calculate discount percentage
  const discountPercentage = compareAtPrice && compareAtPrice > price 
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : 0;

  // Value prop data
  const description = valueProp?.description || '';
  const benefits = valueProp?.benefits?.length > 0 ? valueProp.benefits : [];
  const targetAudience = valueProp?.targetAudience || '';

  // Parse video URL
  const parseVideoUrl = (url: string) => {
    if (!url) return '';
    
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    
    const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
    if (loomMatch) {
      return `https://www.loom.com/embed/${loomMatch[1]}`;
    }
    
    return url;
  };

  // Render sections based on order and visibility
  const renderSection = (sectionId: string) => {
    if (hiddenSections.includes(sectionId)) return null;
    
    switch(sectionId) {
      case 'hero':
        return (
          <div key="hero" className={`text-center ${spacingValues.section}`}>
            {discountPercentage > 0 && (
              <div 
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs mb-4 backdrop-blur-sm"
                style={{ 
                  backgroundColor: `${secondaryColor}20`,
                  borderColor: `${secondaryColor}50`,
                  color: secondaryColor,
                  border: '1px solid'
                }}
              >
                <Clock className="w-3 h-3" />
                <span className="font-medium">Limited Time: {discountPercentage}% Off</span>
              </div>
            )}
            
            <h1 
              className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold mb-3 leading-tight`}
              style={{ fontFamily: fontPair.heading, color: textColor }}
            >
              {name || <span style={{ opacity: 0.4 }}>Your Product Name</span>}
            </h1>
            
            <p 
              className={`${isMobile ? 'text-sm' : 'text-base'} ${spacingValues.element} max-w-xl mx-auto leading-relaxed`}
              style={{ fontFamily: fontPair.body, color: textColor, opacity: 0.8 }}
            >
              {tagline || <span style={{ opacity: 0.5, fontStyle: 'italic' }}>Add a compelling tagline to hook your audience</span>}
            </p>
          </div>
        );
        
      case 'video':
        if (!visuals?.videoUrl) return null;
        const videoEmbed = parseVideoUrl(visuals.videoUrl);
        if (!videoEmbed) return null;
        return (
          <div key="video" className={`max-w-3xl mx-auto ${spacingValues.section}`}>
            <div className="aspect-video rounded-lg overflow-hidden" style={{ backgroundColor: backgroundColor }}>
              <iframe
                src={videoEmbed}
                className="w-full h-full"
                allowFullScreen
                title="Sales video"
              />
            </div>
          </div>
        );
        
      case 'benefits':
        if (benefits.length === 0) return null;
        return (
          <div key="benefits" className={spacingValues.section} id="preview-benefits-section">
            <h2 
              className="text-xl font-bold mb-4 text-center"
              style={{ fontFamily: fontPair.heading, color: textColor }}
            >
              What You'll Get
            </h2>
            <div 
              className={`rounded-lg ${spacingValues.padding}`}
              style={{ 
                backgroundColor: `${textColor}05`,
                ...getCardStyle()
              }}
            >
              <div className="space-y-3">
                {benefits.map((benefit: string, index: number) => (
                  <div key={index} className="flex items-start gap-2">
                    <div 
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: `${primaryColor}30` }}
                    >
                      <Check className="w-3 h-3" style={{ color: primaryColor }} />
                    </div>
                    <p className="text-sm" style={{ fontFamily: fontPair.body, color: textColor, opacity: 0.9 }}>
                      {benefit}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
        
      case 'description':
        if (!description && !name) return null;
        return (
          <div key="description" className={spacingValues.section}>
            <h2 
              className="text-xl font-bold mb-4 text-center"
              style={{ fontFamily: fontPair.heading, color: textColor }}
            >
              About This Product
            </h2>
            {description ? (
              <p 
                className="text-sm leading-relaxed"
                style={{ fontFamily: fontPair.body, color: textColor, opacity: 0.9 }}
              >
                {description}
              </p>
            ) : (
              <div 
                className="text-center py-6 border-2 border-dashed rounded-lg"
                style={{ borderColor: `${textColor}20` }}
              >
                <p className="text-sm italic" style={{ color: textColor, opacity: 0.3 }}>
                  Your product description will appear here after completing Step 2
                </p>
              </div>
            )}
          </div>
        );
        
      case 'audience':
        if (!targetAudience) return null;
        return (
          <div key="audience" className={`${spacingValues.section} text-center`}>
            <div 
              className="inline-block rounded-lg px-6 py-3"
              style={{ 
                backgroundColor: `${textColor}05`,
                border: `1px solid ${textColor}20`
              }}
            >
              <p className="text-sm" style={{ fontFamily: fontPair.body, color: textColor }}>
                <span style={{ opacity: 0.6 }}>Perfect for:</span> {targetAudience}
              </p>
            </div>
          </div>
        );
        
      case 'gallery':
        if (!visuals?.gallery || visuals.gallery.length === 0) return null;
        return (
          <div key="gallery" className={spacingValues.section}>
            <h2 
              className="text-xl font-bold mb-4 text-center"
              style={{ fontFamily: fontPair.heading, color: textColor }}
            >
              See It In Action
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {visuals.gallery.slice(0, 6).map((img: string, index: number) => (
                <div 
                  key={index} 
                  className="aspect-video rounded-lg overflow-hidden"
                  style={{ backgroundColor: `${textColor}10` }}
                >
                  <img 
                    src={img} 
                    alt={`Gallery image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        );
        
      case 'pricing':
      case 'cta':
        if (!name) return null;
        return (
          <div key="cta" className="text-center py-8 border-t" style={{ borderColor: `${textColor}10` }}>
            <p className={`text-sm ${spacingValues.element}`} style={{ color: textColor, opacity: 0.6 }}>
              Ready to get started?
            </p>
            
            <div className={spacingValues.element}>
              {compareAtPrice && compareAtPrice > price && (
                <div className="text-sm mb-1" style={{ color: textColor, opacity: 0.4, textDecoration: 'line-through' }}>
                  {currencySymbol}{formatPrice(compareAtPrice)}
                </div>
              )}
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-bold" style={{ fontFamily: fontPair.heading, color: textColor }}>
                  {priceType === 'free' ? 'FREE' : `${currencySymbol}${formatPrice(price)}`}
                </span>
                {priceType === 'subscription' && (
                  <span className="text-sm" style={{ color: textColor, opacity: 0.6 }}>/{billingFrequency}</span>
                )}
              </div>
              {priceType === 'payment-plan' && (
                <div className="mt-1 text-xs" style={{ color: textColor, opacity: 0.6 }}>
                  or {coreInfo?.numberOfPayments || 3} payments of {currencySymbol}
                  {formatPrice(price / (coreInfo?.numberOfPayments || 3))}
                </div>
              )}
            </div>
            
            <button 
              className={`font-semibold py-3 px-8 inline-flex items-center gap-2 text-sm shadow-lg ${
                animations ? 'transition-all transform hover:scale-105' : ''
              }`}
              style={{ 
                backgroundColor: primaryColor,
                color: '#ffffff',
                borderRadius: getButtonRadius()
              }}
            >
              <ShoppingCart className="w-4 h-4" />
              {ctaButtonText}
            </button>
            
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="flex items-center gap-1 text-xs" style={{ color: textColor, opacity: 0.4 }}>
                <Shield className="w-3 h-3" />
                Secure Checkout
              </div>
              <div className="flex items-center gap-1 text-xs" style={{ color: textColor, opacity: 0.4 }}>
                <Check className="w-3 h-3" />
                Instant Access
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="h-full rounded-lg border border-neutral-800 overflow-hidden flex flex-col" style={{ backgroundColor: backgroundColor }}>
      {/* Browser Chrome */}
      <div className="p-3 bg-neutral-800 border-b border-neutral-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div className="flex-1 mx-4">
          <div className="bg-neutral-900 rounded px-3 py-1 text-xs text-neutral-400 text-center">
            launchpad.com/s/{publish?.slug || 'your-product'}
          </div>
        </div>
        <span className="text-xs text-neutral-500">Live Preview</span>
      </div>
      
      {/* Scrollable Content */}
      <div 
        className="flex-1 overflow-y-auto"
        style={{
          backgroundColor: backgroundColor,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        
        {/* Apply custom CSS if provided */}
        {design?.customCSS && (
          <style dangerouslySetInnerHTML={{ __html: design.customCSS }} />
        )}
        
        <div className={`${isMobile ? 'px-4' : 'px-8'} pt-8 relative`}>
          {/* Header Image */}
          {visuals?.headerImage && (
            visuals.headerImage.startsWith('gradient:') ? (
              <div className={`w-full h-48 ${visuals.headerImage.replace('gradient:', '')} rounded-lg ${spacingValues.element} flex items-center justify-center`}>
                <h2 className="text-3xl font-bold text-white text-center px-4 drop-shadow-lg" style={{ fontFamily: fontPair.heading }}>
                  {name || 'Your Product'}
                </h2>
              </div>
            ) : (
              <div className={`w-full h-48 rounded-lg ${spacingValues.element} overflow-hidden`}>
                <img 
                  src={visuals.headerImage} 
                  alt="Header" 
                  className="w-full h-full object-cover"
                />
              </div>
            )
          )}
          
          <div className="max-w-3xl mx-auto py-6">
            {/* Render sections in custom order */}
            {sectionOrder.map(sectionId => renderSection(sectionId))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesPagePreview;