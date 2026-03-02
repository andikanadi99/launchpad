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
  
  // Product configuration (saved from results page)
  productConfig?: {
    name: string;
    description: string;
    price: number;
    priceType: 'one-time' | 'subscription' | 'payment-plan';
    currency: string;
    valueStack: string[];
    guarantees: string[];
    targetAudience: string;
    mission: string;
    tierType: 'low' | 'mid' | 'high';
  };
  
  // Linked resources
  salesPageId?: string | null; // ID of created sales page (if any)
  salesPageStatus?: 'none' | 'draft' | 'published';
}

// ============================================
// CREATOR PROFILE (Phase 2.1)
// ============================================

export interface SocialLinks {
  website: string;
  youtube: string;
  instagram: string;
  twitter: string;
  tiktok: string;
  linkedin: string;
}

export interface CustomLink {
  id: string;       // Unique ID (e.g. "cl_1709123456")
  label: string;    // "My Podcast", "Free Guide", "Book a Call"
  url: string;      // Full URL
}

// ============================================
// CREATOR PAGE STYLE (Phase 2.1 — Step 4)
// ============================================

export type SectionKey = 'profile' | 'links' | 'products' | 'about';

// Named group of products on the creator page
export interface ProductSection {
  id: string;           // Unique ID (e.g. "ps_1709123456")
  title: string;        // "Free Resources", "Courses", "1:1 Coaching"
  productSlugs: string[]; // Ordered list of product slugs in this section
  layout: 'list' | 'grid';        // How products in this section are displayed
  headerColor?: string;            // Custom header text color (defaults to subtext)
  headerSize?: 'sm' | 'md' | 'lg'; // Header text size
}

export interface CreatorPageStyle {
  accentColor: string;                                  // Hex: '#a855f7' default (purple)
  photoShape: 'square' | 'circle';                      // Default: 'square'
  layoutDensity: 'compact' | 'normal' | 'spacious';    // Default: 'normal'
  theme: 'dark' | 'light';                              // Default: 'dark'
  backgroundColor: string;                              // Hex for page bg: '#0B0B0D' (dark) or '#f5f5f5' (light)
  backgroundGradient: boolean;                          // Whether to show gradient at top
  backgroundGradientColor: string;                      // Hex for gradient overlay color
  gradientDirection: 'to-bottom' | 'to-top' | 'to-right' | 'to-left' | 'to-br' | 'to-bl'; // Direction
  gradientPosition: number;                             // 0-100: where gradient starts fading (default 50)
  coverPosition: 'top' | 'center' | 'bottom';          // Where to anchor cover image vertically
  coverZoom: number;                                    // 1 = normal, up to 1.5 = zoomed in
  coverHeight: 'short' | 'medium' | 'tall';             // Banner height: short=6:1, medium=5:1, tall=3.5:1
  sectionOrder: SectionKey[];                           // Order of page sections
  // Product display
  productCardStyle: 'compact' | 'standard' | 'featured'; // compact = no image, standard = image+text, featured = larger image
  productLayout: 'list' | 'grid';                       // list = stacked, grid = 2-column
  productShowTagline: boolean;                          // Show tagline on cards
  productShowPrice: boolean;                            // Show price on cards
}

export const DEFAULT_PAGE_STYLE: CreatorPageStyle = {
  accentColor: '#a855f7',
  photoShape: 'square',
  layoutDensity: 'normal',
  theme: 'dark',
  backgroundColor: '#0B0B0D',
  backgroundGradient: false,
  backgroundGradientColor: '#a855f7',
  gradientDirection: 'to-bottom',
  gradientPosition: 50,
  coverPosition: 'center',
  coverZoom: 1,
  coverHeight: 'medium',
  sectionOrder: ['profile', 'about', 'links', 'products'],
  productCardStyle: 'standard',
  productLayout: 'list',
  productShowTagline: true,
  productShowPrice: true,
};

export const ACCENT_PRESETS = [
  { label: 'Purple', value: '#a855f7' },
  { label: 'Blue',   value: '#3b82f6' },
  { label: 'Cyan',   value: '#06b6d4' },
  { label: 'Green',  value: '#22c55e' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Pink',   value: '#ec4899' },
  { label: 'Red',    value: '#ef4444' },
];

// Per-product overrides for creator page display
// Keyed by product slug in CreatorProfile.productOverrides
export interface ProductOverride {
  thumbnail?: string;    // Custom image URL (overrides sales page header image)
  description?: string;  // Custom short description (overrides sales page tagline)
  ctaText?: string;      // Custom CTA button text (overrides "View Product")
}

export interface CreatorProfile {
  displayName: string;         // "Adam Lowther" — shown on creator page + sales pages
  username: string;            // "adamlowther" → /creator/adamlowther
  bioShort: string;            // One-liner: "I help 7-figure businesses..." (160 char max)
  bioLong: string;             // Extended about section (1000 char max, rendered in 'about' section)
  photoURL: string;            // Defaults to Google auth photo, or custom upload
  coverImageURL: string;       // Cover/banner image for creator page (wide aspect ratio)
  socialLinks: SocialLinks;    // Platform links (empty string = not set)
  customLinks: CustomLink[];   // User-defined links with labels
  pageStyle: CreatorPageStyle; // Visual customization for public creator page
  productOverrides: Record<string, ProductOverride>; // Per-product display overrides keyed by slug
  productSections: ProductSection[]; // Named product groups for creator page
}

// Default empty profile — used when creating new users
export function createDefaultProfile(user?: any): CreatorProfile {
  return {
    displayName: user?.displayName || '',
    username: '',              // Must be claimed separately via username helpers
    bioShort: '',
    bioLong: '',
    photoURL: user?.photoURL || '',
    coverImageURL: '',
    socialLinks: {
      website: '',
      youtube: '',
      instagram: '',
      twitter: '',
      tiktok: '',
      linkedin: '',
    },
    customLinks: [],
    pageStyle: { ...DEFAULT_PAGE_STYLE },
    productOverrides: {},
    productSections: [],
  };
}

export interface UserDocument {
  // === BASIC INFO (existing) ===
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: any; // serverTimestamp()
  lastLoginAt: any; // serverTimestamp()
  
  // === CREATOR PROFILE (Phase 2.1) ===
  profile: CreatorProfile;
  
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
    
    // Creator Profile — seeded from Google auth
    profile: createDefaultProfile(user),
    
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