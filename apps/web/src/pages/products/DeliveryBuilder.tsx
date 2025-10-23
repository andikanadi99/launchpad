import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  ArrowLeft, ArrowRight, Save, Check, Loader
} from 'lucide-react';

// Step components (we'll create these next)
import DeliveryTypeSelector from './delivery page components/DeliveryTypeSelector';
import DeliveryContentForm from './delivery page components/DeliveryContentForm';
import DeliveryPreview from './delivery page components/DeliveryPreview';

// Delivery data type
export interface DeliveryData {
  type: 'email-only' | 'content' | 'file' | 'redirect';
  status: 'pending' | 'configured';
  
  // Email-only fields
  emailSubject?: string;
  emailBody?: string;
  
  // Content delivery fields
  content?: string;
  
  // File delivery fields (future)
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
  
  // Common fields
  accessInstructions?: string;
  configuredAt?: Date;
}

const STEPS = [
  { id: 1, name: 'Delivery Type' },
  { id: 2, name: 'Configure' },
  { id: 3, name: 'Preview & Save' }
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

  // Default delivery data
  const [deliveryData, setDeliveryData] = useState<DeliveryData>({
    type: 'email-only',
    status: 'pending',
    emailSubject: 'Thank you for your purchase!',
    emailBody: `Hi there! Thank you for purchasing {{product_name}}.

Your order is confirmed. We're working on your product and will send access details to this email soon.

Questions? Reply to this email.

Thanks!`,
    accessInstructions: undefined
  });

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
            
            // Load existing delivery data if any
            if (data.delivery) {
              setDeliveryData({
                ...deliveryData,
                ...data.delivery
              });
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

  // Update delivery data
  const updateData = (updates: Partial<DeliveryData>) => {
    setDeliveryData(prev => ({ ...prev, ...updates }));
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
      return deliveryData.type !== undefined;
    }
    if (currentStep === 2) {
      // Validate based on delivery type
      if (deliveryData.type === 'email-only') {
        return deliveryData.emailSubject && deliveryData.emailBody;
      }
      if (deliveryData.type === 'content') {
        // Check if content has at least one block
        try {
          const blocks = JSON.parse(deliveryData.content || '[]');
          return blocks.length > 0;
        } catch {
          // Fallback to plain text check
          return deliveryData.content && deliveryData.content.trim().length > 0;
        }
      }
      if (deliveryData.type === 'redirect') {
        return deliveryData.redirectUrl && deliveryData.redirectUrl.trim().length > 0;
      }
      if (deliveryData.type === 'file') {
        return deliveryData.files && deliveryData.files.length > 0;
      }
    }
    return true;
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

      console.log('✅ Delivery configuration saved successfully');
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
              ✅ Delivery configured successfully! Returning to dashboard...
            </p>
          </div>
        </div>
      )}

      {/* Main Content - Render Step Components */}
      <div className="max-w-3xl mx-auto p-8">
        {currentStep === 1 && (
          <DeliveryTypeSelector 
            data={deliveryData}
            updateData={updateData}
          />
        )}
        
        {currentStep === 2 && (
          <DeliveryContentForm 
            data={deliveryData}
            updateData={updateData}
            productName={productName}
          />
        )}
        
        {currentStep === 3 && (
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
  );
}