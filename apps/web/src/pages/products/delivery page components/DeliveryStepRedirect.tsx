import { DeliveryData } from './DeliveryBuilder';
import { ExternalLink, AlertCircle } from 'lucide-react';

interface DeliveryStepRedirectProps {
  data: DeliveryData;
  updateRedirect: (updates: Partial<DeliveryData['redirect']>) => void;
}

export default function DeliveryStepRedirect({ data, updateRedirect }: DeliveryStepRedirectProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">External Redirect</h2>
        <p className="text-neutral-400 mt-1">
          Send customers to your own platform after purchase
        </p>
      </div>

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
            <ExternalLink className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Redirect Settings</h3>
            <p className="text-sm text-neutral-400">Configure where customers go after purchase</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Redirect URL */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Redirect URL <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              value={data.redirect.url}
              onChange={(e) => updateRedirect({ url: e.target.value })}
              placeholder="https://your-platform.com/course-access"
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none text-white"
            />
            <p className="text-xs text-neutral-500 mt-1">
              Customers will be sent to this URL after purchase
            </p>
          </div>

          {/* Show Thank You */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={data.redirect.showThankYou}
                onChange={(e) => updateRedirect({ showThankYou: e.target.checked })}
                className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-indigo-600"
              />
              <span className="text-sm">Show thank you message before redirecting</span>
            </label>
          </div>

          {/* Redirect Delay */}
          {data.redirect.showThankYou && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Redirect delay (seconds)
              </label>
              <input
                type="number"
                value={data.redirect.delay}
                onChange={(e) => updateRedirect({ delay: parseInt(e.target.value) || 0 })}
                min={0}
                max={30}
                className="w-24 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:border-indigo-500 focus:outline-none text-white"
              />
              <p className="text-xs text-neutral-500 mt-1">
                How long to show the thank you page before redirecting (0 = instant)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-neutral-300">
              Make sure your redirect URL is set up to handle incoming customers. They'll arrive with no additional context from LaunchPad.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}