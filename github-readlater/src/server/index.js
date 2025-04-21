const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Paddle API credentials
const PADDLE_VENDOR_ID = process.env.PADDLE_VENDOR_ID;
const PADDLE_API_KEY = process.env.PADDLE_API_KEY;
const PADDLE_PUBLIC_KEY = process.env.PADDLE_PUBLIC_KEY;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Required for Paddle webhook format

// Helper to update user subscription
async function updateUserSubscription(userId, tier, validUntil = null, paddleSubscriptionId = null, paddleUserId = null) {
  try {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        tier,
        valid_until: validUntil,
        paddle_subscription_id: paddleSubscriptionId,
        paddle_user_id: paddleUserId,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error updating user subscription:', error);
    return false;
  }
}

// Generate Paddle checkout URL
app.post('/generate-checkout', async (req, res) => {
  try {
    const { userId, planId, successUrl, cancelUrl } = req.body;
    
    // Get user from Supabase
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError) throw authError;
    
    // Generate Paddle checkout URL
    const checkoutParams = new URLSearchParams({
      product_id: planId,
      customer_email: authData.user.email,
      passthrough: JSON.stringify({ userId }),
      return_url: successUrl,
      cancel_url: cancelUrl
    });
    
    // Make API request to Paddle
    const response = await axios.post(
      'https://vendors.paddle.com/api/2.0/product/generate_pay_link',
      {
        vendor_id: PADDLE_VENDOR_ID,
        vendor_auth_code: PADDLE_API_KEY,
        ...Object.fromEntries(checkoutParams)
      }
    );
    
    if (!response.data.success) {
      throw new Error('Failed to generate Paddle checkout URL');
    }
    
    res.json({ 
      url: response.data.response.url
    });
  } catch (error) {
    console.error('Error generating checkout URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify Paddle webhook signature
function verifyPaddleWebhook(reqBody, signature) {
  // Sort parameters alphabetically
  const sortedParams = {};
  Object.keys(reqBody).sort().forEach(key => {
    if (key !== 'p_signature') {
      sortedParams[key] = reqBody[key];
    }
  });
  
  // Serialize the parameters
  const serialized = Object.entries(sortedParams)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  // Verify the signature using PHP-SIG format
  const verifier = crypto.createVerify('sha1WithRSAEncryption');
  verifier.update(serialized);
  
  return verifier.verify(PADDLE_PUBLIC_KEY, signature, 'base64');
}

// Paddle webhook handler
app.post('/webhook', async (req, res) => {
  try {
    // Verify webhook signature
    const signature = req.body.p_signature;
    
    if (!signature || !verifyPaddleWebhook(req.body, signature)) {
      return res.status(400).send('Invalid webhook signature');
    }
    
    // Get the alert type
    const alertType = req.body.alert_name;
    
    // Store webhook event in Supabase for audit
    try {
      const { error } = await supabase
        .from('paddle_events')
        .insert([
          {
            paddle_event_id: req.body.p_signature, // Use signature as unique ID
            event_type: alertType,
            data: req.body,
            processed: false,
            created_at: new Date().toISOString()
          }
        ]);
      
      if (error) throw error;
    } catch (err) {
      console.error(`Error storing event: ${err.message}`);
      // Continue processing even if storage fails
    }
    
    // Extract user ID from passthrough data
    let userId;
    try {
      const passthrough = JSON.parse(req.body.passthrough || '{}');
      userId = passthrough.userId;
    } catch (err) {
      console.error('Error parsing passthrough data:', err);
    }
    
    // Process webhook based on alert type
    switch (alertType) {
      case 'subscription_created': {
        // New subscription created
        if (userId) {
          const validUntil = new Date(req.body.next_bill_date);
          
          await updateUserSubscription(
            userId,
            'premium',
            validUntil.toISOString(),
            req.body.subscription_id,
            req.body.user_id
          );
        }
        break;
      }
      
      case 'subscription_updated': {
        // Subscription details updated
        if (userId) {
          const validUntil = new Date(req.body.next_bill_date);
          
          await updateUserSubscription(
            userId,
            'premium',
            validUntil.toISOString(),
            req.body.subscription_id,
            req.body.user_id
          );
        }
        break;
      }
      
      case 'subscription_cancelled': {
        // Subscription cancelled
        if (userId) {
          await updateUserSubscription(
            userId,
            'free',
            null,
            req.body.subscription_id,
            req.body.user_id
          );
        }
        break;
      }
      
      case 'subscription_payment_succeeded': {
        // Payment for subscription processed successfully
        if (userId) {
          const validUntil = new Date(req.body.next_bill_date);
          
          await updateUserSubscription(
            userId,
            'premium',
            validUntil.toISOString(),
            req.body.subscription_id,
            req.body.user_id
          );
        }
        break;
      }
      
      case 'subscription_payment_failed': {
        // Payment failure - could downgrade or flag account
        console.log('Subscription payment failed:', req.body);
        // Optionally downgrade user or flag account for follow-up
        break;
      }
      
      default:
        console.log(`Unhandled webhook alert type: ${alertType}`);
    }
    
    // Mark event as processed
    await supabase
      .from('paddle_events')
      .update({ processed: true })
      .eq('paddle_event_id', req.body.p_signature);
    
    // Acknowledge receipt of the webhook
    res.status(200).send('Webhook received');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Error processing webhook');
  }
});

// Endpoint to get user's subscription
app.get('/subscription/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    
    res.json({ subscription: data });
  } catch (error) {
    console.error('Error getting subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});