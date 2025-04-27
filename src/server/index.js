const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const logger = require('../services/loggingService.cjs');
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

// Add rate limiting middleware
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later'
});

// Apply rate limiting to all routes
app.use('/api/', apiLimiter);

// More strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many authentication attempts, please try again later'
});

// Apply to authentication-related endpoints
app.use('/generate-checkout', authLimiter);
app.use('/customer-portal', authLimiter);

// Helper to update user subscription
async function updateUserSubscription(userId, tier, validUntil = null, paddleSubscriptionId = null, paddleCustomerId = null) {
  try {
    logger.info(`Updating subscription for user ${userId} to tier ${tier}`);
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
      logger.error('Error updating user subscription in database:', error);
      throw error;
    }
    
    logger.info(`Subscription updated successfully for user ${userId}`);
    return true;
  } catch (error) {
    logger.error('Error updating user subscription:', error);
    return false;
  }
}

// Generate Paddle checkout URL - Billing API
app.post('/generate-checkout', async (req, res) => {
  try {
    logger.info('--- Starting checkout generation (Billing API) ---');
    const { userId, priceId, successUrl, cancelUrl } = req.body;
    
    logger.info('Request body:', JSON.stringify(req.body, null, 2));
    logger.info('Generating checkout for user:', userId);
    logger.info('Price ID:', priceId);
    
    // Validate required parameters
    if (!userId) {
      logger.info('Error: Missing userId parameter');
      return res.status(400).json({ error: 'Missing userId parameter' });
    }
    
    // Get user from Supabase
    logger.info('Fetching user from Supabase...');
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError) {
      logger.error('Supabase auth error:', authError);
      return res.status(401).json({ error: 'Authentication failed' });
    }
    
    if (!authData || !authData.user || !authData.user.email) {
      logger.info('Error: Unable to retrieve user email');
      return res.status(400).json({ error: 'Unable to retrieve user email' });
    }
    
    logger.info('User email retrieved:', authData.user.email);
    
    // For development, add fallback for missing price ID
    const finalPriceId = priceId || process.env.PADDLE_PRICE_ID;
    
    if (!finalPriceId) {
      logger.info('Error: No price ID provided or configured');
      return res.status(400).json({ error: 'No price ID provided or configured' });
    }
    
    // Check if Paddle credentials are available
    if (!PADDLE_API_KEY) {
      logger.error('Missing Paddle API key');
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
    
    logger.info('Paddle Billing API request payload:', JSON.stringify(checkoutRequest, null, 2));
    
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
    
    logger.info('Paddle API response status:', response.status);
    logger.info('Paddle API response data:', JSON.stringify(response.data, null, 2));
    
    // Return the checkout URL to the client
    res.json({ 
      url: response.data.url
    });
    
    logger.info('--- Checkout generation complete ---');
  } catch (error) {
    logger.error('Error generating checkout URL:', error);
    
    // Enhanced error logging
    if (error.response) {
      logger.error('Error response status:', error.response.status);
      logger.error('Error response headers:', JSON.stringify(error.response.headers, null, 2));
      logger.error('Error response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      logger.error('Error request (no response received):', error.request);
    } else {
      logger.error('Error details:', error.message);
    }
    
    res.status(500).json({ error: error.message });
    logger.info('--- Checkout generation failed ---');
  }
});

// Verify Paddle Billing webhook signature
function verifyPaddleBillingWebhook(reqBody, signature, timestamp) {
  if (!PADDLE_PUBLIC_KEY_BILLING) {
    // Don't allow webhooks if key isn't configured
    logger.error('Paddle public key not configured, webhook verification failed');
    return false;
  }

  try {
    logger.info('Verifying webhook signature with timestamp:', timestamp);
    
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
    
    logger.info('Signature verification result:', isValid);
    return isValid;
  } catch (error) {
    logger.error('Error verifying webhook signature:', error.name);
    return false;
  }
}

// Paddle Billing webhook handler
app.post('/webhook', async (req, res) => {
  try {
    logger.info('--- Webhook received (Paddle Billing) ---');
    logger.info('Webhook payload:', JSON.stringify(req.body, null, 2));
    
    // Get signature and timestamp from headers
    const signature = req.headers['paddle-signature'];
    const timestamp = req.headers['paddle-signature-timestamp'];
    
    if (!signature || !timestamp) {
      logger.info('Error: Missing webhook signature headers');
      return res.status(400).send('Missing webhook signature headers');
    }
    
    // Verify webhook signature
    const isValid = verifyPaddleBillingWebhook(req.body, signature, timestamp);
    
    if (!isValid) {
      logger.info('Error: Invalid webhook signature');
      return res.status(400).send('Invalid webhook signature');
    }
    
    // Get the event data from the webhook
    const event = req.body;
    const eventType = event.event_type;
    
    logger.info('Webhook event type:', eventType);
    
    // Store webhook event in Supabase for audit
    try {
      logger.info('Storing webhook event in database...');
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
        logger.error('Error storing webhook event:', error);
      } else {
        logger.info('Webhook event stored successfully');
      }
    } catch (err) {
      logger.error(`Error storing event: ${err.message}`);
      // Continue processing even if storage fails
    }
    
    // Extract user ID from custom data
    let userId;
    try {
      logger.info('Extracting user ID from custom data...');
      
      // For subscription events
      if (event.data && event.data.custom_data && event.data.custom_data.userId) {
        userId = event.data.custom_data.userId;
      }
      // For transaction events
      else if (event.data && event.data.subscription && event.data.subscription.custom_data && event.data.subscription.custom_data.userId) {
        userId = event.data.subscription.custom_data.userId;
      }
      
      logger.info('Extracted user ID:', userId);
    } catch (err) {
      logger.error('Error extracting user ID:', err);
    }
    
    // Process webhook based on event type
    logger.info('Processing webhook based on event type:', eventType);
    
    switch (eventType) {
      case 'subscription.created': {
        // New subscription created
        if (userId) {
          logger.info('Processing subscription.created event for user:', userId);
          
          const subscription = event.data;
          let validUntil = null;
          
          // Get the next billing date or current period end
          if (subscription.next_billed_at) {
            validUntil = new Date(subscription.next_billed_at).toISOString();
          } else if (subscription.current_period_end) {
            validUntil = new Date(subscription.current_period_end).toISOString();
          }
          
          logger.info('Setting subscription valid until:', validUntil);
          
          const result = await updateUserSubscription(
            userId,
            'premium',
            validUntil,
            subscription.id,
            subscription.customer_id
          );
          
          logger.info('Subscription update result:', result);
        } else {
          logger.info('Warning: No user ID found for subscription.created event');
        }
        break;
      }
      
      case 'subscription.updated': {
        // Subscription details updated
        if (userId) {
          logger.info('Processing subscription.updated event for user:', userId);
          
          const subscription = event.data;
          let validUntil = null;
          
          // Get the next billing date or current period end
          if (subscription.next_billed_at) {
            validUntil = new Date(subscription.next_billed_at).toISOString();
          } else if (subscription.current_period_end) {
            validUntil = new Date(subscription.current_period_end).toISOString();
          }
          
          logger.info('Setting subscription valid until:', validUntil);
          
          const result = await updateUserSubscription(
            userId,
            'premium',
            validUntil,
            subscription.id,
            subscription.customer_id
          );
          
          logger.info('Subscription update result:', result);
        } else {
          logger.info('Warning: No user ID found for subscription.updated event');
        }
        break;
      }
      
      case 'subscription.canceled': {
        // Subscription cancelled (but may still be active until the end of the billing period)
        if (userId) {
          logger.info('Processing subscription.canceled event for user:', userId);
          
          const subscription = event.data;
          let validUntil = null;
          
          // For canceled subscriptions, we might still want to honor the current period
          if (subscription.current_period_end) {
            validUntil = new Date(subscription.current_period_end).toISOString();
          }
          
          logger.info('Setting subscription valid until:', validUntil);
          
          // Keep as premium until the end of the current period
          const result = await updateUserSubscription(
            userId,
            'premium',
            validUntil,
            subscription.id,
            subscription.customer_id
          );
          
          logger.info('Subscription update result:', result);
        } else {
          logger.info('Warning: No user ID found for subscription.canceled event');
        }
        break;
      }
      
      case 'subscription.expired': {
        // Subscription fully expired (no longer active)
        if (userId) {
          logger.info('Processing subscription.expired event for user:', userId);
          
          // When expired, downgrade to free tier
          const result = await updateUserSubscription(
            userId,
            'free',
            null,
            null,
            null
          );
          
          logger.info('Subscription update result:', result);
        } else {
          logger.info('Warning: No user ID found for subscription.expired event');
        }
        break;
      }
      
      case 'transaction.completed': {
        // Transaction completed successfully
        if (userId) {
          logger.info('Processing transaction.completed event for user:', userId);
          
          const transaction = event.data;
          let validUntil = null;
          
          // Get the subscription information
          if (transaction.subscription && transaction.subscription.next_billed_at) {
            validUntil = new Date(transaction.subscription.next_billed_at).toISOString();
            
            logger.info('Setting subscription valid until:', validUntil);
            
            const result = await updateUserSubscription(
              userId,
              'premium',
              validUntil,
              transaction.subscription.id,
              transaction.customer_id
            );
            
            logger.info('Subscription update result:', result);
          } else {
            logger.info('Warning: No next billing date found for transaction.completed event');
          }
        } else {
          logger.info('Warning: No user ID found for transaction.completed event');
        }
        break;
      }
      
      case 'transaction.failed': {
        // Transaction failed
        logger.info('Transaction failed event received:', event.data);
        // Optionally flag account or send notification
        // Not downgrading immediately as there may be retry attempts
        break;
      }
      
      default:
        logger.info(`Unhandled webhook event type: ${eventType}`);
    }
    
    // Mark event as processed
    try {
      logger.info('Marking webhook event as processed...');
      const { error } = await supabase
        .from('paddle_events_billing')
        .update({ processed: true })
        .eq('paddle_event_id', event.event_id);
      
      if (error) {
        logger.error('Error marking webhook as processed:', error);
      } else {
        logger.info('Webhook event marked as processed');
      }
    } catch (err) {
      logger.error('Error updating event status:', err);
    }
    
    // Acknowledge receipt of the webhook
    logger.info('--- Webhook processing complete ---');
    res.status(200).send('Webhook received');
  } catch (error) {
    logger.error('Error processing webhook:', error);
    res.status(500).send('Error processing webhook');
  }
});

