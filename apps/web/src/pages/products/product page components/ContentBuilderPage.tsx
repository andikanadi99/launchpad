import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, auth } from '../../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  ArrowLeft, Save, Loader, Check, Eye, EyeOff, 
  FileText, Monitor, Smartphone, AlertCircle
} from 'lucide-react';
import DeliveryContentEditor, { ContentBlock } from '../delivery page components/DeliveryContentEditor';

// Preview component for rendering content blocks
function ContentPreview({ blocks, productName }: { blocks: ContentBlock[]; productName: string }) {
  // Parse video URL to embed URL
  const getVideoEmbedUrl = (url: string): string => {
    if (!url) return '';
    
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    
    // Loom
    const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
    if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;
    
    return url;
  };

  if (blocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <FileText className="w-16 h-16 text-neutral-700 mb-4" />
        <p className="text-neutral-500 text-lg mb-2">No content yet</p>
        <p className="text-neutral-600 text-sm">Add blocks in the editor to see a preview</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      {/* Product Header */}
      <div className="mb-8 pb-6 border-b border-neutral-200">
        <h1 className="text-2xl font-bold text-neutral-900">{productName}</h1>
        <p className="text-neutral-500 mt-1">Your purchase is ready!</p>
      </div>

      {/* Content Blocks */}
      <div className="space-y-6">
        {blocks.map((block) => {
          switch (block.type) {
            case 'heading1':
              return block.content ? (
                <h2 key={block.id} className="text-3xl font-bold text-neutral-900">
                  {block.content}
                </h2>
              ) : null;

            case 'heading2':
              return block.content ? (
                <h3 key={block.id} className="text-2xl font-semibold text-neutral-800">
                  {block.content}
                </h3>
              ) : null;

            case 'paragraph':
              return block.content ? (
                <p key={block.id} className="text-neutral-700 leading-relaxed whitespace-pre-wrap">
                  {block.content}
                </p>
              ) : null;

            case 'list':
              return block.items.filter(item => item.trim()).length > 0 ? (
                <ul key={block.id} className="space-y-2 ml-4">
                  {block.items.filter(item => item.trim()).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-neutral-700">
                      <span className="text-indigo-500 mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null;

            case 'video':
              const embedUrl = getVideoEmbedUrl(block.url);
              return embedUrl ? (
                <div key={block.id} className="space-y-2">
                  <div className="aspect-video rounded-lg overflow-hidden bg-neutral-100">
                    <iframe
                      src={embedUrl}
                      className="w-full h-full"
                      allowFullScreen
                      title={block.caption || 'Video'}
                    />
                  </div>
                  {block.caption && (
                    <p className="text-sm text-neutral-500 text-center">{block.caption}</p>
                  )}
                </div>
              ) : null;

            case 'image':
              return block.url ? (
                <div key={block.id} className="space-y-2">
                  <img 
                    src={block.url} 
                    alt={block.caption || 'Content image'} 
                    className="w-full rounded-lg"
                  />
                  {block.caption && (
                    <p className="text-sm text-neutral-500 text-center">{block.caption}</p>
                  )}
                </div>
              ) : null;

            case 'divider':
              return <hr key={block.id} className="border-neutral-200 my-8" />;

            case 'callout':
              return block.content ? (
                <div key={block.id} className="flex gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
                  <span className="text-2xl">{block.emoji || '💡'}</span>
                  <p className="text-indigo-900 flex-1">{block.content}</p>
                </div>
              ) : null;

            default:
              return null;
          }
        })}
      </div>
    </div>
  );
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
  
  // Preview state
  const [showPreview, setShowPreview] = useState(true);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Load product data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/auth/signin');
        return;
      }

      setUserId(user.uid);

      if (!productId) {
        alert('No product ID provided');
        navigate('/dashboard');
        return;
      }

      try {
        const productRef = doc(db, 'users', user.uid, 'products', productId);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          const data = productSnap.data();
          
          // Get product name
          setProductName(data.salesPage?.coreInfo?.name || 'Your Product');
          
          // Load existing content blocks
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
          alert('Product not found');
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error loading product:', error);
        alert('Failed to load product');
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [productId, navigate]);

  // Track unsaved changes
  useEffect(() => {
    const currentBlocks = JSON.stringify(blocks);
    setHasUnsavedChanges(currentBlocks !== initialBlocks);
  }, [blocks, initialBlocks]);

  // Warn before leaving with unsaved changes
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
    setSaveSuccess(false);
  }, []);

  // Save to Firestore
  const handleSave = async () => {
    if (!userId || !productId) return;

    setIsSaving(true);
    try {
      const productRef = doc(db, 'users', userId, 'products', productId);
      const blocksJson = JSON.stringify(blocks);
      
      await updateDoc(productRef, {
        'delivery.hosted.contentBlocks': blocksJson,
        'delivery.hosted.hasCustomContent': blocks.length > 0,
        lastUpdated: new Date()
      });

      setInitialBlocks(blocksJson);
      setHasUnsavedChanges(false);
      setSaveSuccess(true);
      
      // Clear success indicator after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
      
      console.log('✅ Content saved successfully');
    } catch (error) {
      console.error('Error saving content:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        navigate(`/products/${productId}/delivery`);
      }
    } else {
      navigate(`/products/${productId}/delivery`);
    }
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Back and title */}
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

            {/* Right side - Actions */}
            <div className="flex items-center gap-3">
              {/* Preview Toggle */}
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  showPreview ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="text-sm">{showPreview ? 'Hide' : 'Show'} Preview</span>
              </button>

              {/* Preview Mode Toggle (only when preview is shown) */}
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

              {/* Save Status */}
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

              {/* Save Button */}
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
        {/* Editor Panel */}
        <div className={`flex-1 overflow-y-auto ${showPreview ? 'md:w-1/2' : 'w-full'}`}>
          <div className="p-4 md:p-6 max-w-3xl mx-auto">
            <DeliveryContentEditor 
              blocks={blocks}
              onChange={handleBlocksChange}
            />
          </div>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="hidden md:flex md:w-1/2 border-l border-neutral-800 flex-col bg-neutral-900/30">
            {/* Preview Header */}
            <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-neutral-400" />
                <span className="text-sm font-medium text-neutral-300">Live Preview</span>
              </div>
              <span className="text-xs text-neutral-500">
                {previewMode === 'desktop' ? 'Desktop' : 'Mobile'} view
              </span>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-y-auto p-4 flex justify-center">
              <div 
                className={`bg-white rounded-lg shadow-xl overflow-y-auto ${
                  previewMode === 'desktop' 
                    ? 'w-full max-w-2xl' 
                    : 'w-[375px]'
                }`}
                style={{ maxHeight: 'calc(100vh - 180px)' }}
              >
                <ContentPreview blocks={blocks} productName={productName} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Preview Button (shows modal on mobile) */}
      <div className="md:hidden fixed bottom-4 right-4">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="p-4 bg-indigo-600 hover:bg-indigo-500 rounded-full shadow-lg transition-colors"
        >
          <Eye className="w-5 h-5" />
        </button>
      </div>

      {/* Tips Banner (only when blocks exist) */}
      {blocks.length > 0 && (
        <div className="border-t border-neutral-800 bg-neutral-900/50 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-neutral-500 max-w-3xl mx-auto">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>Tip:</strong> Hover over blocks to see controls. Drag to reorder. Your customers will see the preview version after purchase.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}