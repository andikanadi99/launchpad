// Firebase User Model Update for Lead Magnet Flow
// This file defines the updated user document structure
// Location: src/lib/UserModel.ts

import { serverTimestamp } from 'firebase/firestore';

// Co-Pilot Session interface (stored in subcollection)
export interface CoPilotSession {
  id: string;
  name: string; // Auto-generated or user-named (e.g., "Business Idea #1")
  answers: Record<string, any>;
  currentQuestionIndex: number;
  completedAt: any | null; // serverTimestamp when completed
  nicheScore: number | null; // Validation score (0-3)
  selectedProductType: string | null; // low_ticket, mid_ticket, high_ticket, membership
  createdAt: any; // serverTimestamp
  updatedAt: any; // serverTimestamp
  status: 'in_progress' | 'completed';
}

export interface UserDocument {
  // === BASIC INFO (existing) ===
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: any; // serverTimestamp()
  lastLoginAt: any; // serverTimestamp()
  
  // === ACCOUNT TYPE (NEW for lead magnet) ===
  accountType: 'free' | 'paid';  // NEW: Distinguishes free lead magnet users from paid subscribers
  accountStatus: 'active' | 'suspended' | 'expired'; // NEW: Track account status
  trialStartDate: any | null; // NEW: When free trial started (serverTimestamp)
  trialEndDate: any | null; // NEW: When free trial expires (30 days from start)
  
  // === MEMBERSHIP TIERS (existing, enhanced) ===
  membershipTier: 'founding-beta' | 'founding-member' | 'regular' | 'admin' | 'free-trial'; // UPDATED: Added 'free-trial'
  pricingLocked: number; // Monthly price (0 for free accounts)
  tierSource: 'auto' | 'admin' | 'invite' | 'organic'; // UPDATED: Added 'organic' for free signups
  
  // === LEAD MAGNET TRACKING (NEW) ===
  salesPagesCreated: number; // NEW: Count of sales pages created
  firstSalesPageDate: any | null; // NEW: When they created their first page
  lastSalesPageDate: any | null; // NEW: When they last edited a sales page
  onboardingPath: 'fast' | 'guided' | null; // NEW: Which onboarding path they chose
  usedProductQuiz: boolean; // NEW: Whether they used the Product Idea Co-Pilot
  leadSource: string | null; // NEW: Where they came from (utm_source, referrer, etc.)
  
  // === PRODUCT CO-PILOT (sessions stored in subcollection) ===
  // Sessions stored at: users/{userId}/productCoPilotSessions/{sessionId}
  activeSessionId: string | null; // Currently active Co-Pilot session ID
  
  // === CONVERSION TRACKING (NEW) ===
  convertedToPaidDate: any | null; // NEW: When they upgraded from free to paid
  conversionTrigger: string | null; // NEW: What prompted the upgrade (e.g., 'publish_attempt', 'email_campaign')
  abandonedUpgradeAttempts: number; // NEW: How many times they started but didn't complete upgrade
  
  // === STRIPE & PAYMENTS (existing, enhanced) ===
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeConnected: boolean; // For Stripe Connect (receiving payments)
  stripeConnectAccountId: string | null; // NEW: Their Stripe Connect account ID
  paymentMethod: 'stripe' | 'manual' | null; // NEW: How they pay
  
  // === PROFILE COMPLETION (existing, enhanced) ===
  profileComplete: boolean;
  onboardingComplete: boolean;
  onboardingSteps: { // NEW: Detailed tracking
    accountSetup: boolean;
    stripeConnect: boolean;
    firstSalesPage: boolean;
    firstProduct: boolean;
    firstPublish: boolean;
  };
  
  // === PRODUCT METRICS (NEW) ===
  totalProducts: number; // NEW: Total products created
  publishedProducts: number; // NEW: Products that are live
  totalRevenue: number; // NEW: Revenue tracked through our platform
  totalCustomers: number; // NEW: Customers who've purchased their products
  
  // === ENGAGEMENT TRACKING (NEW) ===
  lastActiveDate: any | null; // NEW: Last time they did anything meaningful
  loginCount: number; // NEW: Total number of logins
  daysActive: number; // NEW: Number of unique days with activity
  featuresUsed: string[]; // NEW: Array of features they've tried
  
