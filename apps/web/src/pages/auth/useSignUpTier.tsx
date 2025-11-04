import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '../../lib/firebase';


/**
 * Signup tier determination system
 * Supports: URL parameters, invite codes, admin overrides, and future pricing tiers
 */

export interface TierInfo {
  tier: 'founding-beta' | 'founding-member' | 'regular' | 'admin' | 'custom';
  displayName: string;
  price: number;
  priceDisplay: string;
  spotsLeft: number | null;
  benefits: string[];
  badge: {
    emoji: string;
    text: string;
    color: string;
  };
  isLocked: boolean; // Price locked forever
  source: 'auto' | 'invite' | 'admin' | 'custom'; // How tier was determined
}

/**
 * Hook to determine signup tier based on various factors
 */
export function useSignupTier() {
  const [searchParams] = useSearchParams();
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    determineTier();
  }, [searchParams]);

  const determineTier = async () => {
    // PRIORITY 1: Check for invite code or tier parameter
    const inviteCode = searchParams.get('invite');
    const tierParam = searchParams.get('tier');
    const adminKey = searchParams.get('admin');

    // Admin override (secret URL parameter)
    if (adminKey === process.env.REACT_APP_ADMIN_SECRET_KEY) {
      setTierInfo({
        tier: 'admin',
        displayName: 'Admin Account',
        price: 0,
        priceDisplay: 'FREE',
        spotsLeft: null,
        benefits: [
          'Full platform access',
          'Admin dashboard',
          'All features unlocked',
          'Priority support',
          'Beta feature access'
        ],
        badge: {
          emoji: '👑',
          text: 'Admin Account',
          color: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/30'
        },
        isLocked: true,
        source: 'admin'
      });
      setLoading(false);
      return;
    }

    // Invite code override (for special promotions)
    if (inviteCode) {
      const tierFromInvite = await checkInviteCode(inviteCode);
      if (tierFromInvite) {
        setTierInfo(tierFromInvite);
        setLoading(false);
        return;
      }
    }

    // Tier parameter override (for future pricing experiments)
    if (tierParam) {
      const customTier = await getCustomTier(tierParam);
      if (customTier) {
        setTierInfo(customTier);
        setLoading(false);
        return;
      }
    }

    // PRIORITY 2: Check automatic tier assignment based on count
    const autoTier = await getAutoAssignedTier();
    setTierInfo(autoTier);
    setLoading(false);
  };

  return { tierInfo, loading };
}

/**
 * Check invite code against database
 * Allows you to create custom invite codes with specific tiers
 */
async function checkInviteCode(code: string): Promise<TierInfo | null> {
  try {
    const inviteRef = doc(db, 'invites', code);
    const inviteSnap = await getDoc(inviteRef);

    if (inviteSnap.exists()) {
      const data = inviteSnap.data();
      
      // Check if invite is still valid
      if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
        return null; // Expired
      }
      
      if (data.usesLeft !== undefined && data.usesLeft <= 0) {
        return null; // Used up
      }

      return {
        tier: data.tier,
        displayName: data.displayName,
        price: data.price,
        priceDisplay: data.price === 0 ? 'FREE' : `$${data.price}/month`,
        spotsLeft: data.usesLeft,
        benefits: data.benefits || [],
        badge: {
          emoji: data.badge?.emoji || '🎟️',
          text: data.badge?.text || 'Special Invite',
          color: data.badge?.color || 'text-purple-300 bg-purple-500/10 border-purple-500/30'
        },
        isLocked: data.isLocked || false,
        source: 'invite'
      };
    }
  } catch (error) {
    console.error('Error checking invite code:', error);
  }
  
  return null;
}

/**
 * Get custom tier from future pricing experiments
 * Allows A/B testing different prices
 */
async function getCustomTier(tierParam: string): Promise<TierInfo | null> {
  try {
    const tierRef = doc(db, 'pricing-tiers', tierParam);
    const tierSnap = await getDoc(tierRef);

    if (tierSnap.exists()) {
      const data = tierSnap.data();
      
      return {
        tier: 'custom',
        displayName: data.displayName,
        price: data.price,
        priceDisplay: `$${data.price}/month`,
        spotsLeft: null,
        benefits: data.benefits || [],
        badge: {
          emoji: data.badge?.emoji || '✨',
          text: data.badge?.text || data.displayName,
          color: data.badge?.color || 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30'
        },
        isLocked: data.isLocked || false,
        source: 'custom'
      };
    }
  } catch (error) {
    console.error('Error getting custom tier:', error);
  }
  
  return null;
}

