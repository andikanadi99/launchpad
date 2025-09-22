import React, { useState, useEffect } from 'react';
import { Upload, Image, Video, Grid3x3, Sparkles, Search, X, Check, Loader, ExternalLink } from 'lucide-react';

// You'll need to get an Unsplash API key from https://unsplash.com/developers
// Store this in your environment variables for production
const UNSPLASH_ACCESS_KEY = 'zE8QX3xsv_LTbWSbcK9tPD9TXnYVLldiJt_r-HmLfo4';

interface VisualsData {
  headerImage?: string;
  headerImageAttribution?: { name: string; url: string };
  videoUrl?: string;
  gallery?: string[];
}

interface StepVisualsProps {
  data: any;
  updateData: (stepKey: string, data: any) => void;
}

// Gradient presets based on product type
const GRADIENT_PRESETS = {
  course: 'bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700',
  ebook: 'bg-gradient-to-br from-amber-600 via-orange-600 to-red-600',
  coaching: 'bg-gradient-to-br from-green-600 via-teal-600 to-cyan-600',
  templates: 'bg-gradient-to-br from-pink-600 via-purple-600 to-indigo-600',
  community: 'bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600',
  custom: 'bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800'
};

// Search queries based on product type
const DEFAULT_SEARCHES = {
  course: 'online learning laptop education',
  ebook: 'reading books knowledge study',
  coaching: 'mentorship success coaching business',
  templates: 'design creative workspace tools',
  community: 'team people collaboration meeting',
  custom: 'business professional success'
};

// Image Picker Modal Component - Moved outside to prevent re-rendering
interface ImagePickerModalProps {
  type: 'header';
  onClose: () => void;
  searchTab: 'suggested' | 'search' | 'upload';
  setSearchTab: (tab: 'suggested' | 'search' | 'upload') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  stockImages: any[];
  isSearching: boolean;
  handleSearch: (e: React.FormEvent) => void;
  selectStockImage: (image: any) => void;
  selectGradient: () => void;
  handleFileUpload: (file: File) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent) => void;
  isDragging: boolean;
  uploadPreview: string | null;
  productName: string;
  productType: string;
}

