import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import { defineSecret } from "firebase-functions/params";
import Anthropic from '@anthropic-ai/sdk';

// Initialize and connect to firebase
admin.initializeApp();
const db = admin.firestore();

// Define the secret
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const claudeApiKey = defineSecret("CLAUDE_API_KEY");

// Read & validate Stripe config at call time (not import time)
function getStripe(secretKey: string) {
  if (!secretKey) {
    throw new Error("Missing Stripe secret key");
  }
  return new Stripe(secretKey, {
    apiVersion: "2025-07-30.basil"
  });
}

// Helper function to strip markdown formatting from AI responses
function stripMarkdownFormatting(text: string): string {
  return text
    // Remove bold markers **text** or __text__
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    // Remove italic markers *text* or _text_
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove any remaining standalone asterisks at line starts (bullet points)
    .replace(/^\s*\*\s+/gm, '- ')
    // Clean up any double spaces
    .replace(/  +/g, ' ')
    .trim();
}

/* 
    Purpose: Generates the OAuth URL to send entrepreneurs to Stripe
*/
export const generateStripeConnectUrl = onRequest(
  { 
    secrets: [stripeSecretKey], 
    cors: true,
    region: "us-central1"
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    console.log("Function called, request body:", JSON.stringify(req.body));
    
    try {
      const { returnUrl } = req.body;
      
      if (!returnUrl) {
        res.status(400).json({ error: 'returnUrl is required' });
        return;
      }
      
      const clientId = "ca_T3lgFY6uTvMT2WFN9oEUIbD7mrhXIGP1";
      
      const connectUrl = 
        `https://connect.stripe.com/oauth/authorize?` +
        `response_type=code&` +
        `client_id=${clientId}&` +
        `scope=read_write&` +
        `redirect_uri=${encodeURIComponent(returnUrl)}&` +
        `state=test_user`;
      
      res.json({ url: connectUrl });
      
    } catch (error) {
      console.error("Error generating connect URL: ", error);
      res.status(500).json({ error: 'Failed to generate connection URL' });
    }
  }
);

/* 
    Purpose: Processes the OAuth callback when entrepreneurs return from Stripe.
*/
export const handleStripeConnect = onRequest(
  { 
    secrets: [stripeSecretKey], 
    cors: true,
    region: "us-central1"
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { code, userId } = req.body;
      
      if (!code || !userId) {
        res.status(400).json({ error: 'Missing code or userId' });
        return;
      }

      // Exchange auth code for access token
      const stripe = getStripe(stripeSecretKey.value());
      const response = await stripe.oauth.token({
        grant_type: "authorization_code",
        code
      });

      // Get user's Stripe ID and Access Token
      const connectedAccountId = response.stripe_user_id as string;
      const accessToken = response.access_token;
      
      // Get Account details
      const account = await stripe.accounts.retrieve(connectedAccountId);

      // Save data to Firestore
      const userRef = db.collection("users").doc(userId);
      await userRef.set({
        stripeConnected: true,
        stripeAccountId: connectedAccountId,
        stripeAccessToken: accessToken,
        stripeAccountDetails: {
          email: account.email,
          country: account.country,
          defaultCurrency: account.default_currency,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
        },
        stripeConnectedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      // Return success object
      res.json({
        success: true,
        accountId: connectedAccountId,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      });
    } catch (error) {
      console.error("Error connecting Stripe: ", error);
      res.status(500).json({ 
        error: (error as any).message || "Failed to connect Stripe account" 
      });
    }
  }
);

// ============================================================
// NEW STRIPE CONNECT FUNCTIONS (Account Links API)
// ============================================================

/*
  Purpose: Creates a Stripe Express connected account (if needed) and
  generates an Account Links onboarding URL for the creator.
  Replaces the old OAuth flow (generateStripeConnectUrl + handleStripeConnect).
*/
export const createConnectAccountLink = onRequest(
  {
    secrets: [stripeSecretKey],
    cors: true,
    region: "us-central1"
  },
  async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { userId, returnUrl, refreshUrl } = req.body;

      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      const stripe = getStripe(stripeSecretKey.value());

      // Check if user already has a connected account
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const userData = userDoc.data()!;
      let stripeConnectAccountId = userData.stripeConnectAccountId;

      // If no existing account, create a new Express account
      if (!stripeConnectAccountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          email: userData.email || undefined,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          metadata: {
            launchpad_user_id: userId,
          },
        });

        stripeConnectAccountId = account.id;

        // Save the account ID to Firestore immediately
        await userRef.set({
          stripeConnectAccountId,
          stripeConnectedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        console.log(`Created new Stripe Express account ${stripeConnectAccountId} for user ${userId}`);
      }

      // Generate the Account Links onboarding URL
      const baseUrl = returnUrl || 'https://launchpad-ec0b0.web.app/onboarding/stripe';
      const baseRefreshUrl = refreshUrl || 'https://launchpad-ec0b0.web.app/onboarding/stripe';

      const accountLink = await stripe.accountLinks.create({
        account: stripeConnectAccountId,
        return_url: baseUrl,
        refresh_url: baseRefreshUrl,
        type: 'account_onboarding',
      });

      res.json({
        url: accountLink.url,
        stripeConnectAccountId,
      });

    } catch (error) {
      console.error("Error creating connect account link:", error);
      res.status(500).json({
        error: (error as any).message || "Failed to create Stripe connect link"
      });
    }
  }
);

/*
  Purpose: Checks the status of a creator's Stripe Connect account.
  Called by the frontend after the creator returns from Stripe onboarding
  to verify their account is fully set up and ready to accept payments.
*/
export const checkStripeAccountStatus = onRequest(
  {
    secrets: [stripeSecretKey],
    cors: true,
    region: "us-central1"
  },
  async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      // Get user's Stripe account ID from Firestore
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const userData = userDoc.data()!;
      const stripeConnectAccountId = userData.stripeConnectAccountId;

      if (!stripeConnectAccountId) {
        res.json({
          connected: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          message: 'No Stripe account found. Please start Stripe onboarding.',
        });
        return;
      }

      // Retrieve the account from Stripe to check its status
      const stripe = getStripe(stripeSecretKey.value());
      const account = await stripe.accounts.retrieve(stripeConnectAccountId);

      const isFullyConnected = account.charges_enabled && account.details_submitted;

      // Update Firestore with the latest status
      await userRef.set({
        stripeConnected: isFullyConnected,
        stripeAccountDetails: {
          email: account.email,
          country: account.country,
          defaultCurrency: account.default_currency,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
        },
        ...(isFullyConnected && {
          'onboardingSteps.stripeConnect': true,
        }),
      }, { merge: true });

      res.json({
        connected: isFullyConnected,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        stripeConnectAccountId,
        message: isFullyConnected
          ? 'Stripe account is fully set up and ready to accept payments.'
          : 'Stripe onboarding is incomplete. Please finish setting up your account.',
      });

    } catch (error) {
      console.error("Error checking Stripe account status:", error);
      res.status(500).json({
        error: (error as any).message || "Failed to check Stripe account status"
      });
    }
  }
);

