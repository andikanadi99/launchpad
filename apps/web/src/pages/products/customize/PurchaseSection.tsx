// customize/PurchaseSection.tsx

import { ProductFormData } from '../utils/products.types';

interface PurchaseSectionProps {
  formData: ProductFormData;
  setFormData: (data: ProductFormData) => void;
  scrollToSection: () => void;
}

export default function PurchaseSection({ formData, setFormData, scrollToSection }: PurchaseSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-300">Purchase Section</h3>
      
      <div>
        <label className="text-xs text-neutral-400 mb-2 block">Button Color</label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { value: 'green', color: '#16a34a' },
            { value: 'blue', color: '#2563eb' },
            { value: 'purple', color: '#7c3aed' },
            { value: 'red', color: '#dc2626' }
          ].map(option => (
            <button
              key={option.value}
              onClick={() => {
                setFormData({...formData, color: option.value as any});
                scrollToSection();
              }}
              className={`h-12 rounded border-2 ${
                formData.color === option.value ? 'border-white' : 'border-neutral-700'
              }`}
              style={{ backgroundColor: option.color }}
            />
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.buttonGradient}
          onChange={(e) => {
            setFormData({...formData, buttonGradient: e.target.checked});
            scrollToSection();
          }}
          className="rounded"
        />
        <span className="text-xs">Use gradient effect</span>
      </label>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs text-neutral-400">Guarantee Items</label>
          <button
            onClick={() => {
              setFormData({
                ...formData,
                guaranteeItems: [...formData.guaranteeItems, '']
              });
              scrollToSection();
            }}
            className="text-xs text-green-400 hover:text-green-300"
          >
            + Add
          </button>
        </div>
        {formData.guaranteeItems.map((item, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              value={item}
              onChange={(e) => {
                const newItems = [...formData.guaranteeItems];
                newItems[i] = e.target.value;
                setFormData({...formData, guaranteeItems: newItems});
                scrollToSection();
              }}
              className="flex-1 rounded bg-neutral-900 border border-neutral-700 px-3 py-1.5 text-sm text-white"
              placeholder="Guarantee item"
            />
            {formData.guaranteeItems.length > 1 && (
              <button
                onClick={() => {
                  setFormData({
                    ...formData,
                    guaranteeItems: formData.guaranteeItems.filter((_, idx) => idx !== i)
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
      </div>
    </div>
  );
}