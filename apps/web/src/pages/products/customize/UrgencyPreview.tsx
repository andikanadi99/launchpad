// customize/UrgencyPreview.tsx

import { forwardRef } from 'react';
import { ProductFormData } from '../utils/products.types';

interface UrgencyPreviewProps {
  formData: ProductFormData;
}

const UrgencyPreview = forwardRef<HTMLDivElement, UrgencyPreviewProps>(({ formData }, ref) => {
  const getUrgencyMessage = () => {
    if (formData.urgency === 'custom') return formData.customUrgency;
    if (formData.urgency === 'limited') return 'Limited spots available - only a few left!';
    if (formData.urgency === 'price') return 'Price increases soon - lock in this rate now';
    if (formData.urgency === 'bonus') return 'Special bonus expires at midnight tonight';
    return '';
  };

  const message = getUrgencyMessage();
  
  if (!message) return null;

  return (
    <div ref={ref} className="mb-8 p-4 bg-yellow-950/20 border border-yellow-800/30 rounded-lg">
      <p className="text-yellow-400 font-medium flex items-center gap-2">
        {formData.useUrgencyIcon && <span>{formData.urgencyIcon}</span>}
        {message}
      </p>
    </div>
  );
});

UrgencyPreview.displayName = 'UrgencyPreview';

export default UrgencyPreview;