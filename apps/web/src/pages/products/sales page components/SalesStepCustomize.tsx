import React, { useState, useEffect } from 'react';
import { 
  Type, RotateCcw, ChevronDown,
  Sliders
} from 'lucide-react';

// Font pair options
const FONT_PAIRS = {
  'inter-system': { heading: 'Inter', body: 'system-ui', label: 'Inter + System (Clean)' },
  'playfair-lato': { heading: 'Playfair Display', body: 'Lato', label: 'Playfair + Lato (Elegant)' },
  'montserrat-opensans': { heading: 'Montserrat', body: 'Open Sans', label: 'Montserrat + Open Sans (Modern)' },
  'raleway-merriweather': { heading: 'Raleway', body: 'Merriweather', label: 'Raleway + Merriweather (Classic)' },
  'poppins-roboto': { heading: 'Poppins', body: 'Roboto', label: 'Poppins + Roboto (Friendly)' }
};

interface StepCustomizeProps {
  data: any;
  updateData: (stepKey: string, data: any) => void;
}

const SalesStepCustomize: React.FC<StepCustomizeProps> = ({ data, updateData }) => {
  const [localData, setLocalData] = useState({
    fontPair: 'inter-system',
    spacing: 'comfortable',
    textScale: 'normal',
    lineHeight: 'normal',
  });

  // Sync with parent data
  useEffect(() => {
    if (data?.design) {
      setLocalData(prev => ({
        ...prev,
        fontPair: data.design.fontPair || 'inter-system',
        spacing: data.design.spacing || 'comfortable',
        textScale: data.design.textScale || 'normal',
        lineHeight: data.design.lineHeight || 'normal',
      }));
    }
  }, []);

  // Sync to parent on change
  useEffect(() => {
    updateData('design', localData);
  }, [localData]);

  const updateField = (field: string, value: any) => {
    setLocalData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetToDefaults = () => {
    setLocalData({
      fontPair: 'inter-system',
      spacing: 'comfortable',
      textScale: 'normal',
      lineHeight: 'normal',
    });
  };

  return (
    <div className="space-y-6">

      {/* Font Selection */}
      <div>
        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
          <Type className="w-4 h-4 text-gray-400 dark:text-neutral-400" />
          Font Pair
        </label>
        <select
          value={localData.fontPair}
          onChange={(e) => updateField('fontPair', e.target.value)}
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 rounded-lg border border-gray-300 dark:border-neutral-700 focus:border-purple-500 focus:outline-none text-gray-900 dark:text-white"
        >
          {Object.entries(FONT_PAIRS).map(([key, font]) => (
            <option key={key} value={key}>
              {font.label}
            </option>
          ))}
        </select>
      </div>

      {/* Spacing */}
      <div>
        <label className="block text-sm font-medium mb-2">Page Density</label>
        <div className="flex gap-2">
          {[
            { id: 'compact', label: 'Compact' },
            { id: 'comfortable', label: 'Comfortable' },
            { id: 'spacious', label: 'Spacious' },
          ].map(option => (
            <button
              key={option.id}
              onClick={() => updateField('spacing', option.id)}
              className={`flex-1 px-3 py-2 rounded-lg border transition-all text-sm ${
                localData.spacing === option.id
                  ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-300'
                  : 'border-gray-300 dark:border-neutral-700 text-gray-600 dark:text-neutral-400 hover:border-gray-400 dark:hover:border-neutral-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Typography Section */}
      <details className="group">
        <summary className="cursor-pointer flex items-center justify-between p-3 bg-gray-100 dark:bg-neutral-800 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors">
          <span className="font-medium text-sm flex items-center gap-2">
            <Sliders className="w-4 h-4 text-gray-400 dark:text-neutral-400" />
            Typography Settings
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400 dark:text-neutral-400 group-open:rotate-180 transition-transform" />
        </summary>
        <div className="mt-3 p-4 bg-gray-50 dark:bg-neutral-800/50 rounded-lg space-y-4">
          {/* Text Scale */}
          <div>
            <label className="block text-sm font-medium mb-2">Text Size</label>
            <div className="flex gap-2">
              {['small', 'normal', 'large'].map(size => (
                <button
                  key={size}
                  onClick={() => updateField('textScale', size)}
                  className={`flex-1 px-3 py-2 rounded-lg border capitalize transition-all text-sm ${
                    localData.textScale === size
                      ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-300'
                      : 'border-gray-300 dark:border-neutral-700 text-gray-600 dark:text-neutral-400 hover:border-gray-400 dark:hover:border-neutral-600'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          
          {/* Line Height */}
          <div>
            <label className="block text-sm font-medium mb-2">Line Spacing</label>
            <div className="flex gap-2">
              {['tight', 'normal', 'relaxed'].map(height => (
                <button
                  key={height}
                  onClick={() => updateField('lineHeight', height)}
                  className={`flex-1 px-3 py-2 rounded-lg border capitalize transition-all text-sm ${
                    localData.lineHeight === height
                      ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-300'
                      : 'border-gray-300 dark:border-neutral-700 text-gray-600 dark:text-neutral-400 hover:border-gray-400 dark:hover:border-neutral-600'
                  }`}
                >
                  {height}
                </button>
              ))}
            </div>
          </div>
        </div>
      </details>

      {/* Reset Button */}
      <div className="pt-2">
        <button
          onClick={resetToDefaults}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200 border border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </button>
      </div>
    </div>
  );
};

export default SalesStepCustomize;