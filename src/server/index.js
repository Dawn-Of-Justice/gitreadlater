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

// Paddle API credentials - Using only Billing API
const PADDLE_API_KEY = process.env.PADDLE_API_KEY;
const PADDLE_PUBLIC_KEY_BILLING = process.env.PADDLE_PUBLIC_KEY_BILLING;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://gitreadlater.vercel.app'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper to update user subscription
async function updateUserSubscription(userId, tier, validUntil = null, paddleSubscriptionId = null, paddleCustomerId = null) {
  try {
    console.log(`Updating subscription for user ${userId} to tier ${tier}`);
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        tier,
        valid_until: validUntil,
        paddle_subscription_id: paddleSubscriptionId,
        paddle_customer_id: paddleCustomerId, // Note: Changed from paddle_user_id to paddle_customer_id
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error updating user subscription in database:', error);
      throw error;
    }
    
    console.log(`Subscription updated successfully for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error updating user subscription:', error);
    return false;
  }
}

// Generate Paddle checkout URL - Billing API
app.post('/generate-checkout', async (req, res) => {
  try {
    console.log('--- Starting checkout generation (Billing API) ---');
    const { userId, priceId, successUrl, cancelUrl } = req.body;
    
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Generating checkout for user:', userId);
    console.log('Price ID:', priceId);
    
    // Validate required parameters
    if (!userId) {
      console.log('Error: Missing userId parameter');
      return res.status(400).json({ error: 'Missing userId parameter' });
    }
    
    // Get user from Supabase
    console.log('Fetching user from Supabase...');
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError) {
      console.error('Supabase auth error:', authError);
      return res.status(401).json({ error: 'Authentication failed' });
    }
    
    if (!authData || !authData.user || !authData.user.email) {
      console.log('Error: Unable to retrieve user email');
      return res.status(400).json({ error: 'Unable to retrieve user email' });
    }
    
    console.log('User email retrieved:', authData.user.email);
    
    // For development, add fallback for missing price ID
    const finalPriceId = priceId || process.env.PADDLE_PRICE_ID;
    
    if (!finalPriceId) {
      console.log('Error: No price ID provided or configured');
      return res.status(400).json({ error: 'No price ID provided or configured' });
    }
    
    // Check if Paddle credentials are available
    if (!PADDLE_API_KEY) {
      console.error('Missing Paddle API key');
      return res.status(500).json({ error: 'Paddle API credentials not configured' });
    }
    
    // Build checkout request object for Paddle Billing API
    const checkoutRequest = {
      items: [
        {
          price_id: finalPriceId,
          quantity: 1
        }
      ],
      customer_email: authData.user.email,
      custom_data: { userId: userId },
      success_url: successUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscription?success=true`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscription?canceled=true`
    };
    
    console.log('Paddle Billing API request payload:', JSON.stringify(checkoutRequest, null, 2));
    
    // Make API request to Paddle
    const response = await axios.post(
      'https://api.paddle.com/checkout/custom',
      checkoutRequest,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PADDLE_API_KEY}`,
          'Paddle-Version': '2023-10-10'
        }
      }
    );
    
    console.log('Paddle API response status:', response.status);
    console.log('Paddle API response data:', JSON.stringify(response.data, null, 2));
    
    // Return the checkout URL to the client
    res.json({ 
      url: response.data.url
    });
    
    console.log('--- Checkout generation complete ---');
  } catch (error) {
    console.error('Error generating checkout URL:', error);
    
    // Enhanced error logging
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('Error request (no response received):', error.request);
    } else {
      console.error('Error details:', error.message);
    }
    
    res.status(500).json({ error: error.message });
    console.log('--- Checkout generation failed ---');
  }
});

