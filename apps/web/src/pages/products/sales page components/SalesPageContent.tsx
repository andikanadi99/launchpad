import React, { useState, useEffect, useRef } from 'react';
import { Shield, Zap, RefreshCw, Instagram, Youtube, ExternalLink, Check, ArrowRight, Lock } from 'lucide-react';

// Font mappings
const FONT_PAIRS = {
  'inter-system': { heading: 'Inter, sans-serif', body: 'system-ui, sans-serif' },
  'playfair-lato': { heading: '"Playfair Display", serif', body: 'Lato, sans-serif' },
  'montserrat-opensans': { heading: 'Montserrat, sans-serif', body: '"Open Sans", sans-serif' },
  'raleway-merriweather': { heading: 'Raleway, sans-serif', body: 'Merriweather, serif' },
  'poppins-roboto': { heading: 'Poppins, sans-serif', body: 'Roboto, sans-serif' }
};

// Default section order (kept for compatibility, layout is now fixed)
const DEFAULT_SECTION_ORDER = ['creator', 'image', 'hero', 'tagline', 'description', 'benefits', 'guarantees', 'checkout'];

interface SalesPageContentProps {
  data: {
    coreInfo: any;
    creator?: any;
    valueProp: any;
    visuals: any;
    design: any;
    publish: any;
  };
  onCtaClick?: () => void;
  className?: string;
  isEditorPreview?: boolean;
}

/**
 * Modern Landing Page style sales page
 * Full-width sections with conversion-optimized flow:
 * Creator Bar -> Hero (image + title + CTA) -> Description -> Benefits -> About -> Guarantees -> Checkout
 * Includes sticky buy bar that appears on scroll (disabled in editor preview)
 */
