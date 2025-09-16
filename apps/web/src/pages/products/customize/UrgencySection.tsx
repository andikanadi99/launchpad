// customize/UrgencySection.tsx

import { ProductFormData } from '../utils/products.types';
import { urgencyIcons } from '../utils/ThemePresets';

interface UrgencySectionProps {
  formData: ProductFormData;
  setFormData: (data: ProductFormData) => void;
  scrollToSection: () => void;
}

export default function UrgencySection({ formData, setFormData, scrollToSection }: UrgencySectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-300">
        Urgency Message 
        <span className="text-xs font-normal text-neutral-500 ml-2">(optional - increases conversions)</span>
      </h3>
      
      {!formData.urgency && (
        <div className="p-3 bg-neutral-900/50 rounded-lg border border-dashed border-neutral-700 text-xs text-neutral-400">
          💡 Add urgency to create FOMO and drive sales
        </div>
      )}
      
      <select
        value={formData.urgency}
        onChange={(e) => {
          setFormData({...formData, urgency: e.target.value});
          if (e.target.value) scrollToSection();
        }}
        className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm text-white"
      >
        <option value="">No urgency</option>
        <option value="limited">Limited spots available</option>
        <option value="price">Price increases soon</option>
        <option value="bonus">Bonus expires today</option>
        <option value="custom">Custom message...</option>
      </select>

      {formData.urgency && (
        <>
          <div>
            <label className="text-xs text-neutral-400 mb-2 block">Icon</label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.useUrgencyIcon}
                  onChange={(e) => {
                    setFormData({...formData, useUrgencyIcon: e.target.checked});
                    scrollToSection();
                  }}
                  className="rounded"
                />
                <span className="text-xs">Show icon</span>
              </label>
              {formData.useUrgencyIcon && (
                <div className="flex gap-1">
                  {urgencyIcons.map(icon => (
                    <button
                      key={icon}
                      onClick={() => {
                        setFormData({...formData, urgencyIcon: icon});
                        scrollToSection();
                      }}
                      className={`p-1 rounded ${
                        formData.urgencyIcon === icon
                          ? 'bg-yellow-950/30 border border-yellow-600'
                          : 'hover:bg-neutral-800'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {formData.urgency === 'custom' && (
            <input
              value={formData.customUrgency}
              onChange={(e) => {
                setFormData({...formData, customUrgency: e.target.value});
                scrollToSection();
              }}
              className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm text-white"
              placeholder="Enter custom urgency message..."
            />
          )}

          {formData.urgency && (
            <button
              onClick={() => {
                setFormData({...formData, urgency: '', customUrgency: ''});
                scrollToSection();
              }}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Remove urgency
            </button>
          )}
        </>
      )}
    </div>
  );
}