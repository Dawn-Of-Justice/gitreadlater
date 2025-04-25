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
  'Advanced search with filters',
  'Rich tagging system with nested tags',
  'Automatic categorization suggestions',
  'Export to third-party services (Notion, Google Calandar, etc.)',
];

// Add this near the top of your file
let initializationAttempted = false;

// Add a flag to track if we've logged cache usage recently
let loggedCacheUsage = false;
let loggedDatabaseFetch = false;

// Get user's subscription tier with caching
export const getUserTier = async (cachedSubscription = null, setUserSubscription = null) => {
  try {
    // Use cached subscription if available
    if (cachedSubscription) {
      if (!loggedCacheUsage) {
        console.log('Using cached subscription tier');
        // Reset after 1 second to allow for occasional logs
        loggedCacheUsage = true;
        setTimeout(() => { loggedCacheUsage = false; }, 1000);
      }
      return cachedSubscription.tier;
    }
    
    if (!loggedDatabaseFetch) {
      console.log('Fetching subscription from database');
      loggedDatabaseFetch = true;
      setTimeout(() => { loggedDatabaseFetch = false; }, 1000);
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return TIERS.FREE;
    }
    
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', session.user.id);
    
    if (error) {
      console.error('Error fetching subscription:', error);
      return TIERS.FREE;
    }
    
    const subscription = data && data.length > 0 ? data[0] : null;
    
    if (!subscription) {
      await initializeUserSubscription(session.user.id);
      return TIERS.FREE;
    }
    
    // Check if subscription is valid
    if (subscription.tier === TIERS.PREMIUM) {
      if (subscription.valid_until && new Date(subscription.valid_until) < new Date()) {
        console.log('Premium subscription expired');
        subscription.tier = TIERS.FREE;
        
        // Update in database
        await supabase
          .from('user_subscriptions')
          .update({
            tier: TIERS.FREE,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', session.user.id);
      }
    }
    
    // Update cache
    if (setUserSubscription) {
      setUserSubscription(subscription);
    }
    
    return subscription.tier;
  } catch (error) {
    console.error('Error getting user tier:', error);
    return TIERS.FREE;
  }
};

// Check if user is on premium tier
export const isPremiumUser = async () => {
  const tier = await getUserTier();
  return tier === TIERS.PREMIUM;
};

// Get repository count with caching
export const getUserRepositoryCount = async (cachedRepos = []) => {
  try {
    // If we have cached repositories, use the count from there
    if (cachedRepos.length > 0) {
      console.log('Using cached repository count');
      return cachedRepos.length;
    }
    
    console.log('Fetching repository count from database');
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
    
    // First check if subscription already exists
    const { data: existingSub, error: checkError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (existingSub) {
      console.log('Subscription already exists for user');
      return existingSub;
    }
    
    // Create a new subscription entry directly
    console.log('Creating new subscription entry');
    const { data: insertData, error: insertError } = await supabase
      .from('user_subscriptions')
      .insert([{
        user_id: userId,
        tier: 'free',
        valid_until: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select();
      
    if (insertError) throw insertError;
    
    console.log('Subscription initialized successfully');
    return insertData[0];
  } catch (error) {
    console.error('Error initializing user subscription:', error);
    throw error;
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