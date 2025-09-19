'use client';

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth, db } from '../../lib/firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowLeft, ArrowRight, Save, Eye, Smartphone, Monitor, Check } from 'lucide-react';

//Steps individual components
import SalesStepCoreInfo from './sales page components/SalesStepsCoreInfo';
import SalesPagePreview from './sales page components/SalesPagePreview';
// Import other steps as you create them:
// import SalesStepValueProp from './sales-page-components/steps/SalesStepValueProp';
// import SalesStepVisuals from './sales-page-components/steps/SalesStepVisuals';
// import SalesStepCustomize from './sales-page-components/steps/SalesStepCustomize';
// import SalesStepPublish from './sales-page-components/steps/SalesStepPublish';
// Temporary step components - will be replaced with actual imports


const StepValueProp = ({ data, updateData }: any) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-semibold">Step 2: Value Proposition</h2>
    <p className="text-neutral-400">Explain what you're selling and why it matters</p>
    <div className="p-6 bg-neutral-800/50 rounded-lg">
      <p className="text-neutral-300">StepValueProp component will go here</p>
      <ul className="mt-4 space-y-2 text-sm text-neutral-400">
        <li>• Main description</li>
        <li>• Key benefits</li>
        <li>• Target audience</li>
        <li>• What's included</li>
      </ul>
    </div>
  </div>
);

const StepVisuals = ({ data, updateData }: any) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-semibold">Step 3: Visuals & Media</h2>
    <p className="text-neutral-400">Make your page visually compelling</p>
    <div className="p-6 bg-neutral-800/50 rounded-lg">
      <p className="text-neutral-300">StepVisuals component will go here</p>
      <ul className="mt-4 space-y-2 text-sm text-neutral-400">
        <li>• Header image</li>
        <li>• Product thumbnail</li>
        <li>• Sales video</li>
        <li>• Gallery images</li>
      </ul>
    </div>
  </div>
);

const StepCustomize = ({ data, updateData }: any) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-semibold">Step 4: Customize Design</h2>
    <p className="text-neutral-400">Make it match your brand</p>
    <div className="p-6 bg-neutral-800/50 rounded-lg">
      <p className="text-neutral-300">StepCustomize component will go here</p>
      <ul className="mt-4 space-y-2 text-sm text-neutral-400">
        <li>• Choose theme</li>
        <li>• Colors & fonts</li>
        <li>• Section order</li>
      </ul>
    </div>
  </div>
);

const StepPublish = ({ data, updateData }: any) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-semibold">Step 5: Publish Settings</h2>
    <p className="text-neutral-400">Go live and share your page</p>
    <div className="p-6 bg-neutral-800/50 rounded-lg">
      <p className="text-neutral-300">StepPublish component will go here</p>
      <ul className="mt-4 space-y-2 text-sm text-neutral-400">
        <li>• URL slug</li>
        <li>• SEO settings</li>
        <li>• Thank you message</li>
        <li>• Publish button</li>
      </ul>
    </div>
  </div>
);


// Types
interface SalesPageData {
  coreInfo: {
    name: string;
    tagline: string;
    price: number;
    priceType: 'one-time' | 'payment-plan' | 'subscription' | 'free';  // Added 'free' option
    currency?: string;
    compareAtPrice?: number;
    billingFrequency?: 'monthly' | 'yearly' | 'weekly';
    numberOfPayments?: number;
    paymentFrequency?: 'weekly' | 'biweekly' | 'monthly';
    };
  valueProp: {
    description: string;
    benefits: string[];
    targetAudience: string;
    deliverables: string[];
  };
  visuals: {
    headerImage?: string;
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
  { id: 2, name: 'Value Proposition', component: StepValueProp }, 
  { id: 3, name: 'Visuals', component: StepVisuals },
  { id: 4, name: 'Customize', component: StepCustomize },
  { id: 5, name: 'Publish', component: StepPublish },
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
      description: '',
      benefits: [],
      targetAudience: '',
      deliverables: [],
    },
    visuals: {
      headerImage: undefined,
      thumbnail: undefined,
      videoUrl: undefined,
      gallery: [],
    },
    design: {
      theme: 'modern',
      primaryColor: '#6366F1',
      fontPair: 'inter-system',
      sectionOrder: ['hero', 'benefits', 'testimonials', 'faq', 'cta'],
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
        setIsLoading(false);  // Set loading to false before redirect
        navigate('/auth/signin');
        return;
      }
      
