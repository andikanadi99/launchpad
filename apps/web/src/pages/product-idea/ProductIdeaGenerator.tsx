// src/pages/product-idea/ProductIdeaGenerator.tsx
// Complete redesign with Million Dollar Weekend + Hormozi's $100M Offers framework

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../lib/firebase';
import { doc, updateDoc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
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
  Briefcase
} from 'lucide-react';

import ProgressBar from './ProgressBar';
import QuestionStep, { QuestionData } from './QuestionStep';
import ProgressSummary from './ProgressSummary';

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
        description: 'What you\'re literally paid to do now',
        icon: <Briefcase className="w-5 h-5 text-blue-600" />
      },
      {
        value: 'professional_past',
        label: 'Past Work Experience',
        description: 'Skills from previous jobs/careers',
        icon: <Award className="w-5 h-5 text-green-600" />
      },
      {
        value: 'technical_tools',
        label: 'Software/Tools Expertise',
        description: 'Excel, Photoshop, specific apps',
        icon: <Zap className="w-5 h-5 text-purple-600" />
      },
      {
        value: 'personal_transformation',
        label: 'Personal Transformations',
        description: 'Weight loss, debt freedom, relationships',
        icon: <Trophy className="w-5 h-5 text-pink-600" />
      },
      {
        value: 'creative_hobbies',
        label: 'Creative Hobbies',
        description: 'Music, writing, art, crafts',
        icon: <Star className="w-5 h-5 text-yellow-600" />
      },
      {
        value: 'life_skills',
        label: 'Life Skills',
        description: 'Organizing, parenting, cooking, budgeting',
        icon: <Heart className="w-5 h-5 text-orange-600" />
      },
      {
        value: 'academic_knowledge',
        label: 'Academic/Test Prep',
        description: 'Subjects you excelled at or can teach',
        icon: <Award className="w-5 h-5 text-red-600" />
      },
      {
        value: 'niche_expertise',
        label: 'Unique/Niche Knowledge',
        description: 'Specific interests you\'ve gone deep on',
        icon: <Lightbulb className="w-5 h-5 text-indigo-600" />
      }
    ],
    validation: {
      required: true,
      minSelections: 1
    },
    helpText: "Pro tip: Professional skills monetize faster (business buyers, higher prices). Personal skills build stronger communities. Select all that apply.",
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
      maxLength: 500
    },
    helpText: "Be specific! Include both work requests and personal favors. These are validated problems people already have.",
    examples: [
      "At work: Team asks for my project planning templates, boss wants me to train new hires on our CRM. Personally: Friends ask for workout routines, mom needs iPhone help",
      "Clients pay me for logo design, coworkers want my presentation templates. Friends ask how I grew my Instagram, sister wants budgeting advice",
      "I fix everyone's Excel formulas at work, neighbors ask about dog training, book club wants my speed reading tips"
    ],
    showAIHelper: true
  },

  {
    id: 'confidence_test',
    question: "The Confidence Test: What could you charge $50/hour for TODAY?",
    subtext: "Don't overthink - what would people realistically pay you for right now?",
    type: 'textarea',
    placeholder: "I could charge $50/hour to teach Excel, help with job interviews, plan meal prep...",
    validation: {
      required: true,
      minLength: 20,
      maxLength: 300
    },
    helpText: "If you're unsure, think about what you do at work that others struggle with, or personal transformations you've achieved.",
    showAIHelper: true
  },

  // ========================================
  // PHASE 2: NICHE DEFINITION
  // ========================================
  {
    id: 'approach_choice',
    question: "Choose your approach for the next 6 weeks",
    subtext: "Both work - it's about what fits your style",
    type: 'radio',
    options: [
      {
        value: 'architect',
        label: 'The Architect',
        description: 'One niche for 6 weeks. Compound efforts, more likely to hit $1K, efficient path to income.',
        icon: <Target className="w-5 h-5 text-purple-600" />
      },
      {
        value: 'archaeologist',
        label: 'The Archaeologist',
        description: 'Experiment with 2-3 niches. More fun, lower pressure, good for learning.',
        icon: <Lightbulb className="w-5 h-5 text-blue-600" />
      }
    ],
    validation: {
      required: true
    },
    helpText: "Architects often make money faster. Archaeologists have more fun exploring. You can always switch approaches after 6 weeks."
  },

  {
    id: 'target_who',
    question: "WHO do you want to help? (Your 'X' Person)",
    subtext: "Be specific - 'busy moms' is better than 'parents'",
    type: 'checkbox',
    options: [
      {
        value: 'business_owners',
        label: 'Business Owners',
        description: 'Entrepreneurs, founders, SMB owners',
        icon: <Briefcase className="w-5 h-5 text-purple-600" />
      },
      {
        value: 'professionals',
        label: 'Corporate Professionals',
        description: 'Managers, executives, employees',
        icon: <Users className="w-5 h-5 text-blue-600" />
      },
      {
        value: 'freelancers',
        label: 'Freelancers/Consultants',
        description: 'Independent workers, agencies',
        icon: <Zap className="w-5 h-5 text-green-600" />
      },
      {
        value: 'creators',
        label: 'Content Creators',
        description: 'YouTubers, bloggers, influencers',
        icon: <Star className="w-5 h-5 text-pink-600" />
      },
      {
        value: 'students',
        label: 'Students/Learners',
        description: 'College, bootcamp, self-learners',
        icon: <Award className="w-5 h-5 text-yellow-600" />
      },
      {
        value: 'parents',
        label: 'Parents',
        description: 'Moms, dads, caregivers',
        icon: <Heart className="w-5 h-5 text-red-600" />
      },
      {
        value: 'hobbyists',
        label: 'Hobbyists',
        description: 'People pursuing personal interests',
        icon: <Trophy className="w-5 h-5 text-orange-600" />
      },
      {
        value: 'other',
        label: 'Other specific group',
        description: 'Click to specify your target audience',
        allowCustom: true
      }
    ],
    validation: {
      required: true,
      minSelections: 1,
      maxSelections: 2
    },
    helpText: "Pick 1-2 groups max. If selecting 'Other', please specify (e.g., 'Retirees planning travel', 'New graduates', 'Pet owners')."
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
      maxLength: 200
    },
    helpText: "Make it specific and achievable. 'Be happier' is vague. 'Wake up energized without coffee' is specific.",
    examples: [
      "Get their first paying client in 30 days",
      "Automate their monthly reports and save 20 hours",
      "Pass the MCAT with a score of 515+",
      "Launch their Etsy shop and make first $1,000",
      "Meal prep for the whole week in under 2 hours"
    ],
    showAIHelper: true
  },

  {
    id: 'mission_statement',
    question: "Your Mission Statement",
    subtext: "Let's put it all together",
    type: 'textarea',
    placeholder: "I help [WHO] achieve [WHAT OUTCOME]",
    validation: {
      required: true,
      minLength: 20,
      maxLength: 150
    },
    helpText: "This is your north star for the next 6 weeks. Keep it simple and clear.",
    showAIHelper: true
  },

  // ========================================
  // PHASE 3: THE 3-QUESTION VALIDATION
  // ========================================
  {
    id: 'do_i_like_it',
    question: "Question 1 of 3: Do you LIKE this niche?",
    subtext: "Would you enjoy talking about this for the next 6 weeks?",
    type: 'radio',
    options: [
      {
        value: 'yes',
        label: 'Yes! I\'m excited about this',
        description: 'I could talk about this all day',
        icon: <Heart className="w-5 h-5 text-green-600" />
      },
      {
        value: 'maybe',
        label: 'It\'s okay, not passionate but interested',
        description: 'I can do this for 6 weeks',
        icon: <Heart className="w-5 h-5 text-yellow-600" />
      },
      {
        value: 'no',
        label: 'Not really, seems like work',
        description: 'Already feeling drained thinking about it',
        icon: <Heart className="w-5 h-5 text-red-600" />
      }
    ],
    validation: {
      required: true
    },
    helpText: "Be honest. You need at least 'okay' to sustain 6 weeks of content and products."
  },

  {
    id: 'can_i_help',
    question: "Question 2 of 3: Can you ACTUALLY HELP them?",
    subtext: "Do you have real knowledge or experience here?",
    type: 'radio',
    options: [
      {
        value: 'yes',
        label: 'Yes! I have solid expertise',
        description: 'Done it myself or helped others',
        icon: <CheckCircle className="w-5 h-5 text-green-600" />
      },
      {
        value: 'maybe',
        label: 'Somewhat - I know more than beginners',
        description: 'Not an expert but can add value',
        icon: <CheckCircle className="w-5 h-5 text-yellow-600" />
      },
      {
        value: 'no',
        label: 'Not really, would be teaching as I learn',
        description: 'No real experience or results',
        icon: <CheckCircle className="w-5 h-5 text-red-600" />
      }
    ],
    validation: {
      required: true
    },
    helpText: "You need at least 'somewhat' to create valuable products. Teaching what you don't know is a recipe for refunds."
  },

  {
    id: 'will_they_pay',
    question: "Question 3 of 3: Will they PAY for solutions?",
    subtext: "Do they have money AND willingness to spend it?",
    type: 'radio',
    options: [
      {
        value: 'yes',
        label: 'Yes! They have money and already buy solutions',
        description: 'I see competitors selling successfully',
        icon: <DollarSign className="w-5 h-5 text-green-600" />
      },
      {
        value: 'maybe',
        label: 'Possibly - they have money but need convincing',
        description: 'Problem is painful but market unproven',
        icon: <DollarSign className="w-5 h-5 text-yellow-600" />
      },
      {
        value: 'no',
        label: 'Unlikely - broke or don\'t see value',
        description: 'Students, unemployed, or low pain problem',
        icon: <DollarSign className="w-5 h-5 text-red-600" />
      }
    ],
    validation: {
      required: true
    },
    helpText: "Quick check: Search for similar products on Gumroad, Udemy, or Google. If others are selling, that's validation.",
    showAIHelper: true
  },

  // ========================================
  // PHASE 4: HORMOZI'S VALUE MAXIMIZER
  // ========================================
  {
    id: 'dream_outcome',
    question: "The DREAM: What's the ultimate transformation they want?",
    subtext: "Think bigger than the immediate result - what does success really mean to them?",
    type: 'textarea',
    placeholder: "Not just 'learn Excel' but 'Get promoted and earn $20K more'. Not just 'lose weight' but 'Feel confident at the beach vacation'...",
    validation: {
      required: true,
      minLength: 30,
      maxLength: 300
    },
    helpText: "Go deeper: If they achieve your outcome, what does that enable in their life?",
    examples: [
      "Not just organized → Finally have time for family instead of working weekends",
      "Not just fit → Walk into any room with confidence and energy",
      "Not just more sales → Build a business that runs without them"
    ],
    showAIHelper: true
  },

  {
    id: 'proof_elements',
    question: "PROOF: What makes people believe YOU can deliver?",
    subtext: "Check all that apply - this builds your credibility",
    type: 'checkbox',
    options: [
      {
        value: 'personal_results',
        label: 'I\'ve achieved this myself',
        description: 'Your transformation is proof'
      },
      {
        value: 'helped_free',
        label: 'Helped others for free',
        description: 'Friends, family, colleagues'
      },
      {
        value: 'paid_experience',
        label: 'Been paid for this',
        description: 'Professional experience'
      },
      {
        value: 'certification',
        label: 'Relevant certification',
        description: 'Formal credentials'
      },
      {
        value: 'unique_method',
        label: 'Unique system/method',
        description: 'Your own framework'
      },
      {
        value: 'insider_access',
        label: 'Insider knowledge',
        description: 'Industry secrets, exclusive info'
      },
      {
        value: 'track_record',
        label: 'Documented case studies',
        description: 'Screenshots, testimonials'
      },
      {
        value: 'overcome_odds',
        label: 'Overcame unique challenges',
        description: 'Did it the hard way'
      }
    ],
    validation: {
      required: true,
      minSelections: 1
    },
    helpText: "More proof = higher prices. Even 1-2 strong proof points can justify premium pricing."
  },

  {
    id: 'speed_to_value',
    question: "SPEED: How can you get them a quick win?",
    subtext: "What result can they see FAST to build momentum?",
    type: 'textarea',
    placeholder: "In 24 hours: Basic system set up\nIn 7 days: First small result\nIn 30 days: Significant transformation",
    validation: {
      required: true,
      minLength: 30,
      maxLength: 400
    },
    helpText: "The faster they see results, the more they'll pay. Think: What's the smallest valuable outcome?",
    examples: [
      "Day 1: Organize inbox to zero\nWeek 1: Save 5 hours with templates\nMonth 1: Full automation system running",
      "Hour 1: First pushup with proper form\nWeek 1: Noticeable energy increase\nMonth 1: Visible muscle definition",
      "Day 1: LinkedIn profile that attracts recruiters\nWeek 1: First interview scheduled\nMonth 1: Multiple job offers"
    ],
    showAIHelper: true
  },

  {
    id: 'effort_reducers',
    question: "EASY: What makes your solution require LESS effort?",
    subtext: "Check everything you could provide to reduce friction",
    type: 'checkbox',
    options: [
      {
        value: 'templates',
        label: 'Done-for-you templates',
        description: 'Copy-paste ready'
      },
      {
        value: 'step_system',
        label: 'Step-by-step system',
        description: 'No guesswork'
      },
      {
        value: 'daily_plan',
        label: 'Daily action plan',
        description: 'Exactly what to do when'
      },
      {
        value: 'swipe_copy',
        label: 'Scripts & swipe copy',
        description: 'Exact words to use'
      },
      {
        value: 'quick_wins',
        label: '10-minute implementations',
        description: 'Fits busy schedules'
      },
      {
        value: 'mobile_friendly',
        label: 'Mobile/on-the-go friendly',
        description: 'Learn anywhere'
      },
      {
        value: 'accountability',
        label: 'Built-in accountability',
        description: 'Stay on track'
      },
      {
        value: 'community',
        label: 'Supportive community',
        description: 'Never feel alone'
      },
      {
        value: 'automation',
        label: 'Automation tools',
        description: 'Set and forget'
      },
      {
        value: 'ai_powered',
        label: 'AI-powered shortcuts',
        description: 'Leverage technology'
      }
    ],
    validation: {
      required: true,
      minSelections: 3
    },
    helpText: "Stack 3+ effort reducers to justify premium pricing. People pay to save time and avoid headaches."
  },

  {
    id: 'value_stack',
    question: "The STACK: What bonuses make this irresistible?",
    subtext: "What extra value could you add? (You'll create these later)",
    type: 'checkbox',
    options: [
      {
        value: 'quick_start_guide',
        label: 'Quick Start Guide',
        description: 'Get going in 15 minutes'
      },
      {
        value: 'cheat_sheet',
        label: 'Ultimate Cheat Sheet',
        description: 'All key info on 1 page'
      },
      {
        value: 'calculator_tool',
        label: 'Calculator/Assessment Tool',
        description: 'Personalized recommendations'
      },
      {
        value: 'email_series',
        label: 'Email Course Follow-up',
        description: '30 days of tips'
      },
      {
        value: 'office_hours',
        label: 'Monthly Office Hours',
        description: 'Live Q&A sessions'
      },
      {
        value: 'interviews',
        label: 'Expert Interviews',
        description: 'Learn from the best'
      },
      {
        value: 'lifetime_updates',
        label: 'Lifetime Updates',
        description: 'Always current'
      },
      {
        value: 'private_podcast',
        label: 'Private Podcast',
        description: 'Exclusive audio content'
      },
      {
        value: 'worksheets',
        label: 'Action Worksheets',
        description: 'Implementation guides'
      },
      {
        value: 'case_studies',
        label: 'Real Case Studies',
        description: 'See it in action'
      },
      {
        value: 'resource_vault',
        label: 'Resource Vault',
        description: 'Curated tools & links'
      },
      {
        value: 'certificate',
        label: 'Completion Certificate',
        description: 'Professional credential'
      }
    ],
    validation: {
      required: true,
      minSelections: 2
    },
    helpText: "Pick 2-5 bonuses you could realistically create. These multiply perceived value without much extra work."
  }
];

