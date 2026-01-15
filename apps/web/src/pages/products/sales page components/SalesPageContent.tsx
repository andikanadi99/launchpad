import React, { useState } from 'react';
import { Shield, Zap, RefreshCw, Instagram, Youtube, ExternalLink, Check } from 'lucide-react';

// Font mappings
const FONT_PAIRS = {
  'inter-system': { heading: 'Inter, sans-serif', body: 'system-ui, sans-serif' },
  'playfair-lato': { heading: '"Playfair Display", serif', body: 'Lato, sans-serif' },
  'montserrat-opensans': { heading: 'Montserrat, sans-serif', body: '"Open Sans", sans-serif' },
  'raleway-merriweather': { heading: 'Raleway, sans-serif', body: 'Merriweather, serif' },
  'poppins-roboto': { heading: 'Poppins, sans-serif', body: 'Roboto, sans-serif' }
};

// Default section order
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
}

/**
 * Centered Card style sales page layout
 * Premium floating card on subtle background
 * Sections render dynamically based on sectionOrder
 */
export default function SalesPageContent({ 
  data, 
  onCtaClick,
  className = ''
}: SalesPageContentProps) {
  
  const [checkoutName, setCheckoutName] = useState('');
  const [checkoutEmail, setCheckoutEmail] = useState('');
  
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
  const sectionOrder: string[] = design?.sectionOrder || DEFAULT_SECTION_ORDER;
  
  // Button settings
  const buttonColor = design?.buttonColor || primaryColor;
  const buttonSize = design?.buttonSize || 'medium';
  
  // Spacing multiplier
  const spacingMultiplier = spacing === 'compact' ? 0.75 : spacing === 'spacious' ? 1.25 : 1;
  const textScaleMultiplier = textScale === 'small' ? 0.9 : textScale === 'large' ? 1.1 : 1;
  const lineHeightValue = lineHeight === 'tight' ? '1.3' : lineHeight === 'relaxed' ? '1.8' : '1.5';
  
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
      case 'small': return '0.625rem';
      case 'large': return '1rem';
      default: return '0.875rem';
    }
  };
  
  // Page background color
  const bgColor = design?.backgroundColor || '#0A0A0A';
  
  // Card background color (custom or auto-detect based on page background)
  const pageDarkMode = parseInt(bgColor.replace('#', ''), 16) < 0x808080;
  const defaultCardColor = pageDarkMode ? '#171717' : '#FFFFFF';
  const cardBgColor = design?.cardColor || defaultCardColor;
  
  // Determine if card is dark (for text colors inside card)
  const isCardDark = parseInt(cardBgColor.replace('#', ''), 16) < 0x808080;
  
  // Colors based on card color (text inside the card)
  const contentTextColor = isCardDark ? '#E5E5E5' : '#1a1a1a';
  const mutedTextColor = isCardDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isCardDark ? '#262626' : '#E5E7EB';
  const inputBgColor = isCardDark ? '#1F1F1F' : '#F9FAFB';
  const inputBorderColor = isCardDark ? '#404040' : '#E5E7EB';
  
  // For backward compatibility
  const isDarkMode = isCardDark;
  
  // Currency formatting
  const currencySymbol = coreInfo?.currency === 'IDR' ? 'Rp' : '$';
  const formatPrice = (price: number) => {
    if (coreInfo?.currency === 'IDR') {
      return price.toLocaleString('id-ID');
    }
    return price.toFixed(price % 1 === 0 ? 0 : 2);
  };
  
  // Social links helper
  const socialLinks = creator?.socialLinks || {};
  const hasSocialLinks = socialLinks.instagram || socialLinks.twitter || socialLinks.youtube || socialLinks.website;
  
  // Handle CTA click
  const handleCtaClick = () => {
    if (onCtaClick) {
      onCtaClick();
    }
  };

  // ===========================================
  // SECTION RENDER FUNCTIONS
  // ===========================================

  const renderCreator = () => {
    if (hiddenSections.includes('creator')) return null;
    if (!creator.showCreator || !creator.name) return null;
    
    return (
      <div key="creator" id="preview-creator" className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          {creator.photo ? (
            <img 
              src={creator.photo} 
              alt={creator.name}
              className="w-11 h-11 rounded-full object-cover"
              style={{ boxShadow: `0 0 0 2px ${cardBgColor}, 0 0 0 4px ${primaryColor}` }}
            />
          ) : (
            <div 
              className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold"
              style={{ backgroundColor: primaryColor, color: '#ffffff' }}
            >
              {creator.name.charAt(0).toUpperCase()}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold truncate" style={{ color: contentTextColor }}>
              {creator.name}
            </h2>
            {creator.bio && (
              <p className="text-xs truncate" style={{ color: mutedTextColor }}>{creator.bio}</p>
            )}
          </div>

          {hasSocialLinks && (
            <div className="flex items-center gap-1">
              {socialLinks.instagram && (
                <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{ backgroundColor: '#E4405F20', color: '#E4405F' }}>
                  <Instagram className="w-3.5 h-3.5" />
                </a>
              )}
              {socialLinks.twitter && (
                <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{ backgroundColor: isDarkMode ? '#FFFFFF20' : '#00000015', color: isDarkMode ? '#FFFFFF' : '#000000' }}>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
              )}
              {socialLinks.youtube && (
                <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{ backgroundColor: '#FF000020', color: '#FF0000' }}>
                  <Youtube className="w-3.5 h-3.5" />
                </a>
              )}
              {socialLinks.website && (
                <a href={socialLinks.website} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderImage = () => {
    if (hiddenSections.includes('image')) return null;
    if (!visuals?.headerImage) return null;
    
    return (
      <div key="image" className="relative h-48 overflow-hidden">
        <img 
          src={visuals.headerImage} 
          alt={coreInfo?.name || 'Product'}
          className="w-full h-full object-cover"
          style={{ 
            objectPosition: `${(visuals.headerImagePosition as { x: number; y: number })?.x ?? 50}% ${(visuals.headerImagePosition as { x: number; y: number })?.y ?? 50}%`,
            transform: `scale(${visuals.headerImageZoom ?? 1})`,
            transformOrigin: `${(visuals.headerImagePosition as { x: number; y: number })?.x ?? 50}% ${(visuals.headerImagePosition as { x: number; y: number })?.y ?? 50}%`
          }}
        />
      </div>
    );
  };

  const renderHero = () => {
    // Hero (title & price) cannot be hidden
    return (
      <div key="hero" id="preview-title" className="flex items-start justify-between gap-4 mb-1">
        <h1 
          className="font-bold leading-tight"
          style={{ 
            color: contentTextColor, 
            fontFamily: fontPair.heading,
            fontSize: `${1.125 * textScaleMultiplier}rem`,
            lineHeight: lineHeightValue
          }}
        >
          {coreInfo?.name || 'Product Name'}
        </h1>
        <div className="flex-shrink-0 text-right">
          <p className="font-bold" style={{ color: primaryColor, fontSize: `${1.125 * textScaleMultiplier}rem` }}>
            {coreInfo?.priceType === 'free' ? 'FREE' : `${currencySymbol}${formatPrice(coreInfo?.price || 0)}`}
            {coreInfo?.priceType === 'subscription' && (
              <span className="font-normal" style={{ color: mutedTextColor, fontSize: `${0.75 * textScaleMultiplier}rem` }}>/mo</span>
            )}
          </p>
          {coreInfo?.compareAtPrice && coreInfo.compareAtPrice > coreInfo.price && (
            <p className="line-through" style={{ color: mutedTextColor, fontSize: `${0.75 * textScaleMultiplier}rem` }}>
              {currencySymbol}{formatPrice(coreInfo.compareAtPrice)}
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderTagline = () => {
    if (hiddenSections.includes('tagline')) return null;
    if (!coreInfo?.tagline) return null;
    
    return (
      <p 
        key="tagline"
        style={{ 
          color: mutedTextColor,
          fontSize: `${0.875 * textScaleMultiplier}rem`,
          marginBottom: `${1 * spacingMultiplier}rem`,
          lineHeight: lineHeightValue,
          wordWrap: 'break-word',
          overflowWrap: 'break-word'
        }}
      >
        {coreInfo.tagline}
      </p>
    );
  };

  const renderDescription = () => {
    if (hiddenSections.includes('description')) return null;
    if (!valueProp?.description) return null;
    
    return (
      <p 
        key="description"
        id="preview-description"
        className="whitespace-pre-line"
        style={{ 
          color: contentTextColor,
          fontSize: `${0.875 * textScaleMultiplier}rem`,
          lineHeight: lineHeightValue,
          marginBottom: `${1.25 * spacingMultiplier}rem`
        }}
      >
        {valueProp.description}
      </p>
    );
  };

  const renderBenefits = () => {
    if (hiddenSections.includes('benefits')) return null;
    if (!valueProp?.benefits?.length) return null;
    
    return (
      <div key="benefits" id="preview-benefits" style={{ marginBottom: `${1.25 * spacingMultiplier}rem` }}>
        <h3 
          className="font-semibold uppercase tracking-wide"
          style={{ 
            color: mutedTextColor,
            fontSize: `${0.75 * textScaleMultiplier}rem`,
            marginBottom: `${0.5 * spacingMultiplier}rem`
          }}
        >
          What's Included
        </h3>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: `${0.5 * spacingMultiplier}rem` }}>
          {valueProp.benefits.map((benefit: string, index: number) => (
            <li key={index} className="flex items-start gap-2.5">
              <div 
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <Check className="w-3 h-3" style={{ color: primaryColor }} />
              </div>
              <span style={{ color: contentTextColor, fontSize: `${0.875 * textScaleMultiplier}rem`, lineHeight: lineHeightValue }}>
                {benefit}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderGuarantees = () => {
    if (hiddenSections.includes('guarantees')) return null;
    if (!valueProp?.guarantees?.length) return null;
    
    return (
      <div key="guarantees">
        {/* Trust Badges */}
        <div className="flex items-center justify-center gap-4 py-4 mb-4 border-y" style={{ borderColor: borderColor }}>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: mutedTextColor }}>
            <Shield className="w-3.5 h-3.5" style={{ color: primaryColor }} />
            <span>Secure</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: mutedTextColor }}>
            <Zap className="w-3.5 h-3.5" style={{ color: primaryColor }} />
            <span>Instant Access</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: mutedTextColor }}>
            <RefreshCw className="w-3.5 h-3.5" style={{ color: primaryColor }} />
            <span>Guaranteed</span>
          </div>
        </div>

        {/* Guarantee Text */}
        <div 
          id="preview-guarantees"
          className="text-xs mb-4 p-3 rounded-xl space-y-2"
          style={{ backgroundColor: `${primaryColor}05`, color: contentTextColor }}
        >
          {valueProp.guarantees.map((guarantee: string, index: number) => (
            <div key={index} className="flex items-start gap-2">
              <RefreshCw className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: primaryColor }} />
              <span>{guarantee}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCheckout = () => {
    // Checkout cannot be hidden
    return (
      <div key="checkout" id="preview-checkout" className="space-y-3">
        {/* Trust badges if no guarantees */}
        {(hiddenSections.includes('guarantees') || !valueProp?.guarantees?.length) && (
          <div className="flex items-center justify-center gap-4 py-4 mb-2 border-y" style={{ borderColor: borderColor }}>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: mutedTextColor }}>
              <Shield className="w-3.5 h-3.5" style={{ color: primaryColor }} />
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: mutedTextColor }}>
              <Zap className="w-3.5 h-3.5" style={{ color: primaryColor }} />
              <span>Instant Access</span>
            </div>
          </div>
        )}
        
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
          className="w-full font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90"
          style={{ 
            backgroundColor: buttonColor,
            color: '#ffffff',
            borderRadius: getButtonRadius(),
            fontSize: `${0.875 * textScaleMultiplier}rem`,
            paddingTop: getButtonPadding(),
            paddingBottom: getButtonPadding()
          }}
        >
          {ctaButtonText} 
          {coreInfo?.priceType !== 'free' && (
            <span className="opacity-80">• {currencySymbol}{formatPrice(coreInfo?.price || 0)}</span>
          )}
        </button>
      </div>
    );
  };

  // ===========================================
  // SECTION RENDERER MAP
  // ===========================================
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    creator: renderCreator,
    image: renderImage,
    hero: renderHero,
    tagline: renderTagline,
    description: renderDescription,
    benefits: renderBenefits,
    guarantees: renderGuarantees,
    checkout: renderCheckout,
  };

  // ===========================================
  // RENDER
  // ===========================================
  
  // Sections that need full width (no horizontal padding)
  const fullWidthSections = ['creator', 'image'];
  
  return (
    <div 
      className={`min-h-screen py-8 px-4 ${className}`}
      style={{ 
        backgroundColor: bgColor,
        fontFamily: fontPair.body
      }}
    >
      {/* Centered Card Container */}
      <div className="max-w-lg mx-auto">
        
        {/* Main Card */}
        <div 
          className="rounded-3xl shadow-xl overflow-hidden"
          style={{ 
            backgroundColor: cardBgColor,
            boxShadow: isDarkMode 
              ? `0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)`
              : `0 25px 50px -12px ${primaryColor}15, 0 0 0 1px rgba(0,0,0,0.03)`
          }}
        >
          
          {/* Render ALL sections in order */}
          {sectionOrder.map((sectionId, index) => {
            const renderer = sectionRenderers[sectionId];
            if (!renderer) return null;
            
            const isFullWidth = fullWidthSections.includes(sectionId);
            const content = renderer();
            
            if (!content) return null;
            
            // Full-width sections render directly
            if (isFullWidth) {
              return content;
            }
            
            // Content sections need padding wrapper
            // Check if this is first content section
            const isFirstContent = !sectionOrder.slice(0, index).some(
              id => !fullWidthSections.includes(id) && sectionRenderers[id]?.()
            );
            
            // Check if this is last content section
            const isLastContent = !sectionOrder.slice(index + 1).some(
              id => !fullWidthSections.includes(id) && sectionRenderers[id]?.()
            );
            
            return (
              <div 
                key={sectionId}
                className="px-6"
                style={{ 
                  paddingTop: isFirstContent ? `${1.25 * spacingMultiplier}rem` : 0,
                  paddingBottom: isLastContent ? `${1.25 * spacingMultiplier}rem` : 0
                }}
              >
                {content}
              </div>
            );
          })}
        </div>

        {/* Footer Links */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button className="text-xs transition-colors hover:opacity-70" style={{ color: mutedTextColor }}>
            Privacy Policy
          </button>
          <span style={{ color: mutedTextColor }}>•</span>
          <button className="text-xs transition-colors hover:opacity-70" style={{ color: mutedTextColor }}>
            Terms of Service
          </button>
        </div>

        {/* Powered By */}
        <div className="text-center mt-4">
          <span className="text-xs" style={{ color: mutedTextColor }}>
            Powered by <span className="font-medium" style={{ color: primaryColor }}>LaunchPad</span>
          </span>
        </div>

      </div>
    </div>
  );
}