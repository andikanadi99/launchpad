/**
 * AI Sales Copywriter Service
 * 
 * Frontend helper for calling the generateSalesCopy Cloud Function.
 * Provides type-safe wrappers with error handling and fallbacks.
 */

import { getFunctions, httpsCallable } from 'firebase/functions';

// Initialize Firebase Functions
const functions = getFunctions();

// ============================================
// TYPES
// ============================================

export interface ProductConfig {
  name: string;
  description?: string;
  price?: number;
  priceType?: 'one-time' | 'subscription' | 'payment-plan' | 'free';
  currency?: string;
  valueStack?: string[];
  guarantees?: string[];
  targetAudience?: string;
  mission?: string;
  tierType?: 'low' | 'mid' | 'high';
  productType?: 'course' | 'ebook' | 'coaching' | 'templates' | 'community' | 'custom';
}

export interface GenerateAllResult {
  success: boolean;
  headline?: string;
  tagline?: string;
  description?: string;
  benefits?: string[];
  guarantees?: string[];
  ctaSuggestions?: string[];
  error?: string;
}

export interface EnhanceSingleResult {
  success: boolean;
  enhanced?: string;
  error?: string;
}

export interface SuggestResult {
  success: boolean;
  suggestions?: string[];
  error?: string;
}

// ============================================
// MAIN SERVICE CLASS
// ============================================

class AISalesCopywriter {
  private generateSalesCopyFn = httpsCallable(functions, 'generateSalesCopy');

