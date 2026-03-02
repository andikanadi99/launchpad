// Firebase User Document Migration and Helper Functions
// Location: src/lib/UserDocumentHelpers.ts

import { doc, getDoc, setDoc, updateDoc, serverTimestamp, runTransaction, collection, query, where, orderBy, limit, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { auth, db, storage } from './firebase';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import type { UserDocument, CoPilotSession, CreatorProfile, CustomLink, CreatorPageStyle } from './Usermodel';
import { createDefaultProfile, DEFAULT_PAGE_STYLE } from './Usermodel';

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
      
      // === CREATOR PROFILE (Phase 2.1) ===
      profile: createDefaultProfile(u),
      
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
      
      // === PRODUCT CO-PILOT ===
      activeSessionId: null,
      
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
    console.log('âœ… New user document created with lead magnet schema');
    
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
      
      console.log('ðŸ”„ Migrating existing user to new schema');
    }
    
    // MIGRATION: Add CreatorProfile for existing users (Phase 2.1)
    if (!existingData.profile) {
      updates.profile = createDefaultProfile({
        displayName: existingData.displayName || u?.displayName,
        photoURL: existingData.photoURL || u?.photoURL,
      });
      console.log('🔄 Migrating existing user: added CreatorProfile');
    }
    
    // MIGRATION: Move old productCoPilot data to subcollection
    if (existingData.productCoPilot && existingData.productCoPilot.answers && !existingData.activeSessionId) {
      console.log('ðŸ”„ Migrating productCoPilot to subcollection...');
      
      const sessionsRef = collection(db, 'users', uid, 'productCoPilotSessions');
      const oldData = existingData.productCoPilot;
      
      // Create session from old data
      const migratedSession = {
        name: 'Business Idea #1 (Migrated)',
        answers: oldData.answers || {},
        currentQuestionIndex: oldData.currentQuestionIndex || 0,
        completedAt: oldData.completedAt || null,
        nicheScore: oldData.nicheScore || null,
        selectedProductType: oldData.selectedProductType || null,
        createdAt: oldData.completedAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: oldData.completedAt ? 'completed' : 'in_progress',
      };
      
      const docRef = await addDoc(sessionsRef, migratedSession);
      
      // Update user document
      updates.activeSessionId = docRef.id;
      // Note: We don't delete productCoPilot to preserve data, but activeSessionId takes precedence
      
      console.log('âœ… Migrated productCoPilot to session:', docRef.id);
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
  
  console.log('ðŸŽ‰ User converted to paid:', trigger);
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

// ============================================
// USERNAME & CREATOR PROFILE HELPERS (Phase 2.1)
// ============================================

// Reserved words that cannot be used as usernames
const RESERVED_USERNAMES = [
  'admin', 'administrator', 'api', 'app', 'auth', 'billing',
  'blog', 'checkout', 'creator', 'dashboard', 'help', 'home',
  'launchpad', 'login', 'logout', 'onboarding', 'pathfinder',
  'pricing', 'privacy', 'profile', 'search', 'settings', 'signin',
  'signout', 'signup', 'status', 'stripe', 'support', 'terms',
  'test', 'user', 'users', 'www',
];

// Validate username format (client-side, before hitting Firestore)
export function validateUsername(username: string): { valid: boolean; error: string | null } {
  if (!username) {
    return { valid: false, error: 'Username is required' };
  }
  
  const trimmed = username.toLowerCase().trim();
  
  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  
  if (trimmed.length > 30) {
    return { valid: false, error: 'Username must be 30 characters or less' };
  }
  
  if (!/^[a-z0-9-]+$/.test(trimmed)) {
    return { valid: false, error: 'Only lowercase letters, numbers, and hyphens allowed' };
  }
  
  if (trimmed.startsWith('-') || trimmed.endsWith('-')) {
    return { valid: false, error: 'Username cannot start or end with a hyphen' };
  }
  
  if (trimmed.includes('--')) {
    return { valid: false, error: 'Username cannot contain consecutive hyphens' };
  }
  
  if (RESERVED_USERNAMES.includes(trimmed)) {
    return { valid: false, error: 'This username is reserved' };
  }
  
  return { valid: true, error: null };
}

// Check if a username is available in Firestore
export async function checkUsernameAvailability(username: string): Promise<boolean> {
  const validation = validateUsername(username);
  if (!validation.valid) return false;
  
  const usernameRef = doc(db, 'usernames', username.toLowerCase().trim());
  const snap = await getDoc(usernameRef);
  return !snap.exists();
}

// Claim a username for a user (transactional — prevents race conditions)
export async function claimUsername(userId: string, username: string): Promise<{ success: boolean; error: string | null }> {
  const trimmed = username.toLowerCase().trim();
  
  // Client-side validation first
  const validation = validateUsername(trimmed);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  
  const usernameRef = doc(db, 'usernames', trimmed);
  const userRef = doc(db, 'users', userId);
  
  try {
    await runTransaction(db, async (transaction) => {
      // Check if username is taken
      const usernameSnap = await transaction.get(usernameRef);
      if (usernameSnap.exists()) {
        throw new Error('Username is already taken');
      }
      
      // Check if user already has a username — if so, release the old one
      const userSnap = await transaction.get(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const oldUsername = userData.profile?.username;
        if (oldUsername && oldUsername !== trimmed) {
          // Release old username
          const oldUsernameRef = doc(db, 'usernames', oldUsername);
          transaction.delete(oldUsernameRef);
        }
      }
      
      // Claim the new username
      transaction.set(usernameRef, {
        userId,
        createdAt: serverTimestamp(),
      });
      
      // Update user profile with the new username
      transaction.update(userRef, {
        'profile.username': trimmed,
      });
    });
    
    console.log('✅ Username claimed:', trimmed);
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Failed to claim username:', error);
    return { success: false, error: error.message || 'Failed to claim username' };
  }
}

// Release a username (when user changes or deletes their username)
export async function releaseUsername(userId: string, username: string): Promise<void> {
  const trimmed = username.toLowerCase().trim();
  const usernameRef = doc(db, 'usernames', trimmed);
  const userRef = doc(db, 'users', userId);
  
  try {
    await runTransaction(db, async (transaction) => {
      // Verify the username belongs to this user
      const usernameSnap = await transaction.get(usernameRef);
      if (!usernameSnap.exists()) return;
      
      const data = usernameSnap.data();
      if (data.userId !== userId) {
        throw new Error('Cannot release a username that belongs to another user');
      }
      
      // Delete the username doc
      transaction.delete(usernameRef);
      
      // Clear username from user profile
      transaction.update(userRef, {
        'profile.username': '',
      });
    });
    
    console.log('✅ Username released:', trimmed);
  } catch (error) {
    console.error('Failed to release username:', error);
    throw error;
  }
}

// Save creator profile (updates user doc + public_profiles collection)
export async function saveCreatorProfile(
  userId: string,
  profileData: Partial<CreatorProfile>
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  
  // Build the update object with dot notation for partial updates
  const updates: Record<string, any> = {};
  
  if (profileData.displayName !== undefined) updates['profile.displayName'] = profileData.displayName;
  if (profileData.bioShort !== undefined) updates['profile.bioShort'] = profileData.bioShort;
  if (profileData.bioLong !== undefined) updates['profile.bioLong'] = profileData.bioLong;
  if (profileData.photoURL !== undefined) updates['profile.photoURL'] = profileData.photoURL;
  if (profileData.coverImageURL !== undefined) updates['profile.coverImageURL'] = profileData.coverImageURL;
  if (profileData.socialLinks !== undefined) updates['profile.socialLinks'] = profileData.socialLinks;
  if (profileData.customLinks !== undefined) updates['profile.customLinks'] = profileData.customLinks;
  if (profileData.pageStyle !== undefined) updates['profile.pageStyle'] = profileData.pageStyle;
  if (profileData.productOverrides !== undefined) updates['profile.productOverrides'] = profileData.productOverrides;
  if (profileData.productSections !== undefined) updates['profile.productSections'] = profileData.productSections;
  // Note: username is handled separately via claimUsername() — never set directly here
  
  updates.lastActiveDate = serverTimestamp();
  
  await updateDoc(userRef, updates);
  console.log('✅ Creator profile saved');
}

// Publish creator profile to public_profiles collection
// Called when saving profile in Settings (mirrors published_pages pattern)
export async function publishCreatorProfile(userId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) throw new Error('User not found');
  
  const userData = userSnap.data();
  const profile = userData.profile;
  
  if (!profile?.username) {
    throw new Error('Cannot publish profile without a username');
  }
  
  const publicProfileRef = doc(db, 'public_profiles', profile.username);
  
  await setDoc(publicProfileRef, {
    userId,
    displayName: profile.displayName || '',
    username: profile.username,
    bioShort: profile.bioShort || '',
    bioLong: profile.bioLong || '',
    photoURL: profile.photoURL || '',
    coverImageURL: profile.coverImageURL || '',
    socialLinks: profile.socialLinks || {},
    customLinks: profile.customLinks || [],
    pageStyle: profile.pageStyle || null,
    productOverrides: profile.productOverrides || {},
    productSections: profile.productSections || [],
    updatedAt: serverTimestamp(),
  });
  
  console.log('✅ Public profile published for:', profile.username);
}

