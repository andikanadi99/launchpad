import React, { useState, useEffect } from 'react';
import { 
  Palette, Type, Layout, Sparkles, RotateCcw, Eye, EyeOff,
  GripVertical, ChevronDown, ChevronUp, Monitor, Smartphone,
  Square, Circle, Hexagon, Sun, Moon, Zap, Check
} from 'lucide-react';

// Theme presets
const THEMES = {
  modern: {
    name: 'Modern',
    icon: <Monitor className="w-4 h-4" />,
    primaryColor: '#6366F1',
    secondaryColor: '#8B5CF6',
    backgroundColor: '#0A0A0A',
    textColor: '#E5E5E5',
    fontPair: 'inter-system',
    buttonStyle: 'rounded',
    cardStyle: 'shadow',
    spacing: 'comfortable'
  },
  bold: {
    name: 'Bold',
    icon: <Zap className="w-4 h-4" />,
    primaryColor: '#DC2626',
    secondaryColor: '#F59E0B',
    backgroundColor: '#000000',
    textColor: '#FFFFFF',
    fontPair: 'montserrat-opensans',
    buttonStyle: 'square',
    cardStyle: 'border',
    spacing: 'spacious'
  },
  elegant: {
    name: 'Elegant',
    icon: <Hexagon className="w-4 h-4" />,
    primaryColor: '#059669',
    secondaryColor: '#0891B2',
    backgroundColor: '#FAFAFA',
    textColor: '#1F2937',
    fontPair: 'playfair-lato',
    buttonStyle: 'rounded',
    cardStyle: 'flat',
    spacing: 'comfortable'
  },
  playful: {
    name: 'Playful',
    icon: <Circle className="w-4 h-4" />,
    primaryColor: '#EC4899',
    secondaryColor: '#A855F7',
    backgroundColor: '#FEF3F2',
    textColor: '#374151',
    fontPair: 'raleway-merriweather',
    buttonStyle: 'pill',
    cardStyle: 'shadow',
    spacing: 'spacious'
  },
  dark: {
    name: 'Dark Pro',
    icon: <Moon className="w-4 h-4" />,
    primaryColor: '#10B981',
    secondaryColor: '#06B6D4',
    backgroundColor: '#030712',
    textColor: '#F3F4F6',
    fontPair: 'inter-system',
    buttonStyle: 'rounded',
    cardStyle: 'shadow',
    spacing: 'compact'
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

// Available sections for reordering - all unlocked for full customization
const SECTIONS = [
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
}

interface StepCustomizeProps {
  data: any;
  updateData: (stepKey: string, data: any) => void;
}

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
    sectionOrder: ['hero', 'video', 'benefits', 'description', 'audience', 'gallery', 'pricing'],
    hiddenSections: [],
    ctaButtonText: 'Buy Now',
    animations: true,
    ...data.design
  });

  const [activeTab, setActiveTab] = useState<'theme' | 'colors' | 'fonts' | 'layout'>('theme');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [draggedSection, setDraggedSection] = useState<string | null>(null);

  // Update parent when data changes
  useEffect(() => {
    updateData('design', localData);
  }, [localData]);

  const applyTheme = (themeKey: string) => {
    const theme = THEMES[themeKey as keyof typeof THEMES];
    if (theme) {
      setLocalData({
        ...localData,
        theme: themeKey,
        primaryColor: theme.primaryColor,
        secondaryColor: theme.secondaryColor,
        backgroundColor: theme.backgroundColor,
        textColor: theme.textColor,
        fontPair: theme.fontPair,
        buttonStyle: theme.buttonStyle as any,
        cardStyle: theme.cardStyle as any,
        spacing: theme.spacing as any
      });
    }
  };

  const updateField = (field: keyof CustomizeData, value: any) => {
    setLocalData({
      ...localData,
      [field]: value
    });
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
        <h2 className="text-2xl font-semibold">Step 4: Customize Design</h2>
        <p className="text-neutral-400 mt-1">
          Make it match your brand perfectly
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-neutral-800">
        {[
          { id: 'theme', label: 'Themes', icon: <Sparkles className="w-4 h-4" /> },
          { id: 'colors', label: 'Colors', icon: <Palette className="w-4 h-4" /> },
          { id: 'fonts', label: 'Typography', icon: <Type className="w-4 h-4" /> },
          { id: 'layout', label: 'Layout', icon: <Layout className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {tab.icon}
            <span className="text-sm font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Theme Selection */}
      {activeTab === 'theme' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-4">
              Choose a starting theme
            </label>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(THEMES).map(([key, theme]) => (
                <button
                  key={key}
                  onClick={() => applyTheme(key)}
                  className={`relative p-4 rounded-lg border-2 transition-all ${
                    localData.theme === key
                      ? 'border-indigo-500 bg-indigo-500/10'
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
                    <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Color Customization */}
      {activeTab === 'colors' && (
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

      {/* Typography */}
      {activeTab === 'fonts' && (
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

          {/* Additional Typography Options */}
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
      )}

      {/* Layout & Sections */}
      {activeTab === 'layout' && (
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
              Drag sections to reorder them exactly how you want. Hero and Pricing sections cannot be hidden but can be moved anywhere.
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

          {/* CTA Button Text */}
          <div className="mt-6">
            <label className="block text-sm font-medium mb-2">
              Call-to-Action Button Text
            </label>
            <input
              type="text"
              value={localData.ctaButtonText}
              onChange={(e) => updateField('ctaButtonText', e.target.value)}
              placeholder="Buy Now"
              maxLength={30}
              className="w-full px-4 py-2 bg-neutral-800 rounded-lg border border-neutral-700 focus:border-indigo-500 focus:outline-none text-sm"
            />
            <p className="text-xs text-neutral-500 mt-1">
              Customize what your purchase button says (e.g., "Get Instant Access", "Start Learning", "Join Now")
            </p>
          </div>
        </div>
      )}

      {/* Advanced Options */}
      <div className="border-t border-neutral-800 pt-6">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Advanced Options
        </button>

        {showAdvanced && (
          <div className="mt-6 space-y-6">
            {/* Animations Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Enable Animations</label>
                <p className="text-xs text-neutral-500 mt-1">Subtle animations for interactive elements</p>
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

          </div>
        )}
      </div>

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
    </div>
  );
};

export default SalesStepCustomize;