  /**
   * Generate all sales copy in one call (most efficient)
   * Use when loading from Co-Pilot or need full copy refresh
   */
  async generateAll(productConfig: ProductConfig): Promise<GenerateAllResult> {
    try {
      console.log('Generating all sales copy for:', productConfig.name);
      
      const result = await this.generateSalesCopyFn({
        action: 'generateAll',
        productConfig,
      });

      const data = result.data as any;
      
      if (data.success) {
        return {
          success: true,
          headline: data.headline,
          tagline: data.tagline,
          description: data.description,
          benefits: data.benefits,
          guarantees: data.guarantees,
          ctaSuggestions: data.ctaSuggestions,
        };
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error generating all sales copy:', error);
      return {
        success: false,
        error: (error as any).message || 'Failed to generate copy',
      };
    }
  }

  /**
   * Generate just the headline
   */
  async generateHeadline(
    productConfig: ProductConfig
  ): Promise<{ success: boolean; headline?: string; error?: string }> {
    try {
      const result = await this.generateSalesCopyFn({
        action: 'generateHeadline',
        productConfig,
      });

      const data = result.data as any;
      
      if (data.success) {
        return { success: true, headline: data.headline };
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error generating headline:', error);
      return {
        success: false,
        error: (error as any).message || 'Failed to generate headline',
      };
    }
  }

  /**
   * Generate just the tagline
   */
  async generateTagline(
    productConfig: ProductConfig
  ): Promise<{ success: boolean; tagline?: string; error?: string }> {
    try {
      const result = await this.generateSalesCopyFn({
        action: 'generateTagline',
        productConfig,
      });

      const data = result.data as any;
      
      if (data.success) {
        return { success: true, tagline: data.tagline };
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error generating tagline:', error);
      return {
        success: false,
        error: (error as any).message || 'Failed to generate tagline',
      };
    }
  }

  /**
   * Generate full product description
   */
  async generateDescription(
    productConfig: ProductConfig
  ): Promise<{ success: boolean; description?: string; error?: string }> {
    try {
      const result = await this.generateSalesCopyFn({
        action: 'generateDescription',
        productConfig,
      });

      const data = result.data as any;
      
      if (data.success) {
        return { success: true, description: data.description };
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error generating description:', error);
      return {
        success: false,
        error: (error as any).message || 'Failed to generate description',
      };
    }
  }

  /**
   * Enhance benefits array (transform features → outcomes)
   */
  async enhanceBenefits(
    benefits: string[],
    productConfig: Partial<ProductConfig>
  ): Promise<{ success: boolean; benefits?: string[]; error?: string }> {
    try {
      const result = await this.generateSalesCopyFn({
        action: 'enhanceBenefits',
        benefits,
        productConfig,
      });

      const data = result.data as any;
      
      if (data.success) {
        return { success: true, benefits: data.benefits };
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error enhancing benefits:', error);
      return {
        success: false,
        benefits, // Return original as fallback
        error: (error as any).message || 'Failed to enhance benefits',
      };
    }
  }

  /**
   * Suggest benefits/features to include
   */
  async suggestBenefits(
    productConfig: Partial<ProductConfig>
  ): Promise<SuggestResult> {
    try {
      const result = await this.generateSalesCopyFn({
        action: 'suggestBenefits',
        productConfig,
      });

      const data = result.data as any;
      
      if (data.success) {
        return { success: true, suggestions: data.benefits };
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error suggesting benefits:', error);
      return {
        success: false,
        suggestions: [
          'Step-by-step training videos',
          'Downloadable resources and templates',
          'Lifetime access to all materials',
        ],
        error: (error as any).message || 'Failed to suggest benefits',
      };
    }
  }

  /**
   * Suggest guarantee options
   */
  async suggestGuarantees(
    productConfig: Partial<ProductConfig>
  ): Promise<SuggestResult> {
    try {
      const result = await this.generateSalesCopyFn({
        action: 'suggestGuarantees',
        productConfig,
      });

      const data = result.data as any;
      
      if (data.success) {
        return { success: true, suggestions: data.guarantees };
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error suggesting guarantees:', error);
      return {
        success: false,
        suggestions: [
          '30-day money-back guarantee',
          'Lifetime access included',
          'Free updates forever',
        ],
        error: (error as any).message || 'Failed to suggest guarantees',
      };
    }
  }

  /**
   * Enhance existing guarantees to be more compelling
   */
  async enhanceGuarantees(
    guarantees: string[],
    productConfig: Partial<ProductConfig>
  ): Promise<{ success: boolean; guarantees?: string[]; error?: string }> {
    try {
      const result = await this.generateSalesCopyFn({
        action: 'enhanceGuarantees',
        guarantees,
        productConfig,
      });

      const data = result.data as any;
      
      if (data.success) {
        return { success: true, guarantees: data.guarantees };
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error enhancing guarantees:', error);
      // Fallback: return original guarantees with slight improvement
      return {
        success: true,
        guarantees: guarantees.map(g => {
          if (!g.includes('Guarantee')) {
            return `${g} - Guaranteed`;
          }
          return g;
        }),
      };
    }
  }

  /**
   * Suggest CTA button text options
   */
  async suggestCTA(
    productConfig: Partial<ProductConfig>
  ): Promise<SuggestResult> {
    try {
      const result = await this.generateSalesCopyFn({
        action: 'suggestCTA',
        productConfig,
      });

      const data = result.data as any;
      
      if (data.success) {
        return { success: true, suggestions: data.ctaSuggestions };
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error suggesting CTAs:', error);
      return {
        success: false,
        suggestions: [
          'Get Instant Access',
          'Start Now',
          'Get Started',
          'Join Now',
          'Download Now',
        ],
        error: (error as any).message || 'Failed to suggest CTAs',
      };
    }
  }

  /**
   * Enhance a single piece of text (benefit, feature, etc.)
   */
  async enhanceSingle(
    textToEnhance: string,
    fieldType: 'benefit' | 'headline' | 'tagline' | 'description' | 'guarantee',
    productConfig?: Partial<ProductConfig>
  ): Promise<EnhanceSingleResult> {
    try {
      const result = await this.generateSalesCopyFn({
        action: 'enhanceSingle',
        textToEnhance,
        fieldType,
        ...productConfig,
      });

      const data = result.data as any;
      
      if (data.success) {
        return { success: true, enhanced: data.enhanced };
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error enhancing text:', error);
      return {
        success: false,
        enhanced: textToEnhance, // Return original as fallback
        error: (error as any).message || 'Failed to enhance text',
      };
    }
  }

  /**
   * Improve SEO meta title for better search rankings
   */
  async improveSeoTitle(
    currentTitle: string,
    productConfig: Partial<ProductConfig>
  ): Promise<{ success: boolean; title?: string; error?: string }> {
    try {
      const result = await this.generateSalesCopyFn({
        action: 'improveSeoTitle',
        currentTitle,
        productConfig,
      });

      const data = result.data as any;
      
      if (data.success) {
        return { success: true, title: data.title };
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error improving SEO title:', error);
      return {
        success: true,
        title: currentTitle, // Return original as fallback
      };
    }
  }

  /**
   * Improve SEO meta description for better click-through rates
   */
  async improveSeoDescription(
    currentDescription: string,
    productConfig: Partial<ProductConfig>
  ): Promise<{ success: boolean; description?: string; error?: string }> {
    try {
      const result = await this.generateSalesCopyFn({
        action: 'improveSeoDescription',
        currentDescription,
        productConfig,
      });

      const data = result.data as any;
      
      if (data.success) {
        return { success: true, description: data.description };
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error improving SEO description:', error);
      return {
        success: true,
        description: currentDescription, // Return original as fallback
      };
    }
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const aiCopywriter = new AISalesCopywriter();

// ============================================
// CONVENIENCE HOOKS (for React components)
// ============================================

import { useState, useCallback } from 'react';

/**
 * Hook for generating all copy at once
 */
export function useGenerateAllCopy() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateAllResult | null>(null);

  const generate = useCallback(async (productConfig: ProductConfig) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await aiCopywriter.generateAll(productConfig);
      setResult(response);
      
      if (!response.success) {
        setError(response.error || 'Generation failed');
      }
      
      return response;
    } catch (err) {
      const errorMsg = (err as any).message || 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { generate, isLoading, error, result };
}

/**
 * Hook for generating description only
 */
export function useGenerateDescription() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (productConfig: ProductConfig) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await aiCopywriter.generateDescription(productConfig);
      
      if (!response.success) {
        setError(response.error || 'Generation failed');
      }
      
      return response;
    } catch (err) {
      const errorMsg = (err as any).message || 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { generate, isLoading, error };
}

/**
 * Hook for enhancing benefits
 */
export function useEnhanceBenefits() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enhance = useCallback(async (
    benefits: string[],
    productConfig: Partial<ProductConfig>
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await aiCopywriter.enhanceBenefits(benefits, productConfig);
      
      if (!response.success) {
        setError(response.error || 'Enhancement failed');
      }
      
      return response;
    } catch (err) {
      const errorMsg = (err as any).message || 'Unknown error';
      setError(errorMsg);
      return { success: false, benefits, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { enhance, isLoading, error };
}

/**
 * Hook for enhancing a single text item
 */
export function useEnhanceSingle() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enhance = useCallback(async (
    text: string,
    fieldType: 'benefit' | 'headline' | 'tagline' | 'description' | 'guarantee',
    productConfig?: Partial<ProductConfig>
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await aiCopywriter.enhanceSingle(text, fieldType, productConfig);
      
      if (!response.success) {
        setError(response.error || 'Enhancement failed');
      }
      
      return response;
    } catch (err) {
      const errorMsg = (err as any).message || 'Unknown error';
      setError(errorMsg);
      return { success: false, enhanced: text, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { enhance, isLoading, error };
}

/**
 * Hook for suggesting guarantees
 */
export function useSuggestGuarantees() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const suggest = useCallback(async (productConfig: Partial<ProductConfig>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await aiCopywriter.suggestGuarantees(productConfig);
      
      if (response.success && response.suggestions) {
        setSuggestions(response.suggestions);
      } else {
        setError(response.error || 'Failed to get suggestions');
      }
      
      return response;
    } catch (err) {
      const errorMsg = (err as any).message || 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { suggest, isLoading, error, suggestions };
}

/**
 * Hook for suggesting CTA text
 */
export function useSuggestCTA() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const suggest = useCallback(async (productConfig: Partial<ProductConfig>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await aiCopywriter.suggestCTA(productConfig);
      
      if (response.success && response.suggestions) {
        setSuggestions(response.suggestions);
      } else {
        setError(response.error || 'Failed to get suggestions');
      }
      
      return response;
    } catch (err) {
      const errorMsg = (err as any).message || 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { suggest, isLoading, error, suggestions };
}