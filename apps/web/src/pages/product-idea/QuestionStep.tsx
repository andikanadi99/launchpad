import React, { useState, useEffect } from 'react';
import { Wand2, Sparkles, ChevronRight, MessageCircle, AlertCircle } from 'lucide-react';


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
}) => {

  const [error, setError] = useState<string>('');
  const [customInput, setCustomInput] = useState<string>('');
  const [customInputs, setCustomInputs] = useState<{[key: string]: string}>({});
  const [showExamples, setShowExamples] = useState(false);

  // Initialize customInputs from loaded answer (for resume functionality)
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
  }, [question.id]); // Re-run when question changes

  // Auto-resize custom input textareas after content loads
  useEffect(() => {
    if (Object.keys(customInputs).length > 0) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const textareas = document.querySelectorAll('textarea[data-custom-input="true"]');
        textareas.forEach((textarea) => {
          const el = textarea as HTMLTextAreaElement;
          el.style.height = 'auto';
          el.style.height = el.scrollHeight + 'px';
        });
      }, 50);
    }
  }, [customInputs]);

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

    // Generate appropriate warning message based on validation state
    const getValidationWarning = (): string => {
    if (!question.validation?.required) return '';
    
    // Empty answer
    if (!answer || (Array.isArray(answer) && answer.length === 0) || answer === '') {
        return 'Answer is required for this step.';
    }
    
    // Textarea minimum length
    if (question.type === 'textarea' && question.validation?.minLength) {
        const currentLength = (answer || '').length;
        const minLength = question.validation.minLength;
        if (currentLength < minLength) {
        return `Answer needs to be at least ${minLength} characters (currently ${currentLength})`;
        }
    }
    
    // Text minimum length
    if (question.type === 'text' && question.validation?.minLength) {
        const currentLength = (answer || '').length;
        const minLength = question.validation.minLength;
        if (currentLength < minLength) {
        return `Minimum ${minLength} characters required (currently ${currentLength})`;
        }
    }
    
    // Checkbox - required custom inputs
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
    
    // Checkbox - minimum selections
    if (question.type === 'checkbox' && question.validation?.minSelections) {
        const selections = answer as string[];
        if (selections.length < question.validation.minSelections) {
        return `Please select at least ${question.validation.minSelections} option${question.validation.minSelections > 1 ? 's' : ''}`;
        }
    }
    
    return 'Please complete this field to continue';
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
        // Debug log to check if showAutoGenerate is set
        console.log('Question ID:', question.id, 'ShowAutoGenerate:', question.showAutoGenerate);
        
        case 'textarea':
            console.log('Rendering textarea - showAutoGenerate:', question.showAutoGenerate, 'Answer:', answer);
            
            return (
                <div className="space-y-3">
                {/* Generate/Improve Buttons */}
                <div className="flex gap-2">
                    {question.showAutoGenerate && !suggestionPreview && !improvementSuggestion && (
                    <button
                        type="button"
                        onClick={() => {
                        console.log('Generate button clicked!');
                        if (onAutoGenerate) {
                            onAutoGenerate();
                        }
                        }}
                        disabled={isGeneratingOptimal}
                        className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg border transition-all ${
                        isGeneratingOptimal 
                            ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-400 cursor-not-allowed'
                            : 'text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700'
                        }`}
                    >
                        {isGeneratingOptimal ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent" />
                            Thinking...
                        </>
                        ) : (
                        <>
                            <Wand2 className="w-4 h-4" />
                            Suggest an Answer
                        </>
                        )}
                    </button>
                    )}
                    {answer && answer.length > 10 && !improvementSuggestion && !suggestionPreview && (
                        <button
                            type="button"
                            onClick={() => onImproveAnswer?.(answer)}
                            disabled={isGeneratingImprovement}
                            className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg border transition-all ${
                            isGeneratingImprovement
                                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-400 cursor-not-allowed'
                                : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                            }`}
                        >
                            {isGeneratingImprovement ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent" />
                                    Thinking...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    Improve my answer
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* Suggestion Preview (before/after) */}
                {suggestionPreview && (
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                            <Wand2 className="w-4 h-4 inline mr-1" />
                            AI Suggestion:
                        </p>
                        <div className="flex gap-2">
                            <button
                            type="button"
                            onClick={onAcceptSuggestion}
                            className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                            >
                            Accept
                            </button>
                            <button
                            type="button"
                            onClick={onRejectSuggestion}
                            className="text-xs px-2 py-1 bg-neutral-500 hover:bg-neutral-600 text-white rounded-md transition-colors"
                            >
                            Dismiss
                            </button>
                        </div>
                        </div>
                        
                        {/* Show current answer if exists */}
                        {answer && answer.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-md p-3 border border-red-200 dark:border-red-800">
                            <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                            <AlertCircle className="w-3 h-3 inline mr-1" /> Your current answer (will be replaced):
                            </p>
                            <p className="text-sm text-red-800 dark:text-red-200 whitespace-pre-wrap">
                            {answer.length > 200 ? answer.substring(0, 200) + '...' : answer}
                            </p>
                        </div>
                        )}
                        
                        {/* Show suggested answer */}
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-md p-3 border border-green-200 dark:border-green-800">
                        <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                            <Sparkles className="w-3 h-3 inline mr-1" /> Suggested answer:
                        </p>
                        <p className="text-sm text-green-800 dark:text-green-200 whitespace-pre-wrap">
                            {suggestionPreview}
                        </p>
                        </div>
                    </div>
                    </div>
                )}

                {/* Improvement Preview (before/after) */}
                {improvementSuggestion && (
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                            <Sparkles className="w-4 h-4 inline mr-1" />
                            AI Improvement:
                        </p>
                        <div className="flex gap-2">
                            <button
                            type="button"
                            onClick={onAcceptImprovement}
                            className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                            >
                            Accept
                            </button>
                            <button
                            type="button"
                            onClick={onRejectImprovement}
                            className="text-xs px-2 py-1 bg-neutral-500 hover:bg-neutral-600 text-white rounded-md transition-colors"
                            >
                            Dismiss
                            </button>
                        </div>
                        </div>
                        
                        {/* Show current answer */}
                        {answer && answer.length > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-md p-3 border border-amber-200 dark:border-amber-800">
                            <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">
                            Your current answer:
                            </p>
                            <p className="text-sm text-amber-800 dark:text-amber-200 whitespace-pre-wrap">
                            {answer.length > 200 ? answer.substring(0, 200) + '...' : answer}
                            </p>
                        </div>
                        )}
                        
                        {/* Show improved answer */}
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-md p-3 border border-green-200 dark:border-green-800">
                        <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                            <Sparkles className="w-3 h-3 inline mr-1" /> Improved answer:
                        </p>
                        <p className="text-sm text-green-800 dark:text-green-200 whitespace-pre-wrap">
                            {improvementSuggestion}
                        </p>
                        </div>
                    </div>
                    </div>
                )}

                {/* Tip for empty field */}
                {question.showAutoGenerate && (!answer || answer === '' || answer.length === 0) && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 italic">
                    Tip: Click "Suggest an Answer" to get a suggestion based on your previous answers.
                    </p>
                )}

                {/* Textarea */}
                <textarea
                ref={(el) => {
                    if (el && answer) {
                    // Auto-resize on mount/update
                    el.style.height = 'auto';
                    el.style.height = el.scrollHeight + 'px';
                    }
                }}
                value={answer || ''}
                onChange={(e) => {
                    onAnswerChange(e.target.value);
                    // Auto-resize textarea
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                }}
                onInput={(e) => {
                    // Auto-resize on input as well
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                }}
                placeholder={question.placeholder || 'Type your answer here...'}
                rows={4}
                maxLength={question.validation?.maxLength}
                className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 resize-none overflow-hidden transition-all"
                style={{ minHeight: '120px' }}
                />
                
                {/* Character counter */}
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
                      <textarea
                        data-custom-input="true"
                        value={customInputs[option.value] || ''}
                        onChange={(e) => {
                          handleCustomInputChange(option.value, e.target.value);
                          // Auto-resize
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
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
        <div className="space-y-2">
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
            Back
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
                {isLastQuestion ? 'See Results' : 'Next'}
                <ChevronRight className="w-4 h-4" />
                </button>
        </div>
        
        {/* Validation Warning Message */}
        {isNextDisabled() && (
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