/* 
    Purpose: Creates a Stripe Checkout session for product purchases
    NOTE: No platform application_fee — LaunchPad uses flat monthly hosting fee model.
    First 5 sales are completely free. Creators keep 100% (minus Stripe processing).
*/
export const createCheckoutSession = onRequest(
  { 
    secrets: [stripeSecretKey], 
    cors: true,
    region: "us-central1"
  },
  async (req, res) => {
    // Manual CORS headers as fallback
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
  
    try {
      const { slug, sellerId, productId, origin } = req.body;
      
      if (!slug || !sellerId) {
        res.status(400).json({ error: 'Missing slug or sellerId' });
        return;
      }
      
      // Read from published_pages collection
      const pageDoc = await db
        .collection('published_pages').doc(slug)
        .get();
        
      if (!pageDoc.exists) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      const product = pageDoc.data()!;

      // Get seller's Stripe account
      const sellerDoc = await db.collection('users').doc(sellerId).get();
      const stripeAccountId = sellerDoc.data()?.stripeConnectAccountId;
      
      if (!stripeAccountId) {
        res.status(400).json({ error: 'Seller not connected to Stripe' });
        return;
      }

      // Read from salesPage.coreInfo
      const salesPage = product.salesPage || {};
      const coreInfo = salesPage.coreInfo || {};
      const productName = coreInfo.name || product.productName || 'Digital Product';
      const productDescription = salesPage.valueProp?.description || coreInfo.tagline || '';
      
      // Price is stored in dollars — convert to cents for Stripe
      const priceInDollars = coreInfo.price ?? product.price ?? 0;
      const priceInCents = Math.round(priceInDollars * 100);

      if (priceInCents <= 0) {
        res.status(400).json({ error: 'Invalid product price' });
        return;
      }

      // Create Checkout session
      const stripe = getStripe(stripeSecretKey.value());
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: coreInfo.currency?.toLowerCase() || 'usd',
            product_data: {
              name: productName,
              ...(productDescription && { description: productDescription.substring(0, 500) }),
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${origin || 'https://launchpad-ec0b0.web.app'}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin || 'https://launchpad-ec0b0.web.app'}/p/${slug}`,
        payment_intent_data: {
          transfer_data: {
            destination: stripeAccountId,
          },
        },
        metadata: {
          slug,
          sellerId,
          productId: productId || product.productId || '',
        }
      });

      res.json({ url: session.url });

    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ 
        error: (error as any).message || "Failed to create checkout session" 
      });
    }
  }
);

/* 
  Purpose: Verifies a Stripe checkout session and returns product + delivery data.
  Called by the customer-facing success page after purchase.
  Also tracks the sale in page_views collection for analytics.
*/
export const verifyPurchase = onRequest(
  { 
    secrets: [stripeSecretKey], 
    cors: true,
    region: "us-central1"
  },
  async (req, res) => {
    // Manual CORS headers as fallback
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        res.status(400).json({ error: 'Missing session ID' });
        return;
      }

      // Retrieve the checkout session from Stripe
      const stripe = getStripe(stripeSecretKey.value());
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (!session || session.payment_status !== 'paid') {
        res.status(400).json({ error: 'Payment not completed' });
        return;
      }

      const { slug, sellerId } = session.metadata || {};
      
      if (!slug || !sellerId) {
        res.status(400).json({ error: 'Invalid session metadata' });
        return;
      }

      // Fetch from published_pages collection
      const pageDoc = await db
        .collection('published_pages').doc(slug)
        .get();
      
      if (!pageDoc.exists) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      const product = pageDoc.data()!;

      // ============================================================
      // Track the sale for analytics (non-blocking)
      // Writes to page_views/{slug} and page_views/{slug}/daily/{date}
      // Same collection that trackPageView uses for views
      // ============================================================
      try {
        const saleDate = new Date().toISOString().split('T')[0];
        const priceInDollars = product.salesPage?.coreInfo?.price ?? product.price ?? 0;

        const pageViewRef = db.collection('page_views').doc(slug);
        const dailyRef = pageViewRef.collection('daily').doc(saleDate);

        const saleBatch = db.batch();

        // Increment total sales + revenue on parent doc
        saleBatch.set(pageViewRef, {
          totalSales: admin.firestore.FieldValue.increment(1),
          totalRevenue: admin.firestore.FieldValue.increment(priceInDollars),
          sellerId: sellerId || '',
        }, { merge: true });

        // Increment daily sales + revenue
        saleBatch.set(dailyRef, {
          sales: admin.firestore.FieldValue.increment(1),
          revenue: admin.firestore.FieldValue.increment(priceInDollars),
          date: saleDate,
        }, { merge: true });

        await saleBatch.commit();
        console.log(`Sale tracked for ${slug}: $${priceInDollars}`);
      } catch (trackErr) {
        // Never let tracking errors block purchase verification
        console.error('Error tracking sale (non-blocking):', trackErr);
      }

      const delivery = product.delivery || {};
      const salesPage = product.salesPage || {};

      // Return product + delivery data (no sensitive info)
      res.json({
        success: true,
        product: {
          name: salesPage.coreInfo?.name || product.productName || 'Your Product',
          description: salesPage.valueProp?.description || salesPage.coreInfo?.tagline || '',
        },
        delivery: {
          method: delivery.deliveryMethod || 'email-only',
          email: {
            subject: delivery.email?.subject || '',
            body: delivery.email?.body || '',
            includeAccessButton: delivery.email?.includeAccessButton ?? true,
          },
          hosted: {
            files: delivery.hosted?.files || [],
            videos: delivery.hosted?.videos || [],
            notionUrl: delivery.hosted?.notionUrl || '',
            hasCustomContent: delivery.hosted?.hasCustomContent || false,
            contentBlocks: delivery.hosted?.contentBlocks || '[]',
            pageTitle: delivery.hosted?.pageTitle || '',
            pageSubtitle: delivery.hosted?.pageSubtitle || '',
            headerStyles: delivery.hosted?.headerStyles || {},
            pageBgColor: delivery.hosted?.pageBgColor || '#ffffff',
            pageTheme: delivery.hosted?.pageTheme || 'light',
          },
          redirect: {
            url: delivery.redirect?.url || '',
            delay: delivery.redirect?.delay || 0,
            showThankYou: delivery.redirect?.showThankYou ?? true,
          },
          design: {
            backgroundColor: delivery.design?.backgroundColor || '#ffffff',
            accentColor: delivery.design?.accentColor || '#4f46e5',
            logoUrl: delivery.design?.logoUrl || '',
            headingText: delivery.design?.headingText || 'Thank you for your purchase!',
            subText: delivery.design?.subText || "Here's your access to {{product_name}}",
            ...(delivery.design || {}),
          },
        },
        customerEmail: session.customer_details?.email || '',
        customerName: session.customer_details?.name || '',
      });

    } catch (error) {
      console.error("Error verifying purchase:", error);
      res.status(500).json({ 
        error: (error as any).message || "Failed to verify purchase" 
      });
    }
  }
);

/* 
  Purpose: Improves user's answers using Claude AI for the Product Idea Generator
*/
export const improveAnswer = onRequest(
  { 
    secrets: [claudeApiKey], 
    cors: true,
    region: "us-central1",
    maxInstances: 10,
  },
  async (req, res) => {
    console.log('improveAnswer function called');
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      console.log('Method not allowed:', req.method);
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      // Check if this is a callable function request (has data wrapper)
      let requestData = req.body;
      if (req.body.data) {
        console.log('Found data wrapper, extracting nested data');
        requestData = req.body.data;
      }

      const { userId, questionId, originalAnswer, questionText, previousAnswers } = requestData;
      
      // Validate required fields
      if (!userId || !questionId || !originalAnswer || !questionText) {
        console.log('Validation failed - missing fields');
        res.status(400).json({ 
          data: {
            error: 'Missing required fields',
          }
        });
        return;
      }

      console.log('Validation passed, initializing Anthropic client');
      
      // Initialize Anthropic client
      const anthropic = new Anthropic({
        apiKey: claudeApiKey.value(),
      });

      // Simple, clean system prompt with STRICT formatting rules
      let systemPrompt = `You are improving an entrepreneur's answer to make it more specific and actionable.

Core principles:
- Add specific details where vague
- Keep the original voice and tone
- Make it actionable
- Keep it simple and conversational

CRITICAL FORMATTING RULES (NEVER VIOLATE):
- NEVER use asterisks (*) for any purpose - not for bold, not for bullets, not for emphasis
- NEVER use markdown formatting of any kind
- Write in plain text only
- Use "-" if you need bullet points, never "*"
- Use labels like "At work:" instead of bold headers`;

      let improvePrompt = `Original Answer: ${originalAnswer}

Make this answer more specific and valuable by:
1. Adding concrete details (numbers, timeframes)
2. Keeping it simple and conversational
3. Maintaining their voice

CRITICAL - DO NOT:
- Use asterisks (*) for ANY purpose - no bold, no bullets, no emphasis
- Use ANY markdown formatting
- Make assumptions about their exact situation
- Use dramatic language
- Make it longer than the original

Output plain text only. Keep improvements natural and under 150 words.`;

      // Question-specific improvements - each uses relevant previous answers
      if (questionId === 'actual_requests') {
        // Uses: craft_skills
        const skills = previousAnswers?.craft_skills || [];
        
        improvePrompt += `

CONTEXT: Their skills: ${JSON.stringify(skills, null, 2)}

Improve their list by:
- Making requests more specific (not "help with code" but "review React components")
- Connecting each request to their actual skills above
- Adding frequency if relevant (weekly, monthly)
- Plain text only, no asterisks`;

      } else if (questionId === 'confidence_test') {
        // Uses: craft_skills, actual_requests
        const skills = previousAnswers?.craft_skills || [];
        const requests = previousAnswers?.actual_requests || '';
        
        improvePrompt += `

CONTEXT:
Their skills: ${JSON.stringify(skills, null, 2)}
What people ask them for: ${requests}

Improve by:
- Ensuring services connect to their skills and requests
- Making service descriptions more specific
- Keeping it to 2-3 sentences max
- Plain text only, no asterisks`;

      } else if (questionId === 'target_who') {
        // Uses: craft_skills, actual_requests, confidence_test
        const skills = previousAnswers?.craft_skills || [];
        const requests = previousAnswers?.actual_requests || '';
        const chargeableServices = previousAnswers?.confidence_test || '';
        
        improvePrompt += `

CONTEXT:
Their skills: ${JSON.stringify(skills, null, 2)}
What people ask them for: ${requests}
Services they could charge for: ${chargeableServices}

Improve by:
- Making each audience MORE SPECIFIC (not "business owners" but "SaaS founders under $1M")
- Connecting each audience to their actual skills
- Ensuring audiences would PAY for their services
- Plain text only, no asterisks`;

      } else if (questionId === 'target_outcome') {
        // Uses: craft_skills, confidence_test, target_who
        const skills = previousAnswers?.craft_skills || [];
        const chargeableServices = previousAnswers?.confidence_test || '';
        const targetAudiences = previousAnswers?.target_who || [];
        
        improvePrompt += `

CONTEXT:
Their skills: ${JSON.stringify(skills, null, 2)}
Chargeable services: ${chargeableServices}
Target audiences: ${JSON.stringify(targetAudiences, null, 2)}

Improve by:
- Having a SEPARATE section for EACH audience
- Connecting outcomes to their actual skills/services
- Including measurable results ($X revenue, Y clients)
- Adding "Why this works for you:" section
- Plain text only, no asterisks`;

      } else if (questionId === 'mission_statement') {
        // Uses: craft_skills, target_who, target_outcome
        const skills = previousAnswers?.craft_skills || [];
        const targetAudiences = previousAnswers?.target_who || [];
        const targetOutcome = previousAnswers?.target_outcome || '';
        
        improvePrompt += `

CONTEXT:
Their skills: ${JSON.stringify(skills, null, 2)}
Target audiences: ${JSON.stringify(targetAudiences, null, 2)}
Target outcome: ${targetOutcome}

Improve following Hormozi's Value Equation:
- ONE or TWO sentences maximum
- Include: WHO + OUTCOME + TIMEFRAME + "without [obstacle]"
- Use their exact audience descriptions
- Extract core measurable outcome
- Plain text only, no asterisks`;

      } else if (questionId === 'dream_outcome') {
        // Uses: target_who, target_outcome, mission_statement
        const targetAudiences = previousAnswers?.target_who || [];
        const targetOutcome = previousAnswers?.target_outcome || '';
        const mission = previousAnswers?.mission_statement || '';
        
        improvePrompt += `

CONTEXT:
Target audiences: ${JSON.stringify(targetAudiences, null, 2)}
Target outcome: ${targetOutcome}
Mission: ${mission}

Improve by:
- Connecting the deeper desire to their specific audiences
- Going beyond surface results to emotional outcomes
- Keeping it to 2-3 sentences
- Plain text only, no asterisks`;

      } else if (questionId === 'speed_to_value') {
        // Uses: craft_skills, target_who, target_outcome
        const skills = previousAnswers?.craft_skills || [];
        const targetAudiences = previousAnswers?.target_who || [];
        const targetOutcome = previousAnswers?.target_outcome || '';
        
        improvePrompt += `

CONTEXT:
Their skills: ${JSON.stringify(skills, null, 2)}
Target audiences: ${JSON.stringify(targetAudiences, null, 2)}
Target outcome: ${targetOutcome}

Improve by:
- Making milestones specific to their skills
- Ensuring Day 30 milestone matches their target_outcome
- Keeping format: Day 1 / Week 1 / Day 30
- Plain text only, no asterisks`;

      } else if (questionId === 'effort_reducers') {
        // Uses: craft_skills, target_who, target_outcome
        const skills = previousAnswers?.craft_skills || [];
        const targetAudiences = previousAnswers?.target_who || [];
        const targetOutcome = previousAnswers?.target_outcome || '';
        
        improvePrompt += `

CONTEXT:
Their skills: ${JSON.stringify(skills, null, 2)}
Target audiences: ${JSON.stringify(targetAudiences, null, 2)}
Target outcome: ${targetOutcome}

Improve by:
- Connecting effort reducers to their specific audiences
- Showing how each tool helps achieve target_outcome
- Keeping it to 2-3 sentences
- Plain text only, no asterisks`;

      } else if (questionId === 'value_stack') {
        // Uses: ALL previous answers
        const skills = previousAnswers?.craft_skills || [];
        const chargeableServices = previousAnswers?.confidence_test || '';
        const targetAudiences = previousAnswers?.target_who || [];
        const targetOutcome = previousAnswers?.target_outcome || '';
        const dreamOutcome = previousAnswers?.dream_outcome || '';
        
        improvePrompt += `

CONTEXT:
Their skills: ${JSON.stringify(skills, null, 2)}
Chargeable services: ${chargeableServices}
Target audiences: ${JSON.stringify(targetAudiences, null, 2)}
Target outcome: ${targetOutcome}
Dream outcome: ${dreamOutcome}

Improve by:
- Connecting each bonus to their actual skills
- Addressing specific audience fears/objections
- Ensuring values are realistic ($97-$497)
- Plain numbered list, no asterisks`;
      }

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: improvePrompt
          }
        ],
      });

      const rawImprovedAnswer = message.content[0].type === 'text' 
        ? message.content[0].text 
        : originalAnswer;

      // Strip any markdown formatting that slipped through
      const improvedAnswer = stripMarkdownFormatting(rawImprovedAnswer);

      // Log usage for cost tracking
      await db.collection('ai_usage').add({
        userId,
        questionId,
        type: 'improve',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        inputTokens: message.usage?.input_tokens || 0,
        outputTokens: message.usage?.output_tokens || 0,
        model: 'claude-sonnet-4-20250514',
      });

      // Return the improved answer
      res.json({
        data: {
          success: true,
          improvedAnswer,
          originalAnswer,
        }
      });

    } catch (error) {
      console.error("Error in improveAnswer function:", error);
      res.status(500).json({ 
        data: {
          error: 'Failed to improve answer. Please try again.',
          details: (error as any).message 
        }
      });
    }
  }
);

/* 
  Purpose: Generates optimal answers using Claude AI for the Product Idea Generator
*/
export const generateOptimalAnswer = onRequest(
  { 
    secrets: [claudeApiKey], 
    cors: true,
    region: "us-central1",
    maxInstances: 10,
  },
  async (req, res) => {
    console.log('generateOptimalAnswer function called');
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      // Handle data wrapper
      let requestData = req.body;
      if (req.body.data) {
        requestData = req.body.data;
      }

      const { userId, questionId, questionText, questionSubtext, previousAnswers } = requestData;
      
      console.log('Generating optimal answer for question:', questionId);

      // Validate required fields
      if (!userId || !questionId || !questionText) {
        res.status(400).json({ 
          data: {
            error: 'Missing required fields',
          }
        });
        return;
      }

      // Initialize Anthropic client
      const anthropic = new Anthropic({
        apiKey: claudeApiKey.value(),
      });

      // Clean, simple system prompt with explicit formatting rules
      let systemPrompt = `You are a business coach helping entrepreneurs identify their skills and opportunities.

Write simple, conversational answers that:
- Use specific examples from their background
- Sound authentic, like they wrote it themselves
- Stay concise and factual
- Focus on what actually happens, not analysis

CRITICAL FORMATTING RULES (NEVER VIOLATE):
- NEVER use asterisks (*) for any purpose - not for bold, not for bullets, not for emphasis
- NEVER use markdown formatting of any kind (**bold**, *italic*, etc.)
- Write in plain text only
- Use "-" if you need bullet points, never "*"
- Use labels like "At work:" or "For beginners:" instead of bold headers

Avoid:
- Any special formatting symbols
- Overly dramatic language
- Too many assumptions
- Complex explanations`;

      let userPrompt = `Question: ${questionText}
${questionSubtext ? `Additional context: ${questionSubtext}` : ''}

User's background and skills:
${JSON.stringify(previousAnswers, null, 2)}

Generate a simple, authentic answer based on their actual experience.`;

      // Special handling for specific questions - each uses relevant previous answers
      if (questionId === 'actual_requests') {
        // Uses: craft_skills
        const skills = previousAnswers?.craft_skills || [];
        
        userPrompt += `

CONTEXT FROM PREVIOUS ANSWERS:
Their skills: ${JSON.stringify(skills, null, 2)}

Based on these skills, write a list of what people actually ask them for help with.

At work: What do colleagues or bosses ask you to do?
From friends/family: What help do they seek from you?
Online: What questions do you get asked?

Connect each request to their actual skills listed above.
Keep it conversational and specific. Write in first person.
NO formatting symbols or asterisks.`;

      } else if (questionId === 'confidence_test') {
        // Uses: craft_skills, actual_requests
        const skills = previousAnswers?.craft_skills || [];
        const requests = previousAnswers?.actual_requests || '';
        
        userPrompt += `

CONTEXT FROM PREVIOUS ANSWERS:
Their skills: ${JSON.stringify(skills, null, 2)}
What people ask them for: ${requests}

Based on these skills and requests, generate a short answer about what services they could charge $50/hour for TODAY.

EXACT FORMAT: "I could charge $50/hour for [specific service]. I could also offer [service 2] and [service 3] at similar rates."

RULES:
- Maximum 2-3 sentences, under 75 words
- Services must connect to their actual skills and requests above
- NO asterisks, NO formatting, plain text only`;

      } else if (questionId === 'target_who') {
        // Uses: craft_skills, actual_requests, confidence_test
        const skills = previousAnswers?.craft_skills || [];
        const requests = previousAnswers?.actual_requests || '';
        const chargeableServices = previousAnswers?.confidence_test || '';
        
        userPrompt += `

CONTEXT FROM PREVIOUS ANSWERS:
Their skills: ${JSON.stringify(skills, null, 2)}
What people ask them for: ${requests}
Services they could charge $50/hour for: ${chargeableServices}

Based on their skills and what people already ask them for, suggest which audience categories would be the BEST fit.

FORMAT:
"Based on your skills in [skills] and the requests you get for [requests], here are the audiences who would benefit most:

1. [Audience] - specifically [niche]. These people need [what you offer] because [pain point].
2. [Audience] - specifically [niche]. They're looking for [what you offer] to solve [problem].
3. [Audience] - specifically [niche]. Your experience with [skill] is exactly what they need."

RULES:
- Suggest 2-4 audiences that MATCH their actual skills
- Give SPECIFIC niches (not "business owners" but "SaaS founders under $1M")
- Focus on audiences who would PAY for their services
- Plain text only, no asterisks`;

      } else if (questionId === 'target_outcome') {
        // Uses: craft_skills, confidence_test, target_who
        const skills = previousAnswers?.craft_skills || [];
        const chargeableServices = previousAnswers?.confidence_test || '';
        const targetAudiences = previousAnswers?.target_who || [];
        
        userPrompt += `

CONTEXT FROM PREVIOUS ANSWERS:
Their skills: ${JSON.stringify(skills, null, 2)}
Services they could charge for: ${chargeableServices}
Target audiences: ${JSON.stringify(targetAudiences, null, 2)}

Generate a SEPARATE outcome section for EACH audience they selected.

Structure for EACH audience:
"For [audience]: I'll help them [outcome based on their skills/services] within [timeframe]. 
The concrete result: [what they'll have]. [Why this matters to THIS audience]."

RULES:
- Create a paragraph for EACH audience
- Connect outcomes to their actual skills and chargeable services
- Include measurable results ($X revenue, Y clients)
- Keep each section to 2-3 sentences
- End with "Why this works for you:" connecting to their skills
- Plain text only, no asterisks`;

      } else if (questionId === 'mission_statement') {
        // Uses: craft_skills, target_who, target_outcome
        const skills = previousAnswers?.craft_skills || [];
        const targetAudiences = previousAnswers?.target_who || [];
        const targetOutcome = previousAnswers?.target_outcome || '';
        
        userPrompt += `

CONTEXT FROM PREVIOUS ANSWERS:
Their skills: ${JSON.stringify(skills, null, 2)}
Target audiences: ${JSON.stringify(targetAudiences, null, 2)}
Target outcome: ${targetOutcome}

Create a mission statement following Hormozi's Value Equation:
- OUTCOME: Focus on the result, not process
- SPEED: How fast they'll achieve it
- EFFORT: Make it sound simple
- CERTAINTY: Why this will work

FORMAT: "I help [WHO from target_who] [OUTCOME from target_outcome] in [TIMEFRAME] without [obstacle]."

RULES:
- ONE or TWO sentences maximum
- Use their exact audience descriptions
- Extract the CORE measurable outcome
- Include timeframe and "without" clause
- Plain text only, no asterisks`;

      } else if (questionId === 'dream_outcome') {
        // Uses: target_who, target_outcome, mission_statement
        const targetAudiences = previousAnswers?.target_who || [];
        const targetOutcome = previousAnswers?.target_outcome || '';
        const mission = previousAnswers?.mission_statement || '';
        
        userPrompt += `

CONTEXT FROM PREVIOUS ANSWERS:
Target audiences: ${JSON.stringify(targetAudiences, null, 2)}
Target outcome: ${targetOutcome}
Mission statement: ${mission}

Write 2-3 sentences about what their customers REALLY want beyond the surface.

FORMAT: "They don't just want [surface result from target_outcome]. They want [deeper desire]. Ultimately, they dream of [end state]."

Connect the deeper desire to their specific audiences.
Keep it human and relatable. NO asterisks or formatting.`;

      } else if (questionId === 'speed_to_value') {
        // Uses: craft_skills, target_who, target_outcome
        const skills = previousAnswers?.craft_skills || [];
        const targetAudiences = previousAnswers?.target_who || [];
        const targetOutcome = previousAnswers?.target_outcome || '';
        
        userPrompt += `

CONTEXT FROM PREVIOUS ANSWERS:
Their skills: ${JSON.stringify(skills, null, 2)}
Target audiences: ${JSON.stringify(targetAudiences, null, 2)}
Target outcome: ${targetOutcome}

Create a timeline showing quick wins based on their actual skills and what they promised in target_outcome:

Day 1: [First small result they can deliver]
Week 1: [Visible progress toward target_outcome]
Day 30: [Major outcome matching target_outcome]

Make each milestone specific to their skills and audiences.
One line each. NO asterisks or formatting.`;

      } else if (questionId === 'effort_reducers') {
        // Uses: craft_skills, target_who, target_outcome
        const skills = previousAnswers?.craft_skills || [];
        const targetAudiences = previousAnswers?.target_who || [];
        const targetOutcome = previousAnswers?.target_outcome || '';
        
        userPrompt += `

CONTEXT FROM PREVIOUS ANSWERS:
Their skills: ${JSON.stringify(skills, null, 2)}
Target audiences: ${JSON.stringify(targetAudiences, null, 2)}
Target outcome: ${targetOutcome}

Based on what they selected and their skills, explain how these tools reduce effort for their specific audiences.
Connect each effort reducer to their target_outcome.
Keep it to 2-3 sentences, conversational. Plain text only.`;

      } else if (questionId === 'value_stack') {
        // Uses: ALL previous answers
        const skills = previousAnswers?.craft_skills || [];
        const chargeableServices = previousAnswers?.confidence_test || '';
        const targetAudiences = previousAnswers?.target_who || [];
        const targetOutcome = previousAnswers?.target_outcome || '';
        const mission = previousAnswers?.mission_statement || '';
        const dreamOutcome = previousAnswers?.dream_outcome || '';
        
        userPrompt += `

CONTEXT FROM ALL PREVIOUS ANSWERS:
Their skills: ${JSON.stringify(skills, null, 2)}
Chargeable services: ${chargeableServices}
Target audiences: ${JSON.stringify(targetAudiences, null, 2)}
Target outcome: ${targetOutcome}
Mission: ${mission}
Dream outcome: ${dreamOutcome}

List 5-7 bonuses they could offer based on their ACTUAL skills and their audiences' needs:

1. [Bonus based on their skill] - [How it helps audience achieve target_outcome] ($[value])
2. [Bonus from chargeable services] - [Addresses audience pain point] ($[value])
...

RULES:
- Each bonus must connect to their skills or services
- Address specific fears/objections their audiences have
- Values in $97-$497 range
- Plain numbered list, no asterisks`;
      }

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        temperature: 0.8,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ],
      });

      const rawGeneratedAnswer = message.content[0].type === 'text' 
        ? message.content[0].text 
        : '';

      // Strip any markdown formatting that slipped through
      const generatedAnswer = stripMarkdownFormatting(rawGeneratedAnswer);

      // Log usage
      await db.collection('ai_usage').add({
        userId,
        questionId,
        type: 'generate_optimal',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        inputTokens: message.usage?.input_tokens || 0,
        outputTokens: message.usage?.output_tokens || 0,
        model: 'claude-sonnet-4-20250514',
      });

      // Return the generated answer
      res.json({
        data: {
          success: true,
          generatedAnswer,
        }
      });

    } catch (error) {
      console.error("Error generating optimal answer:", error);
      res.status(500).json({ 
        data: {
          error: 'Failed to generate answer. Please try again.',
          details: (error as any).message 
        }
      });
    }
  }
);

/* 
  Purpose: Generates optimized product idea using Claude AI based on Co-Pilot answers.
  Uses $100M Offers principles (without mentioning the book):
  - Value = Dream Outcome x Perceived Likelihood / Time Delay x Effort
  - Value stacking
  - Risk reversal guarantees
  - Specificity beats vagueness
*/
export const generateProductIdea = onRequest(
  { 
    secrets: [claudeApiKey], 
    cors: true,
    region: "us-central1",
    maxInstances: 10,
    timeoutSeconds: 60,
  },
  async (req, res) => {
    console.log('generateProductIdea function called');
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      // Handle data wrapper (from httpsCallable)
      let requestData = req.body;
      if (req.body.data) {
        requestData = req.body.data;
      }

      const { userId, tier, answers } = requestData;
      
      console.log('Generating product idea for tier:', tier);

      // Validate required fields
      if (!userId || !tier || !answers) {
        res.status(400).json({ 
          data: {
            error: 'Missing required fields: userId, tier, answers',
          }
        });
        return;
      }

      // Validate tier
      if (!['low', 'mid', 'high'].includes(tier)) {
        res.status(400).json({ 
          data: {
            error: 'Invalid tier. Must be: low, mid, or high',
          }
        });
        return;
      }

      // Initialize Anthropic client
      const anthropic = new Anthropic({
        apiKey: claudeApiKey.value(),
      });

      // Tier configurations
      const tierConfig = {
        low: {
          priceRange: '$27-97',
          priceDefault: 47,
          type: 'Quick Win / Starter Product',
          deliveryStyle: 'Self-paced guide, templates, or mini-course',
          timeToResult: '24-48 hours to first win',
          idealFor: 'Testing demand, building audience, low-risk entry for customers'
        },
        mid: {
          priceRange: '$197-497',
          priceDefault: 297,
          type: 'Core Transformation Product',
          deliveryStyle: 'Complete course, workshop, or group program',
          timeToResult: '2-4 weeks for full transformation',
          idealFor: 'Proven demand, delivering real results, main revenue driver'
        },
        high: {
          priceRange: '$997-2997',
          priceDefault: 1497,
          type: 'Premium / High-Touch Program',
          deliveryStyle: '1-on-1 coaching, done-with-you, or VIP experience',
          timeToResult: '30-90 days with personal support',
          idealFor: 'High expertise, fewer clients, maximum results'
        }
      };

      const config = tierConfig[tier as keyof typeof tierConfig];

      // Extract key info from answers
      const craftSkills = answers.craft_skills || [];
      const targetWho = answers.target_who || [];
      const targetOutcome = answers.target_outcome || '';
      const primaryTarget = answers.primary_target || '';
      const missionStatement = answers.mission_statement || '';
      const dreamOutcome = answers.dream_outcome || '';

      // Build context about the user's expertise
      const skillsContext = craftSkills.map((s: any) => {
        const value = typeof s === 'object' ? s.value : s;
        const custom = typeof s === 'object' ? s.custom : '';
        return custom ? `${value}: ${custom}` : value;
      }).join(', ');

      // Build context about target audience
      const audienceContext = targetWho.map((t: any) => {
        const value = typeof t === 'object' ? t.value : t;
        const custom = typeof t === 'object' ? t.custom : '';
        return custom ? `${value}: ${custom}` : value;
      }).join(', ');

      // Extract primary target label (handles object or string)
      let primaryTargetLabel = '';
      if (typeof primaryTarget === 'object') {
        primaryTargetLabel = primaryTarget.custom || primaryTarget.label || primaryTarget.value || '';
      } else {
        primaryTargetLabel = primaryTarget || '';
      }
      // Clean up any index suffix like _0, _1
      primaryTargetLabel = primaryTargetLabel.replace(/_\d+$/, '');

      // System prompt with $100M Offers principles (without mentioning the book)
      const systemPrompt = `You are an expert product strategist who helps creators build irresistible offers.

Your approach to creating valuable products:

1. VALUE EQUATION: Value = (Dream Outcome x Perceived Likelihood) / (Time Delay x Effort Required)
   - Maximize the dream outcome and likelihood of success
   - Minimize time to results and effort required from customer

2. SPECIFICITY: Vague promises are weak. Specific, concrete outcomes are powerful.
   - "Lose weight" is weak. "Lose 15 pounds in 8 weeks without giving up carbs" is strong.
   - Name the transformation, timeline, and method.

3. VALUE STACKING: Each bonus should solve a specific problem on the journey to the main outcome.
   - Bonuses should be worth more than the price alone
   - Each item answers "what else do they need to succeed?"

4. RISK REVERSAL: Strong guarantees increase perceived likelihood of success.
   - Results-based guarantees are strongest
   - Remove all risk from the customer

5. NAMING: Product names should promise a specific outcome or transformation.
   - Avoid generic names like "Course" or "Program"
   - Use outcome-focused names that create desire

FORMAT RULES:
- Return ONLY valid JSON, no markdown, no code blocks
- Use plain text in all string fields (no asterisks, no bold, no formatting)
- Keep descriptions concise but compelling
- Be specific, not generic`;

      const userPrompt = `Create a ${config.type} (${config.priceRange}) based on this creator's expertise and target audience.

CREATOR'S BACKGROUND:
- Skills/Expertise: ${skillsContext}
- Mission: ${missionStatement}

TARGET AUDIENCE:
- Who they help: ${audienceContext}
- Primary focus: ${primaryTargetLabel}
- Specific outcome: ${targetOutcome}
- Dream transformation: ${dreamOutcome}

PRODUCT REQUIREMENTS:
- Price Range: ${config.priceRange}
- Delivery Style: ${config.deliveryStyle}
- Expected Time to Result: ${config.timeToResult}
- Ideal For: ${config.idealFor}

Generate a compelling product with:

1. NAME: A specific, outcome-focused product name (not generic like "Ultimate Course")

2. DESCRIPTION: 2-3 sentences that clearly state:
   - WHO it's for (specific person)
   - WHAT transformation they'll achieve
   - HOW FAST they'll see results
   - WHY this approach works

3. PRICE: Specific price within ${config.priceRange} range (just the number)

4. VALUE_STACK: 5-7 specific items included, each solving a problem on the path to success. Format each as:
   - Item name that promises a result
   - Brief description of what it does/includes

5. GUARANTEES: 1-2 strong guarantees that reverse risk. Be specific about the promise.

Return as JSON object with this exact structure:
{
  "name": "Product Name Here",
  "description": "2-3 sentence description here",
  "price": 97,
  "valueStack": [
    "Item 1: Description",
    "Item 2: Description",
    "Item 3: Description",
    "Item 4: Description",
    "Item 5: Description"
  ],
  "guarantees": [
    "Guarantee 1 description",
    "Guarantee 2 description"
  ],
  "targetAudience": "One sentence describing ideal customer",
  "mainOutcome": "Primary transformation in one sentence",
  "timeToResult": "Specific timeline",
  "whyItWorks": "One sentence on why this approach works"
}

Return ONLY the JSON object, nothing else.`;

      console.log('Calling Claude API...');
      
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ],
      });

      const responseText = message.content[0].type === 'text' 
        ? message.content[0].text 
        : '';

      console.log('Claude response received, parsing JSON...');

      // Parse the JSON response
      let productData;
      try {
        // Clean up potential markdown code blocks
        let cleanedResponse = responseText.trim();
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.slice(7);
        }
        if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.slice(3);
        }
        if (cleanedResponse.endsWith('```')) {
          cleanedResponse = cleanedResponse.slice(0, -3);
        }
        cleanedResponse = cleanedResponse.trim();
        
        productData = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Raw response:', responseText);
        
        // Return a fallback product
        productData = {
          name: tier === 'low' ? 'Quick Start Guide' : tier === 'mid' ? 'Complete Transformation System' : 'VIP Implementation Program',
          description: `Help ${primaryTargetLabel || 'your ideal customers'} achieve ${targetOutcome || 'their goals'} with this ${config.type.toLowerCase()}.`,
          price: config.priceDefault,
          valueStack: [
            'Core training content',
            'Action worksheets and templates',
            'Quick-start checklist',
            'Email support access',
            'Bonus resource guide'
          ],
          guarantees: [
            '30-day money back guarantee if you do the work and don\'t see results',
            'Lifetime access to all materials and updates'
          ],
          targetAudience: primaryTargetLabel || 'People ready to transform',
          mainOutcome: targetOutcome || 'Achieve meaningful results',
          timeToResult: config.timeToResult,
          whyItWorks: 'Based on proven methods and real-world experience'
        };
      }

      // Strip markdown formatting from all string fields
      if (productData.name) productData.name = stripMarkdownFormatting(productData.name);
      if (productData.description) productData.description = stripMarkdownFormatting(productData.description);
      if (productData.targetAudience) productData.targetAudience = stripMarkdownFormatting(productData.targetAudience);
      if (productData.mainOutcome) productData.mainOutcome = stripMarkdownFormatting(productData.mainOutcome);
      if (productData.timeToResult) productData.timeToResult = stripMarkdownFormatting(productData.timeToResult);
      if (productData.whyItWorks) productData.whyItWorks = stripMarkdownFormatting(productData.whyItWorks);
      if (productData.valueStack && Array.isArray(productData.valueStack)) {
        productData.valueStack = productData.valueStack.map((item: string) => stripMarkdownFormatting(item));
      }
      if (productData.guarantees && Array.isArray(productData.guarantees)) {
        productData.guarantees = productData.guarantees.map((item: string) => stripMarkdownFormatting(item));
      }

      // Ensure price is within range
      const priceRanges = {
        low: { min: 27, max: 97 },
        mid: { min: 197, max: 497 },
        high: { min: 997, max: 2997 }
      };
      const range = priceRanges[tier as keyof typeof priceRanges];
      if (productData.price < range.min) productData.price = range.min;
      if (productData.price > range.max) productData.price = range.max;

      // Add tier info to response
      productData.tier = tier;
      productData.priceType = tier;

      // Log usage for cost tracking
      await db.collection('ai_usage').add({
        userId,
        type: 'generate_product_idea',
        tier,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        inputTokens: message.usage?.input_tokens || 0,
        outputTokens: message.usage?.output_tokens || 0,
        model: 'claude-sonnet-4-20250514',
      });

      console.log('Product generated successfully:', productData.name);

      // Return the generated product
      res.json({
        data: {
          success: true,
          product: productData,
        }
      });

    } catch (error) {
      console.error("Error generating product idea:", error);
      res.status(500).json({ 
        data: {
          error: 'Failed to generate product idea. Please try again.',
          details: (error as any).message 
        }
      });
    }
  }
);

