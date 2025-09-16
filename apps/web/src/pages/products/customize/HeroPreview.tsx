// customize/HeroPreview.tsx

import { forwardRef } from 'react';
import { ProductFormData, ThemeColors } from '../utils/products.types';

interface HeroPreviewProps {
  formData: ProductFormData;
  theme: ThemeColors;
}

const HeroPreview = forwardRef<HTMLDivElement, HeroPreviewProps>(({ formData, theme }, ref) => {
  return (
    <div ref={ref} className="mb-8">
      <h1 className="text-4xl font-bold mb-4" style={{ color: theme.text }}>
        {formData.title || 'Product Title'}
      </h1>
      <p className="text-xl" style={{ color: theme.subtext }}>
        {formData.description || 'Product description'}
      </p>
    </div>
  );
});

HeroPreview.displayName = 'HeroPreview';

export default HeroPreview;