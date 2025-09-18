// step-components/StepCustomize.tsx

import { useState, useRef } from 'react';
import { StepComponentProps } from '../utils/products.types';
import { themePresets, elementLabels } from '../utils/ThemePresets';
import { moveElement, getEmbedUrl } from '../utils/ProductHelpers';
import { auth, db } from '../../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Import customize sections
import HeroSection from '../customize/HeroSection';
import VideoSection from '../customize/VideoSection';
import UrgencySection from '../customize/UrgencySection';
import FeaturesSection from '../customize/FeaturesSection';
import TestimonialSection from '../customize/TestimonialSection';
import ContentSection from '../customize/ContentSection';
import PurchaseSection from '../customize/PurchaseSection';

// Import preview components
import HeroPreview from '../customize/HeroPreview';
import VideoPreviewSection from '../customize/VideoPreview';
import UrgencyPreview from '../customize/UrgencyPreview';
import FeaturesPreview from '../customize/FeaturesPreview';
import TestimonialPreview from '../customize/TestimonialPreview';
import ContentPreview from '../customize/ContentPreview';
import PurchasePreview from '../customize/PurchasePreview';

export default function StepCustomize({ 
  formData, 
  setFormData, 
  setCurrentStep,
  saving,
  setSaving,
  setProductUrl
}: StepComponentProps) {
  const [videoRefreshKey, setVideoRefreshKey] = useState(0);
  
  // References for scrolling
  const heroRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const urgencyRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const testimonialRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const purchaseRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const refs = {
    hero: heroRef,
    video: videoRef,
    urgency: urgencyRef,
    features: featuresRef,
    testimonial: testimonialRef,
    content: contentRef,
    purchase: purchaseRef,
  };

  const currentTheme = themePresets[formData.themePreset] || themePresets[formData.customTheme as keyof typeof themePresets] || themePresets.dark;

  async function publishProduct() {
    if (!auth.currentUser || !setSaving || !setProductUrl) return;

    setSaving(true);
    try {
      const productsRef = collection(db, 'users', auth.currentUser.uid, 'products');
      const embedUrl = getEmbedUrl(formData.videoUrl);
      
      const docRef = await addDoc(productsRef, {
        title: formData.title,
        price: Math.round(parseFloat(formData.price) * 100),
        description: formData.description,
        resources: formData.resources.filter(r => r.title && r.url),
        content: formData.content || null,
        videoUrl: embedUrl || null,
        videoUrls: formData.videoUrls.filter(url => url).map(url => getEmbedUrl(url)),
        features: formData.features.filter(f => f.trim()),
        testimonial: formData.testimonial || null,
        guarantee: formData.guarantee,
        urgency: formData.urgency || null,
        color: formData.color,
        previewContent: formData.previewType === 'custom' 
          ? formData.customPreview 
          : formData.content.substring(0, 500),
        published: true,
        views: 0,
        sales: 0,
        createdAt: serverTimestamp(),
        videoPreviewType: formData.videoPreviewType,
        salesVideoUrl: formData.salesVideoUrl || null,
        videoPreviewDuration: formData.videoPreviewDuration,
        videoStartTime: formData.videoStartTime,
        videoThumbnailUrl: formData.videoThumbnailUrl || null,
        videoTitle: formData.videoTitle || 'Watch This First 👇',
        themePreset: formData.themePreset,
        customTheme: formData.customTheme,
        buttonGradient: formData.buttonGradient,
        featuresTitle: formData.featuresTitle,
        customUrgency: formData.customUrgency || null,
        pageTheme: formData.pageTheme,
        guaranteeItems: formData.guaranteeItems.filter(item => item.trim()),
        elementOrder: formData.elementOrder,
        urgencyIcon: formData.urgencyIcon,
        useUrgencyIcon: formData.useUrgencyIcon,
        previewType: formData.previewType,
        customPreview: formData.customPreview || null,
      });
    
      const url = `${window.location.origin}/p/${auth.currentUser.uid}/${docRef.id}`;
      setProductUrl(url);
      navigator.clipboard.writeText(url);
      setCurrentStep('success');
      
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Error creating product. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // Check which sections have content
  const hasContent = {
    hero: true,
    video: !!formData.videoUrl,
    urgency: !!formData.urgency,
    features: formData.features.some(f => f.trim()),
    testimonial: !!formData.testimonial,
    content: !!formData.content && !formData.content.startsWith('[REDIRECT:'),
    purchase: true
  };

  // Separate filled and empty sections
  const filledSections = ['hero', 'video', 'urgency', 'features', 'testimonial', 'content', 'purchase']
    .filter(section => hasContent[section as keyof typeof hasContent]);
  const emptySections = ['video', 'urgency', 'testimonial']
    .filter(section => !hasContent[section as keyof typeof hasContent]);

  // Edit sections mapping
  const editSections: Record<string, JSX.Element> = {
    hero: <HeroSection key="hero-edit" formData={formData} setFormData={setFormData} scrollToSection={() => scrollToSection(heroRef)} />,
    video: <VideoSection key="video-edit" formData={formData} setFormData={setFormData} scrollToSection={() => scrollToSection(videoRef)} />,
    urgency: <UrgencySection key="urgency-edit" formData={formData} setFormData={setFormData} scrollToSection={() => scrollToSection(urgencyRef)} />,
    features: <FeaturesSection key="features-edit" formData={formData} setFormData={setFormData} scrollToSection={() => scrollToSection(featuresRef)} />,
    testimonial: <TestimonialSection key="testimonial-edit" formData={formData} setFormData={setFormData} scrollToSection={() => scrollToSection(testimonialRef)} />,
    content: <ContentSection key="content-edit" formData={formData} setFormData={setFormData} scrollToSection={() => scrollToSection(contentRef)} previewStart={0} previewLength={500} setPreviewStart={() => {}} setPreviewLength={() => {}} />,
    purchase: <PurchaseSection key="purchase-edit" formData={formData} setFormData={setFormData} scrollToSection={() => scrollToSection(purchaseRef)} />,
  };

  // Preview elements mapping
  const previewElements: Record<string, JSX.Element | null> = {
    hero: <HeroPreview ref={heroRef} formData={formData} theme={currentTheme} />,
    video: formData.videoUrl ? <VideoPreviewSection ref={videoRef} formData={formData} theme={currentTheme} videoRefreshKey={videoRefreshKey} /> : null,
    urgency: formData.urgency ? <UrgencyPreview ref={urgencyRef} formData={formData} /> : null,
    features: formData.features.filter(f => f).length > 0 ? <FeaturesPreview ref={featuresRef} formData={formData} theme={currentTheme} /> : null,
    testimonial: formData.testimonial ? <TestimonialPreview ref={testimonialRef} formData={formData} theme={currentTheme} /> : null,
    content: formData.content && !formData.content.startsWith('[REDIRECT:') ? <ContentPreview ref={contentRef} formData={formData} theme={currentTheme} previewStart={0} previewLength={500} /> : null,
    purchase: <PurchasePreview ref={purchaseRef} formData={formData} theme={currentTheme} />,
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: currentTheme.bg }}>
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 p-4">
        <div className="mx-auto max-w-7xl flex justify-between items-center">
          <div>
            <h2 className="font-bold text-white">Customize Your Sales Page</h2>
            <p className="text-xs text-neutral-400">Full control over every element</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setCurrentStep('preview')}
              className="px-4 py-2 rounded-lg border border-neutral-700 hover:bg-neutral-800 text-white"
            >
              ← Back
            </button>
            <button
              onClick={publishProduct}
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium"
            >
              {saving ? 'Publishing...' : 'Publish Now 🚀'}
            </button>
          </div>
        </div>
      </div>

      {/* Split View */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Panel - Controls */}
        <div className="w-[450px] bg-neutral-950 border-r border-neutral-800 overflow-y-auto p-6 text-white">
          <div className="space-y-6">
            
            {/* Theme Selector */}
            <div className="border-b border-neutral-800 pb-4">
              <label className="text-sm font-semibold text-neutral-300 mb-3 block">Page Theme</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(themePresets).map(([key, theme]) => (
                  <button
                    key={key}
                    onClick={() => setFormData({...formData, themePreset: key as any})}
                    className={`p-2 rounded-lg border capitalize text-xs ${
                      formData.themePreset === key
                        ? 'border-green-600 bg-green-950/20'
                        : 'border-neutral-700'
                    }`}
                    style={{ backgroundColor: theme.bg, borderWidth: '2px' }}
                  >
                    <span style={{ color: theme.text }}>{key}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Element Order */}
           <div className="border-b border-neutral-800 pb-4">
            <label className="text-sm font-semibold text-neutral-300 mb-3 block">Page Layout Order</label>
                
                {(() => {
                    const activeElements = formData.elementOrder.filter(element => {
                    if (element === 'hero') return true;
                    if (element === 'video') return !!formData.videoUrl;
                    if (element === 'urgency') return !!formData.urgency;
                    if (element === 'features') return formData.features.some(f => f.trim());
                    if (element === 'testimonial') return !!formData.testimonial;
                    if (element === 'content') return !!formData.content && !formData.content.startsWith('[REDIRECT:');
                    if (element === 'purchase') return true;
                    return false;
                    });

                    if (activeElements.length <= 2) {
                    return (
                        <p className="text-xs text-neutral-500 italic">
                        Add more content to customize the order
                        </p>
                    );
                    }

                    return (
                    <div className="space-y-2">
                        {activeElements.map((element, index) => (
                        <div key={element} className="flex items-center gap-3 p-2 bg-neutral-900 rounded">
                            <span className="text-xs bg-neutral-800 w-6 h-6 rounded-full flex items-center justify-center">
                            {index + 1}
                            </span>
                            <span className="flex-1 text-sm text-neutral-300">
                            {elementLabels[element]}
                            </span>
                            <div className="flex gap-1">
                            <button
                                onClick={() => {
                                const currentIndex = formData.elementOrder.indexOf(element);
                                const prevElement = activeElements[index - 1];
                                if (prevElement) {
                                    const prevIndex = formData.elementOrder.indexOf(prevElement);
                                    setFormData({
                                    ...formData,
                                    elementOrder: moveElement(formData.elementOrder, currentIndex, prevIndex)
                                    });
                                }
                                }}
                                className={`px-2 py-1 text-xs rounded transition-colors ${
                                index === 0 
                                    ? 'bg-neutral-900 text-neutral-600 cursor-not-allowed opacity-40' 
                                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                                }`}
                                disabled={index === 0}
                            >
                                ↑
                            </button>
                            <button
                                onClick={() => {
                                const currentIndex = formData.elementOrder.indexOf(element);
                                const nextElement = activeElements[index + 1];
                                if (nextElement) {
                                    const nextIndex = formData.elementOrder.indexOf(nextElement);
                                    setFormData({
                                    ...formData,
                                    elementOrder: moveElement(formData.elementOrder, currentIndex, nextIndex)
                                    });
                                }
                                }}
                                className={`px-2 py-1 text-xs rounded transition-colors ${
                                index === activeElements.length - 1 
                                    ? 'bg-neutral-900 text-neutral-600 cursor-not-allowed opacity-40' 
                                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                                }`}
                                disabled={index === activeElements.length - 1}
                            >
                                ↓
                            </button>
                            </div>
                        </div>
                        ))}
                    </div>
                    );
                })()}
                </div>
            
            {/* Filled sections */}
            {filledSections.map(element => editSections[element]).filter(Boolean)}
            
            {/* Divider if there are empty sections */}
            {emptySections.length > 0 && (
              <div className="border-t border-neutral-800 pt-4 mt-4">
                <p className="text-xs text-neutral-500 mb-3">Optional Elements</p>
              </div>
            )}
            
            {/* Empty/optional sections */}
            {emptySections.map(element => editSections[element]).filter(Boolean)}
          </div>
        </div>

        {/* Right Panel - Live Preview */}
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: currentTheme.bg }}>
          <div className="p-6">
            <div className="mx-auto max-w-3xl">
              {/* Render elements in custom order */}
              {formData.elementOrder.map(element => previewElements[element]).filter(Boolean)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}