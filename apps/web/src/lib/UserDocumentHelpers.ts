// Firebase User Document Migration and Helper Functions
// Location: src/lib/UserDocumentHelpers.ts

import { doc, getDoc, setDoc, updateDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { UserDocument } from './Usermodel';

// ============================================
// UPDATED ensureUserDoc FUNCTION
// ============================================

export async function ensureUserDoc(
  uid: string,
  options: {
    isNewUser?: boolean;
    accountType?: 'free' | 'paid';
    tierOverride?: {
      tier: string;
      price: number;
      source: string;
    };
    leadSource?: string;
    onboardingPath?: 'fast' | 'guided' | null;
  } = {}
) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const u = auth.currentUser;
  
  if (!snap.exists() || options.isNewUser) {
    // NEW USER - Create with full schema
    const now = serverTimestamp();
    const accountType = options.accountType || 'free';
    const isFreeTrial = accountType === 'free' && !options.tierOverride;
    
    // For free trial users, calculate trial end date
    const trialEndDate = isFreeTrial 
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;
    
    const newUserData = {
      // === BASIC INFO ===
      email: u?.email || null,
      displayName: u?.displayName || null,
      photoURL: u?.photoURL || null,
      createdAt: now,
      lastLoginAt: now,
      
      // === ACCOUNT TYPE ===
      accountType: accountType,
      accountStatus: 'active',
      trialStartDate: isFreeTrial ? now : null,
      trialEndDate: isFreeTrial ? trialEndDate : null,
      
      // === MEMBERSHIP TIERS ===
      membershipTier: options.tierOverride?.tier || (isFreeTrial ? 'free-trial' : 'regular'),
      pricingLocked: options.tierOverride?.price || (accountType === 'paid' ? 49 : 0),
      tierSource: options.tierOverride?.source || (isFreeTrial ? 'organic' : 'auto'),
      
      // === LEAD MAGNET TRACKING ===
      salesPagesCreated: 0,
      firstSalesPageDate: null,
      lastSalesPageDate: null,
      onboardingPath: options.onboardingPath || null,
      usedProductQuiz: false,
      leadSource: options.leadSource || null,
      
      // === CONVERSION TRACKING ===
      convertedToPaidDate: null,
      conversionTrigger: null,
      abandonedUpgradeAttempts: 0,
      
      // === STRIPE & PAYMENTS ===
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripeConnected: false,
      stripeConnectAccountId: null,
      paymentMethod: null,
      
      // === PROFILE COMPLETION ===
      profileComplete: false,
      onboardingComplete: false,
      onboardingSteps: {
        accountSetup: false,
        stripeConnect: false,
        firstSalesPage: false,
        firstProduct: false,
        firstPublish: false,
      },
      
      // === PRODUCT METRICS ===
      totalProducts: 0,
      publishedProducts: 0,
      totalRevenue: 0,
      totalCustomers: 0,
      
      // === ENGAGEMENT TRACKING ===
      lastActiveDate: now,
      loginCount: 1,
      daysActive: 1,
      featuresUsed: [],
      
      // === EMAIL PREFERENCES ===
      emailVerified: u?.emailVerified || false,
      emailPreferences: {
        marketing: true,
        product: true,
        tips: true,
        abandoned: true,
      },
      
      // === FLAGS & SETTINGS ===
      isTestAccount: false,
      isFlagged: false,
      notes: null,
    };
    
    await setDoc(ref, newUserData);
    console.log('✅ New user document created with lead magnet schema');
    
  } else {
    // EXISTING USER - Update last login and migrate if needed
    const existingData = snap.data();
    const updates: any = {
      lastLoginAt: serverTimestamp(),
      loginCount: (existingData.loginCount || 0) + 1,
      lastActiveDate: serverTimestamp(),
    };
    
    // MIGRATION: Add missing fields for existing users
    if (existingData.accountType === undefined) {
      // Determine account type based on existing data
      const isPaid = existingData.stripeSubscriptionId || 
                    existingData.membershipTier === 'founding-member' ||
                    existingData.membershipTier === 'regular';
      
      updates.accountType = isPaid ? 'paid' : 'free';
      updates.accountStatus = 'active';
      
      // Add lead magnet fields if missing
      updates.salesPagesCreated = existingData.salesPagesCreated || 0;
      updates.onboardingPath = existingData.onboardingPath || null;
      updates.usedProductQuiz = existingData.usedProductQuiz || false;
      updates.leadSource = existingData.leadSource || 'pre-lead-magnet';
      
      // Add conversion tracking if missing
      updates.convertedToPaidDate = isPaid ? existingData.createdAt : null;
      updates.conversionTrigger = isPaid ? 'direct-signup' : null;
      updates.abandonedUpgradeAttempts = 0;
      
      // Add engagement tracking if missing
      updates.daysActive = existingData.daysActive || 1;
      updates.featuresUsed = existingData.featuresUsed || [];
      
      // Add product metrics if missing
      updates.totalProducts = existingData.totalProducts || 0;
      updates.publishedProducts = existingData.publishedProducts || 0;
      updates.totalRevenue = existingData.totalRevenue || 0;
      updates.totalCustomers = existingData.totalCustomers || 0;
      
      // Add email preferences if missing
      if (!existingData.emailPreferences) {
        updates.emailPreferences = {
          marketing: true,
          product: true,
          tips: true,
          abandoned: true,
        };
      }
      
      // Add onboarding steps if missing
      if (!existingData.onboardingSteps) {
        updates.onboardingSteps = {
          accountSetup: existingData.profileComplete || false,
          stripeConnect: existingData.stripeConnected || false,
          firstSalesPage: existingData.salesPagesCreated > 0,
          firstProduct: existingData.totalProducts > 0,
          firstPublish: existingData.publishedProducts > 0,
        };
      }
      
      console.log('🔄 Migrating existing user to new schema');
    }
    
    await updateDoc(ref, updates);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Track when user creates a sales page
export async function trackSalesPageCreated(uid: string) {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const data = userSnap.data();
    const now = serverTimestamp();
    
    await updateDoc(userRef, {
      salesPagesCreated: (data.salesPagesCreated || 0) + 1,
      firstSalesPageDate: data.firstSalesPageDate || now,
      lastSalesPageDate: now,
      lastActiveDate: now,
      'onboardingSteps.firstSalesPage': true,
      featuresUsed: [...new Set([...(data.featuresUsed || []), 'sales-page-builder'])],
    });
  }
}

// Track when user tries to publish (conversion point)
export async function trackPublishAttempt(uid: string, completed: boolean) {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const data = userSnap.data();
    
    if (completed) {
      await updateDoc(userRef, {
        publishedProducts: (data.publishedProducts || 0) + 1,
        'onboardingSteps.firstPublish': true,
        lastActiveDate: serverTimestamp(),
        featuresUsed: [...new Set([...(data.featuresUsed || []), 'publish'])],
      });
    } else if (data.accountType === 'free') {
      // Free user tried to publish - track as potential conversion
      await updateDoc(userRef, {
        abandonedUpgradeAttempts: (data.abandonedUpgradeAttempts || 0) + 1,
        lastActiveDate: serverTimestamp(),
      });
    }
  }
}

