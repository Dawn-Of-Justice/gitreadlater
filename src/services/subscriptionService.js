import { supabase } from '../lib/supabaseClient';

// Subscription tiers
export const TIERS = {
  FREE: 'free',
  PREMIUM: 'premium'
};

// Repository limits
export const REPOSITORY_LIMITS = {
  [TIERS.FREE]: 100,
  [TIERS.PREMIUM]: Infinity
};

// Monthly price in USD
export const TIER_PRICES = {
  [TIERS.FREE]: 0,
  [TIERS.PREMIUM]: 3
};

// Premium features
export const PREMIUM_FEATURES = [
  'Unlimited saved repositories',
  'Advanced search with filters',
  'Rich tagging system with nested tags',
  'Automatic categorization suggestions',
  'Export to third-party services'
];

// Add this near the top of your file
let initializationAttempted = false;

// Get user's current subscription tier
export const getUserTier = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return TIERS.FREE;
    }
    
    // First check if user has a subscription record at all
    const { data, error: checkError } = await supabase
      .from('user_subscriptions')
      .select('id, tier, valid_until')  // Get all data in one query
      .eq('user_id', session.user.id)
      .maybeSingle();
    
    // If no subscription record exists, create one first
    if (!data && !initializationAttempted) {
      console.log('No subscription record found, creating one');
      initializationAttempted = true; // Prevent multiple attempts in same session
      
      const success = await initializeUserSubscription(session.user.id);
      
      if (success) {
        console.log('Subscription record created successfully');
        
        // Re-fetch the subscription data to make sure we have it
        const { data: freshData } = await supabase
          .from('user_subscriptions')
          .select('tier, valid_until')
          .eq('user_id', session.user.id)
          .maybeSingle();
          
        if (freshData) {
          return freshData.tier || TIERS.FREE;
        }
      } else {
        console.error('Failed to create subscription record, continuing with free tier');
        localStorage.setItem('subscription_init_attempted', 'true');
      }
      
      return TIERS.FREE;
    }
    
    // Handle case where no data was returned
    if (!data) {
      console.log('No subscription data found for user, using FREE tier');
      return TIERS.FREE;
    }
    
    // Check if subscription is still valid
    if (data.valid_until && new Date(data.valid_until) < new Date()) {
      return TIERS.FREE;
    }
    
    return data.tier || TIERS.FREE;
  } catch (error) {
    console.error('Error getting user tier:', error);
    // Default to free tier on error
    return TIERS.FREE;
  }
};

// Check if user is on premium tier
export const isPremiumUser = async () => {
  const tier = await getUserTier();
  return tier === TIERS.PREMIUM;
};

// Get user's repository count
export const getUserRepositoryCount = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return 0;
    }
    
    const { count, error } = await supabase
      .from('saved_repositories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id);
    
    if (error) throw error;
    
    return count || 0;
  } catch (error) {
    console.error('Error getting repository count:', error);
    return 0;
  }
};

// Check if user can save more repositories
export const canSaveRepository = async () => {
  const tier = await getUserTier();
  const count = await getUserRepositoryCount();
  
  return count < REPOSITORY_LIMITS[tier];
};

// Function to initialize user subscription if it doesn't exist
export const initializeUserSubscription = async (userId) => {
  try {
    console.log(`Attempting to initialize subscription for user ${userId}`);
    
    // The RPC function is returning false, so we need to check the actual value
    const { data, error } = await supabase.rpc(
      'initialize_user_subscription_func', 
      { user_uuid: userId }
    );
    
    console.log('RPC function response:', data);
    
    if (error || data === false) {
      console.error('RPC function failed:', error || 'Function returned false');
      
      // Fallback direct insert if RPC fails
      try {
        console.log('Attempting direct insert as fallback');
        const { data: insertData, error: insertError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            tier: TIERS.FREE
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('Fallback insert failed:', insertError);
          return false;
        }
        
        console.log('Fallback insert succeeded:', insertData);
        return true;
      } catch (insertError) {
        console.error('Error in fallback insert:', insertError);
        return false;
      }
    }
    
    // Verify the record was created
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (verifyError || !verifyData) {
      console.error('Record verification failed:', verifyError || 'No record found after creation');
      return false;
    }
    
    console.log('Subscription record verified:', verifyData);
    return true;
  } catch (error) {
    console.error('Error initializing user subscription:', error);
    return false;
  }
};

// Update user's subscription tier
export const updateUserTier = async (userId, tier, validUntil = null, paddleUserId = null, paddleSubscriptionId = null) => {
  try {
    const updateData = {
      tier,
      valid_until: validUntil,
      updated_at: new Date().toISOString()
    };
    
    // Only include Paddle IDs if they are provided
    if (paddleUserId) {
      updateData.paddle_user_id = paddleUserId;
    }
    
    if (paddleSubscriptionId) {
      updateData.paddle_subscription_id = paddleSubscriptionId;
    }
    
    const { error } = await supabase
      .from('user_subscriptions')
      .update(updateData)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error updating user tier:', error);
    return false;
  }
};

// Get user's subscription details
export const getSubscriptionDetails = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return null;
    }
    
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('tier, valid_until, paddle_user_id, paddle_subscription_id')
      .eq('user_id', session.user.id)
      .single();
    
    if (error) throw error;
    
    return {
      tier: data.tier,
      validUntil: data.valid_until,
      paddleUserId: data.paddle_user_id,
      paddleSubscriptionId: data.paddle_subscription_id,
      isActive: data.tier === TIERS.PREMIUM && (!data.valid_until || new Date(data.valid_until) > new Date())
    };
  } catch (error) {
    console.error('Error getting subscription details:', error);
    return {
      tier: TIERS.FREE,
      isActive: false
    };
  }
};