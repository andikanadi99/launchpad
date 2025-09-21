import React from 'react';
import { ShoppingCart, Check, Shield, Clock } from 'lucide-react';

interface SalesPagePreviewProps {
  data: any;
  isMobile?: boolean;
}

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

  // Value prop data - only show if user has entered it
  const description = valueProp?.description || '';
  const benefits = valueProp?.benefits?.length > 0 ? valueProp.benefits : [];

  return (
    <div className="h-full bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden flex flex-col">
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
      
      {/* Scrollable Content with hidden scrollbar */}
      <div 
        className="flex-1 overflow-y-auto bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950"
        style={{
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE and Edge
        }}
      >
        {/* Custom style for webkit browsers */}
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        
        {/* Decorative background pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
        </div>
        
        <div className={`${isMobile ? 'px-4' : 'px-8'} pt-8 relative`}>
          {/* Header Image Placeholder - only show if no header image exists */}
          {!visuals?.headerImage && (
            <div className="w-full h-40 bg-gradient-to-br from-neutral-800/30 to-neutral-900/30 border-2 border-dashed border-neutral-700/50 rounded-lg mb-6 flex items-center justify-center">
              <div className="text-center">
                <div className="text-neutral-600 mb-1">
                  <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-[10px] text-neutral-600">Header image can be added in Step 3</p>
              </div>
            </div>
          )}
          
          <div className="max-w-3xl mx-auto py-6">
            {/* Hero Section - Simplified without price box */}
            <div className="text-center mb-12">
              {/* Badge */}
              {discountPercentage > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-full text-green-400 text-xs mb-4 backdrop-blur-sm">
                  <Clock className="w-3 h-3" />
                  <span className="font-medium">Limited Time: {discountPercentage}% Off</span>
                </div>
              )}
              
              {/* Title */}
              <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-neutral-100 mb-3 leading-tight`}>
                {name || 
                  <span className="text-neutral-600">Your Product Name</span>
                }
              </h1>
              
              {/* Tagline */}
              <p className={`${isMobile ? 'text-sm' : 'text-base'} text-neutral-300 mb-8 max-w-xl mx-auto leading-relaxed`}>
                {tagline || 
                  <span className="text-neutral-600 italic">Add a compelling tagline to hook your audience</span>
                }
              </p>
            </div>
            
            {/* Benefits Section - Only show if user has entered benefits */}
            {benefits.length > 0 && (
              <div className="mb-12" id="preview-benefits-section">
                <h2 className="text-xl font-bold text-neutral-100 mb-4 text-center">
                  What You'll Get
                </h2>
                <div className="bg-gradient-to-b from-neutral-800/30 to-neutral-900/30 backdrop-blur-sm rounded-lg p-6 border border-neutral-700/50">
                  <div className="space-y-3">
                    {benefits.map((benefit, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-green-400" />
                        </div>
                        <p className="text-sm text-neutral-300">{benefit}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Description Section - Show placeholder when Step 1 only */}
            {(description || (name && !benefits.length)) && (
              <div className="mb-12">
                <h2 className="text-xl font-bold text-neutral-100 mb-4 text-center">
                  About This Product
                </h2>
                {description ? (
                  <div className="prose prose-invert max-w-none">
                    <p className="text-sm text-neutral-300 leading-relaxed">{description}</p>
                  </div>
                ) : (
                  <div className="text-center py-6 border-2 border-dashed border-neutral-800/50 rounded-lg">
                    <p className="text-sm text-neutral-600 italic">
                      Your product description will appear here after completing Step 2
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Target Audience Section - Only show if filled */}
            {valueProp?.targetAudience && (
              <div className="mb-12 text-center">
                <div className="inline-block bg-gradient-to-r from-neutral-800/50 to-neutral-900/50 rounded-lg px-6 py-3 border border-neutral-700/50">
                  <p className="text-sm text-neutral-300">
                    <span className="text-neutral-400">Perfect for:</span> {valueProp.targetAudience}
                  </p>
                </div>
              </div>
            )}
            
            {/* Remove the old "Coming Soon" section - we now show placeholders instead */}
            
            {/* Final CTA Section - Always at bottom with price */}
            {name && (
              <div className="text-center py-8 border-t border-neutral-800/50">
                <p className="text-neutral-400 mb-6 text-sm">
                  Ready to get started?
                </p>
                
                {/* Price display */}
                <div className="mb-6">
                  {compareAtPrice && compareAtPrice > price && (
                    <div className="text-neutral-500 line-through text-sm mb-1">
                      {currencySymbol}{formatPrice(compareAtPrice)}
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-3xl font-bold bg-gradient-to-r from-neutral-100 to-neutral-300 bg-clip-text text-transparent">
                      {priceType === 'free' ? 'FREE' : `${currencySymbol}${formatPrice(price)}`}
                    </span>
                    {priceType === 'subscription' && (
                      <span className="text-neutral-400 text-sm">/{billingFrequency}</span>
                    )}
                  </div>
                  {priceType === 'payment-plan' && (
                    <div className="text-neutral-400 mt-1 text-xs">
                      or {coreInfo?.numberOfPayments || 3} payments of {currencySymbol}
                      {formatPrice(price / (coreInfo?.numberOfPayments || 3))}
                    </div>
                  )}
                </div>
                
                {/* CTA Button */}
                <button className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold py-3 px-8 rounded-lg transition-all transform hover:scale-105 inline-flex items-center gap-2 text-sm shadow-lg">
                  <ShoppingCart className="w-4 h-4" />
                  {priceType === 'free' ? 'Get Instant Access' : 'Buy Now'}
                </button>
                
                {/* Trust Badges */}
                <div className="flex items-center justify-center gap-4 mt-4">
                  <div className="flex items-center gap-1 text-xs text-neutral-500">
                    <Shield className="w-3 h-3" />
                    Secure Checkout
                  </div>
                  <div className="flex items-center gap-1 text-xs text-neutral-500">
                    <Check className="w-3 h-3" />
                    Instant Access
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesPagePreview;