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

// Get user's current subscription tier
export const getUserTier = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return null;
    }
    
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select('tier, valid_until')
      .eq('user_id', session.user.id)
      .single();
    
    if (error) {
      // If no subscription found, user is on free tier
      if (error.code === 'PGRST116') {
        return TIERS.FREE;
      }
      throw error;
    }
    
    // Check if subscription is still valid
    if (subscription.valid_until && new Date(subscription.valid_until) < new Date()) {
      return TIERS.FREE;
    }
    
    return subscription.tier || TIERS.FREE;
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

// Initialize a new user's subscription record
export const initializeUserSubscription = async (userId) => {
  try {
    const { error } = await supabase
      .from('user_subscriptions')
      .insert([
        {
          user_id: userId,
          tier: TIERS.FREE,
          created_at: new Date().toISOString(),
          valid_until: null
        }
      ]);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error initializing user subscription:', error);
    return false;
  }
};

// Update user's subscription tier
export const updateUserTier = async (userId, tier, validUntil = null) => {
  try {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        tier,
        valid_until: validUntil,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error updating user tier:', error);
    return false;
  }
};