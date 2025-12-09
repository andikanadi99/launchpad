import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  CheckCircle, 
  AlertCircle,
  Briefcase,
  Heart,
  Target,
  Zap,
  Trophy,
  Star,
  Eye
} from 'lucide-react';

interface ProgressSummaryProps {
  answers: any;
  currentPhase: number;
  questions: any[];
}

// Component for truncated text with show more/less
const TooltipText: React.FC<{
  fullText: string;
  maxLength?: number;
  className?: string;
  prefix?: string;
}> = ({ fullText, maxLength = 100, className = "", prefix = "" }) => {
  const [showFull, setShowFull] = useState(false);
  const needsTruncation = fullText.length > maxLength;
  const truncatedText = needsTruncation 
    ? fullText.substring(0, maxLength - 3) + '...' 
    : fullText;
  
  if (!needsTruncation) {
    return (
      <span className={className}>
        {prefix}{fullText}
      </span>
    );
  }
  
  return (
    <div className="w-full">
      <span className={`${className} break-words`}>
        {prefix}{showFull ? fullText : truncatedText}
      </span>
      {needsTruncation && (
        <button 
          type="button"
          className="ml-1 text-purple-500 hover:text-purple-600 text-xs font-medium"
          onClick={() => setShowFull(!showFull)}
        >
          {showFull ? '(less)' : '(more)'}
        </button>
      )}
    </div>
  );
};

