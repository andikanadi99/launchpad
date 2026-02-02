import { useState, useRef, useEffect } from 'react';
import { 
  Plus, Trash2, Type, Heading1, Heading2, 
  List, Video, Image as ImageIcon, FileText,
  AlertCircle, MoveUp, MoveDown, Undo2,
  ChevronDown, X, Palette, AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';
import { storage, auth } from '../../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import ConfirmModal from '../../ConfirmModal';

// Style interfaces
export interface CaptionStyles {
  position?: 'above' | 'below';
  size?: string;
  align?: 'left' | 'center' | 'right';
  color?: string;
}

export interface BlockStyles {
  size?: string;
  align?: 'left' | 'center' | 'right';
  color?: string;
  // Image specific
  imageSize?: 'small' | 'medium' | 'large' | 'full' | 'custom';
  imageSizeCustom?: string; // e.g., "50%"
  imageRounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  imageBorder?: boolean;
  // Caption
  caption?: CaptionStyles;
  // Paragraph specific
  paragraphBg?: string;
  paragraphBgWidth?: 'content' | 'full';
  // List specific
  listSpacing?: 'tight' | 'normal' | 'relaxed';
  // Callout specific
  calloutWidth?: 'compact' | 'medium' | 'full';
  calloutAlign?: 'left' | 'center' | 'right';
  bgColor?: string;
}

// Block types for content
export type ContentBlock = 
  | { type: 'heading1'; content: string; id: string; styles?: BlockStyles }
  | { type: 'heading2'; content: string; id: string; styles?: BlockStyles }
  | { type: 'paragraph'; content: string; id: string; styles?: BlockStyles }
  | { type: 'list'; items: string[]; id: string; styles?: BlockStyles }
  | { type: 'video'; url: string; caption?: string; id: string; styles?: BlockStyles }
  | { type: 'image'; url: string; caption?: string; id: string; styles?: BlockStyles }
  | { type: 'divider'; id: string; styles?: BlockStyles }
  | { type: 'callout'; content: string; emoji?: string; id: string; styles?: BlockStyles };

interface DeliveryContentEditorProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  onActiveBlockChange?: (blockId: string | null, scrollTrigger?: number) => void;
  pageTheme?: 'light' | 'dark';
}

// Emoji presets for callouts
const EMOJI_PRESETS = [
  '💡', '⚠️', '✅', '❌', '📌', '🎯', '🔥', '⭐',
  '💪', '🚀', '📝', '💰', '🎉', '👋', '❤️', '🔔',
  '📚', '🎓', '💻', '🔑', '⏰', '📊', '🎁', '✨'
];

// Preset colors for light theme (dark text on light backgrounds)
const PRESET_COLORS_LIGHT = [
  { value: '#171717', label: 'Black' },
  { value: '#737373', label: 'Gray' },
  { value: '#4f46e5', label: 'Indigo' },
  { value: '#2563eb', label: 'Blue' },
  { value: '#16a34a', label: 'Green' },
  { value: '#dc2626', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#9333ea', label: 'Purple' },
];

// Preset colors for dark theme (light text on dark backgrounds)
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
  { value: '#eef2ff', label: 'Indigo Light' },
  { value: '#fef3c7', label: 'Amber Light' },
  { value: '#dcfce7', label: 'Green Light' },
  { value: '#fee2e2', label: 'Red Light' },
  { value: '#f3f4f6', label: 'Gray Light' },
  { value: '#e0e7ff', label: 'Blue Light' },
];