      setUserId(user.uid);
      
      try {
        // Check if we have a product ID in params or need to create new
        let prodId = params?.productId as string;

        if (!prodId) {
          // Create new product
          prodId = `product_${Date.now()}`;
          const productRef = doc(db, 'users', user.uid, 'products', prodId);
          await setDoc(productRef, {
            createdAt: new Date(),
            status: 'draft',
            type: 'sales-page',
            salesPage: salesPageData,  // Initial empty data
          });
          
          // Redirect to the new product URL
          navigate(`/products/${prodId}/landing/edit`, { replace: true });
        } else {
          // Load existing product
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
        setIsLoading(false);  // Always set loading to false
      }
    });

    return () => unsubscribe();
  };

  init();
}, [params?.productId, navigate]);  // Add proper dependencies

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
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(saveTimer);
  }, [salesPageData, productId, userId]);

  const updateData = (stepKey: keyof SalesPageData, data: any) => {
    setSalesPageData(prev => ({
      ...prev,
      [stepKey]: { ...prev[stepKey], ...data },
    }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
    }
    };

    // Add validation function for current step
    const canProceedToNext = () => {
    if (currentStep === 1) {
        // Step 1: Core Info - name and price (if not free) are required
        const hasName = salesPageData.coreInfo.name && salesPageData.coreInfo.name.trim().length > 0;
        const isFree = salesPageData.coreInfo.priceType === 'free';
        const hasValidPrice = isFree || (salesPageData.coreInfo.price && salesPageData.coreInfo.price > 0);
        return hasName && hasValidPrice;
    }
    // Other steps don't have required fields for now
    return true;
    };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePublish = async () => {
    setIsSaving(true);
    try {
      const productRef = doc(db, 'users', userId, 'products', productId);
      await updateDoc(productRef, {
        'salesPage.publish.status': 'published',
        'salesPage.publish.publishedAt': new Date(),
        published: true,
      });
      
      // Redirect to success page or dashboard
      navigate(`/products/${productId}/success`);
    } catch (error) {
      console.error('Error publishing:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const canPublish = salesPageData.coreInfo.name && salesPageData.coreInfo.price >= 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-neutral-400">Loading...</div>
      </div>
    );
  }

  const CurrentStepComponent = STEPS[currentStep - 1].component;

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

      {/* Main content */}
      <div className="flex h-[calc(100vh-120px)]">
        {/* Left: Form */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-8">
            <CurrentStepComponent
              data={salesPageData}
              updateData={updateData}
            />
            
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
            {currentStep >= 3 && currentStep < 5 && (
              <div className="mt-4 text-center">
                <button
                  onClick={handleNext}
                  className="text-sm text-neutral-400 hover:text-neutral-300 underline"
                >
                  Skip this step for now
                </button>
              </div>
            )}
            
            {/* Publish early option */}
            {currentStep === 2 && canPublish && (
              <div className="mt-6 p-4 bg-indigo-900/20 border border-indigo-600/30 rounded-lg">
                <p className="text-sm text-indigo-300">
                  💡 Your sales page has enough info to go live! You can publish now and add visuals later.
                </p>
                <button
                  onClick={() => setCurrentStep(5)}
                  className="mt-2 text-sm text-indigo-400 hover:text-indigo-300 underline"
                >
                  Jump to publish →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="w-1/2 bg-neutral-900 border-l border-neutral-800 p-8">
          <div className={`h-full ${previewMode === 'mobile' ? 'max-w-sm mx-auto' : ''}`}>
            <SalesPagePreview data={salesPageData} isMobile={previewMode === 'mobile'} />
          </div>
        </div>
      </div>
    </div>
  );
}