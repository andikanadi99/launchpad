import React, { useState, useEffect } from 'react';
import { DollarSign, Package, Tag, Info, Zap, Calendar, Users } from 'lucide-react';

interface CoreInfoData {
  name: string;
  tagline: string;
  price: number;
  priceType: 'one-time' | 'subscription' | 'payment-plan' | 'free';
  compareAtPrice?: number;
  currency: string;
  billingFrequency?: 'monthly' | 'yearly' | 'weekly';
  numberOfPayments?: number;
  paymentFrequency?: 'weekly' | 'biweekly' | 'monthly';
}

interface StepCoreInfoProps {
  data: any;
  updateData: (stepKey: string, data: any) => void;
}

const SalesStepCoreInfo: React.FC<StepCoreInfoProps> = ({ data, updateData }) => {
  const [localData, setLocalData] = useState<CoreInfoData>({
    name: '',
    tagline: '',
    price: 0,
    priceType: 'one-time',
    compareAtPrice: undefined,
    currency: 'USD',
    ...data.coreInfo
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Add placeholder helper functions
  const getPricingPlaceholder = () => {
    switch(localData.priceType) {
      case 'subscription':
        return 'e.g., Monthly Coaching Membership';
      case 'payment-plan':
        return 'e.g., Complete Marketing Course';
      case 'free':
        return 'e.g., Free Strategy Guide';
      default:
        return 'e.g., Instagram Growth Handbook';
    }
  };

  const getTaglinePlaceholder = () => {
    switch(localData.priceType) {
      case 'subscription':
        return 'e.g., Get personalized coaching every month';
      case 'free':
        return 'e.g., Start your journey with our free guide';
      default:
        return 'e.g., Go from 0 to 10K real followers in 90 days';
    }
  };

  // Update parent component when local data changes
  useEffect(() => {
    updateData('coreInfo', localData);
  }, [localData]);

  const handleChange = (field: keyof CoreInfoData, value: any) => {
    setLocalData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateField = (field: string, value: any) => {
    if (field === 'name' && !value) {
      setErrors(prev => ({ ...prev, name: 'Product name is required' }));
      return false;
    }
    if (field === 'price' && localData.priceType !== 'free' && (!value || value < 0)) {
      setErrors(prev => ({ ...prev, price: 'Please enter a valid price' }));
      return false;
    }
    return true;
  };

  const priceTypes = [
    { 
      id: 'one-time', 
      label: 'One-time', 
      icon: <Package className="w-4 h-4" />,
      description: 'Single payment for lifetime access'
    },
    { 
      id: 'subscription', 
      label: 'Subscription', 
      icon: <Calendar className="w-4 h-4" />,
      description: 'Recurring monthly or yearly payments'
    },
    { 
      id: 'payment-plan', 
      label: 'Payment Plan', 
      icon: <Users className="w-4 h-4" />,
      description: 'Split into multiple installments'
    },
    { 
      id: 'free', 
      label: 'Free', 
      icon: <Zap className="w-4 h-4" />,
      description: 'No payment required'
    }
  ];

  const currencies = [
    { code: 'USD', symbol: '$', label: 'US Dollar' },
    { code: 'EUR', symbol: '€', label: 'Euro' },
    { code: 'GBP', symbol: '£', label: 'British Pound' },
    { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-neutral-100">Step 1: Core Product Info</h2>
        <p className="text-neutral-400 mt-1">Define your product basics</p>
      </div>

      {/* Product Name */}
      <div>
        <label className="block text-sm font-medium text-neutral-200 mb-2">
            Product Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={localData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          onBlur={(e) => validateField('name', e.target.value)}
          placeholder={getPricingPlaceholder()}
          className={`w-full px-4 py-3 bg-neutral-800 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors text-neutral-100 placeholder-neutral-500 ${
            errors.name ? 'border-red-500' : 'border-neutral-700'
          }`}
          maxLength={60}
        />
        <div className="mt-1 flex justify-between">
          <p className="text-sm text-neutral-500">
            Choose a clear, compelling name that tells customers what they're getting
          </p>
          <span className={`text-xs ${localData.name.length > 50 ? 'text-orange-500' : 'text-neutral-500'}`}>
            {localData.name.length}/60
          </span>
        </div>
        {errors.name && (
          <p className="mt-1 text-sm text-red-400">{errors.name}</p>
        )}
      </div>
      {/* Tagline */}
        <div>
        <label className="block text-sm font-medium text-neutral-200 mb-2">
            Tagline / Hook
            <span className="ml-2 text-xs text-amber-500 font-normal">(Recommended)</span>
        </label>
        <input
          type="text"
          value={localData.tagline}
          onChange={(e) => handleChange('tagline', e.target.value)}
          placeholder={getTaglinePlaceholder()}
          className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors text-neutral-100 placeholder-neutral-500"
          maxLength={120}
        />
        <div className="mt-1 flex justify-between">
          <p className="text-sm text-neutral-500">
            A short value proposition that hooks your audience
          </p>
          <span className={`text-xs ${localData.tagline.length > 100 ? 'text-orange-500' : 'text-neutral-500'}`}>
            {localData.tagline.length}/120
          </span>
        </div>
      </div>

      {/* Pricing Type */}
      <div>
        <label className="block text-sm font-medium text-neutral-200 mb-3">
            Pricing Model <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {priceTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => handleChange('priceType', type.id)}
              className={`relative p-4 border-2 rounded-lg transition-all ${
                localData.priceType === type.id
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-neutral-700 hover:border-neutral-600 bg-neutral-800/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${localData.priceType === type.id ? 'text-indigo-400' : 'text-neutral-400'}`}>
                  {type.icon}
                </div>
                <div className="text-left flex-1">
                  <div className={`font-medium ${localData.priceType === type.id ? 'text-indigo-300' : 'text-neutral-200'}`}>
                    {type.label}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {type.description}
                  </div>
                </div>
              </div>
              {localData.priceType === type.id && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Price Fields */}
      {localData.priceType !== 'free' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-neutral-200 mb-2">
                Currency
              </label>
              <select
                value={localData.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="w-full px-3 py-3 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-neutral-100"
              >
                {currencies.map(curr => (
                  <option key={curr.code} value={curr.code}>
                    {curr.symbol} {curr.code}
                  </option>
                ))}
              </select>
            </div>

            {/* Price */}
            <div>
                <label className="block text-sm font-medium text-neutral-200 mb-2">
                    Price <span className="text-red-500">*</span>
                </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-neutral-400">
                  {currencies.find(c => c.code === localData.currency)?.symbol}
                </span>
                <input
                  type="number"
                  value={localData.price || ''}
                  onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                  onBlur={(e) => validateField('price', e.target.value)}
                  placeholder="99"
                  className={`w-full pl-8 pr-4 py-3 bg-neutral-800 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors text-neutral-100 placeholder-neutral-500 ${
                    errors.price ? 'border-red-500' : 'border-neutral-700'
                  }`}
                  step="0.01"
                  min="0"
                />
              </div>
              {errors.price && (
                <p className="mt-1 text-sm text-red-400">{errors.price}</p>
              )}
            </div>

            {/* Compare at Price */}
            <div>
              <label className="block text-sm font-medium text-neutral-200 mb-2">
                Compare at
                <span className="ml-1 text-xs text-neutral-500">(optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-neutral-400">
                  {currencies.find(c => c.code === localData.currency)?.symbol}
                </span>
                <input
                  type="number"
                  value={localData.compareAtPrice || ''}
                  onChange={(e) => handleChange('compareAtPrice', parseFloat(e.target.value) || undefined)}
                  placeholder="199"
                  className="w-full pl-8 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-neutral-100 placeholder-neutral-500"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Subscription-specific options */}
          {localData.priceType === 'subscription' && (
            <div>
              <label className="block text-sm font-medium text-neutral-200 mb-2">
                Billing Frequency
              </label>
              <div className="flex gap-3">
                {['monthly', 'yearly', 'weekly'].map(freq => (
                  <button
                    key={freq}
                    onClick={() => handleChange('billingFrequency', freq as any)}
                    className={`px-4 py-2 rounded-lg border-2 capitalize transition-all ${
                      localData.billingFrequency === freq
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                        : 'border-neutral-700 text-neutral-400 hover:border-neutral-600 bg-neutral-800/50'
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Payment Plan specific options */}
          {localData.priceType === 'payment-plan' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-2">
                  Number of Payments
                </label>
                <input
                  type="number"
                  value={localData.numberOfPayments || 3}
                  onChange={(e) => handleChange('numberOfPayments', parseInt(e.target.value) || 3)}
                  min="2"
                  max="12"
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-indigo-500 text-neutral-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-200 mb-2">
                  Payment Frequency
                </label>
                <select
                  value={localData.paymentFrequency || 'monthly'}
                  onChange={(e) => handleChange('paymentFrequency', e.target.value as any)}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-indigo-500 text-neutral-100"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
          )}

          {/* Price display helper */}
          {localData.price > 0 && (
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
                <Info className="w-4 h-4" />
                <span>How this will appear to customers:</span>
              </div>
              <div className="text-2xl font-bold text-neutral-100">
                {localData.compareAtPrice && localData.compareAtPrice > 0 && (
                  <span className="text-lg text-neutral-500 line-through mr-2">
                    {currencies.find(c => c.code === localData.currency)?.symbol}{localData.compareAtPrice.toFixed(2)}
                  </span>
                )}
                {currencies.find(c => c.code === localData.currency)?.symbol}{localData.price.toFixed(2)}
                {localData.priceType === 'subscription' && (
                  <span className="text-base font-normal text-neutral-400">
                    /{localData.billingFrequency || 'month'}
                  </span>
                )}
                {localData.priceType === 'payment-plan' && (
                  <span className="text-base font-normal text-neutral-400 ml-2">
                    ({localData.numberOfPayments || 3} payments of {currencies.find(c => c.code === localData.currency)?.symbol}
                    {(localData.price / (localData.numberOfPayments || 3)).toFixed(2)})
                  </span>
                )}
              </div>
              {localData.compareAtPrice && localData.compareAtPrice > localData.price && (
                <div className="text-sm text-green-500 font-medium mt-1">
                  Save {Math.round(((localData.compareAtPrice - localData.price) / localData.compareAtPrice) * 100)}%
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tips */}
      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
        <div className="flex gap-3">
          <Zap className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-indigo-300 mb-1">Quick Launch Tip</p>
            <p className="text-indigo-200/80">
              You only need to fill in the required fields marked with * to continue. 
              You can always come back to refine pricing and add comparison prices later!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesStepCoreInfo;