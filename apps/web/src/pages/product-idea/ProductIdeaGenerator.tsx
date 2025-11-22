// src/pages/product-idea/ProductIdeaGenerator.tsx
// Complete redesign with Million Dollar Weekend + Hormozi's $100M Offers framework

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../lib/firebase';
import { doc, updateDoc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
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
  Sparkles
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
      // Generate based on skills following Million Dollar Weekend validation principle
      const skills = answers.craft_skills || [];
      if (!skills.length) return '';
      
      const requests: string[] = [];
      
      skills.forEach((skill: any) => {
        const value = typeof skill === 'object' ? skill.value : skill;
        const custom = typeof skill === 'object' ? skill.custom : null;
        
        // Noah Kagan's principle: Real problems = real requests
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
      
      // Add universal requests (Hormozi's "everyone has these problems")
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
      const customSkills: string[] = [];
      
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
      
    case 'value_stack':
      // Generate based on all previous answers
      const stackSkills = answers.craft_skills || [];
      const targetOutcome = answers.target_outcome || '';

      if (!stackSkills.length) {
        return '';
      }
      const bonuses: string[] = [];
      
      // Add skill-specific bonuses
      if (stackSkills.some((s: any) => {
        const val = typeof s === 'object' ? s.value : s;
        return val === 'technical_tools' || val === 'professional_current';
      })) {
        bonuses.push('Templates and frameworks library (Value: $497)');
        bonuses.push('Pre-built automation scripts and tools (Value: $297)');
      }
      
      if (stackSkills.some((s: any) => {
        const val = typeof s === 'object' ? s.value : s;
        return val === 'personal_transformation' || val === 'life_skills';
      })) {
        bonuses.push('Weekly group coaching calls for 3 months (Value: $997)');
        bonuses.push('Private community access with daily support (Value: $497)');
      }
      
      // Add outcome-specific bonuses
      if (targetOutcome.toLowerCase().includes('save')) {
        bonuses.push('Time-tracking optimization toolkit (Value: $197)');
      }
      if (targetOutcome.toLowerCase().includes('get') || targetOutcome.toLowerCase().includes('client')) {
        bonuses.push('Client acquisition email templates (Value: $297)');
      }
      if (targetOutcome.toLowerCase().includes('launch')) {
        bonuses.push('Launch week checklist and timeline (Value: $397)');
      }
      if (targetOutcome.toLowerCase().includes('automate')) {
        bonuses.push('Automation blueprints and workflow diagrams (Value: $497)');
      }
      
      // Add universal high-value bonuses
      bonuses.push('30-day implementation roadmap with daily tasks (Value: $197)');
      bonuses.push('"Emergency hotline" - 3 panic button calls (Value: $597)');
      bonuses.push('Success metrics dashboard template (Value: $97)');
      bonuses.push('Lifetime updates to all materials (Value: $297)');
      
      return bonuses.slice(0, 7).join('\n');
      
    default:
      return '';
  }
};
// Generate improved version of user's answer
const generateImprovedAnswer = (questionId: string, currentAnswer: string): string => {
  switch(questionId) {
    case 'actual_requests':
      // Improve structure and specificity following Million Dollar Weekend principles
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
      maxLength: 1500
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
      maxLength: 1500
    },
    helpText: "If you're unsure, think about what you do at work that others struggle with, or personal transformations you've achieved.",
    showAIHelper: true,
    showAutoGenerate: true
  },

  // ========================================
  // PHASE 2: NICHE DEFINITION
  // ========================================
  {
    id: 'approach_choice',
    question: "Choose your product validation approach",
    subtext: "Both paths work - pick what matches your personality and goals",
    type: 'radio',
    options: [
      {
        value: 'architect',
        label: 'The Architect',
        description: 'Focus deeply on ONE niche. Build expertise, compound results, maximize income potential. Best if you want predictable progress.',
        icon: <Target className="w-5 h-5 text-purple-600" />
      },
      {
        value: 'archaeologist',
        label: 'The Archaeologist',
        description: 'Test 2-3 different niches simultaneously. More variety, faster learning, discover unexpected opportunities. Best if you like exploring.',
        icon: <Lightbulb className="w-5 h-5 text-blue-600" />
      }
    ],
    validation: {
      required: true
    },
    helpText: "💡 Pro tip: Commit to your choice for at least 4-6 weeks to see real results. Architects typically reach $1K faster, while Archaeologists often discover more scalable opportunities. You can always adjust your approach based on what you learn."
  },

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
      maxSelections: 2
    },
    helpText: "💡 Think about: Who's in your phone contacts? Your LinkedIn network? Facebook groups you're in? Slack communities? Pick people you can actually reach out to TODAY for validation. Pre-selected options need your specific details!",
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
    placeholder: "I'll suggest a transformation based on your niche...",
    validation: {
      required: true,
      minLength: 30,
      maxLength: 300
    },
    helpText: "Go deeper: If they achieve your outcome, what does that enable in their life?",
    examples: [
      "Not just organized Ã¢â€ â€™ Finally have time for family instead of working weekends",
      "Not just fit Ã¢â€ â€™ Walk into any room with confidence and energy",
      "Not just more sales Ã¢â€ â€™ Build a business that runs without them"
    ],
    showAIHelper: true,
    smartSuggestion: true
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
  subtext: "List 5-10 bonuses that make your offer irresistible",
  type: 'textarea',
  placeholder: "I'll suggest valuable bonuses based on your skills and niche...",
  validation: {
    required: true,
    minLength: 50,
    maxLength: 600
  },
  helpText: "Each bonus should solve a specific objection or fear. Assign a value to each!",
  showAIHelper: true,
  smartSuggestion: true
}
];

