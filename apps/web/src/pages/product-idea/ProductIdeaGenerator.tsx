// src/pages/product-idea/ProductIdeaGenerator.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ProductIdeaGenerator() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 5;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0B0D] py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 mb-4">
            <span className="text-3xl">🚀</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-3">
            Product Idea Co-Pilot
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            Let's discover your perfect product idea together
          </p>
        </div>

        {/* Progress Bar Placeholder */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Step {currentStep + 1} of {totalSteps}
            </span>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {Math.round(((currentStep + 1) / totalSteps) * 100)}% complete
            </span>
          </div>
          <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 md:p-12 mb-6">
          <div className="text-center">
            <div className="text-6xl mb-6">🎯</div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
              Building Product Idea Co-Pilot...
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-8">
              Components will be built step by step here
            </p>

            {/* Placeholder - Questions will go here */}
            <div className="space-y-4 text-left max-w-md mx-auto">
              <div className="p-4 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  📝 Component 1: QuestionStep.tsx
                </p>
              </div>
              <div className="p-4 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  🎨 Component 2: ResultsDisplay.tsx
                </p>
              </div>
              <div className="p-4 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  💡 Component 3: IdeaCard.tsx
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <button
            onClick={() => navigate('/onboarding')}
            className="px-6 py-3 bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg font-medium hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-all"
          >
            ← Back to Onboarding
          </button>
          <button
            onClick={() => navigate('/products/sales')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all"
          >
            Skip to Sales Page Builder →
          </button>
        </div>
      </div>
    </div>
  );
}