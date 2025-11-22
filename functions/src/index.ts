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

        const { userId, questionId, originalAnswer, questionText} = requestData;
        
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

        // Simple, clean system prompt
        let systemPrompt = `You are improving an entrepreneur's answer to make it more specific and actionable.

  Core principles:
  - Add specific details where vague
  - Keep the original voice and tone
  - Make it actionable
  - Keep it simple and conversational`;

        let improvePrompt = `Original Answer: ${originalAnswer}

  Make this answer more specific and valuable by:
  1. Adding concrete details (numbers, timeframes)
  2. Keeping it simple and conversational
  3. Maintaining their voice

  DO NOT:
  - Add excessive formatting or asterisks
  - Make assumptions about their exact situation
  - Use dramatic language
  - Make it longer than the original

  Keep improvements natural and under 150 words.`;

        // Question-specific improvements
        if (questionId === 'actual_requests') {
          improvePrompt += `

  Simply make their list more specific:
  - Instead of "help with code" → "review React components"
  - Instead of "fitness advice" → "meal prep strategies"
  - Add frequency if relevant (weekly, monthly)
  Keep it conversational. Don't add analysis or strategy.`;
        } else if (questionId === 'confidence_test') {
          improvePrompt += `

  Strengthen their confidence with:
  - Specific dollar amount
  - Clear service description
  - Simple math to $1,000
  No drama, just facts.`;
        } else if (questionId === 'target_outcome') {
          improvePrompt += `

  Make the outcome more measurable:
  - Add timeframes (30 days, 3 months)
  - Include specific metrics
  - Keep it achievable`;
        }

        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
          temperature: 0.7,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: improvePrompt
            }
          ],
        });

        const improvedAnswer = message.content[0].type === 'text' 
          ? message.content[0].text 
          : originalAnswer;

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

  FORMATTING RULES:
  - Never use asterisks (*) for formatting
  - Never use bold or markdown formatting
  - Use simple labels like "At work:" or numbered lists
  - Write in plain text only

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

        // Special handling for specific questions
        if (questionId === 'actual_requests') {
          userPrompt += `

  Write a simple list of what people actually ask them for help with.

  At work: What do colleagues or bosses ask you to do?

  From friends/family: What help do they seek from you?

  Online: What questions do you get asked?

  Keep it conversational and specific. Write in first person.
  Just list what happens - no analysis or conclusions needed.
  NO formatting symbols or asterisks.`;

        } else if (questionId === 'confidence_test') {
          userPrompt += `

  Write a simple, confident answer about what they could charge for TODAY.

  Format (plain text, no formatting):
  "I could charge $[X]/hour for [specific service] because [simple reason]."

  Then add:
  "Quick math: [X] hours per week at this rate = $1,000+ monthly."

  Keep it straightforward, no drama, just facts based on their skills.
  Total answer: 50-75 words max. NO asterisks or special formatting.`;

        } else if (questionId === 'value_stack') {
          userPrompt += `

  List 5-7 simple bonuses they could offer. Format as numbered list (plain text):

  1. [Bonus name] - [What it does] ($[value])
  2. [Bonus name] - [What it does] ($[value])
  3. [Bonus name] - [What it does] ($[value])

  Keep each bonus to one line. Make values realistic ($97-$497 range).
  No asterisks, no bold, just plain numbered list.`;

        } else if (questionId === 'dream_outcome') {
          userPrompt += `

  Write 2-3 sentences about what their customers REALLY want beyond the surface.

  Simple format (plain text, no formatting):
  "They don't just want [surface result]. They want [deeper desire]. Ultimately, they dream of [end state]."

  Keep it human and relatable, not overly philosophical. NO special formatting.`;

        } else if (questionId === 'speed_to_value') {
          userPrompt += `

  Create a simple timeline showing quick wins (plain text format):

  Day 1: [First small result]
  Week 1: [Visible progress]
  Day 30: [Major outcome]

  One line each, specific but not overly detailed. NO asterisks or special formatting.`;

        } else if (questionId === 'mission_statement') {
          userPrompt += `

  Write a clear, simple mission statement:
  "I help [specific type of person] achieve [specific outcome]"

  One sentence, no jargon, based on their actual skills and target audience.
  Plain text only, no special formatting.`;

        } else if (questionId === 'effort_reducers') {
          userPrompt += `

  Based on what they selected, explain briefly how these tools reduce effort for their customers.
  Keep it to 2-3 sentences max, conversational tone, plain text only.`;
        }

        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          temperature: 0.8,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userPrompt
            }
          ],
        });

        const generatedAnswer = message.content[0].type === 'text' 
          ? message.content[0].text 
          : '';

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