  // === EMAIL PREFERENCES (NEW) ===
  emailVerified: boolean; // NEW: Has verified their email
  emailPreferences: {
    marketing: boolean;
    product: boolean;
    tips: boolean;
    abandoned: boolean;
  };
  
  // === FLAGS & SETTINGS (NEW) ===
  isTestAccount: boolean; // NEW: For internal testing
  isFlagged: boolean; // NEW: For moderation/abuse prevention
  notes: string | null; // NEW: Internal admin notes
}

// Helper function to create a new user document
export function createNewUserDocument(
  user: any, // Firebase auth user
  options: {
    accountType?: 'free' | 'paid';
    membershipTier?: 'founding-beta' | 'founding-member' | 'regular' | 'admin' | 'free-trial';
    price?: number;
    source?: 'auto' | 'admin' | 'invite' | 'organic';
    leadSource?: string;
  } = {}
): Partial<UserDocument> {
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const accountType = options.accountType || 'free';
  const isFreeTrial = accountType === 'free';
  
  return {
    // Basic info
    email: user.email || null,
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    createdAt: now, // Will be converted to serverTimestamp
    lastLoginAt: now,
    
    // Account type
    accountType: accountType,
    accountStatus: 'active',
    trialStartDate: isFreeTrial ? now : null,
    trialEndDate: isFreeTrial ? thirtyDaysLater : null,
    
    // Membership - with proper type casting
    membershipTier: options.membershipTier || (isFreeTrial ? 'free-trial' : 'regular') as UserDocument['membershipTier'],
    pricingLocked: options.price || 0,
    tierSource: options.source || (isFreeTrial ? 'organic' : 'auto') as UserDocument['tierSource'],
    
    // Lead magnet tracking
    salesPagesCreated: 0,
    firstSalesPageDate: null,
    lastSalesPageDate: null,
    onboardingPath: null,
    usedProductQuiz: false,
    leadSource: options.leadSource || null,
    
    // Product Co-Pilot (sessions in subcollection)
    activeSessionId: null,
    
    // Conversion tracking
    convertedToPaidDate: null,
    conversionTrigger: null,
    abandonedUpgradeAttempts: 0,
    
    // Stripe
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripeConnected: false,
    stripeConnectAccountId: null,
    paymentMethod: null,
    
    // Profile
    profileComplete: false,
    onboardingComplete: false,
    onboardingSteps: {
      accountSetup: false,
      stripeConnect: false,
      firstSalesPage: false,
      firstProduct: false,
      firstPublish: false,
    },
    
    // Metrics
    totalProducts: 0,
    publishedProducts: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    
    // Engagement
    lastActiveDate: now,
    loginCount: 1,
    daysActive: 1,
    featuresUsed: [],
    
    // Email
    emailVerified: false,
    emailPreferences: {
      marketing: true,
      product: true,
      tips: true,
      abandoned: true,
    },
    
    // Flags
    isTestAccount: false,
    isFlagged: false,
    notes: null,
  };
}

// Helper to check if user can access paid features
export function canAccessPaidFeatures(user: UserDocument): boolean {
  if (user.accountType === 'paid') return true;
  if (user.membershipTier === 'admin') return true;
  if (user.membershipTier === 'founding-beta') return true;
  return false;
}

// Helper to check if user is in trial
export function isInTrial(user: UserDocument): boolean {
  if (user.accountType !== 'free') return false;
  if (!user.trialEndDate) return false;
  return new Date() < new Date(user.trialEndDate);
}

// Helper to get days left in trial
export function getTrialDaysLeft(user: UserDocument): number {
  if (!isInTrial(user)) return 0;
  const now = new Date();
  const end = new Date(user.trialEndDate);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((end.getTime() - now.getTime()) / msPerDay);
}

// Feature access matrix
export const FEATURE_ACCESS = {
  // Free accounts can:
  free: {
    createSalesPages: true,
    editSalesPages: true,
    previewPages: true,
    useAITools: true,
    saveWork: true,
    // Free accounts CANNOT:
    publishPages: false,
    acceptPayments: false,
    customDomains: false,
    analytics: false,
    exportData: false,
    removeWatermark: false,
  },
  // Paid accounts can do everything
  paid: {
    createSalesPages: true,
    editSalesPages: true,
    previewPages: true,
    useAITools: true,
    saveWork: true,
    publishPages: true,
    acceptPayments: true,
    customDomains: true,
    analytics: true,
    exportData: true,
    removeWatermark: true,
  },
};