const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
  type,
  onClose,
  searchTab,
  setSearchTab,
  searchQuery,
  setSearchQuery,
  stockImages,
  isSearching,
  handleSearch,
  selectStockImage,
  selectGradient,
  handleFileUpload,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  isDragging,
  uploadPreview,
  productName,
  productType
}) => (
  <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
    <div className="bg-neutral-900 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">
            Choose Header Image
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setSearchTab('suggested')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              searchTab === 'suggested' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 inline mr-2" />
            Suggested
          </button>
          <button
            onClick={() => setSearchTab('search')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              searchTab === 'search' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Search className="w-4 h-4 inline mr-2" />
            Search Stock
          </button>
          <button
            onClick={() => setSearchTab('upload')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              searchTab === 'upload' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            Upload Your Own
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6 overflow-y-auto max-h-[60vh]">
        {searchTab === 'suggested' && (
          <div>
            {/* AI Gradient Option */}
            <div className="mb-6">
              <p className="text-sm text-neutral-400 mb-3">AI-Generated Gradient</p>
              <div
                onClick={() => selectGradient()}
                className="relative h-40 rounded-lg overflow-hidden cursor-pointer group"
              >
                <div className={`absolute inset-0 ${GRADIENT_PRESETS[productType as keyof typeof GRADIENT_PRESETS]}`} />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="text-center text-white">
                    <Sparkles className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm font-medium">Use AI Gradient</p>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <h3 className="text-2xl font-bold text-white text-center px-4">
                    {productName}
                  </h3>
                </div>
              </div>
            </div>
            
            {/* Stock Images */}
            <p className="text-sm text-neutral-400 mb-3">Suggested Stock Photos</p>
            {isSearching ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-6 h-6 animate-spin text-neutral-400" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {stockImages.map((image) => (
                  <div
                    key={image.id}
                    onClick={() => selectStockImage(image)}
                    className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group"
                  >
                    <img
                      src={image.urls.small}
                      alt={image.alt_description}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Check className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute bottom-2 left-2 text-xs text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
                      by {image.user.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {searchTab === 'search' && (
          <div>
            <form onSubmit={handleSearch} className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for stock images..."
                  className="w-full px-4 py-3 bg-neutral-800 rounded-lg pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </form>
            
            {isSearching ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-6 h-6 animate-spin text-neutral-400" />
              </div>
            ) : stockImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {stockImages.map((image) => (
                  <div
                    key={image.id}
                    onClick={() => selectStockImage(image)}
                    className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group"
                  >
                    <img
                      src={image.urls.small}
                      alt={image.alt_description}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Check className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute bottom-2 left-2 text-xs text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
                      by {image.user.name}
                    </div>
                  </div>
                ))}
              </div>
            ) : searchQuery ? (
              <div className="text-center py-12 text-neutral-400">
                No images found for "{searchQuery}"
              </div>
            ) : (
              <div className="text-center py-12 text-neutral-400">
                Enter a search term to find stock images
              </div>
            )}
          </div>
        )}
        
        {searchTab === 'upload' && (
          <div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e)}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging 
                  ? 'border-indigo-500 bg-indigo-500/10' 
                  : 'border-neutral-700 hover:border-neutral-600'
              }`}
            >
              {uploadPreview ? (
                <div className="space-y-4">
                  <img
                    src={uploadPreview}
                    alt="Upload preview"
                    className="max-h-48 mx-auto rounded-lg"
                  />
                  <p className="text-sm text-neutral-400">Image ready to use</p>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 mx-auto mb-4 text-neutral-500" />
                  <p className="text-neutral-300 mb-2">Drag and drop your image here</p>
                  <p className="text-sm text-neutral-500 mb-4">or</p>
                  <label className="inline-block">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                    />
                    <span className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg cursor-pointer transition-colors">
                      Choose File
                    </span>
                  </label>
                  <p className="text-xs text-neutral-500 mt-4">
                    Recommended: 1920x1080px, JPG or PNG
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Attribution notice */}
      {searchTab !== 'upload' && (
        <div className="px-6 pb-4 text-xs text-neutral-500">
          Stock photos provided by Unsplash. Attribution will be included automatically.
        </div>
      )}
    </div>
  </div>
);

const SalesStepVisuals: React.FC<StepVisualsProps> = ({ data, updateData }) => {
  const [localData, setLocalData] = useState<VisualsData>({
    headerImage: data.visuals?.headerImage,
    headerImageAttribution: data.visuals?.headerImageAttribution,
    videoUrl: data.visuals?.videoUrl,
    gallery: data.visuals?.gallery || []
  });

  const [activeImagePicker, setActiveImagePicker] = useState<boolean>(false);
  const [stockImages, setStockImages] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchTab, setSearchTab] = useState<'suggested' | 'search' | 'upload'>('suggested');
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const productType = data.valueProp?.productType || 'custom';
  const productName = data.coreInfo?.name || 'Your Product';

  // Update parent when data changes
  useEffect(() => {
    updateData('visuals', localData);
  }, [localData]);

  // Fetch stock images from Unsplash
  const fetchStockImages = async (query: string) => {
    if (!UNSPLASH_ACCESS_KEY || UNSPLASH_ACCESS_KEY === 'YOUR_ACCESS_KEY_HERE') {
      console.warn('Please add your Unsplash API key');
      return [];
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${query}&per_page=9&orientation=landscape`,
        {
          headers: {
            Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch images');
      
      const data = await response.json();
      setStockImages(data.results || []);
    } catch (error) {
      console.error('Error fetching stock images:', error);
      setStockImages([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Load suggested images when picker opens
  useEffect(() => {
    if (activeImagePicker && searchTab === 'suggested') {
      const query = DEFAULT_SEARCHES[productType as keyof typeof DEFAULT_SEARCHES] || DEFAULT_SEARCHES.custom;
      fetchStockImages(query);
    }
  }, [activeImagePicker, searchTab, productType]);

  // Handle custom search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchStockImages(searchQuery);
    }
  };

  // Select stock image
  const selectStockImage = (image: any) => {
    setLocalData(prev => ({
      ...prev,
      headerImage: image.urls.regular,
      headerImageAttribution: {
        name: image.user.name,
        url: image.user.links.html
      }
    }));
    
    setActiveImagePicker(false);
    setUploadPreview(null);
  };

  // Select gradient
  const selectGradient = () => {
    const gradient = `gradient:${GRADIENT_PRESETS[productType as keyof typeof GRADIENT_PRESETS]}`;
    setLocalData(prev => ({
      ...prev,
      headerImage: gradient,
      headerImageAttribution: undefined
    }));
    setActiveImagePicker(false);
  };

  // Handle file upload
  const handleFileUpload = (file: File) => {
    // In production, you'd upload to Firebase Storage here
    // For now, we'll create a preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setUploadPreview(url);
      
      // In production: upload to Firebase Storage and get URL
      // For demo: use the data URL
      setLocalData(prev => ({
        ...prev,
        headerImage: url,
        headerImageAttribution: undefined
      }));
      
      setActiveImagePicker(false);
      setUploadPreview(null);
    };
    reader.readAsDataURL(file);
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      handleFileUpload(files[0]);
    }
  };

  // Parse video URL to get embed URL
  const parseVideoUrl = (url: string) => {
    if (!url) return '';
    
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    
    // Loom
    const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
    if (loomMatch) {
      return `https://www.loom.com/embed/${loomMatch[1]}`;
    }
    
    return url;
  };

  // Close modal handler
  const handleCloseModal = () => {
    setActiveImagePicker(false);
    setUploadPreview(null);
    setSearchQuery('');
    setStockImages([]);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">Step 3: Visuals & Media</h2>
        <p className="text-neutral-400 mt-1">
          Add visual elements to make your page more compelling
        </p>
      </div>

      {/* Info notice */}
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
        <p className="text-sm text-neutral-300">
          ✨ Choose a header image to set the visual tone for your sales page. 
          Video and gallery images are optional enhancements.
        </p>
      </div>

      {/* Header Image - REQUIRED */}
      <div>
        <label className="block text-sm font-medium mb-3">
          Header Image
          <span className="text-red-500 ml-1">*</span>
          <span className="text-neutral-500 ml-2 text-xs font-normal">
            (Main visual at the top of your page)
          </span>
        </label>
        
        <div 
          onClick={() => setActiveImagePicker(true)}
          className={`relative h-48 rounded-lg overflow-hidden border-2 transition-all ${
            localData.headerImage 
              ? 'border-neutral-700 cursor-pointer hover:border-neutral-600' 
              : 'border-red-900/50 hover:border-red-800/50 cursor-pointer bg-red-950/10'
          }`}
        >
          {localData.headerImage ? (
            <>
              {localData.headerImage.startsWith('gradient:') ? (
                <div className={`absolute inset-0 ${localData.headerImage.replace('gradient:', '')}`}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <h3 className="text-2xl font-bold text-white text-center px-4">
                      {productName}
                    </h3>
                  </div>
                </div>
              ) : (
                <img 
                  src={localData.headerImage} 
                  alt="Header" 
                  className="w-full h-full object-cover"
                />
              )}
              
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImagePicker(true);
                  }}
                  className="p-2 bg-black/50 hover:bg-black/70 rounded-lg backdrop-blur-sm transition-colors"
                >
                  <Image className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocalData(prev => ({
                      ...prev,
                      headerImage: undefined,
                      headerImageAttribution: undefined
                    }));
                  }}
                  className="p-2 bg-black/50 hover:bg-black/70 rounded-lg backdrop-blur-sm transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
              
              {localData.headerImageAttribution && (
                <div className="absolute bottom-2 left-2">
                  <a
                    href={localData.headerImageAttribution.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-white/70 hover:text-white/90 bg-black/50 px-2 py-1 rounded backdrop-blur-sm inline-flex items-center gap-1"
                  >
                    Photo by {localData.headerImageAttribution.name}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full bg-neutral-800/30">
              <div className="text-center">
                <Image className="w-8 h-8 mx-auto mb-2 text-neutral-500" />
                <p className="text-sm text-neutral-300 font-medium">Click to add header image</p>
                <p className="text-xs text-neutral-500 mt-1">Required • AI gradient • Stock photos • Upload</p>
              </div>
            </div>
          )}
        </div>
        
        {!localData.headerImage && (
          <p className="text-xs text-red-400 mt-1">
            A header image is required to continue
          </p>
        )}
      </div>

      {/* Sales Video - OPTIONAL */}
      <div>
        <label className="block text-sm font-medium mb-3">
          Sales Video
          <span className="text-neutral-500 ml-2 text-xs font-normal">
            (Optional video pitch or demo)
          </span>
        </label>
        
        <div className="space-y-3">
          <input
            type="url"
            value={localData.videoUrl || ''}
            onChange={(e) => setLocalData(prev => ({ ...prev, videoUrl: e.target.value }))}
            placeholder="Paste YouTube, Vimeo, or Loom link..."
            className="w-full px-4 py-3 bg-neutral-800 rounded-lg border border-neutral-700 focus:border-indigo-500 focus:outline-none"
          />
          
          {localData.videoUrl && parseVideoUrl(localData.videoUrl) && (
            <div className="aspect-video rounded-lg overflow-hidden bg-neutral-900">
              <iframe
                src={parseVideoUrl(localData.videoUrl)}
                className="w-full h-full"
                allowFullScreen
                title="Sales video"
              />
            </div>
          )}
          
          <p className="text-xs text-neutral-500">
            Supports YouTube, Vimeo, and Loom videos
          </p>
        </div>
      </div>

      {/* Gallery Images - OPTIONAL */}
      <div>
        <label className="block text-sm font-medium mb-3">
          Gallery Images
          <span className="text-neutral-500 ml-2 text-xs font-normal">
            (Optional - Screenshots, testimonials, before/after - up to 6 images)
          </span>
        </label>
        
        <div className="grid grid-cols-3 gap-4">
          {/* Existing gallery images */}
          {localData.gallery && localData.gallery.map((img, index) => (
            <div key={index} className="relative aspect-video rounded-lg overflow-hidden border-2 border-neutral-700">
              <img 
                src={img} 
                alt={`Gallery ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => {
                  setLocalData(prev => ({
                    ...prev,
                    gallery: prev.gallery?.filter((_, i) => i !== index)
                  }));
                }}
                className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded backdrop-blur-sm transition-colors"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
          
          {/* Add new image button */}
          {(!localData.gallery || localData.gallery.length < 6) && (
            <div 
              onClick={() => document.getElementById('gallery-upload')?.click()}
              className="aspect-video rounded-lg border-2 border-dashed border-neutral-700 hover:border-neutral-600 cursor-pointer flex items-center justify-center bg-neutral-800/30 transition-colors"
            >
              <div className="text-center">
                <Upload className="w-6 h-6 mx-auto mb-1 text-neutral-600" />
                <p className="text-xs text-neutral-500">Add image</p>
                <p className="text-[10px] text-neutral-600 mt-1">
                  {localData.gallery ? `${localData.gallery.length}/6` : '0/6'}
                </p>
              </div>
            </div>
          )}
          
          <input
            id="gallery-upload"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              const remainingSlots = 6 - (localData.gallery?.length || 0);
              const filesToProcess = files.slice(0, remainingSlots);
              
              filesToProcess.forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                  const url = event.target?.result as string;
                  setLocalData(prev => ({
                    ...prev,
                    gallery: [...(prev.gallery || []), url]
                  }));
                };
                reader.readAsDataURL(file);
              });
            }}
          />
        </div>
        
        {localData.gallery && localData.gallery.length > 0 && (
          <p className="text-xs text-neutral-500 mt-2">
            Images will display in order shown. Drag-to-reorder coming soon.
          </p>
        )}
      </div>

      {/* Image Picker Modal */}
      {activeImagePicker && (
        <ImagePickerModal
          type="header"
          onClose={handleCloseModal}
          searchTab={searchTab}
          setSearchTab={setSearchTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          stockImages={stockImages}
          isSearching={isSearching}
          handleSearch={handleSearch}
          selectStockImage={selectStockImage}
          selectGradient={selectGradient}
          handleFileUpload={handleFileUpload}
          handleDragOver={handleDragOver}
          handleDragLeave={handleDragLeave}
          handleDrop={handleDrop}
          isDragging={isDragging}
          uploadPreview={uploadPreview}
          productName={productName}
          productType={productType}
        />
      )}
    </div>
  );
};

export default SalesStepVisuals;