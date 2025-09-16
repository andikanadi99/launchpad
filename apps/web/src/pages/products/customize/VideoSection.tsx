// customize/VideoSection.tsx

import { ProductFormData } from '../utils/products.types';

interface VideoSectionProps {
  formData: ProductFormData;
  setFormData: (data: ProductFormData) => void;
  scrollToSection: () => void;
}

export default function VideoSection({ formData, setFormData, scrollToSection }: VideoSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-300">
        Video Section
        {!formData.videoUrl && (
          <span className="text-xs font-normal text-neutral-500 ml-2">(optional - increases engagement)</span>
        )}
      </h3>
      
      {!formData.videoUrl ? (
        <>
          <div className="p-3 bg-neutral-900/50 rounded-lg border border-dashed border-neutral-700 text-xs text-neutral-400">
            💡 Add a video to demonstrate your product or explain its value
          </div>
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Video URL</label>
            <input
              type="url"
              value={formData.videoUrl}
              onChange={(e) => {
                setFormData({...formData, videoUrl: e.target.value});
                if (e.target.value) scrollToSection();
              }}
              className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm text-white"
              placeholder="YouTube, Loom, or Vimeo link"
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Video Section Title</label>
            <input
              value={formData.videoTitle}
              onChange={(e) => {
                setFormData({...formData, videoTitle: e.target.value});
                scrollToSection();
              }}
              className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm text-white"
              placeholder="e.g., Watch This First 👇"
            />
            <p className="text-xs text-neutral-500 mt-1">
              The heading that appears above your video
            </p>
          </div>
          
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Main Video URL</label>
            <input
              type="url"
              value={formData.videoUrl}
              onChange={(e) => {
                setFormData({...formData, videoUrl: e.target.value});
                scrollToSection();
              }}
              className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm text-white"
              placeholder="YouTube, Loom, or Vimeo link"
            />
            <p className="text-xs text-neutral-400 bg-neutral-800/50 rounded p-2 mb-3">
              ℹ️ This is your main content video that customers get full access to after purchase. 
              Below, you can control what they see on the sales page before purchasing.
            </p>
            {formData.videoUrl && (
              <button
                onClick={() => setFormData({...formData, videoUrl: ''})}
                className="text-xs text-red-400 hover:text-red-300 mt-1"
              >
                Remove video
              </button>
            )}
          </div>
          
          {/* Preview Type Selection */}
          <div>
            <label className="text-xs text-neutral-400 mb-2 block">Sales Page Preview Setting</label>
            <p className="text-xs text-neutral-500 mb-2">How should the video appear BEFORE purchase?</p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setFormData({...formData, videoPreviewType: 'limited'});
                  scrollToSection();
                }}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  formData.videoPreviewType === 'limited'
                    ? 'border-green-600 bg-green-950/20'
                    : 'border-neutral-700 hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg">⏱️</span>
                  <div>
                    <div className="font-medium text-sm">Limited Preview (Recommended)</div>
                    <div className="text-xs text-neutral-400">
                      Show first {formData.videoPreviewDuration} seconds of your content video
                    </div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => {
                  setFormData({...formData, videoPreviewType: 'separate'});
                  scrollToSection();
                }}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  formData.videoPreviewType === 'separate'
                    ? 'border-green-600 bg-green-950/20'
                    : 'border-neutral-700 hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg">🎬</span>
                  <div>
                    <div className="font-medium text-sm">Different Sales Video</div>
                    <div className="text-xs text-neutral-400">
                      Upload a separate trailer/pitch video for the sales page
                    </div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => {
                  setFormData({...formData, videoPreviewType: 'none'});
                  scrollToSection();
                }}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  formData.videoPreviewType === 'none'
                    ? 'border-green-600 bg-green-950/20'
                    : 'border-neutral-700 hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg">🔒</span>
                  <div>
                    <div className="font-medium text-sm">No Preview</div>
                    <div className="text-xs text-neutral-400">
                      Video is completely hidden until purchase
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
          
          {/* Separate Sales Video URL */}
          {formData.videoPreviewType === 'separate' && (
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Sales/Trailer Video URL</label>
              <input
                type="url"
                value={formData.salesVideoUrl}
                onChange={(e) => {
                  setFormData({...formData, salesVideoUrl: e.target.value});
                  scrollToSection();
                }}
                className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm text-white"
                placeholder="YouTube, Loom, or Vimeo link for your trailer"
              />
              <p className="text-xs text-neutral-500 mt-1">
                This video will be shown instead of your main content
              </p>
            </div>
          )}
          
          {/* Limited Preview Settings */}
          {formData.videoPreviewType === 'limited' && (
            <>
              <div>
                <label className="text-xs text-neutral-400 mb-2 block">
                  Preview Duration: {formData.videoPreviewDuration} seconds
                </label>
                <input
                  type="range"
                  value={formData.videoPreviewDuration}
                  onChange={(e) => {
                    setFormData({...formData, videoPreviewDuration: Number(e.target.value)});
                    scrollToSection();
                  }}
                  min={10}
                  max={120}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-neutral-500 mt-1">
                  <span>10s</span>
                  <span>60s</span>
                  <span>120s</span>
                </div>
              </div>
              
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">
                  Video Thumbnail URL
                  <span className="text-neutral-500 ml-1">(optional)</span>
                </label>
                <input
                  type="url"
                  value={formData.videoThumbnailUrl}
                  onChange={(e) => {
                    setFormData({...formData, videoThumbnailUrl: e.target.value});
                    scrollToSection();
                  }}
                  className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm text-white"
                  placeholder="https://example.com/thumbnail.jpg"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Custom thumbnail shown before preview starts
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}