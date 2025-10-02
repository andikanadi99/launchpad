import React, { useState, useEffect } from 'react';
import { AlertCircle, Plus, X, Sparkles, RotateCcw, GripVertical, Edit2 } from 'lucide-react';

// Template data for different product types
const TEMPLATES = {
  course: {
    description: "Master [YOUR TOPIC] through step-by-step video lessons and practical exercises that take you from [STARTING POINT] to [END RESULT].",
    benefits: [
      "[NUMBER] hours of video content",
      "[SPECIFIC SKILL] you'll master",
      "[TANGIBLE OUTCOME] you'll achieve",
      "Lifetime access to all materials"
    ],
    targetAudiencePrefix: "Perfect for",
    targetAudience: "[WHO THIS IS FOR - beginners? professionals? entrepreneurs?]",
    deliverables: [
      "[NUMBER] video lessons",
      "[NUMBER] downloadable resources",
      "[WHAT ELSE IS INCLUDED]"
    ]
  },
  ebook: {
    description: "Get [SPECIFIC RESULT] with this comprehensive guide that shows you exactly how to [ACHIEVE OUTCOME].",
    benefits: [
      "[NUMBER]-page actionable guide",
      "[KEY LEARNING POINT #1]",
      "[KEY LEARNING POINT #2]",
      "Instant digital download"
    ],
    targetAudiencePrefix: "Perfect for",
    targetAudience: "[TARGET AUDIENCE]",
    deliverables: [
      "[NUMBER]-page PDF ebook",
      "[BONUS ITEM IF ANY]"
    ]
  },
  coaching: {
    description: "Get personalized 1-on-1 guidance to [ACHIEVE SPECIFIC GOAL] with custom strategies tailored to your [SITUATION/BUSINESS/GOALS].",
    benefits: [
      "[NUMBER] coaching sessions",
      "Personalized action plan",
      "[SPECIFIC RESULT YOU'LL HELP THEM ACHIEVE]",
      "Direct access for questions"
    ],
    targetAudiencePrefix: "Ideal for",
    targetAudience: "[WHO NEEDS THIS LEVEL OF SUPPORT]",
    deliverables: [
      "[NUMBER] x [LENGTH] coaching calls",
      "Email support between calls",
      "[OTHER SUPPORT INCLUDED]"
    ]
  },
  templates: {
    description: "Save [TIME SAVED] with these done-for-you [TYPE OF TEMPLATES] that help you [ACHIEVE RESULT] without starting from scratch.",
    benefits: [
      "[NUMBER] professional templates",
      "Fully customizable",
      "[TIME/MONEY SAVED]",
      "Commercial license included"
    ],
    targetAudiencePrefix: "Built for",
    targetAudience: "[WHO NEEDS THESE TEMPLATES]",
    deliverables: [
      "[NUMBER] template files",
      "[FILE FORMATS INCLUDED]",
      "Instructions included"
    ]
  },
  community: {
    description: "Join [NUMBER]+ [TYPE OF PEOPLE] who are [COMMON GOAL] together in this active community.",
    benefits: [
      "24/7 community access",
      "[FREQUENCY] live calls",
      "[UNIQUE VALUE OF YOUR COMMUNITY]",
      "Network with peers"
    ],
    targetAudiencePrefix: "For",
    targetAudience: "[TYPE OF PERSON] who wants [DESIRED OUTCOME]",
    deliverables: [
      "Private community access",
      "[FREQUENCY] group calls",
      "[OTHER PERKS]"
    ]
  }
};

// Common prefixes for quick selection
const AUDIENCE_PREFIXES = [
  "Perfect for",
  "Ideal for",
  "Built for",
  "Designed for",
  "Created for",
  "For",
  "Great for",
  "Made for"
];

