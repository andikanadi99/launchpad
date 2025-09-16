// customize/PurchasePreview.tsx

import { forwardRef } from 'react';
import { ProductFormData, ThemeColors } from '../utils/products.types';

interface PurchasePreviewProps {
  formData: ProductFormData;
  theme: ThemeColors;
}

const PurchasePreview = forwardRef<HTMLDivElement, PurchasePreviewProps>(({ formData, theme }, ref) => {
  const getButtonClasses = () => {
    const baseClasses = "w-full rounded-lg py-4 text-white font-bold text-lg transition-all";
    
    if (formData.buttonGradient) {
      switch(formData.color) {
        case 'green':
          return `${baseClasses} bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400`;
        case 'blue':
          return `${baseClasses} bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400`;
        case 'purple':
          return `${baseClasses} bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400`;
        case 'red':
          return `${baseClasses} bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400`;
        default:
          return `${baseClasses} bg-gradient-to-r from-green-600 to-emerald-500`;
      }
    } else {
      switch(formData.color) {
        case 'green':
          return `${baseClasses} bg-green-600 hover:bg-green-500`;
        case 'blue':
          return `${baseClasses} bg-blue-600 hover:bg-blue-500`;
        case 'purple':
          return `${baseClasses} bg-purple-600 hover:bg-purple-500`;
        case 'red':
          return `${baseClasses} bg-red-600 hover:bg-red-500`;
        default:
          return `${baseClasses} bg-green-600 hover:bg-green-500`;
      }
    }
  };

  return (
    <div 
      ref={ref} 
      className="rounded-lg p-6 border" 
      style={{
        backgroundColor: theme.cardBg,
        borderColor: theme.border
      }}
    >
      <div className="text-4xl font-bold mb-2" style={{ color: theme.text }}>
        ${formData.price}
      </div>
      <p className="text-sm mb-4" style={{ color: theme.subtext }}>
        One-time payment
      </p>
      
      <button className={getButtonClasses()}>
        Get Instant Access →
      </button>
      
      <div className="mt-4 space-y-2 text-sm">
        {formData.guaranteeItems.filter(item => item.trim()).map((item, i) => (
          <p key={i} className="flex items-center gap-2" style={{ color: theme.subtext }}>
            <span className="text-green-400">✓</span>
            {item}
          </p>
        ))}
      </div>
    </div>
  );
});

PurchasePreview.displayName = 'PurchasePreview';

export default PurchasePreview;