import { supabase } from '../lib/supabaseClient';

/**
 * Get the current user's private repository access setting
 * @returns {Promise<boolean>} Whether private repo access is enabled
 */
export const getUserPrivateRepoSetting = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      throw new Error('User not authenticated');
    }
    
    // Check if user profile exists
    const { data, error } = await supabase
      .from('user_profiles')
      .select('allow_private_repos')
      .eq('id', session.user.id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {  // Record not found
        // Create profile with default setting (false)
        await supabase
          .from('user_profiles')
          .insert([{ id: session.user.id, allow_private_repos: false }]);
        return false;
      }
      throw error;
    }
    
    return data?.allow_private_repos || false;
  } catch (error) {
    console.error('Error getting private repo setting:', error);
    return false; // Default to false for safety
  }
};

/**
 * Update the user's private repository access setting
 * @param {boolean} allowPrivate - Whether to allow private repository access
 * @returns {Promise<boolean>} Success status
 */
export const updateUserPrivateRepoSetting = async (allowPrivate) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      throw new Error('User not authenticated');
    }
    
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        id: session.user.id,
        allow_private_repos: allowPrivate,
        updated_at: new Date()
      });
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error updating private repo setting:', error);
    throw error;
  }
};