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
- Improve clarity and structure of what they already wrote
- NEVER add specific numbers, frequencies, or data they didn't provide
- Keep the original voice and tone
- Make it more readable and clear
- DO NOT invent details

FORMATTING RULES:
- NEVER use asterisks (*) for any formatting
- NEVER use ** for bold or emphasis
- Use colons for section headers like "At work:" or "Cybersecurity consulting:"
- Use simple line breaks to separate sections
- Write everything in plain text`;

      let improvePrompt = `Original Answer: ${originalAnswer}

Improve this answer by:
1. Making their existing points clearer
2. Better organizing what they already said
3. Using more professional wording

DO NOT:
- Use asterisks (*) or any markdown formatting
- Add specific numbers (like "2-3 times a week" or "6 people") they didn't mention
- Invent new examples or scenarios
- Make assumptions about frequencies or quantities
- Use dramatic language
- Make it longer than necessary
- Add income calculations or monthly goals

FORMATTING:
- Use simple section headers with colons like "Web Development Services:" 
- Separate sections with line breaks
- NO asterisks, NO bold, NO markdown

ONLY improve what they already wrote. If they were vague about numbers, keep it vague.

Keep improvements natural and under 250 words.`;

      // Question-specific improvements
      if (questionId === 'actual_requests') {
        improvePrompt += `

Focus on:
- Clarifying the types of help they mentioned
- Grouping related requests together
- Using clearer language

Format sections like:
At work:
[their work-related requests]

Personal:
[their personal requests]

Do NOT add specific numbers or timeframes they didn't provide.
If they said "often" keep it as "often", don't change to "3 times a week".`;

      } else if (questionId === 'confidence_test') {
        improvePrompt += `

Strengthen their confidence with:
- Clearer service descriptions
- Better organized list of what they could offer
- More professional wording

Format like:
Primary service:
[their main offering at $50/hour]

Additional services:
[other services they mentioned]

Do NOT add:
- Specific client numbers
- Income calculations
- New services they didn't mention
Focus only on making their existing services clearer.`;

      } else if (questionId === 'target_outcome') {
        improvePrompt += `

Make the outcome clearer by:
- Using more precise language
- Making it more concrete
Do NOT add specific metrics or timeframes they didn't include.
Use plain text, no special formatting.`;
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
- Include [bracketed placeholders] where they should add their own numbers

CRITICAL FORMATTING RULES:
- NEVER use asterisks (*) for any formatting whatsoever
- NEVER use ** for bold or emphasis
- NO markdown formatting at all
- Use simple labels with colons like "At work:" or "Service offerings:"
- Use numbered lists (1. 2. 3.) or simple line breaks
- Write in plain text only
- Use [X] or [specific detail] as placeholders for numbers/frequencies

Avoid:
- ANY asterisks or special formatting symbols
- Overly dramatic language
- Making up specific numbers or frequencies
- Complex explanations
- Income calculations or monthly goals`;

      let userPrompt = `Question: ${questionText}
${questionSubtext ? `Additional context: ${questionSubtext}` : ''}

User's background and skills:
${JSON.stringify(previousAnswers, null, 2)}

Generate a simple, authentic answer template based on their experience.
Use [bracketed placeholders] for specific numbers they should fill in.
NO asterisks, NO markdown formatting, plain text only.`;

      // Special handling for specific questions
      if (questionId === 'actual_requests') {
        userPrompt += `

Write a template showing what people might ask them for help with.

Format like this (plain text, no asterisks):

At work:
Colleagues ask me [frequency] to help with [specific task]. I've helped [X number of] people with [area].

Personal requests:
Friends ask for help with [relevant skill area] about [frequency].

Online:
I get questions about [topic] from [where].

Use colons for sections, NO asterisks, NO bold formatting.
Keep it conversational and first-person.`;

      } else if (questionId === 'confidence_test') {
        userPrompt += `

Write a simple template they can customize:

"I could charge $50/hour for [specific service based on their actual skills]. I could also offer [related service 1], [related service 2], and [related service 3] at similar rates."

Base the services on their actual skills and experience, but keep it short (50-100 words).
NO asterisks, NO formatting, just plain text.
NO income calculations, NO monthly goals. Just the services.`;

      } else if (questionId === 'value_stack') {
        userPrompt += `

List 5-7 simple bonuses they could offer based on their skills.

Format as plain numbered list:
1. [Specific bonus based on their skills] - [What it does] ($[value])
2. [Another bonus] - [Description] ($[value])
3. [Another bonus] - [Description] ($[value])

NO asterisks, NO bold, just plain numbered list.
Use their actual skills to suggest relevant bonuses.
Keep each to one line. Make values realistic ($97-$497 range).`;

      } else if (questionId === 'dream_outcome') {
        userPrompt += `

Write 2-3 sentences about what their customers want beyond the surface.

Plain text format (no asterisks or formatting):
"They don't just want [surface result]. They want [deeper desire]. Ultimately, they dream of [end state]."

Base this on their target audience and outcome. Keep it relatable.`;

      } else if (questionId === 'speed_to_value') {
        userPrompt += `

Create a simple timeline template (plain text, no formatting):

Day 1: [First small result they could deliver]
Week 1: [Visible progress based on their service]
Day 30: [Major outcome]

Base milestones on their actual skills/services. One line each.
NO asterisks or special formatting.`;

      } else if (questionId === 'mission_statement') {
        userPrompt += `

Write a clear mission statement based on their answers:
"I help [specific type of person from their target] achieve [specific outcome they mentioned]"

One sentence, no jargon, plain text only.`;

      } else if (questionId === 'effort_reducers') {
        userPrompt += `

Based on what they selected, explain briefly how these tools reduce effort.
Keep it to 2-3 sentences max, conversational tone, plain text only.
NO asterisks or formatting.`;
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