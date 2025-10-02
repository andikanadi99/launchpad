import React from 'react';
import { 
  ShoppingCart, Check, Shield, Clock, Star, Users,
  Facebook, Twitter, Linkedin, Instagram, Play
} from 'lucide-react';

// Font mappings
const FONT_PAIRS = {
  'inter-system': { heading: 'Inter, sans-serif', body: 'system-ui, sans-serif' },
  'playfair-lato': { heading: '"Playfair Display", serif', body: 'Lato, sans-serif' },
  'montserrat-opensans': { heading: 'Montserrat, sans-serif', body: '"Open Sans", sans-serif' },
  'raleway-merriweather': { heading: 'Raleway, sans-serif', body: 'Merriweather, serif' },
  'poppins-roboto': { heading: 'Poppins, sans-serif', body: 'Roboto, sans-serif' }
};


interface SalesPageContentProps {
  data: {
    coreInfo: any;
    valueProp: any;
    visuals: any;
    design: any;
    publish: any;
  };
  onCtaClick?: () => void;
  className?: string;
}

/**
 * Pure presentational component for rendering sales page content
 * Used by both preview and live views
 */
export default function SalesPageContent({ 
  data, 
  onCtaClick,
  className = ''
}: SalesPageContentProps) {
  
  if (!data) return null;
  
  const { coreInfo, valueProp, visuals, design, publish } = data;
  
  // ==========================================
  // Design Settings & Helpers
  // ==========================================
  
  const primaryColor = design?.primaryColor || '#6366F1';
  const secondaryColor = design?.secondaryColor || '#8B5CF6';
  const backgroundColor = design?.backgroundColor || '#0A0A0A';
  const textColor = design?.textColor || '#E5E5E5';
  const fontPair = FONT_PAIRS[design?.fontPair as keyof typeof FONT_PAIRS] || FONT_PAIRS['inter-system'];
  const buttonStyle = design?.buttonStyle || 'rounded';
  const cardStyle = design?.cardStyle || 'shadow';
  const spacing = design?.spacing || 'compact';
  const sectionOrder = design?.sectionOrder || ['hero', 'video', 'benefits', 'description', 'audience', 'gallery', 'pricing'];
  const hiddenSections = design?.hiddenSections || [];
  const ctaButtonText = design?.ctaButtonText || (coreInfo?.priceType === 'free' ? 'Get Instant Access' : 'Buy Now');
  const animations = design?.animations !== false;
  
  // Spacing helper
  const getSpacing = () => {
    switch(spacing) {
      case 'compact': return { section: 'py-8', element: 'mb-4', padding: 'p-6' };
      case 'spacious': return { section: 'py-16', element: 'mb-8', padding: 'p-10' };
      default: return { section: 'py-12', element: 'mb-6', padding: 'p-8' };
    }
  };
  const spacingValues = getSpacing();
  
  // Button style helper
  const getButtonRadius = () => {
    switch(buttonStyle) {
      case 'square': return '0px';
      case 'pill': return '9999px';
      default: return '8px';
    }
  };
  
  // Card style helper
  const getCardStyle = () => {
    // Use cardElevation from design if available, fallback to cardStyle
    const elevation = design?.cardElevation || cardStyle;
    switch(elevation) {
      case 'flat': return { boxShadow: 'none', border: '1px solid rgba(255,255,255,0.1)' };
      case 'floating': return { boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.7)', transform: 'translateY(-2px)' };
      default: return { boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)' }; // raised
    }
  };

  // Global content width
  const getContentWidth = () => {
    switch(design?.contentWidth) {
      case 'narrow': return 'max-w-3xl';
      case 'wide': return 'max-w-7xl';
      default: return 'max-w-5xl';
    }
  };

  // Header height based on settings - DEFAULT TO BANNER
  const getHeaderHeight = () => {
    const aspectRatio = visuals?.headerImageSettings?.aspectRatio || 'banner';
    switch(aspectRatio) {
      case 'banner': return 'h-24 md:h-32';     // Slimmer: 96px → 128px
      case 'square': return 'h-48 md:h-64';     // Reduced: 192px → 256px
      case 'tall': return 'h-56 md:h-72';       // Reduced: 224px → 288px
      case 'hero': return 'h-64 md:h-80';       // Reduced: 256px → 320px
      default: return 'h-40 md:h-48';          // Standard: 160px → 192px
    }
  };

  // Header image position
  const getHeaderImagePosition = () => {
    if (visuals?.headerImageSettings?.position) {
      const { x, y } = visuals.headerImageSettings.position;
      return `${x}% ${y}%`;
    }
    return 'center center';
  };

  const getImageRadius = () => {
    switch(design?.imageBorderRadius) {
      case 'none': return 'rounded-none';
      case 'small': return 'rounded-md';
      case 'large': return 'rounded-2xl';
      default: return 'rounded-xl'; // medium
    }
  };
  const getHoverScale = () => {
    if (!animations) return '';
    switch(design?.hoverIntensity) {
      case 'subtle': return 'hover:scale-[1.02]';
      case 'bold': return 'hover:scale-110';
      default: return 'hover:scale-105'; // normal
    }
  };

  // Header image zoom
  const getHeaderImageZoom = () => {
    return visuals?.headerImageSettings?.zoom || 1;
  };

  const getTextScale = () => {
    switch(design?.textScale) {
      case 'small': return 0.85;
      case 'large': return 1.15;
      case 'xlarge': return 1.30;
      default: return 1; // normal
    }
  };
  
  // ==========================================
  // Pricing & Currency
  // ==========================================
  
  const currencySymbols: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$'
  };
  const currencySymbol = currencySymbols[coreInfo?.currency || 'USD'] || '$';
  const formatPrice = (amount: number) => amount > 0 ? amount.toFixed(2) : '0.00';
  
  const discountPercentage = coreInfo?.compareAtPrice && coreInfo.compareAtPrice > coreInfo.price 
    ? Math.round(((coreInfo.compareAtPrice - coreInfo.price) / coreInfo.compareAtPrice) * 100)
    : 0;
  
  // ==========================================
  // Video URL Parser & Settings
  // ==========================================
  
  const parseVideoUrl = (url: string) => {
    if (!url) return '';
    
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
    if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    
    const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
    if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;
    
    return url;
  };

  // Video container style based on settings
  const getVideoContainerClass = () => {
    const size = visuals?.videoSettings?.size || 'medium';
    switch(size) {
      case 'small': return 'max-w-2xl';
      case 'large': return 'max-w-6xl';
      case 'full': return 'max-w-full';
      default: return 'max-w-4xl'; // medium
    }
  };

  // Video corner radius
  const getVideoRadius = () => {
    const corners = visuals?.videoSettings?.corners || 'rounded';
    switch(corners) {
      case 'square': return 'rounded-none';
      case 'soft': return 'rounded-lg';
      case 'pill': return 'rounded-3xl';
      default: return 'rounded-xl'; // rounded
    }
  };

  // Video shadow
  const getVideoShadow = () => {
    const shadow = visuals?.videoSettings?.shadow || 'medium';
    switch(shadow) {
      case 'none': return '';
      case 'subtle': return 'shadow-lg';
      case 'dramatic': return 'shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]';
      default: return 'shadow-2xl'; // medium
    }
  };
  
  // ==========================================
  // CTA Click Handler
  // ==========================================
  
  const handleCtaClick = () => {
    if (onCtaClick) {
      onCtaClick();
    } else {
      console.log('CTA clicked - implement checkout flow');
    }
  };

  const getButtonShadow = () => {
    switch(design?.buttonShadow) {
      case 'none': return '';
      case 'small': return 'shadow-sm';
      case 'large': return 'shadow-2xl';
      default: return 'shadow-xl'; // medium
    }
  };
  
  // ==========================================
  // Section Renderers with Advanced Settings
  // ==========================================
  
  const renderHeroSection = () => {
    // Title size based on advanced settings
    const getTitleSize = () => {
      switch(design?.heroTitleSize) {
        case 'small': return 'text-3xl md:text-4xl';
        case 'medium': return 'text-4xl md:text-5xl';
        case 'xl': return 'text-6xl md:text-7xl';
        default: return 'text-3xl md:text-4xl';
      }
    };

    // Text alignment
    const getAlignment = () => {
      switch(design?.heroAlignment) {
        case 'left': return 'text-left';
        case 'right': return 'text-right';
        default: return 'text-center';
      }
    };

    const alignmentClass = getAlignment();
    const justifyClass = design?.heroAlignment === 'left' ? 'justify-start' : 
                        design?.heroAlignment === 'right' ? 'justify-end' : 
                        'justify-center';

    return (
      <section id="hero-section" className={`${alignmentClass} ${spacingValues.section}`}>
        <div className={`${getContentWidth()} mx-auto px-6`}>
          {discountPercentage > 0 && (
            <div className={`flex ${justifyClass} mb-6`}>
              <div 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm backdrop-blur-sm animate-pulse"
                style={{ 
                  backgroundColor: `${secondaryColor}20`,
                  borderColor: `${secondaryColor}50`,
                  color: secondaryColor,
                  border: '1px solid'
                }}
              >
                <Clock className="w-4 h-4" />
                <span className="font-medium">Limited Time: Save {discountPercentage}%</span>
              </div>
            </div>
          )}
          
          <h1 
            className={`${getTitleSize()} font-bold mb-6 leading-tight`}
            style={{ 
              fontFamily: fontPair.heading, 
              color: textColor,
              fontSize: (() => {
                // Smaller, more proportional sizes
                const baseSize = design?.heroTitleSize === 'xl' ? '3.5rem' :
                                design?.heroTitleSize === 'large' ? '2.5rem' :
                                design?.heroTitleSize === 'medium' ? '2rem' :
                                '1.75rem'; // small
                
                // Apply text scale with subtle adjustments
                if (design?.textScale === 'small') {
                  return design?.heroTitleSize === 'xl' ? '3.25rem' :
                        design?.heroTitleSize === 'large' ? '2.25rem' :
                        design?.heroTitleSize === 'medium' ? '1.875rem' :
                        '1.625rem';
                } else if (design?.textScale === 'large') {
                  return design?.heroTitleSize === 'xl' ? '3.75rem' :
                        design?.heroTitleSize === 'large' ? '2.75rem' :
                        design?.heroTitleSize === 'medium' ? '2.125rem' :
                        '1.875rem';
                } else if (design?.textScale === 'xlarge') {
                  return design?.heroTitleSize === 'xl' ? '4rem' :
                        design?.heroTitleSize === 'large' ? '3rem' :
                        design?.heroTitleSize === 'medium' ? '2.25rem' :
                        '2rem';
                }
                return baseSize; // normal text scale
              })()
            }}
          >
            {coreInfo?.name}
          </h1>
          
          {coreInfo?.tagline && (
            <p 
              className="text-xl md:text-xl max-w-3xl leading-relaxed"
              style={{ 
                fontFamily: fontPair.body, 
                color: textColor, 
                opacity: 0.9,
                fontSize: `calc(1.25rem * ${getTextScale()})`, // Apply scale to xl text
                marginLeft: design?.heroAlignment === 'center' ? 'auto' : '0',
                marginRight: design?.heroAlignment === 'center' ? 'auto' : '0'
              }}
            >
              {coreInfo.tagline}
            </p>
          )}
        </div>
      </section>
    );
  };
  
  const renderVideoSection = () => {
    if (!visuals?.videoUrl) return null;
    const videoEmbed = parseVideoUrl(visuals.videoUrl);
    if (!videoEmbed) return null;

    // Check if video should autoplay (from step 3 settings)
    const shouldAutoplay = visuals?.videoSettings?.autoplay || false;
    const embedUrl = shouldAutoplay ? `${videoEmbed}?autoplay=1&mute=1` : videoEmbed;
    
    return (
      <section id="video-section" className={spacingValues.section}>
        <div className={`${getContentWidth()} mx-auto px-6`}>
          {/* Video title/caption if provided */}
          {visuals?.videoSettings?.caption && (
            <div className="text-center mb-6">
              <h3 className="text-2xl font-semibold mb-2" style={{ fontFamily: fontPair.heading, color: textColor }}>
                {visuals.videoSettings.caption}
              </h3>
            </div>
          )}
          
          <div className={`${getVideoContainerClass()} mx-auto`}>
            <div className={`aspect-video ${getVideoRadius()} overflow-hidden ${getVideoShadow()}`} 
                 style={{ backgroundColor }}>
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allowFullScreen
                allow={shouldAutoplay ? "autoplay; encrypted-media" : "encrypted-media"}
                title="Sales video"
              />
            </div>
          </div>

          {/* Video CTA if provided */}
          {visuals?.videoSettings?.ctaText && (
            <div className="text-center mt-6">
              <button 
                onClick={handleCtaClick}
                className={`px-6 py-3 font-semibold inline-flex items-center gap-2 ${
                  animations ? 'transition-all transform hover:scale-105' : ''
                }`}
                style={{ 
                  backgroundColor: primaryColor,
                  color: '#ffffff',
                  borderRadius: getButtonRadius()
                }}
              >
                <Play className="w-5 h-5" />
                {visuals.videoSettings.ctaText}
              </button>
            </div>
          )}
        </div>
      </section>
    );
  };
  
  const renderBenefitsSection = () => {
    if (!valueProp?.benefits?.length) return null;
    
    // Layout configuration
    const getLayoutClass = () => {
      switch(design?.benefitsLayout) {
        case 'single': return '';
        case 'grid': return 'grid-cols-1 md:grid-cols-3';
        default: return 'grid-cols-1 md:grid-cols-2'; // double
      }
    };

    // Icon shape
    const getIconClass = () => {
      switch(design?.benefitsIconStyle) {
        case 'square': return 'rounded-sm';
        case 'hexagon': return 'rounded-lg rotate-45';
        default: return 'rounded-full'; // circle
      }
    };

    const iconRotation = design?.benefitsIconStyle === 'hexagon' ? '-rotate-45' : '';
    
    return (
      <section id="benefits-section" className={spacingValues.section}>
        <div className={`${getContentWidth()} mx-auto px-6`}>
          <h2 
            className="text-3xl md:text-4xl font-bold mb-8 text-center"
            style={{ fontFamily: fontPair.heading, color: textColor }}
          >
            What You'll Get
          </h2>
          <div 
            className={`rounded-xl ${spacingValues.padding} ${
              animations ? `transition-all ${getHoverScale()}` : ''
            }`}
            style={{ 
              backgroundColor: `${textColor}05`,
              ...getCardStyle()
            }}
          >
            <div className={design?.benefitsLayout === 'single' 
              ? 'space-y-6' 
              : `grid ${getLayoutClass()} gap-6`
            }>
              {valueProp.benefits.map((benefit: string, index: number) => (
                <div key={index} className="flex items-start gap-3">
                  <div 
                    className={`w-6 h-6 ${getIconClass()} flex items-center justify-center flex-shrink-0 mt-1`}
                    style={{ backgroundColor: `${primaryColor}30` }}
                  >
                    <Check 
                      className={`w-4 h-4 ${iconRotation}`} 
                      style={{ color: primaryColor }} 
                    />
                  </div>
                 <p className="text-lg" style={{ 
                    fontFamily: fontPair.body, 
                    color: textColor, 
                    opacity: 0.9,
                    fontSize: `calc(1.125rem * ${getTextScale()})` // Apply scale to lg text
                  }}>
                    {benefit}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  };
  
  const renderDescriptionSection = () => {
    if (!valueProp?.description) return null;
    
    return (
      <section id="description-section" className={spacingValues.section}>
        <div className={`${getContentWidth()} mx-auto px-6`}>
          <h2 
            className="text-3xl md:text-4xl font-bold mb-8 text-center"
            style={{ fontFamily: fontPair.heading, color: textColor }}
          >
            About This Product
          </h2>
          <p 
            className="text-lg leading-relaxed text-center max-w-3xl mx-auto"
            style={{ 
              fontFamily: fontPair.body, 
              color: textColor, 
              opacity: 0.9,
              fontSize: `calc(1.125rem * ${getTextScale()})` // Apply scale
            }}
          >
            {valueProp.description}
          </p>
        </div>
      </section>
    );
  };
  
  const renderAudienceSection = () => {
    if (!valueProp?.targetAudience) return null;
    
    return (
      <section id="audience-section" className={`${spacingValues.section} text-center`}>
        <div className={`${getContentWidth()} mx-auto px-6`}>
          <div 
            className="inline-block rounded-xl px-8 py-4"
            style={{ 
              backgroundColor: `${primaryColor}10`,
              border: `2px solid ${primaryColor}30`
            }}
          >
            <p className="text-lg" style={{ 
                fontFamily: fontPair.body, 
                color: textColor,
                fontSize: `calc(1.125rem * ${getTextScale()})` // Apply scale
              }}>
              <span style={{ opacity: 0.7 }}>{valueProp.targetAudiencePrefix || 'Perfect for'}:</span>{' '}
              <span className="font-medium">{valueProp.targetAudience}</span>
            </p>
          </div>
        </div>
      </section>
    );
  };
  
  const renderGallerySection = () => {
    if (!visuals?.gallery?.length) return null;
    
    // Gallery columns configuration
    const getGridCols = () => {
      const cols = design?.galleryColumns || 3;
      switch(cols) {
        case 2: return 'grid-cols-1 md:grid-cols-2';
        case 4: return 'grid-cols-2 md:grid-cols-4';
        case 6: return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6';
        default: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      }
    };
    
    return (
      <section id="gallery-section" className={spacingValues.section}>
        <div className={`${getContentWidth()} mx-auto px-6`}>
          <h2 
            className="text-3xl md:text-4xl font-bold mb-8 text-center"
            style={{ fontFamily: fontPair.heading, color: textColor }}
          >
            See It In Action
          </h2>
          <div className={`grid ${getGridCols()} gap-6`}>
            {visuals.gallery.slice(0, 6).map((img: string, index: number) => (
              <div 
                key={index} 
                className={`aspect-video ${getImageRadius()} overflow-hidden shadow-xl`}
                style={{ backgroundColor: `${textColor}10` }}
              >
                <img 
                  src={img} 
                  alt={`Gallery image ${index + 1}`}
                  className="w-full h-full object-cover"
                  style={{
                    objectPosition: visuals.galleryPositions?.[index] || 'center center'
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  };
  
  const renderPricingSection = () => {
    // Pricing box width
    const getBoxWidth = () => {
      switch(design?.pricingBoxWidth) {
        case 'narrow': return 'max-w-md';
        case 'wide': return 'max-w-4xl';
        default: return 'max-w-2xl'; // standard
      }
    };

    // Button size
    const getButtonSize = () => {
      switch(design?.buttonSize) {
        case 'small': return 'py-2 px-6 text-sm';
        case 'medium': return 'py-3 px-8 text-base';
        case 'xl': return 'py-5 px-12 text-xl';
        default: return 'py-4 px-10 text-lg'; // large
      }
    };

    return (
      <section id="pricing-section" className={`${spacingValues.section} text-center`}>
        <div className={`${getBoxWidth()} mx-auto px-6`}>
          <div 
            className={`rounded-xl ${spacingValues.padding}`}
            style={{ 
              backgroundColor: `${primaryColor}05`,
              border: `2px solid ${primaryColor}20`,
              ...getCardStyle()
            }}
          >
            <h2 
              className="text-2xl font-bold mb-6"
              style={{ fontFamily: fontPair.heading, color: textColor }}
            >
              Ready to Get Started?
            </h2>
            
            <div className="mb-8">
              {coreInfo?.compareAtPrice && coreInfo.compareAtPrice > coreInfo.price && (
                <div className="text-xl mb-2" style={{ color: textColor, opacity: 0.5, textDecoration: 'line-through' }}>
                  {currencySymbol}{formatPrice(coreInfo.compareAtPrice)}
                </div>
              )}
              <div className="flex items-center justify-center gap-2">
                <span className="text-5xl font-bold" style={{ fontFamily: fontPair.heading, color: primaryColor }}>
                  {coreInfo?.priceType === 'free' ? 'FREE' : `${currencySymbol}${formatPrice(coreInfo?.price || 0)}`}
                </span>
                {coreInfo?.priceType === 'subscription' && (
                  <span className="text-lg" style={{ color: textColor, opacity: 0.7 }}>
                    /{coreInfo?.billingFrequency || 'month'}
                  </span>
                )}
              </div>
              {coreInfo?.priceType === 'payment-plan' && (
                <div className="mt-2 text-lg" style={{ color: textColor, opacity: 0.7 }}>
                  or {coreInfo?.numberOfPayments || 3} payments of {currencySymbol}
                  {formatPrice((coreInfo?.price || 0) / (coreInfo?.numberOfPayments || 3))}
                </div>
              )}
            </div>
            
            <button 
              onClick={handleCtaClick}
              className={`font-semibold ${getButtonSize()} inline-flex items-center gap-3 ${getButtonShadow()} ${
                animations ? `transition-all transform ${getHoverScale()} hover:shadow-2xl` : ''
              }`}
              style={{ 
                backgroundColor: primaryColor,
                color: '#ffffff',
                borderRadius: getButtonRadius()
              }}
            >
              <ShoppingCart className="w-5 h-5" />
              {ctaButtonText}
            </button>
            
            <div className="flex items-center justify-center gap-6 mt-6">
              <div className="flex items-center gap-2 text-sm" style={{ color: textColor, opacity: 0.6 }}>
                <Shield className="w-4 h-4" />
                Secure Checkout
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color: textColor, opacity: 0.6 }}>
                <Check className="w-4 h-4" />
                Instant Access
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };
  const renderHeaderImage = () => {
    if (!visuals?.headerImage) return null;
    
    return (
      <div id="header-section" className="relative">
        {visuals.headerImage.startsWith('gradient:') ? (
          <div className={`${getHeaderHeight()} ${visuals.headerImage.replace('gradient:', '')}`}>
            <div className="h-full flex items-center justify-center px-6">
              <h1 className="text-4xl md:text-6xl font-bold text-white text-center drop-shadow-2xl" 
                  style={{ fontFamily: fontPair.heading }}>
                {coreInfo?.name}
              </h1>
            </div>
          </div>
        ) : (
          <div className={`${getHeaderHeight()} relative`}>
            <img 
              src={visuals.headerImage} 
              alt="Header" 
              className="w-full h-full object-cover"
              style={{
                objectPosition: getHeaderImagePosition(),
                transform: `scale(${getHeaderImageZoom()})`,
                transformOrigin: 'center'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}
      </div>
    );
  };
  // ==========================================
  // Section Renderer Mapping
  // ==========================================
  
  const renderSection = (sectionId: string) => {
    if (hiddenSections.includes(sectionId)) return null;
    
    switch(sectionId) {
      case 'header': return renderHeaderImage();
      case 'hero': return renderHeroSection();
      case 'video': return renderVideoSection();
      case 'benefits': return renderBenefitsSection();
      case 'description': return renderDescriptionSection();
      case 'audience': return renderAudienceSection();
      case 'gallery': return renderGallerySection();
      case 'pricing': return renderPricingSection();
      default: return null;
    }
  };
  
  // ==========================================
  // Main Render
  // ==========================================
  
  return (
    <div className={`min-h-screen ${className}`} style={{ backgroundColor }}>
      {/* Header Image */}
      {visuals?.headerImage && (
        <div id="header-section" className="relative">
          {visuals.headerImage.startsWith('gradient:') ? (
            <div className={`${getHeaderHeight()} ${visuals.headerImage.replace('gradient:', '')}`}>
              <div className="h-full flex items-center justify-center px-6">
                <h1 className="text-4xl md:text-6xl font-bold text-white text-center drop-shadow-2xl" 
                    style={{ fontFamily: fontPair.heading }}>
                  {coreInfo?.name}
                </h1>
              </div>
            </div>
          ) : (
            <div className={`${getHeaderHeight()} relative`}>
              <img 
                src={visuals.headerImage} 
                alt="Header" 
                className="w-full h-full object-cover"
                style={{
                  objectPosition: getHeaderImagePosition(),
                  transform: `scale(${getHeaderImageZoom()})`,
                  transformOrigin: 'center'
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          )}
        </div>
      )}

      {/* Dynamic Sections */}
      <main>
        {sectionOrder.map((sectionId: string, index: number) => (
          <div key={`${sectionId}-${index}`}>
            {renderSection(sectionId)}
          </div>
        ))}
      </main>

      {/* Footer */}
      <footer className="border-t" style={{ borderColor: `${textColor}10` }}>
        <div className={`${getContentWidth()} mx-auto px-6 py-8`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm" style={{ color: textColor, opacity: 0.5 }}>
              © {new Date().getFullYear()} {coreInfo?.name || 'All rights reserved'}
            </p>
            
            {/* Social Links */}
            {publish?.socialLinks && Object.values(publish.socialLinks).some(v => v) && (
              <div className="flex items-center gap-4">
                {publish.socialLinks.facebook && (
                  <a href={publish.socialLinks.facebook} target="_blank" rel="noopener noreferrer"
                     className="text-neutral-500 hover:text-white transition-colors">
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {publish.socialLinks.twitter && (
                  <a href={publish.socialLinks.twitter} target="_blank" rel="noopener noreferrer"
                     className="text-neutral-500 hover:text-white transition-colors">
                    <Twitter className="w-5 h-5" />
                  </a>
                )}
                {publish.socialLinks.linkedin && (
                  <a href={publish.socialLinks.linkedin} target="_blank" rel="noopener noreferrer"
                     className="text-neutral-500 hover:text-white transition-colors">
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
                {publish.socialLinks.instagram && (
                  <a href={publish.socialLinks.instagram} target="_blank" rel="noopener noreferrer"
                     className="text-neutral-500 hover:text-white transition-colors">
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}