// Image Style Controls Component (outside main component to prevent re-mount on every render)
function ImageStyleControls({ 
  blockId, 
  styles, 
  updateBlockStyles 
}: { 
  blockId: string; 
  styles: BlockStyles; 
  updateBlockStyles: (id: string, updates: Partial<BlockStyles>) => void;
}) {
  const [customSizeInput, setCustomSizeInput] = useState(
    styles.imageSizeCustom?.replace('%', '') || ''
  );

  // Sync local state when styles change externally
  useEffect(() => {
    const externalValue = styles.imageSizeCustom?.replace('%', '') || '';
    if (externalValue !== customSizeInput && styles.imageSize !== 'custom') {
      setCustomSizeInput(externalValue);
    }
  }, [styles.imageSizeCustom, styles.imageSize]);

  const handleCustomSizeChange = (value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    setCustomSizeInput(numericValue);
  };

  const handleCustomSizeBlur = () => {
    if (customSizeInput.trim()) {
      updateBlockStyles(blockId, { 
        imageSize: 'custom', 
        imageSizeCustom: `${customSizeInput}%` 
      });
    }
  };

  const handleCustomSizeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomSizeBlur();
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="flex flex-wrap gap-3 pt-2 border-t border-neutral-700">
      {/* Image Size */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-neutral-500 mr-1">Size:</span>
        {(['small', 'medium', 'large', 'full'] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              updateBlockStyles(blockId, { imageSize: s, imageSizeCustom: undefined });
              setCustomSizeInput('');
            }}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              styles.imageSize === s || (!styles.imageSize && s === 'full')
                ? 'bg-indigo-600 text-white'
                : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <div className="relative flex items-center">
          <input
            type="text"
            value={customSizeInput}
            onChange={(e) => handleCustomSizeChange(e.target.value)}
            onBlur={handleCustomSizeBlur}
            onKeyDown={handleCustomSizeKeyDown}
            placeholder="50"
            className={`w-12 px-2 py-1 text-xs border rounded-l ${
              styles.imageSize === 'custom' 
                ? 'bg-indigo-600 text-white border-indigo-600' 
                : 'bg-neutral-700 border-neutral-600'
            }`}
          />
          <span className={`px-1.5 py-1 text-xs border border-l-0 rounded-r ${
            styles.imageSize === 'custom'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-neutral-700 text-neutral-400 border-neutral-600'
          }`}>%</span>
        </div>
      </div>

      {/* Image Corners */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-neutral-500 mr-1">Corners:</span>
        {(['none', 'sm', 'md', 'lg', 'full'] as const).map((r) => (
          <button
            key={r}
            onClick={() => updateBlockStyles(blockId, { imageRounded: r })}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              styles.imageRounded === r || (!styles.imageRounded && r === 'md')
                ? 'bg-indigo-600 text-white'
                : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
            }`}
          >
            {r === 'none' ? '⬜' : r === 'full' ? '⬤' : r.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Image Border */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={styles.imageBorder || false}
          onChange={(e) => updateBlockStyles(blockId, { imageBorder: e.target.checked })}
          className="rounded border-neutral-600 bg-neutral-700 text-indigo-600"
        />
        <span className="text-xs text-neutral-400">Border</span>
      </label>
    </div>
  );
}

export default function DeliveryContentEditor({ blocks, onChange, onActiveBlockChange, pageTheme = 'light' }: DeliveryContentEditorProps) {
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  
  // Delete confirmation
  const [deleteConfirmBlock, setDeleteConfirmBlock] = useState<ContentBlock | null>(null);
  
  // Undo history - stores snapshots of blocks array
  const [history, setHistory] = useState<ContentBlock[][]>([]);
  const isUndoing = useRef(false);
  
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Generate unique ID for blocks
  const generateId = () => `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Save to history before changes
  const saveToHistory = (currentBlocks: ContentBlock[]) => {
    if (isUndoing.current) return;
    setHistory(prev => {
      const newHistory = [...prev, JSON.parse(JSON.stringify(currentBlocks))];
      // Keep max 20 history items
      return newHistory.slice(-20);
    });
  };

  // Undo last change
  const handleUndo = () => {
    if (history.length === 0) return;
    
    isUndoing.current = true;
    const previousState = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    onChange(previousState);
    
    // Reset flag after state update
    setTimeout(() => {
      isUndoing.current = false;
    }, 100);
  };

  // Click outside to close emoji picker
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Track scroll trigger (increments on edits to force scroll)
  const [scrollTrigger, setScrollTrigger] = useState(0);

  // Notify parent of active block change (includes trigger to scroll on edits)
  useEffect(() => {
    onActiveBlockChange?.(selectedBlockId, scrollTrigger);
  }, [selectedBlockId, scrollTrigger, onActiveBlockChange]);

  // Add new block
  const addBlock = (type: ContentBlock['type']) => {
    saveToHistory(blocks);
    
    let newBlock: ContentBlock;
    const id = generateId();
    
    switch (type) {
      case 'heading1':
        newBlock = { type: 'heading1', content: '', id, styles: {} };
        break;
      case 'heading2':
        newBlock = { type: 'heading2', content: '', id, styles: {} };
        break;
      case 'paragraph':
        newBlock = { type: 'paragraph', content: '', id, styles: {} };
        break;
      case 'list':
        newBlock = { type: 'list', items: [''], id, styles: { listSpacing: 'normal' } };
        break;
      case 'video':
        newBlock = { type: 'video', url: '', id, styles: {} };
        break;
      case 'image':
        newBlock = { type: 'image', url: '', id, styles: { imageSize: 'full', imageRounded: 'md' } };
        break;
      case 'divider':
        newBlock = { type: 'divider', id, styles: {} };
        break;
      case 'callout':
        newBlock = { type: 'callout', content: '', emoji: '💡', id, styles: { calloutWidth: 'full', calloutAlign: 'left' } };
        break;
      default:
        return;
    }
    
    onChange([...blocks, newBlock]);
    setShowBlockMenu(false);
    setSelectedBlockId(id);
  };

  // Update block content (also triggers scroll to block)
  const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
    saveToHistory(blocks);
    onChange(blocks.map(block => 
      block.id === id ? { ...block, ...updates } : block
    ));
    // Ensure block is selected and trigger scroll
    if (selectedBlockId !== id) {
      setSelectedBlockId(id);
    }
    setScrollTrigger(prev => prev + 1);
  };

  // Update block styles (also triggers scroll)
  const updateBlockStyles = (id: string, styleUpdates: Partial<BlockStyles>) => {
    saveToHistory(blocks);
    onChange(blocks.map(block => {
      if (block.id === id) {
        return { ...block, styles: { ...block.styles, ...styleUpdates } };
      }
      return block;
    }));
    setScrollTrigger(prev => prev + 1);
  };

  // Check if block has content
  const blockHasContent = (block: ContentBlock): boolean => {
    switch (block.type) {
      case 'heading1':
      case 'heading2':
      case 'paragraph':
      case 'callout':
        return block.content.trim().length > 0;
      case 'list':
        return block.items.some(item => item.trim().length > 0);
      case 'video':
        return block.url.trim().length > 0;
      case 'image':
        return block.url.trim().length > 0;
      case 'divider':
        return false;
      default:
        return false;
    }
  };

  // Delete block with confirmation if has content
  const handleDeleteClick = (block: ContentBlock) => {
    if (blockHasContent(block)) {
      setDeleteConfirmBlock(block);
    } else {
      confirmDelete(block.id);
    }
  };

  // Confirm delete
  const confirmDelete = (id: string) => {
    saveToHistory(blocks);
    onChange(blocks.filter(block => block.id !== id));
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
    setDeleteConfirmBlock(null);
  };

  // Move block up/down
  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === id);
    if (index === -1) return;
    
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;
    
    saveToHistory(blocks);
    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    
    onChange(newBlocks);
  };

  // Handle image upload
  const handleImageUpload = async (blockId: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('Not authenticated');

      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `users/${userId}/content-images/${fileName}`);
      
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on(
        'state_changed',
        null,
        (error) => {
          console.error('Upload error:', error);
          alert('Failed to upload image');
          setUploadingImage(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          saveToHistory(blocks);
          updateBlock(blockId, { url: downloadURL });
          setUploadingImage(false);
        }
      );
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
      setUploadingImage(false);
    }
  };

  // Parse video URL to embed URL
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

  // Style Controls Component
  const StyleControls = ({ block }: { block: ContentBlock }) => {
    const styles = block.styles || {};
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showBgColorPicker, setShowBgColorPicker] = useState(false);
    const [customSize, setCustomSize] = useState('');
    const [showCustomSize, setShowCustomSize] = useState(false);
    const colorRef = useRef<HTMLDivElement>(null);
    const bgColorRef = useRef<HTMLDivElement>(null);
    
    // Select colors based on theme
    const PRESET_COLORS = pageTheme === 'dark' ? PRESET_COLORS_DARK : PRESET_COLORS_LIGHT;

    // Click outside handlers
    useEffect(() => {
      const handleClick = (e: MouseEvent) => {
        if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
          setShowColorPicker(false);
        }
        if (bgColorRef.current && !bgColorRef.current.contains(e.target as Node)) {
          setShowBgColorPicker(false);
        }
      };
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleCustomSizeSubmit = () => {
      if (customSize.trim()) {
        const sizeValue = /^\d+$/.test(customSize.trim()) 
          ? `${customSize.trim()}px` 
          : customSize.trim();
        updateBlockStyles(block.id, { size: sizeValue });
        setShowCustomSize(false);
        setCustomSize('');
      }
    };

    // Different controls based on block type
    const showSizeControls = ['heading1', 'heading2', 'paragraph', 'list', 'callout'].includes(block.type);
    const showAlignControls = !['divider'].includes(block.type);
    const showColorControls = ['heading1', 'heading2', 'paragraph', 'list', 'divider', 'callout'].includes(block.type);

    return (
      <div className="mt-3 p-3 bg-neutral-800/50 border border-neutral-700 rounded-lg space-y-3">
        <div className="text-xs text-neutral-500 font-medium">Style Options</div>
        
        <div className="flex flex-wrap gap-3">
          {/* Size Controls */}
          {showSizeControls && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-neutral-500 mr-1">Size:</span>
              {(['sm', 'md', 'lg', 'xl'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => updateBlockStyles(block.id, { size: s })}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    styles.size === s || (!styles.size && s === 'md')
                      ? 'bg-indigo-600 text-white'
                      : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
                  }`}
                >
                  {s.toUpperCase()}
                </button>
              ))}
              <div className="relative">
                <button
                  onClick={() => setShowCustomSize(!showCustomSize)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    styles.size && !['sm', 'md', 'lg', 'xl'].includes(styles.size)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
                  }`}
                >
                  {styles.size && !['sm', 'md', 'lg', 'xl'].includes(styles.size) ? styles.size : '...'}
                </button>
                {showCustomSize && (
                  <div className="absolute top-full left-0 mt-1 p-2 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-20 min-w-[140px]">
                    <div className="text-xs text-neutral-400 mb-1">Custom (px, rem, em)</div>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={customSize}
                        onChange={(e) => setCustomSize(e.target.value)}
                        placeholder="24px"
                        className="w-16 px-2 py-1 text-xs bg-neutral-900 border border-neutral-600 rounded"
                        onKeyDown={(e) => e.key === 'Enter' && handleCustomSizeSubmit()}
                      />
                      <button
                        onClick={handleCustomSizeSubmit}
                        className="px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 rounded"
                      >
                        Set
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Alignment Controls */}
          {showAlignControls && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-neutral-500 mr-1">Align:</span>
              {([
                { value: 'left', icon: AlignLeft },
                { value: 'center', icon: AlignCenter },
                { value: 'right', icon: AlignRight }
              ] as const).map(({ value, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => updateBlockStyles(block.id, { align: value })}
                  className={`p-1.5 rounded transition-colors ${
                    styles.align === value || (!styles.align && value === 'left')
                      ? 'bg-indigo-600 text-white'
                      : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          )}

          {/* Color Controls */}
          {showColorControls && (
            <div className="flex items-center gap-1 relative" ref={colorRef}>
              <span className="text-xs text-neutral-500 mr-1">Color:</span>
              {PRESET_COLORS.slice(0, 4).map((c) => (
                <button
                  key={c.value}
                  onClick={() => updateBlockStyles(block.id, { color: c.value })}
                  className={`w-5 h-5 rounded-full transition-all ${
                    styles.color === c.value ? 'ring-2 ring-white ring-offset-1 ring-offset-neutral-800' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-5 h-5 rounded-full border-2 border-dashed border-neutral-500 flex items-center justify-center hover:border-neutral-400"
              >
                <Palette className="w-3 h-3 text-neutral-400" />
              </button>
              {showColorPicker && (
                <div className="absolute top-full left-0 mt-1 p-3 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-20 min-w-[180px]">
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => {
                          updateBlockStyles(block.id, { color: c.value });
                          setShowColorPicker(false);
                        }}
                        className={`w-7 h-7 rounded transition-all ${
                          styles.color === c.value ? 'ring-2 ring-white' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={styles.color || '#171717'}
                      onChange={(e) => updateBlockStyles(block.id, { color: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={styles.color || ''}
                      onChange={(e) => updateBlockStyles(block.id, { color: e.target.value })}
                      placeholder="#000000"
                      className="flex-1 px-2 py-1 text-xs bg-neutral-900 border border-neutral-600 rounded font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Image-specific controls */}
        {block.type === 'image' && (
          <ImageStyleControls 
            blockId={block.id} 
            styles={styles} 
            updateBlockStyles={updateBlockStyles} 
          />
        )}

        {/* Caption controls for image/video */}
        {(block.type === 'image' || block.type === 'video') && (block as any).caption && (
          <div className="flex flex-wrap gap-3 pt-2 border-t border-neutral-700">
            <div className="text-xs text-neutral-500 w-full">Caption Style</div>
            
            {/* Position */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-neutral-500 mr-1">Position:</span>
              {(['above', 'below'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => updateBlockStyles(block.id, { caption: { ...styles.caption, position: p } })}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    styles.caption?.position === p || (!styles.caption?.position && p === 'below')
                      ? 'bg-indigo-600 text-white'
                      : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>

            {/* Caption Size */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-neutral-500 mr-1">Size:</span>
              {(['sm', 'md', 'lg'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => updateBlockStyles(block.id, { caption: { ...styles.caption, size: s } })}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    styles.caption?.size === s || (!styles.caption?.size && s === 'sm')
                      ? 'bg-indigo-600 text-white'
                      : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
                  }`}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Caption Align */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-neutral-500 mr-1">Align:</span>
              {([
                { value: 'left', icon: AlignLeft },
                { value: 'center', icon: AlignCenter },
                { value: 'right', icon: AlignRight }
              ] as const).map(({ value, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => updateBlockStyles(block.id, { caption: { ...styles.caption, align: value } })}
                  className={`p-1 rounded transition-colors ${
                    styles.caption?.align === value || (!styles.caption?.align && value === 'center')
                      ? 'bg-indigo-600 text-white'
                      : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Paragraph background */}
        {block.type === 'paragraph' && (
          <div className="flex flex-wrap gap-3 pt-2 border-t border-neutral-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!styles.paragraphBg}
                onChange={(e) => updateBlockStyles(block.id, { 
                  paragraphBg: e.target.checked ? '#f3f4f6' : undefined 
                })}
                className="rounded border-neutral-600 bg-neutral-700 text-indigo-600"
              />
              <span className="text-xs text-neutral-400">Background</span>
            </label>

            {styles.paragraphBg && (
              <>
                <div className="flex items-center gap-1 relative" ref={bgColorRef}>
                  <span className="text-xs text-neutral-500 mr-1">BG:</span>
                  {BG_COLORS.slice(0, 4).map((c) => (
                    <button
                      key={c.value}
                      onClick={() => updateBlockStyles(block.id, { paragraphBg: c.value })}
                      className={`w-5 h-5 rounded transition-all border border-neutral-600 ${
                        styles.paragraphBg === c.value ? 'ring-2 ring-white ring-offset-1 ring-offset-neutral-800' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                  <button
                    onClick={() => setShowBgColorPicker(!showBgColorPicker)}
                    className="w-5 h-5 rounded border-2 border-dashed border-neutral-500 flex items-center justify-center"
                  >
                    <Palette className="w-3 h-3 text-neutral-400" />
                  </button>
                  {showBgColorPicker && (
                    <div className="absolute top-full left-0 mt-1 p-2 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-20">
                      <input
                        type="color"
                        value={styles.paragraphBg || '#f3f4f6'}
                        onChange={(e) => updateBlockStyles(block.id, { paragraphBg: e.target.value })}
                        className="w-full h-8 rounded cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-xs text-neutral-500 mr-1">Width:</span>
                  {(['content', 'full'] as const).map((w) => (
                    <button
                      key={w}
                      onClick={() => updateBlockStyles(block.id, { paragraphBgWidth: w })}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        styles.paragraphBgWidth === w || (!styles.paragraphBgWidth && w === 'content')
                          ? 'bg-indigo-600 text-white'
                          : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
                      }`}
                    >
                      {w === 'content' ? 'Content' : 'Full'}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* List spacing */}
        {block.type === 'list' && (
          <div className="flex flex-wrap gap-3 pt-2 border-t border-neutral-700">
            <div className="flex items-center gap-1">
              <span className="text-xs text-neutral-500 mr-1">Spacing:</span>
              {(['tight', 'normal', 'relaxed'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => updateBlockStyles(block.id, { listSpacing: s })}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    styles.listSpacing === s || (!styles.listSpacing && s === 'normal')
                      ? 'bg-indigo-600 text-white'
                      : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Callout controls */}
        {block.type === 'callout' && (
          <div className="flex flex-wrap gap-3 pt-2 border-t border-neutral-700">
            {/* Width */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-neutral-500 mr-1">Width:</span>
              {(['compact', 'medium', 'full'] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => updateBlockStyles(block.id, { calloutWidth: w })}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    styles.calloutWidth === w || (!styles.calloutWidth && w === 'full')
                      ? 'bg-indigo-600 text-white'
                      : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
                  }`}
                >
                  {w.charAt(0).toUpperCase() + w.slice(1)}
                </button>
              ))}
            </div>

            {/* Callout Alignment */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-neutral-500 mr-1">Position:</span>
              {([
                { value: 'left', icon: AlignLeft },
                { value: 'center', icon: AlignCenter },
                { value: 'right', icon: AlignRight }
              ] as const).map(({ value, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => updateBlockStyles(block.id, { calloutAlign: value })}
                  className={`p-1 rounded transition-colors ${
                    styles.calloutAlign === value || (!styles.calloutAlign && value === 'left')
                      ? 'bg-indigo-600 text-white'
                      : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                </button>
              ))}
            </div>

            {/* Background color */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-neutral-500 mr-1">BG:</span>
              {BG_COLORS.slice(0, 4).map((c) => (
                <button
                  key={c.value}
                  onClick={() => updateBlockStyles(block.id, { bgColor: c.value })}
                  className={`w-5 h-5 rounded transition-all border border-neutral-600 ${
                    styles.bgColor === c.value ? 'ring-2 ring-white ring-offset-1 ring-offset-neutral-800' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render individual block
  const renderBlock = (block: ContentBlock, index: number) => {
    const isFirst = index === 0;
    const isLast = index === blocks.length - 1;
    const isSelected = selectedBlockId === block.id;

    return (
      <div
        key={block.id}
        data-block-id={block.id}
        onClick={() => setSelectedBlockId(block.id)}
        className={`relative rounded-lg transition-all ${
          isSelected ? 'ring-2 ring-indigo-500 bg-neutral-800/30' : 'hover:bg-neutral-800/20'
        }`}
      >
        {/* Block Controls - Always visible */}
        <div className="flex items-center justify-between px-2 py-1 border-b border-neutral-800">
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'up'); }}
              disabled={isFirst}
              className="p-1 hover:bg-neutral-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              title="Move up"
            >
              <MoveUp className="w-4 h-4 text-neutral-400" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'down'); }}
              disabled={isLast}
              className="p-1 hover:bg-neutral-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              title="Move down"
            >
              <MoveDown className="w-4 h-4 text-neutral-400" />
            </button>
            <span className="text-xs text-neutral-500 ml-2 capitalize">{block.type}</span>
          </div>
          
          <button
            onClick={(e) => { e.stopPropagation(); handleDeleteClick(block); }}
            className="p-1 hover:bg-red-500/20 rounded"
            title="Delete block"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>

        {/* Block Content */}
        <div className="p-3">
          {block.type === 'heading1' && (
            <textarea
              value={block.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              placeholder="Heading 1"
              rows={1}
              className="w-full text-3xl font-bold bg-transparent border-none outline-none text-neutral-100 placeholder-neutral-600 resize-none overflow-hidden"
              style={{ minHeight: '2.5rem' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
              }}
            />
          )}

          {block.type === 'heading2' && (
            <textarea
              value={block.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              placeholder="Heading 2"
              rows={1}
              className="w-full text-2xl font-semibold bg-transparent border-none outline-none text-neutral-100 placeholder-neutral-600 resize-none overflow-hidden"
              style={{ minHeight: '2rem' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
              }}
            />
          )}

          {block.type === 'paragraph' && (
            <textarea
              value={block.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              placeholder="Write your content here..."
              rows={3}
              className="w-full bg-transparent border-none outline-none resize-none text-neutral-200 placeholder-neutral-600"
            />
          )}

          {block.type === 'list' && (
            <div className="space-y-2">
              {block.items.map((item, idx) => (
                <div key={idx} className="flex items-baseline gap-2">
                  <span className="text-neutral-400 flex-shrink-0">•</span>
                  <textarea
                    value={item}
                    onChange={(e) => {
                      const newItems = [...block.items];
                      newItems[idx] = e.target.value;
                      updateBlock(block.id, { items: newItems });
                    }}
                    placeholder="List item"
                    rows={1}
                    className="flex-1 bg-transparent border-none outline-none text-neutral-200 placeholder-neutral-600 resize-none overflow-hidden leading-normal"
                    style={{ minHeight: '1.5rem' }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = target.scrollHeight + 'px';
                    }}
                  />
                  {block.items.length > 1 && (
                    <button
                      onClick={() => {
                        const newItems = block.items.filter((_, i) => i !== idx);
                        updateBlock(block.id, { items: newItems });
                      }}
                      className="p-1 hover:bg-red-500/20 rounded self-start"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => updateBlock(block.id, { items: [...block.items, ''] })}
                className="text-xs text-neutral-500 hover:text-neutral-300 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add item
              </button>
            </div>
          )}

          {block.type === 'video' && (
            <div className="space-y-2">
              <input
                type="url"
                value={block.url}
                onChange={(e) => updateBlock(block.id, { url: e.target.value })}
                placeholder="Paste YouTube, Vimeo, or Loom URL..."
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm"
              />
              {block.url && getVideoEmbedUrl(block.url) && (
                <div className="aspect-video rounded-lg overflow-hidden bg-neutral-900">
                  <iframe
                    src={getVideoEmbedUrl(block.url)}
                    className="w-full h-full"
                    allowFullScreen
                    title="Video preview"
                  />
                </div>
              )}
              <textarea
                value={block.caption || ''}
                onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                placeholder="Caption (optional)"
                rows={1}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-xs resize-none overflow-hidden"
                style={{ minHeight: '2.25rem' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
              />
            </div>
          )}

          {block.type === 'image' && (
            <div className="space-y-2">
              {!block.url ? (
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(block.id, file);
                    }}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                  <div className="border-2 border-dashed border-neutral-700 rounded-lg p-6 text-center cursor-pointer hover:border-neutral-600 transition-colors">
                    {uploadingImage ? (
                      <div className="text-sm text-neutral-400">Uploading...</div>
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 mx-auto mb-2 text-neutral-500" />
                        <p className="text-sm text-neutral-400">Click to upload image</p>
                        <p className="text-xs text-neutral-600 mt-1">Max 5MB</p>
                      </>
                    )}
                  </div>
                </label>
              ) : (
                <>
                  <img 
                    src={block.url} 
                    alt={block.caption || 'Content image'} 
                    className="w-full rounded-lg"
                  />
                  <textarea
                    value={block.caption || ''}
                    onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                    placeholder="Caption (optional)"
                    rows={1}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-xs resize-none overflow-hidden"
                    style={{ minHeight: '2.25rem' }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = target.scrollHeight + 'px';
                    }}
                  />
                </>
              )}
            </div>
          )}

          {block.type === 'divider' && (
            <div className="my-4">
              <hr className="border-neutral-700" />
            </div>
          )}

          {block.type === 'callout' && (
            <div className="flex gap-3 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
              {/* Emoji Picker */}
              <div className="relative" ref={showEmojiPicker === block.id ? emojiPickerRef : null}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEmojiPicker(showEmojiPicker === block.id ? null : block.id);
                  }}
                  className="text-2xl hover:bg-neutral-700/50 rounded p-1 transition-colors"
                >
                  {block.emoji || '💡'}
                </button>
                
                {showEmojiPicker === block.id && (
                  <div className="absolute top-full left-0 mt-1 p-2 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-20 w-64">
                    <div className="grid grid-cols-8 gap-1 mb-2">
                      {EMOJI_PRESETS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            updateBlock(block.id, { emoji });
                            setShowEmojiPicker(null);
                          }}
                          className="text-xl p-1 hover:bg-neutral-700 rounded transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-neutral-700">
                      <input
                        type="text"
                        placeholder="Custom emoji"
                        maxLength={2}
                        onChange={(e) => {
                          if (e.target.value) {
                            updateBlock(block.id, { emoji: e.target.value });
                          }
                        }}
                        className="flex-1 px-2 py-1 text-sm bg-neutral-900 border border-neutral-600 rounded"
                      />
                      <button
                        onClick={() => {
                          updateBlock(block.id, { emoji: '' });
                          setShowEmojiPicker(null);
                        }}
                        className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/20 rounded flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <textarea
                value={block.content}
                onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                placeholder="Important note or tip..."
                rows={2}
                className="flex-1 bg-transparent border-none outline-none resize-none text-indigo-200 placeholder-indigo-400/50"
              />
            </div>
          )}

          {/* Style Controls - Only show when selected */}
          {isSelected && <StyleControls block={block} />}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with Undo */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Content Blocks
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            Click a block to customize its style
          </p>
        </div>
        
        {history.length > 0 && (
          <button
            onClick={handleUndo}
            className="px-3 py-1.5 text-sm bg-neutral-800 hover:bg-neutral-700 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Undo2 className="w-4 h-4" />
            Undo
          </button>
        )}
      </div>

      {/* Content Blocks */}
      <div className="space-y-3">
        {blocks.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-neutral-800 rounded-lg">
            <FileText className="w-12 h-12 mx-auto mb-3 text-neutral-600" />
            <p className="text-neutral-400 mb-2">No content blocks yet</p>
            <p className="text-xs text-neutral-600">Click the button below to add your first block</p>
          </div>
        ) : (
          blocks.map((block, index) => renderBlock(block, index))
        )}
      </div>

      {/* Add Block Menu */}
      <div className="relative">
        {showBlockMenu ? (
          <div className="border border-neutral-700 rounded-lg bg-neutral-900 p-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => addBlock('heading1')}
                className="flex items-center gap-2 p-3 hover:bg-neutral-800 rounded-lg text-left transition-colors"
              >
                <Heading1 className="w-4 h-4 text-neutral-400" />
                <div>
                  <div className="text-sm font-medium">Heading 1</div>
                  <div className="text-xs text-neutral-500">Large title</div>
                </div>
              </button>
              
              <button
                onClick={() => addBlock('heading2')}
                className="flex items-center gap-2 p-3 hover:bg-neutral-800 rounded-lg text-left transition-colors"
              >
                <Heading2 className="w-4 h-4 text-neutral-400" />
                <div>
                  <div className="text-sm font-medium">Heading 2</div>
                  <div className="text-xs text-neutral-500">Section title</div>
                </div>
              </button>
              
              <button
                onClick={() => addBlock('paragraph')}
                className="flex items-center gap-2 p-3 hover:bg-neutral-800 rounded-lg text-left transition-colors"
              >
                <Type className="w-4 h-4 text-neutral-400" />
                <div>
                  <div className="text-sm font-medium">Paragraph</div>
                  <div className="text-xs text-neutral-500">Body text</div>
                </div>
              </button>
              
              <button
                onClick={() => addBlock('list')}
                className="flex items-center gap-2 p-3 hover:bg-neutral-800 rounded-lg text-left transition-colors"
              >
                <List className="w-4 h-4 text-neutral-400" />
                <div>
                  <div className="text-sm font-medium">List</div>
                  <div className="text-xs text-neutral-500">Bullet points</div>
                </div>
              </button>
              
              <button
                onClick={() => addBlock('video')}
                className="flex items-center gap-2 p-3 hover:bg-neutral-800 rounded-lg text-left transition-colors"
              >
                <Video className="w-4 h-4 text-neutral-400" />
                <div>
                  <div className="text-sm font-medium">Video</div>
                  <div className="text-xs text-neutral-500">YouTube, Vimeo, Loom</div>
                </div>
              </button>
              
              <button
                onClick={() => addBlock('image')}
                className="flex items-center gap-2 p-3 hover:bg-neutral-800 rounded-lg text-left transition-colors"
              >
                <ImageIcon className="w-4 h-4 text-neutral-400" />
                <div>
                  <div className="text-sm font-medium">Image</div>
                  <div className="text-xs text-neutral-500">Upload image</div>
                </div>
              </button>
              
              <button
                onClick={() => addBlock('callout')}
                className="flex items-center gap-2 p-3 hover:bg-neutral-800 rounded-lg text-left transition-colors"
              >
                <AlertCircle className="w-4 h-4 text-neutral-400" />
                <div>
                  <div className="text-sm font-medium">Callout</div>
                  <div className="text-xs text-neutral-500">Important note</div>
                </div>
              </button>
              
              <button
                onClick={() => addBlock('divider')}
                className="flex items-center gap-2 p-3 hover:bg-neutral-800 rounded-lg text-left transition-colors"
              >
                <div className="w-4 h-px bg-neutral-600" />
                <div>
                  <div className="text-sm font-medium">Divider</div>
                  <div className="text-xs text-neutral-500">Visual separator</div>
                </div>
              </button>
            </div>
            
            <button
              onClick={() => setShowBlockMenu(false)}
              className="w-full mt-2 px-3 py-2 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowBlockMenu(true)}
            className="w-full px-4 py-3 border-2 border-dashed border-neutral-700 hover:border-neutral-600 rounded-lg text-neutral-400 hover:text-neutral-200 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Content Block
          </button>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirmBlock}
        title="Delete Block"
        message="This block has content. Are you sure you want to delete it? This can be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => deleteConfirmBlock && confirmDelete(deleteConfirmBlock.id)}
        onCancel={() => setDeleteConfirmBlock(null)}
      />
    </div>
  );
}