export default function ProductIdeaGenerator() {
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [aiResponses, setAiResponses] = useState<AIResponses>({});
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showSmartSuggestion, setShowSmartSuggestion] = useState<string | null>(null);  // ADD THIS
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [generatedIdeas, setGeneratedIdeas] = useState<GeneratedIdea[]>([]);
  const [nicheScore, setNicheScore] = useState<{ score: number; feedback: string }>({ score: 0, feedback: '' });
  const [improvementSuggestion, setImprovementSuggestion] = useState<string>('');
  const [isGeneratingImprovement, setIsGeneratingImprovement] = useState(false);
  const [hasPreselected, setHasPreselected] = useState<{[key: string]: boolean}>({});

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
        feedback = "Ã°Å¸Å¸Â¢ GREEN LIGHT! This niche has strong potential. Full speed ahead!";
      } else if (score >= 2) {
        feedback = "Ã°Å¸Å¸Â¡ YELLOW LIGHT: Proceed with caution. Some challenges but workable for 6 weeks.";
      } else {
        feedback = "Ã°Å¸â€Â´ RED LIGHT: High risk niche. Consider pivoting to something with better alignment.";
      }
      
      setNicheScore({ score, feedback });
    }
  }, [answers.do_i_like_it, answers.can_i_help, answers.will_they_pay]);


  useEffect(() => {
    // Debug to confirm useEffect is running
    console.log('📍 useEffect running, currentQuestionIndex:', currentQuestionIndex);
    console.log('📍 Current question:', questions[currentQuestionIndex]?.id);
    
    // Clear smart suggestion first when changing questions
    setShowSmartSuggestion(null);
    
    const currentQ = questions[currentQuestionIndex];
    
    // Special handling for target_who - pre-select based on analysis
    if (currentQ.id === 'target_who' && !hasPreselected['target_who']) {
      // Check if answer is truly empty (undefined, null, or empty array)
      const currentAnswer = answers.target_who;
      const hasAnswer = currentAnswer && 
                       (!Array.isArray(currentAnswer) || currentAnswer.length > 0);
      
      console.log('🎯 Target WHO question reached. Has answer?', hasAnswer);
      console.log('🎯 Current answer:', currentAnswer);
      
      if (!hasAnswer) {
        console.log('🎯 Analyzing for target_who pre-selection...');
        const whoRequests = answers.actual_requests || '';
        const whoSkills = answers.craft_skills || [];
        
        console.log('Requests to analyze:', whoRequests);
        
        if (whoRequests) {
          const preSelected: any[] = [];
          const requestsLower = whoRequests.toLowerCase();
          
          // Analyze requests to identify WHO is asking
          if (requestsLower.includes('colleague') || requestsLower.includes('boss') || 
              requestsLower.includes('work') || requestsLower.includes('team') ||
              requestsLower.includes('coworker') || requestsLower.includes('employee') ||
              requestsLower.includes('manager') || requestsLower.includes('office')) {
            preSelected.push({ 
              value: 'professionals', 
              custom: 'Colleagues from my current workplace who need help with similar challenges' 
            });
            console.log('✅ Detected professionals');
          }
          
          if (requestsLower.includes('client') || requestsLower.includes('founder') || 
              requestsLower.includes('business') || requestsLower.includes('startup') ||
              requestsLower.includes('entrepreneur') || requestsLower.includes('owner') ||
              requestsLower.includes('company') || requestsLower.includes('ceo')) {
            preSelected.push({ 
              value: 'business_owners', 
              custom: 'Small business owners in my network' 
            });
            console.log('✅ Detected business owners');
          }
          
          if (requestsLower.includes('student') || requestsLower.includes('learn') ||
              requestsLower.includes('study') || requestsLower.includes('class') ||
              requestsLower.includes('course') || requestsLower.includes('school')) {
            preSelected.push({
              value: 'students',
              custom: 'Students or people learning new skills'
            });
            console.log('✅ Detected students');
          }
          
          if (requestsLower.includes('friend') || requestsLower.includes('family') ||
              requestsLower.includes('sister') || requestsLower.includes('brother') ||
              requestsLower.includes('neighbor') || requestsLower.includes('people')) {
            // Determine most likely category based on context
            if (requestsLower.includes('parent') || requestsLower.includes('mom') || 
                requestsLower.includes('dad') || requestsLower.includes('kid') ||
                requestsLower.includes('child')) {
              preSelected.push({ 
                value: 'parents', 
                custom: 'Parents in my social circle' 
              });
              console.log('✅ Detected parents');
            } else if (!preSelected.find(p => p.value === 'professionals')) {
              // Generic friends/family - try to be more specific
              preSelected.push({
                value: 'hobbyists',
                custom: 'Friends and family members interested in my skills'
              });
              console.log('✅ Detected hobbyists/general');
            }
          }
          
          console.log('Total pre-selected:', preSelected.length);
          
          if (preSelected.length > 0) {
            // Pre-fill the answer
            console.log('Setting pre-selected answers:', preSelected);
            setHasPreselected(prev => ({ ...prev, target_who: true })); // Mark that we've preselected
            setAnswers(prev => ({
              ...prev,
              target_who: preSelected.slice(0, 2) // Max 2 selections
            }));
            
            // Show notification about pre-selection
            setShowSmartSuggestion(
              `✅ We've pre-selected ${preSelected.length} group${preSelected.length > 1 ? 's' : ''} based on who's already asking you for help. Please review and add specific details about your exact target audience in each field - the more specific, the better your product will be!`
            );
          } else {
            console.log('⚠️ No matches found for pre-selection');
            setHasPreselected(prev => ({ ...prev, target_who: true })); // Still mark as attempted
            // Still show a helpful message
            setShowSmartSuggestion(
              `💡 Based on your skills and requests, think about who in your network needs this help most. Are they professionals, business owners, parents, or another specific group?`
            );
          }
        } else {
          console.log('⚠️ No actual_requests found to analyze');
          setHasPreselected(prev => ({ ...prev, target_who: true })); // Mark as attempted
        }
      } else {
        console.log('Already has answer, skipping pre-selection');
        setHasPreselected(prev => ({ ...prev, target_who: true })); // Mark as checked
      }
    }
    // Regular smart suggestion for other questions
    else if (currentQ.smartSuggestion && !answers[currentQ.id]) {
      const suggestion = generateSmartSuggestion(currentQ.id, answers);
      if (suggestion) {
        setShowSmartSuggestion(suggestion);
        // Pre-fill the answer with the suggestion
        setAnswers(prev => ({
          ...prev,
          [currentQ.id]: suggestion
        }));
      }
    }
  }, [currentQuestionIndex, hasPreselected]); // Add hasPreselected to dependencies

  // Handle answer changes
  const handleAnswerChange = (answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }));
    
    // Clear smart suggestion notification after user interacts
    if (showSmartSuggestion) {
      setTimeout(() => setShowSmartSuggestion(null), 2000);
    }

    // Check if answer is empty
    const isEmpty = !answer || (Array.isArray(answer) && answer.length === 0) || answer === '';
    
    if (isEmpty) {
      // Clear AI response when answer is empty
      setAiResponses(prev => {
        const newResponses = { ...prev };
        delete newResponses[currentQuestion.id];
        return newResponses;
      });
      setIsProcessingAI(false);
    } else if (currentQuestion.showAIHelper) {
      // Generate AI response only when there's content
      generateAIResponse(currentQuestion.id, answer);
    }
  };
  // Add this state at the top with other states
  const [isGeneratingOptimal, setIsGeneratingOptimal] = useState(false);

  // Replace the handleAutoGenerate function
  const handleAutoGenerate = async () => {
    const currentAnswer = answers[currentQuestion.id];
    if (currentAnswer && currentAnswer.length > 0) {
      if (!confirm('This will replace your current answer with an AI-generated optimal answer. Continue?')) {
        return;
      }
    }
    
    setIsGeneratingOptimal(true);
    
    try {
      const user = auth.currentUser;
      
      // First try the Claude API for better quality
      if (user) {
        console.log('ðŸ¤– Generating optimal answer with Claude...');
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
          console.log('âœ¨ Got optimal answer from Claude!');
          setAnswers(prev => ({
            ...prev,
            [currentQuestion.id]: data.generatedAnswer
          }));
          
          // Trigger AI response for the generated content
          if (currentQuestion.showAIHelper) {
            generateAIResponse(currentQuestion.id, data.generatedAnswer);
          }
          
          setIsGeneratingOptimal(false);
          return;
        }
      }
      
      // Fallback to local generation
      console.log('ðŸ“ Using local generation...');
      const suggestion = generateSmartSuggestion(currentQuestion.id, answers);
      if (suggestion) {
        setAnswers(prev => ({
          ...prev,
          [currentQuestion.id]: suggestion
        }));
        // Trigger AI response for the generated content
        if (currentQuestion.showAIHelper) {
          generateAIResponse(currentQuestion.id, suggestion);
        }
      }
    } catch (error) {
      console.error('Error generating optimal answer:', error);
      // Fallback to local generation
      const suggestion = generateSmartSuggestion(currentQuestion.id, answers);
      if (suggestion) {
        setAnswers(prev => ({
          ...prev,
          [currentQuestion.id]: suggestion
        }));
      }
    } finally {
      setIsGeneratingOptimal(false);
    }
  };

 const handleImproveAnswer = async (currentAnswer: string) => {
    console.log('ðŸš€ Starting improvement process...');
    setIsGeneratingImprovement(true);
    
    try {
      const user = auth.currentUser;
      
      if (!user) {
        console.log('âŒ No user, using local fallback');
        const improved = generateImprovedAnswer(currentQuestion.id, currentAnswer);
        setImprovementSuggestion(improved);
        setIsGeneratingImprovement(false);
        return;
      }

      console.log('ðŸ“¡ Calling Firebase Function...');
      const improveAnswerFunction = httpsCallable(functions, 'improveAnswer');
      
      // FIXED: Send the parameters the function expects
      const payload = {
        userId: user.uid,  // Add userId
        questionId: currentQuestion.id,
        originalAnswer: currentAnswer,  // Changed from currentAnswer
        questionText: currentQuestion.question,  // Add questionText
        previousAnswers: Object.keys(answers).slice(0, 5).reduce((acc, key) => {
          acc[key] = answers[key];
          return acc;
        }, {} as any)
      };
      
      console.log('ðŸ“¦ Sending payload:', payload);
      
      const result = await improveAnswerFunction(payload);
      console.log('âœ… Function response:', result);
      
      const data = result.data as any;
      
      if (data.success && data.improvedAnswer) {
        console.log('ðŸŽ‰ Got improved answer from Claude!');
        setImprovementSuggestion(data.improvedAnswer);
      } else {
        console.log('âš ï¸ Unexpected response format:', data);
        throw new Error('Unexpected response format');
      }
      
    } catch (error: any) {
      console.error('âŒ Full error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // Fallback to local improvement
      const improved = generateImprovedAnswer(currentQuestion.id, currentAnswer);
      setImprovementSuggestion(improved);
    } finally {
      setIsGeneratingImprovement(false);
    }
  };

// Handle accepting improvement
const handleAcceptImprovement = () => {
  if (improvementSuggestion) {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: improvementSuggestion
    }));
    setImprovementSuggestion('');
    
    // Trigger AI response for the improved content
    if (currentQuestion.showAIHelper) {
      generateAIResponse(currentQuestion.id, improvementSuggestion);
    }
  }
};

