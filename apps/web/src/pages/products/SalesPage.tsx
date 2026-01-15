'use client';

import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
    tierType?: 'low' | 'mid' | 'high'; // From Co-Pilot
  };
  valueProp: {
    productType?: 'course' | 'ebook' | 'coaching' | 'templates' | 'community' | 'custom';
    description: string;
    benefits: string[];
    targetAudience: string;
    targetAudiencePrefix?: string;
    deliverables: string[];
    isUsingTemplate: boolean;
    guarantees: string[]; // NEW: From Co-Pilot - risk reversals
    mission: string; // NEW: From Co-Pilot - mission statement
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
    heroTitleSize?: 'small' | 'medium' | 'large' | 'xl';
    heroAlignment?: 'left' | 'center' | 'right';
    benefitsLayout?: 'single' | 'double' | 'grid';
    benefitsIconStyle?: 'circle' | 'square' | 'hexagon';
    pricingBoxWidth?: 'narrow' | 'standard' | 'wide';
    buttonSize?: 'small' | 'medium' | 'large' | 'xl';
    galleryColumns?: 2 | 3 | 4 | 6;
    contentWidth?: 'narrow' | 'standard' | 'wide';
    buttonShadow?: 'none' | 'small' | 'medium' | 'large';
    cardElevation?: 'flat' | 'raised' | 'floating';
    imageBorderRadius?: 'none' | 'small' | 'medium' | 'large';
    hoverIntensity?: 'subtle' | 'normal' | 'bold';
    textScale?: 'small' | 'normal' | 'large' | 'xlarge';
    lineHeight?: 'tight' | 'normal' | 'relaxed';
    letterSpacing?: 'tight' | 'normal' | 'wide';
    headingWeight?: 'light' | 'normal' | 'bold' | 'black';
    mobileHideSections?: string[];
    mobileFontScale?: number;
    highContrast?: boolean;
    focusIndicatorStyle?: 'default' | 'bold' | 'minimal';
    reducedMotion?: boolean;
  };
  publish: {
    slug: string;
    metaTitle: string;
    metaDescription: string;
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
  // Metadata for tracking source
  sourceSessionId?: string; // Links to Co-Pilot session if created from there
}

