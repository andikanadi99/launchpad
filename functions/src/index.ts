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
    .replace(/^\s*\*\s+/gm, '• ')
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

/* 
    Purpose: Creates a Stripe Checkout session for product purchases
*/
export const createCheckoutSession = onRequest(
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
      const { productId, sellerId, origin } = req.body;
      
      if (!productId || !sellerId) {
        res.status(400).json({ error: 'Missing productId or sellerId' });
        return;
      }
      
      const productDoc = await db
        .collection('users').doc(sellerId)
        .collection('products').doc(productId)
        .get();
        
      if (!productDoc.exists) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      const product = productDoc.data()!;

      // Get seller's Stripe account
      const sellerDoc = await db.collection('users').doc(sellerId).get();
      const stripeAccountId = sellerDoc.data()?.stripeAccountId;
      
      if (!stripeAccountId) {
        res.status(400).json({ error: 'Seller not connected to Stripe' });
        return;
      }

      // Create Checkout session
      const stripe = getStripe(stripeSecretKey.value());
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: product.title,
              description: product.description,
            },
            unit_amount: product.price,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${origin || 'https://launchpad-ec0b0.web.app'}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin || 'https://launchpad-ec0b0.web.app'}/p/${sellerId}/${productId}`,
        payment_intent_data: {
          application_fee_amount: Math.round(product.price * 0.1), // 10% platform fee
          transfer_data: {
            destination: stripeAccountId,
          },
        },
        metadata: {
          productId,
          sellerId,
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
  - Use "•" if you need bullet points, never "*"
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
          max_tokens: 1000,  // Increased for multi-audience responses
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
  - Use "•" if you need bullet points, never "*"
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
          max_tokens: 1000,  // Increased for multi-audience responses
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