// Fetch a public creator profile by username (for /creator/{username} page)
export async function getPublicProfile(username: string): Promise<any | null> {
  const trimmed = username.toLowerCase().trim();
  const profileRef = doc(db, 'public_profiles', trimmed);
  const snap = await getDoc(profileRef);
  
  if (!snap.exists()) return null;
  
  return { username: trimmed, ...snap.data() };
}

// Upload a profile photo to Firebase Storage and update profile.photoURL
export async function uploadProfilePhoto(
  userId: string,
  file: File
): Promise<string> {
  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Please upload a JPG, PNG, GIF, or WebP image');
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image must be under 5MB');
  }

  // Upload to Storage
  const ext = file.name.split('.').pop() || 'jpg';
  const filePath = `users/${userId}/profile-photo.${ext}`;
  const fileRef = storageRef(storage, filePath);
  
  await uploadBytes(fileRef, file);
  const downloadURL = await getDownloadURL(fileRef);

  // Update user profile
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    'profile.photoURL': downloadURL,
  });

  console.log('✅ Profile photo uploaded:', filePath);
  return downloadURL;
}

// Delete custom profile photo and revert to Google photo
export async function deleteProfilePhoto(userId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) return;
  
  const userData = userSnap.data();
  const currentURL = userData.profile?.photoURL || '';

  // Only delete from Storage if it's a Firebase Storage URL (not Google photo)
  if (currentURL.includes('firebasestorage.googleapis.com')) {
    try {
      // Try common extensions
      for (const ext of ['jpg', 'jpeg', 'png', 'gif', 'webp']) {
        try {
          const fileRef = storageRef(storage, `users/${userId}/profile-photo.${ext}`);
          await deleteObject(fileRef);
          break;
        } catch {
          // File with this extension doesn't exist, try next
        }
      }
    } catch (e) {
      console.warn('Could not delete old profile photo from storage:', e);
    }
  }

  // Revert to Google auth photo
  const googlePhoto = auth.currentUser?.photoURL || '';
  await updateDoc(userRef, {
    'profile.photoURL': googlePhoto,
  });

  console.log('✅ Profile photo removed, reverted to default');
}