// Get user subscription 
app.get('/subscription/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    logger.info('====================');
    logger.info(`Fetching subscription for user: ${userId}`);
    
    // Log the Supabase client details (excluding sensitive info)
    logger.info('Using Supabase URL:', supabaseUrl);
    logger.info('Service key present?', !!supabaseServiceKey);
    
    // First check if user has a subscription
    logger.info('Querying user_subscriptions table...');
    let { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId);
      
    if (error) {
      logger.error('Error fetching subscription:', error);
      throw error;
    }
    
    logger.info(`Found ${data ? data.length : 0} subscription records`);
    
    // If no subscription exists, create one
    if (!data || data.length === 0) {
      logger.info('No subscription found, creating default subscription');
      
      // Define new subscription object
      const newSubscription = {
        user_id: userId,
        tier: 'free',
        valid_until: null,
        paddle_subscription_id: null,
        paddle_customer_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      logger.info('New subscription object:', newSubscription);
      
      // Try to insert
      logger.info('Inserting into user_subscriptions table...');
      const insertResult = await supabase
        .from('user_subscriptions')
        .insert([newSubscription]);
        
      logger.info('Insert raw result:', insertResult);
      
      if (insertResult.error) {
        logger.error('Error creating subscription:', insertResult.error);
        throw insertResult.error;
      }
      
      // Fetch the newly created subscription
      logger.info('Fetching newly created subscription...');
      const { data: newData, error: fetchError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId);
        
      if (fetchError) {
        logger.error('Error fetching new subscription:', fetchError);
        throw fetchError;
      }
      
      data = newData;
      logger.info('Created and fetched new subscription:', data);
    }
    
    // Return the first subscription
    logger.info('Returning subscription data:', data[0]);
    logger.info('====================');
    res.json({ subscription: data[0] });
  } catch (error) {
    logger.error('ERROR IN SUBSCRIPTION ENDPOINT:', error);
    logger.info('====================');
    // Return a default subscription instead of an error
    res.json({ 
      subscription: {
        tier: 'free',
        valid_until: null,
        user_id: req.params.userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } 
    });
  }
});