// Unified Product Interface
interface ProductMetadata {
  type: 'sales-page';
  published: boolean;
  delivery: {
    type: 'email-only' | 'content' | 'redirect' | 'file';
    status: 'pending' | 'configured';
    
    // Email-only fields
    emailSubject?: string;
    emailBody?: string;
    
    // Content delivery fields
    content?: string;
    
    // File delivery fields
    files?: Array<{
      url: string;
      name: string;
      size: number;
      uploadedAt: Date;
    }>;
    
    // Redirect delivery fields
    redirectUrl?: string;
    redirectDelay?: number;
    showThankYouFirst?: boolean;
    
    // Common to all types
    accessInstructions?: string;
  };
  analytics: {
    views: number;
    sales: number;
    revenue: number;
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
  const [searchParams] = useSearchParams();
  const ideaId = searchParams.get('ideaId'); // From Co-Pilot: /products/sales?ideaId=xxx
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [productId, setProductId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [showTemplateWarning, setShowTemplateWarning] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [isPrefilledFromCoPilot, setIsPrefilledFromCoPilot] = useState(false); // Track if data came from Co-Pilot

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
      tierType: undefined,
    },
    valueProp: {
      productType: undefined,
      description: '',
      benefits: [],
      targetAudience: '',
      targetAudiencePrefix: 'Perfect for',
      deliverables: [],
      isUsingTemplate: false,
      guarantees: [],
      mission: '',
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
      sectionOrder: ['hero', 'video', 'benefits', 'guarantees', 'description', 'mission', 'audience', 'gallery', 'pricing'],
      hiddenSections: [],
      ctaButtonText: 'Buy Now',
      animations: true
    },
    publish: {
      slug: '',
      metaTitle: '',
      metaDescription: '',
      status: 'draft',
    },
    sourceSessionId: undefined,
  });

  // Product metadata state
  const [productMetadata, setProductMetadata] = useState<ProductMetadata>({
        type: 'sales-page',
        published: false,
        delivery: {
          type: 'email-only',
          status: 'configured',
          emailSubject: 'Thank you for your purchase!',
          emailBody: `Hi there! Thank you for purchasing {{product_name}}.

Your order is confirmed. We're working on your product and will send access details to this email soon.

Questions? Reply to this email.

Thanks!`,
          accessInstructions: undefined
        },
        analytics: {
          views: 0,
          sales: 0,
          revenue: 0
        }
});

  // Helper function to clean undefined values
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

  // Fetch Co-Pilot session data and map to SalesPageData format
  const fetchCoPilotData = async (userId: string, sessionId: string): Promise<Partial<SalesPageData> | null> => {
    try {
      const sessionRef = doc(db, 'users', userId, 'productCoPilotSessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);
      
      if (!sessionSnap.exists()) {
        console.error('Co-Pilot session not found:', sessionId);
        return null;
      }
      
      const sessionData = sessionSnap.data();
      const productConfig = sessionData.productConfig;
      
      if (!productConfig) {
        console.error('No product config in session:', sessionId);
        return null;
      }
      
      console.log('Loaded Co-Pilot data:', productConfig);
      
      // Map Co-Pilot productConfig to SalesPageData format
      return {
        coreInfo: {
          name: productConfig.name || '',
          tagline: '', // Not in Co-Pilot, user will add
          price: productConfig.price || 0,
          priceType: productConfig.priceType || 'one-time',
          currency: productConfig.currency || 'USD',
          compareAtPrice: undefined,
          billingFrequency: 'monthly',
          numberOfPayments: 3,
          paymentFrequency: 'monthly',
          tierType: productConfig.tierType,
        },
        valueProp: {
          productType: undefined, // User can select in Step 2
          description: productConfig.description || '',
          benefits: productConfig.valueStack || [],
          targetAudience: productConfig.targetAudience || '',
          targetAudiencePrefix: 'Perfect for',
          deliverables: [],
          isUsingTemplate: false,
          guarantees: productConfig.guarantees || [],
          mission: productConfig.mission || '',
        },
        sourceSessionId: sessionId,
      };
    } catch (error) {
      console.error('Error fetching Co-Pilot data:', error);
      return null;
    }
  };

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
            // Creating NEW sales page
            prodId = `product_${Date.now()}`;
            const productRef = doc(db, 'users', user.uid, 'products', prodId);
            
            // Check if we have Co-Pilot data to pre-fill
            let initialSalesPageData = salesPageData;
            
            if (ideaId) {
              console.log('Loading Co-Pilot data for ideaId:', ideaId);
              const coPilotData = await fetchCoPilotData(user.uid, ideaId);
              
              if (coPilotData) {
                // Merge Co-Pilot data with defaults
                initialSalesPageData = {
                  ...salesPageData,
                  coreInfo: {
                    ...salesPageData.coreInfo,
                    ...coPilotData.coreInfo,
                  },
                  valueProp: {
                    ...salesPageData.valueProp,
                    ...coPilotData.valueProp,
                  },
                  sourceSessionId: coPilotData.sourceSessionId,
                };
                
                setIsPrefilledFromCoPilot(true);
                setSalesPageData(initialSalesPageData);
                console.log('Pre-filled from Co-Pilot:', initialSalesPageData);
              }
            }
            
            await setDoc(productRef, cleanData({
              type: 'sales-page',
              createdAt: new Date(),
              lastUpdated: new Date(),
              published: false,
              salesPage: initialSalesPageData,
              sourceSessionId: ideaId || null, // Track origin at product level too
              delivery: {
              type: 'email-only',
              status: 'configured',
              emailSubject: 'Thank you for your purchase!',
                emailBody: `Hi there! Thank you for purchasing {{product_name}}.

Your order is confirmed. We're working on your product and will send access details to this email soon.

Questions? Reply to this email.

Thanks!`,
                accessInstructions: null
              },
              analytics: {
                views: 0,
                sales: 0,
                revenue: 0
              }
            }));

            console.log('Created new product:', prodId, ideaId ? '(from Co-Pilot)' : '(blank)');
            navigate(`/products/${prodId}/landing/edit`, { replace: true });
          } else {
            // Load existing product
            const productRef = doc(db, 'users', user.uid, 'products', prodId);
            const productSnap = await getDoc(productRef);

            if (productSnap.exists()) {
              const data = productSnap.data();
              
              // Load sales page data
              if (data.salesPage) {
                setSalesPageData(data.salesPage);
                
                // Check if this was from Co-Pilot
                if (data.sourceSessionId) {
                  setIsPrefilledFromCoPilot(true);
                }
              }
              
              // Load product metadata
              setProductMetadata({
                type: data.type || 'sales-page',
                published: data.published || false,
                delivery: data.delivery || {
                  type: 'email-only',
                  status: 'configured',
                  emailSubject: 'Thank you for your purchase!',
                  emailBody: `Hi there! Thank you for purchasing {{product_name}}.

Your order is confirmed. We're working on your product and will send access details to this email soon.

Questions? Reply to this email.

Thanks!`
                },
                analytics: data.analytics || {
                  views: 0,
                  sales: 0,
                  revenue: 0
                }
              });
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
  }, [params?.productId, ideaId, navigate]);

  // Auto-save functionality
  useEffect(() => {
    if (!productId || !userId || isLoading) return;

    const saveTimer = setTimeout(async () => {
      setIsSaving(true);
      try {
        const productRef = doc(db, 'users', userId, 'products', productId);
        await updateDoc(productRef, cleanData({
          salesPage: salesPageData,
          type: 'sales-page',
          lastUpdated: new Date(),
        }));
        console.log('Auto-saved');
      } catch (error) {
        console.error('Error saving:', error);
      } finally {
        setIsSaving(false);
      }
    }, 2000);

    return () => clearTimeout(saveTimer);
  }, [salesPageData, productId, userId, isLoading]);

  const updateData = (stepKey: keyof SalesPageData, data: any) => {
    setSalesPageData(prev => ({
      ...prev,
      [stepKey]: { ...prev[stepKey], ...data },
    }));
  };

  const handleNext = () => {
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
      return salesPageData.valueProp.description && salesPageData.valueProp.description.trim().length > 0;
    }
    if (currentStep === 3) {
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
    // Check template content FIRST
    if (salesPageData.valueProp.isUsingTemplate) {
      const confirmPublish = window.confirm(
        'You are still using template content with placeholder text. Are you sure you want to publish without customizing it?'
      );
      if (!confirmPublish) return;
    }

    // Validate required fields
    if (!canPublish) {
      alert('Please complete all required fields before publishing:\n\n' +
        'âœ“ Product name and price\n' +
        'âœ“ Product description\n' +
        'âœ“ Header image\n' +
        'âœ“ URL slug (Step 5)\n' +
        'âœ“ SEO title and description (Step 5)'
      );
      return;
    }

    console.log('Publishing with:', { userId, productId, slug: salesPageData.publish.slug });
    
    if (!userId || !productId) {
      alert('Error: Missing user or product ID. Please refresh and try again.');
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

      // Check slug availability
      const slugRef = doc(db, 'slugs', slug);
      const slugDoc = await getDoc(slugRef);
      
      if (slugDoc.exists()) {
        const existingData = slugDoc.data();
        if (existingData.productId !== productId) {
          alert('This URL is already taken. Please choose a different slug.');
          setIsSaving(false);
          return;
        }
      }

      // Register slug ownership
      await setDoc(slugRef, {
        productId: productId,
        userId: userId,
        createdAt: slugDoc.exists() ? slugDoc.data().createdAt : new Date(),
        lastUpdated: new Date()
      });

      // Create public published page
      const publishedRef = doc(db, 'published_pages', slug);
      await setDoc(publishedRef, cleanData({
        userId: userId,
        productId: productId,
        slug: slug,
        salesPage: salesPageData,
        publishedAt: new Date(),
        lastUpdated: new Date(),
        productName: salesPageData.coreInfo.name,
        price: salesPageData.coreInfo.price,
        priceType: salesPageData.coreInfo.priceType,
        metaTitle: salesPageData.publish.metaTitle,
        metaDescription: salesPageData.publish.metaDescription
      }));

      // Update private product document with unified structure
      const productRef = doc(db, 'users', userId, 'products', productId);
      await updateDoc(productRef, cleanData({
        'salesPage.publish.status': 'published',
        'salesPage.publish.publishedAt': new Date(),
        'salesPage.publish.slug': slug,
        published: true,
        type: 'sales-page',
        lastUpdated: new Date()
      }));

      console.log('âœ… Successfully published!');
      
      // Show success banner
      setPublishSuccess(true);
      
      // Navigate after 2 seconds
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
      
    } catch (error) {
      console.error('Error publishing:', error);
      
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

  // âœ… UPDATED: Removed thankYouMessage validation
  const canPublish = 
    salesPageData.coreInfo.name && 
    salesPageData.coreInfo.name.trim().length > 0 &&
    (salesPageData.coreInfo.priceType === 'free' || salesPageData.coreInfo.price > 0) &&
    salesPageData.valueProp.description &&
    salesPageData.valueProp.description.trim().length > 0 &&
    salesPageData.visuals.headerImage &&
    salesPageData.publish.slug &&
    salesPageData.publish.slug.trim().length >= 3 &&
    salesPageData.publish.metaTitle &&
    salesPageData.publish.metaTitle.trim().length > 0 &&
    salesPageData.publish.metaDescription &&
    salesPageData.publish.metaDescription.trim().length > 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-neutral-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
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

      {/* Success Banner */}
      {publishSuccess && (
        <div className="bg-green-500/10 border-b border-green-500/30 px-6 py-3">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            <p className="text-sm text-green-500">
              âœ… Successfully published! Redirecting to dashboard...
            </p>
          </div>
        </div>
      )}

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

      {/* Co-Pilot Pre-fill Banner */}
      {isPrefilledFromCoPilot && currentStep === 1 && (
        <div className="bg-purple-500/10 border-b border-purple-500/30 px-6 py-3">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-purple-400" />
            <p className="text-sm text-purple-400">
              Pre-filled from your Product Idea Co-Pilot. Review and customize as needed!
            </p>
          </div>
        </div>
      )}

      <div className="flex h-[calc(100vh-120px)]">
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

        <div className="w-1/2 bg-neutral-900 border-l border-neutral-800 p-8 overflow-hidden">
          <div className={`h-full ${previewMode === 'mobile' ? 'max-w-sm mx-auto' : ''}`}>
            <div className="h-full rounded-lg border border-neutral-800 overflow-hidden flex flex-col bg-neutral-950">
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