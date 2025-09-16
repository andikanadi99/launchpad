// customize/ContentPreview.tsx

import { forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ProductFormData, ThemeColors } from '../utils/products.types';
import { getPreviewContent } from '../utils/ProductHelpers';

interface ContentPreviewProps {
  formData: ProductFormData;
  theme: ThemeColors;
  previewStart: number;
  previewLength: number;
}

const ContentPreview = forwardRef<HTMLDivElement, ContentPreviewProps>(
  ({ formData, theme, previewStart, previewLength }, ref) => {
    if (!formData.content || formData.content.startsWith('[REDIRECT:')) return null;

    const previewContent = formData.previewType === 'custom' 
      ? (formData.customPreview || '[Your custom preview text will appear here]')
      : getPreviewContent(formData, previewStart, previewLength);

    return (
      <div ref={ref} className="mb-12">
        <h2 className="text-2xl font-semibold mb-4" style={{ color: theme.text }}>
          Content Preview
        </h2>
        <div className="rounded-lg p-6 border" style={{
          backgroundColor: theme.cardBg,
          borderColor: theme.border
        }}>
          <div 
            className={`prose max-w-none ${
              formData.themePreset === 'light' || 
              formData.themePreset === 'cream' || 
              formData.themePreset === 'mint' 
                ? 'prose-neutral' 
                : 'prose-invert prose-purple'
            }`}
          >
            {formData.content.includes('<') ? (
              <div 
                dangerouslySetInnerHTML={{ __html: previewContent }}
                className={`prose max-w-none ${
                  formData.themePreset === 'light' || 
                  formData.themePreset === 'cream' || 
                  formData.themePreset === 'mint' 
                    ? 'prose-neutral' 
                    : 'prose-invert prose-purple'
                }`}
              />
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {previewContent}
              </ReactMarkdown>
            )}
          </div>
          {formData.content.length > previewLength && formData.previewType !== 'custom' && (
            <div className="mt-6 p-4 bg-gradient-to-t from-black/20 to-transparent rounded-lg">
              <p className="text-center" style={{ color: theme.subtext }}>
                <span className="text-2xl mb-2 block">🔒</span>
                Full content unlocked after purchase
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }
);

ContentPreview.displayName = 'ContentPreview';

export default ContentPreview;