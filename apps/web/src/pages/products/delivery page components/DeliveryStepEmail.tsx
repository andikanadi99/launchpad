import { useState, useRef, useEffect } from 'react';
import { DeliveryData } from './DeliveryBuilder';
import { Mail, Eye } from 'lucide-react';

// Email template variables
const EMAIL_VARIABLES = [
  { var: '{{customer_name}}', desc: "Customer's name" },
  { var: '{{customer_email}}', desc: "Customer's email" },
  { var: '{{product_name}}', desc: 'Your product name' },
];

interface DeliveryStepEmailProps {
  data: DeliveryData;
  updateEmail: (updates: Partial<DeliveryData['email']>) => void;
  productName: string;
}

export default function DeliveryStepEmail({ data, updateEmail, productName }: DeliveryStepEmailProps) {
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  // Refs for auto-expanding textareas
  const emailSubjectRef = useRef<HTMLTextAreaElement>(null);
  const emailBodyRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize email subject textarea
  useEffect(() => {
    const textarea = emailSubjectRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(textarea.scrollHeight, 48)}px`;
    }
  }, [data.email.subject]);

  // Auto-resize email body textarea
  useEffect(() => {
    const textarea = emailBodyRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(textarea.scrollHeight, 200)}px`;
    }
  }, [data.email.body]);

  // Email preview with replaced variables
  const getPreviewEmail = () => {
    let body = data.email.body;
    body = body.replace(/\{\{access_button\}\}/g, '');
    body = body.replace(/\{\{customer_name\}\}/g, 'John');
    body = body.replace(/\{\{customer_email\}\}/g, 'john@example.com');
    body = body.replace(/\{\{product_name\}\}/g, productName || 'Your Product');
    return body.trim();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Confirmation Email</h2>
        <p className="text-neutral-400 mt-1">
          This email is sent to customers immediately after purchase
        </p>
      </div>

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
            <Mail className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Email Content</h3>
            <p className="text-sm text-neutral-400">Customize your confirmation email</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Email Subject */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Email Subject <span className="text-red-400">*</span>
            </label>
            <textarea
              ref={emailSubjectRef}
              value={data.email.subject}
              onChange={(e) => updateEmail({ subject: e.target.value.replace(/\n/g, '') })}
              maxLength={100}
              rows={1}
              placeholder="Your purchase is confirmed!"
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none text-white resize-none overflow-hidden"
            />
            <p className="text-xs text-neutral-500 mt-1">
              {data.email.subject.length}/100 characters
            </p>
          </div>

          {/* Email Body */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Email Body <span className="text-red-400">*</span>
            </label>
            <textarea
              ref={emailBodyRef}
              value={data.email.body}
              onChange={(e) => updateEmail({ body: e.target.value })}
              placeholder="Write your confirmation email..."
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none text-white resize-y font-mono text-sm min-h-[200px] overflow-hidden"
            />
            
            {/* Variable hints */}
            <div className="mt-2 flex flex-wrap gap-2">
              {EMAIL_VARIABLES.map(v => (
                <button
                  key={v.var}
                  onClick={() => updateEmail({ body: data.email.body + v.var })}
                  className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded text-xs text-neutral-400 hover:text-white transition-colors"
                  title={v.desc}
                >
                  {v.var}
                </button>
              ))}
            </div>
          </div>

          {/* Email Preview Toggle */}
          <button
            onClick={() => setShowEmailPreview(!showEmailPreview)}
            className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300"
          >
            <Eye className="w-4 h-4" />
            {showEmailPreview ? 'Hide Preview' : 'Show Preview'}
          </button>

          {/* Email Preview */}
          {showEmailPreview && (
            <div className="bg-white rounded-lg p-4 text-neutral-900">
              <div className="border-b border-neutral-200 pb-2 mb-3">
                <p className="text-xs text-neutral-500">Subject:</p>
                <p className="font-medium">{data.email.subject}</p>
              </div>
              <div className="text-sm">
                <span className="whitespace-pre-wrap">{getPreviewEmail()}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}