import React, { useState, useEffect } from 'react';
import { ChevronRight, Sparkles, MessageCircle, AlertCircle } from 'lucide-react';

// Types for different question formats
export type QuestionType = 'text' | 'textarea' | 'radio' | 'checkbox' | 'hybrid';

export interface Option {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  allowCustom?: boolean; // For "Other" option with text input
}

export interface QuestionData {
  id: string;
  question: string;
  subtext?: string;
  type: QuestionType;
  options?: Option[];
  placeholder?: string;
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    minSelections?: number;
    maxSelections?: number;
  };
  helpText?: string;
  examples?: string[];
  showAIHelper?: boolean;
}

interface QuestionStepProps {
  question: QuestionData;
  answer: any; // Can be string, string[], or object depending on type
  onAnswerChange: (answer: any) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  aiResponse?: string;
  isProcessingAI?: boolean;
}

const QuestionStep: React.FC<QuestionStepProps> = ({
  question,
  answer,
  onAnswerChange,
  onNext,
  onBack,
  isFirstQuestion,
  isLastQuestion,
  aiResponse,
  isProcessingAI = false,
}) => {
  const [error, setError] = useState<string>('');
  const [customInput, setCustomInput] = useState<string>('');
  const [customInputs, setCustomInputs] = useState<{[key: string]: string}>({});
  const [showExamples, setShowExamples] = useState(false);

  // Validate answer before proceeding
  const validateAnswer = (): boolean => {
    setError('');
    
    if (!question.validation) return true;
    
    const { required, minLength, maxLength, minSelections, maxSelections } = question.validation;
    
    // Check required
    if (required) {
      if (!answer || (Array.isArray(answer) && answer.length === 0) || answer === '') {
        setError('This field is required');
        return false;
      }
    }
    
    // Text validation
    if (question.type === 'text' || question.type === 'textarea') {
      const textAnswer = answer as string;
      if (minLength && textAnswer.length < minLength) {
        setError(`Minimum ${minLength} characters required`);
        return false;
      }
      if (maxLength && textAnswer.length > maxLength) {
        setError(`Maximum ${maxLength} characters allowed`);
        return false;
      }
    }
    
    // Checkbox validation
    if (question.type === 'checkbox') {
      const selections = answer as string[];
      if (minSelections && selections.length < minSelections) {
        setError(`Please select at least ${minSelections} option${minSelections > 1 ? 's' : ''}`);
        return false;
      }
      if (maxSelections && selections.length > maxSelections) {
        setError(`Please select at most ${maxSelections} option${maxSelections > 1 ? 's' : ''}`);
        return false;
      }
    }
    
    return true;
  };

  const handleNext = () => {
    if (validateAnswer()) {
      onNext();
    }
  };

  const handleRadioChange = (value: string, isCustom: boolean = false) => {
    if (isCustom) {
      onAnswerChange({ value, custom: customInput });
    } else {
      onAnswerChange(value);
      setCustomInput(''); // Clear custom input if selecting non-custom option
    }
  };

  const handleCheckboxChange = (value: string, checked: boolean, isCustomOption: boolean = false) => {
    let currentAnswers = (answer as any[]) || [];
    
    if (checked) {
      if (isCustomOption) {
        // For custom options, store as object with value and custom text
        const customAnswer = { value, custom: customInputs[value] || '' };
        currentAnswers = [...currentAnswers.filter(a => 
          typeof a === 'string' ? a !== value : a.value !== value
        ), customAnswer];
      } else {
        // For regular options, just store the value
        currentAnswers = [...currentAnswers.filter(a => 
          typeof a === 'string' ? a !== value : a.value !== value
        ), value];
      }
    } else {
      // Remove the value (whether string or object)
      currentAnswers = currentAnswers.filter(a => 
        typeof a === 'string' ? a !== value : a.value !== value
      );
      // Clear custom input for this option
      setCustomInputs(prev => {
        const newInputs = {...prev};
        delete newInputs[value];
        return newInputs;
      });
    }
    
    onAnswerChange(currentAnswers);
  };

  const handleCustomInputChange = (optionValue: string, text: string) => {
    setCustomInputs(prev => ({...prev, [optionValue]: text}));
    
    // Update the answer with the custom text
    let currentAnswers = (answer as any[]) || [];
    const existingIndex = currentAnswers.findIndex(a => 
      typeof a === 'object' && a.value === optionValue
    );
    
    if (existingIndex >= 0) {
      currentAnswers[existingIndex] = { value: optionValue, custom: text };
      onAnswerChange([...currentAnswers]);
    }
  };

  const isOptionChecked = (optionValue: string) => {
    const currentAnswers = (answer as any[]) || [];
    return currentAnswers.some(a => 
      typeof a === 'string' ? a === optionValue : a.value === optionValue
    );
  };

  // Render different input types
  const renderInput = () => {
    switch (question.type) {
      case 'text':
        return (
          <input
            type="text"
            value={answer || ''}
            onChange={(e) => onAnswerChange(e.target.value)}
            placeholder={question.placeholder || 'Type your answer here...'}
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
          />
        );

      case 'textarea':
        return (
          <div className="space-y-2">
            <textarea
              value={answer || ''}
              onChange={(e) => onAnswerChange(e.target.value)}
              placeholder={question.placeholder || 'Type your answer here...'}
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 resize-none"
            />
            {question.validation?.maxLength && (
              <div className="text-sm text-neutral-500 dark:text-neutral-400 text-right">
                {(answer || '').length} / {question.validation.maxLength}
              </div>
            )}
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-3">
            {question.options?.map((option) => (
              <label
                key={option.value}
                className={`
                  block p-4 rounded-lg border-2 cursor-pointer transition-all
                  ${
                    answer === option.value || (typeof answer === 'object' && answer?.value === option.value)
                      ? 'border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name={question.id}
                    value={option.value}
                    checked={answer === option.value || (typeof answer === 'object' && answer?.value === option.value)}
                    onChange={() => handleRadioChange(option.value, option.allowCustom || false)}
                    className="mt-1 text-purple-600 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {option.icon}
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {option.label}
                      </span>
                    </div>
                    {option.description && (
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                        {option.description}
                      </p>
                    )}
                    {option.allowCustom && (answer === option.value || (typeof answer === 'object' && answer?.value === option.value)) && (
                      <input
                        type="text"
                        value={customInput}
                        onChange={(e) => {
                          setCustomInput(e.target.value);
                          handleRadioChange(option.value, true);
                        }}
                        placeholder="Please specify..."
                        className="mt-2 w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-3">
            {question.options?.map((option) => {
              const isChecked = isOptionChecked(option.value);
              const hasCustomInput = option.allowCustom;
              
              return (
                <div key={option.value}>
                  <label
                    className={`
                      block p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${
                        isChecked
                          ? 'border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        value={option.value}
                        checked={isChecked}
                        onChange={(e) => handleCheckboxChange(option.value, e.target.checked, hasCustomInput || false)}
                        className="mt-1 text-purple-600 focus:ring-purple-500 rounded"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {option.icon}
                          <span className="font-medium text-neutral-900 dark:text-white">
                            {option.label}
                          </span>
                        </div>
                        {option.description && (
                          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                            {option.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </label>
                  
                  {/* Custom input field for 'other' option */}
                  {hasCustomInput && isChecked && (
                    <div className="mt-2 ml-11">
                      <input
                        type="text"
                        value={customInputs[option.value] || ''}
                        onChange={(e) => handleCustomInputChange(option.value, e.target.value)}
                        placeholder="Please specify (e.g., 'Retired teachers', 'Dog trainers', 'Wine enthusiasts')..."
                        className="w-full px-3 py-2 rounded-md border border-purple-300 dark:border-purple-600 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 placeholder-neutral-400 dark:placeholder-neutral-500"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Question Header */}
      <div className="space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white">
          {question.question}
        </h2>
        {question.subtext && (
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            {question.subtext}
          </p>
        )}
      </div>

      {/* Examples (if provided) */}
      {question.examples && question.examples.length > 0 && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <button
            onClick={() => setShowExamples(!showExamples)}
            className="flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
          >
            <Sparkles className="w-4 h-4" />
            {showExamples ? 'Hide' : 'Show'} Examples to Get You Started
          </button>
          {showExamples && (
            <div className="mt-3 space-y-3">
              <p className="text-xs text-purple-700 dark:text-purple-300 font-medium uppercase tracking-wide">
                Example Responses:
              </p>
              {question.examples.map((example, index) => (
                <div 
                  key={index} 
                  className="text-sm text-neutral-700 dark:text-neutral-300 bg-white/50 dark:bg-black/20 rounded-md p-3 border border-purple-100 dark:border-purple-900"
                >
                  <span className="text-purple-600 dark:text-purple-400 font-medium">Example {index + 1}:</span> {example}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input Area */}
      <div className="space-y-3">
        {renderInput()}
        
        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-red-500 dark:text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Help Text */}
        {question.helpText && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            💡 {question.helpText}
          </p>
        )}
      </div>

      {/* AI Response Area */}
      {question.showAIHelper && aiResponse && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-1">
                AI Insight
              </p>
              {isProcessingAI ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent" />
                  <span className="text-sm text-purple-700 dark:text-purple-300">Analyzing...</span>
                </div>
              ) : (
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  {aiResponse}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3 justify-between pt-4">
        <button
          onClick={onBack}
          disabled={isFirstQuestion}
          className={`
            px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2
            ${
              isFirstQuestion
                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-700'
            }
          `}
        >
          ← Back
        </button>
        
        <button
          onClick={handleNext}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center gap-2"
        >
          {isLastQuestion ? 'See Results' : 'Next'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default QuestionStep;