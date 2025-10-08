'use client';

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth, db } from '../../lib/firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowLeft, ArrowRight, Save, Eye, Smartphone, Monitor, Check, AlertCircle } from 'lucide-react';

// Steps individual components
import SalesStepCoreInfo from './sales page components/SalesStepsCoreInfo';
import SalesStepValueProp from './sales page components/SalesStepValueProp';
import SalesPagePreview from './sales page components/SalesPagePreview';
import SalesStepVisuals from './sales page components/SalesStepVisuals';
import SalesStepCustomize from './sales page components/SalesStepCustomize';
import SalesStepPublish from './sales page components/SalesStepPublish';
import SalesPageContent from './sales page components/SalesPageContent';



// Types
interface SalesPageData {
  coreInfo: {
    name: string;
    tagline: string;
    price: number;
    priceType: 'one-time' | 'payment-plan' | 'subscription' | 'free';  
    currency?: string;
    compareAtPrice?: number;
    billingFrequency?: 'monthly' | 'yearly' | 'weekly';
    numberOfPayments?: number;
    paymentFrequency?: 'weekly' | 'biweekly' | 'monthly';
  };
  valueProp: {
    productType?: 'course' | 'ebook' | 'coaching' | 'templates' | 'community' | 'custom';
    description: string;
    benefits: string[];
    targetAudience: string;
    deliverables: string[];
    isUsingTemplate: boolean;
  };
  visuals: {
    headerImage?: string;
    headerImageAttribution?: { name: string; url: string };
    headerImageSettings?: {
      aspectRatio: 'banner' | 'standard' | 'square' | 'tall';
      position: { x: number; y: number };
      zoom: number;
      height: string;
    };
    thumbnail?: string;
    videoUrl?: string;
    videoSettings?: {
      size?: 'small' | 'medium' | 'large' | 'full';
      corners?: 'square' | 'rounded' | 'soft' | 'pill';
      shadow?: 'none' | 'subtle' | 'medium' | 'dramatic';
      autoplay?: boolean;
      caption?: string;
      ctaText?: string;
    };
    gallery?: string[];
    galleryPositions?: { [key: number]: string };
  };
  design: {
    theme: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    fontPair: string;
    buttonStyle: 'rounded' | 'square' | 'pill';
    cardStyle: 'flat' | 'shadow' | 'border';
    spacing: 'compact' | 'comfortable' | 'spacious';
    sectionOrder: string[];
    hiddenSections: string[];
    ctaButtonText: string;
    customCSS?: string;
    animations: boolean;
    // Advanced component settings
    heroTitleSize?: 'small' | 'medium' | 'large' | 'xl';
    heroAlignment?: 'left' | 'center' | 'right';
    benefitsLayout?: 'single' | 'double' | 'grid';
    benefitsIconStyle?: 'circle' | 'square' | 'hexagon';
    pricingBoxWidth?: 'narrow' | 'standard' | 'wide';
    buttonSize?: 'small' | 'medium' | 'large' | 'xl';
    galleryColumns?: 2 | 3 | 4 | 6;
    contentWidth?: 'narrow' | 'standard' | 'wide';
    // Effects Settings
    buttonShadow?: 'none' | 'small' | 'medium' | 'large';
    cardElevation?: 'flat' | 'raised' | 'floating';
    imageBorderRadius?: 'none' | 'small' | 'medium' | 'large';
    hoverIntensity?: 'subtle' | 'normal' | 'bold';
    // Typography Settings
    textScale?: 'small' | 'normal' | 'large' | 'xlarge';
    lineHeight?: 'tight' | 'normal' | 'relaxed';
    letterSpacing?: 'tight' | 'normal' | 'wide';
    headingWeight?: 'light' | 'normal' | 'bold' | 'black';
    // Mobile Settings
    mobileHideSections?: string[];
    mobileFontScale?: number;
    // Accessibility Settings
    highContrast?: boolean;
    focusIndicatorStyle?: 'default' | 'bold' | 'minimal';
    reducedMotion?: boolean;
  };
  publish: {
    slug: string;
    metaTitle: string;
    metaDescription: string;
    thankYouMessage: string;
    thankYouRedirect?: string;
    status: 'draft' | 'published';
    publishedAt?: Date;
    socialLinks?: {
      facebook?: string;
      twitter?: string;
      linkedin?: string;
      instagram?: string;
    };
  };
}

