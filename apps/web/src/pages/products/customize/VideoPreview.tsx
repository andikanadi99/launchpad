// customize/VideoPreviewSection.tsx

import { forwardRef } from 'react';
import { ProductFormData, ThemeColors } from '../utils/products.types';
import { getEmbedUrl } from '../utils/ProductHelpers';
import VideoPreview from '../product page components/VideoPreview';

interface VideoPreviewSectionProps {
  formData: ProductFormData;
  theme: ThemeColors;
  videoRefreshKey: number;
}

const VideoPreviewSection = forwardRef<HTMLDivElement, VideoPreviewSectionProps>(
  ({ formData, theme, videoRefreshKey }, ref) => {
    const embedUrl = getEmbedUrl(formData.videoUrl);
    
    return (
      <div ref={ref} className="mb-12">
        <h2 className="text-2xl font-semibold mb-4" style={{ color: theme.text }}>
          {formData.videoTitle || 'Watch This First 👇'}
        </h2>
        
        {formData.videoPreviewType === 'limited' ? (
          // Show the actual video preview with limited time
          <VideoPreview 
            key={videoRefreshKey}
            embedUrl={embedUrl} 
            previewMode="locked"
            settings={{...formData, getEmbedUrl}}
            isCustomizing={true}
          />
        ) : formData.videoPreviewType === 'none' ? (
          // Show locked state
          <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800 flex items-center justify-center">
            <div className="text-center p-8">
              <span className="text-5xl mb-4 block">🔒</span>
              <p className="text-xl text-neutral-300 mb-2">Premium Video Content</p>
              <p className="text-sm text-neutral-500">Preview disabled - video hidden until purchase</p>
            </div>
          </div>
        ) : formData.videoPreviewType === 'separate' && formData.salesVideoUrl ? (
          // Show sales video
          <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
            <iframe
              src={getEmbedUrl(formData.salesVideoUrl)}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Sales Video Preview"
            />
          </div>
        ) : (
          // Placeholder if no sales video URL yet
          <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800 flex items-center justify-center">
            <p className="text-neutral-400">Add a sales video URL to see preview</p>
          </div>
        )}
      </div>
    );
  }
);

VideoPreviewSection.displayName = 'VideoPreviewSection';

export default VideoPreviewSection;