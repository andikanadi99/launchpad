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
    thumbnail?: string;
    videoUrl?: string;
    gallery?: string[];
  };
  design: {
    theme: string;
    primaryColor: string;
    fontPair: string;
    sectionOrder: string[];
  };
  publish: {
    slug: string;
    metaDescription: string;
    thankYouMessage: string;
    status: 'draft' | 'published';
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

    setIsSaving(true);
    try {
      const productRef = doc(db, 'users', userId, 'products', productId);
      await updateDoc(productRef, {
        'salesPage.publish.status': 'published',
        'salesPage.publish.publishedAt': new Date(),
        published: true,
      });

      navigate(`/products/${productId}/success`);
    } catch (error) {
      console.error('Error publishing:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const canPublish = salesPageData.coreInfo.name && 
                     salesPageData.coreInfo.price >= 0 && 
                     salesPageData.valueProp.description &&
                     salesPageData.visuals.headerImage;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-neutral-400">Loading...</div>
      </div>
    );
  }

  const CurrentStepComponent = STEPS[currentStep - 1].component;

  // Prepare props for SalesStepValueProp and SalesStepVisuals
  const getStepProps = () => {
    if (currentStep === 1) {
      return {
        data: salesPageData,
        updateData,
      };
    }
    if (currentStep === 2) {
      return {
        data: salesPageData.valueProp,
        onChange: (data: any) => updateData('valueProp', data),
        productName: salesPageData.coreInfo.name,
      };
    }
    if (currentStep === 3) {
      return {
        data: salesPageData,
        updateData,
      };
    }
    return { data: salesPageData, updateData };
  };

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
            <CurrentStepComponent {...getStepProps()} />

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
            <SalesPagePreview data={salesPageData} isMobile={previewMode === 'mobile'} />
          </div>
        </div>
      </div>
    </div>
  );
}