/*
  ============================================================================
  AI SALES COPYWRITER
  ============================================================================
  Purpose: Generates and enhances sales copy for product pages.
  Uses value-focused principles to maximize perceived value.
  
  Actions:
  - generateHeadline: Creates compelling headline from product info
  - generateTagline: Creates subheadline with time/effort focus
  - generateDescription: Concise product description (what it is, who it's for, key outcome)
  - enhanceBenefits: Transforms features into outcomes
  - suggestGuarantees: Generates risk reversal options
  - suggestCTA: Suggests call-to-action button text
  - generateAll: Complete copy package in one call
*/
export const generateSalesCopy = onRequest(
  { 
    secrets: [claudeApiKey], 
    cors: true,
    region: "us-central1",
    maxInstances: 10,
  },
  async (req, res) => {
    console.log('generateSalesCopy function called');
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      // Extract request data (handle callable function wrapper)
      let requestData = req.body;
      if (req.body.data) {
        requestData = req.body.data;
      }

      const { 
        action,           // Which generation to perform
        productConfig,    // Full product config from Co-Pilot or form
        // Individual fields for specific actions
        name,
        description,
        price,
        benefits,
        targetAudience,
        productType,
        guarantees,
      } = requestData;

      if (!action) {
        res.status(400).json({ 
          data: { error: 'Missing required field: action' }
        });
        return;
      }

      console.log('Action requested:', action);

      // Initialize Anthropic client
      const anthropic = new Anthropic({
        apiKey: claudeApiKey.value(),
      });

      // ========================================
      // SYSTEM PROMPT: Value-Focused Copywriting
      // ========================================
      const systemPrompt = `You are an expert sales copywriter who creates high-converting product descriptions. Your copy focuses on VALUE and TRANSFORMATION, not features.

CORE PRINCIPLES:
1. Lead with the DREAM OUTCOME - what transformation will they achieve?
2. Minimize perceived TIME - how fast will they get results?
3. Minimize perceived EFFORT - how easy is the process?
4. Maximize BELIEVABILITY - why should they trust this works?

WRITING RULES:
- Write in second person ("you" not "they")
- Be specific with numbers and timeframes when possible
- Focus on outcomes, not features
- Use plain, conversational language
- Be professional but not corporate
- Never use hype words like "amazing", "incredible", "revolutionary"
- Never use markdown formatting (no asterisks, no bold, no headers)
- Keep sentences punchy and scannable

TRANSFORMATION FORMULA:
- Feature: What it IS → Outcome: What it DOES → Dream: What they BECOME

Example:
- Feature: "50 video lessons"
- Outcome: "Learn step-by-step at your own pace"
- Dream: "Become job-ready in 90 days"

Always write the DREAM version, not the feature.`;

      let result: any = {};

      // ========================================
      // ACTION: generateHeadline
      // ========================================
      if (action === 'generateHeadline' || action === 'generateAll') {
        const headlinePrompt = `Create a compelling headline for this product:

Product Name: ${productConfig?.name || name}
Target Audience: ${productConfig?.targetAudience || targetAudience || 'Not specified'}
Product Type: ${productConfig?.productType || productType || 'digital product'}
Price: $${productConfig?.price || price || 0}
Description: ${productConfig?.description || description || 'Not provided'}

Write a headline that:
1. Calls out the dream outcome (what they'll achieve)
2. Is specific about the result
3. Is 10 words or less
4. Does NOT mention the product name directly

Return ONLY the headline text, nothing else.`;

        const headlineResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 100,
          messages: [
            { role: 'user', content: headlinePrompt }
          ],
          system: systemPrompt,
        });

        const headline = (headlineResponse.content[0] as any).text?.trim();
        result.headline = stripMarkdownFormatting(headline);
      }

      // ========================================
      // ACTION: generateTagline
      // ========================================
      if (action === 'generateTagline' || action === 'generateAll') {
        const taglinePrompt = `Create a tagline for this product:

Product: ${productConfig?.name || name}
Audience: ${productConfig?.targetAudience || targetAudience || 'Not specified'}

Format: "[Result] in [time] - without [struggle]"
LIMIT: Under 80 characters. Be punchy.

Return ONLY the tagline, nothing else.`;

        const taglineResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 50,
          messages: [
            { role: 'user', content: taglinePrompt }
          ],
          system: systemPrompt,
        });

        const tagline = (taglineResponse.content[0] as any).text?.trim();
        result.tagline = stripMarkdownFormatting(tagline);
      }

      // ========================================
      // ACTION: generateDescription
      // ========================================
      if (action === 'generateDescription' || action === 'generateAll') {
        const descPrompt = `Write a short product description (MAXIMUM 200 characters):

Product: ${productConfig?.name || name}
Audience: ${productConfig?.targetAudience || targetAudience || 'Not specified'}

Write 2 sentences max:
1. What it is and who it's for
2. The key outcome

HARD LIMIT: 200 characters. Count carefully. Be concise.

Return ONLY the description, nothing else.`;

        const descResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 100,
          messages: [
            { role: 'user', content: descPrompt }
          ],
          system: systemPrompt,
        });

        const desc = (descResponse.content[0] as any).text?.trim();
        result.description = stripMarkdownFormatting(desc);
      }

      // ========================================
      // ACTION: enhanceBenefits
      // ========================================
      if (action === 'enhanceBenefits' || action === 'generateAll') {
        const benefitsToEnhance = productConfig?.valueStack || benefits || [];
        
        if (benefitsToEnhance.length > 0) {
          const benefitsPrompt = `Improve these product benefits to be more compelling:

Current Benefits:
${benefitsToEnhance.map((b: string, i: number) => `${i + 1}. ${b}`).join('\n')}

Product: ${productConfig?.name || name}

Rules:
1. Make each outcome-focused (what they GET, not what's included)
2. STRICT LIMIT: Each benefit must be under 80 characters
3. Be specific but concise
4. No fluff or filler words

Return ONLY a JSON array with the same number of benefits:
["Benefit 1", "Benefit 2", ...]

No explanation, just the JSON array.`;

          const benefitsResponse = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 400,
            messages: [
              { role: 'user', content: benefitsPrompt }
            ],
            system: systemPrompt,
          });

          const benefitsText = (benefitsResponse.content[0] as any).text?.trim();
          try {
            // Extract JSON array from response
            const jsonMatch = benefitsText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              result.benefits = JSON.parse(jsonMatch[0]);
            } else {
              result.benefits = benefitsToEnhance; // Fallback to original
            }
          } catch {
            result.benefits = benefitsToEnhance; // Fallback to original
          }
        } else {
          result.benefits = [];
        }
      }

      // ========================================
      // ACTION: suggestBenefits
      // ========================================
      if (action === 'suggestBenefits') {
        const existingBenefits = productConfig?.valueStack || benefits || [];
        
        const benefitPrompt = `Suggest 3 things to include in this product:

Product: ${productConfig?.name || name}

Rules:
1. Each benefit under 60 characters
2. Be specific (add numbers if relevant)
3. Different from: ${existingBenefits.length > 0 ? existingBenefits.join(', ') : 'N/A'}

Examples: "50+ video lessons", "Downloadable templates", "Private community access"

Return ONLY a JSON array:
["Benefit 1", "Benefit 2", "Benefit 3"]`;

        const benefitResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          messages: [
            { role: 'user', content: benefitPrompt }
          ],
          system: systemPrompt,
        });

        const benefitText = (benefitResponse.content[0] as any).text?.trim();
        try {
          const jsonMatch = benefitText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            result.benefits = JSON.parse(jsonMatch[0]);
          } else {
            result.benefits = ['Step-by-step training videos', 'Downloadable resources', 'Lifetime access'];
          }
        } catch {
          result.benefits = ['Step-by-step training videos', 'Downloadable resources', 'Lifetime access'];
        }
      }

      // ========================================
      // ACTION: suggestGuarantees
      // ========================================
      if (action === 'suggestGuarantees' || action === 'generateAll') {
        const existingGuarantees = productConfig?.guarantees || guarantees || [];
        
        const guaranteePrompt = `Suggest 3 guarantees for this product:

Product: ${productConfig?.name || name}
Price: $${productConfig?.price || price || 0}

Rules:
1. Each guarantee under 80 characters
2. Be specific with timeframes
3. Different from: ${existingGuarantees.length > 0 ? existingGuarantees.join(', ') : 'N/A'}

Examples: "30-day full refund, no questions", "Lifetime access + free updates", "1-on-1 support until you succeed"

Return ONLY a JSON array:
["Guarantee 1", "Guarantee 2", "Guarantee 3"]`;

        const guaranteeResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          messages: [
            { role: 'user', content: guaranteePrompt }
          ],
          system: systemPrompt,
        });

        const guaranteeText = (guaranteeResponse.content[0] as any).text?.trim();
        try {
          const jsonMatch = guaranteeText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            result.guarantees = JSON.parse(jsonMatch[0]);
          } else {
            result.guarantees = ['30-day money-back guarantee', 'Lifetime access included', 'Free updates forever'];
          }
        } catch {
          result.guarantees = ['30-day money-back guarantee', 'Lifetime access included', 'Free updates forever'];
        }
      }

      // ========================================
      // ACTION: enhanceGuarantees
      // ========================================
      if (action === 'enhanceGuarantees') {
        const existingGuarantees = guarantees || productConfig?.guarantees || [];
        
        if (existingGuarantees.length === 0) {
          result.guarantees = [];
        } else {
          const enhancePrompt = `Improve these guarantees to be more compelling:

Product: ${productConfig?.name || name}

Current Guarantees:
${existingGuarantees.map((g: string, i: number) => `${i + 1}. ${g}`).join('\n')}

Rules:
1. Add specific timeframes or outcomes
2. Be confident and bold
3. STRICT LIMIT: Each guarantee must be under 100 characters
4. No fluff - be direct

Return ONLY a JSON array with the same number of guarantees:
["Guarantee 1", "Guarantee 2"]

No explanation, just the JSON array.`;

          const enhanceResponse = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 300,
            messages: [
              { role: 'user', content: enhancePrompt }
            ],
            system: systemPrompt,
          });

          const enhanceText = (enhanceResponse.content[0] as any).text?.trim();
          try {
            const jsonMatch = enhanceText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              result.guarantees = JSON.parse(jsonMatch[0]);
            } else {
              result.guarantees = existingGuarantees;
            }
          } catch {
            result.guarantees = existingGuarantees;
          }
        }
      }

      // ========================================
      // ACTION: suggestCTA
      // ========================================
      if (action === 'suggestCTA' || action === 'generateAll') {
        const ctaPrompt = `Suggest call-to-action button text for this product:

Product: ${productConfig?.name || name}
Price: $${productConfig?.price || price || 0}
Product Type: ${productConfig?.productType || productType || 'digital product'}
Is Free: ${(productConfig?.price || price || 0) === 0 ? 'Yes' : 'No'}

Create 5 CTA options that:
1. Create urgency or excitement
2. Focus on what they GET (not what they pay)
3. Are 2-4 words each
4. Match the product type

Return ONLY a JSON array of 5 CTAs, like:
["CTA 1", "CTA 2", "CTA 3", "CTA 4", "CTA 5"]

No explanation, just the JSON array.`;

        const ctaResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          messages: [
            { role: 'user', content: ctaPrompt }
          ],
          system: systemPrompt,
        });

        const ctaText = (ctaResponse.content[0] as any).text?.trim();
        try {
          const jsonMatch = ctaText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            result.ctaSuggestions = JSON.parse(jsonMatch[0]);
          } else {
            result.ctaSuggestions = ['Get Instant Access', 'Start Now', 'Get Started', 'Join Now', 'Download Now'];
          }
        } catch {
          result.ctaSuggestions = ['Get Instant Access', 'Start Now', 'Get Started', 'Join Now', 'Download Now'];
        }
      }

      // ========================================
      // ACTION: enhanceSingle (for individual benefit/guarantee improvement)
      // ========================================
      if (action === 'enhanceSingle') {
        const { textToEnhance, fieldType } = requestData;
        
        if (!textToEnhance) {
          res.status(400).json({ 
            data: { error: 'Missing required field: textToEnhance' }
          });
          return;
        }

        const fieldConfig = {
          benefit: { 
            instruction: 'Make it outcome-focused - what specific result will they get?',
            maxLength: '80 characters max'
          },
          guarantee: { 
            instruction: 'Make it bold, specific with timeframes, and show confidence',
            maxLength: '100 characters max'
          },
          headline: { 
            instruction: 'Make it attention-grabbing and benefit-driven',
            maxLength: '60 characters max'
          },
          tagline: { 
            instruction: 'Make it memorable and value-focused',
            maxLength: '80 characters max'
          },
          description: { 
            instruction: 'Make it clear about what they get and why it matters',
            maxLength: '250 characters max (2-3 sentences)'
          },
        };

        const config = fieldConfig[fieldType as keyof typeof fieldConfig] || { 
          instruction: 'Make it more compelling', 
          maxLength: '100 characters max' 
        };

        const enhancePrompt = `Improve this ${fieldType || 'text'} for a sales page:

Original: "${textToEnhance}"
Product: ${productConfig?.name || name || 'Not specified'}

Make it: ${config.instruction}

CRITICAL LENGTH LIMIT: ${config.maxLength}. Do NOT exceed this. Be concise.

Return ONLY the improved text, nothing else.`;

        const enhanceResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 150,
          messages: [
            { role: 'user', content: enhancePrompt }
          ],
          system: systemPrompt,
        });

        const enhanced = (enhanceResponse.content[0] as any).text?.trim();
        result.enhanced = stripMarkdownFormatting(enhanced);
      }

      // ========================================
      // ACTION: improveSeoTitle
      // ========================================
      if (action === 'improveSeoTitle') {
        const { currentTitle } = requestData;
        
        const seoTitlePrompt = `Optimize this SEO meta title for better search rankings:

Current: "${currentTitle}"
Product: ${productConfig?.name || name}

Rules:
1. STRICT LIMIT: 60 characters max
2. Include main keyword near the start
3. Make it compelling to click
4. No clickbait or ALL CAPS

Return ONLY the optimized title, nothing else.`;

        const titleResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 50,
          messages: [
            { role: 'user', content: seoTitlePrompt }
          ],
          system: systemPrompt,
        });

        const title = (titleResponse.content[0] as any).text?.trim();
        result.title = stripMarkdownFormatting(title).substring(0, 60);
      }

      // ========================================
      // ACTION: improveSeoDescription
      // ========================================
      if (action === 'improveSeoDescription') {
        const { currentDescription } = requestData;
        
        const seoDescPrompt = `Optimize this SEO meta description for better click-through rates:

Current: "${currentDescription}"
Product: ${productConfig?.name || name}

Rules:
1. STRICT LIMIT: 160 characters max
2. Include a clear value proposition
3. Add a subtle call-to-action
4. Make searchers want to click

Return ONLY the optimized description, nothing else.`;

        const descResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 80,
          messages: [
            { role: 'user', content: seoDescPrompt }
          ],
          system: systemPrompt,
        });

        const desc = (descResponse.content[0] as any).text?.trim();
        result.description = stripMarkdownFormatting(desc).substring(0, 160);
      }

      console.log('Sales copy generated successfully for action:', action);

      res.json({
        data: {
          success: true,
          action,
          ...result,
        }
      });

    } catch (error) {
      console.error("Error generating sales copy:", error);
      res.status(500).json({ 
        data: {
          error: 'Failed to generate sales copy. Please try again.',
          details: (error as any).message 
        }
      });
    }
  }
);

