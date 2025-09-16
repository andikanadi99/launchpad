// components/VideoPreview.tsx

import { useRef, useState, useEffect } from 'react';
import { VideoPreviewSettings } from '../utils/products.types';

interface VideoPreviewProps {
  embedUrl: string;
  previewMode: 'locked' | 'unlocked';
  settings: VideoPreviewSettings;
  isCustomizing?: boolean;
}

export default function VideoPreview({ 
  embedUrl, 
  previewMode, 
  settings,
  isCustomizing = false 
}: VideoPreviewProps) {
  const [showVideo, setShowVideo] = useState(isCustomizing);
  const [timeRemaining, setTimeRemaining] = useState(settings.videoPreviewDuration);
  const videoRef = useRef<HTMLIFrameElement>(null);
  
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (showVideo && previewMode === 'locked' && settings.videoPreviewType === 'limited') {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setShowVideo(false);
            return settings.videoPreviewDuration;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => clearInterval(timer);
  }, [showVideo, previewMode, settings.videoPreviewType, settings.videoPreviewDuration]);
  
  // For locked mode - show preview or sales video
  if (previewMode === 'locked') {
    // No video preview at all
    if (settings.videoPreviewType === 'none') {
      return (
        <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800 flex items-center justify-center">
          <div className="text-center p-8">
            <span className="text-5xl mb-4 block">🔒</span>
            <p className="text-xl text-neutral-300 mb-2">Premium Video Content</p>
            <p className="text-sm text-neutral-500">Purchase to unlock full video access</p>
          </div>
        </div>
      );
    }
    
    // Separate sales/trailer video
    if (settings.videoPreviewType === 'separate' && settings.salesVideoUrl) {
      const salesEmbedUrl = settings.getEmbedUrl(settings.salesVideoUrl);
      return (
        <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
          <iframe
            src={salesEmbedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Sales Video"
          />
        </div>
      );
    }
    
    // Limited preview of main video
    if (settings.videoPreviewType === 'limited') {
      if (!showVideo) {
        return (
          <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800 relative group cursor-pointer"
               onClick={() => setShowVideo(true)}>
            {/* Thumbnail or placeholder */}
            {settings.videoThumbnailUrl ? (
              <img 
                src={settings.videoThumbnailUrl} 
                alt="Video thumbnail" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
                <span className="text-6xl opacity-50">🎬</span>
              </div>
            )}
            
            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
              <div className="bg-white/90 rounded-full p-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-neutral-900" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 4.5v11l8-5.5-8-5.5z" />
                </svg>
              </div>
              <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded">
                <p className="text-xs text-white">
                  {settings.videoPreviewDuration}s free preview
                </p>
              </div>
            </div>
          </div>
        );
      }
      
      // Show limited preview with countdown
      return (
        <div className="relative">
          <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
            <iframe
              ref={videoRef}
              src={`${embedUrl}${embedUrl.includes('?') ? '&' : '?'}autoplay=1`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Video Preview"
            />
          </div>
          
          {/* Countdown overlay */}
          <div className="absolute top-4 right-4 bg-black/70 px-3 py-2 rounded-lg">
            <p className="text-sm text-white font-mono">
              Preview ends in: {timeRemaining}s
            </p>
          </div>
          
          {/* Preview ended overlay */}
          {!showVideo && (
            <div className="absolute inset-0 bg-black/80 rounded-lg flex items-center justify-center">
              <div className="text-center p-8">
                <span className="text-4xl mb-3 block">⏱️</span>
                <p className="text-xl text-white mb-2">Preview Ended</p>
                <p className="text-sm text-neutral-300 mb-4">Purchase to watch the full video</p>
                <button 
                  onClick={() => {
                    setShowVideo(true);
                    setTimeRemaining(settings.videoPreviewDuration);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500"
                >
                  Watch Preview Again
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }
  }
  
  // Full video for unlocked mode
  return (
    <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Full Video"
      />
    </div>
  );
}