// Upload a cover/banner image to Firebase Storage and update profile.coverImageURL
export async function uploadCoverImage(
  userId: string,
  file: File
): Promise<string> {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Please upload a JPG, PNG, or WebP image');
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Cover image must be under 10MB');
  }

  const ext = file.name.split('.').pop() || 'jpg';
  const filePath = `users/${userId}/cover-image.${ext}`;
  const fileRef = storageRef(storage, filePath);

  await uploadBytes(fileRef, file);
  const downloadURL = await getDownloadURL(fileRef);

  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    'profile.coverImageURL': downloadURL,
  });

  console.log('✅ Cover image uploaded:', filePath);
  return downloadURL;
}

// Delete cover image from Storage and clear profile.coverImageURL
export async function deleteCoverImage(userId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return;

  const userData = userSnap.data();
  const currentURL = userData.profile?.coverImageURL || '';

  if (currentURL.includes('firebasestorage.googleapis.com')) {
    try {
      for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
        try {
          const fileRef = storageRef(storage, `users/${userId}/cover-image.${ext}`);
          await deleteObject(fileRef);
          break;
        } catch {
          // Try next extension
        }
      }
    } catch (e) {
      console.warn('Could not delete cover image from storage:', e);
    }
  }

  await updateDoc(userRef, {
    'profile.coverImageURL': '',
  });

  console.log('✅ Cover image removed');
}

