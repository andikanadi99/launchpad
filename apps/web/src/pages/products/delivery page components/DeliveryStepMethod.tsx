import { DeliveryData } from './DeliveryBuilder';
import { 
  Mail, Zap, FileText, ExternalLink, Check
} from 'lucide-react';

interface DeliveryStepMethodProps {
  data: DeliveryData;
  onMethodChange: (method: DeliveryData['deliveryMethod']) => void;
}

const METHODS: Array<{
  id: DeliveryData['deliveryMethod'];
  icon: typeof Mail;
  title: string;
  description: string;
  details: string[];
  color: string;
}> = [
  {
    id: 'email-only',
    icon: Mail,
    title: 'Email Only',
    description: 'Just send the confirmation email. No additional delivery page.',
    details: [
      'Great for pre-orders, services, or coaching',
      'Customer receives email only',
      'Simplest option — deliver manually or later',
    ],
    color: 'blue',
  },
  {
    id: 'quick-page',
    icon: Zap,
    title: 'Quick Delivery Page',
    description: 'Upload files, add videos, and paste links. We build a clean page for you.',
    details: [
      'Upload files for download',
      'Embed YouTube, Vimeo, or Loom videos',
      'Link to Notion, Google Docs, etc.',
      'Customize colors, logo, and text',
    ],
    color: 'indigo',
  },
  {
    id: 'custom-editor',
    icon: FileText,
    title: 'Custom Content Page',
    description: 'Build a fully custom delivery page with our rich editor.',
    details: [
      'Drag-and-drop content blocks',
      'Rich text, images, videos, and more',
      'Full creative control',
      'Best for courses and detailed content',
    ],
    color: 'purple',
  },
  {
    id: 'redirect',
    icon: ExternalLink,
    title: 'External Redirect',
    description: 'Send customers to your own platform after purchase.',
    details: [
      'Redirect to Teachable, Kajabi, or your site',
      'Optional thank-you page',
      'Configurable delay',
    ],
    color: 'amber',
  },
];

const colorMap: Record<string, { bg: string; border: string; icon: string; activeBg: string }> = {
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500', icon: 'text-blue-400', activeBg: 'bg-blue-500/10' },
  indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500', icon: 'text-indigo-400', activeBg: 'bg-indigo-500/10' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500', icon: 'text-purple-400', activeBg: 'bg-purple-500/10' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500', icon: 'text-amber-400', activeBg: 'bg-amber-500/10' },
};

export default function DeliveryStepMethod({ data, onMethodChange }: DeliveryStepMethodProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">How do you want to deliver your product?</h2>
        <p className="text-neutral-400 mt-1">
          Choose how customers access your product after purchase
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {METHODS.map(method => {
          const isActive = data.deliveryMethod === method.id;
          const colors = colorMap[method.color];
          const Icon = method.icon;

          return (
            <button
              key={method.id}
              onClick={() => onMethodChange(method.id)}
              className={`p-5 rounded-xl border-2 text-left transition-all relative ${
                isActive
                  ? `${colors.border} ${colors.activeBg}`
                  : 'border-neutral-700 hover:border-neutral-600'
              }`}
            >
              {/* Selected indicator */}
              {isActive && (
                <div className={`absolute top-3 right-3 w-6 h-6 rounded-full ${colors.bg} flex items-center justify-center`}>
                  <Check className={`w-4 h-4 ${colors.icon}`} />
                </div>
              )}

              <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${isActive ? colors.icon : 'text-neutral-400'}`} />
              </div>
              
              <h3 className="font-semibold text-base mb-1">{method.title}</h3>
              <p className="text-sm text-neutral-400 mb-3">{method.description}</p>
              
              <ul className="space-y-1">
                {method.details.map((detail, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-neutral-500">
                    <span className={`mt-1 w-1 h-1 rounded-full flex-shrink-0 ${isActive ? colors.icon.replace('text-', 'bg-') : 'bg-neutral-600'}`} />
                    {detail}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
    </div>
  );
}