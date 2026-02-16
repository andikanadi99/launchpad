import { useState, useRef, useEffect } from 'react';
import { DeliveryData } from './DeliveryBuilder';
import { auth, db, storage } from '../../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { 
  Upload, X, Loader, File, Video, Link, Check,
  Trash2, Plus, Palette, Image, Eye, EyeOff, Download,
  ExternalLink, Package, Maximize2, Monitor, Smartphone,
  ArrowLeft, ChevronRight, Pencil, ChevronUp, ChevronDown
} from 'lucide-react';
import ConfirmModal from '../../ConfirmModal';

interface DeliveryStepQuickPageProps {
  data: DeliveryData;
  updateHosted: (updates: Partial<DeliveryData['hosted']>) => void;
  updateDesign: (updates: Partial<DeliveryData['design']>) => void;
  productName: string;
  productId: string;
  onBack: () => void;
  onNext: () => void;
}

export default function DeliveryStepQuickPage({
  data, updateHosted, updateDesign, productName, productId, onBack, onNext
}: DeliveryStepQuickPageProps) {

  // File upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Video add state
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');

  // Embed URL state  
  const [embedUrl, setEmbedUrl] = useState(data.hosted.notionUrl || '');

  // Logo upload state
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Full-screen preview
  const [showFullPreview, setShowFullPreview] = useState(false);

  // Preview panel visibility
  const [showPreview, setShowPreview] = useState(true);

  // Preview device mode
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Delete confirmation modal
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'file' | 'video';
    id: string;
    url: string;
    name: string;
  }>({ isOpen: false, type: 'file', id: '', url: '', name: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  // Theme change confirmation
  const [pendingTheme, setPendingTheme] = useState<'light' | 'dark' | null>(null);

  // Inline editing state
  const [editingItem, setEditingItem] = useState<{ type: 'file' | 'video'; id: string } | null>(null);
  const [editingName, setEditingName] = useState('');

  // Sync embed URL state
  useEffect(() => {
    setEmbedUrl(data.hosted.notionUrl || '');
  }, [data.hosted.notionUrl]);

  // ==========================================
  // FILE UPLOAD
  // ==========================================
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > 50 * 1024 * 1024) {
      alert('File must be under 50MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('Not authenticated');

      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `users/${userId}/delivery/${productId}/${fileName}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error('Upload error:', error);
          alert('Upload failed. Please try again.');
          setIsUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const newFile = {
            id: `file_${timestamp}`,
            url: downloadURL,
            name: file.name,
            size: file.size,
            type: file.type,
            uploadedAt: new Date(),
          };
          updateHosted({ files: [...data.hosted.files, newFile] });
          setIsUploading(false);
          setUploadProgress(0);
        }
      );
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
      setIsUploading(false);
    }
  };

  // ==========================================
  // DELETE HANDLERS
  // ==========================================
  const handleDeleteRequest = (type: 'file' | 'video', id: string, url: string, name: string) => {
    setDeleteModal({ isOpen: true, type, id, url, name });
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (deleteModal.type === 'file') {
        try {
          const storageRef = ref(storage, deleteModal.url);
          await deleteObject(storageRef);
        } catch (error) {
          console.error('Storage delete error (may be already deleted):', error);
        }
        updateHosted({
          files: data.hosted.files.filter(f => f.id !== deleteModal.id)
        });
      } else {
        updateHosted({
          videos: data.hosted.videos.filter(v => v.id !== deleteModal.id)
        });
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
      setDeleteModal({ isOpen: false, type: 'file', id: '', url: '', name: '' });
    }
  };

  // ==========================================
  // VIDEO HANDLERS
  // ==========================================
  const detectVideoPlatform = (url: string): 'youtube' | 'vimeo' | 'loom' | 'other' => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('vimeo.com')) return 'vimeo';
    if (url.includes('loom.com')) return 'loom';
    return 'other';
  };

  const handleAddVideo = () => {
    if (!videoUrl.trim()) return;
    
    const newVideo = {
      id: `video_${Date.now()}`,
      url: videoUrl.trim(),
      title: videoTitle.trim() || `Video ${data.hosted.videos.length + 1}`,
      platform: detectVideoPlatform(videoUrl)
    };

    updateHosted({ videos: [...data.hosted.videos, newVideo] });
    setVideoUrl('');
    setVideoTitle('');
  };

  // ==========================================
  // INLINE RENAME HANDLERS
  // ==========================================
  const startEditing = (type: 'file' | 'video', id: string, currentName: string) => {
    setEditingItem({ type, id });
    setEditingName(currentName);
  };

  const saveEditing = () => {
    if (!editingItem || !editingName.trim()) {
      setEditingItem(null);
      return;
    }

    if (editingItem.type === 'file') {
      updateHosted({
        files: data.hosted.files.map(f =>
          f.id === editingItem.id ? { ...f, name: editingName.trim() } : f
        )
      });
    } else {
      updateHosted({
        videos: data.hosted.videos.map(v =>
          v.id === editingItem.id ? { ...v, title: editingName.trim() } : v
        )
      });
    }

    setEditingItem(null);
    setEditingName('');
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setEditingName('');
  };

  // ==========================================
  // EMBED URL HANDLER
  // ==========================================
  const handleEmbedSave = () => {
    updateHosted({ notionUrl: embedUrl.trim() });
  };

  // ==========================================
  // LOGO UPLOAD
  // ==========================================
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, SVG)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo must be under 2MB');
      return;
    }

    setUploadingLogo(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('Not authenticated');

      const timestamp = Date.now();
      const fileName = `logo_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `users/${userId}/delivery-assets/${productId}/${fileName}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        () => {},
        (error) => {
          console.error('Logo upload error:', error);
          alert('Failed to upload logo');
          setUploadingLogo(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          updateDesign({ logoUrl: downloadURL });
          setUploadingLogo(false);
        }
      );
    } catch (error) {
      console.error('Logo upload error:', error);
      alert('Failed to upload logo');
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (data.design.logoUrl) {
      try {
        const storageRef = ref(storage, data.design.logoUrl);
        await deleteObject(storageRef);
      } catch (error) {
        console.error('Error deleting logo from storage:', error);
      }
      updateDesign({ logoUrl: '' });
    }
  };

  // ==========================================
  // HELPERS
  // ==========================================
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getVideoEmbedUrl = (url: string, platform: string): string | null => {
    try {
      if (platform === 'youtube') {
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
        if (match) return `https://www.youtube.com/embed/${match[1]}`;
      }
      if (platform === 'vimeo') {
        const match = url.match(/vimeo\.com\/(\d+)/);
        if (match) return `https://player.vimeo.com/video/${match[1]}`;
      }
      if (platform === 'loom') {
        const match = url.match(/loom\.com\/share\/([\w]+)/);
        if (match) return `https://www.loom.com/embed/${match[1]}`;
      }
    } catch { /* fallback */ }
    return null;
  };

  const isDarkBackground = (color: string): boolean => {
    const hex = color.replace('#', '');
    if (hex.length !== 6) return false;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
  };

  const resolveDesignText = (text: string) => {
    return text.replace(/\{\{product_name\}\}/g, productName || 'Your Product');
  };

  // Design variables
  const accent = data.design.accentColor;
  const bgColor = data.design.backgroundColor;
  const dark = isDarkBackground(bgColor);
  const textColor = dark ? '#f5f5f5' : '#111827';
  const subtextColor = dark ? '#a3a3a3' : '#6b7280';
  const borderColor = dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb';
  const cardBg = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)';

  // Extended design options (with fallback defaults)
  const designExt = data.design as any;
  const fontFamily: string = designExt.fontFamily || 'system-ui, sans-serif';

  // Per-element text styles
  const headingSize: string = designExt.headingSize || '28px';
  const headingColor: string = designExt.headingColor || textColor;
  const headingAlign: string = designExt.headingAlign || 'center';

  const stextSize: string = designExt.stextSize || '16px';
  const stextColor: string = designExt.stextColor || subtextColor;
  const stextAlign: string = designExt.stextAlign || 'center';

  const filesTitleSize: string = designExt.filesTitleSize || '22px';
  const filesTitleColor: string = designExt.filesTitleColor || textColor;
  const filesTitleAlign: string = designExt.filesTitleAlign || 'left';

  const videosTitleSize: string = designExt.videosTitleSize || '22px';
  const videosTitleColor: string = designExt.videosTitleColor || textColor;
  const videosTitleAlign: string = designExt.videosTitleAlign || 'left';

  const resourcesTitleSize: string = designExt.resourcesTitleSize || '22px';
  const resourcesTitleColor: string = designExt.resourcesTitleColor || textColor;
  const resourcesTitleAlign: string = designExt.resourcesTitleAlign || 'left';

  const bodySize: string = designExt.bodySize || '14px';
  const bodyColor: string = designExt.bodyColor || textColor;
  const bodyAlign: string = designExt.bodyAlign || 'left';

  const filesSectionTitle: string = designExt.filesSectionTitle || 'Files';
  const videosSectionTitle: string = designExt.videosSectionTitle || 'Videos';
  const resourcesSectionTitle: string = designExt.resourcesSectionTitle || 'Resources';

  // Logo style options
  const logoSize: string = designExt.logoSize || 'md';
  const logoShape: string = designExt.logoShape || 'rounded';
  const logoBorder: string = designExt.logoBorder || 'none';

  // Content section order
  const contentOrder: string[] = designExt.contentOrder || ['header', 'files', 'videos', 'resources'];

  const updateDesignExt = (updates: Record<string, any>) => {
    updateDesign(updates as any);
  };

  // Full theme presets
  const applyThemePreset = (theme: 'light' | 'dark') => {
    if (theme === 'light') {
      updateDesign({
        backgroundColor: '#ffffff',
        accentColor: '#4f46e5',
      });
      updateDesignExt({
        headingColor: '#111827',
        stextColor: '#6b7280',
        bodyColor: '#111827',
        filesTitleColor: '#111827',
        videosTitleColor: '#111827',
        resourcesTitleColor: '#111827',
      });
    } else {
      updateDesign({
        backgroundColor: '#1a1a2e',
        accentColor: '#6366f1',
      });
      updateDesignExt({
        headingColor: '#f5f5f5',
        stextColor: '#a3a3a3',
        bodyColor: '#f5f5f5',
        filesTitleColor: '#f5f5f5',
        videosTitleColor: '#f5f5f5',
        resourcesTitleColor: '#f5f5f5',
      });
    }
    setPendingTheme(null);
  };

  // Section-level reorder
  const moveSection = (section: string, direction: 'up' | 'down') => {
    const order = [...contentOrder];
    const idx = order.indexOf(section);
    if (direction === 'up' && idx > 0) {
      [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]];
    } else if (direction === 'down' && idx < order.length - 1) {
      [order[idx + 1], order[idx]] = [order[idx], order[idx + 1]];
    }
    updateDesignExt({ contentOrder: order });
  };

  // Count active content sections
  const activeSections = [
    'header',
    data.hosted.files.length > 0 ? 'files' : null,
    data.hosted.videos.length > 0 ? 'videos' : null,
    data.hosted.notionUrl.trim().length > 0 ? 'resources' : null,
  ].filter(Boolean);
  const showReorder = activeSections.length >= 2;

  // Per-video style update
  const updateVideoStyle = (videoId: string, updates: Record<string, string>) => {
    updateHosted({
      videos: data.hosted.videos.map(v =>
        v.id === videoId ? { ...v, ...updates } : v
      )
    });
  };

  // Video style inline bar (per-video)
  const VideoStyleBar = ({ video }: { video: any }) => {
    const vSize = video.titleSize || bodySize;
    const vColor = video.titleColor || bodyColor;
    const vAlign = video.titleAlign || 'left';
    return (
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <div className="flex items-center gap-0.5">
          {[{ value: '12px', label: 'S' }, { value: '14px', label: 'M' }, { value: '16px', label: 'L' }].map(s => (
            <button
              key={s.value}
              onClick={() => updateVideoStyle(video.id, { titleSize: s.value })}
              className={`w-5 h-5 rounded text-[8px] font-medium transition-all ${
                vSize === s.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-neutral-800 text-neutral-500 hover:text-neutral-300 border border-neutral-700'
              }`}
            >
              {s.label}
            </button>
          ))}
          <input
            type="number" min="10" max="32"
            value={parseInt(vSize)}
            onChange={(e) => e.target.value && updateVideoStyle(video.id, { titleSize: `${e.target.value}px` })}
            className="w-9 h-5 px-1 bg-neutral-800 border border-neutral-700 rounded text-[8px] text-white text-center focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div className="w-px h-3 bg-neutral-700" />
        <input
          type="color" value={vColor}
          onChange={(e) => updateVideoStyle(video.id, { titleColor: e.target.value })}
          className="w-5 h-5 rounded cursor-pointer border border-neutral-600 bg-transparent"
        />
        <div className="w-px h-3 bg-neutral-700" />
        <div className="flex items-center gap-0.5">
          {(['left', 'center', 'right'] as const).map(a => (
            <button
              key={a}
              onClick={() => updateVideoStyle(video.id, { titleAlign: a })}
              className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
                vAlign === a
                  ? 'bg-indigo-600 text-white'
                  : 'bg-neutral-800 text-neutral-500 hover:text-neutral-300 border border-neutral-700'
              }`}
            >
              {a === 'left' && <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="currentColor"><rect x="0" y="1" width="12" height="1.5" rx="0.5"/><rect x="0" y="5" width="8" height="1.5" rx="0.5"/><rect x="0" y="9" width="10" height="1.5" rx="0.5"/></svg>}
              {a === 'center' && <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="currentColor"><rect x="0" y="1" width="12" height="1.5" rx="0.5"/><rect x="2" y="5" width="8" height="1.5" rx="0.5"/><rect x="1" y="9" width="10" height="1.5" rx="0.5"/></svg>}
              {a === 'right' && <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="currentColor"><rect x="0" y="1" width="12" height="1.5" rx="0.5"/><rect x="4" y="5" width="8" height="1.5" rx="0.5"/><rect x="2" y="9" width="10" height="1.5" rx="0.5"/></svg>}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Reusable text style control bar
  const TextStyleBar = ({ 
    prefix, size, color, align, sizes 
  }: { 
    prefix: string; 
    size: string; 
    color: string; 
    align: string;
    sizes: { value: string; label: string }[];
  }) => (
    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
      {/* Size presets */}
      <div className="flex items-center gap-0.5">
        {sizes.map(s => (
          <button
            key={s.value}
            onClick={() => updateDesignExt({ [`${prefix}Size`]: s.value })}
            className={`w-6 h-6 rounded text-[9px] font-medium transition-all ${
              size === s.value
                ? 'bg-indigo-600 text-white'
                : 'bg-neutral-800 text-neutral-500 hover:text-neutral-300 border border-neutral-700'
            }`}
          >
            {s.label}
          </button>
        ))}
        <input
          type="number"
          min="10"
          max="60"
          value={parseInt(size)}
          onChange={(e) => e.target.value && updateDesignExt({ [`${prefix}Size`]: `${e.target.value}px` })}
          className="w-10 h-6 px-1 bg-neutral-800 border border-neutral-700 rounded text-[9px] text-white text-center focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-neutral-700" />

      {/* Color - common swatches + picker */}
      <div className="flex items-center gap-0.5">
        {['#ffffff', '#000000', '#6b7280', '#111827', '#f5f5f5'].map(c => (
          <button
            key={c}
            onClick={() => updateDesignExt({ [`${prefix}Color`]: c })}
            className={`w-5 h-5 rounded border transition-all ${
              color === c ? 'border-indigo-500 scale-110' : 'border-neutral-600 hover:border-neutral-500'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
        <input
          type="color"
          value={color}
          onChange={(e) => updateDesignExt({ [`${prefix}Color`]: e.target.value })}
          className="w-5 h-5 rounded cursor-pointer border border-dashed border-neutral-600 bg-transparent ml-0.5"
          title="Custom color"
        />
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-neutral-700" />

      {/* Alignment */}
      <div className="flex items-center gap-0.5">
        {(['left', 'center', 'right'] as const).map(a => (
          <button
            key={a}
            onClick={() => updateDesignExt({ [`${prefix}Align`]: a })}
            className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
              align === a
                ? 'bg-indigo-600 text-white'
                : 'bg-neutral-800 text-neutral-500 hover:text-neutral-300 border border-neutral-700'
            }`}
            title={a.charAt(0).toUpperCase() + a.slice(1)}
          >
            {a === 'left' && (
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                <rect x="0" y="1" width="12" height="1.5" rx="0.5"/>
                <rect x="0" y="5" width="8" height="1.5" rx="0.5"/>
                <rect x="0" y="9" width="10" height="1.5" rx="0.5"/>
              </svg>
            )}
            {a === 'center' && (
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                <rect x="0" y="1" width="12" height="1.5" rx="0.5"/>
                <rect x="2" y="5" width="8" height="1.5" rx="0.5"/>
                <rect x="1" y="9" width="10" height="1.5" rx="0.5"/>
              </svg>
            )}
            {a === 'right' && (
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                <rect x="0" y="1" width="12" height="1.5" rx="0.5"/>
                <rect x="4" y="5" width="8" height="1.5" rx="0.5"/>
                <rect x="2" y="9" width="10" height="1.5" rx="0.5"/>
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  // Logo preview styles
  const logoSizeMap: Record<string, string> = { sm: 'h-8', md: 'h-14', lg: 'h-20' };
  const logoSizeMapCompact: Record<string, string> = { sm: 'h-6', md: 'h-10', lg: 'h-14' };
  const logoShapeClass = (full: boolean) => {
    const base = logoShape === 'circle' ? 'rounded-full' : logoShape === 'rounded' ? (full ? 'rounded-xl' : 'rounded-lg') : 'rounded-none';
    const border = logoBorder === 'subtle' ? `border ${dark ? 'border-white/10' : 'border-black/10'}` : logoBorder === 'shadow' ? 'shadow-lg' : '';
    return `${base} ${border}`;
  };

  const hasContent = data.hosted.files.length > 0 || data.hosted.videos.length > 0 || data.hosted.notionUrl.trim().length > 0;

  // ==========================================
  // LIVE PREVIEW COMPONENT
  // ==========================================
  const LivePreview = ({ fullSize = false }: { fullSize?: boolean }) => (
    <div 
      className={`rounded-xl overflow-hidden border border-neutral-700 ${
        !fullSize && previewDevice === 'mobile' ? 'max-w-[375px] mx-auto' : ''
      }`}
      style={{ backgroundColor: bgColor, fontFamily }}
    >
      <div className={fullSize ? 'px-4 sm:px-8 py-10 max-w-3xl mx-auto' : 'px-5 py-6'}>
        <div className={fullSize ? 'space-y-8' : 'space-y-4'}>
          {contentOrder.map(section => {
            if (section === 'header') return (
              <div key="header">
                <div className={fullSize ? 'mb-2' : 'mb-2'}>
                  {data.design.logoUrl && (
                    <img 
                      src={data.design.logoUrl} 
                      alt="Logo" 
                      className={`object-contain mx-auto overflow-hidden ${
                        fullSize ? `${logoSizeMap[logoSize]} mb-6` : `${logoSizeMapCompact[logoSize]} mb-4`
                      } ${logoShapeClass(fullSize)}`}
                    />
                  )}
                  <div 
                    className={`rounded-full flex items-center justify-center mx-auto ${
                      fullSize ? 'w-16 h-16 mb-4' : 'w-10 h-10 mb-3'
                    }`}
                    style={{ backgroundColor: accent + '20' }}
                  >
                    <Check className={fullSize ? 'w-8 h-8' : 'w-5 h-5'} style={{ color: accent }} />
                  </div>
                  <h3 
                    className="font-bold" 
                    style={{ 
                      color: headingColor,
                      fontSize: fullSize ? headingSize : `${Math.round(parseInt(headingSize) * 0.65)}px`,
                      marginBottom: fullSize ? '8px' : '4px',
                      lineHeight: 1.2,
                      textAlign: headingAlign as any
                    }}
                  >
                    {data.design.headingText || 'Thank you for your purchase!'}
                  </h3>
                  <p 
                    style={{ 
                      color: stextColor,
                      fontSize: fullSize ? stextSize : `${Math.round(parseInt(stextSize) * 0.65)}px`,
                      textAlign: stextAlign as any
                    }}
                  >
                    {resolveDesignText(data.design.subText || "Here's your access to {{product_name}}")}
                  </p>
                </div>
                <div className={fullSize ? 'mt-6' : 'mt-3'} style={{ borderBottom: `1px solid ${borderColor}` }} />
              </div>
            );

            if (section === 'files' && data.hosted.files.length > 0) return (
              <div key="files">
                <p className="font-semibold" style={{ 
                  color: filesTitleColor,
                  fontSize: fullSize ? filesTitleSize : `${Math.round(parseInt(filesTitleSize) * 0.65)}px`,
                  marginBottom: fullSize ? '16px' : '8px',
                  textAlign: filesTitleAlign as any
                }}>
                  {filesSectionTitle}
                </p>
                <div className={fullSize ? 'space-y-3' : 'space-y-1.5'}>
                  {data.hosted.files.map(file => (
                    <div 
                      key={file.id} 
                      className={`flex items-center gap-${fullSize ? '4' : '2'} rounded-${fullSize ? 'xl' : 'lg'} p-${fullSize ? '4' : '2'}`}
                      style={{ border: `1px solid ${borderColor}`, backgroundColor: cardBg }}
                    >
                      <div 
                        className={`rounded-${fullSize ? 'xl' : 'lg'} flex items-center justify-center flex-shrink-0 ${
                          fullSize ? 'w-12 h-12' : 'w-7 h-7'
                        }`} 
                        style={{ backgroundColor: accent + '15' }}
                      >
                        <File className={fullSize ? 'w-6 h-6' : 'w-3.5 h-3.5'} style={{ color: accent }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" style={{ 
                          color: bodyColor,
                          fontSize: fullSize ? bodySize : `${Math.round(parseInt(bodySize) * 0.65)}px`
                        }}>
                          {file.name}
                        </p>
                        <p style={{ 
                          color: subtextColor,
                          fontSize: fullSize ? `${Math.max(parseInt(bodySize) - 2, 10)}px` : `${Math.round((parseInt(bodySize) - 2) * 0.65)}px`
                        }}>
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <span 
                        className={`text-white font-medium flex items-center gap-2 flex-shrink-0 ${
                          fullSize 
                            ? 'px-5 py-2.5 rounded-lg text-sm' 
                            : 'px-2.5 py-1 rounded text-[10px]'
                        }`} 
                        style={{ backgroundColor: accent }}
                      >
                        {fullSize && <Download className="w-4 h-4" />}
                        Download
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              );
              if (section === 'videos' && data.hosted.videos.length > 0) return (
              <div key="videos">
                <p className="font-semibold" style={{ 
                  color: videosTitleColor,
                  fontSize: fullSize ? videosTitleSize : `${Math.round(parseInt(videosTitleSize) * 0.65)}px`,
                  marginBottom: fullSize ? '16px' : '8px',
                  textAlign: videosTitleAlign as any
                }}>
                  {videosSectionTitle}
                </p>
                <div className={fullSize ? 'space-y-5' : 'space-y-2'}>
                  {data.hosted.videos.map(video => {
                    const embedVidUrl = getVideoEmbedUrl(video.url, video.platform);
                    const vTitleSize = video.titleSize || bodySize;
                    const vTitleColor = video.titleColor || bodyColor;
                    const vTitleAlign = video.titleAlign || 'left';
                    return (
                      <div key={video.id}>
                        <p 
                          className="font-medium"
                          style={{ 
                            color: vTitleColor,
                            fontSize: fullSize ? vTitleSize : `${Math.round(parseInt(vTitleSize) * 0.65)}px`,
                            marginBottom: fullSize ? '8px' : '4px',
                            textAlign: vTitleAlign as any
                          }}
                        >
                          {video.title}
                        </p>
                        {embedVidUrl ? (
                          <div 
                            className={`overflow-hidden ${fullSize ? 'rounded-xl' : 'rounded-lg'}`}
                            style={{ border: `1px solid ${borderColor}` }}
                          >
                            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                              <iframe
                                src={embedVidUrl}
                                className="absolute inset-0 w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title={video.title}
                              />
                            </div>
                          </div>
                        ) : (
                          <div 
                            className={`rounded-${fullSize ? 'xl' : 'lg'} p-${fullSize ? '4' : '2'} flex items-center gap-${fullSize ? '3' : '2'}`}
                            style={{ border: `1px solid ${borderColor}`, backgroundColor: cardBg }}
                          >
                            <Video className={fullSize ? 'w-5 h-5' : 'w-3.5 h-3.5'} style={{ color: accent }} />
                            <span className={`underline truncate ${fullSize ? 'text-sm' : 'text-[10px]'}`} style={{ color: accent }}>
                              {video.url}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              );
              if (section === 'resources' && data.hosted.notionUrl) return (
              <div key="resources">
                <p className="font-semibold" style={{ 
                  color: resourcesTitleColor,
                  fontSize: fullSize ? resourcesTitleSize : `${Math.round(parseInt(resourcesTitleSize) * 0.65)}px`,
                  marginBottom: fullSize ? '16px' : '8px',
                  textAlign: resourcesTitleAlign as any
                }}>
                  {resourcesSectionTitle}
                </p>
                <div 
                  className={`rounded-${fullSize ? 'xl' : 'lg'} p-${fullSize ? '4' : '2'} flex items-center gap-${fullSize ? '4' : '2'}`}
                  style={{ border: `1px solid ${borderColor}`, backgroundColor: cardBg }}
                >
                  <div 
                    className={`rounded-${fullSize ? 'xl' : 'lg'} flex items-center justify-center flex-shrink-0 ${
                      fullSize ? 'w-12 h-12' : 'w-7 h-7'
                    }`} 
                    style={{ backgroundColor: accent + '15' }}
                  >
                    <Link className={fullSize ? 'w-6 h-6' : 'w-3.5 h-3.5'} style={{ color: accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium" style={{ 
                      color: bodyColor,
                      fontSize: fullSize ? bodySize : `${Math.round(parseInt(bodySize) * 0.65)}px`
                    }}>
                      External Resource
                    </p>
                    <p className={`truncate ${fullSize ? 'text-sm' : 'text-[10px]'}`} style={{ color: subtextColor }}>
                      {data.hosted.notionUrl}
                    </p>
                  </div>
                  <span 
                    className={`text-white font-medium flex items-center gap-2 flex-shrink-0 ${
                      fullSize 
                        ? 'px-5 py-2.5 rounded-lg text-sm' 
                        : 'px-2.5 py-1 rounded text-[10px]'
                    }`} 
                    style={{ backgroundColor: accent }}
                  >
                    {fullSize && <ExternalLink className="w-4 h-4" />}
                    Open
                  </span>
                </div>
              </div>
              );
              return null;
            })}

            {!hasContent && (
              <div className="py-8 text-center">
                <Package className="w-8 h-8 mx-auto mb-2" style={{ color: subtextColor }} />
                <p className="text-xs" style={{ color: subtextColor }}>
                  Add content to see your page preview
                </p>
              </div>
            )}
          </div>

        {/* Footer */}
        <div 
          className={`text-center ${fullSize ? 'mt-12 pt-6' : 'mt-6 pt-3'}`} 
          style={{ borderTop: `1px solid ${borderColor}` }}
        >
          <p className={fullSize ? 'text-xs' : 'text-[10px]'} style={{ color: subtextColor }}>
            Powered by LaunchPad
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ==========================================
          FULL-SCREEN EDITOR
          ========================================== */}
      <div className="fixed inset-0 z-40 flex flex-col bg-neutral-950">
        
        {/* ========== TOP BAR ========== */}
        <div className="bg-neutral-900 border-b border-neutral-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
          {/* Left: Title */}
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-white">Quick Page Setup</h1>
                {hasContent && (
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-medium rounded">
                    Content Added
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500">{productName || 'Your Product'}</p>
            </div>
          </div>

          {/* Right: Preview Controls */}
          <div className="flex items-center gap-2">
            {/* Full Preview */}
            <button
              onClick={() => setShowFullPreview(true)}
              disabled={!hasContent}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-neutral-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
            >
              <Maximize2 className="w-4 h-4" />
              Full Preview
            </button>

            {/* Show/Hide Preview */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-sm text-neutral-300 transition-colors"
            >
              {showPreview ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Hide Preview
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Show Preview
                </>
              )}
            </button>

            {/* Device Toggle */}
            {showPreview && (
              <div className="hidden lg:flex items-center bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-2 transition-colors ${
                    previewDevice === 'desktop' 
                      ? 'bg-neutral-700 text-white' 
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-2 transition-colors ${
                    previewDevice === 'mobile' 
                      ? 'bg-neutral-700 text-white' 
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ========== MAIN CONTENT: SPLIT PANE ========== */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT PANEL: INPUTS */}
          <div className={`${showPreview ? 'w-1/2 lg:w-[55%]' : 'flex-1 max-w-3xl mx-auto'} overflow-y-auto border-r border-neutral-800`}>
            <div className="p-6 space-y-6">


              {/* DESIGN SECTION */}
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Palette className="w-4 h-4 text-purple-400" />
                  </div>
                  <h3 className="font-semibold">Page Design</h3>
                </div>

                <div className="space-y-5">
                  {/* Heading */}
                  <div>
                    <label className="text-xs font-medium text-neutral-300 mb-1.5 block">Heading</label>
                    <input
                      type="text"
                      value={data.design.headingText}
                      onChange={(e) => updateDesign({ headingText: e.target.value })}
                      maxLength={80}
                      placeholder="Thank you for your purchase!"
                      className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none text-white text-sm"
                    />
                    <TextStyleBar
                      prefix="heading"
                      size={headingSize}
                      color={headingColor}
                      align={headingAlign}
                      sizes={[{ value: '22px', label: 'S' }, { value: '28px', label: 'M' }, { value: '36px', label: 'L' }]}
                    />
                  </div>

                  {/* Subtext */}
                  <div>
                    <label className="text-xs font-medium text-neutral-300 mb-1.5 block">
                      Subtext
                      <span className="text-[10px] text-neutral-500 ml-1">{'{{product_name}}'} = product name</span>
                    </label>
                    <input
                      type="text"
                      value={data.design.subText}
                      onChange={(e) => updateDesign({ subText: e.target.value })}
                      maxLength={120}
                      placeholder="Here's your access to {{product_name}}"
                      className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none text-white text-sm"
                    />
                    <TextStyleBar
                      prefix="stext"
                      size={stextSize}
                      color={stextColor}
                      align={stextAlign}
                      sizes={[{ value: '13px', label: 'S' }, { value: '16px', label: 'M' }, { value: '20px', label: 'L' }]}
                    />
                  </div>

                  {/* Divider */}
                  <div className="border-t border-neutral-800" />

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">Logo</label>
                    {data.design.logoUrl ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-16 h-16 bg-neutral-800 border border-neutral-700 flex items-center justify-center overflow-hidden ${logoShapeClass(false)}`}>
                            <img src={data.design.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                          </div>
                          <button
                            onClick={handleRemoveLogo}
                            className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 rounded-lg transition-colors"
                          >
                            Remove
                          </button>
                        </div>

                        {/* Logo Size */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-neutral-500 w-10">Size</span>
                          <div className="flex gap-1">
                            {[
                              { value: 'sm', label: 'S' },
                              { value: 'md', label: 'M' },
                              { value: 'lg', label: 'L' },
                            ].map(s => (
                              <button
                                key={s.value}
                                onClick={() => updateDesignExt({ logoSize: s.value })}
                                className={`w-7 h-6 rounded text-[10px] font-medium transition-all ${
                                  logoSize === s.value
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-neutral-800 text-neutral-500 hover:text-neutral-300 border border-neutral-700'
                                }`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Logo Shape */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-neutral-500 w-10">Shape</span>
                          <div className="flex gap-1">
                            {[
                              { value: 'square', label: 'Square' },
                              { value: 'rounded', label: 'Round' },
                              { value: 'circle', label: 'Circle' },
                            ].map(s => (
                              <button
                                key={s.value}
                                onClick={() => updateDesignExt({ logoShape: s.value })}
                                className={`px-2 h-6 rounded text-[10px] font-medium transition-all ${
                                  logoShape === s.value
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-neutral-800 text-neutral-500 hover:text-neutral-300 border border-neutral-700'
                                }`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Logo Border */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-neutral-500 w-10">Border</span>
                          <div className="flex gap-1">
                            {[
                              { value: 'none', label: 'None' },
                              { value: 'subtle', label: 'Subtle' },
                              { value: 'shadow', label: 'Shadow' },
                            ].map(s => (
                              <button
                                key={s.value}
                                onClick={() => updateDesignExt({ logoBorder: s.value })}
                                className={`px-2 h-6 rounded text-[10px] font-medium transition-all ${
                                  logoBorder === s.value
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-neutral-800 text-neutral-500 hover:text-neutral-300 border border-neutral-700'
                                }`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 px-3 py-3 bg-neutral-800 border border-neutral-700 hover:border-neutral-600 rounded-lg cursor-pointer transition-colors">
                        {uploadingLogo ? (
                          <Loader className="w-4 h-4 animate-spin text-neutral-400" />
                        ) : (
                          <Image className="w-4 h-4 text-neutral-400" />
                        )}
                        <span className="text-sm text-neutral-400">
                          {uploadingLogo ? 'Uploading...' : 'Upload logo (PNG, JPG, SVG)'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* Theme Toggle */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-2">Theme Preset</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPendingTheme('light')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                          !dark
                            ? 'bg-white text-neutral-900 border-2 border-indigo-500'
                            : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:border-neutral-600'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-white border border-neutral-300" />
                        Light
                      </button>
                      <button
                        onClick={() => setPendingTheme('dark')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                          dark
                            ? 'bg-neutral-800 text-white border-2 border-indigo-500'
                            : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:border-neutral-600'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-neutral-900 border border-neutral-600" />
                        Dark
                      </button>
                    </div>

                    {/* Theme confirmation inline */}
                    {pendingTheme && (
                      <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <p className="text-xs text-amber-400 mb-2">
                          Switching to <span className="font-semibold">{pendingTheme}</span> theme will reset all color settings (text, headings, background, accent). Continue?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => applyThemePreset(pendingTheme)}
                            className="px-3 py-1.5 text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg transition-colors"
                          >
                            Apply {pendingTheme} theme
                          </button>
                          <button
                            onClick={() => setPendingTheme(null)}
                            className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Background Color */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-2">Background Color</label>
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-1">
                        {['#ffffff', '#f8f9fa', '#f3f0ff', '#fef3c7', '#ecfdf5', '#1a1a2e', '#0f172a', '#18181b'].map(color => (
                          <button
                            key={color}
                            onClick={() => updateDesign({ backgroundColor: color })}
                            className={`w-7 h-7 rounded border-2 transition-all ${
                              data.design.backgroundColor === color 
                                ? 'border-indigo-500 scale-110' 
                                : 'border-neutral-600 hover:border-neutral-500'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <input
                        type="color"
                        value={data.design.backgroundColor}
                        onChange={(e) => updateDesign({ backgroundColor: e.target.value })}
                        className="w-7 h-7 rounded cursor-pointer border border-dashed border-neutral-600 bg-transparent"
                      />
                    </div>
                  </div>

                  {/* Brand Color */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-2">
                      Brand Color
                      <span className="text-[10px] text-neutral-500 ml-1.5">Buttons, icons, accents</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-1">
                        {['#4f46e5', '#7c3aed', '#059669', '#dc2626', '#ea580c', '#0284c7'].map(color => (
                          <button
                            key={color}
                            onClick={() => updateDesign({ accentColor: color })}
                            className={`w-7 h-7 rounded border-2 transition-all ${
                              data.design.accentColor === color 
                                ? 'border-white scale-110' 
                                : 'border-neutral-600 hover:border-neutral-500'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <input
                        type="color"
                        value={data.design.accentColor}
                        onChange={(e) => updateDesign({ accentColor: e.target.value })}
                        className="w-7 h-7 rounded cursor-pointer border border-dashed border-neutral-600 bg-transparent"
                      />
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-neutral-800" />

                  {/* Font */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-2">Font</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'system-ui, sans-serif', label: 'Clean', preview: 'Aa' },
                        { value: 'Georgia, serif', label: 'Classic', preview: 'Aa' },
                        { value: '"Courier New", monospace', label: 'Mono', preview: 'Aa' },
                      ].map(font => (
                        <button
                          key={font.value}
                          onClick={() => updateDesignExt({ fontFamily: font.value })}
                          className={`p-3 rounded-lg text-center transition-all ${
                            fontFamily === font.value
                              ? 'bg-indigo-600/20 border-2 border-indigo-500'
                              : 'bg-neutral-800 border border-neutral-700 hover:border-neutral-600'
                          }`}
                        >
                          <span 
                            className="text-xl font-semibold block mb-0.5"
                            style={{ fontFamily: font.value }}
                          >
                            {font.preview}
                          </span>
                          <span className="text-[10px] text-neutral-400">{font.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-neutral-800" />

                  {/* Body Text */}
                  <div>
                    <label className="text-xs font-medium text-neutral-300 block">
                      Body Text
                      <span className="text-[10px] text-neutral-500 ml-1">File names, descriptions</span>
                    </label>
                    <TextStyleBar
                      prefix="body"
                      size={bodySize}
                      color={bodyColor}
                      align={bodyAlign}
                      sizes={[{ value: '12px', label: 'S' }, { value: '14px', label: 'M' }, { value: '16px', label: 'L' }]}
                    />
                  </div>
                </div>
              </div>

              {/* CONTENT SECTION */}
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                    <Package className="w-4 h-4 text-indigo-400" />
                  </div>
                  <h3 className="font-semibold">Content</h3>
                </div>

                {/* Section Order */}
                {showReorder && (
                  <div className="mb-4 p-2.5 bg-neutral-800/60 border border-neutral-700 rounded-lg">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-2">Section Order</p>
                    <div className="space-y-1">
                      {contentOrder.filter(s => activeSections.includes(s)).map((section, idx, arr) => (
                        <div key={section} className="flex items-center gap-2">
                          {section === 'header' && <Package className="w-3 h-3 text-amber-400" />}
                          {section === 'files' && <File className="w-3 h-3 text-blue-400" />}
                          {section === 'videos' && <Video className="w-3 h-3 text-purple-400" />}
                          {section === 'resources' && <Link className="w-3 h-3 text-green-400" />}
                          <span className="text-xs text-neutral-300 flex-1">
                            {section === 'header' 
                              ? (data.design.logoUrl ? 'Logo + Heading' : 'Heading')
                              : section === 'files' ? filesSectionTitle 
                              : section === 'videos' ? videosSectionTitle 
                              : resourcesSectionTitle}
                          </span>
                          <button
                            onClick={() => moveSection(section, 'up')}
                            disabled={idx === 0}
                            className="p-0.5 rounded hover:bg-neutral-700 text-neutral-500 hover:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveSection(section, 'down')}
                            disabled={idx === arr.length - 1}
                            className="p-0.5 rounded hover:bg-neutral-700 text-neutral-500 hover:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-5">
                  {contentOrder.map(section => {
                    if (section === 'files') return (
                  <div key="files">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Pencil className="w-3 h-3 text-neutral-500 flex-shrink-0" />
                      <input
                        type="text"
                        value={filesSectionTitle}
                        onChange={(e) => updateDesignExt({ filesSectionTitle: e.target.value })}
                        className="text-sm font-semibold text-white bg-neutral-800/60 border border-neutral-700 hover:border-neutral-500 focus:border-indigo-500 focus:outline-none rounded-md px-2 py-1 w-full"
                        placeholder="e.g. Course Materials, Downloads"
                      />
                    </div>
                    <TextStyleBar
                      prefix="filesTitle"
                      size={filesTitleSize}
                      color={filesTitleColor}
                      align={filesTitleAlign}
                      sizes={[{ value: '18px', label: 'S' }, { value: '22px', label: 'M' }, { value: '28px', label: 'L' }]}
                    />
                    <div className="mt-2" />
                    
                    {data.hosted.files.length > 0 && (
                      <div className="space-y-1.5 mb-2">
                        {data.hosted.files.map(file => (
                          <div key={file.id} className="flex items-center gap-2 bg-neutral-800 rounded-lg px-3 py-2 group">
                            <File className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                            {editingItem?.type === 'file' && editingItem.id === file.id ? (
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onBlur={saveEditing}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditing();
                                  if (e.key === 'Escape') cancelEditing();
                                }}
                                autoFocus
                                className="text-sm bg-neutral-700 border border-indigo-500 rounded px-1.5 py-0.5 text-white focus:outline-none flex-1 min-w-0"
                              />
                            ) : (
                              <span
                                className="text-sm truncate flex-1 cursor-pointer hover:text-indigo-400 transition-colors"
                                onClick={() => startEditing('file', file.id, file.name)}
                                title="Click to rename"
                              >
                                {file.name}
                              </span>
                            )}
                            <span className="text-xs text-neutral-500">{formatFileSize(file.size)}</span>
                            <button
                              onClick={() => startEditing('file', file.id, file.name)}
                              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-neutral-700 rounded text-neutral-500 hover:text-neutral-300 transition-all"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteRequest('file', file.id, file.url, file.name)}
                              className="p-1 hover:bg-neutral-700 rounded text-neutral-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {isUploading ? (
                      <div className="border border-neutral-700 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Loader className="w-4 h-4 animate-spin text-indigo-400" />
                          <span className="text-sm text-neutral-300">Uploading... {uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-neutral-800 rounded-full h-1.5">
                          <div className="bg-indigo-500 rounded-full h-1.5 transition-all" style={{ width: `${uploadProgress}%` }} />
                        </div>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 px-3 py-3 border border-dashed border-neutral-600 hover:border-neutral-500 rounded-lg cursor-pointer transition-colors">
                        <Upload className="w-4 h-4 text-neutral-400" />
                        <span className="text-sm text-neutral-400">Upload file (max 50MB)</span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                    );
                    if (section === 'videos') return (
                  <div key="videos">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Pencil className="w-3 h-3 text-neutral-500 flex-shrink-0" />
                      <input
                        type="text"
                        value={videosSectionTitle}
                        onChange={(e) => updateDesignExt({ videosSectionTitle: e.target.value })}
                        className="text-sm font-semibold text-white bg-neutral-800/60 border border-neutral-700 hover:border-neutral-500 focus:border-indigo-500 focus:outline-none rounded-md px-2 py-1 w-full"
                        placeholder="e.g. Lessons, Tutorials"
                      />
                    </div>
                    <TextStyleBar
                      prefix="videosTitle"
                      size={videosTitleSize}
                      color={videosTitleColor}
                      align={videosTitleAlign}
                      sizes={[{ value: '18px', label: 'S' }, { value: '22px', label: 'M' }, { value: '28px', label: 'L' }]}
                    />
                    <div className="mt-2" />
                    
                    {data.hosted.videos.length > 0 && (
                      <div className="space-y-1.5 mb-2">
                        {data.hosted.videos.map(video => (
                          <div key={video.id} className="bg-neutral-800 rounded-lg overflow-hidden">
                            <div className="flex items-center gap-2 px-3 py-2 group">
                              <Video className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                              {editingItem?.type === 'video' && editingItem.id === video.id ? (
                                <input
                                  type="text"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  onBlur={saveEditing}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEditing();
                                    if (e.key === 'Escape') cancelEditing();
                                  }}
                                  autoFocus
                                  className="text-sm bg-neutral-700 border border-indigo-500 rounded px-1.5 py-0.5 text-white focus:outline-none flex-1 min-w-0"
                                />
                              ) : (
                                <span
                                  className="text-sm truncate flex-1 cursor-pointer hover:text-indigo-400 transition-colors"
                                  onClick={() => startEditing('video', video.id, video.title)}
                                  title="Click to rename"
                                >
                                  {video.title}
                                </span>
                              )}
                              <span className="text-xs text-neutral-500 capitalize">{video.platform}</span>
                              <button
                                onClick={() => startEditing('video', video.id, video.title)}
                                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-neutral-700 rounded text-neutral-500 hover:text-neutral-300 transition-all"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteRequest('video', video.id, video.url, video.title)}
                                className="p-1 hover:bg-neutral-700 rounded text-neutral-500 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            {/* Per-video title style controls */}
                            <div className="px-3 pb-2 border-t border-neutral-700/50">
                              <VideoStyleBar video={video} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="Paste YouTube, Vimeo, or Loom URL..."
                        className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none text-white text-sm"
                      />
                      {videoUrl && (
                        <>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={videoTitle}
                              onChange={(e) => setVideoTitle(e.target.value)}
                              placeholder="Video title (optional)"
                              className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none text-white text-sm"
                            />
                            <button
                              onClick={handleAddVideo}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                            >
                              <Plus className="w-4 h-4" />
                              Add
                            </button>
                          </div>
                          <p className="text-xs text-neutral-500">
                            Detected: <span className="text-neutral-400 capitalize">{detectVideoPlatform(videoUrl)}</span>
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                    );
                    if (section === 'resources') return (
                  <div key="resources">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Pencil className="w-3 h-3 text-neutral-500 flex-shrink-0" />
                      <input
                        type="text"
                        value={resourcesSectionTitle}
                        onChange={(e) => updateDesignExt({ resourcesSectionTitle: e.target.value })}
                        className="text-sm font-semibold text-white bg-neutral-800/60 border border-neutral-700 hover:border-neutral-500 focus:border-indigo-500 focus:outline-none rounded-md px-2 py-1 w-full"
                        placeholder="e.g. Bonus Resources, Links"
                      />
                    </div>
                    <TextStyleBar
                      prefix="resourcesTitle"
                      size={resourcesTitleSize}
                      color={resourcesTitleColor}
                      align={resourcesTitleAlign}
                      sizes={[{ value: '18px', label: 'S' }, { value: '22px', label: 'M' }, { value: '28px', label: 'L' }]}
                    />
                    <div className="mt-2" />
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={embedUrl}
                        onChange={(e) => setEmbedUrl(e.target.value)}
                        placeholder="Notion, Google Docs, or website URL..."
                        className="flex-1 px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none text-white text-sm"
                      />
                      <button
                        onClick={handleEmbedSave}
                        disabled={embedUrl === data.hosted.notionUrl}
                        className="px-4 py-2.5 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm transition-colors"
                      >
                        {data.hosted.notionUrl ? 'Update' : 'Save'}
                      </button>
                    </div>
                    {data.hosted.notionUrl && (
                      <div className="flex items-center gap-2 mt-2 bg-neutral-800 rounded-lg px-3 py-2">
                        <Link className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                        <span className="text-sm text-neutral-300 truncate flex-1">{data.hosted.notionUrl}</span>
                        <button
                          onClick={() => { updateHosted({ notionUrl: '' }); setEmbedUrl(''); }}
                          className="p-1 hover:bg-neutral-700 rounded text-neutral-500 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                    );
                    return null;
                  })}
                </div>
              </div>


              {/* Validation hint */}
              {!hasContent && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                  <p className="text-sm text-amber-400">
                    Add at least one file, video, or embedded page to continue.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: LIVE PREVIEW */}
          {showPreview && (
            <div className="hidden lg:flex flex-1 flex-col overflow-hidden bg-neutral-900/30">
              {/* Preview Header */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-800 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-neutral-500" />
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Live Preview</span>
                </div>
                <span className="text-xs text-neutral-600">
                  {previewDevice === 'desktop' ? 'Desktop view' : 'Mobile view'}
                </span>
              </div>

              {/* Preview Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <LivePreview />
              </div>
            </div>
          )}
        </div>

        {/* ========== BOTTOM NAVIGATION BAR ========== */}
        <div className="bg-neutral-900 border-t border-neutral-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-sm font-medium text-neutral-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex items-center gap-3">
            {!hasContent && (
              <p className="text-xs text-amber-400 hidden sm:block">
                Add content to continue
              </p>
            )}
            <button
              onClick={onNext}
              disabled={!hasContent}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-700 disabled:text-neutral-500 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.type === 'file' ? 'Delete File?' : 'Delete Video?'}
        message={`Are you sure you want to delete "${deleteModal.name}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, type: 'file', id: '', url: '', name: '' })}
        isLoading={isDeleting}
      />

      {/* ==========================================
          FULL-SCREEN PREVIEW OVERLAY
          ========================================== */}
      {showFullPreview && (
        <div className="fixed inset-0 z-50 flex flex-col">
          {/* Top Bar */}
          <div className="bg-neutral-900 border-b border-neutral-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-indigo-400" />
              <span className="text-sm font-medium text-neutral-200">Delivery Page Preview</span>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">Preview Mode</span>
            </div>
            <button
              onClick={() => setShowFullPreview(false)}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-sm text-neutral-300 transition-colors"
            >
              <X className="w-4 h-4" />
              Close Preview
            </button>
          </div>

          {/* Delivery Page - Full Size */}
          <div className="flex-1 overflow-y-auto" style={{ backgroundColor: bgColor }}>
            <LivePreview fullSize />
          </div>
        </div>
      )}
    </>
  );
}