// Handle rejecting improvement
const handleRejectImprovement = () => {
  setImprovementSuggestion('');
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
        const bonusCount = (answer.split('\n') || []).filter((line: string) => line.trim()).length;
        response = `Excellent stack! With ${bonusCount} bonuses, you can create massive perceived value. Hormozi's rule: Stack value until it feels like they're stealing from you. Each bonus should solve a specific objection or fear.`;
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
    // Clear smart suggestion when moving to next question
    setShowSmartSuggestion(null);
    setImprovementSuggestion('');
    
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
    // Clear smart suggestion when moving to previous question
    setShowSmartSuggestion(null);
    setImprovementSuggestion('');
    
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleProgressClick = (step: number) => {
    if (step <= currentQuestionIndex + 1) {
      // Clear smart suggestion when jumping to a different question
      setShowSmartSuggestion(null);
      setImprovementSuggestion('');
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
                        Build This Product Ã¢â€ â€™
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
        <div className="hidden lg:block  flex-shrink-0">
          <ProgressSummary
            answers={answers}
            currentPhase={currentPhase}
            questions={questions}
          />
        </div>

        {/* Main Content - Center it when sidebar is hidden */}
        <div className="flex-1 max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <button
                onClick={() => navigate('/onboarding')}
                className="inline-flex items-center gap-2 text-sm mr-px  text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white mb-4 transition-colors"
                style={{
                  marginRight:'1rem'
                }}
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

            {/* Smart Suggestion Notification */}
            {showSmartSuggestion && (
              <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                      {currentQuestion.id === 'target_who' 
                        ? "📊 Pre-selected based on your previous answers - Please validate!"
                        : currentQuestion.id === 'confidence_test'
                        ? "💡 We've calculated what you could charge based on your skills"
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

            {/* Question Card */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 md:p-12 mb-6">
              <QuestionStep
              question={{
                ...currentQuestion,
                examples: currentQuestion.id === 'actual_requests' 
                  ? generateContextualExamples('actual_requests')
                  : currentQuestion.examples
              }}
              answer={answers[currentQuestion.id]}
              onAnswerChange={handleAnswerChange}
              onNext={handleNext}
              onBack={handleBack}
              onAutoGenerate={handleAutoGenerate}
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

            {/* Skip Option */}
            <div className="text-center">
              <button
                onClick={() => navigate('/products/sales')}
                className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
              >
                Skip and go directly to sales page builder Ã¢â€ â€™
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Progress Summary */}
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