// Verify Paddle Billing webhook signature
function verifyPaddleBillingWebhook(reqBody, signature, timestamp) {
  if (!PADDLE_PUBLIC_KEY_BILLING) {
    console.warn('Paddle public key not configured, skipping signature verification');
    return true; // Skip verification if key not available
  }

  try {
    console.log('Verifying webhook signature with timestamp:', timestamp);
    
    // Convert the request body to a JSON string
    const payload = JSON.stringify(reqBody);
    
    // Create the signed payload string: {timestamp}:{payload}
    const signedPayload = `${timestamp}:${payload}`;
    
    // Create verifier with the Paddle public key
    const verifier = crypto.createVerify('sha256');
    verifier.update(signedPayload);
    
    // Verify the signature
    const isValid = verifier.verify(
      PADDLE_PUBLIC_KEY_BILLING,
      Buffer.from(signature, 'base64')
    );
    
    console.log('Signature verification result:', isValid);
    return isValid;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

// Paddle Billing webhook handler
app.post('/webhook', async (req, res) => {
  try {
    console.log('--- Webhook received (Paddle Billing) ---');
    console.log('Webhook payload:', JSON.stringify(req.body, null, 2));
    
    // Get signature and timestamp from headers
    const signature = req.headers['paddle-signature'];
    const timestamp = req.headers['paddle-signature-timestamp'];
    
    if (!signature || !timestamp) {
      console.log('Error: Missing webhook signature headers');
      return res.status(400).send('Missing webhook signature headers');
    }
    
    // Verify webhook signature
    const isValid = verifyPaddleBillingWebhook(req.body, signature, timestamp);
    
    if (!isValid) {
      console.log('Error: Invalid webhook signature');
      return res.status(400).send('Invalid webhook signature');
    }
    
    // Get the event data from the webhook
    const event = req.body;
    const eventType = event.event_type;
    
    console.log('Webhook event type:', eventType);
    
    // Store webhook event in Supabase for audit
    try {
      console.log('Storing webhook event in database...');
      const { error } = await supabase
        .from('paddle_events_billing')
        .insert([
          {
            paddle_event_id: event.event_id,
            event_type: eventType,
            data: event,
            processed: false,
            created_at: new Date().toISOString()
          }
        ]);
      
      if (error) {
        console.error('Error storing webhook event:', error);
      } else {
        console.log('Webhook event stored successfully');
      }
    } catch (err) {
      console.error(`Error storing event: ${err.message}`);
      // Continue processing even if storage fails
    }
    
    // Extract user ID from custom data
    let userId;
    try {
      console.log('Extracting user ID from custom data...');
      
      // For subscription events
      if (event.data && event.data.custom_data && event.data.custom_data.userId) {
        userId = event.data.custom_data.userId;
      }
      // For transaction events
      else if (event.data && event.data.subscription && event.data.subscription.custom_data && event.data.subscription.custom_data.userId) {
        userId = event.data.subscription.custom_data.userId;
      }
      
      console.log('Extracted user ID:', userId);
    } catch (err) {
      console.error('Error extracting user ID:', err);
    }
    
    // Process webhook based on event type
    console.log('Processing webhook based on event type:', eventType);
    
    switch (eventType) {
      case 'subscription.created': {
        // New subscription created
        if (userId) {
          console.log('Processing subscription.created event for user:', userId);
          
          const subscription = event.data;
          let validUntil = null;
          
          // Get the next billing date or current period end
          if (subscription.next_billed_at) {
            validUntil = new Date(subscription.next_billed_at).toISOString();
          } else if (subscription.current_period_end) {
            validUntil = new Date(subscription.current_period_end).toISOString();
          }
          
          console.log('Setting subscription valid until:', validUntil);
          
          const result = await updateUserSubscription(
            userId,
            'premium',
            validUntil,
            subscription.id,
            subscription.customer_id
          );
          
          console.log('Subscription update result:', result);
        } else {
          console.log('Warning: No user ID found for subscription.created event');
        }
        break;
      }
      
      case 'subscription.updated': {
        // Subscription details updated
        if (userId) {
          console.log('Processing subscription.updated event for user:', userId);
          
          const subscription = event.data;
          let validUntil = null;
          
          // Get the next billing date or current period end
          if (subscription.next_billed_at) {
            validUntil = new Date(subscription.next_billed_at).toISOString();
          } else if (subscription.current_period_end) {
            validUntil = new Date(subscription.current_period_end).toISOString();
          }
          
          console.log('Setting subscription valid until:', validUntil);
          
          const result = await updateUserSubscription(
            userId,
            'premium',
            validUntil,
            subscription.id,
            subscription.customer_id
          );
          
          console.log('Subscription update result:', result);
        } else {
          console.log('Warning: No user ID found for subscription.updated event');
        }
        break;
      }
      
      case 'subscription.canceled': {
        // Subscription cancelled (but may still be active until the end of the billing period)
        if (userId) {
          console.log('Processing subscription.canceled event for user:', userId);
          
          const subscription = event.data;
          let validUntil = null;
          
          // For canceled subscriptions, we might still want to honor the current period
          if (subscription.current_period_end) {
            validUntil = new Date(subscription.current_period_end).toISOString();
          }
          
          console.log('Setting subscription valid until:', validUntil);
          
          // Keep as premium until the end of the current period
          const result = await updateUserSubscription(
            userId,
            'premium',
            validUntil,
            subscription.id,
            subscription.customer_id
          );
          
          console.log('Subscription update result:', result);
        } else {
          console.log('Warning: No user ID found for subscription.canceled event');
        }
        break;
      }
      
      case 'subscription.expired': {
        // Subscription fully expired (no longer active)
        if (userId) {
          console.log('Processing subscription.expired event for user:', userId);
          
          // When expired, downgrade to free tier
          const result = await updateUserSubscription(
            userId,
            'free',
            null,
            null,
            null
          );
          
          console.log('Subscription update result:', result);
        } else {
          console.log('Warning: No user ID found for subscription.expired event');
        }
        break;
      }
      
      case 'transaction.completed': {
        // Transaction completed successfully
        if (userId) {
          console.log('Processing transaction.completed event for user:', userId);
          
          const transaction = event.data;
          let validUntil = null;
          
          // Get the subscription information
          if (transaction.subscription && transaction.subscription.next_billed_at) {
            validUntil = new Date(transaction.subscription.next_billed_at).toISOString();
            
            console.log('Setting subscription valid until:', validUntil);
            
            const result = await updateUserSubscription(
              userId,
              'premium',
              validUntil,
              transaction.subscription.id,
              transaction.customer_id
            );
            
            console.log('Subscription update result:', result);
          } else {
            console.log('Warning: No next billing date found for transaction.completed event');
          }
        } else {
          console.log('Warning: No user ID found for transaction.completed event');
        }
        break;
      }
      
      case 'transaction.failed': {
        // Transaction failed
        console.log('Transaction failed event received:', event.data);
        // Optionally flag account or send notification
        // Not downgrading immediately as there may be retry attempts
        break;
      }
      
      default:
        console.log(`Unhandled webhook event type: ${eventType}`);
    }
    
    // Mark event as processed
    try {
      console.log('Marking webhook event as processed...');
      const { error } = await supabase
        .from('paddle_events_billing')
        .update({ processed: true })
        .eq('paddle_event_id', event.event_id);
      
      if (error) {
        console.error('Error marking webhook as processed:', error);
      } else {
        console.log('Webhook event marked as processed');
      }
    } catch (err) {
      console.error('Error updating event status:', err);
    }
    
    // Acknowledge receipt of the webhook
    console.log('--- Webhook processing complete ---');
    res.status(200).send('Webhook received');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Error processing webhook');
  }
});

// Update the GET /subscription/:userId endpoint
app.get('/subscription/:userId', async (req, res) => {
  try {
    console.log('--- Fetching subscription ---');
    const { userId } = req.params;
    console.log('Fetching subscription for user:', userId);
    
    let { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    // If no subscription exists, create one for new user
    if (error && error.code === 'PGRST116') { // Supabase "not found" error code
      console.log('No subscription found, creating default subscription for new user');
      
      const { data: newSub, error: insertError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          tier: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Error creating subscription:', insertError);
        throw insertError;
      }
      
      data = newSub;
      console.log('Created new subscription for user:', userId);
    } else if (error) {
      console.error('Error fetching subscription:', error);
      throw error;
    }
    
    console.log('Fetched/created subscription data:', JSON.stringify(data, null, 2));
    console.log('--- Subscription fetch complete ---');
    
    res.json({ subscription: data });
  } catch (error) {
    console.error('Error getting subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create customer portal session (Billing API)
app.post('/customer-portal', async (req, res) => {
  try {
    console.log('--- Creating customer portal session (Billing API) ---');
    const { userId } = req.body;
    console.log('Creating portal for user:', userId);
    
    // Get user's subscription data from Supabase
    console.log('Fetching user subscription data...');
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('paddle_customer_id, paddle_subscription_id')
      .eq('user_id', userId)
      .single();
    
    if (subError) {
      console.error('Error fetching subscription:', subError);
      throw subError;
    }
    
    if (!subscription?.paddle_customer_id) {
      console.log('Error: No Paddle customer ID found');
      return res.status(400).json({ error: 'No active subscription found' });
    }
    
    console.log('Customer ID found:', subscription.paddle_customer_id);
    
    // Generate customer portal URL using Paddle Billing API
    console.log('Generating customer portal URL...');
    
    const response = await axios.post(
      'https://api.paddle.com/customers/portals',
      {
        customer_id: subscription.paddle_customer_id
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PADDLE_API_KEY}`,
          'Paddle-Version': '2023-10-10'
        }
      }
    );
    
    console.log('Paddle API response status:', response.status);
    console.log('Paddle API response data:', JSON.stringify(response.data, null, 2));
    
    // Return the customer portal URL
    res.json({ url: response.data.url });
    
    console.log('--- Customer portal session created ---');
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    
    // Enhanced error logging
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Cancel subscription (Billing API)
app.post('/cancel-subscription', async (req, res) => {
  try {
    console.log('--- Cancelling subscription (Billing API) ---');
    const { userId } = req.body;
    console.log('Cancelling subscription for user:', userId);
    
    // Get user's subscription ID
    console.log('Fetching user subscription data...');
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('paddle_subscription_id')
      .eq('user_id', userId)
      .single();
    
    if (subError) {
      console.error('Error fetching subscription:', subError);
      throw subError;
    }
    
    if (!subscription?.paddle_subscription_id) {
      console.log('Error: No active subscription found');
      return res.status(400).json({ error: 'No active subscription found' });
    }
    
    console.log('Subscription ID found:', subscription.paddle_subscription_id);
    
    // Cancel subscription via Paddle Billing API
    console.log('Cancelling subscription with Paddle...');
    
    const response = await axios.post(
      `https://api.paddle.com/subscriptions/${subscription.paddle_subscription_id}/cancel`,
      {
        effective_from: 'immediately' // Or 'end_of_billing_period'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PADDLE_API_KEY}`,
          'Paddle-Version': '2023-10-10'
        }
      }
    );
    
    console.log('Paddle API response status:', response.status);
    console.log('Paddle API response data:', JSON.stringify(response.data, null, 2));
    
    // Update user's subscription in database to free tier
    console.log('Updating user subscription status in database...');
    const updateResult = await updateUserSubscription(
      userId,
      'free',
      null,  // Set valid_until to null since we're cancelling immediately
      null,  // Remove subscription ID
      null   // Remove customer ID
    );
    
    console.log('Subscription update result:', updateResult);
    console.log('--- Subscription cancelled successfully ---');
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    
    // Enhanced error logging
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});