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
  Star
} from 'lucide-react';

interface ProgressSummaryProps {
  answers: any;
  currentPhase: number;
  questions: any[];
}

const ProgressSummary: React.FC<ProgressSummaryProps> = ({ 
  answers, 
  currentPhase,
  questions 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

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
    
    return skills.map(skill => skillMap[skill] || skill);
  };

  // Helper to get audience labels
  const getAudienceLabels = (audience: any) => {
    if (!audience) return '';
    
    const audienceMap: { [key: string]: string } = {
      'business_owners': 'Business Owners',
      'professionals': 'Professionals',
      'freelancers': 'Freelancers',
      'creators': 'Content Creators',
      'students': 'Students',
      'parents': 'Parents',
      'hobbyists': 'Hobbyists'
    };
    
    if (Array.isArray(audience)) {
      return audience.map(a => {
        if (typeof a === 'object' && a.custom) return a.custom;
        return audienceMap[a] || a;
      }).join(' & ');
    }
    
    if (typeof audience === 'object' && audience.custom) return audience.custom;
    return audienceMap[audience] || audience;
  };

  // Calculate validation score
  const getValidationScore = () => {
    if (!answers.do_i_like_it || !answers.can_i_help || !answers.will_they_pay) return null;
    
    let score = 0;
    if (answers.do_i_like_it === 'yes') score++;
    if (answers.can_i_help === 'yes') score++;
    if (answers.will_they_pay === 'yes') score++;
    
    if (answers.do_i_like_it === 'maybe') score += 0.5;
    if (answers.can_i_help === 'maybe') score += 0.5;
    if (answers.will_they_pay === 'maybe') score += 0.5;
    
    return score;
  };

  const validationScore = getValidationScore();

  // Don't show if no data yet
  if (!answers.craft_skills && currentPhase === 1) return null;

  return (
    <>
      {/* Desktop Version - Sticky Sidebar */}
      <div className="hidden lg:block sticky top-6">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
          {/* Header */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 flex items-center justify-between hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-900/30 dark:hover:to-indigo-900/30 transition-colors"
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

          {/* Content */}
          {isExpanded && (
            <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
              {/* Phase 1: Skills */}
              {answers.craft_skills && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Your Skills
                  </h3>
                  <div className="space-y-1">
                    {getSkillLabels(answers.craft_skills).map((skill, idx) => (
                      <div key={idx} className="text-sm text-neutral-600 dark:text-neutral-400 pl-6">
                        • {skill}
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
                  <div className="text-sm text-neutral-600 dark:text-neutral-400 pl-6 italic">
                    "{answers.actual_requests.substring(0, 100)}..."
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
                    "{answers.confidence_test.substring(0, 80)}..."
                  </div>
                </div>
              )}

              {/* Phase 2: Niche */}
              {currentPhase >= 2 && answers.approach_choice && (
                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
                  <h3 className="font-semibold text-sm text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-500" />
                    Your Focus
                  </h3>
                  <div className="space-y-1 text-sm text-neutral-600 dark:text-neutral-400 pl-6">
                    <div>• Approach: <span className="font-medium">{answers.approach_choice === 'architect' ? 'Architect (one niche)' : 'Archaeologist (explore)'}</span></div>
                    {answers.target_who && (
                      <div>• Target: <span className="font-medium">{getAudienceLabels(answers.target_who)}</span></div>
                    )}
                    {answers.target_outcome && (
                      <div>• Outcome: <span className="font-medium">"{answers.target_outcome}"</span></div>
                    )}
                  </div>
                </div>
              )}

              {/* Mission Statement */}
              {answers.mission_statement && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                  <h3 className="font-semibold text-xs text-purple-700 dark:text-purple-300 mb-1">
                    MISSION
                  </h3>
                  <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                    {answers.mission_statement}
                  </p>
                </div>
              )}

              {/* Phase 3: Validation */}
              {currentPhase >= 3 && validationScore !== null && (
                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
                  <h3 className="font-semibold text-sm text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    Validation
                  </h3>
                  <div className="space-y-1 text-sm pl-6">
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-600 dark:text-neutral-400">Like it:</span>
                      {answers.do_i_like_it === 'yes' ? (
                        <span className="text-green-600 dark:text-green-400 font-medium">✅ Yes</span>
                      ) : answers.do_i_like_it === 'maybe' ? (
                        <span className="text-yellow-600 dark:text-yellow-400 font-medium">🟡 Maybe</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 font-medium">❌ No</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-600 dark:text-neutral-400">Can help:</span>
                      {answers.can_i_help === 'yes' ? (
                        <span className="text-green-600 dark:text-green-400 font-medium">✅ Yes</span>
                      ) : answers.can_i_help === 'maybe' ? (
                        <span className="text-yellow-600 dark:text-yellow-400 font-medium">🟡 Maybe</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 font-medium">❌ No</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-600 dark:text-neutral-400">Will pay:</span>
                      {answers.will_they_pay === 'yes' ? (
                        <span className="text-green-600 dark:text-green-400 font-medium">✅ Yes</span>
                      ) : answers.will_they_pay === 'maybe' ? (
                        <span className="text-yellow-600 dark:text-yellow-400 font-medium">🟡 Maybe</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 font-medium">❌ No</span>
                      )}
                    </div>
                  </div>
                  <div className={`mt-2 text-xs font-medium px-2 py-1 rounded-full inline-block ${
                    validationScore >= 3 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                    validationScore >= 2 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                    {validationScore >= 3 ? '🟢 Green Light' : 
                     validationScore >= 2 ? '🟡 Yellow Light' : 
                     '🔴 Red Light'}
                  </div>
                </div>
              )}

              {/* Phase 4: Value Props */}
              {currentPhase >= 4 && answers.dream_outcome && (
                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
                  <h3 className="font-semibold text-sm text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-500" />
                    Value Creation
                  </h3>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400 pl-6 italic">
                    Dream: "{answers.dream_outcome.substring(0, 80)}..."
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
                {answers.craft_skills && (
                  <div>
                    <h4 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">Your Skills:</h4>
                    <div className="text-neutral-600 dark:text-neutral-400">
                      {getSkillLabels(answers.craft_skills).join(', ')}
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
                
                {validationScore !== null && (
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-600 dark:text-neutral-400">Validation:</span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      validationScore >= 3 ? 'bg-green-100 text-green-700' :
                      validationScore >= 2 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {validationScore >= 3 ? 'Green Light' : 
                       validationScore >= 2 ? 'Yellow Light' : 
                       'Red Light'}
                    </span>
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