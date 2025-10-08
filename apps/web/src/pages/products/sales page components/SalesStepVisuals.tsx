import React, { useState, useEffect, useRef } from 'react';
import { Upload, Image, Video, Grid3x3, Sparkles, Search, X, Check, Loader, ExternalLink, Crop, Move, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { storage, auth } from '../../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
// You'll need to get an Unsplash API key from https://unsplash.com/developers
// Store this in your environment variables for production
const UNSPLASH_ACCESS_KEY = 'zE8QX3xsv_LTbWSbcK9tPD9TXnYVLldiJt_r-HmLfo4';

interface VisualsData {
  headerImage?: string;
  headerImageAttribution?: { name: string; url: string };
  headerImageSettings?: {
    aspectRatio: 'banner' | 'standard' | 'square' | 'tall';
    position: { x: number; y: number };
    zoom: number;
    height: string;
  };
  videoUrl?: string;
  gallery?: string[];
  galleryPositions?: { [key: number]: string };
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

// Header Image Editor Modal
interface HeaderImageEditorModalProps {
  imageUrl: string;
  currentSettings: {
    aspectRatio: 'banner' | 'standard' | 'square' | 'tall';
    position: { x: number; y: number };
    zoom: number;
  };
  onSave: (settings: any) => void;
  onClose: () => void;
}

const HeaderImageEditorModal: React.FC<HeaderImageEditorModalProps> = ({
  imageUrl,
  currentSettings,
  onSave,
  onClose
}) => {
  const [aspectRatio, setAspectRatio] = useState(currentSettings?.aspectRatio || 'banner');
  const [position, setPosition] = useState(currentSettings?.position || { x: 50, y: 50 });
  const [zoom, setZoom] = useState(currentSettings?.zoom || 1);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const aspectRatios = {
    banner: { 
      label: 'Banner (Recommended)', 
      ratio: '21:9', 
      height: 'h-32 md:h-40',
      description: 'Slim, professional look that keeps focus on content'
    },
    standard: { 
      label: 'Standard', 
      ratio: '16:9', 
      height: 'h-48 md:h-64',
      description: 'Balanced size for most sales pages'
    },
    square: { 
      label: 'Square', 
      ratio: '1:1', 
      height: 'h-64 md:h-80',
      description: 'Good for logos or centered designs'
    },
    tall: { 
      label: 'Hero', 
      ratio: '16:10', 
      height: 'h-64 md:h-96',
      description: 'Large impact, but pushes content down'
    }
  };

  const getAspectClass = () => {
    switch(aspectRatio) {
      case 'banner': return 'aspect-[21/9]';
      case 'square': return 'aspect-square';
      case 'tall': return 'aspect-[16/10]';
      default: return 'aspect-video';
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updatePosition(e);
  };

  const updatePosition = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setPosition({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      updatePosition(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    onSave({
      aspectRatio,
      position,
      zoom,
      height: aspectRatios[aspectRatio as keyof typeof aspectRatios].height
    });
    onClose();
  };

  const resetToDefault = () => {
    setAspectRatio('banner');  // Changed to banner
    setPosition({ x: 50, y: 50 });
    setZoom(1);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-neutral-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Crop className="w-5 h-5" />
                Customize Header Image
              </h3>
              <p className="text-sm text-neutral-400 mt-1">
                Choose the best format for your sales page
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Left: Aspect Ratio Selection */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-3">Choose Format</label>
                <div className="space-y-2">
                  {Object.entries(aspectRatios).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setAspectRatio(key as any)}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        aspectRatio === key
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-neutral-700 hover:border-neutral-600 bg-neutral-800/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className={`font-medium ${
                            aspectRatio === key ? 'text-indigo-300' : 'text-neutral-200'
                          }`}>
                            {config.label}
                          </div>
                          <div className="text-xs text-neutral-500 mt-1">{config.ratio}</div>
                        </div>
                        {key === 'banner' && (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                            Best
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                        {config.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Zoom Control */}
              <div>
                <label className="block text-sm font-medium mb-2">Image Zoom</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                    className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:rounded-full"
                  />
                  <button
                    onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                    className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-center text-xs text-neutral-500 mt-1">
                  {Math.round(zoom * 100)}%
                </div>
              </div>

              <button
                onClick={resetToDefault}
                className="w-full px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Defaults
              </button>
            </div>

            {/* Right: Preview */}
            <div className="col-span-2 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-3">
                  Preview & Position
                  <span className="text-xs text-neutral-400 ml-2">Click or drag to adjust focal point</span>
                </label>
                
               <div 
                ref={containerRef}
                className={`relative ${aspectRatios[aspectRatio as keyof typeof aspectRatios].height} w-full bg-neutral-800 rounded-lg overflow-hidden cursor-crosshair`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                  <div className="relative w-full h-full">
                    <img
                      src={imageUrl}
                      alt="Header preview"
                      className="w-full h-full object-cover"
                      style={{
                        objectPosition: `${position.x}% ${position.y}%`,
                        transform: `scale(${zoom})`,
                        transformOrigin: 'center',
                        transition: isDragging ? 'none' : 'all 0.2s ease-out'
                      }}
                      draggable={false}
                    />
                  </div>
                  
                  {/* Focal point indicator */}
                  <div 
                    className="absolute w-12 h-12 pointer-events-none"
                    style={{
                      left: `${position.x}%`,
                      top: `${position.y}%`,
                      transform: 'translate(-50%, -50%)',
                      transition: isDragging ? 'none' : 'all 0.2s ease-out'
                    }}
                  >
                    <div className="absolute inset-0 border-2 border-white rounded-full opacity-75" />
                    <div className="absolute inset-x-0 top-1/2 h-px bg-white opacity-50" />
                    <div className="absolute inset-y-0 left-1/2 w-px bg-white opacity-50" />
                  </div>

                  {/* Grid overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="h-full w-full grid grid-cols-3 grid-rows-3">
                      {[...Array(9)].map((_, i) => (
                        <div key={i} className="border border-white/10" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Size comparison */}
              <div className="bg-neutral-800/50 rounded-lg p-4">
                <p className="text-sm font-medium mb-3">Size Preview on Page</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-400 w-20">Current:</span>
                    <div className={`${aspectRatios[aspectRatio as keyof typeof aspectRatios].height} w-full bg-indigo-500/20 rounded border border-indigo-500/50`} />
                  </div>
                  <div className="flex items-center gap-3 opacity-50">
                    <span className="text-xs text-neutral-400 w-20">Original:</span>
                    <div className="h-16 aspect-video bg-neutral-700/50 rounded border border-neutral-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-neutral-800 flex justify-between items-center">
          <p className="text-xs text-neutral-400">
            💡 Tip: Banner format keeps visitors focused on your content instead of scrolling past a large image
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Gallery Image Editor Modal
interface ImageEditorModalProps {
  imageUrl: string;
  index: number;
  currentSettings: { scale: number; x: number; y: number };
  onSave: (index: number, settings: { scale: number; x: number; y: number }) => void;
  onClose: () => void;
}

const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  imageUrl,
  index,
  currentSettings,
  onSave,
  onClose
}) => {
  // Initialize with existing settings - default to a zoomed-in view if no settings exist
  const defaultScale = currentSettings?.scale !== undefined ? currentSettings.scale : 1.5;
  const defaultX = currentSettings?.x !== undefined ? currentSettings.x : 0;
  const defaultY = currentSettings?.y !== undefined ? currentSettings.y : -50;
  
  const [scale, setScale] = useState(defaultScale);
  const [position, setPosition] = useState({ x: defaultX, y: defaultY });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    onSave(index, { scale, x: position.x, y: position.y });
    onClose();
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-xl max-w-2xl w-full">
        <div className="p-4 border-b border-neutral-800">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Crop className="w-5 h-5" />
              Edit Gallery Thumbnail
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Preview Area */}
          <div 
            ref={containerRef}
            className="relative aspect-video bg-neutral-800 rounded-lg overflow-hidden mb-4 cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <img
                src={imageUrl}
                alt="Gallery item"
                className="select-none max-w-none"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transition: isDragging ? 'none' : 'transform 0.2s',
                  width: 'auto',
                  height: 'auto',
                  maxWidth: `${scale * 100}%`,
                  maxHeight: `${scale * 100}%`,
                }}
                draggable={false}
                onError={(e) => {
                  console.error('Image failed to load:', imageUrl);
                  e.currentTarget.style.display = 'block';
                }}
                onLoad={(e) => {
                  e.currentTarget.style.display = 'block';
                }}
              />
            </div>
            
            {/* Crop Guide */}
            <div className="absolute inset-0 border-2 border-white/30 pointer-events-none">
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="border border-white/10" />
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-xs text-white flex items-center gap-1">
              <Move className="w-3 h-3" />
              Drag to reposition
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Zoom Control */}
            <div>
              <label className="block text-sm font-medium mb-2">Zoom</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                  className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:rounded-full"
                />
                <button
                  onClick={() => setScale(Math.min(3, scale + 0.1))}
                  className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <span className="text-sm text-neutral-400 w-12 text-right">
                  {Math.round(scale * 100)}%
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// Image Picker Modal Component
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

// Simple Gallery Position Modal with Dragging
interface GalleryPositionModalProps {
  imageUrl: string;
  index: number;
  currentPosition: string;
  onSave: (index: number, position: string) => void;
  onClose: () => void;
}

const GalleryPositionModal: React.FC<GalleryPositionModalProps> = ({
  imageUrl,
  index,
  currentPosition,
  onSave,
  onClose
}) => {
  // Parse current position or set defaults
  const parsePosition = (pos: string) => {
    const parts = pos.split(' ');
    let x = 50, y = 50;
    
    if (parts[0] === 'left') x = 0;
    else if (parts[0] === 'right') x = 100;
    else if (parts[0] === 'center') x = 50;
    else if (parts[0].includes('%')) x = parseInt(parts[0]);
    
    if (parts[1] === 'top') y = 0;
    else if (parts[1] === 'bottom') y = 100;
    else if (parts[1] === 'center') y = 50;
    else if (parts[1]?.includes('%')) y = parseInt(parts[1]);
    
    return { x, y };
  };

  const initialPos = parsePosition(currentPosition);
  const [position, setPosition] = useState(initialPos);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    // Set position on click
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      setPosition({
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y))
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setPosition({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global event listeners for smooth dragging
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      setPosition({
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y))
      });
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging]);

  const handleSave = () => {
    onSave(index, `${position.x}% ${position.y}%`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Fixed: Changed from max-w-4xl to max-w-2xl, added max-h-[90vh] and flex flex-col */}
      <div className="bg-neutral-900 rounded-xl max-w-2xl w-full my-8 max-h-[90vh] flex flex-col">
        {/* Fixed: Added flex-shrink-0 to header */}
        <div className="p-4 border-b border-neutral-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Adjust Image Focus</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Fixed: Added overflow-y-auto and flex-1 for scrollable content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Fixed: Updated cursor styles and transition timing */}
          <div 
            ref={containerRef}
            className="relative aspect-video bg-neutral-800 rounded-lg overflow-hidden mb-4 select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <img 
              src={imageUrl} 
              alt="Gallery preview"
              className="w-full h-full object-cover pointer-events-none"
              style={{ 
                objectPosition: `${position.x}% ${position.y}%`,
                transition: isDragging ? 'none' : 'object-position 0.1s ease-out'
              }}
              draggable={false}
            />
            
            {/* Fixed: Added smooth transition to crosshair */}
            <div 
              className="absolute w-8 h-8 pointer-events-none"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                transform: 'translate(-50%, -50%)',
                transition: isDragging ? 'none' : 'all 0.1s ease-out'
              }}
            >
              <div className="absolute inset-x-0 top-1/2 h-px bg-white/50" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-white/50" />
              <div className="absolute inset-2 border-2 border-white rounded-full shadow-lg" />
            </div>
            
            {/* Instructions overlay */}
            <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-3 py-1 rounded text-xs text-white flex items-center gap-2">
              <Move className="w-3 h-3" />
              Click or drag to adjust focal point
            </div>
          </div>

          {/* Helper Text */}
          <p className="text-xs text-neutral-500">
            Click or drag anywhere on the image to choose which part stays visible in the thumbnail.
            The image will automatically crop to fit the frame.
          </p>

          {/* Position display */}
          <div className="mt-3 text-xs text-neutral-400">
            Position: {Math.round(position.x)}% horizontal, {Math.round(position.y)}% vertical
          </div>
        </div>

        {/* Fixed: Added flex-shrink-0 to footer to keep it visible */}
        <div className="p-4 border-t border-neutral-800 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
          >
            Save Position
          </button>
        </div>
      </div>
    </div>
  );
};

const SalesStepVisuals: React.FC<StepVisualsProps> = ({ data, updateData }) => {
  const [localData, setLocalData] = useState<VisualsData>({
    headerImage: data.visuals?.headerImage,
    headerImageAttribution: data.visuals?.headerImageAttribution,
    headerImageSettings: data.visuals?.headerImageSettings || {
      aspectRatio: 'banner',  // Changed default to banner
      position: { x: 50, y: 50 },
      zoom: 1,
      height: 'h-32 md:h-40'  // Changed to banner height
    },
    videoUrl: data.visuals?.videoUrl,
    gallery: data.visuals?.gallery || [],
    galleryPositions: data.visuals?.galleryPositions || {}
  });

  const [activeImagePicker, setActiveImagePicker] = useState<boolean>(false);
  const [editingHeaderImage, setEditingHeaderImage] = useState(false);
  const [editingGalleryPosition, setEditingGalleryPosition] = useState<{ index: number; url: string } | null>(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localData]);

  // Fetch stock images from Unsplash
  const fetchStockImages = async (query: string) => {
    if (!UNSPLASH_ACCESS_KEY) {
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
    
    // Auto-scroll to header image in preview
    setTimeout(() => {
      const headerSection = document.querySelector('.h-64.md\\:h-96'); // Header image container
      if (headerSection) {
        headerSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };


  // Handle file upload
  const handleFileUpload = async (file: File) => {
    try {
      // Show preview immediately
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Firebase Storage
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.error('User not authenticated');
        return;
      }

      const timestamp = Date.now();
      const fileName = `header_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `users/${userId}/images/${fileName}`);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      // Update with Firebase Storage URL
      setLocalData(prev => ({
        ...prev,
        headerImage: downloadUrl,
        headerImageAttribution: undefined
      }));
      
      setActiveImagePicker(false);
      setUploadPreview(null);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    }
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

  // Save header image settings
  const saveHeaderImageSettings = (settings: any) => {
    setLocalData(prev => ({
      ...prev,
      headerImageSettings: settings
    }));
  };

  // Set gallery image position
  const setGalleryImagePosition = (index: number, position: string) => {
    setLocalData(prev => ({
      ...prev,
      galleryPositions: {
        ...prev.galleryPositions,
        [index]: position
      }
    }));
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
          className={`relative ${
            localData.headerImageSettings?.aspectRatio === 'banner' ? 'h-32' :
            localData.headerImageSettings?.aspectRatio === 'square' ? 'h-64' :
            localData.headerImageSettings?.aspectRatio === 'tall' ? 'h-64' :
            'h-48'
          } rounded-lg overflow-hidden border-2 transition-all ${
            localData.headerImage 
              ? 'border-neutral-700 cursor-pointer hover:border-neutral-600' 
              : 'border-red-900/50 hover:border-red-800/50 cursor-pointer bg-red-950/10'
          }`}
        >
          {localData.headerImage ? (
            <>
              <img 
                src={localData.headerImage} 
                alt="Header" 
                className="w-full h-full object-cover block"
                style={{ 
                  display: 'block',
                  objectPosition: `${localData.headerImageSettings?.position?.x || 50}% ${localData.headerImageSettings?.position?.y || 50}%`,
                  transform: `scale(${localData.headerImageSettings?.zoom || 1})`,
                  transformOrigin: 'center'
                }}
              />
              
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingHeaderImage(true);
                  }}
                  className="p-2 bg-black/50 hover:bg-black/70 rounded-lg backdrop-blur-sm transition-colors"
                >
                  <Crop className="w-4 h-4 text-white" />
                </button>
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
            onChange={(e) => {
              setLocalData(prev => ({ ...prev, videoUrl: e.target.value }));
              
              // Auto-scroll to video section if URL is valid
              setTimeout(() => {
                if (e.target.value && parseVideoUrl(e.target.value)) {
                  const videoSection = document.querySelector('#video-section');
                  if (videoSection) {
                    videoSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }
              }, 500); // Longer delay for video to load
            }}
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
          {/* Existing gallery images - FIXED display issue */}
          {localData.gallery && localData.gallery.map((img, index) => (
            <div 
              key={index} 
              className="relative aspect-video rounded-lg overflow-hidden border-2 border-neutral-700 group bg-neutral-900 cursor-pointer"
              onClick={() => setEditingGalleryPosition({ index, url: img })}
            >
              {/* Fixed: Added absolute positioned container */}
              <div className="absolute inset-0">
                <img 
                  src={img} 
                  alt={`Gallery ${index + 1}`}
                  className="w-full h-full object-cover block"
                  style={{
                    objectPosition: localData.galleryPositions?.[index] || 'center center',
                    display: 'block'
                  }}
                />
              </div>
              
              {/* Simple hover overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center pointer-events-none">
                <div className="text-center">
                  <Crop className="w-6 h-6 text-white mx-auto mb-2" />
                  <p className="text-xs text-white">Click to adjust</p>
                </div>
              </div>
              
              {/* Remove button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLocalData(prev => ({
                    ...prev,
                    gallery: prev.gallery?.filter((_, i) => i !== index),
                    galleryPositions: Object.keys(prev.galleryPositions || {}).reduce((acc, key) => {
                      const keyNum = parseInt(key);
                      if (keyNum !== index) {
                        const newKey = keyNum > index ? keyNum - 1 : keyNum;
                        acc[newKey] = prev.galleryPositions![keyNum];
                      }
                      return acc;
                    }, {} as any)
                  }));
                  
                  // Auto-scroll to gallery section
                  setTimeout(() => {
                    const gallerySection = document.querySelector('#gallery-section');
                    if (gallerySection) {
                      gallerySection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }, 100);
                }}
                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded opacity-0 group-hover:opacity-100 transition-all"
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
           onChange={async (e) => {
            const files = Array.from(e.target.files || []);
            const remainingSlots = 6 - (localData.gallery?.length || 0);
            const filesToProcess = files.slice(0, remainingSlots);
            
            const userId = auth.currentUser?.uid;
            if (!userId) {
              console.error('User not authenticated');
              return;
            }

            for (const file of filesToProcess) {
              try {
                const timestamp = Date.now();
                const fileName = `gallery_${timestamp}_${file.name}`;
                const storageRef = ref(storage, `users/${userId}/images/${fileName}`);
                
                const snapshot = await uploadBytes(storageRef, file);
                const downloadUrl = await getDownloadURL(snapshot.ref);
                
                setLocalData(prev => ({
                  ...prev,
                  gallery: [...(prev.gallery || []), downloadUrl]
                }));
              } catch (error) {
                console.error('Error uploading gallery image:', error);
              }
            }
            
            // Auto-scroll to gallery section
            setTimeout(() => {
              const gallerySection = document.querySelector('#gallery-section');
              if (gallerySection) {
                gallerySection.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 500); // Delay for images to load
          }}
          />
        </div>
        
        {localData.gallery && localData.gallery.length > 0 && (
          <p className="text-xs text-neutral-500 mt-2">
            Click any image to adjust its focal point. Images are automatically cropped to fit.
          </p>
        )}
      </div>

      {/* Header Image Editor Modal */}
      {editingHeaderImage && localData.headerImage && !localData.headerImage.startsWith('gradient:') && (
        <HeaderImageEditorModal
          imageUrl={localData.headerImage}
          currentSettings={localData.headerImageSettings || {
            aspectRatio: 'banner',
            position: { x: 50, y: 50 },
            zoom: 1
          }}
          onSave={saveHeaderImageSettings}
          onClose={() => setEditingHeaderImage(false)}
        />
      )}

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

      {/* Gallery Position Modal */}
      {editingGalleryPosition && (
        <GalleryPositionModal
          imageUrl={editingGalleryPosition.url}
          index={editingGalleryPosition.index}
          currentPosition={localData.galleryPositions?.[editingGalleryPosition.index] || 'center center'}
          onSave={setGalleryImagePosition}
          onClose={() => setEditingGalleryPosition(null)}
        />
      )}
    </div>
  );
};

export default SalesStepVisuals;