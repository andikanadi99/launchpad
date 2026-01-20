import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  ArrowLeft, ArrowRight, Save, Check, Loader
} from 'lucide-react';

// Step components
import DeliveryStep2 from './DeliveryStep2';
import DeliveryPreview from './delivery page components/DeliveryPreview';

// ============================================
// DELIVERY DATA INTERFACE
// ============================================
export interface DeliveryData {
  status: 'pending' | 'configured';
  
  // SECTION 1: Confirmation Email (always required)
  email: {
    subject: string;
    body: string;
    includeAccessButton: boolean;
  };
  
  // SECTION 2: Delivery Method
  deliveryMethod: 'email-only' | 'hosted' | 'redirect';
  
  // Hosted Content (when deliveryMethod === 'hosted')
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
  
  configuredAt?: Date;
}

// Default delivery data
export const DEFAULT_DELIVERY_DATA: DeliveryData = {
  status: 'pending',
  
  email: {
    subject: 'Your purchase is confirmed! 🎉',
    body: `Hi {{customer_name}}!

Thank you for purchasing {{product_name}}.

Your order is confirmed and you now have access to your product.

{{access_button}}

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
};

const STEPS = [
  { id: 1, name: 'Delivery Setup' },
  { id: 2, name: 'Preview & Save' }
];

export default function DeliveryBuilder() {
  const navigate = useNavigate();
  const { productId } = useParams();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [productName, setProductName] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Delivery data state
  const [deliveryData, setDeliveryData] = useState<DeliveryData>(DEFAULT_DELIVERY_DATA);

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
          alert('No product ID provided');
          navigate('/dashboard');
          return;
        }

        try {
          const productRef = doc(db, 'users', user.uid, 'products', productId);
          const productSnap = await getDoc(productRef);

          if (productSnap.exists()) {
            const data = productSnap.data();
            
            // Get product name for preview
            setProductName(data.salesPage?.coreInfo?.name || 'Your Product');
            
            // Load existing delivery data if any (merge with defaults)
            if (data.delivery) {
              setDeliveryData(prev => ({
                ...prev,
                ...data.delivery,
                email: { ...prev.email, ...data.delivery.email },
                hosted: { ...prev.hosted, ...data.delivery.hosted },
                redirect: { ...prev.redirect, ...data.delivery.redirect },
              }));
            }
          } else {
            alert('Product not found');
            navigate('/dashboard');
          }
        } catch (error) {
          console.error('Error loading product:', error);
          alert('Failed to load product');
        } finally {
          setIsLoading(false);
        }
      });

      return () => unsubscribe();
    };

    init();
  }, [productId, navigate]);

  // Update delivery data (supports nested updates)
  const updateData = (updates: Partial<DeliveryData>) => {
    setDeliveryData(prev => ({ ...prev, ...updates }));
  };

  // Update nested email data
  const updateEmail = (updates: Partial<DeliveryData['email']>) => {
    setDeliveryData(prev => ({
      ...prev,
      email: { ...prev.email, ...updates }
    }));
  };

  // Update nested hosted data
  const updateHosted = (updates: Partial<DeliveryData['hosted']>) => {
    setDeliveryData(prev => ({
      ...prev,
      hosted: { ...prev.hosted, ...updates }
    }));
  };

  // Update nested redirect data
  const updateRedirect = (updates: Partial<DeliveryData['redirect']>) => {
    setDeliveryData(prev => ({
      ...prev,
      redirect: { ...prev.redirect, ...updates }
    }));
  };

  // Navigation handlers
  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Validation for "Next" button
  const canProceedToNext = () => {
    if (currentStep === 1) {
      // Email is always required
      if (!deliveryData.email.subject.trim() || !deliveryData.email.body.trim()) {
        return false;
      }
      
      // Validate based on delivery method
      if (deliveryData.deliveryMethod === 'redirect') {
        return deliveryData.redirect.url.trim().length > 0;
      }
      
      if (deliveryData.deliveryMethod === 'hosted') {
        // At least one hosted content type must be configured
        const hasFiles = deliveryData.hosted.files.length > 0;
        const hasVideos = deliveryData.hosted.videos.length > 0;
        const hasNotion = deliveryData.hosted.notionUrl.trim().length > 0;
        const hasContent = deliveryData.hosted.hasCustomContent;
        return hasFiles || hasVideos || hasNotion || hasContent;
      }
      
      // email-only just needs the email configured
      return true;
    }
    return true;
  };

  // Get validation message
  const getValidationMessage = (): string | null => {
    if (canProceedToNext()) return null;
    
    if (currentStep === 1) {
      const missing: string[] = [];
      
      if (!deliveryData.email.subject.trim()) missing.push('Email Subject');
      if (!deliveryData.email.body.trim()) missing.push('Email Body');
      
      if (deliveryData.deliveryMethod === 'redirect' && !deliveryData.redirect.url.trim()) {
        missing.push('Redirect URL');
      }
      
      if (deliveryData.deliveryMethod === 'hosted') {
        const hasFiles = deliveryData.hosted.files.length > 0;
        const hasVideos = deliveryData.hosted.videos.length > 0;
        const hasNotion = deliveryData.hosted.notionUrl.trim().length > 0;
        const hasContent = deliveryData.hosted.hasCustomContent;
        if (!hasFiles && !hasVideos && !hasNotion && !hasContent) {
          missing.push('At least one hosted content item');
        }
      }
      
      return missing.length > 0 ? `Required: ${missing.join(', ')}` : null;
    }
    
    return null;
  };

  // Save to Firestore
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

      console.log('âœ… Delivery configuration saved successfully');
      setSaveSuccess(true);
      
      // Redirect after 2 seconds
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

  // Loading state
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
              ) : saveSuccess ? (
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-500">Saved!</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Progress Steps */}
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
      {saveSuccess && (
        <div className="bg-green-500/10 border-b border-green-500/30 px-6 py-3">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            <p className="text-sm text-green-500">
              âœ… Delivery configured successfully! Returning to dashboard...
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-8">
        {currentStep === 1 && (
          <DeliveryStep2 
            data={deliveryData}
            updateData={updateData}
            updateEmail={updateEmail}
            updateHosted={updateHosted}
            updateRedirect={updateRedirect}
            productName={productName}
            productId={productId || ''}
          />
        )}
        
        {currentStep === 2 && (
          <DeliveryPreview 
            data={deliveryData}
            productName={productName}
          />
        )}

        {/* Navigation Buttons */}
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

          <div className="flex flex-col items-end gap-1">
            {/* Validation message */}
            {getValidationMessage() && (
              <span className="text-xs text-amber-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {getValidationMessage()}
              </span>
            )}
            
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
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-neutral-700 disabled:text-neutral-500 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Configuration
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}