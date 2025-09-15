import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import { defineSecret } from "firebase-functions/params";

// Initialize and connect to firebase
admin.initializeApp();
const db = admin.firestore();

// Define the secret
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

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

    //POST calls not allowed
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
  
    try{

      const { productId, sellerId, origin } = req.body;
      //Check if product or seller id is missing
      if (!productId || !sellerId) {
        res.status(400).json({ error: 'Missing productId or sellerId' });
        return;
      }
      //Get product details
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
  });