/**
 * Get automatically assigned tier based on signup count
 * This is the default behavior
 */
async function getAutoAssignedTier(): Promise<TierInfo> {
  try {
    const configRef = doc(db, 'config', 'membership');
    const configSnap = await getDoc(configRef);

    if (configSnap.exists()) {
      const data = configSnap.data();
      const foundingBetaCount = data.foundingBetaCount || 0;
      const foundingMemberCount = data.foundingMemberCount || 0;

      // Founding Beta (First 10)
      if (foundingBetaCount < 10) {
        return {
          tier: 'founding-beta',
          displayName: 'Founding Beta Tester',
          price: 0,
          priceDisplay: 'FREE forever',
          spotsLeft: 10 - foundingBetaCount,
          benefits: [
            'Free access forever',
            'AI Product Idea Generator',
            'AI Sales Copywriter',
            'Personal Sales Page Review',
            'Launch Day Promotion',
            'Priority support'
          ],
          badge: {
            emoji: '🎉',
            text: 'Founding Beta Tester',
            color: 'text-purple-300 bg-purple-500/10 border-purple-500/30'
          },
          isLocked: true,
          source: 'auto'
        };
      }

      // Founding Member (Next 50)
      if (foundingMemberCount < 50) {
        return {
          tier: 'founding-member',
          displayName: 'Founding Member',
          price: 29,
          priceDisplay: '$29/month (locked forever)',
          spotsLeft: 50 - foundingMemberCount,
          benefits: [
            '$29/month locked in forever',
            'AI Product Idea Generator',
            'AI Sales Copywriter',
            'Personal Sales Page Review',
            'Launch Day Promotion',
            'Priority support'
          ],
          badge: {
            emoji: '🚀',
            text: 'Founding Member',
            color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
          },
          isLocked: true,
          source: 'auto'
        };
      }
    }

    // Regular (After first 60)
    return {
      tier: 'regular',
      displayName: 'Member',
      price: 49,
      priceDisplay: '$49/month',
      spotsLeft: null,
      benefits: [
        'Sales page builder',
        'Product delivery system',
        'Custom URLs',
        'Unlimited products',
        'AI Sales Copywriter'
      ],
      badge: {
        emoji: '✨',
        text: 'Join LaunchPad',
        color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30'
      },
      isLocked: false,
      source: 'auto'
    };

  } catch (error) {
    console.error('Error getting auto tier:', error);
    // Fallback to regular tier
    return {
      tier: 'regular',
      displayName: 'Member',
      price: 49,
      priceDisplay: '$49/month',
      spotsLeft: null,
      benefits: ['Sales page builder', 'Product delivery', 'Custom URLs'],
      badge: {
        emoji: '✨',
        text: 'Join LaunchPad',
        color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30'
      },
      isLocked: false,
      source: 'auto'
    };
  }
}

/**
 * Component: Tier Badge Display
 */
export function TierBadge({ tierInfo }: { tierInfo: TierInfo }) {
  if (!tierInfo) return null;

  // Don't show badge for regular tier (default)
  if (tierInfo.tier === 'regular') return null;

  return (
    <div className={`mb-4 p-4 rounded-lg border-2 ${tierInfo.badge.color}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{tierInfo.badge.emoji}</span>
        <span className="font-bold text-lg">
          {tierInfo.badge.text}
        </span>
      </div>
      
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">
          {tierInfo.priceDisplay}
        </span>
        {tierInfo.spotsLeft !== null && (
          <span className="text-xs px-2 py-1 bg-white/10 rounded-full">
            {tierInfo.spotsLeft} {tierInfo.spotsLeft === 1 ? 'spot' : 'spots'} left
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {tierInfo.benefits.slice(0, 4).map((benefit, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-neutral-300">
            <span className="text-emerald-400">✓</span>
            <span>{benefit}</span>
          </div>
        ))}
      </div>

      {tierInfo.source === 'invite' && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-xs text-neutral-400">
            🎟️ Special invite code applied
          </p>
        </div>
      )}
    </div>
  );
}