// types/product.types.ts

export type ContentType = 'text' | 'video' | 'both';
export type Step = 'basics' | 'content' | 'preview' | 'customize' | 'success';
export type PreviewMode = 'locked' | 'unlocked';
export type ContentMethod = 'upload' | 'paste' | 'link';
export type ThemePreset = 'dark' | 'light' | 'purple' | 'blue' | 'ocean' | 'forest' | 'sunset' | 'midnight' | 'cream' | 'mint' | 'custom';
export type VideoPreviewType = 'separate' | 'limited' | 'none';
export type ButtonColor = 'green' | 'blue' | 'purple' | 'red';
export type PreviewType = 'auto' | 'custom';
export type PageTheme = 'dark' | 'light';

export interface Resource {
  title: string;
  url: string;
}

export interface CustomTheme {
  bg: string;
  text: string;
  subtext: string;
  cardBg?: string;
  border?: string;
}

export interface ProductFormData {
  // Basic Information
  title: string;
  price: string;
  description: string;
  
  // Content
  content: string;
  contentType?: ContentType;
  contentMethod?: ContentMethod;
  
  // Video Settings
  videoUrl: string;
  videoUrls: string[];
  videoTitle: string;
  videoPreviewType: VideoPreviewType;
  videoPreviewDuration: number;
  salesVideoUrl: string;
  videoStartTime: number;
  videoThumbnailUrl: string;
  
  // Features & Benefits
  features: string[];
  featuresTitle: string;
  
  // Resources
  resources: Resource[];
  
  // Social Proof
  testimonial: string;
  
  // Guarantees
  guarantee: string;
  guaranteeItems: string[];
  
  // Urgency
  urgency: string;
  customUrgency: string;
  urgencyIcon: string;
  useUrgencyIcon: boolean;
  
  // Styling
  color: ButtonColor;
  buttonGradient: boolean;
  pageTheme: PageTheme;
  themePreset: ThemePreset;
  customTheme: CustomTheme;
  
  // Preview Settings
  previewType: PreviewType;
  customPreview: string;
  
  // Layout
  elementOrder: string[];
}

export interface StepComponentProps {
  formData: ProductFormData;
  setFormData: (data: ProductFormData) => void;
  setCurrentStep: (step: Step) => void;
  saving?: boolean;
  setSaving?: (saving: boolean) => void;
  productUrl?: string;
  setProductUrl?: (url: string) => void;
}

export interface VideoPreviewSettings {
  videoPreviewType: VideoPreviewType;
  videoPreviewDuration: number;
  salesVideoUrl: string;
  videoStartTime: number;
  videoThumbnailUrl: string;
  videoTitle: string;
  getEmbedUrl: (url: string) => string;
}

export interface ThemeColors {
  bg: string;
  text: string;
  subtext: string;
  cardBg: string;
  border: string;
}