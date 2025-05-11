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
  'Integration to third-party services (Notion, Google Calandar, etc.)',
];

let initializationAttempted = false;
let loggedCacheUsage = false;
let loggedDatabaseFetch = false;
let initializationInProgress = false;
let initializationTimeout = null;
let lastCheckTimestamp = 0;
const THROTTLE_MS = 2000; // Only check once every 2 seconds
let cachedTierValue = null;
let cacheValidUntil = 0;
const CACHE_DURATION = 60000; // Cache for 1 minute
const CALL_TRACKING = {
  enabled: true,
  callers: {},
  maxCalls: 5,
  log() {
    if (!this.enabled) return;
    
    console.log('---------- getUserTier Call Frequency ----------');
    Object.entries(this.callers)
      .sort(([, countA], [, countB]) => countB - countA)
      .forEach(([caller, count]) => {
        if (count > this.maxCalls) {
          console.warn(`⚠️ Excessive calls (${count}) from: ${caller}`);
        } else {
          console.log(`Calls (${count}) from: ${caller}`);
        }
      });
    console.log('----------------------------------------------');
  }
};

// Get user's subscription tier with strong caching
export const getUserTier = async (cachedSubscription = null, setUserSubscription = null) => {
  try {
    // Track who's calling this function
    if (CALL_TRACKING.enabled) {
      const stack = new Error().stack;
      const caller = stack.split('\n')[2].trim();
      CALL_TRACKING.callers[caller] = (CALL_TRACKING.callers[caller] || 0) + 1;
      
      // Log the tracking data periodically
      if (Object.keys(CALL_TRACKING.callers).length > 0 && 
          Math.random() < 0.1) { // Log ~10% of the time to avoid console spam
        CALL_TRACKING.log();
      }
    }
    
    // CACHING STRATEGY 1: Use the passed cached subscription
    if (cachedSubscription && cachedSubscription.tier) {
      return cachedSubscription.tier;
    }
    
    // CACHING STRATEGY 2: Use module-level cache if valid
    const now = Date.now();
    if (cachedTierValue && now < cacheValidUntil) {
      return cachedTierValue;
    }
    
    // CACHING STRATEGY 3: Throttle repeated calls
    if (now - lastCheckTimestamp < THROTTLE_MS) {
      //console.log('Throttling subscription check');
      return cachedTierValue || 'free';
    }
    
    // Update access timestamp
    lastCheckTimestamp = now;
    // console.log('Fetching subscription from database');
    
    // Get session
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
    
    // If we found data, use it
    if (data) {
      if (setUserSubscription) {
        setUserSubscription(data);
      }
      // Update cache
      cachedTierValue = data.tier || 'free';
      cacheValidUntil = now + CACHE_DURATION;
      return cachedTierValue;
    }
    
    // Otherwise need to create it (this block is rarely reached after the first call)
    try {
      console.log(`Attempting to initialize subscription for user ${session.user.id}`);
      const result = await initializeUserSubscription(session.user.id);
      
      if (result) {
        if (setUserSubscription) {
          setUserSubscription(result);
        }
        // Update cache
        cachedTierValue = result.tier || 'free';
        cacheValidUntil = now + CACHE_DURATION;
        return cachedTierValue;
      }
      
      return 'free';
    } catch (initError) {
      console.error('Error initializing subscription:', initError);
      return 'free';
    }
  } catch (error) {
    console.error('Error in getUserTier:', error);
    return 'free';
  }
};

// Add a function to explicitly clear the cache when needed
export const clearSubscriptionCache = () => {
  cachedTierValue = null;
  cacheValidUntil = 0;
};

// Check if user is on premium tier
export const isPremiumUser = async () => {
  const tier = await getUserTier();
  return tier === TIERS.PREMIUM;
};

// Get repository count with caching
export const getUserRepositoryCount = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return 0;
    
    let totalCount = 0;
    
    // Try main repositories table first
    try {
      const { count: repoCount, error: repoError } = await supabase
        .from('repositories')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);
        
      if (!repoError) {
        totalCount += (repoCount || 0);
      }
    } catch (error) {
      console.error('Error counting main repositories:', error);
    }
    
    // Also try saved_repositories table
    try {
      const { count: savedCount, error: savedError } = await supabase
        .from('saved_repositories')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);
        
      if (!savedError) {
        totalCount += (savedCount || 0);
      }
    } catch (error) {
      console.error('Error counting saved repositories:', error);
    }
    
    return totalCount;
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