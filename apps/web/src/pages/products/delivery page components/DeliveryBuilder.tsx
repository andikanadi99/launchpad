import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { auth, db } from '../../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  ArrowLeft, ArrowRight, Save, Check, Loader
} from 'lucide-react';

// Step components
import DeliveryStepEmail from './DeliveryStepEmail';
import DeliveryStepMethod from './DeliveryStepMethod';
import DeliveryStepQuickPage from './DeliveryStepQuickPage';
import DeliveryStepRedirect from './DeliveryStepRedirect';
import DeliveryPreview from './DeliveryPreview';

// ============================================
// HELPERS
// ============================================
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    const parts = parsed.hostname.split('.');
    // Must have at least 2 parts (e.g. google.com) and TLD must be 2+ chars
    return parts.length >= 2 && parts[parts.length - 1].length >= 2;
  } catch {
    return false;
  }
}

// ============================================
// DELIVERY DATA INTERFACE
// ============================================
export interface DeliveryData {
  status: 'pending' | 'configured';
  
  // STEP 1: Confirmation Email (always required)
  email: {
    subject: string;
    body: string;
    includeAccessButton: boolean;
  };
  
  // STEP 2: Delivery Method
  deliveryMethod: 'email-only' | 'quick-page' | 'custom-editor' | 'redirect';
  
  // Quick Page Content (when deliveryMethod === 'quick-page')
  hosted: {
    files: Array<{
      id: string;
      url: string;
      name: string;
      size: number;
      type: string;
      uploadedAt: Date;
    }>;
    videos: Array<{
      id: string;
      url: string;
      title: string;
      platform: 'youtube' | 'vimeo' | 'loom' | 'other';
    }>;
    notionUrl: string;
    hasCustomContent: boolean;
    contentBlocks: string;
  };
  
  // Redirect (when deliveryMethod === 'redirect')
  redirect: {
    url: string;
    delay: number;
    showThankYou: boolean;
  };

  // Delivery Page Design (when deliveryMethod === 'quick-page' or 'redirect')
  design: {
    backgroundColor: string;
    accentColor: string;
    logoUrl: string;
    headingText: string;
    subText: string;
  };
  
  configuredAt?: Date;
}

// Default delivery data
export const DEFAULT_DELIVERY_DATA: DeliveryData = {
  status: 'pending',
  
  email: {
    subject: 'Your purchase is confirmed!',
    body: `Hi {{customer_name}}!

Thank you for purchasing {{product_name}}.

Your order is confirmed and you now have access to your product.

If you have any questions, just reply to this email.

Cheers!`,
    includeAccessButton: true,
  },
  
  deliveryMethod: 'email-only',
  
  hosted: {
    files: [],
    videos: [],
    notionUrl: '',
    hasCustomContent: false,
    contentBlocks: '[]',
  },
  
  redirect: {
    url: '',
    delay: 0,
    showThankYou: true,
  },

  design: {
    backgroundColor: '#ffffff',
    accentColor: '#4f46e5',
    logoUrl: '',
    headingText: 'Thank you for your purchase!',
    subText: "Here's your access to {{product_name}}",
  },
};

// ============================================
// STEP DEFINITIONS
// ============================================
const getSteps = (method: DeliveryData['deliveryMethod']) => {
  const steps = [
    { id: 1, name: 'Email' },
    { id: 2, name: 'Delivery Method' },
  ];
  
  if (method === 'quick-page') {
    steps.push({ id: 3, name: 'Quick Page Setup' });
  } else if (method === 'redirect') {
    steps.push({ id: 3, name: 'Redirect Setup' });
  } else if (method === 'custom-editor') {
    steps.push({ id: 3, name: 'Content Editor' });
  }
  // email-only: no Step 3
  
  steps.push({ id: steps.length + 1, name: 'Preview & Save' });
  return steps;
};

