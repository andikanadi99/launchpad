// customize/TestimonialSection.tsx

import { ProductFormData } from '../utils/products.types';

interface TestimonialSectionProps {
  formData: ProductFormData;
  setFormData: (data: ProductFormData) => void;
  scrollToSection: () => void;
}

export default function TestimonialSection({ formData, setFormData, scrollToSection }: TestimonialSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-300">
        Customer Testimonial
        <span className="text-xs font-normal text-neutral-500 ml-2">(optional - builds trust)</span>
      </h3>
      
      {!formData.testimonial && (
        <div className="p-3 bg-neutral-900/50 rounded-lg border border-dashed border-neutral-700 text-xs text-neutral-400">
          💡 Add a customer quote to build credibility
        </div>
      )}
      
      <textarea
        rows={3}
        value={formData.testimonial}
        onChange={(e) => {
          setFormData({...formData, testimonial: e.target.value});
          if (e.target.value) scrollToSection();
        }}
        className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm text-white resize-none"
        placeholder="Add a customer quote to build trust..."
      />
      
      {formData.testimonial && (
        <button
          onClick={() => {
            setFormData({...formData, testimonial: ''});
            scrollToSection();
          }}
          className="text-xs text-red-400 hover:text-red-300"
        >
          Remove testimonial
        </button>
      )}
    </div>
  );
}