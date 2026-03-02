// src/components/CreatorPageRenderer.tsx
// Shared renderer for public creator page and customize preview
// Single source of truth — no duplicate rendering code

import { Link } from 'react-router-dom';
import type { CreatorPageStyle, SectionKey, ProductOverride, ProductSection } from '../lib/Usermodel';
import { DEFAULT_PAGE_STYLE } from '../lib/Usermodel';

// ============================================
// TYPES
// ============================================

export interface CreatorRendererData {
  displayName: string;
  bioShort: string;
  bioLong: string;
  photoURL: string;
  coverImageURL: string;
  socialLinks: Record<string, string>;
  customLinks: { id: string; label: string; url: string }[];
}

export interface ProductCardData {
  slug: string;
  name: string;
  tagline: string;
  price: number;
  priceType: string;
  imageUrl: string;
}

interface CreatorPageRendererProps {
  creator: CreatorRendererData;
  products: ProductCardData[];
  style: CreatorPageStyle;
  productOverrides?: Record<string, ProductOverride>;
  productSections?: ProductSection[];
  preview?: boolean;
  maxWidth?: string;
}

// ============================================
// SOCIAL ICONS (SVG inline for zero deps)
// ============================================

const SOCIAL_ICONS: Record<string, { label: string; svg: JSX.Element }> = {
  website: {
    label: 'Website',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  youtube: {
    label: 'YouTube',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  instagram: {
    label: 'Instagram',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
  },
  twitter: {
    label: 'X',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  tiktok: {
    label: 'TikTok',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
  linkedin: {
    label: 'LinkedIn',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
};

// ============================================
// HELPERS
// ============================================

function formatPrice(price: number, priceType: string): string {
  if (priceType === 'free' || price === 0) return 'Free';
  const formatted = `$${price.toFixed(price % 1 === 0 ? 0 : 2)}`;
  if (priceType === 'subscription') return `${formatted}/mo`;
  return formatted;
}

const SOCIAL_PLATFORMS = ['website', 'youtube', 'instagram', 'twitter', 'tiktok', 'linkedin'];

// ============================================
// MAIN RENDERER
// ============================================

export default function CreatorPageRenderer({
  creator,
  products,
  style: rawStyle,
  productOverrides = {},
  productSections = [],
  preview = false,
  maxWidth = 'max-w-2xl',
}: CreatorPageRendererProps) {
  // Merge with defaults to handle missing fields
  const style: CreatorPageStyle = { ...DEFAULT_PAGE_STYLE, ...rawStyle };

  const accent = style.accentColor;
  const isCompact = style.layoutDensity === 'compact';
  const isSquare = style.photoShape === 'square';
  const isDark = style.theme === 'dark';
  const sectionOrder = style.sectionOrder || ['profile', 'about', 'links', 'products'];

  // Theme-derived colors
  const textColor = isDark ? '#ffffff' : '#111111';
  const subtextColor = isDark ? '#a3a3a3' : '#737373';
  const cardBg = isDark ? `${accent}08` : `${accent}06`;
  const cardBorder = isDark ? `${accent}20` : `${accent}18`;
  const footerColor = isDark ? '#52525280' : '#a3a3a380';

  const activeSocials = SOCIAL_PLATFORMS.filter((p) => creator.socialLinks?.[p]);
  const customLinks = creator.customLinks || [];

  // Product display settings
  const cardStyle = style.productCardStyle || 'standard';
  const showTagline = style.productShowTagline !== false;
  const showPrice = style.productShowPrice !== false;

  // Photo size based on preview or not
  const photoSize = preview ? 'w-[100px] h-[100px]' : 'w-[120px] h-[120px]';
  const photoTextSize = preview ? 'text-3xl' : 'text-4xl';
  const nameSize = preview ? 'text-xl' : 'text-3xl';
  const bioSize = preview ? 'text-sm' : 'text-base';
  const iconSize = preview ? 'w-9 h-9' : 'w-11 h-11';

  // Product card style helpers
  const isCompactCard = cardStyle === 'compact';
  const isFeaturedCard = cardStyle === 'featured';
  const headingColor = textColor;
  const accentColor = accent;

  // ============================================
  // SECTION RENDERERS
  // ============================================

  const renderProfile = () => (
    <div key="profile" className="flex flex-col items-center text-center space-y-4">
      {creator.photoURL ? (
        <img
          src={creator.photoURL}
          alt={creator.displayName}
          className={`${photoSize} object-cover ${isSquare ? 'rounded-2xl' : 'rounded-full'}`}
          style={{ border: `2px solid ${accent}40` }}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className={`${photoSize} flex items-center justify-center ${photoTextSize} font-bold ${isSquare ? 'rounded-2xl' : 'rounded-full'}`}
          style={{ backgroundColor: `${accent}20`, color: accent }}
        >
          {creator.displayName?.charAt(0)?.toUpperCase() || '?'}
        </div>
      )}

      <h1 className={`${nameSize} font-bold`} style={{ color: textColor }}>
        {creator.displayName || 'Your Name'}
      </h1>

      {creator.bioShort && (
        <p className={`${bioSize} max-w-md leading-relaxed`} style={{ color: subtextColor }}>
          {creator.bioShort}
        </p>
      )}

      {activeSocials.length > 0 && (
        <div className="flex items-center gap-3 pt-1">
          {activeSocials.map((platform) => {
            const icon = SOCIAL_ICONS[platform];
            if (!icon) return null;

            const socialEl = (
              <div
                key={platform}
                className={`${iconSize} flex items-center justify-center rounded-full text-neutral-300 transition-colors`}
                style={{ backgroundColor: `${accent}15` }}
                onMouseEnter={preview ? undefined : (e) => {
                  e.currentTarget.style.backgroundColor = `${accent}30`;
                  e.currentTarget.style.color = accent;
                }}
                onMouseLeave={preview ? undefined : (e) => {
                  e.currentTarget.style.backgroundColor = `${accent}15`;
                  e.currentTarget.style.color = '';
                }}
              >
                {icon.svg}
              </div>
            );

            if (preview) return socialEl;

            return (
              <a
                key={platform}
                href={creator.socialLinks[platform]}
                target="_blank"
                rel="noopener noreferrer"
                title={icon.label}
                className={`${iconSize} flex items-center justify-center rounded-full text-neutral-300 transition-colors`}
                style={{ backgroundColor: `${accent}15` }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${accent}30`;
                  e.currentTarget.style.color = accent;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = `${accent}15`;
                  e.currentTarget.style.color = '';
                }}
              >
                {icon.svg}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderLinks = () => {
    const filtered = customLinks.filter(l => l.label && l.url);
    if (filtered.length === 0) return null;
    return (
      <div key="links" className="flex flex-wrap justify-center gap-2">
        {filtered.map((link) => {
          const inner = (
            <>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 opacity-50">
                <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Zm7.5-3.25a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0V4.06l-5.22 5.22a.75.75 0 0 1-1.06-1.06l5.22-5.22h-2.69a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
              </svg>
              {link.label}
            </>
          );

          const cls = "inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-medium transition-colors";
          const inlineStyle = {
            backgroundColor: `${accent}12`,
            border: `1px solid ${accent}25`,
            color: isDark ? '#e5e5e5' : '#333',
          };

          if (preview) {
            return (
              <span key={link.id} className={cls} style={inlineStyle}>
                {inner}
              </span>
            );
          }

          return (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cls}
              style={inlineStyle}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${accent}25`; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = `${accent}12`; }}
            >
              {inner}
            </a>
          );
        })}
      </div>
    );
  };

  const renderProducts = () => {
    let displayProducts = products;
    if (preview && displayProducts.length === 0) {
      displayProducts = [
        {
          slug: 'sample-1',
          name: 'Sample Product',
          tagline: 'A preview of how your products will appear on this page',
          price: 29,
          priceType: 'one-time',
          imageUrl: '',
        },
      ];
    }

    if (displayProducts.length === 0) {
      return (
        <div key="products" className="text-center py-8">
          <p className="text-sm" style={{ color: subtextColor }}>No products yet</p>
        </div>
      );
    }

    const gap = isCompact ? 'gap-3' : 'gap-5';

    // Helper to render a product grid/list with per-section layout
    const renderProductGroup = (
      items: ProductCardData[],
      title?: string,
      sectionOpts?: { layout?: 'list' | 'grid'; headerColor?: string; headerSize?: 'sm' | 'md' | 'lg' }
    ) => {
      const groupIsGrid = (sectionOpts?.layout || style.productLayout || 'list') === 'grid';
      const containerClass = groupIsGrid
        ? `grid grid-cols-2 ${gap}`
        : `flex flex-col ${gap}`;

      // Header size mapping
      const hSizeMap = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' };
      const hSize = hSizeMap[sectionOpts?.headerSize || 'sm'] || 'text-xs';

      // Render card with layout-aware sizing
      const renderCard = (product: ProductCardData) => {
        const override = productOverrides[product.slug] || {};
        const displayImage = override.thumbnail || product.imageUrl;
        const displayTagline = override.description || product.tagline;
        const displayCta = override.ctaText || 'View Product';

        const priceLabel = formatPrice(product.price, product.priceType);

        const cardLink = preview ? '#' : `/p/${product.slug}`;

        // Compact style (no image)
        if (isCompactCard) {
          return (
            <Link
              to={cardLink}
              key={product.slug}
              className={`block rounded-2xl overflow-hidden transition-all duration-200 border ${
                preview ? 'pointer-events-none' : 'hover:shadow-lg hover:-translate-y-0.5'
              }`}
              style={{
                backgroundColor: cardBg,
                borderColor: cardBorder,
              }}
            >
              <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />
              <div className={`${groupIsGrid ? 'p-3' : 'p-5'} space-y-2`}>
                <div className="flex items-start justify-between gap-3">
                  <h3
                    className={`font-semibold leading-snug ${groupIsGrid ? 'text-sm' : 'text-base'}`}
                    style={{ color: headingColor }}
                  >
                    {product.name}
                  </h3>
                  {showPrice && (
                    <span
                      className={`font-bold whitespace-nowrap flex-shrink-0 rounded-lg ${groupIsGrid ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'}`}
                      style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                    >
                      {priceLabel}
                    </span>
                  )}
                </div>
                {showTagline && displayTagline && (
                  <p
                    className={`leading-relaxed break-words ${groupIsGrid ? 'text-xs' : 'text-sm'}`}
                    style={{ color: subtextColor }}
                  >
                    {displayTagline}
                  </p>
                )}
                <div className={groupIsGrid ? 'pt-2' : 'pt-3'}>
                  <div
                    className={`w-full text-center font-semibold rounded-xl transition-all duration-200 ${groupIsGrid ? 'text-xs py-2' : 'text-sm py-2.5'}`}
                    style={{ backgroundColor: accentColor, color: '#ffffff' }}
                  >
                    {displayCta}
                  </div>
                </div>
              </div>
            </Link>
          );
        }

        // Standard / Featured style (with image)
        const aspectClass = isFeaturedCard ? 'aspect-[4/3]' : 'aspect-video';

        return (
          <Link
            to={cardLink}
            key={product.slug}
            className={`block rounded-2xl overflow-hidden transition-all duration-200 border ${
              preview ? 'pointer-events-none' : 'hover:shadow-lg hover:-translate-y-0.5'
            }`}
            style={{
              backgroundColor: cardBg,
              borderColor: cardBorder,
            }}
          >
            {displayImage ? (
              <div className={`w-full ${aspectClass} overflow-hidden`}>
                <img src={displayImage} alt={product.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div
                className={`w-full ${aspectClass} flex items-center justify-center`}
                style={{ backgroundColor: `${accentColor}15` }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1" className="w-12 h-12 opacity-40">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
              </div>
            )}
            <div className={`${groupIsGrid ? 'p-3' : 'p-5'} space-y-2`}>
              <div className="flex items-start justify-between gap-3">
                <h3
                  className={`font-semibold leading-snug ${groupIsGrid ? 'text-sm' : 'text-base'}`}
                  style={{ color: headingColor }}
                >
                  {product.name}
                </h3>
                {showPrice && (
                  <span
                    className={`font-bold whitespace-nowrap flex-shrink-0 rounded-lg ${groupIsGrid ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'}`}
                    style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                  >
                    {priceLabel}
                  </span>
                )}
              </div>
              {showTagline && displayTagline && (
                <p
                  className={`leading-relaxed break-words ${groupIsGrid ? 'text-xs' : 'text-sm'}`}
                  style={{ color: subtextColor }}
                >
                  {displayTagline}
                </p>
              )}
              <div className={groupIsGrid ? 'pt-2' : 'pt-3'}>
                <div
                  className={`w-full text-center font-semibold rounded-xl transition-all duration-200 ${groupIsGrid ? 'text-xs py-2' : 'text-sm py-2.5'}`}
                  style={{ backgroundColor: accentColor, color: '#ffffff' }}
                >
                  {displayCta}
                </div>
              </div>
            </div>
          </Link>
        );
      };

      return (
        <div className={isCompact ? 'space-y-3' : 'space-y-5'}>
          {title && (
            <h2
              className={`font-semibold uppercase tracking-wider ${hSize} ${isCompact ? 'mb-1' : 'mb-2'}`}
              style={{ color: sectionOpts?.headerColor || subtextColor }}
            >
              {title}
            </h2>
          )}
          <div className={containerClass}>
            {items.map(renderCard)}
          </div>
        </div>
      );
    };

    // If no sections defined, render all products flat
    const sections = productSections.filter(s => s.productSlugs.length > 0);
    if (sections.length === 0) {
      return (
        <div key="products">
          {renderProductGroup(displayProducts, displayProducts.length > 1 && !preview ? 'Products' : undefined)}
        </div>
      );
    }

    // Render products grouped by sections
    const assignedSlugs = new Set(sections.flatMap(s => s.productSlugs));
    const unassigned = displayProducts.filter(p => !assignedSlugs.has(p.slug));
    const productMap = new Map(displayProducts.map(p => [p.slug, p]));

    return (
      <div key="products" className={isCompact ? 'space-y-6' : 'space-y-8'}>
        {sections.map((section) => {
          const sectionProducts = section.productSlugs
            .map(slug => productMap.get(slug))
            .filter(Boolean) as ProductCardData[];
          if (sectionProducts.length === 0) return null;
          return (
            <div key={section.id}>
              {renderProductGroup(sectionProducts, section.title, {
                layout: section.layout,
                headerColor: section.headerColor,
                headerSize: section.headerSize,
              })}
            </div>
          );
        })}
        {unassigned.length > 0 && (
          <div>
            {renderProductGroup(unassigned, sections.length > 0 ? 'Other Products' : undefined)}
          </div>
        )}
      </div>
    );
  };

  const renderAbout = () => {
    if (!creator.bioLong) return null;
    return (
      <div key="about" className={`${preview ? 'max-w-sm' : 'max-w-lg'} mx-auto`}>
        <h2
          className={`text-xs font-semibold uppercase tracking-wider ${isCompact ? 'mb-3' : 'mb-4'}`}
          style={{ color: subtextColor }}
        >
          About
        </h2>
        <p
          className={`${preview ? 'text-xs' : 'text-sm'} leading-relaxed whitespace-pre-line`}
          style={{ color: isDark ? '#d4d4d4' : '#404040' }}
        >
          {creator.bioLong}
        </p>
      </div>
    );
  };

  const sectionRenderers: Record<SectionKey, () => JSX.Element | null> = {
    profile: renderProfile,
    about: renderAbout,
    links: renderLinks,
    products: renderProducts,
  };

  // ============================================
  // RENDER
  // ============================================

  const spacing = isCompact ? 'space-y-8' : style.layoutDensity === 'normal' ? 'space-y-10' : 'space-y-12';
  const previewSpacing = isCompact ? 'space-y-6' : style.layoutDensity === 'normal' ? 'space-y-8' : 'space-y-10';
  const topPad = isCompact ? 'pt-12' : style.layoutDensity === 'normal' ? 'pt-14' : 'pt-16';
  const previewTopPad = isCompact ? 'pt-10' : style.layoutDensity === 'normal' ? 'pt-12' : 'pt-14';
  const bottomPad = isCompact ? 'pb-12' : style.layoutDensity === 'normal' ? 'pb-14' : 'pb-16';
  const previewBottomPad = isCompact ? 'pb-10' : style.layoutDensity === 'normal' ? 'pb-12' : 'pb-14';
  const hasCover = !!creator.coverImageURL;

  // Cover image position mapping
  const coverObjectPosition = style.coverPosition === 'top' ? 'top' : style.coverPosition === 'bottom' ? 'bottom' : 'center';
  const coverScale = style.coverZoom || 1;

  // Cover height → aspect ratio mapping
  const coverHeightMap = {
    short:  { full: 'aspect-[6/1]',   preview: 'aspect-[5/1]' },
    medium: { full: 'aspect-[5/1]',   preview: 'aspect-[4/1]' },
    tall:   { full: 'aspect-[3.5/1]', preview: 'aspect-[3/1]' },
  };
  const coverAspect = coverHeightMap[style.coverHeight || 'medium'] || coverHeightMap.medium;

  // Gradient direction + position → CSS
  const dirMap: Record<string, string> = {
    'to-bottom': 'to bottom', 'to-top': 'to top',
    'to-right': 'to right', 'to-left': 'to left',
    'to-br': 'to bottom right', 'to-bl': 'to bottom left',
  };
  const gradDir = dirMap[style.gradientDirection || 'to-bottom'] || 'to bottom';
  const gradPos = style.gradientPosition ?? 50; // 0-100: where color fades out
  const gColor = style.backgroundGradientColor;

  // Build gradient CSS: solid color → transparent, position controls the fade midpoint
  const buildGradient = (opacity: string) =>
    `linear-gradient(${gradDir}, ${gColor}${opacity} 0%, ${gColor}${opacity} ${Math.max(0, gradPos - 25)}%, transparent ${gradPos + 25}%)`;

  const content = (
    <>
      {/* Page-level gradient overlay — sits behind all content */}
      {style.backgroundGradient && (
        <div
          className={`absolute inset-0 z-0 ${preview ? 'rounded-2xl' : ''} pointer-events-none`}
          style={{ background: buildGradient('cc') }}
        />
      )}

      {/* Cover / Banner image */}
      {hasCover && (
        <div className={`relative z-[1] w-full overflow-hidden ${preview ? coverAspect.preview : coverAspect.full}`}>
          <img
            src={creator.coverImageURL}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              objectPosition: coverObjectPosition,
              transform: coverScale !== 1 ? `scale(${coverScale})` : undefined,
            }}
          />
          {/* Bottom fade into page bg */}
          <div
            className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none"
            style={{
              background: `linear-gradient(to top, ${style.backgroundColor}, transparent)`,
            }}
          />
        </div>
      )}

      {/* Content sections */}
      <div className={`relative z-[1] ${preview ? 'max-w-md' : maxWidth} mx-auto px-6 ${hasCover ? '-mt-16' : (preview ? previewTopPad : topPad)} ${preview ? previewBottomPad : bottomPad} ${preview ? previewSpacing : spacing}`}>
        {sectionOrder.map((key) => sectionRenderers[key]?.())}

        {/* Footer */}
        <div className="pt-6 text-center">
          {preview ? (
            <span className="text-[10px]" style={{ color: footerColor }}>
              Powered by LaunchPad
            </span>
          ) : (
            <Link
              to="/"
              className="text-xs transition-colors hover:opacity-80"
              style={{ color: footerColor }}
            >
              Powered by LaunchPad
            </Link>
          )}
        </div>
      </div>
    </>
  );

  // Preview mode: contained box
  if (preview) {
    return (
      <div
        className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xl relative"
        style={{ backgroundColor: style.backgroundColor, minHeight: '500px' }}
      >
        {content}
      </div>
    );
  }

  // Full page mode
  return (
    <div className="min-h-screen relative" style={{ backgroundColor: style.backgroundColor }}>
      {content}
    </div>
  );
}