const STEPS = [
  { id: 1, name: 'Core Info', component: SalesStepCoreInfo },
  { id: 2, name: 'Value Proposition', component: SalesStepValueProp },
  { id: 3, name: 'Visuals', component: SalesStepVisuals },
  { id: 4, name: 'Customize', component: SalesStepCustomize },
  { id: 5, name: 'Publish', component: SalesStepPublish },
];

export default function SalesPage() {
  const navigate = useNavigate();
  const params = useParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [productId, setProductId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [showTemplateWarning, setShowTemplateWarning] = useState(false);

  const [salesPageData, setSalesPageData] = useState<SalesPageData>({
    coreInfo: {
      name: '',
      tagline: '',
      price: 0,
      priceType: 'one-time',
      currency: 'USD',
      compareAtPrice: undefined,
      billingFrequency: 'monthly',
      numberOfPayments: 3,
      paymentFrequency: 'monthly',
    },
    valueProp: {
      productType: undefined,
      description: '',
      benefits: [],
      targetAudience: '',
      deliverables: [],
      isUsingTemplate: false,
    },
    visuals: {
      headerImage: undefined,
      headerImageAttribution: undefined,
      thumbnail: undefined,
      videoUrl: undefined,
      gallery: [],
    },
    design: {
      theme: 'modern',
      primaryColor: '#6366F1',
      secondaryColor: '#8B5CF6',
      backgroundColor: '#0A0A0A',
      textColor: '#E5E5E5',
      fontPair: 'inter-system',
      buttonStyle: 'rounded',
      cardStyle: 'shadow',
      spacing: 'comfortable',
      sectionOrder: ['hero', 'video', 'benefits', 'description', 'audience', 'gallery', 'pricing'],
      hiddenSections: [],
      ctaButtonText: 'Buy Now',
      animations: true
    },
    publish: {
      slug: '',
      metaTitle: '',
      metaDescription: '',
      thankYouMessage: 'Thank you for your purchase! You will receive an email with access details shortly.',
      status: 'draft',
    },
  });

  // Initialize product and load data
  useEffect(() => {
    const init = async () => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!user) {
          setIsLoading(false);
          navigate('/auth/signin');
          return;
        }

        setUserId(user.uid);

        try {
          let prodId = params?.productId as string;

          if (!prodId) {
            prodId = `product_${Date.now()}`;
            const productRef = doc(db, 'users', user.uid, 'products', prodId);
            await setDoc(productRef, {
              createdAt: new Date(),
              status: 'draft',
              type: 'sales-page',
              salesPage: salesPageData,
            });

            navigate(`/products/${prodId}/landing/edit`, { replace: true });
          } else {
            const productRef = doc(db, 'users', user.uid, 'products', prodId);
            const productSnap = await getDoc(productRef);

            if (productSnap.exists()) {
              const data = productSnap.data();
              if (data.salesPage) {
                setSalesPageData(data.salesPage);
              }
            }
          }

          setProductId(prodId);
        } catch (error) {
          console.error('Error initializing product:', error);
        } finally {
          setIsLoading(false);
        }
      });

      return () => unsubscribe();
    };

    init();
  }, [params?.productId, navigate]);

  // Auto-save functionality
  useEffect(() => {
    if (!productId || !userId || isLoading) return;

    const saveTimer = setTimeout(async () => {
      setIsSaving(true);
      try {
        const productRef = doc(db, 'users', userId, 'products', productId);
        await updateDoc(productRef, {
          salesPage: salesPageData,
          lastUpdated: new Date(),
        });
        console.log('Auto-saved');
      } catch (error) {
        console.error('Error saving:', error);
      } finally {
        setIsSaving(false);
      }
    }, 2000);

    return () => clearTimeout(saveTimer);
  }, [salesPageData, productId, userId]);

  const updateData = (stepKey: keyof SalesPageData, data: any) => {
    setSalesPageData(prev => ({
      ...prev,
      [stepKey]: { ...prev[stepKey], ...data },
    }));
  };

  const handleNext = () => {
    // Check for template warning on step 2
    if (currentStep === 2 && salesPageData.valueProp.isUsingTemplate) {
      setShowTemplateWarning(true);
      setTimeout(() => setShowTemplateWarning(false), 5000);
    }
    
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const canProceedToNext = () => {
    if (currentStep === 1) {
      const hasName = salesPageData.coreInfo.name && salesPageData.coreInfo.name.trim().length > 0;
      const isFree = salesPageData.coreInfo.priceType === 'free';
      const hasValidPrice = isFree || (salesPageData.coreInfo.price && salesPageData.coreInfo.price > 0);
      return hasName && hasValidPrice;
    }
    if (currentStep === 2) {
      // Step 2: Value Prop - description is required
      return salesPageData.valueProp.description && salesPageData.valueProp.description.trim().length > 0;
    }
    if (currentStep === 3) {
      // Step 3: Visuals - header image is required
      return salesPageData.visuals.headerImage ? true : false;
    }
    return true;
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePublish = async () => {
    // Check if using template content
    if (salesPageData.valueProp.isUsingTemplate) {
      const confirmPublish = window.confirm(
        'You are still using template content with placeholder text. Are you sure you want to publish without customizing it?'
      );
      if (!confirmPublish) return;
    }

    // Validate all required fields
    if (!canPublish) {
      alert('Please complete all required fields before publishing:\n\n' +
        '✓ Product name and price\n' +
        '✓ Product description\n' +
        '✓ Header image\n' +
        '✓ URL slug (Step 5)\n' +
        '✓ SEO title and description (Step 5)\n' +
        '✓ Thank you message (Step 5)'
      );
      return;
    }

    setIsSaving(true);
    try {
      const slug = salesPageData.publish.slug.toLowerCase().trim();
      
      // Validate slug format
      const slugRegex = /^[a-z0-9-]{3,50}$/;
      if (!slugRegex.test(slug)) {
        alert('Invalid URL slug. Use only lowercase letters, numbers, and hyphens (3-50 characters).');
        setIsSaving(false);
        return;
      }

      // 1. Check slug availability in registry
      const slugRef = doc(db, 'slugs', slug);
      const slugDoc = await getDoc(slugRef);
      
      if (slugDoc.exists()) {
        const existingData = slugDoc.data();
        
        // If slug exists but belongs to a different product, it's taken
        if (existingData.productId !== productId) {
          alert('This URL is already taken. Please choose a different slug.');
          setIsSaving(false);
          return;
        }
        
        // If it's the same product, we're republishing (OK to continue)
      }

      // 2. Register/update slug ownership
      await setDoc(slugRef, {
        productId: productId,
        userId: userId,
        createdAt: slugDoc.exists() ? slugDoc.data().createdAt : new Date(),
        lastUpdated: new Date()
      });

      // 3. Create/update public published page
      const publishedRef = doc(db, 'published_pages', slug);
      await setDoc(publishedRef, {
        userId: userId,
        productId: productId,
        slug: slug,
        salesPage: salesPageData,
        publishedAt: new Date(),
        lastUpdated: new Date(),
        // Optional: Add metadata for easier querying
        productName: salesPageData.coreInfo.name,
        price: salesPageData.coreInfo.price,
        priceType: salesPageData.coreInfo.priceType,
        metaTitle: salesPageData.publish.metaTitle,
        metaDescription: salesPageData.publish.metaDescription
      });

      // 4. Update private product document
      const productRef = doc(db, 'users', userId, 'products', productId);
      await updateDoc(productRef, {
        'salesPage.publish.status': 'published',
        'salesPage.publish.publishedAt': new Date(),
        'salesPage.publish.slug': slug,
        published: true,
        lastUpdated: new Date()
      });

      // Success! Navigate to success page
      navigate(`/products/${productId}/success`);
      
    } catch (error) {
      console.error('Error publishing:', error);
      
      // Type-safe error handling
      let errorMessage = 'Failed to publish. Please check your internet connection and try again.';
      
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string };
        
        if (firebaseError.code === 'permission-denied') {
          errorMessage = 'Permission denied. Please make sure you are logged in.';
        } else if (firebaseError.code === 'not-found') {
          errorMessage = 'Product not found. Please try again.';
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

 // In SalesPage.tsx, replace canPublish with:
const canPublish = 
  // Step 1: Core Info
  salesPageData.coreInfo.name && 
  salesPageData.coreInfo.name.trim().length > 0 &&
  (salesPageData.coreInfo.priceType === 'free' || salesPageData.coreInfo.price >= 0) &&
  
  // Step 2: Value Prop
  salesPageData.valueProp.description &&
  salesPageData.valueProp.description.trim().length > 0 &&
  
  // Step 3: Visuals
  salesPageData.visuals.headerImage &&
  
  // Step 5: Publish Settings (NEW!)
  salesPageData.publish.slug &&
  salesPageData.publish.slug.trim().length >= 3 &&
  salesPageData.publish.metaTitle &&
  salesPageData.publish.metaTitle.trim().length > 0 &&
  salesPageData.publish.metaDescription &&
  salesPageData.publish.metaDescription.trim().length > 0 &&
  salesPageData.publish.thankYouMessage &&
  salesPageData.publish.thankYouMessage.trim().length > 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-neutral-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold">Create Sales Page</h1>
                <p className="text-sm text-neutral-400">
                  {salesPageData.coreInfo.name || 'New Product'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Save indicator */}
              <div className="flex items-center gap-2">
                {isSaving ? (
                  <>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                    <span className="text-sm text-neutral-400">Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-neutral-400">Saved</span>
                  </>
                )}
              </div>

              {/* Preview toggle */}
              <div className="flex items-center gap-1 bg-neutral-800 rounded-lg p-1">
                <button
                  onClick={() => setPreviewMode('desktop')}
                  className={`p-2 rounded ${previewMode === 'desktop' ? 'bg-neutral-700' : ''}`}
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={`p-2 rounded ${previewMode === 'mobile' ? 'bg-neutral-700' : ''}`}
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>

              {/* Publish button */}
              {currentStep === 5 && (
                <button
                  onClick={handlePublish}
                  disabled={!canPublish || isSaving}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-700 disabled:text-neutral-500 rounded-lg font-medium transition-colors"
                >
                  Publish
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2">
            {STEPS.map((step) => (
              <div key={step.id} className="flex-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      step.id <= currentStep ? 'bg-indigo-600' : 'bg-neutral-800'
                    }`}
                  />
                  {step.id === currentStep && (
                    <span className="text-xs text-neutral-400">{step.name}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Template Warning Banner */}
      {showTemplateWarning && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <p className="text-sm text-amber-500">
              You're moving forward with template content. Remember to customize it before publishing!
            </p>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex h-[calc(100vh-120px)]">
        {/* Left: Form */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-8">
            {currentStep === 1 && (
              <SalesStepCoreInfo 
                data={salesPageData}
                updateData={updateData as (stepKey: string, data: any) => void}
              />
            )}
            {currentStep === 2 && (
              <SalesStepValueProp
                data={salesPageData.valueProp}
                onChange={(data: any) => updateData('valueProp', data)}
                productName={salesPageData.coreInfo.name}
              />
            )}
            {currentStep === 3 && (
              <SalesStepVisuals
                data={salesPageData}
                updateData={updateData as (stepKey: string, data: any) => void}
              />
            )}
            {currentStep === 4 && (
              <SalesStepCustomize
                data={salesPageData}
                updateData={updateData as (stepKey: string, data: any) => void}
              />
            )}
            {currentStep === 5 && (
              <SalesStepPublish
                data={salesPageData}
                updateData={updateData as (stepKey: string, data: any) => void}
              />
            )}

            {/* Navigation buttons */}
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="px-4 py-2 border border-neutral-700 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-400">
                  Step {currentStep} of {STEPS.length}
                </span>
              </div>

              {currentStep < STEPS.length ? (
                <button
                  onClick={handleNext}
                  disabled={!canProceedToNext()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-700 disabled:text-neutral-500 disabled:cursor-not-allowed rounded-lg flex items-center gap-2 transition-colors"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handlePublish}
                  disabled={!canPublish || isSaving}
                  className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-neutral-700 disabled:text-neutral-500 rounded-lg font-medium transition-colors"
                >
                  Publish Now
                </button>
              )}
            </div>

            {/* Skip option for optional steps */}
            {currentStep >= 4 && currentStep < 5 && (
              <div className="mt-4 text-center">
                <button
                  onClick={handleNext}
                  className="text-sm text-neutral-400 hover:text-neutral-300 underline"
                >
                  Skip this step for now
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="w-1/2 bg-neutral-900 border-l border-neutral-800 p-8 overflow-hidden">
          <div className={`h-full ${previewMode === 'mobile' ? 'max-w-sm mx-auto' : ''}`}>
            {/* Browser Chrome Wrapper */}
            <div className="h-full rounded-lg border border-neutral-800 overflow-hidden flex flex-col bg-neutral-950">
              {/* Browser Chrome UI */}
              <div className="p-3 bg-neutral-800 border-b border-neutral-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-neutral-900 rounded px-3 py-1 text-xs text-neutral-400 text-center">
                    launchpad.com/p/{salesPageData.publish?.slug || 'your-product'}
                  </div>
                </div>
                <span className="text-xs text-neutral-500">
                  {previewMode === 'mobile' ? 'Mobile' : 'Desktop'} Preview
                </span>
              </div>
              
              {/* Actual Sales Page Content */}
              <div className="flex-1 overflow-y-auto">
                <SalesPageContent 
                  data={salesPageData}
                  onCtaClick={() => {
                    console.log('CTA clicked in preview mode');
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}