import { supabase } from '../lib/supabaseClient';
import { TIERS, updateUserTier } from './subscriptionService';

// API URL - change this to your actual backend URL
const API_URL = 'http://localhost:3000';

// Create checkout session for Stripe
export const createCheckoutSession = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }
    
    const userId = session.user.id;
    const priceId = import.meta.env.VITE_STRIPE_PRICE_ID || 'price_1234'; // Use your actual price ID
    
    // Base URLs for success and cancel
    const baseUrl = window.location.origin;
    const successUrl = `${baseUrl}/subscription?success=true`;
    const cancelUrl = `${baseUrl}/subscription?canceled=true`;
    
    // Call backend API to create Stripe checkout session
    const response = await fetch(`${API_URL}/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        priceId,
        successUrl,
        cancelUrl,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create checkout session');
    }
    
    const { sessionId, url } = await response.json();
    
    // In a production environment, redirect to Stripe
    window.location.href = url;
    
    return { sessionId, url };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    // For development/testing, simulate success
    if (import.meta.env.DEV) {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Simulate successful subscription by updating the user's tier directly
        const validUntil = new Date();
        validUntil.setFullYear(validUntil.getFullYear() + 1); // 1 year subscription
        
        await updateUserTier(session.user.id, TIERS.PREMIUM, validUntil.toISOString());
        
        return {
          sessionId: 'dev_session_id',
          url: 'https://example.com/checkout/dev_session_id',
          isDevelopment: true
        };
      }
    }
    
    throw error;
  }
};

// Create customer portal session for managing subscription
export const createCustomerPortalSession = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }
    
    const userId = session.user.id;
    const returnUrl = `${window.location.origin}/subscription`;
    
    // Call backend API to create Stripe customer portal session
    const response = await fetch(`${API_URL}/create-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        returnUrl,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create customer portal session');
    }
    
    const { url } = await response.json();
    
    // In a production environment, redirect to Stripe
    window.location.href = url;
    
    return { url };
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    
    // For development/testing, show an alert
    if (import.meta.env.DEV) {
      alert('In production, you would be redirected to the Stripe Customer Portal to manage your subscription.');
      
      return {
        url: 'https://example.com/customer-portal/dev_session_id',
        isDevelopment: true
      };
    }
    
    throw error;
  }
};

// Handle successful subscription (for development/testing)
export const handleSubscriptionSuccess = async (userId) => {
  try {
    // In a real implementation, this would verify the session with Stripe
    // and update the user's subscription status accordingly
    
    // For development purposes, we'll just update the user's tier
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1); // 1 year subscription
    
    await updateUserTier(userId, TIERS.PREMIUM, validUntil.toISOString());
    
    return true;
  } catch (error) {
    console.error('Error handling subscription success:', error);
    return false;
  }
};

// Cancel subscription
export const cancelSubscription = async (userId) => {
  try {
    // In a real implementation, this would call Stripe to cancel the subscription
    // For development, we'll just update the user's tier in our database
    
    // In production, this would be handled by the webhook when Stripe notifies of cancellation
    await updateUserTier(userId, TIERS.FREE, null);
    
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
      .select('tier, valid_until, stripe_customer_id, stripe_subscription_id')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    
    // In a real implementation, we might also check with Stripe
    // to ensure the subscription is still active
    
    return {
      tier: data.tier,
      validUntil: data.valid_until,
      stripeCustomerId: data.stripe_customer_id,
      stripeSubscriptionId: data.stripe_subscription_id,
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