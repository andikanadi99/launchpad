// customize/ContentSection.tsx

import { ProductFormData } from '../utils/products.types';

interface ContentSectionProps {
  formData: ProductFormData;
  setFormData: (data: ProductFormData) => void;
  scrollToSection: () => void;
  previewStart: number;
  previewLength: number;
  setPreviewStart: (start: number) => void;
  setPreviewLength: (length: number) => void;
}

export default function ContentSection({ 
  formData, 
  setFormData, 
  scrollToSection,
  previewStart,
  previewLength,
  setPreviewStart,
  setPreviewLength
}: ContentSectionProps) {
  const hasContent = formData.content && !formData.content.startsWith('[REDIRECT:');
  
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-300">Content Preview</h3>
      
      {!hasContent ? (
        <div className="p-3 bg-neutral-900/50 rounded-lg border border-dashed border-neutral-700 text-xs text-neutral-400">
          💡 Add content in Step 2 to customize the preview
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setFormData({...formData, previewType: 'auto'});
                scrollToSection();
              }}
              className={`p-2 rounded border text-xs ${
                formData.previewType === 'auto'
                  ? 'border-green-600 bg-green-950/20'
                  : 'border-neutral-700 hover:bg-neutral-800'
              }`}
            >
              Automatic
            </button>
            <button
              onClick={() => {
                setFormData({...formData, previewType: 'custom'});
                scrollToSection();
              }}
              className={`p-2 rounded border text-xs ${
                formData.previewType === 'custom'
                  ? 'border-green-600 bg-green-950/20'
                  : 'border-neutral-700 hover:bg-neutral-800'
              }`}
            >
              Custom
            </button>
          </div>

          {formData.previewType === 'auto' && (
            <div className="mt-3">
              <label className="text-xs text-neutral-400 block mb-2">
                Preview length: {previewLength} characters
              </label>
              <input
                type="range"
                value={previewLength}
                onChange={(e) => {
                  setPreviewLength(Number(e.target.value));
                  scrollToSection();
                }}
                min={100}
                max={1000}
                step={50}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-neutral-500 mt-1">
                <span>Short</span>
                <span>Medium</span>
                <span>Long</span>
              </div>
            </div>
          )}

          {formData.previewType === 'custom' && (
            <div className="mt-3">
              <label className="text-xs text-neutral-400 block mb-2">
                Custom preview text
              </label>
              <textarea
                rows={4}
                value={formData.customPreview}
                onChange={(e) => {
                  setFormData({...formData, customPreview: e.target.value});
                  scrollToSection();
                }}
                className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm text-white resize-none"
                placeholder="Write what customers see before purchasing..."
              />
              <p className="text-xs text-neutral-500 mt-1">
                {formData.customPreview ? `${formData.customPreview.length} characters` : 'Preview will show placeholder text'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}