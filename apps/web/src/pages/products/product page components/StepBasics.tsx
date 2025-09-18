// step-components/StepBasics.tsx

import { StepComponentProps } from '../utils/products.types';
import { validateBasicsStep } from '../utils/ProductHelpers';
import { quickPrices } from '../utils/ThemePresets';

export default function StepBasics({ 
  formData, 
  setFormData, 
  setCurrentStep 
}: StepComponentProps) {
  
  return (
    <div className="min-h-screen bg-[#0B0B0D] text-neutral-100 p-6">
      <div className="mx-auto max-w-2xl">
        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-8 text-sm text-neutral-500">
          <span className="text-green-400">Step 1 of 5</span>
          <span>→</span>
          <span>Content</span>
          <span>→</span>
          <span>Preview</span>
          <span>→</span>
          <span>Customize</span>
          <span>→</span>
          <span>Launch</span>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">What are you selling?</h1>
          <p className="text-neutral-400">Just the basics - takes 30 seconds</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm text-neutral-300 mb-2">Product Name</label>
            <input
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 focus:border-green-600 focus:outline-none transition-colors"
              placeholder="e.g., 10 Cold Email Templates That Convert"
              maxLength={100}
            />
            <p className="text-xs text-neutral-500 mt-1">{formData.title.length}/100</p>
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-2">Price (USD)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 pl-8 pr-4 py-3 focus:border-green-600 focus:outline-none transition-colors"
                placeholder="10"
                min="0"
                max="9999"
              />
            </div>
            {/* Quick price suggestions */}
            <div className="flex gap-2 mt-2">
              <span className="text-xs text-neutral-500">Popular prices:</span>
              {quickPrices.map(price => (
                <button
                  key={price}
                  type="button"
                  onClick={() => setFormData({...formData, price})}
                  className="text-xs px-2 py-1 rounded border border-neutral-800 hover:border-green-600 hover:text-green-400 transition-colors"
                >
                  ${price}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-2">
              What problem does this solve?
              <span className="text-neutral-500 text-xs ml-2">(your sales pitch)</span>
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 focus:border-green-600 focus:outline-none transition-colors resize-none"
              placeholder="Help your customers understand why they need this..."
              maxLength={300}
            />
            <p className="text-xs text-neutral-500 mt-1">{formData.description.length}/300</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm text-neutral-300">
                Key Benefits
                <span className="text-neutral-500 text-xs ml-2">(at least 1 benefit, max 100 characters per benefit)</span>
              </label>
              {formData.features.filter(f => f.trim()).length < 5 && (
                <button
                  type="button"
                  onClick={() => setFormData({...formData, features: [...formData.features, '']})}
                  className="text-xs text-green-400 hover:text-green-300"
                >
                  + Add benefit
                </button>
              )}
            </div>
            {formData.features.map((feature, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={feature}
                  onChange={(e) => {
                    const newFeatures = [...formData.features];
                    newFeatures[i] = e.target.value;
                    setFormData({...formData, features: newFeatures});
                  }}
                  className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2 focus:border-green-600 focus:outline-none transition-colors"
                  placeholder={`Benefit ${i + 1}`}
                  maxLength={100}
                />
                {formData.features.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newFeatures = formData.features.filter((_, index) => index !== i);
                      setFormData({...formData, features: newFeatures});
                    }}
                    className="px-3 py-2 rounded-lg border border-neutral-700 hover:border-red-600 hover:text-red-400 transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => setCurrentStep('content')}
            disabled={!validateBasicsStep(formData)}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-green-500 hover:to-emerald-500 transition-all"
          >
            Next: Add Your Content →
          </button>

          {/* Helpful tip */}
          <div className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-800">
            <p className="text-xs text-neutral-400">
              💡 <span className="text-neutral-300">Pro tip:</span> Keep your title under 50 characters and focus on the transformation or result your product delivers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}