// ============================================
// PRODUCT CO-PILOT HELPERS (Subcollection-based)
// ============================================

// Get the sessions subcollection reference
const getSessionsCollection = (uid: string) => {
  return collection(db, 'users', uid, 'productCoPilotSessions');
};

// Create a new Co-Pilot session
export async function createCoPilotSession(uid: string): Promise<string> {
  const sessionsRef = getSessionsCollection(uid);
  const userRef = doc(db, 'users', uid);
  
  // Count existing sessions for naming
  const existingSessionsSnap = await getDocs(sessionsRef);
  const sessionNumber = existingSessionsSnap.size + 1;
  
  const newSession: Omit<CoPilotSession, 'id'> = {
    name: `Business Idea #${sessionNumber}`,
    answers: {},
    currentQuestionIndex: 0,
    completedAt: null,
    nicheScore: null,
    selectedProductType: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: 'in_progress',
  };
  
  // Add the new session
  const docRef = await addDoc(sessionsRef, newSession);
  
  // Update user's active session
  await updateDoc(userRef, {
    activeSessionId: docRef.id,
    lastActiveDate: serverTimestamp(),
  });
  
  console.log('âœ… New Co-Pilot session created:', docRef.id);
  return docRef.id;
}

// Get or create active session (main entry point)
export async function getOrCreateActiveSession(uid: string): Promise<{
  sessionId: string;
  session: CoPilotSession;
  isNew: boolean;
}> {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    throw new Error('User document not found');
  }
  
  const userData = userSnap.data();
  const activeSessionId = userData.activeSessionId;
  
  // If there's an active session, try to load it
  if (activeSessionId) {
    const sessionRef = doc(db, 'users', uid, 'productCoPilotSessions', activeSessionId);
    const sessionSnap = await getDoc(sessionRef);
    
    if (sessionSnap.exists()) {
      const sessionData = sessionSnap.data() as Omit<CoPilotSession, 'id'>;
      return {
        sessionId: activeSessionId,
        session: { id: activeSessionId, ...sessionData },
        isNew: false,
      };
    }
  }
  
  // No active session or it doesn't exist - check for most recent incomplete session
  const sessionsRef = getSessionsCollection(uid);
  const incompleteQuery = query(
    sessionsRef,
    where('status', '==', 'in_progress'),
    orderBy('updatedAt', 'desc'),
    limit(1)
  );
  
  const incompleteSnap = await getDocs(incompleteQuery);
  
  if (!incompleteSnap.empty) {
    const existingSession = incompleteSnap.docs[0];
    const sessionData = existingSession.data() as Omit<CoPilotSession, 'id'>;
    
    // Set this as active session
    await updateDoc(userRef, { activeSessionId: existingSession.id });
    
    return {
      sessionId: existingSession.id,
      session: { id: existingSession.id, ...sessionData },
      isNew: false,
    };
  }
  
  // No incomplete sessions - create a new one
  const newSessionId = await createCoPilotSession(uid);
  const newSessionRef = doc(db, 'users', uid, 'productCoPilotSessions', newSessionId);
  const newSessionSnap = await getDoc(newSessionRef);
  const newSessionData = newSessionSnap.data() as Omit<CoPilotSession, 'id'>;
  
  return {
    sessionId: newSessionId,
    session: { id: newSessionId, ...newSessionData },
    isNew: true,
  };
}

// Save Co-Pilot answers (called on each "Next" click)
export async function saveProductCoPilotAnswers(
  uid: string,
  sessionId: string,
  answers: Record<string, any>,
  currentQuestionIndex: number
) {
  const sessionRef = doc(db, 'users', uid, 'productCoPilotSessions', sessionId);
  const userRef = doc(db, 'users', uid);
  
  try {
    await updateDoc(sessionRef, {
      answers: answers,
      currentQuestionIndex: currentQuestionIndex,
      updatedAt: serverTimestamp(),
    });
    
    // Update user's last active date and features used
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const currentFeatures = userData.featuresUsed || [];
      const updatedFeatures = currentFeatures.includes('product-copilot')
        ? currentFeatures
        : [...currentFeatures, 'product-copilot'];
      
      await updateDoc(userRef, {
        lastActiveDate: serverTimestamp(),
        featuresUsed: updatedFeatures,
      });
    }
    
    console.log('âœ… Co-Pilot answers saved at question', currentQuestionIndex);
  } catch (error) {
    console.error('Error saving Co-Pilot answers:', error);
    throw error;
  }
}

