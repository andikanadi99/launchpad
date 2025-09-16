// NewProduct.tsx (Refactored)

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Import step components
import StepBasics from './components/StepBasics';
import StepContent from './components/StepContent';
import StepPreview from './components/StepPreview';
import StepCustomize from './components/StepCustomize';
import StepSuccess from './components/StepSuccess';

// Import types and utilities
import { ProductFormData, Step, ContentType } from './utils/products.types';
import { defaultFormData } from './utils/ProductHelpers';

export default function NewProduct() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('basics');
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [productUrl, setProductUrl] = useState('');

  // Props to pass to all step components
  const stepProps = {
    formData,
    setFormData,
    setCurrentStep,
    saving,
    setSaving,
    productUrl,
    setProductUrl,
  };

  // Render the appropriate step based on currentStep
  switch (currentStep) {
    case 'basics':
      return <StepBasics {...stepProps} />;
      
    case 'content':
      return <StepContent {...stepProps} />;
      
    case 'preview':
      return <StepPreview {...stepProps} />;
      
    case 'customize':
      return <StepCustomize {...stepProps} />;
      
    case 'success':
      return <StepSuccess {...stepProps} navigate={navigate} />;
      
    default:
      return null;
  }
}