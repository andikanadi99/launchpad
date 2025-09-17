// customize/HeroSection.tsx

import { ProductFormData } from '../utils/products.types';

interface HeroSectionProps {
  formData: ProductFormData;
  setFormData: (data: ProductFormData) => void;
  scrollToSection: () => void;
}

export default function HeroSection({ formData, setFormData, scrollToSection }: HeroSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-300">Basic Information</h3>
      
      <div>
        <label className="text-xs text-neutral-400 mb-1 block">Product Name</label>
        <input
          value={formData.title}
          onChange={(e) => {
            setFormData({...formData, title: e.target.value});
            scrollToSection();
          }}
          className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm text-white"
        />
      </div>

      <div>
        <label className="text-xs text-neutral-400 mb-1 block">Price (USD)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={formData.price}
          onChange={(e) => {
            // Ensure price is never negative
            const newPrice = Math.max(0, parseFloat(e.target.value) || 0).toString();
            setFormData({...formData, price: newPrice});
            scrollToSection();
          }}
          className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm text-white"
        />
      </div>

      <div>
        <label className="text-xs text-neutral-400 mb-1 block">Description</label>
        <textarea
          rows={4}
          value={formData.description}
          onChange={(e) => {
            setFormData({...formData, description: e.target.value});
            scrollToSection();
          }}
          className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm resize-none text-white"
        />
      </div>
    </div>
  );
}