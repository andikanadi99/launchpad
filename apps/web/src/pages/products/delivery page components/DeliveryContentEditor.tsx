import { useState } from 'react';
import { 
  Plus, GripVertical, Trash2, Type, Heading1, Heading2, 
  List, Video, Image as ImageIcon, Link as LinkIcon, FileText,
  AlertCircle, MoveUp, MoveDown
} from 'lucide-react';
import { storage, auth } from '../../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

// Block types for content
export type ContentBlock = 
  | { type: 'heading1'; content: string; id: string }
  | { type: 'heading2'; content: string; id: string }
  | { type: 'paragraph'; content: string; id: string }
  | { type: 'list'; items: string[]; id: string }
  | { type: 'video'; url: string; caption?: string; id: string }
  | { type: 'image'; url: string; caption?: string; id: string }
  | { type: 'divider'; id: string }
  | { type: 'callout'; content: string; emoji?: string; id: string };

interface DeliveryContentEditorProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
}

export default function DeliveryContentEditor({ blocks, onChange }: DeliveryContentEditorProps) {
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);

  // Generate unique ID for blocks
  const generateId = () => `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Add new block
  const addBlock = (type: ContentBlock['type']) => {
    let newBlock: ContentBlock;
    
    switch (type) {
      case 'heading1':
        newBlock = { type: 'heading1', content: '', id: generateId() };
        break;
      case 'heading2':
        newBlock = { type: 'heading2', content: '', id: generateId() };
        break;
      case 'paragraph':
        newBlock = { type: 'paragraph', content: '', id: generateId() };
        break;
      case 'list':
        newBlock = { type: 'list', items: [''], id: generateId() };
        break;
      case 'video':
        newBlock = { type: 'video', url: '', id: generateId() };
        break;
      case 'image':
        newBlock = { type: 'image', url: '', id: generateId() };
        break;
      case 'divider':
        newBlock = { type: 'divider', id: generateId() };
        break;
      case 'callout':
        newBlock = { type: 'callout', content: '', emoji: '💡', id: generateId() };
        break;
      default:
        return;
    }
    
    onChange([...blocks, newBlock]);
    setShowBlockMenu(false);
  };

  // Update block content
  const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
    onChange(blocks.map(block => 
      block.id === id ? { ...block, ...updates } : block
    ));
  };

  // Delete block
  const deleteBlock = (id: string) => {
    onChange(blocks.filter(block => block.id !== id));
  };

  // Move block up/down
  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === id);
    if (index === -1) return;
    
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;
    
    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    
    onChange(newBlocks);
  };

  // Handle drag and drop
  const handleDragStart = (id: string) => {
    setDraggedBlockId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedBlockId || draggedBlockId === targetId) return;

    const draggedIndex = blocks.findIndex(b => b.id === draggedBlockId);
    const targetIndex = blocks.findIndex(b => b.id === targetId);

    const newBlocks = [...blocks];
    const [draggedBlock] = newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(targetIndex, 0, draggedBlock);
    
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

  // Render individual block
  const renderBlock = (block: ContentBlock, index: number) => {
    const isFirst = index === 0;
    const isLast = index === blocks.length - 1;

    return (
      <div
        key={block.id}
        draggable
        onDragStart={() => handleDragStart(block.id)}
        onDragOver={(e) => handleDragOver(e, block.id)}
        onDragEnd={() => setDraggedBlockId(null)}
        className="group relative"
      >
        {/* Block Controls */}
        <div className="absolute -left-12 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
          <button
            onClick={() => moveBlock(block.id, 'up')}
            disabled={isFirst}
            className="p-1 hover:bg-neutral-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move up"
          >
            <MoveUp className="w-4 h-4 text-neutral-400" />
          </button>
          <button
            className="cursor-move p-1 hover:bg-neutral-700 rounded"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4 text-neutral-400" />
          </button>
          <button
            onClick={() => moveBlock(block.id, 'down')}
            disabled={isLast}
            className="p-1 hover:bg-neutral-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move down"
          >
            <MoveDown className="w-4 h-4 text-neutral-400" />
          </button>
        </div>

        {/* Delete Button */}
        <button
          onClick={() => deleteBlock(block.id)}
          className="absolute -right-12 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded"
          title="Delete block"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>

        {/* Block Content */}
        <div className="p-2 rounded-lg hover:bg-neutral-800/30 transition-colors">
          {block.type === 'heading1' && (
            <input
              type="text"
              value={block.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              placeholder="Heading 1"
              className="w-full text-3xl font-bold bg-transparent border-none outline-none text-neutral-100 placeholder-neutral-600"
            />
          )}

          {block.type === 'heading2' && (
            <input
              type="text"
              value={block.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              placeholder="Heading 2"
              className="w-full text-2xl font-semibold bg-transparent border-none outline-none text-neutral-100 placeholder-neutral-600"
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
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-neutral-400 mt-1">•</span>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const newItems = [...block.items];
                      newItems[idx] = e.target.value;
                      updateBlock(block.id, { items: newItems });
                    }}
                    placeholder="List item"
                    className="flex-1 bg-transparent border-none outline-none text-neutral-200 placeholder-neutral-600"
                  />
                  {block.items.length > 1 && (
                    <button
                      onClick={() => {
                        const newItems = block.items.filter((_, i) => i !== idx);
                        updateBlock(block.id, { items: newItems });
                      }}
                      className="p-1 hover:bg-red-500/20 rounded"
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
              <input
                type="text"
                value={block.caption || ''}
                onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                placeholder="Caption (optional)"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-xs"
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
                  <input
                    type="text"
                    value={block.caption || ''}
                    onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                    placeholder="Caption (optional)"
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-xs"
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
              <input
                type="text"
                value={block.emoji || '💡'}
                onChange={(e) => updateBlock(block.id, { emoji: e.target.value })}
                maxLength={2}
                className="w-12 text-center text-2xl bg-transparent border-none outline-none"
              />
              <textarea
                value={block.content}
                onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                placeholder="Important note or tip..."
                rows={2}
                className="flex-1 bg-transparent border-none outline-none resize-none text-indigo-200 placeholder-indigo-400/50"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-400" />
          Content Builder
        </h2>
        <p className="text-neutral-400 mt-1">
          Build your delivery page with rich content blocks
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-indigo-300 font-medium mb-1">
              Rich Content Editor
            </p>
            <p className="text-sm text-indigo-200/80">
              Create a beautiful delivery page with text, videos, images, and more. Drag to reorder blocks.
            </p>
          </div>
        </div>
      </div>

      {/* Content Blocks */}
      <div className="space-y-2 pl-12 pr-12">
        {blocks.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-neutral-800 rounded-lg">
            <FileText className="w-12 h-12 mx-auto mb-3 text-neutral-600" />
            <p className="text-neutral-400 mb-2">No content blocks yet</p>
            <p className="text-xs text-neutral-600">Click the + button below to add your first block</p>
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
                  <div className="text-xs text-neutral-500">Large section title</div>
                </div>
              </button>
              
              <button
                onClick={() => addBlock('heading2')}
                className="flex items-center gap-2 p-3 hover:bg-neutral-800 rounded-lg text-left transition-colors"
              >
                <Heading2 className="w-4 h-4 text-neutral-400" />
                <div>
                  <div className="text-sm font-medium">Heading 2</div>
                  <div className="text-xs text-neutral-500">Medium section title</div>
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

      {/* Tips */}
      {blocks.length > 0 && (
        <div className="bg-neutral-800/30 border border-neutral-700 rounded-lg p-4">
          <p className="text-xs text-neutral-500">
            💡 <strong>Tips:</strong> Hover over blocks to see controls. Drag the grip icon to reorder blocks. Click trash to delete.
          </p>
        </div>
      )}
    </div>
  );
}