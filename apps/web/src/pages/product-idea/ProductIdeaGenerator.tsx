// src/pages/product-idea/ProductIdeaGenerator.tsx
// Product Idea Discovery Framework

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../lib/firebase';
import { doc, updateDoc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { 
  saveProductCoPilotAnswers, 
  getOrCreateActiveSession, 
  markProductCoPilotComplete,
  resetProductCoPilotSession,
  startNewCoPilotSession
} from '../../lib/UserDocumentHelpers';
import { 
  Lightbulb, 
  Users, 
  DollarSign, 
  Clock, 
  Target,
  Zap,
  TrendingUp,
  Package,
  Gift,
  Shield,
  Gauge,
  ArrowLeft,
  Heart,
  HelpCircle,
  CheckCircle,
  Rocket,
  Trophy,
  Star,
  Award,
  Briefcase,
  Sparkles,
  RefreshCw,
  X,
  Edit2,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  Trash2
} from 'lucide-react';

import ProgressBar from './ProgressBar';
import QuestionStep, { QuestionData } from './QuestionStep';
import ProgressSummary from './ProgressSummary';

const functions = getFunctions();
// Types
interface Answers {
  [key: string]: any;
}

interface AIResponses {
  [key: string]: string;
}

interface GeneratedIdea {
  id: string;
  name: string;
  description: string;
  price: number;
  priceType: 'low' | 'mid' | 'high';
  targetAudience: string;
  mainOutcome: string;
  timeToResult: string;
  difficultyLevel: string;
  valueStack: string[];
  guarantee: string;
  whyItFits: string;
}

// ========================================
// SMART SUGGESTION GENERATOR
// ========================================
const generateSmartSuggestion = (questionId: string, answers: Answers): string => {
  switch(questionId) {
    case 'actual_requests':
      // Generate based on skills following validation principles
      const skills = answers.craft_skills || [];
      if (!skills.length) return '';
      
      const requests: string[] = [];
      
      skills.forEach((skill: any) => {
        const value = typeof skill === 'object' ? skill.value : skill;
        const custom = typeof skill === 'object' ? skill.custom : null;
        
        // Key principle: Real problems = real requests
        if (value === 'professional_current' && custom) {
          requests.push(`At work: Colleagues constantly ask me to review their ${custom.toLowerCase()} work, train new team members on our processes, and solve complex technical problems they're stuck on`);
        }
        if (value === 'technical_tools') {
          requests.push(`Tech support: Friends need help automating their workflows, coworkers want my Excel templates and scripts, people ask for tool recommendations`);
        }
        if (value === 'niche_expertise' && custom) {
          requests.push(`Specialty requests: Online communities ask for ${custom.toLowerCase()} advice, people DM me for tutorials, friends want consulting on specific ${custom.toLowerCase()} challenges`);
        }
        if (value === 'personal_transformation') {
          requests.push(`Personal help: Friends ask how I achieved my transformation, family wants my methods and systems, social media followers request coaching`);
        }
      });
      
      // Add universal requests (everyone has these problems)
      requests.push(`Personal favors: Family needs tech help, friends want career advice, people ask how to get started in my field`);
      
      return requests.slice(0, 2).join('. ');
      
    case 'confidence_test':
      // Generate based on skills and requests
      const userSkills = answers.craft_skills || [];
      const userRequests = answers.actual_requests || '';
      
      // Return empty if prerequisites not met
      if (!userSkills.length || !userRequests) {
        return '';
      }
      // Extract key skills
      const skillLabels: string[] = [];

      userSkills.forEach((skill: any) => {
        const value = typeof skill === 'object' ? skill.value : skill;
        const custom = typeof skill === 'object' ? skill.custom : null;
        
        if (value === 'professional_current' && custom) {
          skillLabels.push(`${custom.toLowerCase()} consulting`);
        } else if (value === 'technical_tools' && custom) {
          skillLabels.push(`${custom.toLowerCase()} training`);
        } else if (value === 'personal_transformation' && custom) {
          skillLabels.push(`${custom.toLowerCase()} coaching`);
        } else if (value === 'niche_expertise' && custom) {
          skillLabels.push(`${custom.toLowerCase()} consulting`);
        } else if (value === 'academic_knowledge' && custom) {
          skillLabels.push(`${custom.toLowerCase()} tutoring`);
        }
      });
      
      // Extract key phrases from requests
      const requestKeywords = userRequests.toLowerCase().match(/(?:help with|ask for|want|need|asks?)\s+([^,.]+)/g) || [];
      const specificRequests = requestKeywords.slice(0, 2).map(r => r.replace(/(?:help with|ask for|want|need|asks?)\s+/, '').trim());
      
      // Build a simple, direct answer
      if (skillLabels.length > 0 && specificRequests.length > 0) {
        return `I could charge $50/hour for ${specificRequests[0]} based on my experience with ${skillLabels[0]}. I could also offer ${specificRequests[1] || 'consulting services'} and training sessions at similar rates.`;
      } else if (skillLabels.length > 0) {
        return `I could charge $50/hour for ${skillLabels[0]}, offering consulting sessions, training, and implementation support.`;
      }
      return '';
      
    case 'target_who':
      // Generate smart suggestion based on who's been asking for help
      const whoRequests = answers.actual_requests || '';
      const whoSkills = answers.craft_skills || [];
      
      if (!whoRequests) return '';
      
      // Analyze the requests to identify WHO is asking
      const suggestions: string[] = [];
      const requestsLower = whoRequests.toLowerCase();
      
      // Check for professional context
      if (requestsLower.includes('colleague') || requestsLower.includes('boss') || 
          requestsLower.includes('work') || requestsLower.includes('team')) {
        suggestions.push('professionals');
      }
      
      // Check for business context
      if (requestsLower.includes('client') || requestsLower.includes('founder') || 
          requestsLower.includes('business') || requestsLower.includes('startup')) {
        suggestions.push('business_owners');
      }
      
      // Check for creative context
      if (requestsLower.includes('youtube') || requestsLower.includes('content') || 
          requestsLower.includes('instagram') || requestsLower.includes('blog')) {
        suggestions.push('creators');
      }
      
      // Check for student context
      if (requestsLower.includes('student') || requestsLower.includes('learn') || 
          requestsLower.includes('course') || requestsLower.includes('study')) {
        suggestions.push('students');
      }
      
      // Check for parent context
      if (requestsLower.includes('parent') || requestsLower.includes('mom') || 
          requestsLower.includes('dad') || requestsLower.includes('kid')) {
        suggestions.push('parents');
      }
      
      // Check skills for additional context
      whoSkills.forEach((skill: any) => {
        const value = typeof skill === 'object' ? skill.value : skill;
        if (value === 'professional_current' || value === 'professional_past') {
          if (!suggestions.includes('professionals')) suggestions.push('professionals');
        }
        if (value === 'academic_knowledge') {
          if (!suggestions.includes('students')) suggestions.push('students');
        }
      });
      
      // Return formatted suggestion
      if (suggestions.length > 0) {
        return `Based on your answers, consider targeting: ${suggestions.slice(0, 2).join(' or ')}. These are people already in your network asking for help.`;
      }
      
      return '';
      
    case 'dream_outcome':
      // Generate based on niche and validation
      const who = answers.target_who;
      const outcome = answers.target_outcome || '';

      // Return empty if prerequisites not met
      if (!who || !outcome) {
        return '';
      }
      
      // Build transformation narrative
      if (outcome) {
        const painPoint = outcome.includes('save') ? 'wasting time and resources' : 
                         outcome.includes('get') || outcome.includes('build') ? 'struggling to achieve results' :
                         outcome.includes('pass') ? 'feeling overwhelmed and underprepared' :
                         outcome.includes('launch') ? 'stuck in analysis paralysis' :
                         outcome.includes('automate') ? 'drowning in manual tasks' :
                         'facing constant challenges';
                         
        const biggerWin = outcome.includes('save') ? 'having automated systems that run without them' :
                         outcome.includes('get') || outcome.includes('build') ? 'building sustainable, scalable success' :
                         outcome.includes('pass') ? 'becoming recognized experts in their field' :
                         outcome.includes('launch') ? 'running a profitable business on autopilot' :
                         outcome.includes('automate') ? 'focusing on strategy while systems handle execution' :
                         'achieving industry leadership';
        
        return `They transform from ${painPoint} to not just ${outcome.toLowerCase()}, but ultimately ${biggerWin}. They go from stressed and reactive to confident and proactive, with measurable results they can show to stakeholders. Their success becomes repeatable and scalable.`;
      }
      return '';
      
    default:
      return '';
  }
};
// Generate improved version of user's answer
const generateImprovedAnswer = (questionId: string, currentAnswer: string): string => {
  switch(questionId) {
    case 'actual_requests':
      // Improve structure and specificity following validation principles
      const improved = currentAnswer
        .split(/[.,;]/)
        .filter(s => s.trim())
        .map(request => {
          // Add specificity and context
          if (request.toLowerCase().includes('help')) {
            return request.trim() + ' (validated pain point - people actively seek this)';
          }
          return request.trim();
        });
      
      return `At work: ${improved.slice(0, Math.ceil(improved.length/2)).join(', ')}. 
Personally: ${improved.slice(Math.ceil(improved.length/2)).join(', ')}.
Key insight: These are REAL problems people already pay to solve - perfect for productization.`;

    case 'confidence_test':
      // Simply expand on their answer with additional service options
      const services = currentAnswer.toLowerCase();
      const additions = [];
      
      // Add relevant service expansions based on what they mentioned
      if (services.includes('coaching') || services.includes('fitness') || services.includes('training')) {
        additions.push('personalized program design, form correction sessions, accountability check-ins');
      }
      if (services.includes('development') || services.includes('code') || services.includes('app')) {
        additions.push('code reviews, debugging sessions, technical consultations');
      }
      if (services.includes('design') || services.includes('creative')) {
        additions.push('design consultations, creative direction, portfolio reviews');
      }
      if (services.includes('writing') || services.includes('content')) {
        additions.push('editing services, content strategy, writing workshops');
      }
      if (services.includes('business') || services.includes('consulting')) {
        additions.push('strategy sessions, process optimization, implementation support');
      }
      
      if (additions.length > 0) {
        return `${currentAnswer}\n\nAdditional services at the $50/hour rate could include: ${additions[0]}.`;
      }
      
      // Default expansion if no keywords matched
      return `${currentAnswer}\n\nRelated services could include one-on-one consultations, group workshops, or package deals for ongoing support.`;


    case 'target_outcome':
      // Make it more specific and measurable
      const measurable = currentAnswer.replace(/better|improve|more|less/gi, (match) => {
        const replacements: {[key: string]: string} = {
          'better': '25% better',
          'improve': 'improve by 30%',
          'more': '50% more',
          'less': '50% less'
        };
        return replacements[match.toLowerCase()] || match;
      });
      
      return `${measurable} - with measurable KPIs and clear success metrics that they can show to stakeholders`;

    default:
      // Generic improvement: add structure and clarity
      return `${currentAnswer}

Key points:
1. Immediate value delivery
2. Proven methodology
3. Clear success metrics
4. Risk reversal guarantee`;
  }
};

// Define all questions following our framework
const questions: QuestionData[] = [
  // ========================================
  // PHASE 1: CRAFT SKILLS DISCOVERY
  // ========================================
  {
    id: 'craft_skills',
    question: "Let's discover your monetizable skills",
    subtext: "Check all areas where you have above-average knowledge or experience",
    type: 'checkbox',
    options: [
      {
        value: 'professional_current',
        label: 'Current Job Skills',
        description: 'Specify your current role',
        icon: <Briefcase className="w-5 h-5 text-blue-600" />,
        allowCustom: true,
        customRequired: true,
        customPlaceholder: 'Your job title (e.g., Software Engineer, Marketing Manager...)'
      },
      {
        value: 'professional_past',
        label: 'Past Work Experience',
        description: 'What roles or industries?',
        icon: <Award className="w-5 h-5 text-green-600" />,
        allowCustom: true,
        customPlaceholder: 'Previous roles (e.g., Sales Manager at tech startup, Consultant...)'
      },
      {
        value: 'technical_tools',
        label: 'Software/Tools Expertise',
        description: 'Which specific tools?',
        icon: <Zap className="w-5 h-5 text-purple-600" />,
        allowCustom: true,
        customPlaceholder: 'Tools you master (e.g., Excel, Photoshop, Salesforce, Python...)'
      },
      {
        value: 'personal_transformation',
        label: 'Personal Transformations',
        description: 'What transformation did you achieve?',
        icon: <Trophy className="w-5 h-5 text-pink-600" />,
        allowCustom: true,
        customPlaceholder: 'Your transformation (e.g., Lost 50 lbs, Paid off $30K debt, Helped family lose weight...)'
      },
      {
        value: 'creative_hobbies',
        label: 'Creative Hobbies',
        description: 'What do you create?',
        icon: <Star className="w-5 h-5 text-yellow-600" />,
        allowCustom: true,
        customPlaceholder: 'Your creative skills (e.g., Watercolor painting, Guitar, Writing fiction...)'
      },
      {
        value: 'life_skills',
        label: 'Life Skills',
        description: 'What life skills do you excel at?',
        icon: <Heart className="w-5 h-5 text-orange-600" />,
        allowCustom: true,
        customPlaceholder: 'Skills you\'ve mastered (e.g., Meal planning for family of 5, Home organization, Budgeting...)'
      },
      {
        value: 'academic_knowledge',
        label: 'Academic/Test Prep',
        description: 'What subjects or tests?',
        icon: <Award className="w-5 h-5 text-red-600" />,
        allowCustom: true,
        customPlaceholder: 'Subjects/tests (e.g., SAT Math, Organic Chemistry, MCAT prep...)'
      },
      {
        value: 'niche_expertise',
        label: 'Unique/Niche Knowledge',
        description: 'Your specialized knowledge',
        icon: <Lightbulb className="w-5 h-5 text-indigo-600" />,
        allowCustom: true,
        customRequired: true,
        customPlaceholder: 'Your area of expertise (e.g., Vintage watch repair, Cryptocurrency trading, Permaculture...)'
      }
    ],
    validation: {
      required: true,
      minSelections: 1
    },
    helpText: "Pro tip: Add specific details to each skill - this helps generate better product ideas tailored to your exact expertise.",
    showAIHelper: true
  },

  {
    id: 'actual_requests',
    question: "What do people ACTUALLY ask you for help with?",
    subtext: "Think about real requests from the last 3 months",
    type: 'textarea',
    placeholder: "Example: Colleagues always want my Excel budget templates, my sister asks how I meal prep for the week, friends want help writing their dating profiles...",
    validation: {
      required: true,
      minLength: 30,
      maxLength: 2500
    },
    helpText: "Be specific! Include both work requests and personal favors. These are validated problems people already have. Minimum 30 characters in length.",
    examples: [
      "At work: Team asks for my project planning templates, boss wants me to train new hires on our CRM. Personally: Friends ask for workout routines, mom needs iPhone help",
      "Clients pay me for logo design, coworkers want my presentation templates. Friends ask how I grew my Instagram, sister wants budgeting advice",
      "I fix everyone's Excel formulas at work, neighbors ask about dog training, book club wants my speed reading tips"
    ],
    showAIHelper: true,
    showAutoGenerate: true 
  },

  {
    id: 'confidence_test',
    question: "The Confidence Test: What could you charge $50/hour for TODAY?",
    subtext: "Don't overthink - what would people realistically pay you for right now?",
    type: 'textarea',
    placeholder: "Example: I could charge $50/hour for Excel consulting, teaching people how to build automated spreadsheets and financial models...",
    validation: {
      required: true,
      minLength: 20,
      maxLength: 2500
    },
    helpText: "If you're unsure, think about what you do at work that others struggle with, or personal transformations you've achieved.",
    showAIHelper: true,
    showAutoGenerate: true
  },

  // ========================================
  // PHASE 2: NICHE DEFINITION
  // ========================================

  {
    id: 'target_who',
    question: "WHO do you want to help?",
    subtext: "Start with people you already know - your network, community, or colleagues who face problems you can solve",
    type: 'checkbox',
    options: [
      {
        value: 'business_owners',
        label: 'Business Owners',
        description: 'Specify the type/size',
        icon: <Briefcase className="w-5 h-5 text-purple-600" />,
        allowCustom: true,
        customPlaceholder: 'e.g., SaaS founders, local restaurant owners, e-commerce stores under $1M...'
      },
      {
        value: 'professionals',
        label: 'Corporate Professionals',
        description: 'Specify role/industry',
        icon: <Users className="w-5 h-5 text-blue-600" />,
        allowCustom: true,
        customPlaceholder: 'e.g., HR managers in tech, junior developers, sales directors...'
      },
      {
        value: 'freelancers',
        label: 'Freelancers/Consultants',
        description: 'Specify their field',
        icon: <Zap className="w-5 h-5 text-green-600" />,
        allowCustom: true,
        customPlaceholder: 'e.g., graphic designers, copywriters, marketing consultants...'
      },
      {
        value: 'creators',
        label: 'Content Creators',
        description: 'Specify platform/niche',
        icon: <Star className="w-5 h-5 text-pink-600" />,
        allowCustom: true,
        customPlaceholder: 'e.g., YouTube fitness channels, LinkedIn thought leaders, TikTok educators...'
      },
      {
        value: 'students',
        label: 'Students/Learners',
        description: 'Specify level/field',
        icon: <Award className="w-5 h-5 text-yellow-600" />,
        allowCustom: true,
        customPlaceholder: 'e.g., computer science majors, bootcamp students, professionals learning to code...'
      },
      {
        value: 'parents',
        label: 'Parents',
        description: 'Specify demographic',
        icon: <Heart className="w-5 h-5 text-red-600" />,
        allowCustom: true,
        customPlaceholder: 'e.g., working moms with toddlers, single dads, parents of teens with ADHD...'
      },
      {
        value: 'hobbyists',
        label: 'Hobbyists',
        description: 'Specify the hobby',
        icon: <Trophy className="w-5 h-5 text-orange-600" />,
        allowCustom: true,
        customPlaceholder: 'e.g., weekend woodworkers, urban gardeners, vintage car restorers...'
      },
      {
        value: 'other',
        label: 'Other specific group',
        description: 'Define your unique audience',
        icon: <Lightbulb className="w-5 h-5 text-indigo-600" />,
        allowCustom: true,
        customRequired: true,
        customPlaceholder: 'e.g., Retirees planning RV travel, Military spouses, Digital nomads in Asia...'
      }
    ],
    validation: {
      required: true,
      minSelections: 1,
    },
    helpText: " Think about: Who's in your phone contacts? Your LinkedIn network? Facebook groups you're in? Slack communities? Pick people you can actually reach out to TODAY for validation. Pre-selected options need your specific details!",
    showAIHelper: true,
    smartSuggestion: true
  },

  {
    id: 'target_outcome',
    question: "WHAT specific outcome will you help them achieve? (Their 'Y' Dream)",
    subtext: "Be concrete and measurable - not vague",
    type: 'textarea',
    placeholder: "Examples: Get their first 3 clients, lose 20 pounds in 90 days, pass the CPA exam, save 10 hours per week on admin work, land a $20K raise...",
    validation: {
      required: true,
      minLength: 15,
      maxLength: 2500
    },
    helpText: "Make it specific and achievable. 'Be happier' is vague. 'Wake up energized without coffee' is specific.",
    examples: [
      "Get their first paying client in 30 days",
      "Automate their monthly reports and save 20 hours",
      "Pass the MCAT with a score of 515+",
      "Launch their Etsy shop and make first $1,000",
      "Meal prep for the whole week in under 2 hours"
    ],
    showAIHelper: true,
    showAutoGenerate: true
  },

  {
    id: 'primary_target',
    question: "Who should you help FIRST?",
    subtext: "Focus on ONE ideal customer group before expanding. Pick the audience with the most pain + money + accessibility.",
    type: 'radio',
    dynamicOptionsFrom: 'target_who', // Special flag - options generated from target_who answers
    options: [], // Will be populated dynamically
    validation: {
      required: true
    },
    helpText: "💡 'Ideal Customer' criteria: (1) They have PAIN they'll pay to solve, (2) They have MONEY to spend, (3) You can REACH them easily. Pick the one that scores highest on all three.",
    showAIHelper: true,
    showAutoGenerate: true
  },

  {
    id: 'starting_product',
    question: "What's your FIRST product?",
    subtext: "Start with ONE offer. Master it, then expand. Which fits your situation best?",
    type: 'radio',
    options: [
      {
        value: 'low_ticket',
        label: 'Quick Win Product ($27-97)',
        description: 'Templates, checklists, guides, mini-courses. Best for: Testing demand, building audience, low risk entry.',
        icon: <Zap className="w-5 h-5 text-green-600" />
      },
      {
        value: 'mid_ticket',
        label: 'Core Transformation ($197-497)',
        description: 'Full course, workshop, group program. Best for: Proven demand, ready to deliver real results.',
        icon: <Package className="w-5 h-5 text-blue-600" />
      },
      {
        value: 'high_ticket',
        label: 'Premium Service ($997+)',
        description: 'Coaching, consulting, done-with-you. Best for: High expertise, want fast revenue with fewer customers.',
        icon: <Trophy className="w-5 h-5 text-purple-600" />
      },
      {
        value: 'membership',
        label: 'Community/Membership ($29-99/mo)',
        description: 'Recurring access, ongoing support. Best for: Building long-term relationships, predictable revenue.',
        icon: <Users className="w-5 h-5 text-pink-600" />
      }
    ],
    validation: {
      required: true
    },
    helpText: "💡 Pro tip: If you're new, start LOW-TICKET ($27-97) to validate demand fast with minimal friction. If you have proven results, MID-TICKET delivers real transformation. HIGH-TICKET works best when you have expertise and want fewer, higher-touch clients.",
    showAIHelper: true,
    showAutoGenerate: true
  },

  {
    id: 'mission_statement',
    question: "Your Mission Statement",
    subtext: "Let's put it all together - this is your north star for your first launch",
    type: 'textarea',
    placeholder: "Write your mission statement following the template above...",
    validation: {
      required: true,
      minLength: 20,
      maxLength: 500
    },
    helpText: "Keep it simple: WHO you help + WHAT outcome + HOW FAST + WITHOUT what obstacle. One or two sentences max.",
    showAIHelper: true,
    smartSuggestion: true,
    showAutoGenerate: true
  },

  // ========================================
  // PHASE 3: DEFINE THE DREAM (Previously Phase 4)
  // ========================================
  {
    id: 'dream_outcome',
    question: "The DREAM: What's the ultimate transformation they want?",
    subtext: "Think bigger than the immediate result - what does success really mean to them?",
    type: 'textarea',
    placeholder: "Think bigger than the immediate result - what does achieving this outcome REALLY mean for their life?",
    validation: {
      required: true,
      minLength: 30,
      maxLength: 2500
    },
    helpText: "Go deeper: If they achieve your outcome, what does that enable in their life?",
    examples: [
      "Not just organized - Finally have time for family instead of working weekends",
      "Not just fit - Walk into any room with confidence and energy",
      "Not just more sales - Build a business that runs without them"
    ],
    showAIHelper: true,
    showAutoGenerate: true
  }
];

export default function ProductIdeaGenerator() {
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [aiResponses, setAiResponses] = useState<AIResponses>({});
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showSmartSuggestion, setShowSmartSuggestion] = useState<string | null>(null);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [generatedIdeas, setGeneratedIdeas] = useState<GeneratedIdea[]>([]);
  const [editableProduct, setEditableProduct] = useState<{
    name: string;
    description: string;
    price: number;
    valueStack: string[];
    guarantees: string[];
  } | null>(null);
  const [currentTierType, setCurrentTierType] = useState<string>('low');
  const [showOtherTiers, setShowOtherTiers] = useState(false);
  const [showTierChangeConfirm, setShowTierChangeConfirm] = useState(false);
  const [pendingTierChange, setPendingTierChange] = useState<GeneratedIdea | null>(null);
  const [improvementSuggestion, setImprovementSuggestion] = useState<string>('');
  const [suggestionPreview, setSuggestionPreview] = useState<string>('');
  const [isGeneratingImprovement, setIsGeneratingImprovement] = useState(false);
  const [hasPreselected, setHasPreselected] = useState<{[key: string]: boolean}>({});
  const [isLoadingAnswers, setIsLoadingAnswers] = useState(true);
  const [hasResumedSession, setHasResumedSession] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState<string>('');

  // Load existing session or create new one on mount
  useEffect(() => {
    const loadOrCreateSession = async () => {
      const user = auth.currentUser;
      if (!user) {
        setIsLoadingAnswers(false);
        return;
      }

      try {
        const { sessionId, session, isNew } = await getOrCreateActiveSession(user.uid);
        
        setCurrentSessionId(sessionId);
        setSessionName(session.name);
        
        if (!isNew && session.answers && Object.keys(session.answers).length > 0) {
          console.log('Found saved Co-Pilot session, resuming...', sessionId);
          setAnswers(session.answers);
          
          // Cap the index to valid range (in case questions were removed)
          const maxIndex = questions.length - 1;
          const savedIndex = session.currentQuestionIndex || 0;
          setCurrentQuestionIndex(Math.min(savedIndex, maxIndex));
          setHasResumedSession(true);
          
          // If they already completed, show results and regenerate product
          if (session.status === 'completed' && session.completedAt) {
            setShowResults(true);
            // Regenerate product ideas from saved answers
            regenerateProductFromAnswers(session.answers);
          }
        } else {
          console.log('Starting new Co-Pilot session:', sessionId);
        }
      } catch (error) {
        console.error('Error loading/creating session:', error);
      } finally {
        setIsLoadingAnswers(false);
      }
    };

    loadOrCreateSession();
  }, []);

  // Helper to regenerate product from saved answers (for resuming completed sessions)
  const regenerateProductFromAnswers = (savedAnswers: Record<string, any>) => {
    const ideas: GeneratedIdea[] = [
      {
        id: '1',
        name: 'Quick Win Starter Pack',
        description: `The fastest path to ${savedAnswers.target_outcome}. Perfect for testing the waters.`,
        price: 27,
        priceType: 'low',
        targetAudience: savedAnswers.target_who,
        mainOutcome: savedAnswers.target_outcome,
        timeToResult: '24-48 hours',
        difficultyLevel: 'Beginner friendly',
        valueStack: ['Quick-start guide', 'Cheat sheet or checklist', 'Email support for 7 days'],
        guarantee: '7-day money back guarantee',
        whyItFits: 'Low-risk entry point to validate your idea.'
      },
      {
        id: '2',
        name: 'Complete Transformation System',
        description: `Comprehensive solution for serious action-takers who want ${savedAnswers.dream_outcome}.`,
        price: 197,
        priceType: 'mid',
        targetAudience: savedAnswers.target_who,
        mainOutcome: savedAnswers.dream_outcome || savedAnswers.target_outcome,
        timeToResult: '30 days',
        difficultyLevel: 'Some commitment required',
        valueStack: ['Core training program', 'Templates & tools', 'Private community access', 'Email support for 30 days'],
        guarantee: '30-day results guarantee',
        whyItFits: 'Your main offer that delivers full transformation.'
      },
      {
        id: '3',
        name: 'VIP Implementation Program',
        description: `Done-with-you intensive with personal guidance.`,
        price: 997,
        priceType: 'high',
        targetAudience: savedAnswers.target_who,
        mainOutcome: savedAnswers.dream_outcome || savedAnswers.target_outcome,
        timeToResult: '5-7 days',
        difficultyLevel: 'Done with you',
        valueStack: ['1-on-1 kickoff call', 'Daily check-ins for 7 days', 'Custom action plan', 'Everything from lower tiers', 'Lifetime support access'],
        guarantee: 'Results or full refund',
        whyItFits: 'Premium offer for high-touch support.'
      }
    ];
    
    const selectedType = savedAnswers.starting_product || 'low_ticket';
    const typeMap: { [key: string]: string } = { 'low_ticket': 'low', 'mid_ticket': 'mid', 'high_ticket': 'high' };
    const selectedPriceType = typeMap[selectedType] || 'low';
    const selectedIdea = ideas.find(idea => idea.priceType === selectedPriceType) || ideas[0];
    
    setEditableProduct({
      name: selectedIdea.name,
      description: selectedIdea.description,
      price: selectedIdea.price,
      valueStack: [...selectedIdea.valueStack],
      guarantees: [selectedIdea.guarantee]
    });
    setCurrentTierType(selectedPriceType);
    
    setGeneratedIdeas(ideas);
  };

  const generateContextualExamples = (questionId: string): string[] => {
    if (questionId === 'actual_requests' && answers.craft_skills) {
      const skills = answers.craft_skills;
      const examples: string[] = [];
      
      // Check what skills the user has
      skills.forEach((skill: any) => {
        const value = typeof skill === 'object' ? skill.value : skill;
        const custom = typeof skill === 'object' ? skill.custom : null;
        
        if (value === 'professional_current' && custom) {
          examples.push(`At work: Team asks for my ${custom} expertise, colleagues need help with complex problems, boss wants me to mentor junior staff`);
        }
        if (value === 'technical_tools') {
          examples.push(`Tech requests: People need automation help, want code reviews, ask for tool recommendations and setup guidance`);
        }
        if (value === 'niche_expertise' && custom) {
          examples.push(`Specialty requests: Friends ask about ${custom}, online communities seek my advice, people want tutorials on specific techniques`);
        }
      });
      
      // Add a personal example
      if (examples.length < 3) {
        examples.push(`Personal: Friends ask for career advice, family needs tech support, people want to learn what I do`);
      }
      
      return examples.slice(0, 3);
    }
    
    return questions[currentQuestionIndex].examples || [];
  };

  const currentQuestion = questions[currentQuestionIndex];
  console.log('ProductIdeaGenerator - Current Question:', currentQuestion.id);
  console.log('ProductIdeaGenerator - ShowAutoGenerate:', currentQuestion.showAutoGenerate);
  console.log('ProductIdeaGenerator - Full question object:', currentQuestion);
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  
  // Determine current phase based on question index
  // Phase 1: Skills Discovery (Q1-3: craft_skills, actual_requests, confidence_test)
  // Phase 2: Niche Definition (Q4-8: target_who, target_outcome, primary_target, starting_product, mission_statement)
  // Phase 3: Define the Dream (Q9: dream_outcome)
  const getCurrentPhase = () => {
    if (currentQuestionIndex < 3) return 1;
    if (currentQuestionIndex < 8) return 2;
    return 3;
  };
  
  const currentPhase = getCurrentPhase();

  // Generate dynamic options for primary_target based on target_who answers
  const getDynamicPrimaryTargetOptions = () => {
    const targetWhoAnswers = answers.target_who || [];
    if (!targetWhoAnswers.length) return [];
    
    return targetWhoAnswers.map((selection: any, index: number) => {
      const value = typeof selection === 'object' ? selection.value : selection;
      const custom = typeof selection === 'object' ? selection.custom : '';
      
      const labelMap: { [key: string]: string } = {
        'business_owners': 'Business Owners',
        'professionals': 'Corporate Professionals', 
        'freelancers': 'Freelancers/Consultants',
        'creators': 'Content Creators',
        'students': 'Students/Learners',
        'parents': 'Parents',
        'hobbyists': 'Hobbyists',
        'other': 'Other'
      };
      
      const baseLabel = labelMap[value] || value;
      const fullLabel = custom ? `${baseLabel}: ${custom}` : baseLabel;
      
      const scoringHints: { [key: string]: { pain: string; money: string; access: string } } = {
        'business_owners': { pain: '🔥 High pain', money: '💰 Have budget', access: '📧 Easy to reach' },
        'professionals': { pain: '🔥 Moderate pain', money: '💰 Have income', access: '📧 LinkedIn accessible' },
        'freelancers': { pain: '🔥 High pain', money: '💵 Variable budget', access: '📧 Online communities' },
        'creators': { pain: '🔥 High pain', money: '💵 Growing income', access: '📧 Social platforms' },
        'students': { pain: '😐 Moderate pain', money: '💵 Limited budget', access: '📧 Easy to reach' },
        'parents': { pain: '🔥 High pain', money: '💰 Have budget', access: '📧 FB groups' },
        'hobbyists': { pain: '😐 Passion-driven', money: '💵 Discretionary', access: '📧 Niche forums' },
        'other': { pain: '❓ Varies', money: '❓ Varies', access: '❓ Varies' }
      };
      
      const hints = scoringHints[value] || scoringHints['other'];
      
      return {
        value: `${value}${custom ? `_${index}` : ''}`,
        label: fullLabel,
        description: `${hints.pain} • ${hints.money} • ${hints.access}`,
        originalSelection: selection
      };
    });
  };

  // Get product recommendation based on answers - favor low_ticket for fast validation
  const getProductRecommendation = () => {
    const skills = answers.craft_skills || [];
    const hasProvenResults = skills.some((s: any) => {
      const val = typeof s === 'object' ? s.value : s;
      return val === 'personal_transformation' || val === 'paid_experience';
    });
    const hasProfessionalExp = skills.some((s: any) => {
      const val = typeof s === 'object' ? s.value : s;
      return val === 'professional_current' || val === 'professional_past';
    });
    
    // Default to low_ticket for fast validation
    // Only suggest higher tiers if they have strong proof
    if (hasProvenResults && hasProfessionalExp) {
      return 'mid_ticket'; // Strong proof = can deliver transformation
    } else {
      return 'low_ticket'; // Start with fast validation
    }
  };


  useEffect(() => {
    console.log('useEffect running, currentQuestionIndex:', currentQuestionIndex);
    console.log('Current question:', questions[currentQuestionIndex]?.id);
    
    setShowSmartSuggestion(null);
    
    const currentQ = questions[currentQuestionIndex];
    
    // Special handling for target_who - pre-select based on analysis
    if (currentQ.id === 'target_who' && !hasPreselected['target_who']) {
      const currentAnswer = answers.target_who;
      const hasAnswer = currentAnswer && 
                       (!Array.isArray(currentAnswer) || currentAnswer.length > 0);
      
      console.log('Target WHO question reached. Has answer?', hasAnswer);
      console.log('Current answer:', currentAnswer);
      
      if (!hasAnswer) {
        console.log('Analyzing for target_who pre-selection...');
        const whoRequests = answers.actual_requests || '';
        const whoSkills = answers.craft_skills || [];
        const confidenceTest = answers.confidence_test || '';
        
        console.log('Requests to analyze:', whoRequests);
        
        const getJobContext = () => {
          const professionalSkill = whoSkills.find((s: any) => 
            (typeof s === 'object' && s.value === 'professional_current') ||
            s === 'professional_current'
          );
          if (professionalSkill && typeof professionalSkill === 'object' && professionalSkill.custom) {
            return professionalSkill.custom;
          }
          return null;
        };
        
        const getTechContext = () => {
          const techSkill = whoSkills.find((s: any) => 
            (typeof s === 'object' && s.value === 'technical_tools') ||
            s === 'technical_tools'
          );
          if (techSkill && typeof techSkill === 'object' && techSkill.custom) {
            return techSkill.custom;
          }
          return null;
        };
        
        const getFitnessContext = () => {
          const fitnessSkill = whoSkills.find((s: any) => 
            (typeof s === 'object' && s.value === 'personal_transformation') ||
            s === 'personal_transformation'
          );
          if (fitnessSkill && typeof fitnessSkill === 'object' && fitnessSkill.custom) {
            return fitnessSkill.custom;
          }
          return null;
        };
        
        const jobContext = getJobContext();
        const techContext = getTechContext();
        const fitnessContext = getFitnessContext();
        
        if (whoRequests) {
          const preSelected: any[] = [];
          const requestsLower = whoRequests.toLowerCase();
          
          if (requestsLower.includes('colleague') || requestsLower.includes('boss') || 
              requestsLower.includes('work') || requestsLower.includes('team') ||
              requestsLower.includes('coworker') || requestsLower.includes('employee') ||
              requestsLower.includes('manager') || requestsLower.includes('office') ||
              requestsLower.includes('teammate')) {
            
            let customText = '';
            if (jobContext && techContext) {
              customText = `Other ${jobContext}s or tech professionals who work with ${techContext} and need help with similar challenges`;
            } else if (jobContext) {
              customText = `Other ${jobContext}s or professionals in similar roles who face the same technical challenges`;
            } else if (techContext) {
              customText = `Developers and tech professionals who work with ${techContext}`;
            } else {
              customText = 'Colleagues and professionals who need help with similar technical challenges';
            }
            
            preSelected.push({ 
              value: 'professionals', 
              custom: customText
            });
            console.log('[OK] Detected professionals');
          }
          
          if (requestsLower.includes('client') || requestsLower.includes('founder') || 
              requestsLower.includes('business') || requestsLower.includes('startup') ||
              requestsLower.includes('entrepreneur') || requestsLower.includes('owner') ||
              requestsLower.includes('company') || requestsLower.includes('ceo') ||
              requestsLower.includes('dashboard')) {
            
            let customText = '';
            if (techContext) {
              customText = `Small business owners who need custom dashboards or apps built with ${techContext}`;
            } else {
              customText = 'Small business owners who need technical solutions for their data/reporting needs';
            }
            
            preSelected.push({ 
              value: 'business_owners', 
              custom: customText
            });
            console.log('[OK] Detected business owners');
          }
          
          if (requestsLower.includes('student') || requestsLower.includes('learn') ||
              requestsLower.includes('study') || requestsLower.includes('class') ||
              requestsLower.includes('course') || requestsLower.includes('school')) {
            
            let customText = '';
            if (techContext) {
              customText = `Students or bootcamp grads learning ${techContext}`;
            } else {
              customText = 'Students or people learning new technical skills';
            }
            
            preSelected.push({
              value: 'students',
              custom: customText
            });
            console.log('[OK] Detected students');
          }
          
          if (requestsLower.includes('workout') || requestsLower.includes('gym') ||
              requestsLower.includes('weight') || requestsLower.includes('muscle') ||
              requestsLower.includes('fitness') || requestsLower.includes('diet') ||
              requestsLower.includes('meal') || requestsLower.includes('lifting')) {
            
            let customText = '';
            if (fitnessContext) {
              customText = `People who want to achieve ${fitnessContext.toLowerCase()} - friends, coworkers, or online community members`;
            } else {
              customText = 'People starting their fitness journey who want real, practical advice from someone who has done it';
            }
            
            preSelected.push({
              value: 'hobbyists',
              custom: customText
            });
            console.log('[OK] Detected fitness hobbyists');
          }
          
          if (requestsLower.includes('friend') || requestsLower.includes('family') ||
              requestsLower.includes('sister') || requestsLower.includes('brother') ||
              requestsLower.includes('neighbor') || requestsLower.includes('people')) {
            if (requestsLower.includes('parent') || requestsLower.includes('mom') || 
                requestsLower.includes('dad') || requestsLower.includes('kid') ||
                requestsLower.includes('child')) {
              preSelected.push({ 
                value: 'parents', 
                custom: 'Parents in my social circle' 
              });
              console.log('[OK] Detected parents');
            } else if (!preSelected.find(p => p.value === 'hobbyists') && 
                       !preSelected.find(p => p.value === 'professionals')) {
              let customText = 'Friends and family members interested in my skills';
              if (fitnessContext) {
                customText = `Friends and family who want help with ${fitnessContext.toLowerCase()}`;
              }
              preSelected.push({
                value: 'hobbyists',
                custom: customText
              });
              console.log('[OK] Detected hobbyists/general');
            }
          }
          
          console.log('Total pre-selected:', preSelected.length);
          
          if (preSelected.length > 0) {
            console.log('Setting pre-selected answers:', preSelected);
            setHasPreselected(prev => ({ ...prev, target_who: true }));
            setAnswers(prev => ({
              ...prev,
              target_who: preSelected.slice(0, 3)
            }));
            
            setShowSmartSuggestion(
              `[OK] We've pre-selected ${preSelected.length} group${preSelected.length > 1 ? 's' : ''} based on who's already asking you for help. Please review and refine the details to be even more specific!`
            );
          } else {
            console.log('⚠️ No matches found for pre-selection');
            setHasPreselected(prev => ({ ...prev, target_who: true }));
            setShowSmartSuggestion(
              `💡 Based on your skills and requests, think about who in your network needs this help most. Are they professionals, business owners, parents, or another specific group?`
            );
          }
        } else {
          console.log('⚠️ No actual_requests found to analyze');
          setHasPreselected(prev => ({ ...prev, target_who: true }));
        }
      } else {
        console.log('Already has answer, skipping pre-selection');
        setHasPreselected(prev => ({ ...prev, target_who: true }));
      }
    }
    // Special handling for primary_target - show AI recommendation
    else if (currentQ.id === 'primary_target' && !hasPreselected['primary_target']) {
      const targetWhoAnswers = answers.target_who || [];
      
      if (targetWhoAnswers.length > 0) {
        let recommendation = '';
        let bestTarget = '';
        
        const scoringMap: { [key: string]: { pain: number; money: number; access: number } } = {
          'business_owners': { pain: 9, money: 9, access: 8 },
          'professionals': { pain: 7, money: 8, access: 8 },
          'freelancers': { pain: 8, money: 6, access: 7 },
          'creators': { pain: 8, money: 6, access: 9 },
          'students': { pain: 6, money: 4, access: 9 },
          'parents': { pain: 8, money: 7, access: 7 },
          'hobbyists': { pain: 5, money: 6, access: 6 },
          'other': { pain: 5, money: 5, access: 5 }
        };
        
        let highestScore = 0;
        targetWhoAnswers.forEach((selection: any) => {
          const value = typeof selection === 'object' ? selection.value : selection;
          const scores = scoringMap[value] || scoringMap['other'];
          const totalScore = scores.pain + scores.money + scores.access;
          if (totalScore > highestScore) {
            highestScore = totalScore;
            bestTarget = value;
          }
        });
        
        if (targetWhoAnswers.length === 1) {
          recommendation = `[OK] You have ONE target audience - perfect! Focus all your energy here for your first launch.`;
        } else {
          const targetLabels: { [key: string]: string } = {
            'business_owners': 'Business Owners',
            'professionals': 'Professionals',
            'freelancers': 'Freelancers',
            'creators': 'Content Creators',
            'students': 'Students',
            'parents': 'Parents',
            'hobbyists': 'Hobbyists'
          };
          recommendation = `🎯 AI Recommendation: Start with "${targetLabels[bestTarget] || bestTarget}" - they score highest on key success criteria (Pain + Money + Accessibility). But follow your gut if another audience excites you more!`;
        }
        
        setShowSmartSuggestion(recommendation);
        setHasPreselected(prev => ({ ...prev, primary_target: true }));
      } else {
        setShowSmartSuggestion('⚠️ Go back and select at least one target audience in the previous step.');
        setHasPreselected(prev => ({ ...prev, primary_target: true }));
      }
    }
    // Special handling for starting_product - show AI recommendation
    else if (currentQ.id === 'starting_product' && !hasPreselected['starting_product']) {
      const recommendation = getProductRecommendation();
      const messages: { [key: string]: string } = {
        'low_ticket': '🎯 AI Recommendation: Perfect choice for fast validation! LOW-TICKET ($27-97) lets you test demand quickly with minimal friction.',
        'mid_ticket': '🎯 AI Recommendation: Great for proven results! MID-TICKET ($197-497) delivers real transformation and builds your reputation.',
        'high_ticket': '🎯 AI Recommendation: Bold move! HIGH-TICKET ($997+) works best with established expertise - fewer clients, higher touch.'
      };
      
      setShowSmartSuggestion(messages[recommendation] || messages['low_ticket']);
      setHasPreselected(prev => ({ ...prev, starting_product: true }));
    }
    // Regular smart suggestion for other questions
    else if (currentQ.smartSuggestion && !answers[currentQ.id]) {
      const suggestion = generateSmartSuggestion(currentQ.id, answers);
      if (suggestion) {
        setShowSmartSuggestion(suggestion);
        setAnswers(prev => ({
          ...prev,
          [currentQ.id]: suggestion
        }));
      }
    }
  }, [currentQuestionIndex, hasPreselected]);

  // Handle answer changes
  const handleAnswerChange = (answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }));
    
    if (showSmartSuggestion) {
      setTimeout(() => setShowSmartSuggestion(null), 2000);
    }

    const isEmpty = !answer || (Array.isArray(answer) && answer.length === 0) || answer === '';
    
    if (isEmpty) {
      setAiResponses(prev => {
        const newResponses = { ...prev };
        delete newResponses[currentQuestion.id];
        return newResponses;
      });
      setIsProcessingAI(false);
    } else if (currentQuestion.showAIHelper) {
      generateAIResponse(currentQuestion.id, answer);
    }
  };

  const [isGeneratingOptimal, setIsGeneratingOptimal] = useState(false);

  const handleAutoGenerate = async () => {
    setIsGeneratingOptimal(true);
    
    try {
      const user = auth.currentUser;
      
      if (user) {
        console.log('Generating optimal answer with Claude...');
        const generateOptimalFunction = httpsCallable(functions, 'generateOptimalAnswer');
        
        const payload = {
          userId: user.uid,
          questionId: currentQuestion.id,
          questionText: currentQuestion.question,
          questionSubtext: currentQuestion.subtext,
          previousAnswers: Object.keys(answers).reduce((acc, key) => {
            acc[key] = answers[key];
            return acc;
          }, {} as any)
        };
        
        const result = await generateOptimalFunction(payload);
        const data = result.data as any;
        
        if (data.success && data.generatedAnswer) {
          console.log('✓ Got optimal answer from Claude!');
          setSuggestionPreview(data.generatedAnswer);
          setIsGeneratingOptimal(false);
          return;
        }
      }
      
      console.log('Using local generation...');
      const suggestion = generateSmartSuggestion(currentQuestion.id, answers);
      if (suggestion) {
        setSuggestionPreview(suggestion);
      }
    } catch (error) {
      console.error('Error generating optimal answer:', error);
      const suggestion = generateSmartSuggestion(currentQuestion.id, answers);
      if (suggestion) {
        setSuggestionPreview(suggestion);
      }
    } finally {
      setIsGeneratingOptimal(false);
    }
  };

  const handleAcceptSuggestion = () => {
    if (suggestionPreview) {
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: suggestionPreview
      }));
      setSuggestionPreview('');
      
      if (currentQuestion.showAIHelper) {
        generateAIResponse(currentQuestion.id, suggestionPreview);
      }
    }
  };

  const handleRejectSuggestion = () => {
    setSuggestionPreview('');
  };

  const handleImproveAnswer = async (currentAnswer: string) => {
    console.log('🚀 Starting improvement process...');
    setIsGeneratingImprovement(true);
    
    try {
      const user = auth.currentUser;
      
      if (!user) {
        console.log('No user, using local fallback');
        const improved = generateImprovedAnswer(currentQuestion.id, currentAnswer);
        setImprovementSuggestion(improved);
        setIsGeneratingImprovement(false);
        return;
      }

      console.log('Calling Firebase Function...');
      const improveAnswerFunction = httpsCallable(functions, 'improveAnswer');
      
      const payload = {
        userId: user.uid,
        questionId: currentQuestion.id,
        originalAnswer: currentAnswer,
        questionText: currentQuestion.question,
        previousAnswers: Object.keys(answers).slice(0, 5).reduce((acc, key) => {
          acc[key] = answers[key];
          return acc;
        }, {} as any)
      };
      
      console.log('Sending payload:', payload);
      
      const result = await improveAnswerFunction(payload);
      console.log('Function response:', result);
      
      const data = result.data as any;
      
      if (data.success && data.improvedAnswer) {
        console.log('Got improved answer from Claude!');
        setImprovementSuggestion(data.improvedAnswer);
      } else {
        console.log('Unexpected response format:', data);
        throw new Error('Unexpected response format');
      }
      
    } catch (error: any) {
      console.error('Full error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      const improved = generateImprovedAnswer(currentQuestion.id, currentAnswer);
      setImprovementSuggestion(improved);
    } finally {
      setIsGeneratingImprovement(false);
    }
  };

  const handleAcceptImprovement = () => {
    if (improvementSuggestion) {
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: improvementSuggestion
      }));
      setImprovementSuggestion('');
      
      if (currentQuestion.showAIHelper) {
        generateAIResponse(currentQuestion.id, improvementSuggestion);
      }
    }
  };

  const handleRejectImprovement = () => {
    setImprovementSuggestion('');
  };

  const generateAIResponse = async (questionId: string, answer: any) => {
    setIsProcessingAI(true);
    
    setTimeout(() => {
      let response = '';
      
      switch(questionId) {
        case 'craft_skills':
          const skillCount = answer.length;
          const hasProfessional = answer.some((s: any) => {
            const value = typeof s === 'object' ? s.value : s;
            return value.includes('professional');
          });
          const hasPersonal = answer.some((s: any) => {
            const value = typeof s === 'object' ? s.value : s;
            return value.includes('personal') || value.includes('transformation');
          });
          
          if (hasProfessional && hasPersonal) {
            response = `Excellent mix! You have ${skillCount} skill areas. Professional skills (like your job expertise) typically monetize faster with higher prices. Personal transformations build more passionate communities. Let's dig into what people actually need from you...`;
          } else if (hasProfessional) {
            response = `Strong foundation with ${skillCount} professional skills! These typically command higher prices ($50-500) because businesses pay more than consumers. Let's explore the specific problems you solve...`;
          } else {
            response = `Great! ${skillCount} skill areas based on personal experience. These build loyal communities who connect with your journey. Let's identify what people ask you about...`;
          }
          break;
          
        case 'actual_requests':
          response = `Perfect validation! "${answer.substring(0, 60)}..." shows REAL demand. People are already coming to you = proven pain point. No guessing needed - you have market validation. Let's define exactly WHO needs this most...`;
          break;
          
        case 'confidence_test':
          response = `Good clarity! If you can charge $50/hour for this, you have monetizable expertise. Most people undervalue their skills by 10x. You could easily create products around: "${answer.substring(0, 50)}..."`;
          break;
          
        case 'target_outcome':
          response = `Strong outcome! "${answer}" is specific and measurable. This clarity makes marketing 10x easier. People buy outcomes, not information. Let's validate if your target audience will pay for this transformation...`;
          break;
          
        case 'primary_target':
          const targetWhoAnswers = answers.target_who || [];
          const selectedTarget = targetWhoAnswers.find((t: any) => {
            const val = typeof t === 'object' ? t.value : t;
            return answer.startsWith(val);
          });
          const targetCustom = selectedTarget && typeof selectedTarget === 'object' ? selectedTarget.custom : '';
          
          response = `Great choice! Focusing on ONE audience lets you become the go-to expert. ${targetCustom ? `"${targetCustom}"` : 'This group'} gets ALL your attention for your first launch. Master this market, then expand.`;
          break;
          
        case 'starting_product':
          const productMessages: { [key: string]: string } = {
            'low_ticket': "Smart start! Low-ticket products ($27-97) let you TEST demand with minimal risk. Goal: Get 10 sales to validate, then build your upsell ladder. Speed beats perfection here.",
            'mid_ticket': "Solid choice! Mid-ticket ($197-497) delivers real transformation. You need fewer customers but must deliver results. Focus on the OUTCOME, not hours of content.",
            'high_ticket': "Bold move! High-ticket ($997+) means you need just 3-5 customers to validate. Pro tip: Start premium, then create downsells. Fewer customers = more attention = better results = better testimonials.",
            'membership': "Recurring revenue! Memberships build predictable income but require ongoing value. Make sure you can commit to regular content/community engagement."
          };
          response = productMessages[answer] || "Good selection! Now let's craft your mission statement.";
          break;
          
        case 'mission_statement':
          response = `Excellent mission! "${answer}" is clear and focused. This becomes your north star - every product, every piece of content serves this mission. Stick to this for your first launch and watch the compound effect...`;
          break;
          
        case 'dream_outcome':
          response = `Powerful! "${answer.substring(0, 60)}..." taps into deep emotional drivers. This is what they'll actually pay for - not the features, but this transformation. Price based on this value, not your time.`;
          break;
      }
      
      if (response) {
        setAiResponses(prev => ({
          ...prev,
          [questionId]: response
        }));
      }
      setIsProcessingAI(false);
    }, 800);
  };

  const handleNext = async () => {
    setShowSmartSuggestion(null);
    setImprovementSuggestion('');
    setSuggestionPreview('');
    
    // Auto-save answers to Firebase
    const user = auth.currentUser;
    if (user && currentSessionId) {
      try {
        await saveProductCoPilotAnswers(user.uid, currentSessionId, answers, currentQuestionIndex + 1);
      } catch (error) {
        console.error('Failed to save answers:', error);
        // Continue anyway - don't block user progress
      }
    }
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setShowResults(true);
      generateProductIdeas();
    }
  };

  const handleBack = () => {
    setShowSmartSuggestion(null);
    setImprovementSuggestion('');
    setSuggestionPreview('');
    
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleProgressClick = (step: number) => {
    if (step <= currentQuestionIndex + 1) {
      setShowSmartSuggestion(null);
      setImprovementSuggestion('');
      setSuggestionPreview('');
      setCurrentQuestionIndex(step - 1);
    }
  };

  const generateProductIdeas = async () => {
    setIsGeneratingIdeas(true);
    
    // Save complete session to Firebase (no niche score since validation questions removed)
    if (auth.currentUser && currentSessionId) {
      try {
        await markProductCoPilotComplete(auth.currentUser.uid, currentSessionId, answers, 0);
        console.log('Co-Pilot session saved and marked complete');
      } catch (error) {
        console.error('Error saving quiz progress:', error);
      }
    }
    
    setTimeout(() => {
      const ideas: GeneratedIdea[] = [
        {
          id: '1',
          name: 'Quick Win Starter Pack',
          description: `The fastest path to ${answers.target_outcome}. Perfect for testing the waters.`,
          price: 27,
          priceType: 'low',
          targetAudience: answers.target_who,
          mainOutcome: answers.target_outcome,
          timeToResult: '24-48 hours',
          difficultyLevel: 'Beginner friendly',
          valueStack: [
            'Quick-start guide',
            'Cheat sheet or checklist',
            'Email support for 7 days'
          ],
          guarantee: '7-day money back guarantee',
          whyItFits: 'Low-risk entry point to validate your idea and get first customers quickly.'
        },
        {
          id: '2',
          name: 'Complete Transformation System',
          description: `Comprehensive solution for serious action-takers who want ${answers.dream_outcome}.`,
          price: 197,
          priceType: 'mid',
          targetAudience: answers.target_who,
          mainOutcome: answers.dream_outcome || answers.target_outcome,
          timeToResult: '30 days',
          difficultyLevel: 'Some commitment required',
          valueStack: [
            'Core training program',
            'Templates & tools',
            'Private community access',
            'Email support for 30 days'
          ],
          guarantee: '30-day results guarantee',
          whyItFits: 'Your main offer that delivers full transformation with strong support.'
        },
        {
          id: '3',
          name: 'VIP Implementation Program',
          description: `Done-with-you intensive for those who want results NOW with personal guidance.`,
          price: 997,
          priceType: 'high',
          targetAudience: answers.target_who,
          mainOutcome: `${answers.dream_outcome || answers.target_outcome} with personal support`,
          timeToResult: '5-7 days',
          difficultyLevel: 'Done with you',
          valueStack: [
            '1-on-1 kickoff call',
            'Daily check-ins for 7 days',
            'Custom action plan',
            'Everything from lower tiers',
            'Lifetime support access'
          ],
          guarantee: 'Results or full refund',
          whyItFits: 'Premium offer for high-touch support. Start with 3 beta clients.'
        }
      ];
      
      // Find the idea matching user's selected product type
      const selectedType = answers.starting_product || 'low_ticket';
      const typeMap: { [key: string]: string } = {
        'low_ticket': 'low',
        'mid_ticket': 'mid',
        'high_ticket': 'high'
      };
      const selectedPriceType = typeMap[selectedType] || 'low';
      const selectedIdea = ideas.find(idea => idea.priceType === selectedPriceType) || ideas[0];
      
      // Set editable product from selected idea
      setEditableProduct({
        name: selectedIdea.name,
        description: selectedIdea.description,
        price: selectedIdea.price,
        valueStack: [...selectedIdea.valueStack],
        guarantees: [selectedIdea.guarantee]
      });
      setCurrentTierType(selectedPriceType);
      
      setGeneratedIdeas(ideas);
      setIsGeneratingIdeas(false);
    }, 2000);
  };

  const createProduct = async () => {
    if (!auth.currentUser || !editableProduct) return;
    
    try {
      const productRef = doc(collection(db, 'products'));
      await setDoc(productRef, {
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        isDraft: true,
        salesPage: {
          coreInfo: {
            name: editableProduct.name,
            tagline: editableProduct.description,
            price: editableProduct.price,
            priceType: 'one-time',
            currency: 'USD'
          },
          valueProp: {
            productType: 'custom',
            description: editableProduct.description,
            benefits: editableProduct.valueStack,
            targetAudience: answers.primary_target || '',
            deliverables: editableProduct.valueStack,
            guarantees: editableProduct.guarantees
          }
        },
        metadata: {
          fromQuiz: true,
          mission: answers.mission_statement,
          sessionId: currentSessionId
        }
      });
      
      navigate(`/products/${productRef.id}/landing/edit`);
    } catch (error) {
      console.error('Error creating product:', error);
    }
  };

  // Switch to a different product tier
  // Request tier change (shows confirmation)
  const requestTierChange = (idea: GeneratedIdea) => {
    setPendingTierChange(idea);
    setShowTierChangeConfirm(true);
  };

  // Actually switch to tier after confirmation
  const confirmTierChange = () => {
    if (!pendingTierChange) return;
    
    setEditableProduct({
      name: pendingTierChange.name,
      description: pendingTierChange.description,
      price: pendingTierChange.price,
      valueStack: [...pendingTierChange.valueStack],
      guarantees: [pendingTierChange.guarantee]
    });
    setCurrentTierType(pendingTierChange.priceType);
    setShowOtherTiers(false);
    setShowTierChangeConfirm(false);
    setPendingTierChange(null);
  };

  // Cancel tier change
  const cancelTierChange = () => {
    setShowTierChangeConfirm(false);
    setPendingTierChange(null);
  };

  // Show loading while checking for saved session
  if (isLoadingAnswers) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0B0B0D] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 mb-4 animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <p className="text-neutral-600 dark:text-neutral-400">Loading your progress...</p>
        </div>
      </div>
    );
  }

  if (showResults) {
    const otherTiers = generatedIdeas.filter(idea => idea.priceType !== currentTierType);
    
    const tierLabels: { [key: string]: string } = {
      'low': 'Quick Win ($27-97)',
      'mid': 'Core Offer ($197-497)',
      'high': 'Premium ($997+)'
    };

    return (
      <div className="min-h-screen bg-white dark:bg-[#0B0B0D] py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-8">
            {sessionName && (
              <p className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-2">
                {sessionName}
              </p>
            )}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 mb-4">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-3">
              {isGeneratingIdeas ? "Creating Your Product..." : "Customize Your Product"}
            </h1>
            
            {!isGeneratingIdeas && (
              <p className="text-neutral-600 dark:text-neutral-400">
                We've created a starting point based on your answers. Edit anything below to make it yours.
              </p>
            )}
          </div>

          {isGeneratingIdeas ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mb-4" />
              <p className="text-neutral-600 dark:text-neutral-400">Creating your product idea...</p>
            </div>
          ) : editableProduct ? (
            <>
              {/* Mission Statement */}
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 mb-6 border border-purple-200 dark:border-purple-800">
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">Your Mission</p>
                <p className="text-purple-900 dark:text-purple-100">
                  {answers.mission_statement}
                </p>
              </div>

              {/* Editable Product Card */}
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border-2 border-purple-500 dark:border-purple-400 p-6 mb-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                    currentTierType === 'low' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                    currentTierType === 'mid' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                  }`}>
                    {tierLabels[currentTierType]}
                  </span>
                  <Edit2 className="w-4 h-4 text-neutral-400" />
                </div>

                {/* Product Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Product Name
                  </label>
                  <textarea
                    value={editableProduct.name}
                    onChange={(e) => {
                      setEditableProduct({...editableProduct, name: e.target.value});
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
                    className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none overflow-hidden"
                  />
                </div>

                {/* Description */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editableProduct.description}
                    onChange={(e) => {
                      setEditableProduct({...editableProduct, description: e.target.value});
                      // Auto-resize
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    ref={(el) => {
                      // Auto-resize on mount
                      if (el) {
                        el.style.height = 'auto';
                        el.style.height = el.scrollHeight + 'px';
                      }
                    }}
                    rows={1}
                    className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none overflow-hidden"
                  />
                </div>

                {/* Price */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Price (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 text-lg">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={editableProduct.price === 0 ? '' : editableProduct.price}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setEditableProduct({...editableProduct, price: value === '' ? 0 : parseInt(value, 10)});
                      }}
                      placeholder="0"
                      className="w-full pl-8 pr-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* What's Included */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    What's Included
                  </label>
                  <div className="space-y-2">
                    {editableProduct.valueStack.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-2.5" />
                        <textarea
                          value={item}
                          onChange={(e) => {
                            const newStack = [...editableProduct.valueStack];
                            newStack[idx] = e.target.value;
                            setEditableProduct({...editableProduct, valueStack: newStack});
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
                          className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none overflow-hidden"
                        />
                        <button
                          onClick={() => {
                            const newStack = editableProduct.valueStack.filter((_, i) => i !== idx);
                            setEditableProduct({...editableProduct, valueStack: newStack});
                          }}
                          className="p-1 text-neutral-400 hover:text-red-500 transition-colors mt-1.5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setEditableProduct({
                        ...editableProduct, 
                        valueStack: [...editableProduct.valueStack, 'New item']
                      })}
                      className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 mt-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add item
                    </button>
                  </div>
                </div>

                {/* Guarantees */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Guarantees
                  </label>
                  <div className="space-y-2">
                    {editableProduct.guarantees.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Shield className="w-4 h-4 text-green-500 flex-shrink-0 mt-2.5" />
                        <textarea
                          value={item}
                          onChange={(e) => {
                            const newGuarantees = [...editableProduct.guarantees];
                            newGuarantees[idx] = e.target.value;
                            setEditableProduct({...editableProduct, guarantees: newGuarantees});
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
                          className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none overflow-hidden"
                        />
                        {editableProduct.guarantees.length > 1 && (
                          <button
                            onClick={() => {
                              const newGuarantees = editableProduct.guarantees.filter((_, i) => i !== idx);
                              setEditableProduct({...editableProduct, guarantees: newGuarantees});
                            }}
                            className="p-1 text-neutral-400 hover:text-red-500 transition-colors mt-1.5"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => setEditableProduct({
                        ...editableProduct, 
                        guarantees: [...editableProduct.guarantees, 'New guarantee']
                      })}
                      className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 mt-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add guarantee
                    </button>
                  </div>
                </div>
              </div>

              {/* Other Tiers Accordion */}
              {otherTiers.length > 0 && (
                <div className="mb-6">
                  <button
                    onClick={() => setShowOtherTiers(!showOtherTiers)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                  >
                    <span className="text-sm font-medium">Want a different product tier?</span>
                    {showOtherTiers ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                  
                  {showOtherTiers && (
                    <div className="mt-3 space-y-3">
                      {otherTiers.map((idea) => (
                        <div
                          key={idea.id}
                          className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                idea.priceType === 'low' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                idea.priceType === 'mid' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                              }`}>
                                {tierLabels[idea.priceType]}
                              </span>
                              <h4 className="font-semibold text-neutral-900 dark:text-white mt-2">{idea.name}</h4>
                              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{idea.description}</p>
                              <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-2">${idea.price}</p>
                            </div>
                            <button
                              onClick={() => requestTierChange(idea)}
                              className="px-3 py-1.5 text-sm bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                            >
                              Use This
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={createProduct}
                  className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold text-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
                >
                  Create Sales Page
                </button>
                
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      const user = auth.currentUser;
                      if (user && currentSessionId) {
                        try {
                          await resetProductCoPilotSession(user.uid, currentSessionId);
                          const newSessionId = await startNewCoPilotSession(user.uid);
                          setCurrentSessionId(newSessionId);
                          setSessionName(`Business Idea #${newSessionId.slice(-4)}`);
                        } catch (error) {
                          console.error('Failed to reset session:', error);
                        }
                      }
                      setShowResults(false);
                      setCurrentQuestionIndex(0);
                      setAnswers({});
                      setAiResponses({});
                      setGeneratedIdeas([]);
                      setEditableProduct(null);
                      setHasResumedSession(false);
                    }}
                    className="flex-1 px-6 py-3 bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg font-medium hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-all"
                  >
                    Start Over
                  </button>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="flex-1 px-6 py-3 bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 rounded-lg font-medium hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all"
                  >
                    Dashboard
                  </button>
                </div>
              </div>
            </>
          ) : null}

          {/* Tier Change Confirmation Modal */}
          {showTierChangeConfirm && pendingTierChange && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                    Switch Product Tier?
                  </h3>
                </div>
                
                <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                  Switching to <span className="font-medium text-neutral-900 dark:text-white">{pendingTierChange.name}</span> will replace all your current edits including:
                </p>
                
                <ul className="text-sm text-neutral-600 dark:text-neutral-400 mb-6 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                    Product name & description
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                    Price
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                    What's included items
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                    Guarantees
                  </li>
                </ul>
                
                <div className="flex gap-3">
                  <button
                    onClick={cancelTierChange}
                    className="flex-1 px-4 py-2.5 bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg font-medium hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
                  >
                    Keep Current
                  </button>
                  <button
                    onClick={confirmTierChange}
                    className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                  >
                    Switch Tier
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0B0D] py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-8">
          <div className="hidden lg:block flex-shrink-0" style={{marginTop:'19rem'}}>
            <ProgressSummary
              answers={answers}
              currentPhase={currentPhase}
              questions={questions}
            />
          </div>

          <div className="flex-1 max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <button
                onClick={() => navigate('/onboarding')}
                className="inline-flex items-center gap-2 text-sm mr-px text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white mb-4 transition-colors"
                style={{ marginRight:'1rem' }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Onboarding
              </button>
              
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 mb-4">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-3">
                Product Idea Co-Pilot
              </h1>
              <p className="text-lg text-neutral-600 dark:text-neutral-400">
                Discover Your Perfect Product in Minutes
              </p>
            </div>

            {/* Resume Session Banner */}
            {hasResumedSession && currentQuestionIndex > 0 && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">Welcome back!</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Continuing "{sessionName || 'your session'}" from where you left off.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setHasResumedSession(false)}
                  className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            <div className="mb-8">
              <ProgressBar
                currentStep={currentQuestionIndex + 1}
                totalSteps={questions.length}
                allowNavigation={true}
                onStepClick={handleProgressClick}
              />
            </div>

            <div className="text-center mb-6">
              <span className="inline-block px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium">
                {currentPhase === 1 && 'Phase 1: Discover Your Skills'}
                {currentPhase === 2 && 'Phase 2: Define Your Niche'}
                {currentPhase === 3 && 'Phase 3: Define Your Dream'}
              </span>
            </div>

            {showSmartSuggestion && (
              <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                      {currentQuestion.id === 'target_who' 
                        ? "Pre-selected based on your previous answers - Please validate!"
                        : currentQuestion.id === 'confidence_test'
                        ? "We've calculated what you could charge based on your skills"
                        : "We've pre-filled this based on your previous answers!"}
                    </p>
                    <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                      {currentQuestion.id === 'target_who'
                        ? (
                          <span>
                            {showSmartSuggestion}<br/>
                            <span className="font-semibold mt-1 block">
                              ⚠️ Action Required: Add specific details in each text field (e.g., "HR managers at Series A startups" instead of just "professionals")
                            </span>
                          </span>
                        )
                        : "Feel free to edit or keep as is - this suggestion follows proven frameworks for success."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 md:p-12 mb-6">
              <QuestionStep
                question={{
                  ...currentQuestion,
                  options: currentQuestion.id === 'primary_target' 
                    ? getDynamicPrimaryTargetOptions()
                    : currentQuestion.options,
                  examples: currentQuestion.id === 'actual_requests' 
                    ? generateContextualExamples('actual_requests')
                    : currentQuestion.examples
                }}
                answer={answers[currentQuestion.id]}
                onAnswerChange={handleAnswerChange}
                onNext={handleNext}
                onBack={handleBack}
                onAutoGenerate={handleAutoGenerate}
                suggestionPreview={suggestionPreview}
                onAcceptSuggestion={handleAcceptSuggestion}
                onRejectSuggestion={handleRejectSuggestion}
                onImproveAnswer={handleImproveAnswer}
                improvementSuggestion={currentQuestionIndex === questions.findIndex(q => q.id === currentQuestion.id) ? improvementSuggestion : ''}
                onAcceptImprovement={handleAcceptImprovement}
                onRejectImprovement={handleRejectImprovement}
                isFirstQuestion={currentQuestionIndex === 0}
                isLastQuestion={currentQuestionIndex === questions.length - 1}
                aiResponse={aiResponses[currentQuestion.id]}
                isProcessingAI={isProcessingAI}
                isGeneratingOptimal={isGeneratingOptimal} 
                isGeneratingImprovement={isGeneratingImprovement} 
              />
            </div>

            <div className="text-center">
              <button
                onClick={() => navigate('/products/sales')}
                className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
              >
                Skip and go directly to sales page builder
              </button>
            </div>
          </div>
        </div>

        <div className="lg:hidden">
          <ProgressSummary
            answers={answers}
            currentPhase={currentPhase}
            questions={questions}
          />
        </div>
      </div>
    </div>
  );
}