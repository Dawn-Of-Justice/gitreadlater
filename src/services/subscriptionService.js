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

// Add these variables at the top of your file
let initializationInProgress = false;
let initializationTimeout = null;

// Add these variables at the top of your file
let lastCheckTimestamp = 0;
const THROTTLE_MS = 2000; // Only check once every 2 seconds

// Get user's subscription tier with caching
export const getUserTier = async (cachedSubscription = null, setUserSubscription = null) => {
  console.log('getUserTier called from:', new Error().stack.split('\n')[2]);
  try {
    // Use cached subscription if available
    if (cachedSubscription) {
      return cachedSubscription.tier;
    }
    
    // Throttle checks to prevent loops
    const now = Date.now();
    if (now - lastCheckTimestamp < THROTTLE_MS) {
      console.log('Throttling subscription check');
      return cachedSubscription?.tier || 'free';
    }
    
    lastCheckTimestamp = now;
    console.log('Fetching subscription from database');
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return 'free';
    }
    
    // Check if subscription exists
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching subscription:', error);
      return 'free';
    }
    
    if (!data) {
      // We need to create a subscription
      console.log(`Attempting to initialize subscription for user ${session.user.id}`);
      
      try {
        // Try to find again (double-check to prevent race conditions)
        const { data: doubleCheck } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();
          
        if (doubleCheck) {
          console.log('Subscription already exists for user');
          if (setUserSubscription) {
            setUserSubscription(doubleCheck);
          }
          return doubleCheck.tier || 'free';
        }
        
        // If we got here, we need to create it
        const { data: newSubscription, error: insertError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: session.user.id,
            tier: 'free',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('Error creating subscription:', insertError);
          return 'free';
        }
        
        if (setUserSubscription) {
          setUserSubscription(newSubscription);
        }
        
        return newSubscription.tier || 'free';
      } catch (initError) {
        console.error('Error initializing subscription:', initError);
        return 'free';
      }
    }
    
    if (setUserSubscription) {
      setUserSubscription(data);
    }
    
    return data.tier || 'free';
  } catch (error) {
    console.error('Error in getUserTier:', error);
    return 'free';
  }
};

// Check if user is on premium tier
export const isPremiumUser = async () => {
  const tier = await getUserTier();
  return tier === TIERS.PREMIUM;
};

// Get repository count with caching
export const getUserRepositoryCount = async () => {
  try {
    console.log('Fetching repository count from database');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return 0;
    
    const { count, error } = await supabase
      .from('repositories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id);
    
    if (error) {
      // Check if the error is about the missing table
      if (error.code === '42P01') {
        console.log('Repositories table does not exist yet');
        return 0; // Return 0 if table doesn't exist
      }
      console.error('Error counting repositories:', error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error('Error in getUserRepositoryCount:', error);
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
    // Prevent multiple concurrent calls for the same user
    if (initializationInProgress) {
      console.log('Initialization already in progress, skipping');
      return null;
    }
    
    initializationInProgress = true;
    
    // Clear any existing timeout
    if (initializationTimeout) {
      clearTimeout(initializationTimeout);
    }
    
    console.log(`Attempting to initialize subscription for user ${userId}`);
    
    // First check if subscription already exists
    const { data: existingSub, error: checkError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (existingSub) {
      console.log('Subscription already exists for user');
      initializationInProgress = false;
      return existingSub;
    }
    
    // Create a new subscription entry
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
      
    if (insertError) {
      // Check if error is due to uniqueness constraint
      if (insertError.code === '23505') {
        console.log('Subscription was created by another concurrent request');
        const { data: fetchedSub } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
          
        initializationInProgress = false;
        return fetchedSub;
      }
      
      initializationInProgress = false;
      throw insertError;
    }
    
    console.log('Subscription initialized successfully');
    
    // Release lock after a short delay to prevent race conditions
    initializationTimeout = setTimeout(() => {
      initializationInProgress = false;
    }, 5000);
    
    return insertData[0];
  } catch (error) {
    console.error('Error initializing user subscription:', error);
    initializationInProgress = false;
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