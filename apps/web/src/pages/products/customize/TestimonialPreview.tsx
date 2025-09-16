// customize/TestimonialPreview.tsx

import { forwardRef } from 'react';
import { ProductFormData, ThemeColors } from '../utils/products.types';

interface TestimonialPreviewProps {
  formData: ProductFormData;
  theme: ThemeColors;
}

const TestimonialPreview = forwardRef<HTMLDivElement, TestimonialPreviewProps>(({ formData, theme }, ref) => {
  if (!formData.testimonial) return null;

  return (
    <div 
      ref={ref} 
      className="mb-8 p-6 rounded-lg border" 
      style={{
        backgroundColor: theme.cardBg,
        borderColor: theme.border
      }}
    >
      <p className="text-lg italic mb-2" style={{ color: theme.subtext }}>
        "{formData.testimonial}"
      </p>
      <p className="text-sm" style={{ color: theme.subtext, opacity: 0.7 }}>
        — Happy Customer
      </p>
    </div>
  );
});

TestimonialPreview.displayName = 'TestimonialPreview';

export default TestimonialPreview;