// Load existing Co-Pilot session (called on page mount)
export async function loadProductCoPilotSession(
  uid: string,
  sessionId: string
): Promise<CoPilotSession | null> {
  const sessionRef = doc(db, 'users', uid, 'productCoPilotSessions', sessionId);
  const sessionSnap = await getDoc(sessionRef);
  
  if (!sessionSnap.exists()) {
    return null;
  }
  
  const data = sessionSnap.data() as Omit<CoPilotSession, 'id'>;
  return { id: sessionId, ...data };
}

// Mark Co-Pilot session as complete (called when user clicks "See Results")
export async function markProductCoPilotComplete(
  uid: string,
  sessionId: string,
  answers: Record<string, any>,
  nicheScore: number
) {
  const sessionRef = doc(db, 'users', uid, 'productCoPilotSessions', sessionId);
  const userRef = doc(db, 'users', uid);
  
  try {
    await updateDoc(sessionRef, {
      answers: answers,
      completedAt: serverTimestamp(),
      nicheScore: nicheScore,
      selectedProductType: answers.starting_product || null,
      updatedAt: serverTimestamp(),
      status: 'completed',
    });
    
    await updateDoc(userRef, {
      usedProductQuiz: true,
      lastActiveDate: serverTimestamp(),
    });
    
    console.log('ðŸŽ‰ Co-Pilot session marked complete with score:', nicheScore);
  } catch (error) {
    console.error('Error marking Co-Pilot complete:', error);
    throw error;
  }
}

// Reset/Delete a Co-Pilot session (if user wants to start over)
export async function resetProductCoPilotSession(uid: string, sessionId: string) {
  const sessionRef = doc(db, 'users', uid, 'productCoPilotSessions', sessionId);
  const userRef = doc(db, 'users', uid);
  
  try {
    // Delete the session
    await deleteDoc(sessionRef);
    
    // Clear active session ID
    await updateDoc(userRef, {
      activeSessionId: null,
    });
    
    console.log('ðŸ”„ Co-Pilot session deleted:', sessionId);
  } catch (error) {
    console.error('Error resetting Co-Pilot session:', error);
    throw error;
  }
}

// Start a new session (keeps old ones, creates fresh start)
export async function startNewCoPilotSession(uid: string): Promise<string> {
  return await createCoPilotSession(uid);
}

