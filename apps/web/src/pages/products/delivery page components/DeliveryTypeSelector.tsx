import { DeliveryData } from '../DeliveryBuilder';
import { 
  Mail, FileText, Package, ExternalLink, Check, AlertCircle 
} from 'lucide-react';

interface DeliveryTypeSelectorProps {
  data: DeliveryData;
  updateData: (updates: Partial<DeliveryData>) => void;
}

export default function DeliveryTypeSelector({ 
  data, 
  updateData 
}: DeliveryTypeSelectorProps) {
  
  const deliveryTypes = [
    {
      id: 'email-only',
      icon: <Mail className="w-6 h-6" />,
      title: 'Email Only',
      description: 'Send a confirmation email. Perfect for services, coaching, or products delivered elsewhere.',
      badge: '📧 Email',
      features: [
        'Simple and fast setup',
        'Automatic confirmation emails',
        'Perfect for manual delivery',
        'Great for services & coaching'
      ]
    },
    {
      id: 'content',
      icon: <FileText className="w-6 h-6" />,
      title: 'Content Page',
      description: 'Create a custom content page with text, videos, and embeds for customers to access.',
      badge: '📄 Rich Content',
      features: [
        'Custom text content',
        'Video embeds',
        'Step-by-step instructions',
        'Branded experience'
      ]
    },
    {
      id: 'file',
      icon: <Package className="w-6 h-6" />,
      title: 'File Downloads',
      description: 'Upload files (PDFs, ZIPs, etc.) for customers to download after purchase.',
      badge: '📦 Files',
      features: [
        'Upload multiple files',
        'Automatic download links',
        'Perfect for ebooks & templates',
        'Supports PDFs, ZIPs, images'
      ]
    },
    {
      id: 'redirect',
      icon: <ExternalLink className="w-6 h-6" />,
      title: 'Redirect to URL',
      description: 'Send customers to your course platform, membership site, or external page.',
      badge: '🔗 External',
      features: [
        'Instant redirect after purchase',
        'Customizable delay',
        'Perfect for course platforms',
        'Works with any external site'
      ]
    }
  ];

  const handleTypeSelect = (typeId: string) => {
    updateData({ type: typeId as DeliveryData['type'] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold">Choose Delivery Type</h2>
        <p className="text-neutral-400 mt-1">
          How do you want to deliver your product to customers?
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-neutral-800/30 border border-neutral-700 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-neutral-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-neutral-300 font-medium mb-1">
              Choose Your Delivery Method
            </p>
            <p className="text-sm text-neutral-400">
              Email-only is selected by default. You can change this anytime or upgrade to richer delivery options.
            </p>
          </div>
        </div>
      </div>

      {/* Delivery Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {deliveryTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => handleTypeSelect(type.id)}
            className={`relative p-6 rounded-xl border-2 text-left transition-all ${
              data.type === type.id
                ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/20'
                : 'border-neutral-700 hover:border-neutral-600 bg-neutral-800/50 hover:bg-neutral-800/70'
            }`}
          >
            {/* Header with Icon and Title */}
            <div className="flex items-start gap-4 mb-3">
              <div className={`${
                data.type === type.id ? 'text-indigo-400' : 'text-neutral-400'
              }`}>
                {type.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`font-semibold ${
                    data.type === type.id ? 'text-indigo-300' : 'text-neutral-200'
                  }`}>
                    {type.title}
                  </h3>
                </div>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  {type.description}
                </p>
              </div>
            </div>

            {/* Features List */}
            <ul className="space-y-1.5 mt-4">
              {type.features.map((feature, index) => (
                <li 
                  key={index} 
                  className="flex items-start gap-2 text-xs"
                >
                  <span className={`mt-0.5 ${
                    data.type === type.id ? 'text-indigo-400' : 'text-neutral-500'
                  }`}>
                    ✓
                  </span>
                  <span className={
                    data.type === type.id ? 'text-indigo-200/80' : 'text-neutral-500'
                  }>
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            {/* Selection Indicator */}
            {data.type === type.id && (
              <div className="absolute top-4 right-4">
                <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Selected Type Summary */}
      {data.type && (
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-neutral-200 mb-1">
                Selected: {deliveryTypes.find(t => t.id === data.type)?.title}
              </p>
              <p className="text-xs text-neutral-400">
                {data.type === 'email-only' && 'Customers will receive a confirmation email after purchase. You can manually deliver your product.'}
                {data.type === 'content' && 'You\'ll create a custom page with instructions, videos, and content for customers to access.'}
                {data.type === 'redirect' && 'Customers will be redirected to your external platform after purchase.'}
                {data.type === 'file' && 'Customers will be able to download your files after purchase.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="bg-neutral-800/30 border border-neutral-700 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-neutral-500 space-y-1">
            <p className="font-medium text-neutral-400">Not sure which to choose?</p>
            <ul className="space-y-0.5 ml-4 list-disc">
              <li><strong>Email-only:</strong> Services, coaching, manual delivery</li>
              <li><strong>Content page:</strong> Guides, tutorials, step-by-step instructions</li>
              <li><strong>File downloads:</strong> Ebooks, templates, PDFs, digital assets</li>
              <li><strong>Redirect:</strong> Course platforms (Teachable, Kajabi, etc.)</li>
            </ul>
            <p className="mt-2 text-neutral-400">
              💡 You can always change this later from your dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}