const ProgressSummary: React.FC<ProgressSummaryProps> = ({ 
  answers, 
  currentPhase 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [showAllTargets, setShowAllTargets] = useState(false);

  // Helper to get readable labels for skills
  const getSkillLabels = (skills: any[]) => {
    if (!skills || skills.length === 0) return [];
    
    const skillMap: { [key: string]: string } = {
      'professional_current': 'Current Job Skills',
      'professional_past': 'Past Work Experience',
      'technical_tools': 'Software/Tools',
      'personal_transformation': 'Personal Transformation',
      'creative_hobbies': 'Creative Hobbies',
      'life_skills': 'Life Skills',
      'academic_knowledge': 'Academic/Test Prep',
      'niche_expertise': 'Niche Expertise'
    };
    
    return skills.map(skill => {
      // Handle object format {value, custom}
      if (typeof skill === 'object' && skill !== null) {
        const label = skillMap[skill.value] || skill.value;
        return skill.custom ? `${label}: ${skill.custom}` : label;
      }
      // Handle string format
      return skillMap[skill] || skill;
    });
  };

  // Helper to format target audiences properly
  const formatTargetAudiences = () => {
    if (!answers.target_who) return null;
    
    const audienceMap: { [key: string]: string } = {
      'business_owners': 'Business Owners',
      'professionals': 'Corporate Professionals',
      'freelancers': 'Freelancers/Consultants',
      'creators': 'Content Creators',
      'students': 'Students/Learners',
      'parents': 'Parents',
      'hobbyists': 'Hobbyists',
      'other': 'Other'
    };
    
    const targets = Array.isArray(answers.target_who) ? answers.target_who : [answers.target_who];
    const displayTargets = showAllTargets ? targets : targets.slice(0, 2);
    
    return (
      <>
        {displayTargets.map((target: any, index: number) => {
          const targetValue = typeof target === 'object' ? target.value : target;
          const targetCustom = typeof target === 'object' ? target.custom : '';
          const label = audienceMap[targetValue] || targetValue;
          
          return (
            <div key={index} className="mb-2 pl-6">
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                - <span className="font-medium">{label}</span>
              </div>
              {targetCustom && (
                <div className="text-xs text-neutral-500 dark:text-neutral-500 pl-3 mt-1 italic">
                  "{targetCustom}"
                </div>
              )}
            </div>
          );
        })}
        {targets.length > 2 && (
          <button
            type="button"
            onClick={() => setShowAllTargets(!showAllTargets)}
            className="text-purple-500 hover:text-purple-600 text-xs font-medium pl-6"
          >
            {showAllTargets ? '(show less)' : `(+${targets.length - 2} more)`}
          </button>
        )}
      </>
    );
  };

  // Don't show if no data yet
  const hasPhase1Data = answers.craft_skills && answers.craft_skills.length > 0;
  const hasPhase2Data = answers.target_who || answers.target_outcome || answers.primary_target || answers.starting_product || answers.mission_statement;
  const hasPhase3Data = answers.dream_outcome;

  if (!hasPhase1Data && !hasPhase2Data && !hasPhase3Data) return null;
  
  return (
    <>
      <style >{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      
      {/* Desktop Version - Sticky Sidebar */}
    <div className="hidden lg:block sticky top-6 w-72 flex-shrink-0" style={{paddingTop:'5rem'}}>
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col max-h-[70vh]">
        {/* Header - Now sticky within container */}
            <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0 w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 flex items-center justify-between hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-900/30 dark:hover:to-indigo-900/30 transition-colors border-b border-neutral-200 dark:border-neutral-800"
            >
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                <Star className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-neutral-900 dark:text-white">
                Your Progress So Far
                </span>
            </div>
            {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            ) : (
                <ChevronDown className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            )}
            </button>

            {/* Content - Now scrollable separately */}
            {isExpanded && (
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Phase 1: Skills */}
              {answers.craft_skills && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Your Skills
                  </h3>
                  <div className="space-y-1">
                    {getSkillLabels(answers.craft_skills).map((skill, idx) => (
                      <div key={idx} className="text-sm text-neutral-600 dark:text-neutral-400 pl-6 break-words overflow-hidden">
                        - <TooltipText fullText={skill} maxLength={40} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* What people ask for */}
              {answers.actual_requests && (
                <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    People Ask You For
                    </h3>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400 pl-6 italic break-words">
                    <TooltipText fullText={answers.actual_requests} maxLength={50} prefix='"' />
                    </div>
                </div>
                )}

              {/* Confidence Test */}
              {answers.confidence_test && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    You Could Charge $50/hr For
                  </h3>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400 pl-6 italic">
                    <TooltipText fullText={answers.confidence_test} maxLength={80} prefix='"' />
                  </div>
                </div>
              )}

              {/* Phase 2: Niche Definition */}
              {currentPhase >= 2 && (answers.target_who || answers.target_outcome || answers.primary_target || answers.starting_product) && (
                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
                  <h3 className="font-semibold text-sm text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-500" />
                    Your Focus
                  </h3>
                  
                  {/* Target Audiences */}
                  {answers.target_who && (
                    <div>
                      <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 pl-6 mb-1">
                        - Target Audiences:
                      </div>
                      {formatTargetAudiences()}
                    </div>
                  )}
                  
                  {/* Outcome */}
                  {answers.target_outcome && (
                    <div className="text-sm text-neutral-600 dark:text-neutral-400 pl-6 mt-2">
                      - Outcome: <TooltipText 
                        fullText={answers.target_outcome} 
                        maxLength={50} 
                        className="font-medium italic"
                        prefix='"' 
                      />
                    </div>
                  )}
                  
                  {/* Primary Target */}
                  {answers.primary_target && (
                    <div className="text-sm text-neutral-600 dark:text-neutral-400 pl-6">
                      - Primary Focus: <span className="font-medium">
                        {answers.primary_target.split('_')[0].charAt(0).toUpperCase() + answers.primary_target.split('_')[0].slice(1)}
                      </span>
                    </div>
                  )}
                  
                  {/* Starting Product */}
                  {answers.starting_product && (
                    <div className="text-sm text-neutral-600 dark:text-neutral-400 pl-6">
                      - Product Type: <span className="font-medium">
                        {answers.starting_product === 'low_ticket' ? 'Quick Win ($27-97)' :
                         answers.starting_product === 'mid_ticket' ? 'Core Transformation ($197-497)' :
                         answers.starting_product === 'high_ticket' ? 'Premium Service ($997+)' :
                         answers.starting_product === 'membership' ? 'Membership ($29-99/mo)' :
                         answers.starting_product}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Mission Statement */}
              {answers.mission_statement && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                  <h3 className="font-semibold text-xs text-purple-700 dark:text-purple-300 mb-1">
                    MISSION
                  </h3>
                  <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                    <TooltipText fullText={answers.mission_statement} maxLength={60} />
                  </p>
                </div>
              )}


              {/* Phase 3: Dream Outcome */}
              {currentPhase >= 3 && answers.dream_outcome && (
                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
                  <h3 className="font-semibold text-sm text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-500" />
                    Dream Outcome
                  </h3>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400 pl-6 italic">
                    <TooltipText fullText={answers.dream_outcome} maxLength={80} prefix='"' />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Version - Floating Button + Panel */}
      <div className="lg:hidden">
        {/* Floating Button */}
        <button
          onClick={() => setIsMobileExpanded(!isMobileExpanded)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-purple-700 transition-colors"
        >
          {isMobileExpanded ? (
            <ChevronDown className="w-6 h-6" />
          ) : (
            <Star className="w-6 h-6" />
          )}
        </button>

        {/* Mobile Panel */}
        {isMobileExpanded && (
          <div className="fixed inset-x-0 bottom-0 z-30 bg-white dark:bg-neutral-900 rounded-t-2xl shadow-2xl border-t border-neutral-200 dark:border-neutral-800 max-h-[70vh] overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-neutral-900 dark:text-white">
                  Your Progress
                </h3>
                <button
                  onClick={() => setIsMobileExpanded(false)}
                  className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
              
              {/* Same content as desktop but condensed */}
              <div className="space-y-3 text-sm">
                {/* Phase 1: Skills */}
                {answers.craft_skills && (
                <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Your Skills
                    </h3>
                    <div className="space-y-1">
                    {getSkillLabels(answers.craft_skills).map((skill, idx) => (
                        <div key={idx} className="text-sm text-neutral-600 dark:text-neutral-400 pl-6 break-all">
                        - <TooltipText fullText={skill} maxLength={30} />
                        </div>
                    ))}
                    </div>
                </div>
                )}
                {answers.mission_statement && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2">
                    <p className="font-medium text-purple-900 dark:text-purple-100">
                      {answers.mission_statement}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ProgressSummary;