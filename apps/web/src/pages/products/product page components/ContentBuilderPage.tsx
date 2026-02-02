import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, auth } from '../../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  ArrowLeft, Save, Loader, Check, Eye, EyeOff, 
  FileText, Monitor, Smartphone, AlertCircle,
  AlignLeft, AlignCenter, AlignRight, ChevronDown, ChevronUp, Palette,
  ExternalLink
} from 'lucide-react';
import DeliveryContentEditor, { ContentBlock, BlockStyles, CaptionStyles } from '../delivery page components/DeliveryContentEditor';
import ConfirmModal from '../../ConfirmModal';

// Types for header styles
type Alignment = 'left' | 'center' | 'right';

// Preset color options for light theme
const PRESET_COLORS_LIGHT = [
  { value: '#171717', label: 'Default' },
  { value: '#737373', label: 'Gray' },
  { value: '#4f46e5', label: 'Indigo' },
  { value: '#2563eb', label: 'Blue' },
  { value: '#16a34a', label: 'Green' },
  { value: '#dc2626', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#9333ea', label: 'Purple' },
];

// Preset color options for dark theme
const PRESET_COLORS_DARK = [
  { value: '#ffffff', label: 'White' },
  { value: '#a3a3a3', label: 'Gray' },
  { value: '#a5b4fc', label: 'Indigo' },
  { value: '#60a5fa', label: 'Blue' },
  { value: '#4ade80', label: 'Green' },
  { value: '#f87171', label: 'Red' },
  { value: '#fb923c', label: 'Orange' },
  { value: '#c084fc', label: 'Purple' },
];

const BG_COLORS = [
  { value: '#ffffff', label: 'White' },
  { value: '#f9fafb', label: 'Gray 50' },
  { value: '#f3f4f6', label: 'Gray 100' },
  { value: '#fef3c7', label: 'Amber Light' },
  { value: '#ecfdf5', label: 'Green Light' },
  { value: '#eef2ff', label: 'Indigo Light' },
];

const DARK_BG_COLORS = [
  { value: '#0a0a0a', label: 'Black' },
  { value: '#171717', label: 'Neutral 900' },
  { value: '#1f2937', label: 'Gray 800' },
  { value: '#1e1b4b', label: 'Indigo Dark' },
  { value: '#164e63', label: 'Cyan Dark' },
  { value: '#14532d', label: 'Green Dark' },
];

// Helper to get computed font size from preset or custom value
const getComputedFontSize = (size: string | undefined, type: 'title' | 'subtitle' | 'heading1' | 'heading2' | 'paragraph' | 'list' | 'callout' | 'caption'): string => {
  const presetSizes: Record<string, Record<string, string>> = {
    title: { sm: '1.125rem', md: '1.5rem', lg: '1.875rem', xl: '2.25rem' },
    subtitle: { sm: '0.75rem', md: '0.875rem', lg: '1rem', xl: '1.125rem' },
    heading1: { sm: '1.5rem', md: '1.875rem', lg: '2.25rem', xl: '3rem' },
    heading2: { sm: '1.25rem', md: '1.5rem', lg: '1.875rem', xl: '2.25rem' },
    paragraph: { sm: '0.875rem', md: '1rem', lg: '1.125rem', xl: '1.25rem' },
    list: { sm: '0.875rem', md: '1rem', lg: '1.125rem', xl: '1.25rem' },
    callout: { sm: '0.875rem', md: '1rem', lg: '1.125rem', xl: '1.25rem' },
    caption: { sm: '0.75rem', md: '0.875rem', lg: '1rem', xl: '1.125rem' },
  };
  
  if (!size) return presetSizes[type]?.md || '1rem';
  if (['sm', 'md', 'lg', 'xl'].includes(size)) {
    return presetSizes[type]?.[size] || '1rem';
  }
  return size;
};

// Helper to get alignment style
const getAlignmentStyle = (align: string | undefined): React.CSSProperties => {
  switch (align) {
    case 'center': return { textAlign: 'center' };
    case 'right': return { textAlign: 'right' };
    default: return { textAlign: 'left' };
  }
};

// Helper to get image size style
const getImageSizeStyle = (size: string | undefined, customSize?: string): React.CSSProperties => {
  if (size === 'custom' && customSize) {
    return { width: customSize, maxWidth: '100%' };
  }
  switch (size) {
    case 'small': return { maxWidth: '200px' };
    case 'medium': return { maxWidth: '400px' };
    case 'large': return { maxWidth: '600px' };
    case 'full':
    default: return { width: '100%' };
  }
};

// Helper to get image rounded class
const getImageRoundedClass = (rounded: string | undefined): string => {
  switch (rounded) {
    case 'none': return 'rounded-none';
    case 'sm': return 'rounded-sm';
    case 'md': return 'rounded-md';
    case 'lg': return 'rounded-lg';
    case 'full': return 'rounded-full';
    default: return 'rounded-md';
  }
};

// Helper to get callout width style
const getCalloutWidthStyle = (width: string | undefined): React.CSSProperties => {
  switch (width) {
    case 'compact': return { maxWidth: '320px' };
    case 'medium': return { maxWidth: '480px' };
    case 'full':
    default: return { width: '100%' };
  }
};

// Helper to get callout alignment style
const getCalloutAlignStyle = (align: string | undefined): React.CSSProperties => {
  switch (align) {
    case 'center': return { marginLeft: 'auto', marginRight: 'auto' };
    case 'right': return { marginLeft: 'auto' };
    default: return {};
  }
};

// Helper to get list spacing class
const getListSpacingClass = (spacing: string | undefined): string => {
  switch (spacing) {
    case 'tight': return 'space-y-1';
    case 'relaxed': return 'space-y-4';
    case 'normal':
    default: return 'space-y-2';
  }
};

// Header Style Controls Component
function HeaderStyleControls({
  size,
  onSizeChange,
  align,
  onAlignChange,
  color,
  onColorChange,
  pageTheme = 'light',
}: {
  size: string;
  onSizeChange: (size: string) => void;
  align: Alignment;
  onAlignChange: (align: Alignment) => void;
  color: string;
  onColorChange: (color: string) => void;
  pageTheme?: 'light' | 'dark';
}) {
  const [showCustomSize, setShowCustomSize] = useState(false);
  const [customSize, setCustomSize] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Select colors based on theme
  const PRESET_COLORS = pageTheme === 'dark' ? PRESET_COLORS_DARK : PRESET_COLORS_LIGHT;

  const isPresetSize = ['sm', 'md', 'lg', 'xl'].includes(size);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCustomSizeSubmit = () => {
    if (customSize.trim()) {
      const sizeValue = /^\d+$/.test(customSize.trim()) 
        ? `${customSize.trim()}px` 
        : customSize.trim();
      onSizeChange(sizeValue);
      setShowCustomSize(false);
      setCustomSize('');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4 mt-2">
      {/* Size */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-neutral-500 mr-1">Size:</span>
        {(['sm', 'md', 'lg', 'xl'] as const).map((s) => (
          <button
            key={s}
            onClick={() => onSizeChange(s)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              size === s
                ? 'bg-indigo-600 text-white'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
          >
            {s.toUpperCase()}
          </button>
        ))}
        
        <div className="relative">
          <button
            onClick={() => setShowCustomSize(!showCustomSize)}
            className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
              !isPresetSize
                ? 'bg-indigo-600 text-white'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
            title="Custom size"
          >
            {!isPresetSize ? size : '...'}
            {showCustomSize ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          
          {showCustomSize && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-20 min-w-[140px]">
              <div className="text-xs text-neutral-400 mb-1">Enter size (px, rem, em)</div>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  placeholder="e.g. 24px"
                  className="w-20 px-2 py-1 text-xs bg-neutral-900 border border-neutral-600 rounded text-white"
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomSizeSubmit()}
                />
                <button
                  onClick={handleCustomSizeSubmit}
                  className="px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 rounded text-white"
                >
                  Set
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Alignment */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-neutral-500 mr-1">Align:</span>
        {(['left', 'center', 'right'] as const).map((a) => {
          const Icon = a === 'left' ? AlignLeft : a === 'center' ? AlignCenter : AlignRight;
          return (
            <button
              key={a}
              onClick={() => onAlignChange(a)}
              className={`p-1.5 rounded transition-colors ${
                align === a ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          );
        })}
      </div>

      {/* Color */}
      <div className="flex items-center gap-1 relative" ref={colorPickerRef}>
        <span className="text-xs text-neutral-500 mr-1">Color:</span>
        
        {PRESET_COLORS.slice(0, 4).map((c) => (
          <button
            key={c.value}
            onClick={() => onColorChange(c.value)}
            className={`w-5 h-5 rounded-full transition-all ${
              color === c.value 
                ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900' 
                : 'hover:scale-110'
            }`}
            style={{ backgroundColor: c.value }}
            title={c.label}
          />
        ))}
        
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className={`w-5 h-5 rounded-full border-2 border-dashed border-neutral-500 flex items-center justify-center transition-all hover:border-neutral-400 ${
            showColorPicker ? 'border-indigo-500' : ''
          }`}
          title="More colors"
        >
          <Palette className="w-3 h-3 text-neutral-400" />
        </button>
        
        {showColorPicker && (
          <div className="absolute top-full left-0 mt-1 p-3 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-20 min-w-[200px]">
            <div className="text-xs text-neutral-400 mb-2">Preset Colors</div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => {
                    onColorChange(c.value);
                    setShowColorPicker(false);
                  }}
                  className={`w-7 h-7 rounded transition-all ${
                    color === c.value 
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-800' 
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
            
            <div className="text-xs text-neutral-400 mb-2">Custom Color</div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => onColorChange(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => onColorChange(e.target.value)}
                placeholder="#000000"
                className="flex-1 px-2 py-1 text-xs bg-neutral-900 border border-neutral-600 rounded text-white font-mono"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Caption Renderer Component
function CaptionRenderer({ 
  caption, 
  styles,
  pageTheme = 'light'
}: { 
  caption: string; 
  styles?: CaptionStyles;
  pageTheme?: 'light' | 'dark';
}) {
  if (!caption) return null;
  
  // Get caption color based on theme
  const getCaptionColor = () => {
    if (styles?.color) return styles.color;
    return pageTheme === 'dark' ? '#a3a3a3' : '#737373';
  };
  
  return (
    <p 
      className="break-words"
      style={{
        fontSize: getComputedFontSize(styles?.size || 'sm', 'caption'),
        color: getCaptionColor(),
        ...getAlignmentStyle(styles?.align || 'center'),
        wordWrap: 'break-word',
        overflowWrap: 'break-word'
      }}
    >
      {caption}
    </p>
  );
}

// Preview component for rendering content blocks
function ContentPreview({ 
  blocks, 
  pageTitle, 
  pageSubtitle,
  showTitle,
  titleSize,
  titleAlign,
  titleColor,
  subtitleSize,
  subtitleAlign,
  subtitleColor,
  pageBgColor,
  pageTheme,
  activeBlockId,
  scrollVersion
}: { 
  blocks: ContentBlock[]; 
  pageTitle: string;
  pageSubtitle: string;
  showTitle: boolean;
  titleSize: string;
  titleAlign: Alignment;
  titleColor: string;
  subtitleSize: string;
  subtitleAlign: Alignment;
  subtitleColor: string;
  pageBgColor: string;
  pageTheme: 'light' | 'dark';
  activeBlockId: string | null;
  scrollVersion: number;
}) {
  const previewRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active block (triggered by scrollVersion changes)
  useEffect(() => {
    if (activeBlockId && previewRef.current) {
      const blockElement = previewRef.current.querySelector(`[data-preview-block="${activeBlockId}"]`);
      if (blockElement) {
        blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeBlockId, scrollVersion]);

  // Default light mode colors (used to detect if user has customized)
  const DEFAULT_LIGHT_TEXT = '#171717';
  const DEFAULT_LIGHT_SUBTEXT = '#737373';

  // Get text color based on theme (only override if using default light color)
  const getTextColor = (currentColor?: string) => {
    if (!currentColor || currentColor === DEFAULT_LIGHT_TEXT) {
      return pageTheme === 'dark' ? '#ffffff' : DEFAULT_LIGHT_TEXT;
    }
    return currentColor;
  };

  const getSubTextColor = (currentColor?: string) => {
    if (!currentColor || currentColor === DEFAULT_LIGHT_SUBTEXT) {
      return pageTheme === 'dark' ? '#a3a3a3' : DEFAULT_LIGHT_SUBTEXT;
    }
    return currentColor;
  };

  const getVideoEmbedUrl = (url: string): string => {
    if (!url) return '';
    
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    
    const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
    if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;
    
    return url;
  };

  return (
    <div 
      ref={previewRef}
      className="p-6 md:p-8 min-h-full"
      style={{ backgroundColor: pageBgColor }}
    >
      {/* Product Header */}
      {showTitle && (
        <div 
          className={blocks.length > 0 ? "mb-8 pb-6 border-b" : "mb-4"}
          style={{ borderColor: pageTheme === 'dark' ? '#404040' : '#e5e5e5' }}
        >
          <h1 
            className="font-bold break-words"
            style={{
              fontSize: getComputedFontSize(titleSize, 'title'),
              color: getTextColor(titleColor),
              ...getAlignmentStyle(titleAlign),
              wordWrap: 'break-word',
              overflowWrap: 'break-word'
            }}
          >
            {pageTitle || 'Untitled'}
          </h1>
          {pageSubtitle && (
            <p 
              className="mt-1 break-words"
              style={{
                fontSize: getComputedFontSize(subtitleSize, 'subtitle'),
                color: getSubTextColor(subtitleColor),
                ...getAlignmentStyle(subtitleAlign),
                wordWrap: 'break-word',
                overflowWrap: 'break-word'
              }}
            >
              {pageSubtitle}
            </p>
          )}
        </div>
      )}

      {/* Empty State */}
      {blocks.length === 0 && (
        <div 
          className="flex flex-col items-center justify-center text-center py-12 border-2 border-dashed rounded-lg"
          style={{ borderColor: pageTheme === 'dark' ? '#404040' : '#e5e5e5' }}
        >
          <FileText className="w-12 h-12 mb-3" style={{ color: pageTheme === 'dark' ? '#525252' : '#d4d4d4' }} />
          <p style={{ color: pageTheme === 'dark' ? '#737373' : '#a3a3a3' }} className="text-sm">Add content blocks to build your page</p>
        </div>
      )}

      {/* Content Blocks */}
      {blocks.length > 0 && (
        <div className="space-y-6">
          {blocks.map((block) => {
            const styles = block.styles || {};
            const isActive = activeBlockId === block.id;
            
            switch (block.type) {
              case 'heading1':
                return block.content ? (
                  <h2 
                    key={block.id}
                    data-preview-block={block.id}
                    className={`font-bold break-words ${isActive ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                    style={{
                      fontSize: getComputedFontSize(styles.size, 'heading1'),
                      color: getTextColor(styles.color),
                      ...getAlignmentStyle(styles.align),
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word'
                    }}
                  >
                    {block.content}
                  </h2>
                ) : null;

              case 'heading2':
                return block.content ? (
                  <h3 
                    key={block.id}
                    data-preview-block={block.id}
                    className={`font-semibold break-words ${isActive ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                    style={{
                      fontSize: getComputedFontSize(styles.size, 'heading2'),
                      color: getTextColor(styles.color),
                      ...getAlignmentStyle(styles.align),
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word'
                    }}
                  >
                    {block.content}
                  </h3>
                ) : null;

              case 'paragraph':
                return block.content ? (
                  <div 
                    key={block.id}
                    data-preview-block={block.id}
                    className={`${styles.paragraphBg && styles.paragraphBgWidth === 'full' ? '-mx-6 md:-mx-8 px-6 md:px-8 py-4' : ''} ${isActive ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                    style={styles.paragraphBg && styles.paragraphBgWidth === 'full' ? { backgroundColor: styles.paragraphBg } : {}}
                  >
                    <p 
                      className={`leading-relaxed whitespace-pre-wrap break-words ${
                        styles.paragraphBg && styles.paragraphBgWidth !== 'full' ? 'p-4 rounded-lg' : ''
                      }`}
                      style={{
                        fontSize: getComputedFontSize(styles.size, 'paragraph'),
                        color: getTextColor(styles.color),
                        ...getAlignmentStyle(styles.align),
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                        ...(styles.paragraphBg && styles.paragraphBgWidth !== 'full' ? { backgroundColor: styles.paragraphBg } : {})
                      }}
                    >
                      {block.content}
                    </p>
                  </div>
                ) : null;

              case 'list':
                return block.items.filter(item => item.trim()).length > 0 ? (
                  <ul 
                    key={block.id}
                    data-preview-block={block.id}
                    className={`ml-4 ${getListSpacingClass(styles.listSpacing)} ${isActive ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                    style={{
                      fontSize: getComputedFontSize(styles.size, 'list'),
                      color: getTextColor(styles.color),
                      ...getAlignmentStyle(styles.align)
                    }}
                  >
                    {block.items.filter(item => item.trim()).map((item, idx) => (
                      <li 
                        key={idx} 
                        className="flex items-baseline gap-2"
                        style={{
                          wordWrap: 'break-word',
                          overflowWrap: 'break-word'
                        }}
                      >
                        <span className="text-indigo-500 flex-shrink-0">•</span>
                        <span 
                          className="break-words flex-1 min-w-0 leading-relaxed"
                          style={{ 
                            wordWrap: 'break-word', 
                            overflowWrap: 'break-word',
                            wordBreak: 'break-word'
                          }}
                        >
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null;

              case 'video':
                const embedUrl = getVideoEmbedUrl(block.url);
                const videoCaption = (
                  <CaptionRenderer caption={block.caption || ''} styles={styles.caption} pageTheme={pageTheme} />
                );
                return embedUrl ? (
                  <div 
                    key={block.id}
                    data-preview-block={block.id}
                    className={`space-y-2 ${isActive ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                    style={getAlignmentStyle(styles.align)}
                  >
                    {styles.caption?.position === 'above' && videoCaption}
                    <div 
                      className={`aspect-video rounded-lg overflow-hidden ${
                        styles.align === 'center' ? 'mx-auto max-w-2xl' : 
                        styles.align === 'right' ? 'ml-auto max-w-2xl' : ''
                      }`}
                      style={{ backgroundColor: pageTheme === 'dark' ? '#262626' : '#f5f5f5' }}
                    >
                      <iframe
                        src={embedUrl}
                        className="w-full h-full"
                        allowFullScreen
                        title={block.caption || 'Video'}
                      />
                    </div>
                    {(!styles.caption?.position || styles.caption?.position === 'below') && videoCaption}
                  </div>
                ) : null;

              case 'image':
                const imageCaption = (
                  <CaptionRenderer caption={block.caption || ''} styles={styles.caption} pageTheme={pageTheme} />
                );
                return block.url ? (
                  <div 
                    key={block.id}
                    data-preview-block={block.id}
                    className={`space-y-2 ${isActive ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                    style={getAlignmentStyle(styles.align)}
                  >
                    {styles.caption?.position === 'above' && imageCaption}
                    <img 
                      src={block.url} 
                      alt={block.caption || 'Content image'} 
                      className={`${getImageRoundedClass(styles.imageRounded)} ${
                        styles.align === 'center' ? 'mx-auto' :
                        styles.align === 'right' ? 'ml-auto' : ''
                      }`}
                      style={{
                        ...getImageSizeStyle(styles.imageSize, styles.imageSizeCustom),
                        ...(styles.imageBorder ? { 
                          border: `2px solid ${pageTheme === 'dark' ? '#404040' : '#e5e5e5'}` 
                        } : {})
                      }}
                    />
                    {(!styles.caption?.position || styles.caption?.position === 'below') && imageCaption}
                  </div>
                ) : null;

              case 'divider':
                return (
                  <hr 
                    key={block.id}
                    data-preview-block={block.id}
                    className={`my-8 ${isActive ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                    style={{ borderColor: styles.color || (pageTheme === 'dark' ? '#404040' : '#e5e5e5') }}
                  />
                );

              case 'callout':
                const calloutBgColor = styles.bgColor || (pageTheme === 'dark' ? '#1e1b4b' : '#eef2ff');
                const calloutBorderColor = styles.color ? `${styles.color}30` : (pageTheme === 'dark' ? '#4338ca' : '#c7d2fe');
                const calloutTextColor = styles.color || (pageTheme === 'dark' ? '#a5b4fc' : '#4f46e5');
                return block.content ? (
                  <div 
                    key={block.id}
                    data-preview-block={block.id}
                    className={`flex gap-3 p-4 rounded-lg ${isActive ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                    style={{
                      backgroundColor: calloutBgColor,
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor: calloutBorderColor,
                      ...getCalloutWidthStyle(styles.calloutWidth),
                      ...getCalloutAlignStyle(styles.calloutAlign)
                    }}
                  >
                    {block.emoji && <span className="text-2xl flex-shrink-0">{block.emoji}</span>}
                    <p 
                      className="flex-1 break-words"
                      style={{
                        color: calloutTextColor,
                        fontSize: getComputedFontSize(styles.size, 'callout'),
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word'
                      }}
                    >
                      {block.content}
                    </p>
                  </div>
                ) : null;

              default:
                return null;
            }
          })}
        </div>
      )}
    </div>
  );
}

// Generate full preview HTML
function generateFullPreviewHTML(
  blocks: ContentBlock[],
  pageTitle: string,
  pageSubtitle: string,
  showTitle: boolean,
  titleSize: string,
  titleAlign: Alignment,
  titleColor: string,
  subtitleSize: string,
  subtitleAlign: Alignment,
  subtitleColor: string,
  pageBgColor: string,
  pageTheme: 'light' | 'dark' = 'light'
): string {
  // Theme-aware color helpers
  const DEFAULT_LIGHT_TEXT = '#171717';
  const DEFAULT_LIGHT_SUBTEXT = '#737373';
  
  const getTextColor = (currentColor?: string) => {
    if (!currentColor || currentColor === DEFAULT_LIGHT_TEXT) {
      return pageTheme === 'dark' ? '#ffffff' : DEFAULT_LIGHT_TEXT;
    }
    return currentColor;
  };

  const getSubTextColor = (currentColor?: string) => {
    if (!currentColor || currentColor === DEFAULT_LIGHT_SUBTEXT) {
      return pageTheme === 'dark' ? '#a3a3a3' : DEFAULT_LIGHT_SUBTEXT;
    }
    return currentColor;
  };

  const getBorderColor = () => pageTheme === 'dark' ? '#404040' : '#e5e5e5';
  const getVideoBgColor = () => pageTheme === 'dark' ? '#262626' : '#f3f4f6';
  const getCalloutBgColor = (customBg?: string) => customBg || (pageTheme === 'dark' ? '#1e1b4b' : '#eef2ff');
  const getCalloutBorderColor = (customColor?: string) => customColor ? `${customColor}30` : (pageTheme === 'dark' ? '#4338ca' : '#c7d2fe');
  const getCalloutTextColor = (customColor?: string) => customColor || (pageTheme === 'dark' ? '#a5b4fc' : '#4f46e5');

  const getVideoEmbedUrl = (url: string): string => {
    if (!url) return '';
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
    if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;
    return url;
  };

  let blocksHTML = '';
  
  blocks.forEach(block => {
    const styles = block.styles || {};
    
    switch (block.type) {
      case 'heading1':
        if (block.content) {
          blocksHTML += `<h2 style="font-weight: bold; font-size: ${getComputedFontSize(styles.size, 'heading1')}; color: ${getTextColor(styles.color)}; text-align: ${styles.align || 'left'}; word-wrap: break-word; overflow-wrap: break-word; margin-bottom: 1rem;">${block.content}</h2>`;
        }
        break;
      case 'heading2':
        if (block.content) {
          blocksHTML += `<h3 style="font-weight: 600; font-size: ${getComputedFontSize(styles.size, 'heading2')}; color: ${getTextColor(styles.color)}; text-align: ${styles.align || 'left'}; word-wrap: break-word; overflow-wrap: break-word; margin-bottom: 1rem;">${block.content}</h3>`;
        }
        break;
      case 'paragraph':
        if (block.content) {
          const bgStyle = styles.paragraphBg ? `background-color: ${styles.paragraphBg}; padding: 1rem; border-radius: 0.5rem;` : '';
          blocksHTML += `<p style="font-size: ${getComputedFontSize(styles.size, 'paragraph')}; color: ${getTextColor(styles.color)}; text-align: ${styles.align || 'left'}; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word; margin-bottom: 1.5rem; ${bgStyle}">${block.content}</p>`;
        }
        break;
      case 'list':
        const items = block.items.filter(item => item.trim());
        if (items.length > 0) {
          const spacing = styles.listSpacing === 'tight' ? '0.25rem' : styles.listSpacing === 'relaxed' ? '1rem' : '0.5rem';
          blocksHTML += `<ul style="font-size: ${getComputedFontSize(styles.size, 'list')}; color: ${getTextColor(styles.color)}; margin-left: 1rem; margin-bottom: 1.5rem;">`;
          items.forEach(item => {
            blocksHTML += `<li style="display: flex; gap: 0.5rem; margin-bottom: ${spacing}; word-wrap: break-word; overflow-wrap: break-word;"><span style="color: #4f46e5; flex-shrink: 0;">•</span><span style="word-break: break-word;">${item}</span></li>`;
          });
          blocksHTML += `</ul>`;
        }
        break;
      case 'video':
        const embedUrl = getVideoEmbedUrl(block.url);
        if (embedUrl) {
          const alignStyle = styles.align === 'center' ? 'margin: 0 auto;' : styles.align === 'right' ? 'margin-left: auto;' : '';
          blocksHTML += `<div style="margin-bottom: 1.5rem; ${alignStyle} max-width: 42rem;">`;
          if (styles.caption?.position === 'above' && block.caption) {
            blocksHTML += `<p style="font-size: ${getComputedFontSize(styles.caption?.size || 'sm', 'caption')}; color: ${getSubTextColor(styles.caption?.color)}; text-align: ${styles.caption?.align || 'center'}; margin-bottom: 0.5rem;">${block.caption}</p>`;
          }
          blocksHTML += `<div style="aspect-ratio: 16/9; border-radius: 0.5rem; overflow: hidden; background: ${getVideoBgColor()};"><iframe src="${embedUrl}" style="width: 100%; height: 100%; border: none;" allowfullscreen></iframe></div>`;
          if ((!styles.caption?.position || styles.caption?.position === 'below') && block.caption) {
            blocksHTML += `<p style="font-size: ${getComputedFontSize(styles.caption?.size || 'sm', 'caption')}; color: ${getSubTextColor(styles.caption?.color)}; text-align: ${styles.caption?.align || 'center'}; margin-top: 0.5rem;">${block.caption}</p>`;
          }
          blocksHTML += `</div>`;
        }
        break;
      case 'image':
        if (block.url) {
          const alignStyle = styles.align === 'center' ? 'margin: 0 auto;' : styles.align === 'right' ? 'margin-left: auto;' : '';
          const sizeStyle = styles.imageSize === 'small' ? 'max-width: 200px;' : styles.imageSize === 'medium' ? 'max-width: 400px;' : styles.imageSize === 'large' ? 'max-width: 600px;' : styles.imageSize === 'custom' && styles.imageSizeCustom ? `width: ${styles.imageSizeCustom};` : 'width: 100%;';
          const borderRadius = styles.imageRounded === 'none' ? '0' : styles.imageRounded === 'sm' ? '0.125rem' : styles.imageRounded === 'lg' ? '0.5rem' : styles.imageRounded === 'full' ? '9999px' : '0.375rem';
          const border = styles.imageBorder ? `border: 2px solid ${getBorderColor()};` : '';
          
          blocksHTML += `<div style="margin-bottom: 1.5rem; text-align: ${styles.align || 'left'};">`;
          if (styles.caption?.position === 'above' && block.caption) {
            blocksHTML += `<p style="font-size: ${getComputedFontSize(styles.caption?.size || 'sm', 'caption')}; color: ${getSubTextColor(styles.caption?.color)}; text-align: ${styles.caption?.align || 'center'}; margin-bottom: 0.5rem;">${block.caption}</p>`;
          }
          blocksHTML += `<img src="${block.url}" alt="${block.caption || 'Image'}" style="${sizeStyle} ${alignStyle} border-radius: ${borderRadius}; ${border} display: block;" />`;
          if ((!styles.caption?.position || styles.caption?.position === 'below') && block.caption) {
            blocksHTML += `<p style="font-size: ${getComputedFontSize(styles.caption?.size || 'sm', 'caption')}; color: ${getSubTextColor(styles.caption?.color)}; text-align: ${styles.caption?.align || 'center'}; margin-top: 0.5rem;">${block.caption}</p>`;
          }
          blocksHTML += `</div>`;
        }
        break;
      case 'divider':
        blocksHTML += `<hr style="border: none; border-top: 1px solid ${styles.color || getBorderColor()}; margin: 2rem 0;" />`;
        break;
      case 'callout':
        if (block.content) {
          const widthStyle = styles.calloutWidth === 'compact' ? 'max-width: 320px;' : styles.calloutWidth === 'medium' ? 'max-width: 480px;' : 'width: 100%;';
          const alignStyle = styles.calloutAlign === 'center' ? 'margin-left: auto; margin-right: auto;' : styles.calloutAlign === 'right' ? 'margin-left: auto;' : '';
          blocksHTML += `<div style="display: flex; gap: 0.75rem; padding: 1rem; border-radius: 0.5rem; background-color: ${getCalloutBgColor(styles.bgColor)}; border: 1px solid ${getCalloutBorderColor(styles.color)}; margin-bottom: 1.5rem; ${widthStyle} ${alignStyle}">`;
          if (block.emoji) {
            blocksHTML += `<span style="font-size: 1.5rem; flex-shrink: 0;">${block.emoji}</span>`;
          }
          blocksHTML += `<p style="flex: 1; color: ${getCalloutTextColor(styles.color)}; font-size: ${getComputedFontSize(styles.size, 'callout')}; word-wrap: break-word; overflow-wrap: break-word; margin: 0;">${block.content}</p>`;
          blocksHTML += `</div>`;
        }
        break;
    }
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview - ${pageTitle || 'Delivery Page'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: ${pageBgColor}; }
    .preview-banner { 
      background: linear-gradient(90deg, #4f46e5, #7c3aed);
      color: white;
      padding: 12px 16px;
      text-align: center;
      font-size: 14px;
      position: sticky;
      top: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .content { max-width: 48rem; margin: 0 auto; padding: 2rem 1rem; }
  </style>
</head>
<body>
  <div class="preview-banner">
    This is a preview of your delivery page. Customers will see this after purchase.
  </div>
  <div class="content">
    ${showTitle ? `
      <div style="${blocks.length > 0 ? `margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid ${getBorderColor()};` : 'margin-bottom: 1rem;'}">
        <h1 style="font-weight: bold; font-size: ${getComputedFontSize(titleSize, 'title')}; color: ${getTextColor(titleColor)}; text-align: ${titleAlign}; word-wrap: break-word; overflow-wrap: break-word;">
          ${pageTitle || 'Untitled'}
        </h1>
        ${pageSubtitle ? `
          <p style="margin-top: 0.25rem; font-size: ${getComputedFontSize(subtitleSize, 'subtitle')}; color: ${getSubTextColor(subtitleColor)}; text-align: ${subtitleAlign}; word-wrap: break-word; overflow-wrap: break-word;">
            ${pageSubtitle}
          </p>
        ` : ''}
      </div>
    ` : ''}
    ${blocksHTML || `<div style="text-align: center; padding: 3rem; border: 2px dashed ${getBorderColor()}; border-radius: 0.5rem; color: ${pageTheme === 'dark' ? '#737373' : '#9ca3af'};">No content blocks added yet</div>`}
  </div>
</body>
</html>`;
}

export default function ContentBuilderPage() {
  const navigate = useNavigate();
  const { productId } = useParams();
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [productName, setProductName] = useState<string>('Your Product');
  
  // Content blocks state
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [initialBlocks, setInitialBlocks] = useState<string>('[]');
  
  // Page title/subtitle state
  const [pageTitle, setPageTitle] = useState<string>('');
  const [pageSubtitle, setPageSubtitle] = useState<string>('');
  const [initialPageTitle, setInitialPageTitle] = useState<string>('');
  const [initialPageSubtitle, setInitialPageSubtitle] = useState<string>('');
  
  // Header styling state
  const [showTitle, setShowTitle] = useState<boolean>(true);
  const [titleSize, setTitleSize] = useState<string>('lg');
  const [titleAlign, setTitleAlign] = useState<Alignment>('left');
  const [titleColor, setTitleColor] = useState<string>('#171717');
  const [subtitleSize, setSubtitleSize] = useState<string>('md');
  const [subtitleAlign, setSubtitleAlign] = useState<Alignment>('left');
  const [subtitleColor, setSubtitleColor] = useState<string>('#737373');
  const [initialHeaderStyles, setInitialHeaderStyles] = useState<string>('');
  
  // Page background color and theme
  const [pageBgColor, setPageBgColor] = useState<string>('#ffffff');
  const [initialPageBgColor, setInitialPageBgColor] = useState<string>('#ffffff');
  const [pageTheme, setPageTheme] = useState<'light' | 'dark'>('light');
  const [initialPageTheme, setInitialPageTheme] = useState<'light' | 'dark'>('light');
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const bgColorRef = useRef<HTMLDivElement>(null);
  
  // Preview state
  const [showPreview, setShowPreview] = useState(true);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  
  // Active block for auto-scroll
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [scrollVersion, setScrollVersion] = useState(0);
  
  // Modal states
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Click outside for bg color picker
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (bgColorRef.current && !bgColorRef.current.contains(e.target as Node)) {
        setShowBgColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Load product data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/auth/signin');
        return;
      }

      setUserId(user.uid);

      if (!productId) {
        console.warn('No product ID provided');
        navigate('/dashboard');
        return;
      }

      try {
        const productRef = doc(db, 'users', user.uid, 'products', productId);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          const data = productSnap.data();
          
          const name = data.salesPage?.coreInfo?.name || 'Your Product';
          setProductName(name);
          
          const loadedTitle = data.delivery?.hosted?.pageTitle || name;
          const loadedSubtitle = data.delivery?.hosted?.pageSubtitle ?? 'Your purchase is ready!';
          setPageTitle(loadedTitle);
          setPageSubtitle(loadedSubtitle);
          setInitialPageTitle(loadedTitle);
          setInitialPageSubtitle(loadedSubtitle);
          
          const headerStyles = data.delivery?.hosted?.headerStyles || {};
          setShowTitle(headerStyles.showTitle !== false);
          setTitleSize(headerStyles.titleSize || 'lg');
          setTitleAlign(headerStyles.titleAlign || 'left');
          setTitleColor(headerStyles.titleColor || '#171717');
          setSubtitleSize(headerStyles.subtitleSize || 'md');
          setSubtitleAlign(headerStyles.subtitleAlign || 'left');
          setSubtitleColor(headerStyles.subtitleColor || '#737373');
          setInitialHeaderStyles(JSON.stringify(headerStyles));
          
          // Page background and theme
          const loadedBgColor = data.delivery?.hosted?.pageBgColor || '#ffffff';
          const loadedTheme = data.delivery?.hosted?.pageTheme || 'light';
          setPageBgColor(loadedBgColor);
          setInitialPageBgColor(loadedBgColor);
          setPageTheme(loadedTheme);
          setInitialPageTheme(loadedTheme);
          
          if (data.delivery?.hosted?.contentBlocks) {
            try {
              const parsedBlocks = JSON.parse(data.delivery.hosted.contentBlocks);
              setBlocks(parsedBlocks);
              setInitialBlocks(data.delivery.hosted.contentBlocks);
            } catch (e) {
              console.error('Error parsing content blocks:', e);
              setBlocks([]);
            }
          }
        } else {
          console.warn('Product not found');
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error loading product:', error);
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [productId, navigate]);

  // Track unsaved changes
  useEffect(() => {
    const currentBlocks = JSON.stringify(blocks);
    const currentHeaderStyles = JSON.stringify({ showTitle, titleSize, titleAlign, titleColor, subtitleSize, subtitleAlign, subtitleColor });
    const blocksChanged = currentBlocks !== initialBlocks;
    const titleChanged = pageTitle !== initialPageTitle;
    const subtitleChanged = pageSubtitle !== initialPageSubtitle;
    const stylesChanged = currentHeaderStyles !== initialHeaderStyles;
    const bgChanged = pageBgColor !== initialPageBgColor;
    const themeChanged = pageTheme !== initialPageTheme;
    setHasUnsavedChanges(blocksChanged || titleChanged || subtitleChanged || stylesChanged || bgChanged || themeChanged);
  }, [blocks, initialBlocks, pageTitle, initialPageTitle, pageSubtitle, initialPageSubtitle, showTitle, titleSize, titleAlign, titleColor, subtitleSize, subtitleAlign, subtitleColor, initialHeaderStyles, pageBgColor, initialPageBgColor, pageTheme, initialPageTheme]);

  // Warn before leaving with unsaved changes (browser)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle blocks change
  const handleBlocksChange = useCallback((newBlocks: ContentBlock[]) => {
    setBlocks(newBlocks);
  }, []);

  // Handle active block change for auto-scroll
  const handleActiveBlockChange = useCallback((blockId: string | null, scrollTrigger?: number) => {
    setActiveBlockId(blockId);
    // Increment scroll version to trigger scroll even if same block
    setScrollVersion(prev => prev + 1);
  }, []);

  // Save content
  const handleSave = async () => {
    if (!userId || !productId) return;
    
    setIsSaving(true);
    try {
      const productRef = doc(db, 'users', userId, 'products', productId);
      const blocksJson = JSON.stringify(blocks);
      const headerStyles = { showTitle, titleSize, titleAlign, titleColor, subtitleSize, subtitleAlign, subtitleColor };
      
      await updateDoc(productRef, {
        'delivery.hosted.contentBlocks': blocksJson,
        'delivery.hosted.pageTitle': pageTitle,
        'delivery.hosted.pageSubtitle': pageSubtitle,
        'delivery.hosted.headerStyles': headerStyles,
        'delivery.hosted.pageBgColor': pageBgColor,
        'delivery.hosted.pageTheme': pageTheme,
        'delivery.hosted.hasCustomContent': blocks.length > 0,
        lastUpdated: new Date()
      });

      setInitialBlocks(blocksJson);
      setInitialPageTitle(pageTitle);
      setInitialPageSubtitle(pageSubtitle);
      setInitialHeaderStyles(JSON.stringify(headerStyles));
      setInitialPageBgColor(pageBgColor);
      setInitialPageTheme(pageTheme);
      setHasUnsavedChanges(false);
      setSaveSuccess(true);
      
      setTimeout(() => setSaveSuccess(false), 3000);
      
      console.log('Content saved successfully');
    } catch (error) {
      console.error('Error saving content:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle back navigation with confirmation
  const handleBack = () => {
    const destination = `/products/${productId}/delivery`;
    if (hasUnsavedChanges) {
      setPendingNavigation(destination);
      setShowLeaveModal(true);
    } else {
      navigate(destination);
    }
  };

  // Confirm leave
  const confirmLeave = () => {
    setShowLeaveModal(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
  };

  // Open full preview in new tab
  const openFullPreview = () => {
    const previewHTML = generateFullPreviewHTML(
      blocks,
      pageTitle,
      pageSubtitle,
      showTitle,
      titleSize,
      titleAlign,
      titleColor,
      subtitleSize,
      subtitleAlign,
      subtitleColor,
      pageBgColor,
      pageTheme
    );
    
    const blob = new Blob([previewHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-neutral-400 mx-auto mb-2" />
          <div className="text-neutral-400">Loading content builder...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-neutral-950 text-neutral-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm flex-shrink-0">
        <div className="px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold">Content Builder</h1>
                  {hasUnsavedChanges && (
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">
                      Unsaved
                    </span>
                  )}
                </div>
                <p className="text-sm text-neutral-400">{productName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Full Preview Button */}
              <button
                onClick={openFullPreview}
                className="hidden md:flex items-center gap-2 px-3 py-2 text-neutral-400 hover:text-white rounded-lg transition-colors"
                title="Open full preview in new tab"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm">Full Preview</span>
              </button>

              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  showPreview ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="text-sm">{showPreview ? 'Hide' : 'Show'} Preview</span>
              </button>

              {showPreview && (
                <div className="hidden md:flex items-center border border-neutral-700 rounded-lg p-1">
                  <button
                    onClick={() => setPreviewMode('desktop')}
                    className={`p-1.5 rounded ${
                      previewMode === 'desktop' ? 'bg-neutral-700 text-white' : 'text-neutral-400'
                    }`}
                    title="Desktop preview"
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPreviewMode('mobile')}
                    className={`p-1.5 rounded ${
                      previewMode === 'mobile' ? 'bg-neutral-700 text-white' : 'text-neutral-400'
                    }`}
                    title="Mobile preview"
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                </div>
              )}

              {isSaving ? (
                <div className="flex items-center gap-2 text-neutral-400">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="text-sm hidden sm:inline">Saving...</span>
                </div>
              ) : saveSuccess ? (
                <div className="flex items-center gap-2 text-green-400">
                  <Check className="w-4 h-4" />
                  <span className="text-sm hidden sm:inline">Saved!</span>
                </div>
              ) : null}

              <button
                onClick={handleSave}
                disabled={isSaving || !hasUnsavedChanges}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-700 disabled:text-neutral-500 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">Save</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Panel - Scrollable */}
        <div className={`flex-1 overflow-y-auto ${showPreview ? 'md:w-1/2' : 'w-full'}`}>
          <div className="p-4 md:p-6 max-w-3xl mx-auto">
            {/* Page Settings */}
            <div className="mb-6 pb-6 border-b border-neutral-800">
              <h3 className="text-sm font-medium text-neutral-400 mb-4">Page Settings</h3>
              
              <div className="space-y-4">
                {/* Theme Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">Theme:</span>
                  <div className="flex items-center gap-1 bg-neutral-800 rounded-lg p-1">
                    <button
                      onClick={() => {
                        setPageTheme('light');
                        // Switch to light mode colors
                        if (DARK_BG_COLORS.some(c => c.value === pageBgColor)) {
                          setPageBgColor('#ffffff');
                        }
                        // Switch text colors to dark (for light backgrounds)
                        if (titleColor === '#ffffff' || titleColor === '#f5f5f5') {
                          setTitleColor('#171717');
                        }
                        if (subtitleColor === '#a3a3a3' || subtitleColor === '#d4d4d4') {
                          setSubtitleColor('#737373');
                        }
                      }}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        pageTheme === 'light' 
                          ? 'bg-white text-neutral-900' 
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Light
                    </button>
                    <button
                      onClick={() => {
                        setPageTheme('dark');
                        // Switch to dark mode colors
                        if (BG_COLORS.some(c => c.value === pageBgColor)) {
                          setPageBgColor('#171717');
                        }
                        // Switch text colors to white (for dark backgrounds)
                        if (titleColor === '#171717' || titleColor === '#000000') {
                          setTitleColor('#ffffff');
                        }
                        if (subtitleColor === '#737373' || subtitleColor === '#525252') {
                          setSubtitleColor('#a3a3a3');
                        }
                      }}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        pageTheme === 'dark' 
                          ? 'bg-neutral-900 text-white' 
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Dark
                    </button>
                  </div>
                </div>

                {/* Background Color */}
                <div className="flex items-center justify-between relative" ref={bgColorRef}>
                  <span className="text-xs text-neutral-500">Background:</span>
                  <div className="flex items-center gap-2">
                    {(pageTheme === 'light' ? BG_COLORS : DARK_BG_COLORS).slice(0, 3).map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setPageBgColor(c.value)}
                        className={`w-5 h-5 rounded transition-all border border-neutral-600 ${
                          pageBgColor === c.value ? 'ring-2 ring-white ring-offset-1 ring-offset-neutral-900' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                    <button
                      onClick={() => setShowBgColorPicker(!showBgColorPicker)}
                      className="w-5 h-5 rounded border-2 border-dashed border-neutral-500 flex items-center justify-center hover:border-neutral-400"
                    >
                      <Palette className="w-3 h-3 text-neutral-400" />
                    </button>
                    
                    {showBgColorPicker && (
                      <div className="absolute top-full right-0 mt-1 p-3 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-20 min-w-[180px]">
                        <div className="text-xs text-neutral-400 mb-2">
                          {pageTheme === 'light' ? 'Light' : 'Dark'} Colors
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          {(pageTheme === 'light' ? BG_COLORS : DARK_BG_COLORS).map((c) => (
                            <button
                              key={c.value}
                              onClick={() => {
                                setPageBgColor(c.value);
                                setShowBgColorPicker(false);
                              }}
                              className={`w-8 h-8 rounded transition-all border border-neutral-600 ${
                                pageBgColor === c.value ? 'ring-2 ring-white' : 'hover:scale-110'
                              }`}
                              style={{ backgroundColor: c.value }}
                              title={c.label}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={pageBgColor}
                            onChange={(e) => setPageBgColor(e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={pageBgColor}
                            onChange={(e) => setPageBgColor(e.target.value)}
                            className="flex-1 px-2 py-1 text-xs bg-neutral-900 border border-neutral-600 rounded font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Page Title & Subtitle */}
            <div className="mb-6 pb-6 border-b border-neutral-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-neutral-400">Page Header</h3>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-neutral-500">Show header</span>
                  <button
                    onClick={() => setShowTitle(!showTitle)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      showTitle ? 'bg-indigo-600' : 'bg-neutral-700'
                    }`}
                  >
                    <span 
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                        showTitle ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>
              </div>
              
              {showTitle ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Title</label>
                    <textarea
                      value={pageTitle}
                      onChange={(e) => setPageTitle(e.target.value)}
                      placeholder="Enter page title..."
                      rows={1}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:border-indigo-500 focus:outline-none resize-none overflow-hidden"
                      style={{ minHeight: '2.5rem' }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                      }}
                    />
                    <HeaderStyleControls
                      size={titleSize}
                      onSizeChange={setTitleSize}
                      align={titleAlign}
                      onAlignChange={setTitleAlign}
                      color={titleColor}
                      onColorChange={setTitleColor}
                      pageTheme={pageTheme}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Subtitle (optional)</label>
                    <textarea
                      value={pageSubtitle}
                      onChange={(e) => setPageSubtitle(e.target.value)}
                      placeholder="Enter subtitle..."
                      rows={1}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:border-indigo-500 focus:outline-none resize-none overflow-hidden"
                      style={{ minHeight: '2.5rem' }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                      }}
                    />
                    {pageSubtitle && (
                      <HeaderStyleControls
                        size={subtitleSize}
                        onSizeChange={setSubtitleSize}
                        align={subtitleAlign}
                        onAlignChange={setSubtitleAlign}
                        color={subtitleColor}
                        onColorChange={setSubtitleColor}
                        pageTheme={pageTheme}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-neutral-500 italic py-4 text-center border border-dashed border-neutral-700 rounded-lg">
                  Page header is hidden. Toggle above to show it.
                </div>
              )}
            </div>
            
            <DeliveryContentEditor 
              blocks={blocks}
              onChange={handleBlocksChange}
              onActiveBlockChange={handleActiveBlockChange}
              pageTheme={pageTheme}
            />
          </div>
        </div>

        {/* Preview Panel - Fixed with independent scroll */}
        {showPreview && (
          <div className="hidden md:flex md:w-1/2 border-l border-neutral-800 flex-col bg-neutral-900/30 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-neutral-400" />
                <span className="text-sm font-medium text-neutral-300">Live Preview</span>
              </div>
              <span className="text-xs text-neutral-500">
                {previewMode === 'desktop' ? 'Desktop' : 'Mobile'} view
              </span>
            </div>

            {/* Preview content - scrollable independently */}
            <div className="flex-1 overflow-y-auto p-4 flex justify-center">
              <div 
                className={`rounded-lg shadow-xl overflow-y-auto overflow-x-hidden ${
                  previewMode === 'desktop' 
                    ? 'w-full max-w-2xl' 
                    : 'w-[375px]'
                }`}
                style={{ maxHeight: 'calc(100vh - 180px)', backgroundColor: pageBgColor }}
              >
                <ContentPreview 
                  blocks={blocks} 
                  pageTitle={pageTitle} 
                  pageSubtitle={pageSubtitle}
                  showTitle={showTitle}
                  titleSize={titleSize}
                  titleAlign={titleAlign}
                  titleColor={titleColor}
                  subtitleSize={subtitleSize}
                  subtitleAlign={subtitleAlign}
                  subtitleColor={subtitleColor}
                  pageBgColor={pageBgColor}
                  pageTheme={pageTheme}
                  activeBlockId={activeBlockId}
                  scrollVersion={scrollVersion}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Preview Button */}
      <div className="md:hidden fixed bottom-4 right-4">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="p-4 bg-indigo-600 hover:bg-indigo-500 rounded-full shadow-lg transition-colors"
        >
          <Eye className="w-5 h-5" />
        </button>
      </div>

      {/* Leave Confirmation Modal */}
      <ConfirmModal
        isOpen={showLeaveModal}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
        confirmText="Leave"
        cancelText="Stay"
        variant="warning"
        onConfirm={confirmLeave}
        onCancel={() => setShowLeaveModal(false)}
      />
    </div>
  );
}