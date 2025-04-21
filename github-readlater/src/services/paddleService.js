import { supabase } from '../lib/supabaseClient';
import { TIERS, updateUserTier } from './subscriptionService';

// API URL - change this to your actual backend URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const PADDLE_PLAN_ID = import.meta.env.VITE_PADDLE_PLAN_ID;

// Initialize Paddle
export const initializePaddle = () => {
  if (typeof window !== 'undefined' && window.Paddle) {
    window.Paddle.Setup({
      vendor: import.meta.env.VITE_PADDLE_VENDOR_ID
    });
  } else {
    console.error('Paddle is not loaded');
  }
};

// Generate checkout for Paddle
export const createCheckout = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }
    
    const userId = session.user.id;
    const planId = PADDLE_PLAN_ID; // Use your actual Paddle plan ID
    
    // Base URLs for success and cancel
    const baseUrl = window.location.origin;
    const successUrl = `${baseUrl}/subscription?success=true`;
    const cancelUrl = `${baseUrl}/subscription?canceled=true`;
    
    // Call backend API to generate checkout URL
    const response = await fetch(`${API_URL}/generate-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        planId,
        successUrl,
        cancelUrl,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create checkout URL');
    }
    
    const { url } = await response.json();
    
    // In a production environment, redirect to Paddle checkout
    window.location.href = url;
    
    return { url };
  } catch (error) {
    console.error('Error creating checkout:', error);
    
    // For development/testing, simulate success
    if (import.meta.env.DEV) {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Simulate successful subscription by updating the user's tier directly
        const validUntil = new Date();
        validUntil.setFullYear(validUntil.getFullYear() + 1); // 1 year subscription
        
        await updateUserTier(session.user.id, TIERS.PREMIUM, validUntil.toISOString());
        
        return {
          url: 'https://example.com/checkout/dev_session_id',
          isDevelopment: true
        };
      }
    }
    
    throw error;
  }
};

// Open Paddle's update payment method UI
export const updatePaymentMethod = async (subscriptionId) => {
  try {
    if (typeof window !== 'undefined' && window.Paddle) {
      window.Paddle.Checkout.open({
        override: `https://customer-platform.paddle.com/update-payment?subscription=${subscriptionId}`,
        successCallback: () => {
          console.log('Payment method updated successfully');
        },
        closeCallback: () => {
          console.log('Update payment method UI closed');
        },
      });
    } else {
      throw new Error('Paddle is not loaded');
    }
  } catch (error) {
    console.error('Error updating payment method:', error);
    alert('Failed to open payment update UI. Please try again later.');
  }
};

// Cancel subscription through Paddle
export const cancelSubscription = async (userId) => {
  try {
    // In a real implementation, this would call Paddle to cancel the subscription
    // For development, we'll just update the user's tier in our database
    
    // In production, this would be handled by the webhook when Paddle notifies of cancellation
    await updateUserTier(userId, TIERS.FREE, null);
    
    // Alert the user that they need to cancel through their Paddle account or email
    alert('Please note: Your subscription must also be canceled in your Paddle account or by contacting support.');
    
    return true;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
};

// Check subscription status
export const checkSubscriptionStatus = async (userId) => {
  try {
    // Get the user's subscription from our database
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('tier, valid_until, paddle_subscription_id, paddle_user_id')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    
    return {
      tier: data.tier,
      validUntil: data.valid_until,
      paddleSubscriptionId: data.paddle_subscription_id,
      paddleUserId: data.paddle_user_id,
      isActive: data.tier === TIERS.PREMIUM && new Date(data.valid_until) > new Date()
    };
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return {
      tier: TIERS.FREE,
      isActive: false
    };
  }
};