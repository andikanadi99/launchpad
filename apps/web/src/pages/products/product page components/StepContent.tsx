// step-components/StepContent.tsx

import { useState } from 'react';
import { StepComponentProps, ContentType, ContentMethod } from '../utils/products.types';
import { validateContentStep, processUploadedFile, getEmbedUrl } from '../utils/ProductHelpers';
import TextEditor from './TextEditor';

export default function StepContent({ 
  formData, 
  setFormData, 
  setCurrentStep 
}: StepComponentProps) {
  const [contentType, setContentType] = useState<ContentType>(formData.contentType || 'text');
  const [contentMethod, setContentMethod] = useState<ContentMethod>('upload');
  const [contentLink, setContentLink] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleFileUpload = async (file: File) => {
    setIsProcessingFile(true);
    setUploadError('');
    
    const result = await processUploadedFile(file, formData, setFormData, setContentType);
    
    if (result.success) {
      setUploadedFile(file);
    } else {
      setUploadError(result.error || 'Error processing file');
    }
    
    setIsProcessingFile(false);
  };

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-neutral-100 p-6">
      <div className="mx-auto max-w-2xl">
        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-8 text-sm text-neutral-500">
          <span className="text-neutral-300">Step 1</span>
          <span>→</span>
          <span className="text-green-400">Step 2 of 5</span>
          <span>→</span>
          <span>Preview</span>
          <span>→</span>
          <span>Customize</span>
          <span>→</span>
          <span>Launch</span>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Step 2: Your Content</h1>
          <p className="text-neutral-400">What are you delivering to customers?</p>
        </div>

        <div className="space-y-6">
          {/* Content Type Selection */}
          <div className="bg-neutral-950/50 rounded-lg p-4 border border-neutral-700">
            <p className="text-sm text-neutral-300 mb-3">Content Type</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setContentType('text')}
                className={`p-3 rounded-lg border text-center ${
                  contentType === 'text' 
                    ? 'border-green-600 bg-green-950/20 text-green-400' 
                    : 'border-neutral-700 hover:bg-neutral-800'
                }`}
              >
                <div className="text-2xl mb-1">📝</div>
                <div className="text-xs">Text Only</div>
              </button>
              <button
                onClick={() => setContentType('video')}
                className={`p-3 rounded-lg border text-center ${
                  contentType === 'video' 
                    ? 'border-green-600 bg-green-950/20 text-green-400' 
                    : 'border-neutral-700 hover:bg-neutral-800'
                }`}
              >
                <div className="text-2xl mb-1">🎥</div>
                <div className="text-xs">Video Only</div>
              </button>
              <button
                onClick={() => setContentType('both')}
                className={`p-3 rounded-lg border text-center ${
                  contentType === 'both' 
                    ? 'border-green-600 bg-green-950/20 text-green-400' 
                    : 'border-neutral-700 hover:bg-neutral-800'
                }`}
              >
                <div className="text-2xl mb-1">🎯</div>
                <div className="text-xs">Both</div>
              </button>
            </div>
          </div>

          {/* Video Content */}
          {(contentType === 'video' || contentType === 'both') && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-300 mb-2">Main Video (Featured)</label>
                <input
                  type="url"
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({...formData, videoUrl: e.target.value})}
                  placeholder="YouTube, Loom, or Vimeo link (shown on sales page)"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3"
                />
              </div>

              {/* Additional Videos */}
              <div>
                <label className="block text-sm text-neutral-300 mb-2">
                  Additional Videos 
                  <span className="text-xs text-neutral-500 ml-2">(shown after main video)</span>
                </label>
                
                {formData.videoUrls.map((url, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => {
                        const newUrls = [...formData.videoUrls];
                        newUrls[i] = e.target.value;
                        setFormData({...formData, videoUrls: newUrls});
                      }}
                      placeholder="Additional video URL"
                      className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2"
                    />
                    <button
                      onClick={() => {
                        setFormData({
                          ...formData,
                          videoUrls: formData.videoUrls.filter((_, idx) => idx !== i)
                        });
                      }}
                      className="px-3 py-2 rounded-lg border border-neutral-700 hover:border-red-600 hover:text-red-400"
                    >
                      ×
                    </button>
                  </div>
                ))}
                
                <button
                  onClick={() => {
                    setFormData({
                      ...formData,
                      videoUrls: [...formData.videoUrls, '']
                    });
                  }}
                  className="w-full mt-2 py-2 border border-dashed border-neutral-700 rounded text-xs text-green-400 hover:border-green-600"
                >
                  + Add Another Video
                </button>

                {formData.videoUrls.filter(url => url).length > 0 && (
                  <p className="text-xs text-neutral-500 mt-2">
                    {formData.videoUrls.filter(url => url).length} additional video{formData.videoUrls.filter(url => url).length !== 1 ? 's' : ''} added
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Text Content */}
          {(contentType === 'text' || contentType === 'both') && (
            <div>
              <label className="block text-sm text-neutral-300 mb-3">How will you add your content?</label>
              
              {/* Content Method Selection */}
              <div className="grid grid-cols-1 gap-3 mb-6">
                {/* Upload File Option */}
                <button
                  onClick={() => setContentMethod('upload')}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    contentMethod === 'upload'
                      ? 'border-green-600 bg-green-950/20'
                      : 'border-neutral-700 hover:bg-neutral-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">📁</span>
                    <div>
                      <div className="font-medium mb-1">Upload File</div>
                      <div className="text-xs text-neutral-400">
                        Import from Notion, Google Docs, or any .md/.txt file
                      </div>
                    </div>
                  </div>
                </button>

                {/* Paste Content Option */}
                <button
                  onClick={() => setContentMethod('paste')}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    contentMethod === 'paste'
                      ? 'border-green-600 bg-green-950/20'
                      : 'border-neutral-700 hover:bg-neutral-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">📝</span>
                    <div>
                      <div className="font-medium mb-1">Paste Content</div>
                      <div className="text-xs text-neutral-400">
                        Copy and paste your content directly
                      </div>
                    </div>
                  </div>
                </button>

                {/* External Link Option */}
                <button
                  onClick={() => setContentMethod('link')}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    contentMethod === 'link'
                      ? 'border-green-600 bg-green-950/20'
                      : 'border-neutral-700 hover:bg-neutral-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🔗</span>
                    <div>
                      <div className="font-medium mb-1">External Link</div>
                      <div className="text-xs text-neutral-400">
                        Redirect customers to your existing product page
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              {/* Content Input Based on Method */}
              {contentMethod === 'upload' && (
                <div>
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isProcessingFile 
                        ? 'border-green-600 bg-green-950/10' 
                        : 'border-neutral-700 hover:border-neutral-600'
                    }`}
                  >
                    <input
                      type="file"
                      id="file-upload"
                      accept=".txt,.md,.html"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      className="hidden"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      {isProcessingFile ? (
                        <>
                          <div className="text-3xl mb-2">⏳</div>
                          <p className="text-neutral-300">Processing file...</p>
                        </>
                      ) : uploadedFile ? (
                        <>
                          <div className="text-3xl mb-2 text-green-400">✓</div>
                          <p className="text-green-400 font-medium">{uploadedFile.name}</p>
                          <p className="text-xs text-neutral-400 mt-1">
                            {formData.content.split(/\s+/).length} words imported
                          </p>
                          <p className="text-xs text-neutral-500 mt-2">
                            Click to upload a different file
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="text-3xl mb-2">⬆️</div>
                          <p className="text-neutral-300 mb-1">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-neutral-500">
                            Supports .txt, .md, and .html files (Notion exports)
                          </p>
                        </>
                      )}
                    </label>
                  </div>
                  {uploadError && (
                    <p className="text-red-400 text-sm mt-2">{uploadError}</p>
                  )}
                  
                  {/* Content Preview */}
                  {formData.content && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm text-neutral-300">Content Preview</label>
                        <button
                          onClick={() => setContentMethod('paste')}
                          className="text-xs text-green-400 hover:text-green-300"
                        >
                          Edit manually →
                        </button>
                      </div>
                      <div className="bg-neutral-950 rounded-lg p-4 border border-neutral-800 max-h-48 overflow-y-auto">
                        <pre className="text-xs text-neutral-400 whitespace-pre-wrap font-mono">
                          {formData.content.substring(0, 500)}
                          {formData.content.length > 500 && '...'}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {contentMethod === 'paste' && (
                <>
                  <TextEditor
                    content={formData.content.startsWith('[REDIRECT:') ? '' : formData.content}
                    onChange={(content) => setFormData({...formData, content})}
                    placeholder="Start writing or paste your content here..."
                  />
                  {formData.content && !formData.content.startsWith('[REDIRECT:') && (
                    <p className="text-xs text-green-500 mt-1">
                      ✓ Content will be hosted on LaunchPad
                    </p>
                  )}
                </>
              )}

              {contentMethod === 'link' && (
                <div className="space-y-3">
                  <div className="bg-yellow-950/20 border border-yellow-800/30 rounded-lg p-3">
                    <p className="text-xs text-yellow-400">
                      🔗 Redirect Mode: Customers will be sent to your external link after payment
                    </p>
                  </div>
                  <input
                    type="url"
                    value={contentLink}
                    onChange={(e) => {
                      setContentLink(e.target.value);
                      setFormData({...formData, content: `[REDIRECT:${e.target.value}]`});
                    }}
                    placeholder="https://your-product-link.com"
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 focus:border-green-600 focus:outline-none transition-colors"
                  />
                  <p className="text-xs text-neutral-500">
                    Examples: Gumroad link, Google Drive link, Notion page, your website
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Downloadable Resources Section */}
          <div className="mt-6 p-4 bg-neutral-900/50 rounded-lg border border-neutral-800">
            <label className="block text-sm text-neutral-300 mb-3">
              📦 Bonus Downloads
              <span className="text-xs text-neutral-500 ml-2">(links shown after purchase)</span>
            </label>
            
            {formData.resources.map((resource, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={resource.title}
                  onChange={(e) => {
                    const newResources = [...formData.resources];
                    newResources[i].title = e.target.value;
                    setFormData({...formData, resources: newResources});
                  }}
                  className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                  placeholder="Resource name (e.g., Bonus Video Pack)"
                />
                <input
                  type="url"
                  value={resource.url}
                  onChange={(e) => {
                    const newResources = [...formData.resources];
                    newResources[i].url = e.target.value;
                    setFormData({...formData, resources: newResources});
                  }}
                  className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                  placeholder="https://drive.google.com/..."
                />
                <button
                  onClick={() => {
                    setFormData({
                      ...formData,
                      resources: formData.resources.filter((_, idx) => idx !== i)
                    });
                  }}
                  className="px-3 py-2 rounded-lg border border-neutral-700 hover:border-red-600 hover:text-red-400"
                >
                  ×
                </button>
              </div>
            ))}
            
            <button
              onClick={() => {
                setFormData({
                  ...formData,
                  resources: [...formData.resources, {title: '', url: ''}]
                });
              }}
              className="w-full mt-3 py-2 border border-dashed border-neutral-700 rounded text-xs text-green-400 hover:border-green-600"
            >
              + Add Download Link
            </button>
            
            <p className="text-xs text-neutral-500 mt-3">
              💡 Upload files to Google Drive, Dropbox, or Gumroad first, then add the share links here
            </p>
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setCurrentStep('basics')}
              className="flex-1 py-3 rounded-lg border border-neutral-700 hover:bg-neutral-800"
            >
              ← Back
            </button>
            <button
              onClick={() => {
                setFormData({...formData, contentType});
                setCurrentStep('preview');
              }}
              disabled={!validateContentStep(formData, contentType)}
              className="flex-1 py-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium disabled:opacity-50"
            >
              Preview Your Page →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}