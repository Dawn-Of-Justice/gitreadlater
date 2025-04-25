const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

// Add this at the top of your index.js to debug env variables
console.log('Environment variables:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');
console.log('PADDLE_API_KEY:', process.env.PADDLE_API_KEY ? 'Set' : 'Missing');
console.log('PADDLE_PUBLIC_KEY_BILLING:', process.env.PADDLE_PUBLIC_KEY_BILLING ? 'Set' : 'Missing');

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
  origin: ['http://localhost:5173', 'https://your-production-domain.com'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper to update user subscription
async function updateUserSubscription(userId, tier, validUntil = null, paddleSubscriptionId = null, paddleUserId = null) {
  try {
    console.log(`Updating subscription for user ${userId} to tier ${tier}`);
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        tier,
        valid_until: validUntil,
        paddle_subscription_id: paddleSubscriptionId,
        paddle_user_id: paddleUserId, // Keeping this as paddle_user_id as requested
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
  // ... existing checkout code ...
});

// Verify Paddle Billing webhook signature
function verifyPaddleBillingWebhook(reqBody, signature, timestamp) {
  // ... existing verification code ...
}

// Paddle Billing webhook handler
app.post('/webhook', async (req, res) => {
  // ... existing webhook handler code ...
});

// Endpoint to get user's subscription
app.get('/subscription/:userId', async (req, res) => {
  // ... existing subscription endpoint code ...
});

// Create customer portal session (Billing API)
app.post('/customer-portal', async (req, res) => {
  // ... existing portal session code ...
});

// Cancel subscription (Billing API)
app.post('/cancel-subscription', async (req, res) => {
  // ... existing cancel subscription code ...
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

/**
 * Client-side service for interacting with the Paddle payment service
 * via our backend API
 */

// Replace with your actual API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Creates a checkout session for a subscription
 * @param {string} userId - The user's ID
 * @param {string} priceId - Optional price ID for the subscription plan
 */
export const createCheckout = async (userId, priceId = null) => {
  try {
    // Check if feature is enabled
    if (!import.meta.env.VITE_ENABLE_PREMIUM) {
      console.log('Premium features not yet enabled');
      throw new Error('Premium features are not yet available');
    }
    
    const response = await fetch(`${API_URL}/generate-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, priceId }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create checkout session');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating checkout:', error);
    throw error;
  }
};

/**
 * Gets the user's subscription information
 * @param {string} userId - The user's ID
 */
export const getSubscription = async (userId) => {
  try {
    const response = await fetch(`${API_URL}/subscription/${userId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch subscription');
    }
    
    const data = await response.json();
    return data.subscription;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    throw error;
  }
};

/**
 * Creates a customer portal session for managing subscriptions
 * @param {string} userId - The user's ID
 */
export const createPortalSession = async (userId) => {
  try {
    const response = await fetch(`${API_URL}/customer-portal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create portal session');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw error;
  }
};

/**
 * Cancels a user's subscription
 * @param {string} userId - The user's ID
 */
export const cancelSubscription = async (userId) => {
  try {
    const response = await fetch(`${API_URL}/cancel-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to cancel subscription');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
};