export default function SalesPageContent({ 
  data, 
  onCtaClick,
  className = '',
  isEditorPreview = false
}: SalesPageContentProps) {
  
  const [checkoutName, setCheckoutName] = useState('');
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [heroOutOfView, setHeroOutOfView] = useState(false);
  const [checkoutInView, setCheckoutInView] = useState(false);
  const showStickyBar = !isEditorPreview && heroOutOfView && !checkoutInView;
  const heroCTARef = useRef<HTMLButtonElement>(null);
  const checkoutRef = useRef<HTMLDivElement>(null);
  
  if (!data) return null;
  
  const { coreInfo, valueProp, visuals, design } = data;
  const creator = data.creator || { 
    name: '', 
    photo: '', 
    bio: '', 
    showCreator: true,
    socialLinks: {},
    stats: {}
  };
  
  // Design settings
  const primaryColor = design?.primaryColor || '#6366F1';
  const fontPair = FONT_PAIRS[design?.fontPair as keyof typeof FONT_PAIRS] || FONT_PAIRS['inter-system'];
  const buttonStyle = design?.buttonStyle || 'rounded';
  const ctaButtonText = design?.ctaButtonText || 'Buy Now';
  
  // Advanced settings
  const spacing = design?.spacing || 'comfortable';
  const textScale = design?.textScale || 'normal';
  const lineHeight = design?.lineHeight || 'normal';
  const hiddenSections: string[] = design?.hiddenSections || [];
  
  // Button settings
  const buttonColor = design?.buttonColor || primaryColor;
  const buttonSize = design?.buttonSize || 'medium';
  const buttonTextColor = design?.buttonTextColor || 'auto';
  const titleSize = design?.titleSize || 'normal';
  const hideHeroPrice = design?.hideHeroPrice || false;
  const showHeroCTA = design?.showHeroCTA || false;
  const freeText = design?.freeText || 'FREE';
  
  // Spacing multiplier
  const spacingMultiplier = spacing === 'compact' ? 0.75 : spacing === 'spacious' ? 1.25 : 1;
  const textScaleMultiplier = textScale === 'small' ? 0.9 : textScale === 'large' ? 1.1 : 1;
  const lineHeightValue = lineHeight === 'tight' ? '1.3' : lineHeight === 'relaxed' ? '1.8' : '1.5';
  
  // Title size multiplier
  const titleSizeMultiplier = titleSize === 'small' ? 0.85 : titleSize === 'large' ? 1.15 : titleSize === 'xlarge' ? 1.35 : 1;
  
  // Get button radius based on style
  const getButtonRadius = () => {
    switch (buttonStyle) {
      case 'square': return '0.5rem';
      case 'pill': return '9999px';
      default: return '0.75rem';
    }
  };
  
  // Get button padding based on size
  const getButtonPadding = () => {
    switch (buttonSize) {
      case 'small': return '0.625rem 1.25rem';
      case 'large': return '1rem 2.25rem';
      default: return '0.875rem 1.75rem';
    }
  };
  
  // Get button text color (auto-detect based on background brightness)
  const getButtonTextColor = () => {
    if (buttonTextColor === 'light') return '#ffffff';
    if (buttonTextColor === 'dark') return '#1a1a1a';
    // Check if it's a custom hex color
    if (buttonTextColor?.startsWith('#')) return buttonTextColor;
    // Auto-detect: calculate luminance of button color
    const hex = buttonColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
  };
  
  // Page background color
  const bgColor = design?.backgroundColor || '#0A0A0A';
  
  // Card/section background color
  const pageDarkMode = parseInt(bgColor.replace('#', ''), 16) < 0x808080;
  const defaultCardColor = pageDarkMode ? '#171717' : '#FFFFFF';
  const cardBgColor = design?.cardColor || defaultCardColor;
  
  // Determine if page is dark
  const isCardDark = parseInt(cardBgColor.replace('#', ''), 16) < 0x808080;
  
  // Colors based on theme
  const contentTextColor = isCardDark ? '#E5E5E5' : '#1a1a1a';
  const mutedTextColor = isCardDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isCardDark ? '#262626' : '#E5E7EB';
  const inputBgColor = isCardDark ? '#1F1F1F' : '#F9FAFB';
  const inputBorderColor = isCardDark ? '#404040' : '#E5E7EB';
  const isDarkMode = isCardDark;
  
  // Currency formatting
  const currencySymbols: Record<string, string> = {
    USD: '$', EUR: '\u20AC', GBP: '\u00A3', CAD: 'C$', AUD: 'A$', IDR: 'Rp'
  };
  const currencySymbol = currencySymbols[coreInfo?.currency] || '$';
  const formatPrice = (price: number) => {
    if (coreInfo?.currency === 'IDR') {
      return price.toLocaleString('id-ID');
    }
    return price.toFixed(price % 1 === 0 ? 0 : 2);
  };
  
  // Price display helper
  const priceDisplay = coreInfo?.priceType === 'free' 
    ? freeText 
    : `${currencySymbol}${formatPrice(coreInfo?.price || 0)}`;
  const priceSubtext = coreInfo?.priceType === 'subscription' ? '/mo' : 
    coreInfo?.priceType === 'payment-plan' ? '/payment' : '';
  
  // Social links helper
  const socialLinks = creator?.socialLinks || {};
  const hasSocialLinks = socialLinks.instagram || socialLinks.twitter || socialLinks.youtube || socialLinks.website;
  
  // Handle CTA click
  const handleCtaClick = () => {
    if (onCtaClick) {
      onCtaClick();
    }
  };

  // Scroll to checkout section
  const scrollToCheckout = () => {
    const checkoutEl = document.getElementById('preview-checkout');
    if (checkoutEl) {
      checkoutEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  
  // Sticky bar: show only when hero CTA is out of view AND checkout is not visible
  useEffect(() => {
    const heroObserver = new IntersectionObserver(
      ([entry]) => setHeroOutOfView(!entry.isIntersecting),
      { threshold: 0 }
    );
    const checkoutObserver = new IntersectionObserver(
      ([entry]) => setCheckoutInView(entry.isIntersecting),
      { threshold: 0.1 }
    );
    
    const heroEl = heroCTARef.current;
    const checkoutEl = checkoutRef.current;
    if (heroEl) heroObserver.observe(heroEl);
    if (checkoutEl) checkoutObserver.observe(checkoutEl);
    
    return () => { 
      if (heroEl) heroObserver.unobserve(heroEl); 
      if (checkoutEl) checkoutObserver.unobserve(checkoutEl);
    };
  }, []);

  // ===========================================
  // SECTION COMPONENTS
  // ===========================================

  // -- CREATOR TOP BAR -- (removed: consolidated into About section below)

  // -- HERO SECTION (image + title + tagline + price + CTA) --
  const renderHero = () => {
    const hasImage = !hiddenSections.includes('image') && visuals?.headerImage;
    
    return (
      <div 
        id="preview-title"
        className="relative"
        style={{ backgroundColor: cardBgColor }}
      >
        {/* Header Image */}
        {hasImage && (
          <div className="relative w-full overflow-hidden" style={{ maxHeight: '320px' }}>
            <img 
              src={visuals.headerImage} 
              alt={coreInfo?.name || 'Product'}
              className="w-full h-full object-cover"
              style={{ 
                minHeight: '200px',
                objectPosition: `${(visuals.headerImagePosition as { x: number; y: number })?.x ?? 50}% ${(visuals.headerImagePosition as { x: number; y: number })?.y ?? 50}%`,
                transform: `scale(${visuals.headerImageZoom ?? 1})`,
                transformOrigin: `${(visuals.headerImagePosition as { x: number; y: number })?.x ?? 50}% ${(visuals.headerImagePosition as { x: number; y: number })?.y ?? 50}%`
              }}
            />
            {/* Gradient overlay */}
            <div 
              className="absolute inset-0"
              style={{ 
                background: `linear-gradient(to bottom, transparent 30%, ${cardBgColor})`
              }}
            />
          </div>
        )}
        
        {/* Hero Content */}
        <div 
          className="max-w-3xl mx-auto px-6"
          style={{ 
            paddingTop: hasImage ? '0' : `${3 * spacingMultiplier}rem`,
            paddingBottom: `${2.5 * spacingMultiplier}rem`,
            marginTop: hasImage ? '-4rem' : '0',
            position: 'relative',
            zIndex: 1
          }}
        >
          {/* Tagline above title */}
          {!hiddenSections.includes('tagline') && coreInfo?.tagline && (
            <p
              className="font-medium mb-3"
              style={{ 
                color: primaryColor,
                fontSize: `${0.875 * textScaleMultiplier}rem`,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                maxWidth: '100%'
              }}
            >
              {coreInfo.tagline}
            </p>
          )}
          
          {/* Product Title */}
          <h1 
            className="font-bold leading-tight mb-4"
            style={{ 
              color: coreInfo?.name ? contentTextColor : mutedTextColor, 
              fontFamily: fontPair.heading,
              fontSize: `clamp(1.5rem, 4vw, ${2.25 * textScaleMultiplier * titleSizeMultiplier}rem)`,
              lineHeight: '1.15',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              maxWidth: '100%',
              fontStyle: coreInfo?.name ? 'normal' : 'italic'
            }}
          >
            {coreInfo?.name || 'Enter your product name...'}
          </h1>
          
          {/* Price + Compare */}
          {!hideHeroPrice && (
            <div className="flex items-baseline gap-3 mb-6 flex-wrap">
              <span 
                className="font-bold"
                style={{ 
                  color: primaryColor, 
                  fontSize: `${1.75 * textScaleMultiplier}rem` 
                }}
              >
                {priceDisplay}
                {priceSubtext && (
                  <span 
                    className="font-normal"
                    style={{ color: mutedTextColor, fontSize: `${0.875 * textScaleMultiplier}rem` }}
                  >
                    {priceSubtext}
                  </span>
                )}
              </span>
              {coreInfo?.compareAtPrice && coreInfo.compareAtPrice > coreInfo.price && (
                <>
                  <span 
                    className="line-through"
                    style={{ color: mutedTextColor, fontSize: `${1 * textScaleMultiplier}rem` }}
                  >
                    {currencySymbol}{formatPrice(coreInfo.compareAtPrice)}
                  </span>
                  <span 
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ 
                      backgroundColor: '#10B98120',
                      color: '#10B981'
                    }}
                  >
                    Save {Math.round((1 - coreInfo.price / coreInfo.compareAtPrice) * 100)}%
                  </span>
                </>
              )}
            </div>
          )}
          
          {/* Spacer when price hidden */}
          {hideHeroPrice && <div className="mb-6" />}
          
          {/* Hero CTA Button - only shown if enabled */}
          {showHeroCTA ? (
            <button
              ref={heroCTARef}
              onClick={() => scrollToCheckout()}
              className="font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
              style={{ 
                backgroundColor: buttonColor,
                color: getButtonTextColor(),
                borderRadius: getButtonRadius(),
                fontSize: `${1 * textScaleMultiplier}rem`,
                padding: getButtonPadding(),
                boxShadow: `0 4px 14px ${buttonColor}40`
              }}
            >
              {ctaButtonText}
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            /* Invisible element for sticky bar trigger when CTA is hidden */
            <div ref={heroCTARef as unknown as React.RefObject<HTMLDivElement>} className="h-0 w-0" />
          )}
        </div>
      </div>
    );
  };

  // -- DESCRIPTION SECTION --
  const renderDescription = () => {
    if (hiddenSections.includes('description')) return null;
    if (!valueProp?.description) return null;
    
    return (
      <div 
        id="preview-description"
        style={{ 
          backgroundColor: bgColor,
          paddingTop: `${3 * spacingMultiplier}rem`,
          paddingBottom: `${3 * spacingMultiplier}rem`
        }}
      >
        <div className="max-w-3xl mx-auto px-6">
          <p 
            className="whitespace-pre-line"
            style={{ 
              color: contentTextColor,
              fontSize: `${1.0625 * textScaleMultiplier}rem`,
              lineHeight: lineHeightValue,
              maxWidth: '65ch'
            }}
          >
            {valueProp.description}
          </p>
        </div>
      </div>
    );
  };

  // -- WHAT'S INCLUDED SECTION --
  const renderBenefits = () => {
    if (hiddenSections.includes('benefits')) return null;
    if (!valueProp?.benefits?.length) return null;
    
    return (
      <div 
        id="preview-benefits"
        style={{ 
          backgroundColor: cardBgColor,
          paddingTop: `${3 * spacingMultiplier}rem`,
          paddingBottom: `${3 * spacingMultiplier}rem`
        }}
      >
        <div className="max-w-3xl mx-auto px-6">
          <h2 
            className="font-bold uppercase tracking-widest mb-8"
            style={{ 
              color: primaryColor,
              fontSize: `${0.8 * textScaleMultiplier}rem`,
              letterSpacing: '0.15em'
            }}
          >
            What's Included
          </h2>
          <div className="space-y-0">
            {valueProp.benefits.map((benefit: string, index: number) => (
              <div 
                key={index} 
                className="flex items-start gap-4 py-4"
                style={{ 
                  borderBottom: index < valueProp.benefits.length - 1 ? `1px solid ${borderColor}` : 'none'
                }}
              >
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: `${primaryColor}18` }}
                >
                  <Check className="w-4 h-4" style={{ color: primaryColor }} />
                </div>
                <span 
                  style={{ 
                    color: contentTextColor, 
                    fontSize: `${1 * textScaleMultiplier}rem`, 
                    lineHeight: lineHeightValue 
                  }}
                >
                  {benefit}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // -- ABOUT THE CREATOR SECTION (single consolidated section) --
  const renderCreatorFull = () => {
    if (hiddenSections.includes('creator')) return null;
    if (creator.showCreator === false || !creator.name) return null;
    
    return (
      <div 
        id="preview-creator"
        style={{ 
          backgroundColor: bgColor,
          paddingTop: `${3 * spacingMultiplier}rem`,
          paddingBottom: `${3 * spacingMultiplier}rem`
        }}
      >
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex flex-col items-center text-center">
            {creator.photo ? (
              <img 
                src={creator.photo} 
                alt={creator.name}
                className="w-20 h-20 rounded-full object-cover mb-4"
                style={{ boxShadow: `0 0 0 3px ${bgColor}, 0 0 0 5px ${primaryColor}40` }}
              />
            ) : (
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mb-4"
                style={{ backgroundColor: primaryColor, color: '#ffffff' }}
              >
                {creator.name.charAt(0).toUpperCase()}
              </div>
            )}
            <h3 
              className="font-bold mb-2"
              style={{ 
                color: contentTextColor,
                fontFamily: fontPair.heading,
                fontSize: `${1.25 * textScaleMultiplier}rem`
              }}
            >
              About {creator.name}
            </h3>
            {creator.bio && (
              <p 
                className="max-w-lg mb-4"
                style={{ 
                  color: mutedTextColor,
                  fontSize: `${0.9375 * textScaleMultiplier}rem`,
                  lineHeight: lineHeightValue
                }}
              >
                {creator.bio}
              </p>
            )}
            
            {/* Social Links */}
            {hasSocialLinks && (
              <div className="flex items-center gap-2 mt-1">
                {socialLinks.instagram && (
                  <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{ backgroundColor: '#E4405F20', color: '#E4405F' }}>
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {socialLinks.twitter && (
                  <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{ backgroundColor: isDarkMode ? '#FFFFFF20' : '#00000015', color: isDarkMode ? '#FFFFFF' : '#000000' }}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                )}
                {socialLinks.youtube && (
                  <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{ backgroundColor: '#FF000020', color: '#FF0000' }}>
                    <Youtube className="w-4 h-4" />
                  </a>
                )}
                {socialLinks.website && (
                  <a href={socialLinks.website} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // -- GUARANTEES SECTION --
  const renderGuarantees = () => {
    if (hiddenSections.includes('guarantees')) return null;
    if (!valueProp?.guarantees?.length) return null;
    
    return (
      <div 
        id="preview-guarantees"
        style={{ 
          backgroundColor: cardBgColor,
          paddingTop: `${2.5 * spacingMultiplier}rem`,
          paddingBottom: `${2.5 * spacingMultiplier}rem`
        }}
      >
        <div className="max-w-3xl mx-auto px-6">
          {/* Trust Badges */}
          <div 
            className="flex flex-wrap items-center justify-center gap-6 mb-6 pb-6"
            style={{ borderBottom: `1px solid ${borderColor}` }}
          >
            <div className="flex items-center gap-2" style={{ color: mutedTextColor }}>
              <Shield className="w-5 h-5" style={{ color: primaryColor }} />
              <span style={{ fontSize: `${0.875 * textScaleMultiplier}rem` }}>Secure Checkout</span>
            </div>
            <div className="flex items-center gap-2" style={{ color: mutedTextColor }}>
              <Zap className="w-5 h-5" style={{ color: primaryColor }} />
              <span style={{ fontSize: `${0.875 * textScaleMultiplier}rem` }}>Instant Access</span>
            </div>
            <div className="flex items-center gap-2" style={{ color: mutedTextColor }}>
              <RefreshCw className="w-5 h-5" style={{ color: primaryColor }} />
              <span style={{ fontSize: `${0.875 * textScaleMultiplier}rem` }}>Money-Back Guarantee</span>
            </div>
          </div>

          {/* Guarantee Items */}
          <div className="space-y-3">
            {valueProp.guarantees.map((guarantee: string, index: number) => (
              <div key={index} className="flex items-start gap-3">
                <Shield className="w-4 h-4 mt-1 flex-shrink-0" style={{ color: primaryColor }} />
                <span style={{ 
                  color: contentTextColor,
                  fontSize: `${0.9375 * textScaleMultiplier}rem`,
                  lineHeight: lineHeightValue
                }}>
                  {guarantee}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // -- CHECKOUT / FINAL CTA SECTION --
  const renderCheckout = () => {
    return (
      <div 
        id="preview-checkout"
        ref={checkoutRef}
        style={{ 
          backgroundColor: bgColor,
          paddingTop: `${3 * spacingMultiplier}rem`,
          paddingBottom: `${3 * spacingMultiplier}rem`
        }}
      >
        <div className="max-w-xl mx-auto px-6">
          {/* Unified Checkout Card */}
          <div 
            className="rounded-2xl overflow-hidden"
            style={{ 
              backgroundColor: cardBgColor,
              border: `1px solid ${borderColor}`,
              boxShadow: isDarkMode 
                ? `0 20px 40px -12px rgba(0,0,0,0.5)`
                : `0 20px 40px -12px ${primaryColor}15`
            }}
          >
            {/* Accent stripe */}
            <div style={{ height: '4px', background: `linear-gradient(to right, ${primaryColor}, ${buttonColor})` }} />
            
            {/* Card content */}
            <div className="p-8 space-y-5">
              {/* Heading inside card */}
              <div className="text-center">
                <h2 
                  className="font-bold"
                  style={{ 
                    color: contentTextColor,
                    fontFamily: fontPair.heading,
                    fontSize: `${1.375 * textScaleMultiplier}rem`
                  }}
                >
                  Get Started Today
                </h2>
              </div>

              {/* Form inputs */}
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Your name"
                  value={checkoutName}
                  onChange={(e) => setCheckoutName(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border-2 focus:outline-none transition-all text-sm"
                  style={{ 
                    borderColor: checkoutName ? primaryColor : inputBorderColor,
                    backgroundColor: checkoutName ? `${primaryColor}10` : inputBgColor,
                    color: contentTextColor
                  }}
                />
                <input
                  type="email"
                  placeholder="Email address"
                  value={checkoutEmail}
                  onChange={(e) => setCheckoutEmail(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border-2 focus:outline-none transition-all text-sm"
                  style={{ 
                    borderColor: checkoutEmail ? primaryColor : inputBorderColor,
                    backgroundColor: checkoutEmail ? `${primaryColor}10` : inputBgColor,
                    color: contentTextColor
                  }}
                />

                <button 
                  id="preview-cta-button"
                  onClick={handleCtaClick}
                  className="w-full font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 hover:scale-[1.01] active:scale-[0.99]"
                  style={{ 
                    backgroundColor: buttonColor,
                    color: getButtonTextColor(),
                    borderRadius: getButtonRadius(),
                    fontSize: `${1.0625 * textScaleMultiplier}rem`,
                    padding: getButtonPadding(),
                    boxShadow: `0 4px 14px ${buttonColor}30`
                  }}
                >
                  {ctaButtonText}
                  {coreInfo?.priceType !== 'free' && (
                    <span className="opacity-80"> {'\u00B7'} {priceDisplay}</span>
                  )}
                </button>
              </div>

              {/* Security note */}
              <div className="flex items-center justify-center gap-1.5">
                <Lock className="w-3 h-3" style={{ color: mutedTextColor }} />
                <span style={{ color: mutedTextColor, fontSize: '0.75rem' }}>
                  Secure checkout {'\u00B7'} Instant delivery
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ===========================================
  // SECTION RENDERER MAP
  // ===========================================
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    hero: renderHero,
    description: renderDescription,
    benefits: renderBenefits,
    creator: renderCreatorFull,
    guarantees: renderGuarantees,
    checkout: renderCheckout,
  };

  // Default section order
  const defaultOrder = ['hero', 'description', 'benefits', 'creator', 'guarantees', 'checkout'];
  
  // Get ordered sections from design.sectionOrder
  const sectionOrder = (() => {
    const savedOrder: string[] = design?.sectionOrder || [];
    // Filter to only known sections
    const filtered = savedOrder.filter(id => sectionRenderers[id]);
    // Add any missing sections at the end
    defaultOrder.forEach(id => {
      if (!filtered.includes(id)) filtered.push(id);
    });
    return filtered;
  })();

  // ===========================================
  // MAIN RENDER
  // ===========================================
  
  return (
    <div 
      className={`min-h-screen ${className}`}
      style={{ 
        backgroundColor: bgColor,
        fontFamily: fontPair.body
      }}
    >
      {/* Render all sections in user-defined order */}
      {sectionOrder.map(sectionId => {
        const renderer = sectionRenderers[sectionId];
        if (!renderer) return null;
        return <React.Fragment key={sectionId}>{renderer()}</React.Fragment>;
      })}

      {/* Footer */}
      <div 
        className="text-center py-8"
        style={{ backgroundColor: bgColor }}
      >
        <div className="flex items-center justify-center gap-4 mb-3">
          <button className="text-xs transition-colors hover:opacity-70" style={{ color: mutedTextColor }}>
            Privacy Policy
          </button>
          <span style={{ color: mutedTextColor }}>{'\u00B7'}</span>
          <button className="text-xs transition-colors hover:opacity-70" style={{ color: mutedTextColor }}>
            Terms of Service
          </button>
        </div>
        <span className="text-xs" style={{ color: mutedTextColor }}>
          Powered by <span className="font-medium" style={{ color: primaryColor }}>LaunchPad</span>
        </span>
      </div>

      {/* STICKY BUY BAR */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 transition-all duration-300"
        style={{ 
          transform: showStickyBar ? 'translateY(0)' : 'translateY(100%)',
          opacity: showStickyBar ? 1 : 0,
          backgroundColor: cardBgColor,
          borderTop: `1px solid ${borderColor}`,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.3)'
        }}
      >
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p 
              className="font-semibold truncate text-sm"
              style={{ color: contentTextColor }}
            >
              {coreInfo?.name || 'Product Name'}
            </p>
            <p 
              className="font-bold text-sm"
              style={{ color: primaryColor }}
            >
              {priceDisplay}{priceSubtext}
            </p>
          </div>
          <button
            onClick={() => scrollToCheckout()}
            className="font-semibold flex items-center gap-2 flex-shrink-0 transition-all hover:opacity-90"
            style={{ 
              backgroundColor: buttonColor,
              color: getButtonTextColor(),
              borderRadius: getButtonRadius(),
              fontSize: `${0.875 * textScaleMultiplier}rem`,
              padding: '0.625rem 1.25rem'
            }}
          >
            {ctaButtonText}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}