// Convert free user to paid
export async function convertToPaid(uid: string, trigger: string, tierInfo?: any) {
  const userRef = doc(db, 'users', uid);
  
  await updateDoc(userRef, {
    accountType: 'paid',
    convertedToPaidDate: serverTimestamp(),
    conversionTrigger: trigger,
    membershipTier: tierInfo?.tier || 'regular',
    pricingLocked: tierInfo?.price || 49,
    trialEndDate: null, // Clear trial end date
  });
  
  console.log('🎉 User converted to paid:', trigger);
}

// Check if user can access feature
export async function canUserAccessFeature(
  uid: string, 
  feature: string
): Promise<boolean> {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) return false;
  
  const data = userSnap.data();
  
  // Admin and founding beta always have full access
  if (data.membershipTier === 'admin' || data.membershipTier === 'founding-beta') {
    return true;
  }
  
  // Define feature access matrix
  const freeFeatures = [
    'sales-page-builder',
    'ai-tools',
    'preview',
    'save-draft',
  ];
  
  const paidFeatures = [
    ...freeFeatures,
    'publish',
    'stripe-connect',
    'custom-domain',
    'analytics',
    'remove-watermark',
  ];
  
  if (data.accountType === 'paid') {
    return paidFeatures.includes(feature);
  } else {
    return freeFeatures.includes(feature);
  }
}

// Update user's onboarding path selection
export async function setOnboardingPath(uid: string, path: 'fast' | 'guided') {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    onboardingPath: path,
    usedProductQuiz: path === 'guided',
    lastActiveDate: serverTimestamp(),
  });
}

// Get user's trial status
export async function getUserTrialStatus(uid: string) {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    return { isInTrial: false, daysLeft: 0, expired: false };
  }
  
  const data = userSnap.data();
  
  if (data.accountType !== 'free' || !data.trialEndDate) {
    return { isInTrial: false, daysLeft: 0, expired: false };
  }
  
  const now = new Date();
  const endDate = new Date(data.trialEndDate);
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / msPerDay);
  
  return {
    isInTrial: daysLeft > 0,
    daysLeft: Math.max(0, daysLeft),
    expired: daysLeft < 0,
  };
}