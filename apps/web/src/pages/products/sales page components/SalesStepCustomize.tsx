import React, { useState, useEffect } from 'react';
import { 
  Palette, Type, Layout, Sparkles, RotateCcw, Eye, EyeOff,
  GripVertical, ChevronDown, ChevronUp, Monitor, Smartphone,
  Square, Circle, Hexagon, Sun, Moon, Zap, Check, Settings2,
  Sliders, Maximize2, Minimize2, Move, Package, Image, Layers,
  Accessibility, Shadow, Heading, AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';

// Theme presets
const THEMES = {
  modern: {
    name: 'Modern',
    icon: <Monitor className="w-4 h-4" />,
    description: 'Clean & professional',
    primaryColor: '#6366F1',
    secondaryColor: '#8B5CF6',
    backgroundColor: '#0A0A0A',
    textColor: '#E5E5E5',
    fontPair: 'inter-system',
    buttonStyle: 'rounded',
    cardStyle: 'shadow',
    spacing: 'comfortable',
    animations: true,
    buttonShadow: 'medium',
    hoverIntensity: 'normal'
  },
  bold: {
    name: 'Bold',
    icon: <Zap className="w-4 h-4" />,
    description: 'High impact & energetic',
    primaryColor: '#DC2626',
    secondaryColor: '#F59E0B',
    backgroundColor: '#000000',
    textColor: '#FFFFFF',
    fontPair: 'montserrat-opensans',
    buttonStyle: 'square',
    cardStyle: 'border',
    spacing: 'spacious',
    animations: true,
    buttonShadow: 'large',
    hoverIntensity: 'bold'
  },
  elegant: {
    name: 'Elegant',
    icon: <Hexagon className="w-4 h-4" />,
    description: 'Refined & sophisticated',
    primaryColor: '#059669',
    secondaryColor: '#0891B2',
    backgroundColor: '#FAFAFA',
    textColor: '#1F2937',
    fontPair: 'playfair-lato',
    buttonStyle: 'rounded',
    cardStyle: 'flat',
    spacing: 'comfortable',
    animations: false,
    buttonShadow: 'none',
    hoverIntensity: 'subtle'
  },
  playful: {
    name: 'Playful',
    icon: <Circle className="w-4 h-4" />,
    description: 'Fun & approachable',
    primaryColor: '#EC4899',
    secondaryColor: '#A855F7',
    backgroundColor: '#FEF3F2',
    textColor: '#374151',
    fontPair: 'poppins-roboto',
    buttonStyle: 'pill',
    cardStyle: 'shadow',
    spacing: 'spacious',
    animations: true,
    buttonShadow: 'medium',
    hoverIntensity: 'normal'
  },
  dark: {
    name: 'Dark Pro',
    icon: <Moon className="w-4 h-4" />,
    description: 'Sleek & modern',
    primaryColor: '#10B981',
    secondaryColor: '#06B6D4',
    backgroundColor: '#030712',
    textColor: '#F3F4F6',
    fontPair: 'inter-system',
    buttonStyle: 'rounded',
    cardStyle: 'shadow',
    spacing: 'compact',
    animations: true,
    buttonShadow: 'medium',
    hoverIntensity: 'normal'
  }
};

// Font pair options
const FONT_PAIRS = {
  'inter-system': { heading: 'Inter', body: 'system-ui', label: 'Inter + System' },
  'playfair-lato': { heading: 'Playfair Display', body: 'Lato', label: 'Playfair + Lato' },
  'montserrat-opensans': { heading: 'Montserrat', body: 'Open Sans', label: 'Montserrat + Open Sans' },
  'raleway-merriweather': { heading: 'Raleway', body: 'Merriweather', label: 'Raleway + Merriweather' },
  'poppins-roboto': { heading: 'Poppins', body: 'Roboto', label: 'Poppins + Roboto' }
};

// Available sections for reordering
const SECTIONS = [
  { id: 'header', name: 'Header Image', locked: false, canHide: true },
  { id: 'hero', name: 'Hero Section', locked: false, canHide: false },
  { id: 'video', name: 'Sales Video', locked: false, canHide: true },
  { id: 'benefits', name: 'Key Benefits', locked: false, canHide: true },
  { id: 'description', name: 'Product Description', locked: false, canHide: true },
  { id: 'audience', name: 'Target Audience', locked: false, canHide: true },
  { id: 'gallery', name: 'Image Gallery', locked: false, canHide: true },
  { id: 'pricing', name: 'Pricing & CTA', locked: false, canHide: false }
];

interface CustomizeData {
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
}

interface StepCustomizeProps {
  data: any;
  updateData: (stepKey: string, data: any) => void;
}

const scrollToSectionWithHighlight = (sectionId: string) => {
  setTimeout(() => {
    const targetSection = document.querySelector(`#${sectionId}`);
    if (targetSection) {
      targetSection.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      
      // Add temporary highlight
      targetSection.classList.add('ring-2', 'ring-indigo-500', 'ring-opacity-50', 'transition-all');
      setTimeout(() => {
        targetSection.classList.remove('ring-2', 'ring-indigo-500', 'ring-opacity-50');
      }, 2000);
    }
  }, 100);
};

const SalesStepCustomize: React.FC<StepCustomizeProps> = ({ data, updateData }) => {
  const [localData, setLocalData] = useState<CustomizeData>({
    theme: 'modern',
    primaryColor: '#6366F1',
    secondaryColor: '#8B5CF6',
    backgroundColor: '#0A0A0A',
    textColor: '#E5E5E5',
    fontPair: 'inter-system',
    buttonStyle: 'rounded',
    cardStyle: 'shadow',
    spacing: 'comfortable',
    sectionOrder: ['header', 'hero', 'video', 'benefits', 'description', 'audience', 'gallery', 'pricing'],
    hiddenSections: [],
    ctaButtonText: data.coreInfo?.priceType === 'free' ? 'Get Instant Access' : 'Buy Now',
    animations: true,
    // Advanced defaults
    heroTitleSize: 'large',
    heroAlignment: 'center',
    benefitsLayout: 'double',
    benefitsIconStyle: 'circle',
    pricingBoxWidth: 'standard',
    buttonSize: 'large',
    galleryColumns: 3,
    contentWidth: 'standard',
    // Effects defaults
    buttonShadow: 'medium',
    cardElevation: 'raised',
    imageBorderRadius: 'medium',
    hoverIntensity: 'normal',
    // Typography defaults
    textScale: 'normal',
    lineHeight: 'normal',
    letterSpacing: 'normal',
    headingWeight: 'bold',
    // Mobile defaults
    mobileHideSections: [],
    mobileFontScale: 100,
    // Accessibility defaults
    highContrast: false,
    focusIndicatorStyle: 'default',
    reducedMotion: false,
    ...data.design
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedTab, setAdvancedTab] = useState<'colors' | 'fonts' | 'layout' | 'components'>('colors');
  const [draggedSection, setDraggedSection] = useState<string | null>(null);

  // Update parent immediately when data changes
  useEffect(() => {
    updateData('design', localData);
  }, [localData, updateData]);

  const applyTheme = (themeKey: string) => {
    const theme = THEMES[themeKey as keyof typeof THEMES];
    if (theme) {
      const newData = {
        ...localData,
        theme: themeKey,
        primaryColor: theme.primaryColor,
        secondaryColor: theme.secondaryColor,
        backgroundColor: theme.backgroundColor,
        textColor: theme.textColor,
        fontPair: theme.fontPair,
        buttonStyle: theme.buttonStyle as any,
        cardStyle: theme.cardStyle as any,
        spacing: theme.spacing as any,
        animations: theme.animations,
        buttonShadow: theme.buttonShadow as any,
        hoverIntensity: theme.hoverIntensity as any,
        // Preserve user's button text
        ctaButtonText: localData.ctaButtonText
      };
      setLocalData(newData);
      scrollToSectionWithHighlight('hero-section');
    }
  };

  const updateField = (field: keyof CustomizeData, value: any) => {
    const newData = {
      ...localData,
      [field]: value
    };
    setLocalData(newData);
    
    // Smart scroll based on field
    const scrollMap: Record<string, string> = {
      primaryColor: 'pricing-section',
      ctaButtonText: 'pricing-section',
      fontPair: 'hero-section',
      heroTitleSize: 'hero-section',
      heroAlignment: 'hero-section',
      benefitsLayout: 'benefits-section',
      benefitsIconStyle: 'benefits-section',
      buttonStyle: 'pricing-section',
      spacing: 'hero-section',
      pricingBoxWidth: 'pricing-section',
      buttonSize: 'pricing-section',
      galleryColumns: 'gallery-section'
    };
    
    if (scrollMap[field]) {
      scrollToSectionWithHighlight(scrollMap[field]);
    }
  };

  const toggleSectionVisibility = (sectionId: string) => {
    const hidden = localData.hiddenSections.includes(sectionId);
    if (hidden) {
      setLocalData({
        ...localData,
        hiddenSections: localData.hiddenSections.filter(id => id !== sectionId)
      });
    } else {
      setLocalData({
        ...localData,
        hiddenSections: [...localData.hiddenSections, sectionId]
      });
    }
  };

  const handleDragStart = (sectionId: string) => {
    setDraggedSection(sectionId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedSection || draggedSection === targetId) return;

    const draggedIndex = localData.sectionOrder.indexOf(draggedSection);
    const targetIndex = localData.sectionOrder.indexOf(targetId);

    const newOrder = [...localData.sectionOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedSection);
    
    setLocalData({
      ...localData,
      sectionOrder: newOrder
    });
  };

  const resetToThemeDefaults = () => {
    const theme = THEMES[localData.theme as keyof typeof THEMES];
    if (theme) {
      applyTheme(localData.theme);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">Step 4: Customize Your Design</h2>
        <p className="text-neutral-400 mt-1">
          Choose a style that matches your brand
        </p>
      </div>

      {/* SIMPLIFIED DEFAULT VIEW */}
      {!showAdvanced ? (
        <>
          {/* Theme Selection - Primary Focus */}
          <div>
            <label className="block text-sm font-medium mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Choose Your Style
            </label>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(THEMES).map(([key, theme]) => (
                <button
                  key={key}
                  onClick={() => applyTheme(key)}
                  className={`relative p-4 rounded-lg border-2 transition-all ${
                    localData.theme === key
                      ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/20'
                      : 'border-neutral-700 hover:border-neutral-600 bg-neutral-800/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${localData.theme === key ? 'text-indigo-400' : 'text-neutral-400'}`}>
                      {theme.icon}
                    </div>
                    <div className="text-left flex-1">
                      <div className={`font-medium ${localData.theme === key ? 'text-indigo-300' : 'text-neutral-200'}`}>
                        {theme.name}
                      </div>
                      <div className="text-xs text-neutral-500 mt-1">{theme.description}</div>
                      <div className="flex gap-1 mt-2">
                        <div 
                          className="w-4 h-4 rounded-full border border-neutral-600"
                          style={{ backgroundColor: theme.primaryColor }}
                        />
                        <div 
                          className="w-4 h-4 rounded-full border border-neutral-600"
                          style={{ backgroundColor: theme.secondaryColor }}
                        />
                        <div 
                          className="w-4 h-4 rounded-full border border-neutral-600"
                          style={{ backgroundColor: theme.backgroundColor }}
                        />
                      </div>
                    </div>
                  </div>
                  {localData.theme === key && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-5 h-5 text-indigo-500" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Essentials */}
          <div className="p-6 bg-neutral-800/30 rounded-lg space-y-6">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Quick Adjustments
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Brand Color */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Your Brand Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={localData.primaryColor}
                    onChange={(e) => updateField('primaryColor', e.target.value)}
                    className="w-12 h-12 rounded border border-neutral-700 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={localData.primaryColor}
                    onChange={(e) => updateField('primaryColor', e.target.value)}
                    className="flex-1 px-3 py-2 bg-neutral-800 rounded-lg border border-neutral-700 focus:border-indigo-500 focus:outline-none font-mono text-sm"
                    placeholder="#6366F1"
                  />
                </div>
              </div>

              {/* CTA Button Text */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Button Text
                </label>
                <input
                  type="text"
                  value={localData.ctaButtonText}
                  onChange={(e) => updateField('ctaButtonText', e.target.value)}
                  placeholder="Buy Now"
                  maxLength={30}
                  className="w-full px-4 py-3 bg-neutral-800 rounded-lg border border-neutral-700 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Most Used Quick Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Font Choice */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Font Style
                </label>
                <select
                  value={localData.fontPair}
                  onChange={(e) => updateField('fontPair', e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none"
                >
                  <option value="inter-system">Clean & Modern</option>
                  <option value="playfair-lato">Elegant Serif</option>
                  <option value="montserrat-opensans">Bold Sans</option>
                  <option value="poppins-roboto">Friendly & Round</option>
                  <option value="raleway-merriweather">Classic & Refined</option>
                </select>
              </div>

              {/* Spacing */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Page Density
                </label>
                <div className="flex gap-2">
                  {['compact', 'comfortable', 'spacious'].map(spacing => (
                    <button
                      key={spacing}
                      onClick={() => updateField('spacing', spacing as any)}
                      className={`flex-1 px-3 py-3 rounded-lg border capitalize transition-all ${
                        localData.spacing === spacing
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                          : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
                      }`}
                    >
                      {spacing}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Show Advanced Toggle */}
          <div className="flex items-center justify-between p-4 bg-neutral-800/20 rounded-lg">
            <div>
              <p className="text-sm text-neutral-300">Want more control?</p>
              <p className="text-xs text-neutral-500 mt-1">
                Fine-tune colors, typography, layout, effects, and individual components
              </p>
            </div>
            <button
              onClick={() => setShowAdvanced(true)}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <Settings2 className="w-4 h-4" />
              Advanced Options
            </button>
          </div>

          {/* Live Preview Hint */}
          <div className="flex items-center gap-2 text-xs text-neutral-500 justify-center">
            <Eye className="w-3 h-3" />
            All changes appear instantly in the preview →
          </div>
        </>
      ) : (
        /* ADVANCED MODE - All existing options */
        <>
          {/* Back to Simple Button */}
          <button
            onClick={() => setShowAdvanced(false)}
            className="text-sm text-neutral-400 hover:text-neutral-200 flex items-center gap-2"
          >
            ← Back to Simple Mode
          </button>

          {/* Advanced Tab Navigation */}
          <div className="flex gap-2 border-b border-neutral-800 overflow-x-auto">
            {[
              { id: 'colors', label: 'Colors', icon: <Palette className="w-4 h-4" /> },
              { id: 'fonts', label: 'Typography', icon: <Type className="w-4 h-4" /> },
              { id: 'layout', label: 'Layout', icon: <Layout className="w-4 h-4" /> },
              { id: 'components', label: 'Components', icon: <Sliders className="w-4 h-4" /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setAdvancedTab(tab.id as any)}
                className={`px-4 py-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  advancedTab === tab.id
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* COLORS TAB */}
          {advancedTab === 'colors' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Primary Color */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Primary Color
                    <span className="text-neutral-500 ml-2 text-xs">(Buttons, links)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={localData.primaryColor}
                      onChange={(e) => updateField('primaryColor', e.target.value)}
                      className="w-12 h-12 rounded border border-neutral-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={localData.primaryColor}
                      onChange={(e) => updateField('primaryColor', e.target.value)}
                      className="flex-1 px-3 py-2 bg-neutral-800 rounded-lg border border-neutral-700 focus:border-indigo-500 focus:outline-none font-mono text-sm"
                      placeholder="#6366F1"
                    />
                  </div>
                </div>

                {/* Secondary Color */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Secondary Color
                    <span className="text-neutral-500 ml-2 text-xs">(Accents, badges)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={localData.secondaryColor}
                      onChange={(e) => updateField('secondaryColor', e.target.value)}
                      className="w-12 h-12 rounded border border-neutral-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={localData.secondaryColor}
                      onChange={(e) => updateField('secondaryColor', e.target.value)}
                      className="flex-1 px-3 py-2 bg-neutral-800 rounded-lg border border-neutral-700 focus:border-indigo-500 focus:outline-none font-mono text-sm"
                      placeholder="#8B5CF6"
                    />
                  </div>
                </div>

                {/* Background Color */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Background Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={localData.backgroundColor}
                      onChange={(e) => updateField('backgroundColor', e.target.value)}
                      className="w-12 h-12 rounded border border-neutral-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={localData.backgroundColor}
                      onChange={(e) => updateField('backgroundColor', e.target.value)}
                      className="flex-1 px-3 py-2 bg-neutral-800 rounded-lg border border-neutral-700 focus:border-indigo-500 focus:outline-none font-mono text-sm"
                      placeholder="#0A0A0A"
                    />
                  </div>
                </div>

                {/* Text Color */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Text Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={localData.textColor}
                      onChange={(e) => updateField('textColor', e.target.value)}
                      className="w-12 h-12 rounded border border-neutral-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={localData.textColor}
                      onChange={(e) => updateField('textColor', e.target.value)}
                      className="flex-1 px-3 py-2 bg-neutral-800 rounded-lg border border-neutral-700 focus:border-indigo-500 focus:outline-none font-mono text-sm"
                      placeholder="#E5E5E5"
                    />
                  </div>
                </div>
              </div>

              {/* Color Preview */}
              <div className="p-4 rounded-lg border border-neutral-700" style={{ backgroundColor: localData.backgroundColor }}>
                <p style={{ color: localData.textColor }} className="mb-3">Preview your color scheme</p>
                <div className="flex gap-3">
                  <button 
                    className="px-4 py-2 rounded-lg font-medium"
                    style={{ backgroundColor: localData.primaryColor, color: '#fff' }}
                  >
                    Primary Button
                  </button>
                  <button 
                    className="px-4 py-2 rounded-lg font-medium"
                    style={{ backgroundColor: localData.secondaryColor, color: '#fff' }}
                  >
                    Secondary
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TYPOGRAPHY TAB */}
          {advancedTab === 'fonts' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-3">
                  Font Pairing
                </label>
                <div className="space-y-2">
                  {Object.entries(FONT_PAIRS).map(([key, fonts]) => (
                    <button
                      key={key}
                      onClick={() => updateField('fontPair', key)}
                      className={`w-full p-4 rounded-lg border text-left transition-all ${
                        localData.fontPair === key
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-neutral-700 hover:border-neutral-600 bg-neutral-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className={`font-medium ${localData.fontPair === key ? 'text-indigo-300' : 'text-neutral-200'}`}>
                            {fonts.label}
                          </div>
                          <div className="text-xs text-neutral-500 mt-1">
                            Headings: {fonts.heading} • Body: {fonts.body}
                          </div>
                        </div>
                        {localData.fontPair === key && (
                          <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Typography Settings */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Text Size Scale
                  </label>
                  <div className="flex gap-2">
                    {[
                      { id: 'small', label: 'Small (85%)', value: 'small' },
                      { id: 'normal', label: 'Normal (100%)', value: 'normal' },
                      { id: 'large', label: 'Large (115%)', value: 'large' },
                      { id: 'xlarge', label: 'XL (130%)', value: 'xlarge' }
                    ].map(size => (
                      <button
                        key={size.id}
                        onClick={() => updateField('textScale', size.value as any)}
                        className={`flex-1 px-3 py-2 rounded-lg border text-xs transition-all ${
                          localData.textScale === size.value
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                            : 'border-neutral-700 text-neutral-400 hover:border-neutral-600 bg-neutral-800/50'
                        }`}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">
                    Spacing
                  </label>
                  <div className="flex gap-2">
                    {['compact', 'comfortable', 'spacious'].map(spacing => (
                      <button
                        key={spacing}
                        onClick={() => updateField('spacing', spacing as any)}
                        className={`flex-1 px-4 py-2 rounded-lg border capitalize transition-all ${
                          localData.spacing === spacing
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                            : 'border-neutral-700 text-neutral-400 hover:border-neutral-600 bg-neutral-800/50'
                        }`}
                      >
                        {spacing}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LAYOUT TAB */}
          {advancedTab === 'layout' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-3">
                  Section Order & Visibility
                </label>
                <div className="space-y-2">
                  {localData.sectionOrder.map(sectionId => {
                    const section = SECTIONS.find(s => s.id === sectionId);
                    if (!section) return null;

                    return (
                      <div
                        key={sectionId}
                        draggable={true}
                        onDragStart={() => handleDragStart(sectionId)}
                        onDragOver={(e) => handleDragOver(e, sectionId)}
                        onDragEnd={() => setDraggedSection(null)}
                        className="flex items-center gap-3 p-3 rounded-lg border border-neutral-700 bg-neutral-800/50 hover:border-neutral-600 cursor-move transition-colors"
                      >
                        <div className="cursor-move">
                          <GripVertical className="w-4 h-4 text-neutral-500" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{section.name}</span>
                            {!section.canHide && (
                              <span className="text-xs px-2 py-0.5 bg-neutral-700 rounded text-neutral-400">
                                Required
                              </span>
                            )}
                          </div>
                        </div>

                        {section.canHide && (
                          <button
                            onClick={() => toggleSectionVisibility(sectionId)}
                            className="p-1 hover:bg-neutral-700 rounded transition-colors"
                          >
                            {localData.hiddenSections.includes(sectionId) ? (
                              <EyeOff className="w-4 h-4 text-neutral-500" />
                            ) : (
                              <Eye className="w-4 h-4 text-neutral-400" />
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  Drag sections to reorder them. Hero and Pricing sections cannot be hidden but can be moved.
                </p>
              </div>

              {/* Component Styles */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Button Style
                  </label>
                  <div className="flex gap-2">
                    {['rounded', 'square', 'pill'].map(style => (
                      <button
                        key={style}
                        onClick={() => updateField('buttonStyle', style as any)}
                        className={`flex-1 px-3 py-2 border capitalize transition-all ${
                          localData.buttonStyle === style
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                            : 'border-neutral-700 text-neutral-400 hover:border-neutral-600 bg-neutral-800/50'
                        } ${
                          style === 'rounded' ? 'rounded-lg' :
                          style === 'square' ? 'rounded-none' :
                          'rounded-full'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">
                    Card Style
                  </label>
                  <div className="flex gap-2">
                    {['flat', 'shadow', 'border'].map(style => (
                      <button
                        key={style}
                        onClick={() => updateField('cardStyle', style as any)}
                        className={`flex-1 px-3 py-2 rounded-lg border capitalize transition-all ${
                          localData.cardStyle === style
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                            : 'border-neutral-700 text-neutral-400 hover:border-neutral-600 bg-neutral-800/50'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Content Width */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Content Width
                </label>
                <div className="flex gap-2">
                  {['narrow', 'standard', 'wide'].map(width => (
                    <button
                      key={width}
                      onClick={() => updateField('contentWidth', width as any)}
                      className={`flex-1 px-3 py-2 rounded border capitalize transition-all ${
                        localData.contentWidth === width
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                          : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
                      }`}
                    >
                      {width}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Narrow: 800px • Standard: 1200px • Wide: 1400px
                </p>
              </div>
            </div>
          )}

          {/* EFFECTS TAB */}
          {advancedTab === 'effects' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Button Shadow
                  </label>
                  <div className="flex gap-2">
                    {['none', 'small', 'medium', 'large'].map(shadow => (
                      <button
                        key={shadow}
                        onClick={() => updateField('buttonShadow', shadow as any)}
                        className={`flex-1 px-3 py-2 rounded-lg border capitalize text-xs transition-all ${
                          localData.buttonShadow === shadow
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                            : 'border-neutral-700 text-neutral-400 hover:border-neutral-600 bg-neutral-800/50'
                        }`}
                      >
                        {shadow}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">
                    Card Elevation
                  </label>
                  <div className="flex gap-2">
                    {['flat', 'raised', 'floating'].map(elevation => (
                      <button
                        key={elevation}
                        onClick={() => updateField('cardElevation', elevation as any)}
                        className={`flex-1 px-3 py-2 rounded-lg border capitalize text-xs transition-all ${
                          localData.cardElevation === elevation
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                            : 'border-neutral-700 text-neutral-400 hover:border-neutral-600 bg-neutral-800/50'
                        }`}
                      >
                        {elevation}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">
                    Image Border Radius
                  </label>
                  <div className="flex gap-2">
                    {['none', 'small', 'medium', 'large'].map(radius => (
                      <button
                        key={radius}
                        onClick={() => updateField('imageBorderRadius', radius as any)}
                        className={`flex-1 px-3 py-2 rounded-lg border capitalize text-xs transition-all ${
                          localData.imageBorderRadius === radius
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                            : 'border-neutral-700 text-neutral-400 hover:border-neutral-600 bg-neutral-800/50'
                        }`}
                      >
                        {radius}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">
                    Hover Intensity
                  </label>
                  <div className="flex gap-2">
                    {['subtle', 'normal', 'bold'].map(intensity => (
                      <button
                        key={intensity}
                        onClick={() => updateField('hoverIntensity', intensity as any)}
                        className={`flex-1 px-3 py-2 rounded-lg border capitalize text-xs transition-all ${
                          localData.hoverIntensity === intensity
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                            : 'border-neutral-700 text-neutral-400 hover:border-neutral-600 bg-neutral-800/50'
                        }`}
                      >
                        {intensity}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Animations Toggle */}
              <div className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-lg">
                <div>
                  <label className="text-sm font-medium">Enable Animations</label>
                  <p className="text-xs text-neutral-500 mt-1">Subtle hover and transition effects</p>
                </div>
                <button
                  onClick={() => updateField('animations', !localData.animations)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    localData.animations ? 'bg-indigo-600' : 'bg-neutral-700'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    localData.animations ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Accessibility Settings */}
              <div className="border-t border-neutral-800 pt-6">
                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <Accessibility className="w-4 h-4" />
                  Accessibility Options
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">High Contrast Mode</label>
                      <p className="text-xs text-neutral-500 mt-1">Increase color contrast for better readability</p>
                    </div>
                    <button
                      onClick={() => updateField('highContrast', !localData.highContrast)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        localData.highContrast ? 'bg-indigo-600' : 'bg-neutral-700'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        localData.highContrast ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Reduced Motion</label>
                      <p className="text-xs text-neutral-500 mt-1">Minimize animations for accessibility</p>
                    </div>
                    <button
                      onClick={() => updateField('reducedMotion', !localData.reducedMotion)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        localData.reducedMotion ? 'bg-indigo-600' : 'bg-neutral-700'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        localData.reducedMotion ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COMPONENTS TAB */}
          {advancedTab === 'components' && (
            <div className="space-y-4">
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                <p className="text-sm text-indigo-300 flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  Fine-tune individual components for pixel-perfect design
                </p>
              </div>

              {/* Hero Section */}
              <details className="group">
                <summary className="cursor-pointer flex items-center justify-between p-4 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors">
                  <span className="font-medium flex items-center gap-2">
                    <Heading className="w-4 h-4 text-neutral-400" />
                    Hero Section
                  </span>
                  <ChevronDown className="w-4 h-4 text-neutral-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="mt-2 p-4 bg-neutral-800/50 rounded-lg space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Title Size</label>
                    <div className="flex gap-2">
                      {['small', 'medium', 'large', 'xl'].map(size => (
                        <button
                          key={size}
                          onClick={() => updateField('heroTitleSize', size as any)}
                          className={`flex-1 px-3 py-2 rounded border capitalize transition-all ${
                            localData.heroTitleSize === size
                              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                              : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Text Alignment</label>
                    <div className="flex gap-2">
                      {['left', 'center', 'right'].map(align => (
                        <button
                          key={align}
                          onClick={() => updateField('heroAlignment', align as any)}
                          className={`flex-1 px-3 py-2 rounded border capitalize transition-all ${
                            localData.heroAlignment === align
                              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                              : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
                          }`}
                        >
                          {align}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </details>

              {/* Benefits Section */}
              <details className="group">
                <summary className="cursor-pointer flex items-center justify-between p-4 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors">
                  <span className="font-medium flex items-center gap-2">
                    <Check className="w-4 h-4 text-neutral-400" />
                    Benefits Section
                  </span>
                  <ChevronDown className="w-4 h-4 text-neutral-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="mt-2 p-4 bg-neutral-800/50 rounded-lg space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Layout</label>
                    <div className="flex gap-2">
                      {['single', 'double', 'grid'].map(layout => (
                        <button
                          key={layout}
                          onClick={() => updateField('benefitsLayout', layout as any)}
                          className={`flex-1 px-3 py-2 rounded border capitalize transition-all ${
                            localData.benefitsLayout === layout
                              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                              : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
                          }`}
                        >
                          {layout}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Icon Style</label>
                    <div className="flex gap-2">
                      {['circle', 'square', 'hexagon'].map(style => (
                        <button
                          key={style}
                          onClick={() => updateField('benefitsIconStyle', style as any)}
                          className={`flex-1 px-3 py-2 rounded border capitalize transition-all ${
                            localData.benefitsIconStyle === style
                              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                              : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </details>

              {/* Pricing Box */}
              <details className="group">
                <summary className="cursor-pointer flex items-center justify-between p-4 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors">
                  <span className="font-medium flex items-center gap-2">
                    <Package className="w-4 h-4 text-neutral-400" />
                    Pricing Box
                  </span>
                  <ChevronDown className="w-4 h-4 text-neutral-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="mt-2 p-4 bg-neutral-800/50 rounded-lg space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Box Width</label>
                    <div className="flex gap-2">
                      {['narrow', 'standard', 'wide'].map(width => (
                        <button
                          key={width}
                          onClick={() => updateField('pricingBoxWidth', width as any)}
                          className={`flex-1 px-3 py-2 rounded border capitalize transition-all ${
                            localData.pricingBoxWidth === width
                              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                              : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
                          }`}
                        >
                          {width}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Button Size</label>
                    <div className="flex gap-2">
                      {['small', 'medium', 'large', 'xl'].map(size => (
                        <button
                          key={size}
                          onClick={() => updateField('buttonSize', size as any)}
                          className={`flex-1 px-3 py-2 rounded border capitalize transition-all ${
                            localData.buttonSize === size
                              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                              : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </details>

              {/* Gallery */}
              <details className="group">
                <summary className="cursor-pointer flex items-center justify-between p-4 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors">
                  <span className="font-medium flex items-center gap-2">
                    <Layout className="w-4 h-4 text-neutral-400" />
                    Gallery
                  </span>
                  <ChevronDown className="w-4 h-4 text-neutral-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="mt-2 p-4 bg-neutral-800/50 rounded-lg space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Columns</label>
                    <div className="flex gap-2">
                      {[2, 3, 4, 6].map(cols => (
                        <button
                          key={cols}
                          onClick={() => updateField('galleryColumns', cols as any)}
                          className={`flex-1 px-3 py-2 rounded border transition-all ${
                            localData.galleryColumns === cols
                              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                              : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
                          }`}
                        >
                          {cols}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </details>

              {/* Mobile Settings */}
              <details className="group">
                <summary className="cursor-pointer flex items-center justify-between p-4 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors">
                  <span className="font-medium flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-neutral-400" />
                    Mobile Settings
                  </span>
                  <ChevronDown className="w-4 h-4 text-neutral-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="mt-2 p-4 bg-neutral-800/50 rounded-lg space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Mobile Font Scale: {localData.mobileFontScale}%
                    </label>
                    <input
                      type="range"
                      min="85"
                      max="115"
                      value={localData.mobileFontScale}
                      onChange={(e) => updateField('mobileFontScale', parseInt(e.target.value))}
                      className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:rounded-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Hide on Mobile
                    </label>
                    <div className="space-y-2">
                      {SECTIONS.filter(s => s.canHide).map(section => (
                        <label key={section.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={localData.mobileHideSections?.includes(section.id)}
                            onChange={(e) => {
                              const sections = localData.mobileHideSections || [];
                              if (e.target.checked) {
                                updateField('mobileHideSections', [...sections, section.id]);
                              } else {
                                updateField('mobileHideSections', sections.filter(s => s !== section.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm">{section.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </details>
            </div>
          )}

          {/* Reset Button */}
          <div className="flex justify-end">
            <button
              onClick={resetToThemeDefaults}
              className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-400 hover:text-neutral-200 border border-neutral-700 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Theme Defaults
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SalesStepCustomize;