import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
  allowNavigation?: boolean;
  onStepClick?: (step: number) => void;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStep,
  totalSteps,
  labels,
  allowNavigation = false,
  onStepClick,
}) => {
  const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="w-full">
      {/* Step Counter */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
          {Math.round(percentage)}% Complete
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        {/* Background Track */}
        <div className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
          {/* Progress Fill */}
          <div
            className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Step Dots */}
        <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between px-1">
          {Array.from({ length: totalSteps }).map((_, index) => {
            const stepNumber = index + 1;
            const isCompleted = stepNumber < currentStep;
            const isCurrent = stepNumber === currentStep;
            const isClickable = allowNavigation && stepNumber <= currentStep;

            return (
              <button
                key={index}
                onClick={() => isClickable && onStepClick?.(stepNumber)}
                disabled={!isClickable}
                className={`
                  relative w-6 h-6 rounded-full transition-all duration-300
                  ${isClickable ? 'cursor-pointer' : 'cursor-default'}
                  ${
                    isCompleted
                      ? 'bg-purple-600 dark:bg-purple-500'
                      : isCurrent
                      ? 'bg-purple-600 dark:bg-purple-500 ring-4 ring-purple-100 dark:ring-purple-900'
                      : 'bg-neutral-300 dark:bg-neutral-700'
                  }
                `}
              >
                {isCompleted && (
                  <CheckCircle2 className="w-4 h-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                )}
                {isCurrent && (
                  <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Labels (Optional) */}
      {labels && labels.length === totalSteps && (
        <div className="flex justify-between mt-6">
          {labels.map((label, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber <= currentStep;

            return (
              <div
                key={index}
                className={`
                  text-xs font-medium text-center flex-1
                  ${
                    isActive
                      ? 'text-neutral-700 dark:text-neutral-300'
                      : 'text-neutral-400 dark:text-neutral-600'
                  }
                `}
              >
                <div className="hidden sm:block">{label}</div>
                <div className="sm:hidden">{stepNumber}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProgressBar;