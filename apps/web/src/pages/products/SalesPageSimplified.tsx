'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { auth, db, storage } from '../../lib/firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  ArrowLeft, ArrowRight, Check, Loader, Upload, Image, Search, X,
  Plus, Trash2, ChevronDown, ChevronUp, Sparkles, Wand2, 
  Mail, FileDown, ExternalLink, FileText, Settings2, Eye,
  Monitor, Smartphone, Link, RefreshCw, Rocket, Sun, Moon
} from 'lucide-react';

// AI Copywriter
import { aiCopywriter, ProductConfig } from '../../lib/aiSalesCopyWriter';

// Preview component
import SalesPageContent from './sales page components/SalesPageContent';

// Customization component (optional panel)
import SalesStepCustomize from './sales page components/SalesStepCustomize';

const UNSPLASH_ACCESS_KEY = 'zE8QX3xsv_LTbWSbcK9tPD9TXnYVLldiJt_r-HmLfo4';

// ============================================
// TYPES
// ============================================
interface SalesPageData {
  coreInfo: {
    name: string;
    tagline: string;
    price: number;
    priceType: 'one-time' | 'payment-plan' | 'subscription' | 'free';
    currency: string;
    compareAtPrice?: number;
  };
  creator: {
    name: string;
    photo?: string;
    bio?: string;
    showCreator: boolean;
    socialLinks?: {
      instagram?: string;
      twitter?: string;
      youtube?: string;
      website?: string;
    };
    stats?: {
      rating?: number;
      soldCount?: number;
    };
  };
  valueProp: {
    description: string;
    benefits: string[];
    guarantees: string[];
    targetAudience: string;
  };
  visuals: {
    headerImage?: string;
    headerImageAttribution?: { name: string; url: string };
    headerImagePosition?: { x: number; y: number }; // 0-100 for both axes (50,50 = center)
    headerImageZoom?: number; // 1-3, scale factor (1 = no zoom)
  };
  design: {
    theme: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    cardColor: string;
    textColor: string;
    fontPair: string;
    buttonStyle: 'rounded' | 'square' | 'pill';
    cardStyle: 'flat' | 'shadow' | 'border';
    spacing: 'compact' | 'comfortable' | 'spacious';
    sectionOrder: string[];
    hiddenSections: string[];
    ctaButtonText: string;
    animations: boolean;
  };
  publish: {
    slug: string;
    metaTitle: string;
    metaDescription: string;
    status: 'draft' | 'published';
    publishedAt?: Date;
  };
  delivery: {
    // Delivery method: email-only, hosted (LaunchPad), or redirect
    method: 'email-only' | 'hosted' | 'redirect';
    
    // Section 1: Confirmation Email (always required)
    emailSubject: string;
    emailBody: string;
    
    // Section 2a: Hosted on LaunchPad
    hostedContent?: {
      files?: Array<{ url: string; name: string; size: number; uploadedAt?: Date }>;
      videos?: Array<{ url: string; title?: string; platform: 'youtube' | 'vimeo' | 'loom' }>;
      notionUrl?: string;
      contentBlocks?: string; // JSON string of content blocks
    };
    
    // Section 2b: External Redirect
    redirectUrl?: string;
    
    // Access settings
    accessType?: 'link' | 'email-verification';
  };
  sourceSessionId?: string;
}

interface UnsplashImage {
  id: string;
  urls: { small: string; regular: string };
  user: { name: string; links: { html: string } };
  alt_description: string;
}

// ============================================
// STEPS CONFIG
// ============================================
const STEPS = [
  { id: 1, name: 'Content' },
  { id: 2, name: 'Delivery' },
  { id: 3, name: 'Publish' },
];

// ============================================
// IMAGE PICKER MODAL
// ============================================
interface ImagePickerModalProps {
  onClose: () => void;
  searchTab: 'suggested' | 'search' | 'upload';
  setSearchTab: (tab: 'suggested' | 'search' | 'upload') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  stockImages: UnsplashImage[];
  isSearching: boolean;
  handleSearch: (e: React.FormEvent) => void;
  selectStockImage: (image: UnsplashImage) => void;
  handleFileUpload: (file: File) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent) => void;
  isDragging: boolean;
  isUploading: boolean;
}