// Create customer portal session (Billing API)
app.post('/customer-portal', async (req, res) => {
  try {
    logger.info('--- Creating customer portal session (Billing API) ---');
    const { userId } = req.body;
    logger.info('Creating portal for user:', userId);
    
    // Get user's subscription data from Supabase
    logger.info('Fetching user subscription data...');
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('paddle_customer_id, paddle_subscription_id')
      .eq('user_id', userId)
      .single();
    
    if (subError) {
      logger.error('Error fetching subscription:', subError);
      throw subError;
    }
    
    if (!subscription?.paddle_customer_id) {
      logger.info('Error: No Paddle customer ID found');
      return res.status(400).json({ error: 'No active subscription found' });
    }
    
    logger.info('Customer ID found:', subscription.paddle_customer_id);
    
    // Generate customer portal URL using Paddle Billing API
    logger.info('Generating customer portal URL...');
    
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
    
    logger.info('Paddle API response status:', response.status);
    logger.info('Paddle API response data:', JSON.stringify(response.data, null, 2));
    
    // Return the customer portal URL
    res.json({ url: response.data.url });
    
    logger.info('--- Customer portal session created ---');
  } catch (error) {
    logger.error('Error creating customer portal session:', error);
    
    // Enhanced error logging
    if (error.response) {
      logger.error('Error response status:', error.response.status);
      logger.error('Error response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Cancel subscription (Billing API)
app.post('/cancel-subscription', async (req, res) => {
  try {
    logger.info('--- Cancelling subscription (Billing API) ---');
    const { userId } = req.body;
    logger.info('Cancelling subscription for user:', userId);
    
    // Get user's subscription ID
    logger.info('Fetching user subscription data...');
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('paddle_subscription_id')
      .eq('user_id', userId)
      .single();
    
    if (subError) {
      logger.error('Error fetching subscription:', subError);
      throw subError;
    }
    
    if (!subscription?.paddle_subscription_id) {
      logger.info('Error: No active subscription found');
      return res.status(400).json({ error: 'No active subscription found' });
    }
    
    logger.info('Subscription ID found:', subscription.paddle_subscription_id);
    
    // Cancel subscription via Paddle Billing API
    logger.info('Cancelling subscription with Paddle...');
    
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
    
    logger.info('Paddle API response status:', response.status);
    logger.info('Paddle API response data:', JSON.stringify(response.data, null, 2));
    
    // Update user's subscription in database to free tier
    logger.info('Updating user subscription status in database...');
    const updateResult = await updateUserSubscription(
      userId,
      'free',
      null,  // Set valid_until to null since we're cancelling immediately
      null,  // Remove subscription ID
      null   // Remove customer ID
    );
    
    logger.info('Subscription update result:', updateResult);
    logger.info('--- Subscription cancelled successfully ---');
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error canceling subscription:', error);
    
    // Enhanced error logging
    if (error.response) {
      logger.error('Error response status:', error.response.status);
      logger.error('Error response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const { data, error } = await supabase
      .from('health_check')
      .select('*')
      .limit(1);
      
    // If database connection fails, we'll get an error
    if (error) {
      throw new Error('Database connection failed');
    }
    
    res.status(200).json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'up',
        database: 'up'
      }
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'up',
        database: 'down'
      },
      message: 'Health check failed'
    });
  }
});

app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content response
});

app.get('/', (req, res) => {
  res.status(200).json({
    name: 'GitHub ReadLater API',
    status: 'online',
    version: '1.0.0',
    endpoints: [
      '/health - Check API health status',
    ],
    documentation: 'See README for API documentation'
  });
});

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});