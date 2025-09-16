// customize/FeaturesPreview.tsx

import { forwardRef } from 'react';
import { ProductFormData, ThemeColors } from '../utils/products.types';

interface FeaturesPreviewProps {
  formData: ProductFormData;
  theme: ThemeColors;
}

const FeaturesPreview = forwardRef<HTMLDivElement, FeaturesPreviewProps>(({ formData, theme }, ref) => {
  const validFeatures = formData.features.filter(f => f.trim());
  
  if (validFeatures.length === 0) return null;

  return (
    <div ref={ref} className="mb-12">
      <h2 className="text-2xl font-semibold mb-4" style={{ color: theme.text }}>
        {formData.featuresTitle || "What's Included"}
      </h2>
      <div className="rounded-lg p-6 border" style={{ 
        backgroundColor: theme.cardBg,
        borderColor: theme.border 
      }}>
        <ul className="space-y-3">
          {validFeatures.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="text-green-400 text-xl mt-0.5">✓</span>
              <span className="text-lg" style={{ color: theme.text }}>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
});

FeaturesPreview.displayName = 'FeaturesPreview';

export default FeaturesPreview;