const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
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
  isUploading
}) => (
  <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
    <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Choose Product Image</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
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
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 inline mr-2" />
            Suggested
          </button>
          <button
            onClick={() => setSearchTab('search')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              searchTab === 'search' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Search className="w-4 h-4 inline mr-2" />
            Search Stock
          </button>
          <button
            onClick={() => setSearchTab('upload')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              searchTab === 'upload' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white'
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
            <p className="text-sm text-gray-500 dark:text-neutral-400 mb-3">Suggested images based on your product</p>
            {isSearching ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-6 h-6 animate-spin text-gray-500 dark:text-neutral-400" />
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
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-neutral-400">
                Enter a product name to see suggestions
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
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-neutral-800 rounded-lg pr-12 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </form>
            
            {isSearching ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-6 h-6 animate-spin text-gray-500 dark:text-neutral-400" />
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
              <div className="text-center py-12 text-gray-500 dark:text-neutral-400">
                No images found for "{searchQuery}"
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-neutral-400">
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
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging 
                  ? 'border-purple-500 bg-purple-500/10' 
                  : 'border-gray-300 dark:border-neutral-700 hover:border-neutral-600'
              }`}
            >
              {isUploading ? (
                <div className="space-y-4">
                  <Loader className="w-12 h-12 mx-auto animate-spin text-purple-500" />
                  <p className="text-neutral-300">Uploading...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-neutral-500" />
                  <p className="text-neutral-300 mb-2">Drag and drop your image here</p>
                  <p className="text-sm text-gray-400 dark:text-neutral-500 mb-4">or</p>
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
                    <span className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg cursor-pointer transition-colors">
                      Choose File
                    </span>
                  </label>
                  <p className="text-xs text-gray-400 dark:text-neutral-500 mt-4">
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
        <div className="px-6 pb-4 text-xs text-gray-400 dark:text-neutral-500">
          Stock photos provided by Unsplash. Attribution will be included automatically.
        </div>
      )}
    </div>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================
export default function SalesPageSimplified() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const ideaId = searchParams.get('ideaId');

  // ============================================
  // STATE
  // ============================================
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [productId, setProductId] = useState('');
  const [userId, setUserId] = useState('');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showCustomize, setShowCustomize] = useState(false);
  const [isPrefilledFromCoPilot, setIsPrefilledFromCoPilot] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Form data
  const [data, setData] = useState<SalesPageData>({
    coreInfo: {
      name: '',
      tagline: '',
      price: 0,
      priceType: 'one-time',
      currency: 'USD',
    },
    creator: {
      name: '',
      photo: '',
      bio: '',
      showCreator: true,
      socialLinks: {
        instagram: '',
        twitter: '',
        youtube: '',
        website: '',
      },
      stats: {
        rating: undefined,
        soldCount: undefined,
      },
    },
    valueProp: {
      description: '',
      benefits: [],
      guarantees: [],
      targetAudience: '',
    },
    visuals: {
      headerImage: undefined,
      headerImagePosition: { x: 50, y: 50 }, // Center by default
      headerImageZoom: 1, // No zoom by default
    },
    design: {
      theme: 'modern',
      primaryColor: '#6366F1',
      secondaryColor: '#8B5CF6',
      backgroundColor: '#0A0A0A',
      cardColor: '#171717',
      textColor: '#E5E5E5',
      fontPair: 'inter-system',
      buttonStyle: 'rounded',
      cardStyle: 'shadow',
      spacing: 'comfortable',
      sectionOrder: ['creator', 'image', 'hero', 'tagline', 'description', 'benefits', 'guarantees', 'checkout'],
      hiddenSections: [],
      ctaButtonText: 'Buy Now',
      animations: true,
    },
    publish: {
      slug: '',
      metaTitle: '',
      metaDescription: '',
      status: 'draft',
    },
    delivery: {
      method: 'email-only',
      emailSubject: 'Your purchase is confirmed!',
      emailBody: `Hi {{customer_name}}!

Thank you for purchasing {{product_name}}.

Your order is confirmed and you now have access to your product.

{{access_button}}

If you have any questions, just reply to this email.

Cheers!`,
      hostedContent: {
        files: [],
        videos: [],
        notionUrl: '',
        contentBlocks: '[]',
      },
      redirectUrl: '',
      accessType: 'link',
    },
  });

  // UI State for Step 1
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [imagePickerTab, setImagePickerTab] = useState<'suggested' | 'search' | 'upload'>('suggested');
  const [unsplashQuery, setUnsplashQuery] = useState('');
  const [unsplashResults, setUnsplashResults] = useState<UnsplashImage[]>([]);
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isDraggingImagePosition, setIsDraggingImagePosition] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartPosition, setDragStartPosition] = useState({ x: 50, y: 50 });
  const [newBenefit, setNewBenefit] = useState('');
  const [newGuarantee, setNewGuarantee] = useState('');
  const [showComparePrice, setShowComparePrice] = useState(false);

  // Step 2: Delivery UI State
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');

  // AI Loading States
  const [isGeneratingTagline, setIsGeneratingTagline] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isImprovingDescription, setIsImprovingDescription] = useState(false);
  const [isEnhancingBenefits, setIsEnhancingBenefits] = useState(false);
  const [isSuggestingBenefits, setIsSuggestingBenefits] = useState(false);
  const [enhancingBenefitIndex, setEnhancingBenefitIndex] = useState<number | null>(null);
  const [isLoadingGuarantees, setIsLoadingGuarantees] = useState(false);
  const [isImprovingGuarantees, setIsImprovingGuarantees] = useState(false);
  const [enhancingGuaranteeIndex, setEnhancingGuaranteeIndex] = useState<number | null>(null);
  const [isImprovingSeoTitle, setIsImprovingSeoTitle] = useState(false);
  const [isImprovingSeoDescription, setIsImprovingSeoDescription] = useState(false);
  const [seoTitleSuggestion, setSeoTitleSuggestion] = useState<string | null>(null);
  const [seoDescriptionSuggestion, setSeoDescriptionSuggestion] = useState<string | null>(null);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isAlreadyPublished, setIsAlreadyPublished] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);

  // ============================================
  // AUTO-SCROLL PREVIEW TO SECTION
  // ============================================
  const scrollToPreviewSection = (sectionId: string) => {
    setTimeout(() => {
      const container = previewScrollRef.current;
      if (!container) return;
      
      const section = container.querySelector(`#${sectionId}`);
      if (section) {
        // Calculate position relative to container
        const containerRect = container.getBoundingClientRect();
        const sectionRect = section.getBoundingClientRect();
        const scrollTop = container.scrollTop + (sectionRect.top - containerRect.top) - (containerRect.height / 2) + (sectionRect.height / 2);
        
        container.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  // ============================================
  // HELPERS
  // ============================================
  const cleanData = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) return obj.map(cleanData);
    if (typeof obj === 'object') {
      return Object.entries(obj).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = cleanData(value);
        }
        return acc;
      }, {} as any);
    }
    return obj;
  };

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  };

  // Generate a unique slug by checking Firebase for availability
  const generateUniqueSlug = async (name: string, currentProductId?: string): Promise<string> => {
    const baseSlug = generateSlug(name);
    if (!baseSlug) return '';
    
    let slug = baseSlug;
    let suffix = 1;
    
    // Try up to 100 variations
    while (suffix <= 100) {
      try {
        const slugRef = doc(db, 'slugs', slug);
        const slugDoc = await getDoc(slugRef);
        
        // If slug doesn't exist, or belongs to current product, it's available
        if (!slugDoc.exists() || slugDoc.data()?.productId === currentProductId) {
          return slug;
        }
        
        // Try next variation
        suffix++;
        slug = `${baseSlug}-${suffix}`;
      } catch (error) {
        console.error('Error checking slug availability:', error);
        // On error, return with timestamp to ensure uniqueness
        return `${baseSlug}-${Date.now().toString(36)}`;
      }
    }
    
    // Fallback: add timestamp
    return `${baseSlug}-${Date.now().toString(36)}`;
  };

  const getProductConfig = (): ProductConfig => ({
    name: data.coreInfo.name,
    description: data.valueProp.description,
    price: data.coreInfo.price,
    valueStack: data.valueProp.benefits,
    targetAudience: data.valueProp.targetAudience,
  });

  const currencySymbols: Record<string, string> = {
    USD: "$", EUR: "€", GBP: "£", CAD: "C$", AUD: "A$",
  };

  // ============================================
  // AUTO-RESIZE DESCRIPTION
  // ============================================
  useEffect(() => {
    const textarea = descriptionRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(120, textarea.scrollHeight + 4)}px`;
    }
  }, [data.valueProp.description]);

  // ============================================
  // AUTO-RESIZE BENEFITS AND GUARANTEES ON LOAD/CHANGE
  // ============================================
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      // Resize benefits
      const benefitTextareas = document.querySelectorAll<HTMLTextAreaElement>('[data-benefit-textarea]');
      benefitTextareas.forEach((textarea) => {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.max(42, textarea.scrollHeight)}px`;
      });
      // Resize guarantees
      const guaranteeTextareas = document.querySelectorAll<HTMLTextAreaElement>('[data-guarantee-textarea]');
      guaranteeTextareas.forEach((textarea) => {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.max(42, textarea.scrollHeight)}px`;
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [data.valueProp.benefits, data.valueProp.guarantees, currentStep]);

  // ============================================
  // FETCH CO-PILOT DATA
  // ============================================
  const fetchCoPilotData = async (uid: string, sessionId: string) => {
    try {
      const sessionRef = doc(db, 'users', uid, 'productCoPilotSessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);
      
      if (!sessionSnap.exists()) return null;
      
      const sessionData = sessionSnap.data();
      const productConfig = sessionData.productConfig;
      
      if (!productConfig) return null;
      
      return {
        coreInfo: {
          name: productConfig.name || '',
          tagline: '',
          price: productConfig.price || 0,
          priceType: productConfig.priceType || 'one-time',
          currency: productConfig.currency || 'USD',
        },
        valueProp: {
          description: productConfig.description || '',
          benefits: productConfig.valueStack || [],
          guarantees: productConfig.guarantees || [],
          targetAudience: productConfig.targetAudience || '',
        },
        sourceSessionId: sessionId,
      };
    } catch (error) {
      console.error('Error fetching Co-Pilot data:', error);
      return null;
    }
  };

  // ============================================
  // INITIALIZE
  // ============================================
  useEffect(() => {
    const init = async () => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!user) {
          navigate('/auth/signin');
          return;
        }

        setUserId(user.uid);

        // Auto-fill creator info from user profile
        const autoCreator = {
          name: user.displayName || '',
          photo: user.photoURL || '',
          bio: '',
          showCreator: true,
        };

        try {
          let prodId = params?.productId as string;

          if (!prodId) {
            // Creating NEW product
            prodId = `product_${Date.now()}`;
            const productRef = doc(db, 'users', user.uid, 'products', prodId);
            
            let initialData = { 
              ...data,
              creator: { ...data.creator, ...autoCreator },
            };
            
            // Check for Co-Pilot data
            if (ideaId) {
              const coPilotData = await fetchCoPilotData(user.uid, ideaId);
              if (coPilotData) {
                initialData = {
                  ...initialData,
                  coreInfo: { ...initialData.coreInfo, ...coPilotData.coreInfo },
                  valueProp: { ...initialData.valueProp, ...coPilotData.valueProp },
                  sourceSessionId: coPilotData.sourceSessionId,
                };
                setIsPrefilledFromCoPilot(true);
              }
            }
            
            setData(initialData);
            
            await setDoc(productRef, cleanData({
              type: 'sales-page',
              createdAt: new Date(),
              lastUpdated: new Date(),
              published: false,
              salesPage: initialData,
              delivery: initialData.delivery,
            }));

            // Mark the original idea as "graduated" to a sales page
            if (ideaId) {
              const sessionRef = doc(db, 'users', user.uid, 'productCoPilotSessions', ideaId);
              await updateDoc(sessionRef, {
                salesPageId: prodId,
                salesPageStatus: 'draft',
                graduatedAt: new Date(),
              });
            }

            navigate(`/products/${prodId}/edit`, { replace: true });
          } else {
            // Load existing product
            const productRef = doc(db, 'users', user.uid, 'products', prodId);
            const productSnap = await getDoc(productRef);

            if (productSnap.exists()) {
              const existingData = productSnap.data();
              if (existingData.salesPage) {
                const sp = existingData.salesPage;
                setData(prev => ({
                  ...prev,
                  coreInfo: { ...prev.coreInfo, ...sp.coreInfo },
                  creator: { 
                    ...prev.creator, 
                    ...sp.creator,
                    // Fall back to user profile if no creator saved
                    name: sp.creator?.name || autoCreator.name,
                    photo: sp.creator?.photo || autoCreator.photo,
                    socialLinks: sp.creator?.socialLinks || prev.creator.socialLinks,
                    stats: sp.creator?.stats || prev.creator.stats,
                  },
                  valueProp: { 
                    ...prev.valueProp, 
                    ...sp.valueProp,
                    benefits: sp.valueProp?.benefits || prev.valueProp.benefits || [],
                    guarantees: sp.valueProp?.guarantees || prev.valueProp.guarantees || [],
                  },
                  visuals: { ...prev.visuals, ...sp.visuals },
                  design: { ...prev.design, ...sp.design },
                  publish: { ...prev.publish, ...sp.publish },
                  delivery: existingData.delivery || sp.delivery || prev.delivery,
                  sourceSessionId: existingData.sourceSessionId || sp.sourceSessionId || prev.sourceSessionId,
                }));
              }
              if (existingData.sourceSessionId) {
                setIsPrefilledFromCoPilot(true);
              }
              // Track if already published
              if (existingData.published) {
                setIsAlreadyPublished(true);
              }
            }
          }

          setProductId(prodId);
        } catch (error) {
          console.error('Error initializing:', error);
        } finally {
          setIsLoading(false);
        }
      });

      return () => unsubscribe();
    };

    init();
  }, [params?.productId, ideaId, navigate]);

  // ============================================
  // AUTO-SAVE
  // ============================================
  useEffect(() => {
    if (!productId || !userId || isLoading) return;

    const timer = setTimeout(async () => {
      setIsSaving(true);
      try {
        const productRef = doc(db, 'users', userId, 'products', productId);
        await updateDoc(productRef, cleanData({
          salesPage: data,
          delivery: data.delivery,
          lastUpdated: new Date(),
        }));
      } catch (error) {
        console.error('Auto-save error:', error);
      } finally {
        setIsSaving(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [data, productId, userId, isLoading]);

  // ============================================
  // AUTO-GENERATE SEO WHEN ENTERING STEP 3
  // ============================================
  useEffect(() => {
    if (currentStep === 3) {
      // Auto-generate slug if empty
      if (!data.publish.slug && data.coreInfo.name) {
        // Use async function to generate unique slug
        generateUniqueSlug(data.coreInfo.name, productId).then(uniqueSlug => {
          setData(prev => ({
            ...prev,
            publish: {
              ...prev.publish,
              slug: uniqueSlug,
            }
          }));
        });
      }
      // Auto-generate meta title if empty
      if (!data.publish.metaTitle && data.coreInfo.name) {
        setData(prev => ({
          ...prev,
          publish: {
            ...prev.publish,
            metaTitle: data.coreInfo.name,
          }
        }));
      }
      // Auto-generate meta description if empty
      if (!data.publish.metaDescription && data.valueProp.description) {
        setData(prev => ({
          ...prev,
          publish: {
            ...prev.publish,
            metaDescription: data.valueProp.description.substring(0, 160),
          }
        }));
      }
    }
  }, [currentStep, data.coreInfo.name, data.valueProp.description, productId]);

  // ============================================
  // CHECK SLUG AVAILABILITY (DEBOUNCED)
  // ============================================
  useEffect(() => {
    const slug = data.publish.slug?.trim();
    
    // Reset status if slug is empty or too short
    if (!slug || slug.length < 3) {
      setSlugStatus('idle');
      return;
    }
    
    // Set checking status
    setSlugStatus('checking');
    
    // Debounce the check
    const timer = setTimeout(async () => {
      try {
        const slugRef = doc(db, 'slugs', slug);
        const slugDoc = await getDoc(slugRef);
        
        // Available if doesn't exist or belongs to current product
        if (!slugDoc.exists() || slugDoc.data()?.productId === productId) {
          setSlugStatus('available');
        } else {
          setSlugStatus('taken');
        }
      } catch (error) {
        console.error('Error checking slug:', error);
        setSlugStatus('idle');
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [data.publish.slug, productId]);

  // ============================================
  // AI HANDLERS
  // ============================================
  const handleGenerateTagline = async () => {
    if (!data.coreInfo.name) return;
    setIsGeneratingTagline(true);
    try {
      const result = await aiCopywriter.generateTagline(getProductConfig());
      if (result.success && result.tagline) {
        setData(prev => ({
          ...prev,
          coreInfo: { ...prev.coreInfo, tagline: result.tagline! }
        }));
      }
    } finally {
      setIsGeneratingTagline(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!data.coreInfo.name) return;
    setIsGeneratingDescription(true);
    try {
      const result = await aiCopywriter.generateDescription(getProductConfig());
      if (result.success && result.description) {
        setData(prev => ({
          ...prev,
          valueProp: { ...prev.valueProp, description: result.description! }
        }));
      }
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleImproveDescription = async () => {
    if (!data.valueProp.description.trim()) return;
    setIsImprovingDescription(true);
    try {
      const result = await aiCopywriter.enhanceSingle(data.valueProp.description, 'description', getProductConfig());
      if (result.success && result.enhanced) {
        setData(prev => ({
          ...prev,
          valueProp: { ...prev.valueProp, description: result.enhanced! }
        }));
      }
    } finally {
      setIsImprovingDescription(false);
    }
  };

  const handleEnhanceAllBenefits = async () => {
    if (data.valueProp.benefits.length === 0) return;
    setIsEnhancingBenefits(true);
    try {
      const result = await aiCopywriter.enhanceBenefits(data.valueProp.benefits, getProductConfig());
      if (result.success && result.benefits) {
        setData(prev => ({
          ...prev,
          valueProp: { ...prev.valueProp, benefits: result.benefits! }
        }));
      }
    } finally {
      setIsEnhancingBenefits(false);
    }
  };

  const handleEnhanceSingleBenefit = async (index: number) => {
    setEnhancingBenefitIndex(index);
    try {
      const result = await aiCopywriter.enhanceSingle(data.valueProp.benefits[index], 'benefit', getProductConfig());
      if (result.success && result.enhanced) {
        const newBenefits = [...data.valueProp.benefits];
        newBenefits[index] = result.enhanced;
        setData(prev => ({
          ...prev,
          valueProp: { ...prev.valueProp, benefits: newBenefits }
        }));
      }
    } finally {
      setEnhancingBenefitIndex(null);
    }
  };

  const handleSuggestBenefits = async () => {
    if (!data.coreInfo.name) return;
    setIsSuggestingBenefits(true);
    try {
      const result = await aiCopywriter.suggestBenefits(getProductConfig());
      if (result.success && result.suggestions) {
        // Add suggestions directly to the list (avoid duplicates)
        const existingBenefits = data.valueProp.benefits;
        const newBenefits = result.suggestions.filter(
          (s: string) => !existingBenefits.some(b => b.toLowerCase() === s.toLowerCase())
        );
        if (newBenefits.length > 0) {
          setData(prev => ({
            ...prev,
            valueProp: { 
              ...prev.valueProp, 
              benefits: [...prev.valueProp.benefits, ...newBenefits] 
            }
          }));
        }
      }
    } finally {
      setIsSuggestingBenefits(false);
    }
  };

  const handleSuggestGuarantees = async () => {
    setIsLoadingGuarantees(true);
    try {
      const result = await aiCopywriter.suggestGuarantees(getProductConfig());
      if (result.success && result.suggestions) {
        // Add suggestions directly to the list (avoid duplicates)
        const existingGuarantees = data.valueProp.guarantees;
        const newGuarantees = result.suggestions.filter(
          (s: string) => !existingGuarantees.some(g => g.toLowerCase() === s.toLowerCase())
        );
        if (newGuarantees.length > 0) {
          setData(prev => ({
            ...prev,
            valueProp: { 
              ...prev.valueProp, 
              guarantees: [...prev.valueProp.guarantees, ...newGuarantees] 
            }
          }));
        }
      }
    } finally {
      setIsLoadingGuarantees(false);
    }
  };

  const handleImproveGuarantees = async () => {
    if (data.valueProp.guarantees.length === 0) return;
    setIsImprovingGuarantees(true);
    try {
      const result = await aiCopywriter.enhanceGuarantees(data.valueProp.guarantees, getProductConfig());
      if (result.success && result.guarantees) {
        setData(prev => ({
          ...prev,
          valueProp: { ...prev.valueProp, guarantees: result.guarantees! }
        }));
      }
    } finally {
      setIsImprovingGuarantees(false);
    }
  };

  const handleEnhanceSingleGuarantee = async (index: number) => {
    setEnhancingGuaranteeIndex(index);
    try {
      const result = await aiCopywriter.enhanceSingle(data.valueProp.guarantees[index], 'guarantee', getProductConfig());
      if (result.success && result.enhanced) {
        const newGuarantees = [...data.valueProp.guarantees];
        newGuarantees[index] = result.enhanced;
        setData(prev => ({
          ...prev,
          valueProp: { ...prev.valueProp, guarantees: newGuarantees }
        }));
      }
    } finally {
      setEnhancingGuaranteeIndex(null);
    }
  };

  // ============================================
  // SEO HANDLERS
  // ============================================
  const handleImproveSeoTitle = async () => {
    if (!data.publish.metaTitle) return;
    setIsImprovingSeoTitle(true);
    setSeoTitleSuggestion(null);
    try {
      const result = await aiCopywriter.improveSeoTitle(data.publish.metaTitle, getProductConfig());
      if (result.success && result.title) {
        setSeoTitleSuggestion(result.title);
      }
    } finally {
      setIsImprovingSeoTitle(false);
    }
  };

  const acceptSeoTitleSuggestion = () => {
    if (seoTitleSuggestion) {
      setData(prev => ({
        ...prev,
        publish: { ...prev.publish, metaTitle: seoTitleSuggestion }
      }));
      setSeoTitleSuggestion(null);
    }
  };

  const rejectSeoTitleSuggestion = () => {
    setSeoTitleSuggestion(null);
  };

  const handleImproveSeoDescription = async () => {
    if (!data.publish.metaDescription) return;
    setIsImprovingSeoDescription(true);
    setSeoDescriptionSuggestion(null);
    try {
      const result = await aiCopywriter.improveSeoDescription(data.publish.metaDescription, getProductConfig());
      if (result.success && result.description) {
        setSeoDescriptionSuggestion(result.description);
      }
    } finally {
      setIsImprovingSeoDescription(false);
    }
  };

  const acceptSeoDescriptionSuggestion = () => {
    if (seoDescriptionSuggestion) {
      setData(prev => ({
        ...prev,
        publish: { ...prev.publish, metaDescription: seoDescriptionSuggestion }
      }));
      setSeoDescriptionSuggestion(null);
    }
  };

  const rejectSeoDescriptionSuggestion = () => {
    setSeoDescriptionSuggestion(null);
  };

  // ============================================
  // IMAGE HANDLERS
  // ============================================
  const searchUnsplash = async (query?: string) => {
    const searchQuery = query || unsplashQuery;
    if (!searchQuery.trim()) return;
    setIsSearchingImages(true);
    try {
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=12&orientation=landscape`,
        { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
      );
      const result = await response.json();
      setUnsplashResults(result.results || []);
    } finally {
      setIsSearchingImages(false);
    }
  };

  // Load suggested images when picker opens
  useEffect(() => {
    if (showImagePicker && imagePickerTab === 'suggested') {
      // Generate search query from product name or use generic
      const productName = data.coreInfo.name;
      const suggestedQuery = productName 
        ? `${productName} professional business` 
        : 'online course digital product business';
      searchUnsplash(suggestedQuery);
    }
  }, [showImagePicker, imagePickerTab]);

  const selectUnsplashImage = (image: UnsplashImage) => {
    setData(prev => ({
      ...prev,
      visuals: {
        ...prev.visuals,
        headerImage: image.urls.regular,
        headerImageAttribution: { name: image.user.name, url: image.user.links.html },
      }
    }));
    setShowImagePicker(false);
    setUnsplashResults([]);
  };

  const handleFileUploadDirect = async (file: File) => {
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      const fileRef = ref(storage, `users/${user.uid}/images/product-${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      setData(prev => ({
        ...prev,
        visuals: { ...prev.visuals, headerImage: url, headerImageAttribution: undefined }
      }));
      setShowImagePicker(false);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      await handleFileUploadDirect(files[0]);
    }
  };

  const handleImageSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (unsplashQuery.trim()) {
      searchUnsplash(unsplashQuery);
    }
  };

  // ============================================
  // BENEFITS & GUARANTEES
  // ============================================
  const addBenefit = () => {
    if (!newBenefit.trim()) return;
    setData(prev => ({
      ...prev,
      valueProp: { ...prev.valueProp, benefits: [...prev.valueProp.benefits, newBenefit.trim()] }
    }));
    setNewBenefit('');
  };

  const removeBenefit = (index: number) => {
    setData(prev => ({
      ...prev,
      valueProp: { ...prev.valueProp, benefits: prev.valueProp.benefits.filter((_, i) => i !== index) }
    }));
  };

  const addGuarantee = () => {
    if (!newGuarantee.trim()) return;
    setData(prev => ({
      ...prev,
      valueProp: { ...prev.valueProp, guarantees: [...prev.valueProp.guarantees, newGuarantee.trim()] }
    }));
    setNewGuarantee('');
  };

  const removeGuarantee = (index: number) => {
    setData(prev => ({
      ...prev,
      valueProp: { ...prev.valueProp, guarantees: prev.valueProp.guarantees.filter((_, i) => i !== index) }
    }));
  };

  // ============================================
  // NAVIGATION
  // ============================================
  const canProceed = () => {
    if (currentStep === 1) {
      return data.coreInfo.name.trim().length > 0 && 
             (data.coreInfo.priceType === 'free' || data.coreInfo.price > 0) &&
             data.valueProp.description.trim().length > 0;
    }
    if (currentStep === 2) {
      // Email is always required
      if (!data.delivery.emailSubject?.trim() || !data.delivery.emailBody?.trim()) {
        return false;
      }
      
      // Validate based on delivery method
      if (data.delivery.method === 'redirect') {
        return data.delivery.redirectUrl && data.delivery.redirectUrl.trim().length > 0;
      }
      
      // For hosted and email-only, email validation is enough at this stage
      // (hosted content can be added after publishing from dashboard)
      return true;
    }
    return true;
  };

  // Get list of missing required fields for current step
  const getMissingFields = (): string[] => {
    const missing: string[] = [];
    
    if (currentStep === 1) {
      if (!data.coreInfo.name.trim()) {
        missing.push('Product Name');
      }
      if (data.coreInfo.priceType !== 'free' && !data.coreInfo.price) {
        missing.push('Price');
      }
      if (!data.valueProp.description.trim()) {
        missing.push('Description');
      }
    }
    
    if (currentStep === 2) {
      // Email is always required
      if (!data.delivery.emailSubject?.trim()) {
        missing.push('Email Subject');
      }
      if (!data.delivery.emailBody?.trim()) {
        missing.push('Email Body');
      }
      
      // Method-specific validation
      if (data.delivery.method === 'redirect' && !data.delivery.redirectUrl?.trim()) {
        missing.push('Redirect URL');
      }
    }
    
    if (currentStep === 3) {
      if (!data.publish.slug.trim() || data.publish.slug.trim().length < 3) {
        missing.push('URL Slug (min 3 characters)');
      }
      if (!data.publish.metaTitle.trim()) {
        missing.push('Page Title');
      }
    }
    
    return missing;
  };

  const canPublish = () => {
    return data.coreInfo.name.trim().length > 0 &&
           (data.coreInfo.priceType === 'free' || data.coreInfo.price > 0) &&
           data.valueProp.description.trim().length > 0 &&
           data.publish.slug.trim().length >= 3 &&
           data.publish.metaTitle.trim().length > 0 &&
           slugStatus !== 'taken' &&
           slugStatus !== 'checking';
  };

  // Get all missing fields for publishing (combines all steps)
  const getMissingFieldsForPublish = (): string[] => {
    const missing: string[] = [];
    
    // Step 1 requirements
    if (!data.coreInfo.name.trim()) missing.push('Product Name');
    if (data.coreInfo.priceType !== 'free' && !data.coreInfo.price) missing.push('Price');
    if (!data.valueProp.description.trim()) missing.push('Description');
    
    // Step 3 requirements
    if (!data.publish.slug.trim() || data.publish.slug.trim().length < 3) missing.push('URL Slug');
    if (!data.publish.metaTitle.trim()) missing.push('Page Title');
    if (slugStatus === 'taken') missing.push('Available URL (current is taken)');
    
    return missing;
  };

  // ============================================
  // PUBLISH
  // ============================================
  const handlePublish = async () => {
    if (!canPublish()) {
      const missing = getMissingFieldsForPublish();
      alert(`Please complete required fields: ${missing.join(', ')}`);
      return;
    }

    setIsPublishing(true);
    try {
      const slug = data.publish.slug.toLowerCase().trim();
      
      // Validate slug
      if (!/^[a-z0-9-]{3,50}$/.test(slug)) {
        alert('URL must be 3-50 characters, lowercase letters, numbers, and hyphens only');
        setIsPublishing(false);
        return;
      }

      // Check slug availability (only if different from current or new)
      const slugRef = doc(db, 'slugs', slug);
      const slugDoc = await getDoc(slugRef);
      if (slugDoc.exists() && slugDoc.data().productId !== productId) {
        alert('This URL is already taken');
        setIsPublishing(false);
        return;
      }

      // Check if there's an existing published page for this product
      const publishedRef = doc(db, 'published_pages', slug);
      const existingPublished = await getDoc(publishedRef);
      const originalPublishedAt = existingPublished.exists() 
        ? existingPublished.data().publishedAt 
        : new Date();

      // Register/update slug
      await setDoc(slugRef, {
        productId,
        userId,
        createdAt: slugDoc.exists() ? slugDoc.data().createdAt : new Date(),
        lastUpdated: new Date(),
      });

      // Create or update public page (preserve original publishedAt)
      await setDoc(publishedRef, cleanData({
        userId,
        productId,
        slug,
        salesPage: data,
        publishedAt: originalPublishedAt, // Preserve original publish date
        lastUpdated: new Date(),
        productName: data.coreInfo.name,
        price: data.coreInfo.price,
        priceType: data.coreInfo.priceType,
        metaTitle: data.publish.metaTitle,
        metaDescription: data.publish.metaDescription,
      }));

      // Update product document
      const productRef = doc(db, 'users', userId, 'products', productId);
      await updateDoc(productRef, cleanData({
        'salesPage.publish.status': 'published',
        'salesPage.publish.publishedAt': isAlreadyPublished ? data.publish.publishedAt : new Date(),
        published: true,
        lastUpdated: new Date(),
      }));

      // Update the original idea's status if this came from Co-Pilot (only on first publish)
      if (data.sourceSessionId && !isAlreadyPublished) {
        try {
          const sessionRef = doc(db, 'users', userId, 'productCoPilotSessions', data.sourceSessionId);
          await updateDoc(sessionRef, {
            salesPageStatus: 'published',
            publishedAt: new Date(),
          });
        } catch (error) {
          // Non-critical error, don't block publish
          console.error('Error updating idea status:', error);
        }
      }

      setIsAlreadyPublished(true);
      
      // Navigate immediately - the dashboard will show the updated state
      navigate('/dashboard');

    } catch (error) {
      console.error('Publish error:', error);
      alert('Failed to publish. Please try again.');
      setIsPublishing(false);
    }
    // Note: Don't set isPublishing to false on success - we're navigating away
  };

  // ============================================
  // LOADING STATE
  // ============================================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 text-gray-900 dark:text-neutral-100">
      {/* PUBLISHING OVERLAY */}
      {isPublishing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-sm mx-4">
            <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Loader className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isAlreadyPublished ? 'Updating Your Page...' : 'Publishing Your Page...'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-neutral-400 text-center">
              {isAlreadyPublished 
                ? 'Saving your changes to the live page'
                : 'Making your sales page live for the world to see'
              }
            </p>
          </div>
        </div>
      )}

      {/* PREVIEW CONFIRMATION MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950">
          {/* Preview Header */}
          <div className="sticky top-0 z-10 bg-purple-600 text-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5" />
                <div>
                  <div className="font-semibold">Preview Your Sales Page</div>
                  <div className="text-xs text-purple-200">
                    Review how customers will see your page before publishing
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Edit
                </button>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    handlePublish();
                  }}
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  <Rocket className="w-4 h-4" />
                  Confirm & Publish
                </button>
              </div>
            </div>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-auto">
            <SalesPageContent 
              data={data}
              onCtaClick={() => {
                alert('Preview Mode\n\nButtons will work after publishing.');
              }}
            />
          </div>

          {/* Bottom Sticky Bar */}
          <div className="sticky bottom-0 bg-neutral-900 border-t border-neutral-800 px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <p className="text-sm text-neutral-400">
                Scroll through to review your entire sales page
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm font-medium transition-colors"
                >
                  Back to Edit
                </button>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    handlePublish();
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  <Rocket className="w-4 h-4" />
                  Confirm & Publish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* HEADER */}
      <header className="border-b border-gray-200 dark:border-gray-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold">
                    {data.coreInfo.name || 'New Product'}
                  </h1>
                  {isAlreadyPublished && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-600 dark:text-green-400 rounded-full border border-green-500/30">
                      Live
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-500 dark:text-neutral-400">
                  Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Save Status */}
              <div className="flex items-center gap-2">
                {isSaving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin text-yellow-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-500 dark:text-neutral-400">Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-500 dark:text-neutral-400">Saved</span>
                  </>
                )}
              </div>

              {/* Preview Toggle */}
              <div className="flex items-center gap-1 bg-gray-200 dark:bg-neutral-800 rounded-lg p-1">
                <button
                  onClick={() => setPreviewMode('desktop')}
                  className={`p-2 rounded ${previewMode === 'desktop' ? 'bg-white dark:bg-gray-300 dark:bg-neutral-700' : ''}`}
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={`p-2 rounded ${previewMode === 'mobile' ? 'bg-white dark:bg-gray-300 dark:bg-neutral-700' : ''}`}
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pb-4">
          <div className="flex gap-2">
            {STEPS.map((step) => (
              <div key={step.id} className="flex-1">
                <div
                  className={`h-2 rounded-full transition-colors ${
                    step.id <= currentStep ? 'bg-purple-600' : 'bg-gray-200 dark:bg-neutral-800'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* SUCCESS BANNER */}
      {publishSuccess && (
        <div className="bg-green-500/10 border-b border-green-500/30 px-6 py-3">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            <p className="text-green-400">Your page is live! Redirecting to dashboard...</p>
          </div>
        </div>
      )}

      {/* CO-PILOT BANNER */}
      {isPrefilledFromCoPilot && currentStep === 1 && (
        <div className="bg-purple-500/10 border-b border-purple-500/30 px-6 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <p className="text-sm text-purple-400">
              Pre-filled from your Product Co-Pilot. Review and customize!
            </p>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="flex h-[calc(100vh-140px)]">
        {/* LEFT: FORM */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-8">
            
            {/* ============================================ */}
            {/* STEP 1: CONTENT */}
            {/* ============================================ */}
            {currentStep === 1 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Product Content</h2>
                  <p className="text-gray-500 dark:text-neutral-400">Design your page and add your product details</p>
                </div>

                {/* ============================================ */}
                {/* DESIGN SETTINGS - TOP */}
                {/* ============================================ */}
                
                {/* Page Theme */}
                <div>
                  <label className="block text-sm font-medium mb-2">Page Theme</label>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Selecting a preset will reset all color settings below
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setData(prev => ({
                        ...prev,
                        design: { 
                          ...prev.design, 
                          backgroundColor: '#f8fafc',
                          cardColor: '#FFFFFF',
                          primaryColor: '#6366F1',
                          textColor: '#1a1a1a'
                        }
                      }))}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                        (data.design.backgroundColor === '#f8fafc' || data.design.backgroundColor === '#FFFFFF') && data.design.cardColor === '#FFFFFF'
                          ? 'border-purple-500'
                          : 'border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <Sun className="w-5 h-5 text-yellow-500" />
                        <span className="font-medium text-gray-900 dark:text-white">Light</span>
                      </div>
                      {/* Visual preview showing background + card */}
                      <div className="h-12 rounded-lg p-1.5" style={{ backgroundColor: '#f8fafc' }}>
                        <div className="h-full rounded-md shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
                          <div className="flex items-center justify-center h-full">
                            <div className="w-8 h-1.5 rounded-full" style={{ backgroundColor: '#6366F1' }} />
                          </div>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => setData(prev => ({
                        ...prev,
                        design: { 
                          ...prev.design, 
                          backgroundColor: '#0A0A0A',
                          cardColor: '#171717',
                          primaryColor: '#6366F1',
                          textColor: '#E5E5E5'
                        }
                      }))}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                        data.design.backgroundColor === '#0A0A0A' && data.design.cardColor === '#171717'
                          ? 'border-purple-500'
                          : 'border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <Moon className="w-5 h-5 text-purple-400" />
                        <span className="font-medium text-gray-900 dark:text-white">Dark</span>
                      </div>
                      {/* Visual preview showing background + card */}
                      <div className="h-12 rounded-lg p-1.5" style={{ backgroundColor: '#0A0A0A' }}>
                        <div className="h-full rounded-md shadow-sm" style={{ backgroundColor: '#171717' }}>
                          <div className="flex items-center justify-center h-full">
                            <div className="w-8 h-1.5 rounded-full" style={{ backgroundColor: '#6366F1' }} />
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Background Color */}
                <div>
                  <label className="block text-sm font-medium mb-3">Page Background</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      // Dark backgrounds
                      { name: 'Midnight', value: '#0A0A0A' },
                      { name: 'Charcoal', value: '#1a1a1a' },
                      { name: 'Navy', value: '#0f172a' },
                      { name: 'Dark Slate', value: '#1e293b' },
                      { name: 'Dark Purple', value: '#1e1b4b' },
                      { name: 'Dark Teal', value: '#134e4a' },
                      // Light backgrounds
                      { name: 'White', value: '#FFFFFF' },
                      { name: 'Snow', value: '#f8fafc' },
                      { name: 'Pearl', value: '#f1f5f9' },
                      { name: 'Cream', value: '#fefce8' },
                      { name: 'Blush', value: '#fff1f2' },
                      { name: 'Mint', value: '#ecfdf5' },
                      // Colored backgrounds
                      { name: 'Soft Purple', value: '#faf5ff' },
                      { name: 'Soft Blue', value: '#eff6ff' },
                      { name: 'Warm Gray', value: '#fafaf9' },
                      { name: 'Cool Gray', value: '#f9fafb' },
                    ].map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setData(prev => ({
                          ...prev,
                          design: { ...prev.design, backgroundColor: color.value }
                        }))}
                        title={color.name}
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${
                          data.design.backgroundColor?.toLowerCase() === color.value.toLowerCase()
                            ? 'border-purple-500 scale-110 ring-2 ring-purple-500 ring-offset-1 dark:ring-offset-neutral-900'
                            : 'border-gray-300 dark:border-neutral-600 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.value }}
                      />
                    ))}
                    {/* Custom color picker */}
                    <div className="relative">
                      <input
                        type="color"
                        value={data.design.backgroundColor || '#0A0A0A'}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          design: { ...prev.design, backgroundColor: e.target.value }
                        }))}
                        className="w-8 h-8 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-neutral-600"
                        title="Custom color"
                      />
                    </div>
                  </div>
                </div>

                {/* Card Color */}
                <div>
                  <label className="block text-sm font-medium mb-3">Card Color</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      // Dark cards
                      { name: 'Black', value: '#171717' },
                      { name: 'Dark Gray', value: '#1f1f1f' },
                      { name: 'Charcoal', value: '#262626' },
                      { name: 'Slate', value: '#1e293b' },
                      { name: 'Navy', value: '#1e1b4b' },
                      { name: 'Dark Teal', value: '#134e4a' },
                      // Light cards
                      { name: 'White', value: '#FFFFFF' },
                      { name: 'Snow', value: '#fafafa' },
                      { name: 'Pearl', value: '#f5f5f5' },
                      { name: 'Cream', value: '#fef9e7' },
                      { name: 'Blush', value: '#fef2f2' },
                      { name: 'Mint', value: '#f0fdf4' },
                    ].map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setData(prev => ({
                          ...prev,
                          design: { ...prev.design, cardColor: color.value }
                        }))}
                        title={color.name}
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${
                          (data.design.cardColor || '#171717').toLowerCase() === color.value.toLowerCase()
                            ? 'border-purple-500 scale-110 ring-2 ring-purple-500 ring-offset-1 dark:ring-offset-neutral-900'
                            : 'border-gray-300 dark:border-neutral-600 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.value }}
                      />
                    ))}
                    {/* Custom color picker */}
                    <div className="relative">
                      <input
                        type="color"
                        value={data.design.cardColor || '#171717'}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          design: { ...prev.design, cardColor: e.target.value }
                        }))}
                        className="w-8 h-8 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-neutral-600"
                        title="Custom color"
                      />
                    </div>
                  </div>
                </div>

                {/* Brand Color */}
                <div>
                  <label className="block text-sm font-medium mb-3">Brand Color</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: 'Purple', value: '#8B5CF6' },
                      { name: 'Blue', value: '#3B82F6' },
                      { name: 'Green', value: '#10B981' },
                      { name: 'Orange', value: '#F97316' },
                      { name: 'Pink', value: '#EC4899' },
                      { name: 'Red', value: '#EF4444' },
                      { name: 'Yellow', value: '#EAB308' },
                      { name: 'Teal', value: '#14B8A6' },
                    ].map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setData(prev => ({
                          ...prev,
                          design: { ...prev.design, primaryColor: color.value }
                        }))}
                        title={color.name}
                        className={`w-10 h-10 rounded-full border-2 transition-all ${
                          data.design.primaryColor === color.value
                            ? 'border-white dark:border-white scale-110 ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-neutral-900'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.value }}
                      />
                    ))}
                    {/* Custom color picker */}
                    <div className="relative">
                      <input
                        type="color"
                        value={data.design.primaryColor}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          design: { ...prev.design, primaryColor: e.target.value }
                        }))}
                        className="w-10 h-10 rounded-full cursor-pointer border-2 border-gray-300 dark:border-neutral-600 bg-transparent"
                        title="Custom color"
                      />
                    </div>
                  </div>
                </div>

                {/* Button Style */}
                <div>
                  <label className="block text-sm font-medium mb-3">Button Style</label>
                  <div className="flex gap-3">
                    {([
                      { id: 'rounded' as const, label: 'Rounded', radius: '8px' },
                      { id: 'pill' as const, label: 'Pill', radius: '9999px' },
                      { id: 'square' as const, label: 'Square', radius: '4px' },
                    ]).map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setData(prev => ({
                          ...prev,
                          design: { ...prev.design, buttonStyle: style.id }
                        }))}
                        className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                          data.design.buttonStyle === style.id
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600'
                        }`}
                      >
                        <div 
                          className="h-8 w-full flex items-center justify-center text-white text-sm font-medium"
                          style={{ 
                            backgroundColor: data.design.primaryColor,
                            borderRadius: style.radius
                          }}
                        >
                          {style.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200 dark:border-neutral-800" />

                {/* ============================================ */}
                {/* PRODUCT CONTENT */}
                {/* ============================================ */}

                {/* Product Name */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Product Name <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={data.coreInfo.name}
                    onChange={(e) => {
                      setData(prev => ({
                        ...prev,
                        coreInfo: { ...prev.coreInfo, name: e.target.value }
                      }));
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.max(48, e.target.scrollHeight)}px`;
                    }}
                    onFocus={(e) => {
                      scrollToPreviewSection('preview-title');
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.max(48, e.target.scrollHeight)}px`;
                    }}
                    placeholder="e.g., Instagram Growth Masterclass"
                    maxLength={60}
                    rows={1}
                    className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 rounded-lg focus:border-purple-500 focus:outline-none resize-none overflow-hidden"
                    style={{ minHeight: '48px' }}
                  />
                  <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1 text-right">{data.coreInfo.name.length}/60</p>
                </div>

                {/* Tagline */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium">Tagline</label>
                    <button
                      onClick={handleGenerateTagline}
                      disabled={isGeneratingTagline || !data.coreInfo.name}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded-lg disabled:opacity-50"
                    >
                      {isGeneratingTagline ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Generate
                    </button>
                  </div>
                  <textarea
                    value={data.coreInfo.tagline}
                    onChange={(e) => {
                      setData(prev => ({
                        ...prev,
                        coreInfo: { ...prev.coreInfo, tagline: e.target.value }
                      }));
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.max(48, e.target.scrollHeight)}px`;
                    }}
                    onFocus={(e) => {
                      scrollToPreviewSection('preview-title');
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.max(48, e.target.scrollHeight)}px`;
                    }}
                    placeholder="e.g., Go from 0 to 10K followers in 90 days"
                    maxLength={100}
                    rows={1}
                    className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 rounded-lg focus:border-purple-500 focus:outline-none resize-none overflow-hidden"
                    style={{ minHeight: '48px' }}
                  />
                  <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1 text-right">{data.coreInfo.tagline.length}/100</p>
                </div>

                {/* Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Price{data.coreInfo.priceType === 'subscription' && <span className="text-gray-500 dark:text-neutral-400 font-normal"> /month</span>} <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-neutral-400">
                        {currencySymbols[data.coreInfo.currency]}
                      </span>
                      <input
                        type="number"
                        value={data.coreInfo.price || ''}
                        onFocus={() => scrollToPreviewSection('preview-checkout')}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          coreInfo: { ...prev.coreInfo, price: parseFloat(e.target.value) || 0 }
                        }))}
                        disabled={data.coreInfo.priceType === 'free'}
                        placeholder="0.00"
                        className={`w-full pl-10 py-3 bg-white dark:bg-neutral-900 border border-gray-300 dark:border-gray-300 dark:border-neutral-700 rounded-lg focus:border-purple-500 focus:outline-none disabled:opacity-50 ${
                          data.coreInfo.priceType === 'subscription' ? 'pr-12' : 'pr-4'
                        }`}
                      />
                      {data.coreInfo.priceType === 'subscription' && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-neutral-400">/mo</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Type</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setData(prev => ({
                          ...prev,
                          coreInfo: { ...prev.coreInfo, priceType: 'one-time' }
                        }))}
                        className={`flex-1 py-3 rounded-lg border transition-colors text-sm ${
                          data.coreInfo.priceType === 'one-time'
                            ? 'border-purple-500 bg-purple-500/20'
                            : 'border-gray-300 dark:border-neutral-700 hover:border-neutral-600'
                        }`}
                      >
                        One-time
                      </button>
                      <button
                        onClick={() => setData(prev => ({
                          ...prev,
                          coreInfo: { ...prev.coreInfo, priceType: 'subscription' }
                        }))}
                        className={`flex-1 py-3 rounded-lg border transition-colors text-sm ${
                          data.coreInfo.priceType === 'subscription'
                            ? 'border-purple-500 bg-purple-500/20'
                            : 'border-gray-300 dark:border-neutral-700 hover:border-neutral-600'
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setData(prev => ({
                          ...prev,
                          coreInfo: { ...prev.coreInfo, priceType: 'free', price: 0 }
                        }))}
                        className={`flex-1 py-3 rounded-lg border transition-colors text-sm ${
                          data.coreInfo.priceType === 'free'
                            ? 'border-purple-500 bg-purple-500/20'
                            : 'border-gray-300 dark:border-neutral-700 hover:border-neutral-600'
                        }`}
                      >
                        Free
                      </button>
                    </div>
                  </div>
                </div>

                {/* Image (Optional) */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Product Image <span className="text-gray-400 dark:text-neutral-500">(optional)</span>
                  </label>
                  {data.visuals.headerImage ? (
                    <div className="space-y-3">
                      <div className="relative group">
                        <div 
                          className={`relative w-full h-48 rounded-lg overflow-hidden ${isDraggingImagePosition ? 'cursor-grabbing' : 'cursor-grab'}`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setIsDraggingImagePosition(true);
                            setDragStart({ x: e.clientX, y: e.clientY });
                            const currentPos = data.visuals.headerImagePosition ?? { x: 50, y: 50 };
                            setDragStartPosition(typeof currentPos === 'number' ? { x: 50, y: currentPos } : currentPos);
                          }}
                          onMouseMove={(e) => {
                            if (!isDraggingImagePosition) return;
                            const deltaX = e.clientX - dragStart.x;
                            const deltaY = e.clientY - dragStart.y;
                            const zoom = data.visuals.headerImageZoom ?? 1;
                            // Sensitivity scales with zoom - more zoom = more movement range
                            const sensitivity = 0.3 / zoom;
                            const newX = Math.max(0, Math.min(100, dragStartPosition.x - (deltaX * sensitivity)));
                            const newY = Math.max(0, Math.min(100, dragStartPosition.y + (deltaY * sensitivity)));
                            setData(prev => ({
                              ...prev,
                              visuals: { ...prev.visuals, headerImagePosition: { x: newX, y: newY } }
                            }));
                          }}
                          onMouseUp={() => setIsDraggingImagePosition(false)}
                          onMouseLeave={() => setIsDraggingImagePosition(false)}
                        >
                          <img
                            src={data.visuals.headerImage}
                            alt="Product"
                            className="w-full h-full object-cover pointer-events-none select-none"
                            style={{ 
                              objectPosition: `${(data.visuals.headerImagePosition as { x: number; y: number })?.x ?? 50}% ${(data.visuals.headerImagePosition as { x: number; y: number })?.y ?? 50}%`,
                              transform: `scale(${data.visuals.headerImageZoom ?? 1})`,
                              transformOrigin: `${(data.visuals.headerImagePosition as { x: number; y: number })?.x ?? 50}% ${(data.visuals.headerImagePosition as { x: number; y: number })?.y ?? 50}%`
                            }}
                            draggable={false}
                          />
                          {/* Drag indicator */}
                          <div className={`absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity ${isDraggingImagePosition ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            <div className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                              </svg>
                              Drag to reposition
                            </div>
                          </div>
                        </div>
                        {/* Attribution */}
                        {data.visuals.headerImageAttribution && (
                          <div className="absolute bottom-2 left-2 z-10">
                            <a
                              href={data.visuals.headerImageAttribution.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-white/70 hover:text-white/90 bg-black/50 px-2 py-1 rounded backdrop-blur-sm inline-flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Photo by {data.visuals.headerImageAttribution.name}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                        {/* Action buttons */}
                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button
                            onClick={() => setShowImagePicker(true)}
                            className="p-2 bg-black/50 hover:bg-black/70 rounded-lg backdrop-blur-sm"
                          >
                            <Image className="w-4 h-4 text-white" />
                          </button>
                          <button
                            onClick={() => setData(prev => ({
                              ...prev,
                              visuals: { ...prev.visuals, headerImage: undefined, headerImageAttribution: undefined, headerImagePosition: { x: 50, y: 50 }, headerImageZoom: 1 }
                            }))}
                            className="p-2 bg-red-500/80 hover:bg-red-500 rounded-lg backdrop-blur-sm"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      </div>
                      {/* Zoom Slider */}
                      <div className="flex items-center gap-3">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                        </svg>
                        <input
                          type="range"
                          min="1"
                          max="2"
                          step="0.1"
                          value={data.visuals.headerImageZoom ?? 1}
                          onChange={(e) => setData(prev => ({
                            ...prev,
                            visuals: { ...prev.visuals, headerImageZoom: parseFloat(e.target.value) }
                          }))}
                          className="flex-1 h-1.5 bg-gray-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                        />
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => setShowImagePicker(true)}
                      className="h-32 rounded-lg border-2 border-dashed border-gray-300 dark:border-neutral-700 hover:border-purple-500/50 cursor-pointer flex items-center justify-center bg-gray-100 dark:bg-neutral-800/30 hover:bg-gray-200 dark:hover:bg-neutral-800/50 transition-all"
                    >
                      <div className="text-center">
                        <Image className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-neutral-500" />
                        <p className="text-sm text-gray-500 dark:text-neutral-400">Click to add image</p>
                        <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1">Stock photos or upload your own</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Creator Section */}
                <div className="border-t border-gray-200 dark:border-gray-200 dark:border-neutral-800 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <label className="block text-sm font-medium">Your Profile</label>
                      <p className="text-xs text-gray-400 dark:text-neutral-500">Show your info on the sales page</p>
                    </div>
                    <button
                      onClick={() => setData(prev => ({
                        ...prev,
                        creator: { ...prev.creator, showCreator: !prev.creator.showCreator }
                      }))}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        data.creator.showCreator ? 'bg-purple-600' : 'bg-gray-300 dark:bg-neutral-700'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        data.creator.showCreator ? 'translate-x-7' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  {data.creator.showCreator && (
                    <div className="space-y-4 p-4 bg-gray-100 dark:bg-neutral-800/30 rounded-lg">
                      <div className="flex items-start gap-4">
                        {/* Photo with upload */}
                        <div className="flex-shrink-0 relative group">
                          {data.creator.photo ? (
                            <img 
                              src={data.creator.photo} 
                              alt={data.creator.name}
                              className="w-16 h-16 rounded-full object-cover border-2 border-purple-500"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center text-2xl font-bold text-white">
                              {data.creator.name ? data.creator.name.charAt(0).toUpperCase() : '?'}
                            </div>
                          )}
                          {/* Upload overlay */}
                          <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                            <Upload className="w-5 h-5 text-white" />
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,.png,.jpg,.jpeg,.gif,.webp"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file || !userId || !productId) {
                                  console.log('Missing:', { file: !!file, userId, productId });
                                  return;
                                }
                                
                                // Validate file type
                                const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
                                if (!validTypes.includes(file.type) && !file.name.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
                                  alert('Please upload an image file (PNG, JPG, GIF, or WebP)');
                                  return;
                                }
                                
                                try {
                                  const storageRef = ref(storage, `users/${userId}/images/creator-photo-${Date.now()}`);
                                  await uploadBytes(storageRef, file);
                                  const url = await getDownloadURL(storageRef);
                                  setData(prev => ({
                                    ...prev,
                                    creator: { ...prev.creator, photo: url }
                                  }));
                                } catch (err) {
                                  console.error('Error uploading creator photo:', err);
                                  alert('Failed to upload image. Please try again.');
                                }
                              }}
                            />
                          </label>
                        </div>
                        
                        {/* Name & Bio */}
                        <div className="flex-1 space-y-3">
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-neutral-400 mb-1">Name</label>
                            <textarea
                              value={data.creator.name}
                              onChange={(e) => {
                                setData(prev => ({
                                  ...prev,
                                  creator: { ...prev.creator, name: e.target.value }
                                }));
                                e.target.style.height = 'auto';
                                e.target.style.height = `${Math.max(38, e.target.scrollHeight)}px`;
                              }}
                              onFocus={(e) => {
                                scrollToPreviewSection('preview-creator');
                                e.target.style.height = 'auto';
                                e.target.style.height = `${Math.max(38, e.target.scrollHeight)}px`;
                              }}
                              placeholder="Your name"
                              maxLength={40}
                              rows={1}
                              className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 rounded-lg focus:border-purple-500 focus:outline-none text-sm resize-none overflow-hidden"
                              style={{ minHeight: '38px' }}
                            />
                            <p className="text-[10px] text-gray-400 dark:text-neutral-500 mt-1 text-right">{data.creator.name.length}/40</p>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-neutral-400 mb-1">Short Bio <span className="text-gray-400 dark:text-neutral-600">(optional)</span></label>
                            <textarea
                              value={data.creator.bio || ''}
                              onChange={(e) => {
                                setData(prev => ({
                                  ...prev,
                                  creator: { ...prev.creator, bio: e.target.value }
                                }));
                                e.target.style.height = 'auto';
                                e.target.style.height = `${Math.max(38, e.target.scrollHeight)}px`;
                              }}
                              onFocus={(e) => {
                                scrollToPreviewSection('preview-creator');
                                e.target.style.height = 'auto';
                                e.target.style.height = `${Math.max(38, e.target.scrollHeight)}px`;
                              }}
                              placeholder="e.g., Course Creator, Coach, Author"
                              maxLength={50}
                              rows={1}
                              className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 rounded-lg focus:border-purple-500 focus:outline-none text-sm resize-none overflow-hidden"
                              style={{ minHeight: '38px' }}
                            />
                            <p className="text-[10px] text-gray-400 dark:text-neutral-500 mt-1 text-right">{(data.creator.bio || '').length}/50</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Social Links */}
                      <div className="mt-4 pt-4 border-t border-gray-300 dark:border-neutral-700">
                        <label className="block text-xs text-gray-500 dark:text-neutral-400 mb-2">Social Links <span className="text-gray-400 dark:text-neutral-600">(optional)</span></label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="url"
                            value={data.creator.socialLinks?.instagram || ''}
                            onChange={(e) => setData(prev => ({
                              ...prev,
                              creator: { 
                                ...prev.creator, 
                                socialLinks: { ...prev.creator.socialLinks, instagram: e.target.value }
                              }
                            }))}
                            onFocus={() => scrollToPreviewSection('preview-creator')}
                            placeholder="Instagram URL"
                            className="px-3 py-2 bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 rounded-lg focus:border-purple-500 focus:outline-none text-xs"
                          />
                          <input
                            type="url"
                            value={data.creator.socialLinks?.twitter || ''}
                            onChange={(e) => setData(prev => ({
                              ...prev,
                              creator: { 
                                ...prev.creator, 
                                socialLinks: { ...prev.creator.socialLinks, twitter: e.target.value }
                              }
                            }))}
                            onFocus={() => scrollToPreviewSection('preview-creator')}
                            placeholder="X (Twitter) URL"
                            className="px-3 py-2 bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 rounded-lg focus:border-purple-500 focus:outline-none text-xs"
                          />
                          <input
                            type="url"
                            value={data.creator.socialLinks?.youtube || ''}
                            onChange={(e) => setData(prev => ({
                              ...prev,
                              creator: { 
                                ...prev.creator, 
                                socialLinks: { ...prev.creator.socialLinks, youtube: e.target.value }
                              }
                            }))}
                            onFocus={() => scrollToPreviewSection('preview-creator')}
                            placeholder="YouTube URL"
                            className="px-3 py-2 bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 rounded-lg focus:border-purple-500 focus:outline-none text-xs"
                          />
                          <input
                            type="url"
                            value={data.creator.socialLinks?.website || ''}
                            onChange={(e) => setData(prev => ({
                              ...prev,
                              creator: { 
                                ...prev.creator, 
                                socialLinks: { ...prev.creator.socialLinks, website: e.target.value }
                              }
                            }))}
                            onFocus={() => scrollToPreviewSection('preview-creator')}
                            placeholder="Website URL"
                            className="px-3 py-2 bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 rounded-lg focus:border-purple-500 focus:outline-none text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium">
                      Description <span className="text-red-400">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      {data.valueProp.description.trim().length > 0 && (
                        <button
                          onClick={handleImproveDescription}
                          disabled={isImprovingDescription}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded-lg disabled:opacity-50"
                        >
                          {isImprovingDescription ? <Loader className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                          Improve
                        </button>
                      )}
                      <button
                        onClick={handleGenerateDescription}
                        disabled={isGeneratingDescription || !data.coreInfo.name}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded-lg disabled:opacity-50"
                      >
                        {isGeneratingDescription ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Generate
                      </button>
                    </div>
                  </div>
                  <textarea
                    ref={descriptionRef}
                    value={data.valueProp.description}
                    onChange={(e) => setData(prev => ({
                      ...prev,
                      valueProp: { ...prev.valueProp, description: e.target.value }
                    }))}
                    onFocus={() => scrollToPreviewSection('preview-description')}
                    placeholder="What is your product and what will customers achieve?"
                    className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-gray-300 dark:border-gray-300 dark:border-neutral-700 rounded-lg focus:border-purple-500 focus:outline-none resize-none"
                    style={{ minHeight: '120px' }}
                    maxLength={1000}
                  />
                  <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1 text-right">{data.valueProp.description.length}/1000</p>
                </div>

                {/* Benefits */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium">What's Included</label>
                    <div className="flex items-center gap-2">
                      {data.valueProp.benefits.length > 0 && (
                        <button
                          onClick={handleEnhanceAllBenefits}
                          disabled={isEnhancingBenefits}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded-lg disabled:opacity-50"
                        >
                          {isEnhancingBenefits ? <Loader className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                          Improve All
                        </button>
                      )}
                      <button
                        onClick={handleSuggestBenefits}
                        disabled={isSuggestingBenefits || !data.coreInfo.name}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded-lg disabled:opacity-50"
                      >
                        {isSuggestingBenefits ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Suggest
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {(data.valueProp.benefits || []).map((benefit, index) => (
                      <div key={index} className="flex items-start gap-2 group">
                        <textarea
                          data-benefit-textarea
                          value={benefit}
                          onChange={(e) => {
                            const newBenefits = [...data.valueProp.benefits];
                            newBenefits[index] = e.target.value;
                            setData(prev => ({
                              ...prev,
                              valueProp: { ...prev.valueProp, benefits: newBenefits }
                            }));
                            // Auto-resize
                            e.target.style.height = 'auto';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                          }}
                          onFocus={(e) => {
                            // Ensure proper height on focus
                            e.target.style.height = 'auto';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                            scrollToPreviewSection('preview-benefits');
                          }}
                          rows={1}
                          className="flex-1 px-3 py-2 bg-white dark:bg-neutral-900 border border-gray-300 dark:border-gray-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:border-purple-500 resize-none overflow-hidden"
                          style={{ minHeight: '42px' }}
                        />
                        <div className="relative">
                          <button
                            onClick={() => handleEnhanceSingleBenefit(index)}
                            disabled={enhancingBenefitIndex === index}
                            className={`p-1.5 hover:bg-purple-600/20 text-purple-400 rounded mt-1.5 transition-opacity peer ${
                              enhancingBenefitIndex === index ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            {enhancingBenefitIndex === index ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          </button>
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-neutral-800 rounded whitespace-nowrap opacity-0 peer-hover:opacity-100 transition-opacity pointer-events-none z-50">
                            Improve
                          </span>
                        </div>
                        <button
                          onClick={() => removeBenefit(index)}
                          title="Remove"
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-600/20 text-red-400 rounded mt-1.5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <textarea
                        value={newBenefit}
                        onChange={(e) => {
                          setNewBenefit(e.target.value);
                          // Auto-resize
                          e.target.style.height = 'auto';
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        onFocus={() => scrollToPreviewSection('preview-benefits')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            addBenefit();
                            // Reset height after adding
                            e.currentTarget.style.height = '42px';
                          }
                        }}
                        placeholder="Add a benefit..."
                        rows={1}
                        className="flex-1 px-3 py-2 bg-white dark:bg-neutral-900 border border-gray-300 dark:border-gray-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:border-purple-500 resize-none overflow-hidden"
                        style={{ minHeight: '42px' }}
                      />
                      <button
                        onClick={() => {
                          addBenefit();
                        }}
                        disabled={!newBenefit.trim()}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg disabled:opacity-50 self-start"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Guarantees */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium">
                      Guarantees <span className="text-gray-400 dark:text-neutral-500">(optional)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      {data.valueProp.guarantees.length > 0 && (
                        <button
                          onClick={handleImproveGuarantees}
                          disabled={isImprovingGuarantees}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded-lg disabled:opacity-50"
                        >
                          {isImprovingGuarantees ? <Loader className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                          Improve All
                        </button>
                      )}
                      <button
                        onClick={handleSuggestGuarantees}
                        disabled={isLoadingGuarantees || !data.coreInfo.name}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded-lg disabled:opacity-50"
                      >
                        {isLoadingGuarantees ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Suggest
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {(data.valueProp.guarantees || []).map((guarantee, index) => (
                      <div key={index} className="flex items-start gap-2 group">
                        <textarea
                          data-guarantee-textarea
                          value={guarantee}
                          onChange={(e) => {
                            const newGuarantees = [...data.valueProp.guarantees];
                            newGuarantees[index] = e.target.value;
                            setData(prev => ({
                              ...prev,
                              valueProp: { ...prev.valueProp, guarantees: newGuarantees }
                            }));
                            // Auto-resize
                            e.target.style.height = 'auto';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                          }}
                          onFocus={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                            scrollToPreviewSection('preview-guarantees');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                            }
                          }}
                          rows={1}
                          className="flex-1 px-3 py-2 bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:border-purple-500 resize-none overflow-hidden"
                          style={{ minHeight: '42px' }}
                        />
                        <div className="relative">
                          <button
                            onClick={() => handleEnhanceSingleGuarantee(index)}
                            disabled={enhancingGuaranteeIndex === index}
                            className={`p-1.5 hover:bg-purple-600/20 text-purple-400 rounded mt-1.5 transition-opacity peer ${
                              enhancingGuaranteeIndex === index ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            {enhancingGuaranteeIndex === index ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          </button>
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-neutral-800 rounded whitespace-nowrap opacity-0 peer-hover:opacity-100 transition-opacity pointer-events-none z-50">
                            Improve
                          </span>
                        </div>
                        <button
                          onClick={() => removeGuarantee(index)}
                          title="Remove"
                          className="opacity-0 group-hover:opacity-100 p-1.5 mt-1.5 hover:bg-red-600/20 text-red-400 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <textarea
                        value={newGuarantee}
                        onChange={(e) => {
                          setNewGuarantee(e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        onFocus={() => scrollToPreviewSection('preview-guarantees')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            addGuarantee();
                          }
                        }}
                        placeholder="Add a guarantee..."
                        rows={1}
                        className="flex-1 px-3 py-2 bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:border-purple-500 resize-none overflow-hidden"
                        style={{ minHeight: '42px' }}
                      />
                      <button
                        onClick={addGuarantee}
                        disabled={!newGuarantee.trim()}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg disabled:opacity-50 self-start"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* CTA Button Text - Quick Options */}
                <div>
                  <label className="block text-sm font-medium mb-2">Button Text</label>
                  <div className="flex flex-wrap gap-2">
                    {['Buy Now', 'Get Instant Access', 'Start Learning', 'Download Now', 'Join Now', 'Enroll Now'].map((text) => (
                      <button
                        key={text}
                        onClick={() => {
                          setData(prev => ({ ...prev, design: { ...prev.design, ctaButtonText: text } }));
                          scrollToPreviewSection('preview-cta-button');
                        }}
                        className={`text-sm px-3 py-2 rounded-lg transition-all ${
                          data.design.ctaButtonText === text
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-700 dark:text-neutral-300'
                        }`}
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={data.design.ctaButtonText}
                    onChange={(e) => {
                      setData(prev => ({
                        ...prev,
                        design: { ...prev.design, ctaButtonText: e.target.value }
                      }));
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.max(48, e.target.scrollHeight)}px`;
                    }}
                    onFocus={(e) => {
                      scrollToPreviewSection('preview-cta-button');
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.max(48, e.target.scrollHeight)}px`;
                    }}
                    placeholder="Or type custom text..."
                    maxLength={30}
                    rows={1}
                    className="w-full mt-3 px-4 py-3 bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 rounded-lg focus:border-purple-500 focus:outline-none text-sm resize-none overflow-hidden"
                    style={{ minHeight: '48px' }}
                  />
                  <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1 text-right">{data.design.ctaButtonText.length}/30</p>
                </div>

                {/* Button Color */}
                <div>
                  <label className="block text-sm font-medium mb-2">Button Color</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {/* Use Brand Color option */}
                    <button
                      onClick={() => {
                        setData(prev => ({ ...prev, design: { ...prev.design, buttonColor: '' } }));
                        scrollToPreviewSection('preview-cta-button');
                      }}
                      className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                        !data.design.buttonColor
                          ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                          : 'border-gray-300 dark:border-neutral-700 text-gray-600 dark:text-neutral-400 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: data.design.primaryColor }}
                        />
                        Same as Brand
                      </div>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F97316',
                      '#EAB308', '#22C55E', '#14B8A6', '#3B82F6', '#1a1a1a'
                    ].map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          setData(prev => ({ ...prev, design: { ...prev.design, buttonColor: color } }));
                          scrollToPreviewSection('preview-cta-button');
                        }}
                        className={`w-8 h-8 rounded-lg transition-all ${
                          data.design.buttonColor === color
                            ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900'
                            : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    {/* Custom color picker */}
                    <div className="relative">
                      <input
                        type="color"
                        value={data.design.buttonColor || data.design.primaryColor}
                        onChange={(e) => {
                          setData(prev => ({ ...prev, design: { ...prev.design, buttonColor: e.target.value } }));
                          scrollToPreviewSection('preview-cta-button');
                        }}
                        className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer"
                      />
                      <div className={`w-8 h-8 rounded-lg border-2 border-dashed border-gray-300 dark:border-neutral-600 flex items-center justify-center text-gray-400 hover:border-gray-400`}>
                        +
                      </div>
                    </div>
                  </div>
                </div>

                {/* Button Size */}
                <div>
                  <label className="block text-sm font-medium mb-2">Button Size</label>
                  <div className="flex gap-2">
                    {([
                      { id: 'small', label: 'Small', padding: 'py-3' },
                      { id: 'medium', label: 'Medium', padding: 'py-4' },
                      { id: 'large', label: 'Large', padding: 'py-5' },
                    ] as const).map((size) => (
                      <button
                        key={size.id}
                        onClick={() => {
                          setData(prev => ({ ...prev, design: { ...prev.design, buttonSize: size.id } }));
                          scrollToPreviewSection('preview-cta-button');
                        }}
                        className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-all ${
                          (data.design.buttonSize || 'medium') === size.id
                            ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                            : 'border-gray-300 dark:border-neutral-700 text-gray-600 dark:text-neutral-400 hover:border-gray-400'
                        }`}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Advanced Settings (Collapsed) */}
                <div className="border-t border-gray-200 dark:border-neutral-800 pt-6">
                  <button
                    onClick={() => setShowCustomize(!showCustomize)}
                    className="flex items-center gap-2 text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    <Settings2 className="w-5 h-5" />
                    <span>Advanced Settings</span>
                    {showCustomize ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  
                  {showCustomize && (
                    <div className="mt-4 p-4 bg-gray-100 dark:bg-neutral-800/50 rounded-xl space-y-4">
                      <p className="text-sm text-gray-500 dark:text-neutral-400">
                        Fine-tune fonts, spacing, and layout
                      </p>
                      <SalesStepCustomize
                        data={{
                          coreInfo: data.coreInfo,
                          valueProp: data.valueProp,
                          visuals: data.visuals,
                          design: data.design,
                          publish: data.publish,
                        }}
                        updateData={(key, value) => {
                        setData(prev => ({ 
                            ...prev, 
                            [key]: { ...(prev[key as keyof SalesPageData] as object), ...value } 
                        }));
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}            {/* ============================================ */}
            {/* STEP 2: DELIVERY */}
            {/* ============================================ */}
            {currentStep === 2 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Configure Delivery</h2>
                  <p className="text-gray-500 dark:text-neutral-400">Set up how customers receive your product after purchase</p>
                </div>

                {/* SECTION 1: CONFIRMATION EMAIL */}
                <div className="bg-gray-100 dark:bg-neutral-900/50 border border-gray-200 dark:border-neutral-800 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Mail className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Confirmation Email</h3>
                      <p className="text-sm text-gray-500 dark:text-neutral-400">Sent to customers immediately after purchase</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Email Subject */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Email Subject <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={data.delivery.emailSubject}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          delivery: { ...prev.delivery, emailSubject: e.target.value }
                        }))}
                        placeholder="Your purchase is confirmed!"
                        maxLength={100}
                        className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg focus:border-purple-500 focus:outline-none"
                      />
                      <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1 text-right">
                        {data.delivery.emailSubject.length}/100
                      </p>
                    </div>

                    {/* Email Body */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Email Body <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        value={data.delivery.emailBody}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          delivery: { ...prev.delivery, emailBody: e.target.value }
                        }))}
                        placeholder="Write your confirmation email..."
                        rows={8}
                        className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg focus:border-purple-500 focus:outline-none resize-none font-mono text-sm"
                      />
                      
                      {/* Variable hints */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {[
                          { var: '{{customer_name}}', desc: "Customer's name" },
                          { var: '{{customer_email}}', desc: "Customer's email" },
                          { var: '{{product_name}}', desc: 'Your product name' },
                          { var: '{{access_button}}', desc: 'Access product button' },
                        ].map(v => (
                          <button
                            key={v.var}
                            onClick={() => setData(prev => ({
                              ...prev,
                              delivery: { ...prev.delivery, emailBody: prev.delivery.emailBody + v.var }
                            }))}
                            className="px-2 py-1 bg-gray-200 dark:bg-neutral-800 hover:bg-gray-300 dark:hover:bg-neutral-700 border border-gray-300 dark:border-neutral-700 rounded text-xs text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            title={v.desc}
                          >
                            {v.var}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Email Preview Toggle */}
                    <button
                      onClick={() => setShowEmailPreview(!showEmailPreview)}
                      className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300"
                    >
                      <Eye className="w-4 h-4" />
                      {showEmailPreview ? 'Hide Preview' : 'Show Preview'}
                    </button>

                    {/* Email Preview */}
                    {showEmailPreview && (
                      <div className="bg-white rounded-lg p-4 text-gray-900 border border-gray-200">
                        <div className="border-b border-gray-200 pb-2 mb-3">
                          <p className="text-xs text-gray-500">Subject:</p>
                          <p className="font-medium">{data.delivery.emailSubject}</p>
                        </div>
                        <div className="whitespace-pre-wrap text-sm">
                          {data.delivery.emailBody
                            .replace(/\{\{customer_name\}\}/g, 'John')
                            .replace(/\{\{customer_email\}\}/g, 'john@example.com')
                            .replace(/\{\{product_name\}\}/g, data.coreInfo.name || 'Your Product')
                            .replace(/\{\{access_button\}\}/g, data.delivery.method !== 'email-only' 
                              ? '[Access Your Product]' 
                              : '')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION 2: DELIVERY METHOD */}
                <div className="bg-gray-100 dark:bg-neutral-900/50 border border-gray-200 dark:border-neutral-800 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <FileDown className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Product Delivery</h3>
                      <p className="text-sm text-gray-500 dark:text-neutral-400">How do you want to deliver your product?</p>
                    </div>
                  </div>

                  {/* Delivery Method Options */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Email Only */}
                    <button
                      onClick={() => setData(prev => ({
                        ...prev,
                        delivery: { ...prev.delivery, method: 'email-only' }
                      }))}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        data.delivery.method === 'email-only'
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-gray-300 dark:border-neutral-700 hover:border-gray-400 dark:hover:border-neutral-600'
                      }`}
                    >
                      <Mail className={`w-6 h-6 mb-2 ${data.delivery.method === 'email-only' ? 'text-purple-500 dark:text-purple-400' : 'text-gray-400 dark:text-neutral-400'}`} />
                      <h4 className="font-medium mb-1">Email Only</h4>
                      <p className="text-xs text-gray-500 dark:text-neutral-400">
                        Just send the confirmation email. Perfect for services or manual delivery.
                      </p>
                    </button>

                    {/* Host on LaunchPad */}
                    <button
                      onClick={() => setData(prev => ({
                        ...prev,
                        delivery: { ...prev.delivery, method: 'hosted' }
                      }))}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        data.delivery.method === 'hosted'
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-gray-300 dark:border-neutral-700 hover:border-gray-400 dark:hover:border-neutral-600'
                      }`}
                    >
                      <FileDown className={`w-6 h-6 mb-2 ${data.delivery.method === 'hosted' ? 'text-purple-500 dark:text-purple-400' : 'text-gray-400 dark:text-neutral-400'}`} />
                      <h4 className="font-medium mb-1">Host on LaunchPad</h4>
                      <p className="text-xs text-gray-500 dark:text-neutral-400">
                        Upload files, add videos, or create a content page.
                      </p>
                    </button>

                    {/* External Redirect */}
                    <button
                      onClick={() => setData(prev => ({
                        ...prev,
                        delivery: { ...prev.delivery, method: 'redirect' }
                      }))}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        data.delivery.method === 'redirect'
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-gray-300 dark:border-neutral-700 hover:border-gray-400 dark:hover:border-neutral-600'
                      }`}
                    >
                      <ExternalLink className={`w-6 h-6 mb-2 ${data.delivery.method === 'redirect' ? 'text-purple-500 dark:text-purple-400' : 'text-gray-400 dark:text-neutral-400'}`} />
                      <h4 className="font-medium mb-1">External Redirect</h4>
                      <p className="text-xs text-gray-500 dark:text-neutral-400">
                        Send customers to Teachable, Kajabi, or your own site.
                      </p>
                    </button>
                  </div>

                  {/* EMAIL ONLY */}
                  {data.delivery.method === 'email-only' && (
                    <div className="bg-white dark:bg-neutral-800/50 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Email Only Selected</p>
                          <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
                            Customers will receive the confirmation email above. Use this for services, coaching, or if you&apos;ll deliver the product manually.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* HOST ON LAUNCHPAD */}
                  {data.delivery.method === 'hosted' && (
                    <div className="space-y-4">
                      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                        <p className="text-sm text-purple-600 dark:text-purple-300">
                          Tip: Add files, videos, a Notion page, or create a custom content page. Customers will see a branded delivery page after purchase.
                        </p>
                      </div>
                      <div className="bg-white dark:bg-neutral-800/50 rounded-lg p-4 border border-gray-200 dark:border-neutral-700">
                        <div className="flex items-start gap-3">
                          <Settings2 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Full Delivery Editor Available</p>
                            <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
                              After publishing, access the full delivery editor from your dashboard to upload files, add videos, embed Notion pages, and create rich content pages.
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-white dark:bg-neutral-800/50 rounded-lg border border-gray-200 dark:border-neutral-700">
                          <FileText className="w-5 h-5 text-gray-400 mb-2" />
                          <p className="text-sm font-medium">Files</p>
                          <p className="text-xs text-gray-500 dark:text-neutral-400">PDFs, ZIPs, images</p>
                        </div>
                        <div className="p-3 bg-white dark:bg-neutral-800/50 rounded-lg border border-gray-200 dark:border-neutral-700">
                          <Eye className="w-5 h-5 text-gray-400 mb-2" />
                          <p className="text-sm font-medium">Videos</p>
                          <p className="text-xs text-gray-500 dark:text-neutral-400">YouTube, Vimeo, Loom</p>
                        </div>
                        <div className="p-3 bg-white dark:bg-neutral-800/50 rounded-lg border border-gray-200 dark:border-neutral-700">
                          <Link className="w-5 h-5 text-gray-400 mb-2" />
                          <p className="text-sm font-medium">Notion</p>
                          <p className="text-xs text-gray-500 dark:text-neutral-400">Embed any Notion page</p>
                        </div>
                        <div className="p-3 bg-white dark:bg-neutral-800/50 rounded-lg border border-gray-200 dark:border-neutral-700">
                          <FileText className="w-5 h-5 text-gray-400 mb-2" />
                          <p className="text-sm font-medium">Content Page</p>
                          <p className="text-xs text-gray-500 dark:text-neutral-400">Rich text editor</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* EXTERNAL REDIRECT */}
                  {data.delivery.method === 'redirect' && (
                    <div className="space-y-4">
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                        <p className="text-sm text-amber-600 dark:text-amber-300">
                          Tip: Customers will be redirected to your external platform after purchase.
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Redirect URL <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="url"
                          value={data.delivery.redirectUrl || ''}
                          onChange={(e) => setData(prev => ({
                            ...prev,
                            delivery: { ...prev.delivery, redirectUrl: e.target.value }
                          }))}
                          placeholder="https://your-course-platform.com/welcome"
                          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Customer Experience Summary */}
                <div className="bg-gray-200/50 dark:bg-neutral-800/30 border border-gray-300 dark:border-neutral-700 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium mb-1">Customer Experience:</p>
                      <p className="text-xs text-gray-500 dark:text-neutral-400">
                        {data.delivery.method === 'email-only' && 'Purchase -> Confirmation email sent -> Done'}
                        {data.delivery.method === 'hosted' && 'Purchase -> Confirmation email with Access Product button -> LaunchPad delivery page'}
                        {data.delivery.method === 'redirect' && 'Purchase -> Confirmation email -> Redirect to your platform'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-sm text-blue-600 dark:text-blue-300">
                    Tip: You can always change your delivery method and content later from the dashboard.
                  </p>
                </div>
              </div>
            )}

            {/* ============================================ */}
            {/* STEP 3: PUBLISH */}
            {/* ============================================ */}
            {currentStep === 3 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Ready to Publish</h2>
                  <p className="text-gray-500 dark:text-neutral-400">Review your settings and go live!</p>
                </div>

                {/* URL */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Product URL <span className="text-red-400">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 dark:text-neutral-500">launchpad.com/p/</span>
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={data.publish.slug}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          publish: { ...prev.publish, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }
                        }))}
                        placeholder="your-product"
                        className={`w-full px-4 py-3 bg-white dark:bg-neutral-900 border rounded-lg focus:outline-none pr-10 ${
                          slugStatus === 'taken' 
                            ? 'border-red-500 focus:border-red-500' 
                            : slugStatus === 'available' 
                              ? 'border-green-500 focus:border-green-500'
                              : 'border-gray-300 dark:border-neutral-700 focus:border-purple-500'
                        }`}
                      />
                      {/* Status indicator */}
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {slugStatus === 'checking' && (
                          <Loader className="w-4 h-4 animate-spin text-gray-400" />
                        )}
                        {slugStatus === 'available' && (
                          <Check className="w-4 h-4 text-green-500" />
                        )}
                        {slugStatus === 'taken' && (
                          <X className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Status message */}
                  <div className="mt-1 flex justify-between items-center">
                    <p className="text-xs text-gray-400 dark:text-neutral-500">Lowercase letters, numbers, and hyphens only</p>
                    {slugStatus === 'taken' && (
                      <p className="text-xs text-red-400">This URL is already taken</p>
                    )}
                    {slugStatus === 'available' && data.publish.slug.length >= 3 && (
                      <p className="text-xs text-green-400">URL is available</p>
                    )}
                  </div>
                </div>

                {/* Google Search Preview */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium">Google Search Preview</h3>
                    <span className="text-xs text-green-400 bg-green-500/20 px-2 py-0.5 rounded">Auto-generated</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-neutral-400">This is how your page will appear in Google search results</p>
                  
                  {/* Google Preview Mockup */}
                  <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-neutral-400">
                        <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                          <span className="text-xs text-purple-600 dark:text-purple-400">L</span>
                        </div>
                        <span>launchpad.com</span>
                        <span className="text-gray-300 dark:text-neutral-600">›</span>
                        <span>p</span>
                        <span className="text-gray-300 dark:text-neutral-600">›</span>
                        <span>{data.publish.slug || 'your-product'}</span>
                      </div>
                      <h4 className="text-lg text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                        {data.publish.metaTitle || 'Your Product Title'}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-neutral-400 line-clamp-2">
                        {data.publish.metaDescription || 'Your product description will appear here...'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Title Input */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium">Title</label>
                      {data.publish.metaTitle && !seoTitleSuggestion && (
                        <button
                          onClick={handleImproveSeoTitle}
                          disabled={isImprovingSeoTitle}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded-lg disabled:opacity-50"
                        >
                          {isImprovingSeoTitle ? <Loader className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                          Optimize
                        </button>
                      )}
                    </div>
                    
                    {/* Title Suggestion Preview */}
                    {seoTitleSuggestion && (
                      <div className="mb-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                        <p className="text-xs text-purple-400 mb-2 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          AI Suggestion:
                        </p>
                        <p className="text-sm mb-3">{seoTitleSuggestion}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={acceptSeoTitleSuggestion}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-500 text-white rounded-lg"
                          >
                            <Check className="w-4 h-4" />
                            Accept
                          </button>
                          <button
                            onClick={rejectSeoTitleSuggestion}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 text-white rounded-lg"
                          >
                            <X className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <input
                      type="text"
                      value={data.publish.metaTitle}
                      onChange={(e) => setData(prev => ({
                        ...prev,
                        publish: { ...prev.publish, metaTitle: e.target.value }
                      }))}
                      placeholder="Enter a catchy title"
                      maxLength={60}
                      className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 rounded-lg focus:border-purple-500 focus:outline-none"
                    />
                    <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1 text-right">{data.publish.metaTitle.length}/60</p>
                  </div>

                  {/* Description Input */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium">Description</label>
                      {data.publish.metaDescription && !seoDescriptionSuggestion && (
                        <button
                          onClick={handleImproveSeoDescription}
                          disabled={isImprovingSeoDescription}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded-lg disabled:opacity-50"
                        >
                          {isImprovingSeoDescription ? <Loader className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                          Optimize
                        </button>
                      )}
                    </div>
                    
                    {/* Description Suggestion Preview */}
                    {seoDescriptionSuggestion && (
                      <div className="mb-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                        <p className="text-xs text-purple-400 mb-2 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          AI Suggestion:
                        </p>
                        <p className="text-sm mb-3">{seoDescriptionSuggestion}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={acceptSeoDescriptionSuggestion}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-500 text-white rounded-lg"
                          >
                            <Check className="w-4 h-4" />
                            Accept
                          </button>
                          <button
                            onClick={rejectSeoDescriptionSuggestion}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 text-white rounded-lg"
                          >
                            <X className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <textarea
                      value={data.publish.metaDescription}
                      onChange={(e) => setData(prev => ({
                        ...prev,
                        publish: { ...prev.publish, metaDescription: e.target.value }
                      }))}
                      placeholder="Write a short description to attract clicks"
                      rows={3}
                      maxLength={160}
                      className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 rounded-lg focus:border-purple-500 focus:outline-none resize-none"
                    />
                    <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1 text-right">{data.publish.metaDescription.length}/160</p>
                  </div>
                </div>

                {/* Summary */}
                <div className="p-4 bg-gray-200 dark:bg-neutral-800/50 rounded-lg space-y-3">
                  <h3 className="font-medium">Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-neutral-400">Product</p>
                      <p className="font-medium">{data.coreInfo.name || 'Untitled'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-neutral-400">Price</p>
                      <p className="font-medium">
                        {data.coreInfo.priceType === 'free' 
                          ? 'Free' 
                          : data.coreInfo.priceType === 'subscription'
                            ? `${currencySymbols[data.coreInfo.currency]}${data.coreInfo.price}/mo`
                            : `${currencySymbols[data.coreInfo.currency]}${data.coreInfo.price}`
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-neutral-400">Delivery</p>
                      <p className="font-medium capitalize">{data.delivery.method.replace('-', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-neutral-400">URL</p>
                      <p className="font-medium text-purple-400">/p/{data.publish.slug || '...'}</p>
                    </div>
                  </div>
                </div>

                {/* Publish Button */}
                {getMissingFieldsForPublish().length > 0 && (
                  <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-sm text-amber-400 flex items-center gap-2">
                      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Required: {getMissingFieldsForPublish().join(', ')}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => {
                    if (isAlreadyPublished) {
                      // Direct publish for updates
                      handlePublish();
                    } else {
                      // Show preview modal for first publish
                      setShowPreviewModal(true);
                    }
                  }}
                  disabled={!canPublish() || isPublishing}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPublishing ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : isAlreadyPublished ? (
                    <Rocket className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                  {isAlreadyPublished ? 'Update Page' : 'Preview & Publish'}
                </button>
              </div>
            )}

            {/* NAVIGATION */}
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                disabled={currentStep === 1}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <span className="text-sm text-gray-400 dark:text-neutral-500">
                Step {currentStep} of {STEPS.length}
              </span>

              {currentStep < STEPS.length && (
                <div className="flex flex-col items-end gap-1">
                  {/* Validation message */}
                  {getMissingFields().length > 0 && (
                    <span className="text-xs text-amber-500 dark:text-amber-400 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Required: {getMissingFields().join(', ')}
                    </span>
                  )}
                  <button
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    disabled={!canProceed()}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg disabled:opacity-50"
                  >
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {currentStep === STEPS.length && (
                <div /> // Spacer - publish button is above
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: PREVIEW */}
        <div className="w-1/2 bg-gray-100 dark:bg-neutral-900 border-l border-gray-200 dark:border-neutral-800 p-6 overflow-hidden">
          <div className={`h-full ${previewMode === 'mobile' ? 'max-w-sm mx-auto' : ''}`}>
            <div className="h-full rounded-lg border border-gray-300 dark:border-neutral-700 overflow-hidden flex flex-col bg-white dark:bg-neutral-950">
              {/* Browser Chrome */}
              <div className="p-3 bg-gray-200 dark:bg-neutral-800 border-b border-gray-300 dark:border-neutral-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-gray-100 dark:bg-neutral-900 rounded px-3 py-1 text-xs text-gray-500 dark:text-neutral-400 text-center">
                    launchpad.com/p/{data.publish.slug || 'your-product'}
                  </div>
                </div>
              </div>
              
              {/* Preview Content */}
              <div ref={previewScrollRef} className="flex-1 overflow-y-auto">
                <SalesPageContent
                  data={{
                    coreInfo: data.coreInfo,
                    creator: data.creator,
                    valueProp: data.valueProp,
                    visuals: data.visuals,
                    design: data.design,
                    publish: data.publish,
                  }}
                  onCtaClick={() => console.log('CTA clicked')}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Picker Modal */}
      {showImagePicker && (
        <ImagePickerModal
          onClose={() => {
            setShowImagePicker(false);
            setUnsplashResults([]);
            setUnsplashQuery('');
          }}
          searchTab={imagePickerTab}
          setSearchTab={setImagePickerTab}
          searchQuery={unsplashQuery}
          setSearchQuery={setUnsplashQuery}
          stockImages={unsplashResults}
          isSearching={isSearchingImages}
          handleSearch={handleImageSearch}
          selectStockImage={selectUnsplashImage}
          handleFileUpload={handleFileUploadDirect}
          handleDragOver={handleDragOver}
          handleDragLeave={handleDragLeave}
          handleDrop={handleDrop}
          isDragging={isDraggingFile}
          isUploading={isUploadingImage}
        />
      )}
    </div>
  );
}