export default function ProductIdeaGenerator() {
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [aiResponses, setAiResponses] = useState<AIResponses>({});
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [generatedIdeas, setGeneratedIdeas] = useState<GeneratedIdea[]>([]);
  const [nicheScore, setNicheScore] = useState<{ score: number; feedback: string }>({ score: 0, feedback: '' });

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  
  // Determine current phase based on question index
  const getCurrentPhase = () => {
    if (currentQuestionIndex < 3) return 1; // Skills Discovery
    if (currentQuestionIndex < 7) return 2; // Niche Definition
    if (currentQuestionIndex < 10) return 3; // Validation
    return 4; // Value Maximizer
  };
  
  const currentPhase = getCurrentPhase();

  // Auto-fill mission statement when reaching that question
  useEffect(() => {
    if (currentQuestion.id === 'mission_statement' && !answers.mission_statement) {
      const who = answers.target_who;
      const what = answers.target_outcome;
      
      if (who && what) {
        let whoText = '';
        if (Array.isArray(who)) {
          const labels = who.map((w: any) => {
            // Handle custom input objects
            if (typeof w === 'object' && w.custom) {
              return w.custom.toLowerCase();
            }
            // Handle regular string values
            const option = questions.find(q => q.id === 'target_who')?.options?.find(o => o.value === w);
            return option?.label?.toLowerCase() || w;
          });
          whoText = labels.join(' and ');
        } else if (typeof who === 'object' && who.custom) {
          whoText = who.custom.toLowerCase();
        } else {
          const option = questions.find(q => q.id === 'target_who')?.options?.find(o => o.value === who);
          whoText = option?.label?.toLowerCase() || who;
        }
        
        const missionDraft = `I help ${whoText} ${what}`;
        setAnswers(prev => ({ ...prev, mission_statement: missionDraft }));
      }
    }
  }, [currentQuestionIndex, currentQuestion, answers]);

  // Calculate niche score when completing validation questions
  useEffect(() => {
    if (answers.do_i_like_it && answers.can_i_help && answers.will_they_pay) {
      let score = 0;
      let feedback = '';
      
      // Count green lights
      if (answers.do_i_like_it === 'yes') score++;
      if (answers.can_i_help === 'yes') score++;
      if (answers.will_they_pay === 'yes') score++;
      
      // Add yellow lights as half points
      if (answers.do_i_like_it === 'maybe') score += 0.5;
      if (answers.can_i_help === 'maybe') score += 0.5;
      if (answers.will_they_pay === 'maybe') score += 0.5;
      
      // Generate feedback
      if (score >= 3) {
        feedback = "🟢 GREEN LIGHT! This niche has strong potential. Full speed ahead!";
      } else if (score >= 2) {
        feedback = "🟡 YELLOW LIGHT: Proceed with caution. Some challenges but workable for 6 weeks.";
      } else {
        feedback = "🔴 RED LIGHT: High risk niche. Consider pivoting to something with better alignment.";
      }
      
      setNicheScore({ score, feedback });
    }
  }, [answers.do_i_like_it, answers.can_i_help, answers.will_they_pay]);

  // Handle answer changes
  const handleAnswerChange = (answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }));

    // Trigger AI response for specific questions
    if (currentQuestion.showAIHelper && answer) {
      generateAIResponse(currentQuestion.id, answer);
    }
  };

  // Generate AI response (enhanced with context-aware responses)
  const generateAIResponse = async (questionId: string, answer: any) => {
    setIsProcessingAI(true);
    
    // Simulate AI processing with contextual responses
    setTimeout(() => {
      let response = '';
      
      switch(questionId) {
        case 'craft_skills':
          const skillCount = answer.length;
          const hasProfessional = answer.some((s: string) => s.includes('professional'));
          const hasPersonal = answer.some((s: string) => s.includes('personal') || s.includes('transformation'));
          
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
          
        case 'mission_statement':
          response = `Excellent mission! "${answer}" is clear and focused. This becomes your north star - every product, every piece of content serves this mission. Stick to this for 6 weeks and watch the compound effect...`;
          break;
          
        case 'will_they_pay':
          if (answer === 'yes') {
            response = "Perfect! Validated market with proven buyers. You're entering a space where money already flows. Focus on differentiation, not education.";
          } else if (answer === 'maybe') {
            response = "Opportunity! Unproven markets can mean less competition. Test with 3 beta customers at low prices before scaling.";
          } else {
            response = "Warning: This could be challenging. Consider adjusting your target audience to those with more disposable income, or solving a more painful problem.";
          }
          break;
          
        case 'dream_outcome':
          response = `Powerful! "${answer.substring(0, 60)}..." taps into deep emotional drivers. This is what they'll actually pay for - not the features, but this transformation. Price based on this value, not your time.`;
          break;
          
        case 'speed_to_value':
          response = `Smart progression! Quick wins build trust and momentum. Your Day 1 result proves competence, Week 1 creates believers, Month 1 delivers transformation. This timeline justifies premium pricing.`;
          break;
          
        case 'value_stack':
          const bonusCount = answer.length;
          response = `Excellent stack! With ${bonusCount} bonuses, you can create massive perceived value. Price anchor: "Worth $${bonusCount * 97}, get it for $47" = irresistible offer. People buy when value exceeds price by 10x.`;
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

  // Navigation
  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // All questions answered - generate product ideas
      setShowResults(true);
      generateProductIdeas();
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleProgressClick = (step: number) => {
    if (step <= currentQuestionIndex + 1) {
      setCurrentQuestionIndex(step - 1);
    }
  };

  // Generate product ideas based on all answers
  const generateProductIdeas = async () => {
    setIsGeneratingIdeas(true);
    
    // Save progress to Firebase
    if (auth.currentUser) {
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          usedProductQuiz: true,
          lastActiveDate: serverTimestamp(),
        });
      } catch (error) {
        console.error('Error saving quiz progress:', error);
      }
    }
    
    // Generate 3 product ideas at different price points
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
            'Quick-start guide (Value: $47)',
            'Cheat sheet (Value: $27)',
            'Email support for 7 days (Value: $97)'
          ],
          guarantee: '7-day money back guarantee',
          whyItFits: 'Low-risk entry point to validate your idea and get first customers quickly.'
        },
        {
          id: '2',
          name: 'Complete Transformation System',
          description: `Comprehensive solution for serious action-takers who want ${answers.dream_outcome}.`,
          price: 297,
          priceType: 'mid',
          targetAudience: answers.target_who,
          mainOutcome: answers.dream_outcome || answers.target_outcome,
          timeToResult: '30 days',
          difficultyLevel: 'Some commitment required',
          valueStack: [
            'Core training program (Value: $497)',
            'Templates & tools (Value: $197)',
            'Private community access (Value: $297)',
            '30-day email course (Value: $97)',
            'Bonus resources (Value: $147)'
          ],
          guarantee: '30-day results guarantee',
          whyItFits: 'Your main offer that delivers full transformation with strong support.'
        },
        {
          id: '3',
          name: 'VIP Implementation Week',
          description: `Done-with-you intensive for those who want results NOW with personal guidance.`,
          price: 997,
          priceType: 'high',
          targetAudience: answers.target_who,
          mainOutcome: `${answers.dream_outcome || answers.target_outcome} with personal support`,
          timeToResult: '5-7 days',
          difficultyLevel: 'Done with you',
          valueStack: [
            '1-on-1 kickoff call (Value: $297)',
            'Daily check-ins for 7 days (Value: $497)',
            'Custom action plan (Value: $397)',
            'Everything from lower tiers (Value: $497)',
            'Lifetime alumni access (Value: $297)'
          ],
          guarantee: 'Results or full refund',
          whyItFits: 'Premium offer for high-touch support. Start with 3 beta clients.'
        }
      ];
      
      setGeneratedIdeas(ideas);
      setIsGeneratingIdeas(false);
    }, 3000);
  };

  // Select a product idea and create it
  const selectProductIdea = async (idea: GeneratedIdea) => {
    if (!auth.currentUser) return;
    
    try {
      // Create a new product document with pre-filled data
      const productRef = doc(collection(db, 'products'));
      await setDoc(productRef, {
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        isDraft: true,
        salesPage: {
          coreInfo: {
            name: idea.name,
            tagline: idea.description,
            price: idea.price,
            priceType: 'one-time',
            currency: 'USD'
          },
          valueProp: {
            productType: 'custom',
            description: idea.description,
            benefits: idea.valueStack,
            targetAudience: `${idea.targetAudience} who want ${idea.mainOutcome}`,
            deliverables: idea.valueStack
          }
        },
        metadata: {
          fromQuiz: true,
          mission: answers.mission_statement,
          nicheScore: nicheScore.score
        }
      });
      
      // Navigate to sales page builder with this product
      navigate(`/products/${productRef.id}/landing/edit`);
    } catch (error) {
      console.error('Error creating product:', error);
    }
  };

  // Show results view
  if (showResults) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0B0B0D] py-12">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 mb-4">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-3">
              {isGeneratingIdeas ? "Creating Your Product Ideas..." : "Your Product Ideas Are Ready!"}
            </h1>
            
            {!isGeneratingIdeas && (
              <>
                {/* Mission Statement */}
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 mb-4 max-w-2xl mx-auto">
                  <p className="text-lg font-medium text-purple-900 dark:text-purple-100">
                    {answers.mission_statement}
                  </p>
                </div>
                
                {/* Niche Score */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                  nicheScore.score >= 3 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                  nicheScore.score >= 2 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                }`}>
                  {nicheScore.feedback}
                </div>
              </>
            )}
          </div>

          {isGeneratingIdeas ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mb-4" />
              <p className="text-neutral-600 dark:text-neutral-400">Applying Hormozi's value equation to your answers...</p>
            </div>
          ) : (
            <>
              {/* Product Ideas */}
              <div className="space-y-6 mb-8">
                {generatedIdeas.map((idea) => (
                  <div
                    key={idea.id}
                    className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 hover:border-purple-500 dark:hover:border-purple-400 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
                          {idea.name}
                        </h3>
                        <p className="text-neutral-600 dark:text-neutral-400">
                          {idea.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                          ${idea.price}
                        </div>
                        <div className={`text-xs font-medium px-2 py-1 rounded-full inline-block ${
                          idea.priceType === 'low' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                          idea.priceType === 'mid' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                          'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                        }`}>
                          {idea.priceType === 'low' ? 'Entry Level' : idea.priceType === 'mid' ? 'Core Offer' : 'Premium'}
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Time to First Result</p>
                        <p className="font-medium text-neutral-900 dark:text-white">{idea.timeToResult}</p>
                      </div>
                      <div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Difficulty</p>
                        <p className="font-medium text-neutral-900 dark:text-white">{idea.difficultyLevel}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">Value Stack:</p>
                      <ul className="space-y-1">
                        {idea.valueStack.slice(0, 3).map((item, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800">
                      <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                        <Shield className="w-4 h-4" />
                        {idea.guarantee}
                      </div>
                      <button
                        onClick={() => selectProductIdea(idea)}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all text-sm"
                      >
                        Build This Product →
                      </button>
                    </div>

                    <div className="mt-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">
                        <span className="font-medium">Why this fits:</span> {idea.whyItFits}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => {
                    setShowResults(false);
                    setCurrentQuestionIndex(0);
                    setAnswers({});
                  }}
                  className="px-6 py-3 bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg font-medium hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-all"
                >
                  Start Over
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-3 bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 rounded-lg font-medium hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all"
                >
                  Go to Dashboard
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0B0D] py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-8">
          {/* Left Sidebar - Progress Summary (Desktop Only) */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <ProgressSummary
              answers={answers}
              currentPhase={currentPhase}
              questions={questions}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 max-w-3xl">
            {/* Header */}
            <div className="text-center mb-8">
              <button
                onClick={() => navigate('/onboarding')}
                className="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Onboarding
              </button>
              
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 mb-4">
                <Rocket className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-3">
                Product Idea Co-Pilot
              </h1>
              <p className="text-lg text-neutral-600 dark:text-neutral-400">
                Million Dollar Weekend + $100M Offers = Your Perfect Product
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <ProgressBar
                currentStep={currentQuestionIndex + 1}
                totalSteps={questions.length}
                allowNavigation={true}
                onStepClick={handleProgressClick}
              />
            </div>

            {/* Phase Indicator */}
            <div className="text-center mb-6">
              <span className="inline-block px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium">
                {currentPhase === 1 && 'Phase 1: Discover Your Skills'}
                {currentPhase === 2 && 'Phase 2: Define Your Niche'}
                {currentPhase === 3 && 'Phase 3: Validate Your Market'}
                {currentPhase === 4 && 'Phase 4: Maximize Your Value'}
              </span>
            </div>

            {/* Question Card */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 md:p-12 mb-6">
              <QuestionStep
                question={currentQuestion}
                answer={answers[currentQuestion.id]}
                onAnswerChange={handleAnswerChange}
                onNext={handleNext}
                onBack={handleBack}
                isFirstQuestion={currentQuestionIndex === 0}
                isLastQuestion={currentQuestionIndex === questions.length - 1}
                aiResponse={aiResponses[currentQuestion.id]}
                isProcessingAI={isProcessingAI}
              />
            </div>

            {/* Skip Option */}
            <div className="text-center">
              <button
                onClick={() => navigate('/products/sales')}
                className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
              >
                Skip and go directly to sales page builder →
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Progress Summary */}
        <ProgressSummary
          answers={answers}
          currentPhase={currentPhase}
          questions={questions}
        />
      </div>
    </div>
  );
}