// Clone an existing Co-Pilot session (for editing ideas that already have a sales page)
export async function cloneCoPilotSession(uid: string, sourceSessionId: string): Promise<string> {
  const sessionsRef = getSessionsCollection(uid);
  const userRef = doc(db, 'users', uid);

  // Load the original session
  const sourceRef = doc(db, 'users', uid, 'productCoPilotSessions', sourceSessionId);
  const sourceSnap = await getDoc(sourceRef);

  if (!sourceSnap.exists()) {
    throw new Error('Source session not found');
  }

  const sourceData = sourceSnap.data();

  // Create clone with all answers/config but NO sales page link
  const clonedSession = {
    name: `${sourceData.name || 'Business Idea'} (Copy)`,
    answers: sourceData.answers || {},
    currentQuestionIndex: sourceData.currentQuestionIndex || 0,
    completedAt: sourceData.completedAt || null,
    nicheScore: sourceData.nicheScore || null,
    selectedProductType: sourceData.selectedProductType || null,
    status: sourceData.status || 'completed',
    productConfig: sourceData.productConfig || null,
    // Intentionally NOT copying salesPageId or salesPageStatus
    salesPageId: null,
    salesPageStatus: 'none' as const,
    // Traceability
    clonedFromSessionId: sourceSessionId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(sessionsRef, clonedSession);

  // Set clone as the active session
  await updateDoc(userRef, {
    activeSessionId: docRef.id,
    lastActiveDate: serverTimestamp(),
  });

  console.log('âœ… Cloned Co-Pilot session:', sourceSessionId, 'â†’', docRef.id);
  return docRef.id;
}

// Get all Co-Pilot sessions for a user
export async function getAllCoPilotSessions(uid: string): Promise<CoPilotSession[]> {
  const sessionsRef = getSessionsCollection(uid);
  const sessionsQuery = query(sessionsRef, orderBy('createdAt', 'desc'));
  const sessionsSnap = await getDocs(sessionsQuery);
  
  return sessionsSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as CoPilotSession[];
}

// Get completed Co-Pilot sessions only
export async function getCompletedCoPilotSessions(uid: string): Promise<CoPilotSession[]> {
  const sessionsRef = getSessionsCollection(uid);
  const completedQuery = query(
    sessionsRef,
    where('status', '==', 'completed'),
    orderBy('completedAt', 'desc')
  );
  const sessionsSnap = await getDocs(completedQuery);
  
  return sessionsSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as CoPilotSession[];
}

// Get Co-Pilot session for use in Sales Page Builder
export async function getProductCoPilotForSalesPage(
  uid: string,
  sessionId: string
): Promise<{
  sessionId: string;
  sessionName: string;
  targetAudience: string;
  outcome: string;
  dreamOutcome: string;
  missionStatement: string;
  productType: string;
  skills: any[];
} | null> {
  const session = await loadProductCoPilotSession(uid, sessionId);
  
  if (!session || !session.answers) {
    return null;
  }
  
  const answers = session.answers;
  
  return {
    sessionId: session.id,
    sessionName: session.name,
    targetAudience: answers.primary_target || '',
    outcome: answers.target_outcome || '',
    dreamOutcome: answers.dream_outcome || '',
    missionStatement: answers.mission_statement || '',
    productType: answers.starting_product || 'low_ticket',
    skills: answers.craft_skills || [],
  };
}

// Rename a Co-Pilot session
export async function renameCoPilotSession(
  uid: string,
  sessionId: string,
  newName: string
) {
  const sessionRef = doc(db, 'users', uid, 'productCoPilotSessions', sessionId);
  
  try {
    await updateDoc(sessionRef, {
      name: newName,
      updatedAt: serverTimestamp(),
    });
    console.log('âœ… Session renamed to:', newName);
  } catch (error) {
    console.error('Error renaming session:', error);
    throw error;
  }
}

// Set a specific session as active
export async function setActiveSession(uid: string, sessionId: string) {
  const userRef = doc(db, 'users', uid);
  
  await updateDoc(userRef, {
    activeSessionId: sessionId,
    lastActiveDate: serverTimestamp(),
  });
  
  console.log('Active session set to:', sessionId);
}

// Save product configuration to a session
export async function saveProductConfig(
  uid: string,
  sessionId: string,
  productConfig: {
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
  }
) {
  const sessionRef = doc(db, 'users', uid, 'productCoPilotSessions', sessionId);
  
  await updateDoc(sessionRef, {
    productConfig,
    updatedAt: serverTimestamp(),
  });
  
  console.log('Product config saved to session:', sessionId);
}

// Update session name (rename product idea)
export async function updateSessionName(uid: string, sessionId: string, newName: string) {
  const sessionRef = doc(db, 'users', uid, 'productCoPilotSessions', sessionId);
  
  await updateDoc(sessionRef, {
    name: newName,
    updatedAt: serverTimestamp(),
  });
}

// Link a sales page to a session
export async function linkSalesPageToSession(
  uid: string,
  sessionId: string,
  salesPageId: string,
  status: 'draft' | 'published' = 'draft'
) {
  const sessionRef = doc(db, 'users', uid, 'productCoPilotSessions', sessionId);
  
  await updateDoc(sessionRef, {
    salesPageId,
    salesPageStatus: status,
    updatedAt: serverTimestamp(),
  });
  
  console.log('Sales page linked to session:', { sessionId, salesPageId, status });
}

// Get all product ideas (completed sessions with productConfig)
export async function getProductIdeas(uid: string): Promise<any[]> {
  const sessionsRef = collection(db, 'users', uid, 'productCoPilotSessions');
  const q = query(
    sessionsRef,
    where('status', '==', 'completed'),
    orderBy('updatedAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}