export default function SalesStepValueProp({ data, onChange, productName }) {
  const [localData, setLocalData] = useState({
    productType: data?.productType || undefined,
    description: data?.description || '',
    benefits: data?.benefits || [],
    targetAudiencePrefix: data?.targetAudiencePrefix || 'Perfect for',
    targetAudience: data?.targetAudience || '',
    deliverables: data?.deliverables || [],
    isUsingTemplate: data?.isUsingTemplate || false
  });

  const [draggedIndex, setDraggedIndex] = useState(null);
  const [editingPrefix, setEditingPrefix] = useState(false);
  const [customPrefix, setCustomPrefix] = useState(null);

  // Sync with parent
  useEffect(() => {
    onChange(localData);
  }, [localData]);

  const handleProductTypeSelect = (type) => {
    if (type && type !== 'custom') {
      const template = TEMPLATES[type];
      setLocalData({
        productType: type,
        description: template.description,
        benefits: [...template.benefits],
        targetAudiencePrefix: template.targetAudiencePrefix,
        targetAudience: template.targetAudience,
        deliverables: [...template.deliverables],
        isUsingTemplate: true
      });
      
      // Auto-scroll preview to benefits section after template loads
      setTimeout(() => {
        const previewBenefits = document.getElementById('preview-benefits-section');
        if (previewBenefits) {
          previewBenefits.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    } else {
      // Clear all fields when selecting "Start Blank"
      setLocalData({
        productType: 'custom',
        description: '',
        benefits: [],
        targetAudiencePrefix: 'Perfect for',
        targetAudience: '',
        deliverables: [],
        isUsingTemplate: false
      });
    }
  };

  const clearTemplate = () => {
    setLocalData({
      ...localData,
      description: '',
      benefits: [],
      targetAudiencePrefix: 'Perfect for',
      targetAudience: '',
      deliverables: [],
      isUsingTemplate: false
    });
  };

  const updateField = (field, value) => {
    setLocalData({
      ...localData,
      [field]: value,
      isUsingTemplate: false // Any edit marks as customized
    });

    // Auto-scroll to relevant section based on field changed
    setTimeout(() => {
      let targetSection = null;
      
      if (field === 'description') {
        targetSection = document.querySelector('#description-section');
      } else if (field === 'targetAudience' || field === 'targetAudiencePrefix') {
        targetSection = document.querySelector('#audience-section');
      }
      // Benefits scroll is already handled separately in updateBenefit function
      
      if (targetSection) {
        targetSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }, 100);
  };
  const addBenefit = () => {
    setLocalData({
      ...localData,
      benefits: [...localData.benefits, ''],
      isUsingTemplate: false
    });
  };

  const updateBenefit = (index, value) => {
    const newBenefits = [...localData.benefits];
    newBenefits[index] = value;
    setLocalData({
      ...localData,
      benefits: newBenefits,
      isUsingTemplate: false
    });
  };

  const removeBenefit = (index) => {
    setLocalData({
      ...localData,
      benefits: localData.benefits.filter((_, i) => i !== index),
      isUsingTemplate: false
    });
  };

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newBenefits = [...localData.benefits];
    const draggedItem = newBenefits[draggedIndex];
    newBenefits.splice(draggedIndex, 1);
    newBenefits.splice(index, 0, draggedItem);
    
    setLocalData({
      ...localData,
      benefits: newBenefits,
      isUsingTemplate: false
    });
    setDraggedIndex(index);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">Step 2: Value Proposition</h2>
        <p className="text-neutral-400 mt-1">
          Help customers understand what they're getting and why it matters
        </p>
      </div>

      {/* Product Type Selector */}
      <div>
        <label className="block text-sm font-medium mb-3">
          Choose a starting template (optional)
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'course', label: 'Online Course', icon: '🎓' },
            { id: 'ebook', label: 'Ebook/Guide', icon: '📚' },
            { id: 'coaching', label: 'Coaching', icon: '🎯' },
            { id: 'templates', label: 'Templates', icon: '📋' },
            { id: 'community', label: 'Community', icon: '👥' },
            { id: 'custom', label: 'Start Blank', icon: '✨' }
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => handleProductTypeSelect(type.id)}
              className={`p-4 rounded-lg border text-left transition-all ${
                localData.productType === type.id
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{type.icon}</span>
                <span className="text-sm font-medium">{type.label}</span>
              </div>
            </button>
          ))}
        </div>

        {localData.isUsingTemplate && (
          <button
            onClick={clearTemplate}
            className="mt-3 flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Clear template and start fresh
          </button>
        )}
      </div>


        {/* Description - REQUIRED */}
        <div>
        <label className="block text-sm font-medium mb-2">
            Product Description
            <span className="text-red-500 ml-1">*</span>
            {localData.isUsingTemplate && localData.description.includes('[') && (
            <span className="ml-3 text-xs bg-amber-500/20 text-amber-500 px-2 py-1 rounded">
                Has placeholders
            </span>
            )}
        </label>
        <div className="relative">
            <textarea
            value={localData.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder={`Describe what ${productName || 'your product'} is and the main outcome customers will achieve...`}
            rows={3}
            className="w-full px-4 py-3 bg-neutral-900 rounded-lg border border-neutral-800 focus:border-blue-500 focus:outline-none resize-none"
            />
        </div>
        <p className="text-xs text-neutral-500 mt-1">
            2-3 sentences. What is it + who it helps + main outcome
        </p>
        </div>

      {/* Benefits - RECOMMENDED */}
        <div id="benefits-section">
        <label className="block text-sm font-medium mb-2">
            Key Benefits
            <span className="text-neutral-500 ml-2 text-xs font-normal">(Recommended - what customers get)</span>
            {localData.isUsingTemplate && localData.benefits.some(b => b.includes('[')) && (
            <span className="ml-3 text-xs bg-amber-500/20 text-amber-500 px-2 py-1 rounded">
                Has placeholders
            </span>
            )}
        </label>
        
        {localData.benefits.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-neutral-800 rounded-lg">
            <p className="text-neutral-500 mb-3">No benefits added yet</p>
            <button
              onClick={addBenefit}
              className="inline-flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400"
            >
              <Plus className="w-4 h-4" />
              Add your first benefit
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {localData.benefits.map((benefit, index) => (
              <div
                key={index}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={() => setDraggedIndex(null)}
                className="flex items-center gap-2 group"
                >
                <div
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    className="cursor-move p-1 hover:bg-neutral-800 rounded transition-colors"
                >
                    <GripVertical className="w-4 h-4 text-neutral-600" />
                </div>
                <input
                    type="text"
                    value={benefit}
                    onChange={(e) => updateBenefit(index, e.target.value)}
                    placeholder="Enter a key benefit or outcome..."
                    className="flex-1 px-3 py-2 bg-neutral-900 rounded-lg border border-neutral-800 focus:border-blue-500 focus:outline-none text-sm"
                />
                <button
                  onClick={() => removeBenefit(index)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-neutral-800 rounded transition-all"
                >
                  <X className="w-4 h-4 text-neutral-500" />
                </button>
              </div>
            ))}
            <button
              onClick={addBenefit}
              className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400 transition-colors mt-2"
            >
              <Plus className="w-4 h-4" />
              Add another benefit
            </button>
          </div>
        )}
        <p className="text-xs text-neutral-500 mt-2">
          3-5 benefits work best. Focus on outcomes, not features.
        </p>
      </div>

      {/* Target Audience - OPTIONAL */}
        <div>
        <label className="block text-sm font-medium mb-2">
            Target Audience
            <span className="text-neutral-500 ml-2 text-xs font-normal">(Optional)</span>
            {localData.isUsingTemplate && localData.targetAudience.includes('[') && (
            <span className="ml-3 text-xs bg-amber-500/20 text-amber-500 px-2 py-1 rounded">
                Has placeholders
            </span>
            )}
        </label>
        
        <div className="space-y-3">
          {/* Prefix Editor */}
          <div className="flex items-center gap-2">
            <div className="relative">
              {editingPrefix ? (
                <div className="flex items-center gap-2">
                  <select
                    value={customPrefix !== null ? 'custom' : localData.targetAudiencePrefix}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setCustomPrefix(localData.targetAudiencePrefix || '');
                      } else {
                        updateField('targetAudiencePrefix', e.target.value);
                        setCustomPrefix(null);
                        setEditingPrefix(false);
                      }
                    }}
                    className="px-3 py-2 bg-neutral-800 border border-blue-500 rounded-lg focus:outline-none text-sm min-w-[120px]"
                  >
                    {AUDIENCE_PREFIXES.map(prefix => (
                      <option key={prefix} value={prefix}>{prefix}</option>
                    ))}
                    <option value="custom">Custom...</option>
                  </select>
                  
                  {customPrefix !== null && (
                    <>
                      <input
                        type="text"
                        value={customPrefix}
                        onChange={(e) => setCustomPrefix(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateField('targetAudiencePrefix', customPrefix || 'For');
                            setCustomPrefix(null);
                            setEditingPrefix(false);
                          } else if (e.key === 'Escape') {
                            setCustomPrefix(null);
                            setEditingPrefix(false);
                          }
                        }}
                        placeholder="Enter custom prefix..."
                        className="px-3 py-2 bg-neutral-800 border border-blue-500 rounded-lg focus:outline-none text-sm"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          updateField('targetAudiencePrefix', customPrefix || 'For');
                          setCustomPrefix(null);
                          setEditingPrefix(false);
                        }}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm transition-colors"
                      >
                        Save
                      </button>
                    </>
                  )}
                  
                  {customPrefix === null && (
                    <button
                      onClick={() => setEditingPrefix(false)}
                      className="px-2 py-2 text-neutral-400 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setEditingPrefix(true)}
                  className="flex items-center gap-1 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 rounded-lg transition-colors text-sm"
                >
                  <span>{localData.targetAudiencePrefix}</span>
                  <Edit2 className="w-3 h-3 text-neutral-400" />
                </button>
              )}
            </div>
            
            <input
              type="text"
              value={localData.targetAudience}
              onChange={(e) => updateField('targetAudience', e.target.value)}
              placeholder="beginners who want to learn programming..."
              className="flex-1 px-4 py-2 bg-neutral-900 rounded-lg border border-neutral-800 focus:border-blue-500 focus:outline-none text-sm"
            />
          </div>
          
          {/* Quick Examples */}
          {!localData.targetAudience && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-neutral-500">Examples:</span>
              {[
                "beginners with no experience",
                "small business owners",
                "creative professionals",
                "anyone who wants to learn"
              ].map(example => (
                <button
                  key={example}
                  onClick={() => updateField('targetAudience', example)}
                  className="text-xs px-2 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <p className="text-xs text-neutral-500 mt-2">
          Help visitors quickly identify if this is for them. Will display as: "{localData.targetAudiencePrefix} {localData.targetAudience || '...'}"
        </p>
      </div>

      {/* Template Status Warning */}
      {localData.isUsingTemplate && localData.description.includes('[') && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-amber-500">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Still using template placeholders</span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Make sure to replace all [BRACKETED] text before publishing
          </p>
        </div>
      )}
    </div>
  );
}