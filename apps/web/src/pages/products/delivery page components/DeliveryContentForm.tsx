import { useState } from 'react';
import { DeliveryData } from '../DeliveryBuilder';
import { storage, auth } from '../../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { 
  Mail, FileText, Package, ExternalLink, Upload, X, 
  Loader, Check, AlertCircle, File, Image as ImageIcon
} from 'lucide-react';
import DeliveryContentEditor, { ContentBlock } from './DeliveryContentEditor';

interface DeliveryContentFormProps {
  data: DeliveryData;
  updateData: (updates: Partial<DeliveryData>) => void;
  productName: string;
}

export default function DeliveryContentForm({ 
  data, 
  updateData, 
  productName 
}: DeliveryContentFormProps) {
  
  // ========== FILE UPLOAD STATE ==========
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  // ========== FILE UPLOAD HANDLERS ==========
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate total files
    const currentFiles = data.files || [];
    if (currentFiles.length + files.length > 10) {
      setUploadError('Maximum 10 files allowed');
      return;
    }

    // Validate file sizes (50MB max per file)
    const invalidFiles = files.filter(file => file.size > 50 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      setUploadError(`Files too large: ${invalidFiles.map(f => f.name).join(', ')} (Max 50MB per file)`);
      return;
    }

    setUploadError(null);
    setUploading(true);

    // Upload files sequentially
    for (const file of files) {
      await uploadFile(file);
    }

    setUploading(false);
    setUploadProgress({});
  };

  const uploadFile = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        reject('Not authenticated');
        return;
      }

      // Create unique filename
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `users/${userId}/delivery-files/${fileName}`);

      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
        },
        (error) => {
          console.error('Upload error:', error);
          setUploadError(`Failed to upload ${file.name}`);
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Add to files array
            const newFile = {
              url: downloadURL,
              name: file.name,
              size: file.size,
              uploadedAt: new Date()
            };

            updateData({
              files: [...(data.files || []), newFile]
            });

            resolve();
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  };

  const handleDeleteFile = async (fileUrl: string, fileName: string) => {
    if (!confirm(`Delete ${fileName}?`)) return;

    try {
      // Delete from storage
      const fileRef = ref(storage, fileUrl);
      await deleteObject(fileRef);

      // Remove from state
      updateData({
        files: (data.files || []).filter(f => f.url !== fileUrl)
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <ImageIcon className="w-5 h-5" />;
    }
    return <File className="w-5 h-5" />;
  };

  // ========== URL VALIDATION ==========
  const isValidUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // ========== EMAIL-ONLY FORM ==========
  if (data.type === 'email-only') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Mail className="w-6 h-6 text-indigo-400" />
            Email Confirmation
          </h2>
          <p className="text-neutral-400 mt-1">
            Customize the email your customers receive after purchase
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-indigo-300 font-medium mb-1">
                Automatic Email Delivery
              </p>
              <p className="text-sm text-indigo-200/80">
                Customers receive this email immediately after purchase. Perfect for manual delivery, services, or coaching.
              </p>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Email Subject */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Email Subject
            </label>
            <input
              type="text"
              value={data.emailSubject || ''}
              onChange={(e) => updateData({ emailSubject: e.target.value })}
              placeholder="Thank you for your purchase!"
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none"
              maxLength={100}
            />
            <div className="mt-1 flex justify-between text-xs text-neutral-500">
              <span>Keep it short and friendly</span>
              <span>{data.emailSubject?.length || 0}/100</span>
            </div>
          </div>

          {/* Email Body */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Email Body
            </label>
            <textarea
              value={data.emailBody || ''}
              onChange={(e) => updateData({ emailBody: e.target.value })}
              rows={8}
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none resize-none font-mono text-sm"
              placeholder="Write your email message..."
            />
            <p className="text-xs text-neutral-500 mt-2">
              Use <code className="px-1 bg-neutral-800 rounded">{'{{product_name}}'}</code> to insert the product name automatically
            </p>
          </div>

          {/* Access Instructions (Optional) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Access Instructions <span className="text-neutral-500 text-xs">(Optional)</span>
            </label>
            <textarea
              value={data.accessInstructions || ''}
              onChange={(e) => updateData({ accessInstructions: e.target.value })}
              rows={3}
              placeholder="Add any special instructions or next steps for your customers..."
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="bg-neutral-800/30 border border-neutral-700 rounded-lg p-4">
          <p className="text-xs text-neutral-400 mb-2">Email Preview:</p>
          <div className="text-sm text-neutral-300 whitespace-pre-wrap">
            <strong>Subject:</strong> {data.emailSubject || '(No subject)'}
            <br /><br />
            {(data.emailBody || '').replace('{{product_name}}', productName)}
          </div>
        </div>
      </div>
    );
  }

  // ========== CONTENT PAGE FORM ==========
  if (data.type === 'content') {
    // Parse content blocks from JSON string if exists
    let contentBlocks: ContentBlock[] = [];
    try {
      if (data.content) {
        contentBlocks = JSON.parse(data.content);
      }
    } catch {
      // If content is plain text, convert to single paragraph block
      if (data.content) {
        contentBlocks = [{
          type: 'paragraph',
          content: data.content,
          id: `block_${Date.now()}`
        }];
      }
    }

    const handleBlocksChange = (blocks: ContentBlock[]) => {
      // Store blocks as JSON string
      updateData({ content: JSON.stringify(blocks) });
    };

    return (
      <DeliveryContentEditor 
        blocks={contentBlocks}
        onChange={handleBlocksChange}
      />
    );
  }

  // ========== FILE UPLOAD FORM ==========
  if (data.type === 'file') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-400" />
            File Delivery
          </h2>
          <p className="text-neutral-400 mt-1">
            Upload files for customers to download after purchase
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-indigo-300 font-medium mb-1">
                Automatic File Downloads
              </p>
              <p className="text-sm text-indigo-200/80">
                Customers can download your files immediately after purchase. Perfect for ebooks, templates, and digital assets.
              </p>
            </div>
          </div>
        </div>

        {/* File Upload Area */}
        <div>
          <label className="block text-sm font-medium mb-3">
            Upload Files
            <span className="text-neutral-500 ml-2 text-xs">
              (Max 50MB per file, 10 files total)
            </span>
          </label>

          {/* Upload Button */}
          <label className="block">
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
              accept=".pdf,.zip,.png,.jpg,.jpeg,.gif,.mp4,.mov,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            />
            <div className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              uploading 
                ? 'border-neutral-700 bg-neutral-900/50 cursor-not-allowed' 
                : 'border-neutral-700 hover:border-neutral-600 bg-neutral-900/30 hover:bg-neutral-900/50'
            }`}>
              {uploading ? (
                <div className="space-y-3">
                  <Loader className="w-8 h-8 mx-auto animate-spin text-indigo-400" />
                  <p className="text-sm text-neutral-400">Uploading files...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-8 h-8 mx-auto text-neutral-500" />
                  <div>
                    <p className="text-neutral-300 mb-1">Click to upload files</p>
                    <p className="text-xs text-neutral-500">
                      PDFs, ZIPs, images, videos, documents
                    </p>
                  </div>
                </div>
              )}
            </div>
          </label>

          {/* Upload Error */}
          {uploadError && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {uploadError}
              </p>
            </div>
          )}

          {/* Upload Progress */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="mt-4 space-y-2">
              {Object.entries(uploadProgress).map(([fileName, progress]) => (
                <div key={fileName} className="space-y-1">
                  <div className="flex justify-between text-xs text-neutral-400">
                    <span>{fileName}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Uploaded Files List */}
        {data.files && data.files.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-3">
              Uploaded Files ({data.files.length}/10)
            </label>
            <div className="space-y-2">
              {data.files.map((file, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-neutral-800/50 border border-neutral-700 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-neutral-400">
                      {getFileIcon(file.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-200 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteFile(file.url, file.name)}
                    className="p-2 hover:bg-neutral-700 rounded-lg transition-colors text-neutral-400 hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Access Instructions (Optional) */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Download Instructions <span className="text-neutral-500 text-xs">(Optional)</span>
          </label>
          <textarea
            value={data.accessInstructions || ''}
            onChange={(e) => updateData({ accessInstructions: e.target.value })}
            rows={3}
            placeholder="Add any special instructions about how to use the files..."
            className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none resize-none"
          />
        </div>
      </div>
    );
  }

  // ========== REDIRECT FORM ==========
  if (data.type === 'redirect') {
    const urlError = data.redirectUrl && !isValidUrl(data.redirectUrl);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <ExternalLink className="w-6 h-6 text-indigo-400" />
            Redirect Settings
          </h2>
          <p className="text-neutral-400 mt-1">
            Send customers to your external platform or course
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-indigo-300 font-medium mb-1">
                External Platform Redirect
              </p>
              <p className="text-sm text-indigo-200/80">
                Perfect for course platforms like Teachable, Kajabi, or your own membership site.
              </p>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Redirect URL */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Redirect URL
            </label>
            <input
              type="url"
              value={data.redirectUrl || ''}
              onChange={(e) => updateData({ redirectUrl: e.target.value })}
              placeholder="https://members.yoursite.com/welcome"
              className={`w-full px-4 py-3 bg-neutral-900 border rounded-lg focus:border-indigo-500 focus:outline-none ${
                urlError ? 'border-red-500' : 'border-neutral-700'
              }`}
            />
            {urlError && (
              <p className="text-xs text-red-400 mt-1">
                Please enter a valid URL starting with https://
              </p>
            )}
            <p className="text-xs text-neutral-500 mt-1">
              Must be a complete URL starting with https://
            </p>
          </div>

          {/* Redirect Delay */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Redirect Delay
            </label>
            <select
              value={data.redirectDelay || 3}
              onChange={(e) => updateData({ redirectDelay: parseInt(e.target.value) })}
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none"
            >
              <option value={0}>Immediate (0 seconds)</option>
              <option value={3}>3 seconds</option>
              <option value={5}>5 seconds</option>
              <option value={10}>10 seconds</option>
            </select>
            <p className="text-xs text-neutral-500 mt-1">
              How long to wait before redirecting customers
            </p>
          </div>

          {/* Show Thank You First */}
          <div className="flex items-center gap-3 p-4 bg-neutral-800/30 border border-neutral-700 rounded-lg">
            <input
              type="checkbox"
              id="showThankYou"
              checked={data.showThankYouFirst || false}
              onChange={(e) => updateData({ showThankYouFirst: e.target.checked })}
              className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
            />
            <label htmlFor="showThankYou" className="text-sm flex-1 cursor-pointer">
              Show a thank you message before redirecting
            </label>
          </div>

          {/* Access Instructions */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Access Instructions <span className="text-neutral-500 text-xs">(Optional)</span>
            </label>
            <textarea
              value={data.accessInstructions || ''}
              onChange={(e) => updateData({ accessInstructions: e.target.value })}
              rows={3}
              placeholder="Add any login instructions or important notes..."
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="bg-neutral-800/30 border border-neutral-700 rounded-lg p-4">
          <p className="text-xs text-neutral-400 mb-2">Customer Experience:</p>
          <div className="text-sm text-neutral-300 space-y-1">
            <p>1. ✓ Purchase completed</p>
            {data.showThankYouFirst && <p>2. 👋 Thank you message displayed</p>}
            <p>{data.showThankYouFirst ? '3' : '2'}. ⏱️ Wait {data.redirectDelay || 3} seconds</p>
            <p>{data.showThankYouFirst ? '4' : '3'}. 🔗 Redirect to: {data.redirectUrl || '(URL not set)'}</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}