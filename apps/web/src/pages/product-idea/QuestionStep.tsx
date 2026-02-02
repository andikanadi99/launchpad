import React, { useState, useEffect } from 'react';
import { Wand2, Sparkles, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';


// Types for different question formats
export type QuestionType = 'text' | 'textarea' | 'radio' | 'checkbox' | 'hybrid';

export interface Option {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  allowCustom?: boolean; 
  customPlaceholder?: string; 
  customRequired?: boolean; 
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
  smartSuggestion?: boolean; 
  showAutoGenerate?: boolean;
  dynamicOptionsFrom?: string;
}

interface QuestionStepProps {
  question: QuestionData;
  answer: any;
  onAnswerChange: (answer: any) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  aiResponse?: string;
  isProcessingAI?: boolean;
  onAutoGenerate?: () => void;
  suggestionPreview?: string;
  onAcceptSuggestion?: () => void;
  onRejectSuggestion?: () => void;
  onImproveAnswer?: (currentAnswer: string) => void;
  improvementSuggestion?: string;
  onAcceptImprovement?: () => void;
  onRejectImprovement?: () => void;
  isGeneratingOptimal?: boolean;
  isGeneratingImprovement?: boolean;
  isNavigating?: boolean;
  recommendedValue?: string;
  recommendedReason?: string;
  isReturningFromEdit?: boolean;
  onReturnToProduct?: () => void;
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
  onAutoGenerate,
  suggestionPreview,
  onAcceptSuggestion,
  onRejectSuggestion,
  onImproveAnswer,            
  improvementSuggestion,       
  onAcceptImprovement,         
  onRejectImprovement,  
  isGeneratingOptimal = false,      
  isGeneratingImprovement = false,
  isNavigating = false,
  recommendedValue,
  recommendedReason,
}) => {

  const [error, setError] = useState<string>('');
  const [customInput, setCustomInput] = useState<string>('');
  const [customInputs, setCustomInputs] = useState<{[key: string]: string}>({});
  const [showExamples, setShowExamples] = useState(false);

  // Initialize customInputs from loaded answer (for resume functionality)
  // FIXED: Also runs when answer changes (not just question.id)
  useEffect(() => {
    if (question.type === 'checkbox' && Array.isArray(answer)) {
      const loadedCustomInputs: {[key: string]: string} = {};
      answer.forEach((item) => {
        if (typeof item === 'object' && item.value && item.custom) {
          loadedCustomInputs[item.value] = item.custom;
        }
      });
      if (Object.keys(loadedCustomInputs).length > 0) {
        setCustomInputs(loadedCustomInputs);
      }
    }
  }, [question.id, answer]); // FIXED: Added 'answer' as dependency

  // Auto-resize textarea when answer changes
    useEffect(() => {
    if (question.type === 'textarea') {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
        const textarea = document.querySelector('textarea');
        if (textarea && answer) {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        }
        }, 50);
    }
    }, [answer, question.type]);

  // Validate answer before proceeding
  const validateAnswer = (): boolean => {
    setError('');
    
    if (!question.validation) return true;
    
    const { required, minLength, maxLength, minSelections, maxSelections } = question.validation;
    
    // Check required
    if (required) {
      if (!answer || (Array.isArray(answer) && answer.length === 0) || answer === '') {
        const message = question.type === 'checkbox' 
          ? 'Please select at least one option'
          : question.type === 'radio'
          ? 'Please select an option'
          : 'This field is required';
        setError(message);
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
    if (question.type === 'checkbox' && question.options) {
        const selections = answer as any[];
        
        for (const selection of selections) {
            // Check if this selection requires custom input
            if (typeof selection === 'object' && selection.value) {
            // Find the corresponding option
            const option = question.options.find(opt => opt.value === selection.value);
            
            if (option?.customRequired && (!selection.custom || selection.custom.trim() === '')) {
                setError(`Please specify details for "${option.label}"`);
                return false;
            }
            } else if (typeof selection === 'string') {
            // Check if this string selection should have custom input
            const option = question.options.find(opt => opt.value === selection);
            
            if (option?.allowCustom && option?.customRequired) {
                setError(`Please specify details for "${option.label}"`);
                return false;
            }
            }
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
      currentAnswers = currentAnswers.filter(a => 
        typeof a === 'string' ? a !== value : a.value !== value
      );
      // Also clear custom input when unchecked
      if (isCustomOption) {
        setCustomInputs(prev => {
          const newInputs = { ...prev };
          delete newInputs[value];
          return newInputs;
        });
      }
    }
    
    onAnswerChange(currentAnswers);
  };

  const handleCustomInputChange = (optionValue: string, customText: string) => {
    setCustomInputs(prev => ({ ...prev, [optionValue]: customText }));
    
    // Update the answer array with the new custom text
    const currentAnswers = (answer as any[]) || [];
    const updatedAnswers = currentAnswers.map(a => {
      if (typeof a === 'object' && a.value === optionValue) {
        return { ...a, custom: customText };
      }
      if (a === optionValue) {
        return { value: optionValue, custom: customText };
      }
      return a;
    });
    
    onAnswerChange(updatedAnswers);
  };

  const getValidationWarning = () => {
    if (!question.validation) return '';
    
    if (question.type === 'textarea' && question.validation.minLength) {
      const currentLength = answer?.length || 0;
      const minLength = question.validation.minLength;
      if (currentLength < minLength) {
        return `Write at least ${minLength - currentLength} more characters`;
      }
    }
    
    if (question.validation.required && (!answer || answer === '' || (Array.isArray(answer) && answer.length === 0))) {
      return 'This field is required';
    }
    
    // Check for required custom inputs
    if (question.type === 'checkbox' && Array.isArray(answer)) {
      for (const selection of answer) {
        if (typeof selection === 'object' && selection.value) {
          const option = question.options?.find(opt => opt.value === selection.value);
          if (option?.customRequired && (!selection.custom || selection.custom.trim() === '')) {
            return `Please specify details for "${option.label}"`;
          }
        }
      }
    }
    
    return '';
  };

  const renderInput = () => {
    switch (question.type) {
      case 'text':
        return (
          <input
            type="text"
            value={answer || ''}
            onChange={(e) => onAnswerChange(e.target.value)}
            placeholder={question.placeholder}
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
          />
        );
        
      case 'textarea':
        return (
          <div className="space-y-2">
            {/* AI Actions Row - Above input */}
            {(question.showAutoGenerate || question.showAIHelper) && (
              <div className="flex gap-2 justify-end">
                {/* Auto-Generate Button */}
                {question.showAutoGenerate && onAutoGenerate && (
                  <button
                    onClick={onAutoGenerate}
                    disabled={isGeneratingOptimal}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg transition-all disabled:opacity-50"
                  >
                    {isGeneratingOptimal ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Suggest an answer</span>
                      </>
                    )}
                  </button>
                )}
                
                {/* Improve Answer Button */}
                {question.showAIHelper && answer && answer.length > 10 && onImproveAnswer && (
                  <button
                    onClick={() => onImproveAnswer(answer)}
                    disabled={isGeneratingImprovement}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-all disabled:opacity-50"
                  >
                    {isGeneratingImprovement ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Improving...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>Improve my answer</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
            
            {/* Generated Suggestion Preview - Above input */}
            {suggestionPreview && (
              <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Generated Answer</span>
                </div>
                <p className="text-sm text-purple-800 dark:text-purple-200 whitespace-pre-wrap mb-3">
                  {suggestionPreview}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={onAcceptSuggestion}
                    className="px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Use this
                  </button>
                  <button
                    onClick={onRejectSuggestion}
                    className="px-3 py-1.5 text-xs font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                  >
                    No thanks
                  </button>
                </div>
              </div>
            )}
            
            {/* Improvement Suggestion Preview - Above input */}
            {improvementSuggestion && (
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center gap-2 mb-2">
                  <Wand2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">Improved Version</span>
                </div>
                <p className="text-sm text-indigo-800 dark:text-indigo-200 whitespace-pre-wrap mb-3">
                  {improvementSuggestion}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={onAcceptImprovement}
                    className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Use improved
                  </button>
                  <button
                    onClick={onRejectImprovement}
                    className="px-3 py-1.5 text-xs font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                  >
                    Keep original
                  </button>
                </div>
              </div>
            )}
            
            <textarea
              value={answer || ''}
              onChange={(e) => {
                onAnswerChange(e.target.value);
                // Auto-resize on input
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              placeholder={question.placeholder}
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 resize-none overflow-hidden"
            />
            
            {/* Character count */}
            <div className="flex justify-between">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {question.validation?.minLength && `Min: ${question.validation.minLength} chars`}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {answer?.length || 0}{question.validation?.maxLength ? `/${question.validation.maxLength}` : ''} characters
              </span>
            </div>
          </div>
        );
        
      case 'radio':
        return (
          <div className="space-y-3">
            {question.options?.map((option) => {
              const isSelected = typeof answer === 'object' 
                ? answer?.value === option.value 
                : answer === option.value;
              const hasCustomInput = option.allowCustom || option.customRequired;
              
              return (
                <div key={option.value}>
                  <label
                    className={`
                      block p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${isSelected
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-purple-300 dark:hover:border-purple-700'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name={question.id}
                        value={option.value}
                        checked={isSelected}
                        onChange={() => handleRadioChange(option.value, hasCustomInput || false)}
                        className="mt-1 text-purple-600 focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {option.icon}
                          <span className="font-medium text-neutral-900 dark:text-white">
                            {option.label}
                          </span>
                          {recommendedValue && option.value.startsWith(recommendedValue) && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 border border-yellow-400/30 rounded-full">
                              ⭐ Recommended
                            </span>
                          )}
                        </div>
                        {option.description && (
                          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                            {option.description}
                          </p>
                        )}
                        {recommendedValue && recommendedReason && option.value.startsWith(recommendedValue) && (
                          <p className="text-xs text-yellow-600 dark:text-yellow-400/80 mt-1.5 italic">
                            Why: {recommendedReason}
                          </p>
                        )}
                      </div>
                    </div>
                  </label>
                  
                  {/* Custom input field */}
                  {hasCustomInput && isSelected && (
                    <div className="mt-2 ml-11">
                      <textarea
                        value={typeof answer === 'object' ? answer?.custom || '' : customInput}
                        onChange={(e) => {
                          setCustomInput(e.target.value);
                          onAnswerChange({ value: option.value, custom: e.target.value });
                          // Auto-resize
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        ref={(el) => {
                          if (el) {
                            el.style.height = 'auto';
                            el.style.height = el.scrollHeight + 'px';
                          }
                        }}
                        rows={1}
                        placeholder={option.customPlaceholder || "Please specify..."}
                        className="w-full px-3 py-2 rounded-md border border-purple-300 dark:border-purple-600 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 placeholder-neutral-400 dark:placeholder-neutral-500 resize-none overflow-hidden"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
        
      case 'checkbox':
        return (
          <div className="space-y-3">
            {question.options?.map((option) => {
              const isChecked = Array.isArray(answer) && answer.some(a => 
                typeof a === 'string' ? a === option.value : a.value === option.value
              );
              const hasCustomInput = option.allowCustom || option.customRequired;
              
              return (
                <div key={option.value}>
                  <label
                    className={`
                      block p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${isChecked
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-purple-300 dark:hover:border-purple-700'
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
                      <textarea
                        value={customInputs[option.value] || ''}
                        onChange={(e) => {
                          handleCustomInputChange(option.value, e.target.value);
                          // Auto-resize
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        ref={(el) => {
                          if (el) {
                            el.style.height = 'auto';
                            el.style.height = el.scrollHeight + 'px';
                          }
                        }}
                        rows={1}
                        placeholder={
                            option.customPlaceholder || 
                            (option.value === 'professional_current' 
                                ? "Your job title (e.g., Software Engineer, Marketing Manager...)" 
                                : option.value === 'professional_past'
                                ? "Previous role (e.g., Data Analyst, Product Manager...)"
                                : "Please specify...")
                            }
                        className="w-full px-3 py-2 rounded-md border border-purple-300 dark:border-purple-600 bg-white dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 placeholder-neutral-400 dark:placeholder-neutral-500 resize-none overflow-hidden"
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
  const isNextDisabled = () => {
    // Disable if navigating
    if (isNavigating) return true;
    
    if (!question.validation?.required) return false;
    
    // Check if answer is empty
    if (!answer || (Array.isArray(answer) && answer.length === 0) || answer === '') return true;
    
    // Check textarea minimum length
    if (question.type === 'textarea' && question.validation?.minLength) {
        if (!answer || answer.length < question.validation.minLength) return true;
    }
    
    // Check for required custom inputs in checkboxes
    if (question.type === 'checkbox' && Array.isArray(answer)) {
        for (const selection of answer) {
        if (typeof selection === 'object' && selection.value) {
            const option = question.options?.find(opt => opt.value === selection.value);
            if (option?.customRequired && (!selection.custom || selection.custom.trim() === '')) {
            return true;
            }
        }
        }
    }
    
    return false;
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
            className="flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 bg-white dark:bg-neutral-800 px-3 py-2 rounded-lg border border-purple-300 dark:border-purple-700 hover:border-purple-400 dark:hover:border-purple-600 transition-all"
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
            {question.helpText}
          </p>
        )}
      </div>

      {/* Navigation Buttons */}
        <div className="space-y-2">
        <div className="flex gap-3 justify-between pt-4">
            <button
            onClick={onBack}
            disabled={isFirstQuestion || isNavigating}
            className={`
                px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2
                ${
                isFirstQuestion || isNavigating
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-700'
                }
            `}
            >
            {isNavigating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Back'
            )}
            </button>
            
            <button
                onClick={handleNext}
                disabled={isNextDisabled()}
                className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2
                    ${isNextDisabled()
                    ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700'
                    }`}
                >
                {isNavigating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    {isLastQuestion ? 'See Results' : 'Next'}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
                </button>
        </div>
        
        {/* Validation Warning Message */}
        {isNextDisabled() && !isNavigating && (
            <div className="flex items-center justify-end gap-2 text-amber-600 dark:text-amber-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{getValidationWarning()}</span>
            </div>
        )}
        </div>
      
    </div>
  );
};

export default QuestionStep;