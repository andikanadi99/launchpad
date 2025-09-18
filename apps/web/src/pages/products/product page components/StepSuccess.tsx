// step-components/StepSuccess.tsx

import { useNavigate } from 'react-router-dom';
import { StepComponentProps } from '../utils/products.types';

interface StepSuccessProps extends StepComponentProps {
  navigate?: ReturnType<typeof useNavigate>;
}

export default function StepSuccess({ 
  productUrl,
  navigate 
}: StepSuccessProps) {
  const nav = navigate || useNavigate();
  
  return (
    <div className="min-h-screen bg-[#0B0B0D] text-neutral-100 p-6 flex items-center justify-center">
      <div className="max-w-lg w-full rounded-2xl border border-neutral-800 bg-neutral-900/70 p-8 text-center">
        <div className="mb-4 text-5xl">🎉</div>
        <h2 className="text-3xl font-bold mb-2">You're Live!</h2>
        <p className="text-neutral-300 mb-6">Your product is ready to sell</p>
        
        <div className="bg-neutral-950 rounded-lg p-4 mb-6 border border-green-800/30">
          <p className="text-xs text-neutral-400 mb-2">Your product link:</p>
          <p className="text-sm font-mono break-all text-green-400">{productUrl}</p>
          <p className="text-xs text-green-500 mt-2">✓ Link copied to clipboard!</p>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={() => window.open(productUrl, '_blank')}
            className="w-full rounded-lg bg-green-600 py-3 text-white font-medium hover:bg-green-500"
          >
            View Live Product →
          </button>
          <button
            onClick={() => nav('/dashboard')}
            className="w-full rounded-lg border border-neutral-700 py-3 hover:bg-neutral-800"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}