export default function DeliveryBuilder() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const isPreviewMode = searchParams.get('preview') === 'true';
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [productName, setProductName] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Delivery data state
  const [deliveryData, setDeliveryData] = useState<DeliveryData>(DEFAULT_DELIVERY_DATA);

  // Dynamic steps based on delivery method
  const steps = getSteps(deliveryData.deliveryMethod);
  const totalSteps = steps.length;
  const isLastStep = currentStep === totalSteps;

  // Initialize - load product data
  useEffect(() => {
    const init = async () => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!user) {
          setIsLoading(false);
          navigate('/auth/signin');
          return;
        }

        setUserId(user.uid);

        if (!productId) {
          navigate('/dashboard');
          return;
        }

        try {
          const productRef = doc(db, 'users', user.uid, 'products', productId);
          const productSnap = await getDoc(productRef);

          if (productSnap.exists()) {
            const data = productSnap.data();
            
            setProductName(data.salesPage?.coreInfo?.name || 'Your Product');
            
            if (data.delivery) {
              setDeliveryData(prev => ({
                ...prev,
                ...data.delivery,
                email: { ...prev.email, ...data.delivery.email },
                hosted: { ...prev.hosted, ...data.delivery.hosted },
                redirect: { ...prev.redirect, ...data.delivery.redirect },
                design: { ...prev.design, ...(data.delivery.design || {}) },
              }));
            }
          } else {
            navigate('/dashboard');
          }
        } catch (error) {
          console.error('Error loading product:', error);
          navigate('/dashboard');
        } finally {
          setIsLoading(false);
        }
      });

      return () => unsubscribe();
    };

    init();
  }, [productId, navigate]);

  // ==========================================
  // UPDATE FUNCTIONS
  // ==========================================
  const updateData = (updates: Partial<DeliveryData>) => {
    setDeliveryData(prev => ({ ...prev, ...updates }));
  };

  const updateEmail = (updates: Partial<DeliveryData['email']>) => {
    setDeliveryData(prev => ({
      ...prev,
      email: { ...prev.email, ...updates }
    }));
  };

  const updateHosted = (updates: Partial<DeliveryData['hosted']>) => {
    setDeliveryData(prev => ({
      ...prev,
      hosted: { ...prev.hosted, ...updates }
    }));
  };

  const updateRedirect = (updates: Partial<DeliveryData['redirect']>) => {
    setDeliveryData(prev => ({
      ...prev,
      redirect: { ...prev.redirect, ...updates }
    }));
  };

  const updateDesign = (updates: Partial<DeliveryData['design']>) => {
    setDeliveryData(prev => ({
      ...prev,
      design: { ...prev.design, ...updates }
    }));
  };

  // ==========================================
  // NAVIGATION
  // ==========================================
  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // When method changes in Step 2, reset to Step 2 if we were on a later step
  const handleMethodChange = (method: DeliveryData['deliveryMethod']) => {
    updateData({ deliveryMethod: method });
    if (currentStep > 2) {
      setCurrentStep(2);
    }
  };

  // ==========================================
  // VALIDATION
  // ==========================================
  const canProceedToNext = () => {
    if (currentStep === 1) {
      return deliveryData.email.subject.trim().length > 0 && 
             deliveryData.email.body.trim().length > 0;
    }
    
    if (currentStep === 2) {
      return true;
    }

    if (currentStep === 3 && deliveryData.deliveryMethod === 'quick-page') {
      const hasFiles = deliveryData.hosted.files.length > 0;
      const hasVideos = deliveryData.hosted.videos.length > 0;
      const hasNotion = deliveryData.hosted.notionUrl.trim().length > 0;
      return hasFiles || hasVideos || hasNotion;
    }

    if (currentStep === 3 && deliveryData.deliveryMethod === 'redirect') {
      return isValidUrl(deliveryData.redirect.url);
    }

    if (currentStep === 3 && deliveryData.deliveryMethod === 'custom-editor') {
      return deliveryData.hosted.hasCustomContent;
    }

    return true;
  };

  const getValidationMessage = (): string | null => {
    if (canProceedToNext()) return null;
    
    if (currentStep === 1) {
      const missing: string[] = [];
      if (!deliveryData.email.subject.trim()) missing.push('Email Subject');
      if (!deliveryData.email.body.trim()) missing.push('Email Body');
      return `Required: ${missing.join(', ')}`;
    }

    if (currentStep === 3) {
      if (deliveryData.deliveryMethod === 'quick-page') {
        return 'Add at least one file, video, or embedded page';
      }
      if (deliveryData.deliveryMethod === 'redirect') {
        return deliveryData.redirect.url.trim().length === 0
          ? 'Required: Redirect URL'
          : 'Please enter a valid URL starting with https:// or http://';
      }
      if (deliveryData.deliveryMethod === 'custom-editor') {
        return 'Create your content page using the editor first';
      }
    }
    
    return null;
  };

  // ==========================================
  // SAVE
  // ==========================================
  const handleSave = async () => {
    if (!userId || !productId) return;

    setIsSaving(true);
    try {
      const productRef = doc(db, 'users', userId, 'products', productId);
      
      await updateDoc(productRef, {
        delivery: {
          ...deliveryData,
          status: 'configured',
          configuredAt: new Date()
        },
        lastUpdated: new Date()
      });

      console.log('Delivery configuration saved successfully');
      setSaveSuccess(true);
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      
    } catch (error) {
      console.error('Error saving delivery config:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-neutral-400 mx-auto mb-2" />
          <div className="text-neutral-400">Loading...</div>
        </div>
      </div>
    );
  }

  // Determine which step component to show for Step 3
  const renderStep3 = () => {
    switch (deliveryData.deliveryMethod) {
      case 'quick-page':
        return (
          <DeliveryStepQuickPage
          data={deliveryData}
          updateHosted={updateHosted}
          updateDesign={updateDesign}
          productName={productName}
          productId={productId || ''}
          onBack={() => setCurrentStep(2)}
          onNext={() => setCurrentStep(4)}
          />
        );
      case 'redirect':
        return (
          <DeliveryStepRedirect
            data={deliveryData}
            updateRedirect={updateRedirect}
            updateDesign={updateDesign}
            productName={productName}
            productId={productId || ''}
            onBack={() => setCurrentStep(2)}
            onNext={() => setCurrentStep(4)}
          />
        );
      case 'custom-editor':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold">Content Editor</h2>
              <p className="text-neutral-400 mt-1">
                Build a fully custom delivery page with our rich editor
              </p>
            </div>

            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-8 text-center">
              {deliveryData.hosted.hasCustomContent ? (
                <>
                  <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-7 h-7 text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Content Page Created</h3>
                  <p className="text-sm text-neutral-400 mb-6">
                    Your custom content page is ready. You can edit it anytime.
                  </p>
                  <button
                    onClick={() => navigate(`/products/${productId}/content-builder`)}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-medium transition-colors"
                  >
                    Edit Content Page
                  </button>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ArrowRight className="w-7 h-7 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Create Your Content Page</h3>
                  <p className="text-sm text-neutral-400 mb-6">
                    Use our drag-and-drop editor to build a custom delivery page with rich text, images, videos, and more.
                  </p>
                  <button
                    onClick={() => navigate(`/products/${productId}/content-builder`)}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-medium transition-colors"
                  >
                    Open Content Editor
                  </button>
                  <p className="text-xs text-neutral-500 mt-3">
                    You'll return here after creating your page
                  </p>
                </>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // ==========================================
  // PREVIEW MODE: Full-page preview from Dashboard
  // ==========================================
  if (isPreviewMode && !isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100">
        <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold">Delivery Preview</h1>
                <p className="text-sm text-neutral-400">{productName}</p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/products/${productId}/delivery`)}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-sm font-medium transition-colors"
            >
              Edit Delivery
            </button>
          </div>
        </header>

        <div className="max-w-4xl mx-auto p-6">
          <DeliveryPreview 
            data={deliveryData}
            productName={productName}
          />
        </div>
      </div>
    );
  }

  // ==========================================
  // SAVE SUCCESS: Full-page confirmation
  // ==========================================
  if (saveSuccess) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Delivery Configured!</h2>
          <p className="text-neutral-400 text-sm">Redirecting to dashboard...</p>
        </div>
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
                <h1 className="text-lg font-semibold">Setup Product Delivery</h1>
                <p className="text-sm text-neutral-400">{productName}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-neutral-400">Saving...</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2">
            {steps.map((step) => (
              <div key={step.id} className="flex-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      step.id <= currentStep ? 'bg-indigo-600' : 'bg-neutral-800'
                    }`}
                  />
                  {step.id === currentStep && (
                    <span className="text-xs text-neutral-400 whitespace-nowrap">{step.name}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-8">
        {/* Step 1: Email */}
        {currentStep === 1 && (
          <DeliveryStepEmail
            data={deliveryData}
            updateEmail={updateEmail}
            productName={productName}
          />
        )}
        
        {/* Step 2: Method Selection */}
        {currentStep === 2 && (
          <DeliveryStepMethod
            data={deliveryData}
            onMethodChange={handleMethodChange}
          />
        )}

        {/* Step 3: Configuration (conditional) */}
        {currentStep === 3 && renderStep3()}
        
        {/* Final Step: Preview & Save */}
        {isLastStep && currentStep > 2 && (
          <DeliveryPreview 
            data={deliveryData}
            productName={productName}
          />
        )}

        {/* Navigation Buttons - hide when quick-page Step 3 is active (it has its own nav) */}
        {!(currentStep === 3 && (deliveryData.deliveryMethod === 'quick-page' || deliveryData.deliveryMethod === 'redirect')) && (
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
              Step {currentStep} of {totalSteps}
            </span>
          </div>

          <div className="flex flex-col items-end gap-1">
            {getValidationMessage() && (
              <span className="text-xs text-amber-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {getValidationMessage()}
              </span>
            )}
            
            {!isLastStep ? (
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
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-neutral-700 disabled:text-neutral-500 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Configuration
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}