/*
  Purpose: Tracks page views for published products.
  Called from Product.tsx when a visitor loads a public sales page (/p/{slug}).
  Stores both a lifetime total and daily breakdown for date-range analytics.
  
  Data structure:
    page_views/{slug}                    -> { totalViews, sellerId, lastViewedAt }
    page_views/{slug}/daily/{YYYY-MM-DD} -> { views, date }
*/
export const trackPageView = onRequest(
  {
    cors: true,
    region: "us-central1"
  },
  async (req, res) => {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { slug, sellerId } = req.body;

      if (!slug) {
        res.status(400).json({ error: 'Missing slug' });
        return;
      }

      // Get today's date string in YYYY-MM-DD format (UTC)
      const now = new Date();
      const dateKey = now.toISOString().split('T')[0]; // e.g. "2026-03-02"

      const pageViewRef = db.collection('page_views').doc(slug);
      const dailyRef = pageViewRef.collection('daily').doc(dateKey);

      // Use a batch for atomic writes
      const batch = db.batch();

      // Increment total views on the parent doc (create if doesn't exist)
      batch.set(pageViewRef, {
        totalViews: admin.firestore.FieldValue.increment(1),
        sellerId: sellerId || '',
        lastViewedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      // Increment daily views
      batch.set(dailyRef, {
        views: admin.firestore.FieldValue.increment(1),
        date: dateKey,
      }, { merge: true });

      await batch.commit();

      res.json({ success: true });

    } catch (error) {
      // Don't let tracking errors break anything -- log and return success
      console.error("Error tracking page view:", error);
      res.json({ success: false });
    }
  }
);