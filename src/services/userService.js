import { supabase } from '../lib/supabaseClient';

/**
 * Get the current user's private repository access setting
 * @returns {Promise<boolean>} Whether private repo access is enabled
 */
export const getUserPrivateRepoSetting = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.log('No authenticated session found');
      return false;
    }
    
    // Check if user profile exists
    const { data, error } = await supabase
      .from('user_profiles')
      .select('allow_private_repos')
      .eq('id', session.user.id)
      .single();
    
    if (error) {
      // If record not found, create a default profile
      if (error.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert([{ 
            id: session.user.id, 
            allow_private_repos: false 
          }]);
          
        if (insertError) throw insertError;
        return false;
      }
      throw error;
    }
    
    return data?.allow_private_repos || false;
  } catch (error) {
    console.error('Error getting private repo setting:', error);
    return false;
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