// utils/productHelpers.ts

import { ProductFormData, ContentType } from './products.types';

/**
 * Converts video URLs from various platforms into embeddable iframe URLs
 */
export function getEmbedUrl(url: string): string {
  if (!url) return '';
  
  // YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }
  
  // Loom
  if (url.includes('loom.com')) {
    const videoId = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)?.[1];
    return videoId ? `https://www.loom.com/embed/${videoId}` : url;
  }
  
  // Vimeo
  if (url.includes('vimeo.com')) {
    const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
    return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
  }
  
  return url;
}

/**
 * Formats raw text content (from Notion exports, etc.) into markdown
 */
export function formatContent(
  rawText: string,
  currentVideoUrl: string,
  setFormData: (updater: (prev: ProductFormData) => ProductFormData) => void,
  setContentType: (type: ContentType) => void
): string {
  let formatted = rawText;
  
  // Clean up excessive newlines but preserve intentional spacing
  formatted = formatted.replace(/\n{4,}/g, '\n\n\n');
  
  // Convert Notion-style callouts to markdown blockquotes with emoji markers
  formatted = formatted.replace(/<aside>\s*([🔊💡✍️🎯⚠️ℹ️])\s*([\s\S]*?)<\/aside>/g, '\n> $1 $2\n');
  
  // Extract video URLs and set them
  const videoMatch = formatted.match(/https:\/\/(www\.)?(loom\.com|youtube\.com|youtu\.be|vimeo\.com)[^\s\n]*/);
  if (videoMatch && !currentVideoUrl) {
    setFormData(prev => ({...prev, videoUrl: videoMatch[0]}));
    setContentType('both');
  }
  
  // Preserve headers as they are
  formatted = formatted.replace(/^#\s+(.+)$/gm, '# $1');
  formatted = formatted.replace(/^##\s+(.+)$/gm, '## $1');
  formatted = formatted.replace(/^###\s+(.+)$/gm, '### $1');
  
  // Convert emoji bullets to markdown lists
  formatted = formatted.replace(/^[•◦▪︎✅❌🔊💡🎯✍️]\s+/gm, '- ');
  
  // Fix numbered lists
  formatted = formatted.replace(/^(\d+)[.)]\s+/gm, '$1. ');
  
  // Ensure horizontal rules are properly formatted
  formatted = formatted.replace(/^-{3,}$/gm, '\n---\n');
  
  // Preserve bold text
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '**$1**');
  
  return formatted;
}

/**
 * Moves an element in an array from one index to another
 */
export function moveElement(arr: string[], fromIndex: number, toIndex: number): string[] {
  const newArr = [...arr];
  const [element] = newArr.splice(fromIndex, 1);
  newArr.splice(toIndex, 0, element);
  return newArr;
}

/**
 * Processes an uploaded file and extracts its content
 */
export async function processUploadedFile(
  file: File,
  formData: ProductFormData,
  setFormData: (data: ProductFormData) => void,
  setContentType: (type: ContentType) => void
): Promise<{ success: boolean; error?: string }> {
  try {
    const text = await file.text();
    
    // Check if it's HTML (Notion export)
    if (file.name.endsWith('.html') || text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      // Parse HTML to extract text content
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      
      // Extract text from body, preserving structure
      const bodyContent = doc.body?.innerText || doc.body?.textContent || '';
      const formatted = formatContent(bodyContent, formData.videoUrl, (updater) => {
        setFormData(updater(formData));
      }, setContentType);
      
      setFormData({...formData, content: formatted});
      return { success: true };
      
    } else if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
      // Process as markdown or plain text
      const formatted = formatContent(text, formData.videoUrl, (updater) => {
        setFormData(updater(formData));
      }, setContentType);
      
      setFormData({...formData, content: formatted});
      return { success: true };
      
    } else {
      return { 
        success: false, 
        error: 'Unsupported file type. Please upload .txt, .md, or .html files.' 
      };
    }
  } catch (error) {
    console.error('Error processing file:', error);
    return { 
      success: false, 
      error: 'Error processing file. Please try again.' 
    };
  }
}

/**
 * Gets preview content based on settings
 */
export function getPreviewContent(
  formData: ProductFormData,
  previewStart: number,
  previewLength: number
): string {
  if (formData.previewType === 'custom' && formData.customPreview) {
    return formData.customPreview;
  }
  return formData.content.substring(previewStart, previewStart + previewLength);
}

/**
 * Validates if the basic step form is complete
 */
export function validateBasicsStep(formData: ProductFormData): boolean {
  return !!(
    formData.title && 
    formData.description && 
    formData.features.some(f => f.trim()) &&
    formData.price !== '' &&
    parseFloat(formData.price) >= 0
  );
}

/**
 * Validates if the content step form is complete
 */
export function validateContentStep(formData: ProductFormData, contentType: ContentType): boolean {
  if (contentType === 'text') return !!formData.content;
  if (contentType === 'video') return !!formData.videoUrl;
  if (contentType === 'both') return !!(formData.content || formData.videoUrl);
  return false;
}

/**
 * Default form data for new products
 */
export const defaultFormData: ProductFormData = {
  title: '',
  price: '10',
  description: '',
  content: '',
  videoUrl: '',
  videoUrls: [],
  features: ['', '', ''],
  resources: [],
  testimonial: '',
  guarantee: '30-day money-back guarantee',
  urgency: '',
  color: 'green',
  previewType: 'auto',
  customPreview: '',
  buttonGradient: false,
  featuresTitle: 'What\'s Included',
  customUrgency: '',
  pageTheme: 'dark',
  guaranteeItems: [
    'Secure payment via Stripe',
    'Instant access to content',
    '30-day money-back guarantee'
  ],
  elementOrder: ['hero', 'video', 'urgency', 'features', 'testimonial', 'content', 'purchase'],
  urgencyIcon: '⏰',
  useUrgencyIcon: true,
  themePreset: 'dark',
  customTheme: {
    bg: '#0B0B0D',
    text: '#FFFFFF',
    subtext: '#A0A0A0'
  },
  videoPreviewType: 'limited',
  videoPreviewDuration: 10,
  salesVideoUrl: '',
  videoStartTime: 0,
  videoThumbnailUrl: '',
  videoTitle: 'Watch This First 👇',
};