/**
 * Client-side service for interacting with the Paddle payment service
 * via our backend API
 */
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
      console.error('Subscription fetch failed:', response.status, response.statusText);
      // Return a default subscription object instead of throwing
      return {
        tier: 'free',
        valid_until: null
      };
    }
    
    const data = await response.json();
    return data.subscription;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    // Return default instead of throwing
    return {
      tier: 'free',
      valid_until: null
    };
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