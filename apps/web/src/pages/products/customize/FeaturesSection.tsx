// customize/FeaturesSection.tsx

import { ProductFormData } from '../utils/products.types';

interface FeaturesSectionProps {
  formData: ProductFormData;
  setFormData: (data: ProductFormData) => void;
  scrollToSection: () => void;
}

export default function FeaturesSection({ formData, setFormData, scrollToSection }: FeaturesSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-300">Benefits Section</h3>
      
      <div>
        <label className="text-xs text-neutral-400 mb-1 block">Section Title</label>
        <input
          value={formData.featuresTitle}
          onChange={(e) => {
            setFormData({...formData, featuresTitle: e.target.value});
            scrollToSection();
          }}
          className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm text-white"
          placeholder="What's Included"
        />
      </div>

      <div>
        <label className="text-xs text-neutral-400 mb-2 block">Benefits</label>
        {formData.features.map((feature, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              value={feature}
              onChange={(e) => {
                const newFeatures = [...formData.features];
                newFeatures[i] = e.target.value;
                setFormData({...formData, features: newFeatures});
                scrollToSection();
              }}
              className="flex-1 rounded bg-neutral-900 border border-neutral-700 px-3 py-1.5 text-sm text-white"
              placeholder={`Benefit ${i + 1}`}
            />
            {formData.features.length > 1 && (
              <button
                onClick={() => {
                  setFormData({
                    ...formData,
                    features: formData.features.filter((_, idx) => idx !== i)
                  });
                  scrollToSection();
                }}
                className="px-2 text-red-400 hover:text-red-300"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => {
            setFormData({...formData, features: [...formData.features, '']});
            scrollToSection();
          }}
          className="w-full mt-2 py-2 border border-dashed border-neutral-700 rounded text-xs text-green-400 hover:border-green-600 hover:bg-green-950/20"
        >
          + Add Benefit
        </button>
      </div>
    </div>
  );
}