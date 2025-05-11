import { useState, useEffect } from 'react';
import { FaLock, FaLockOpen, FaSpinner } from 'react-icons/fa';
import { getUserPrivateRepoSetting, updateUserPrivateRepoSetting } from '../services/userService';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabaseClient';

const PrivateRepoToggle = () => {
  const [allowPrivateRepos, setAllowPrivateRepos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const { darkMode, themeClasses } = useTheme();

  useEffect(() => {
    const fetchSetting = async () => {
      try {
        setLoading(true);
        const setting = await getUserPrivateRepoSetting();
        setAllowPrivateRepos(setting);
      } catch (err) {
        console.error('Error fetching private repo setting:', err);
        setError('Failed to load repository access settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSetting();
  }, []);

  const handleToggle = async () => {
    try {
      setUpdating(true);
      setError(null);
      const newValue = !allowPrivateRepos;
      
      // Update the setting in the database
      await updateUserPrivateRepoSetting(newValue);
      
      // Always re-authenticate with GitHub to update permissions
      // If enabling private access, use 'repo' scope
      // If disabling, use 'read:user,public_repo' scope for public repos only
      const scope = newValue ? 'repo' : 'read:user,public_repo';
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          scopes: scope,
          redirectTo: `${window.location.origin}/auth/callback?refresh=true`
        }
      });
      
      if (error) throw error;
      
      // Don't update state here as we're redirecting to GitHub
      // The state will be updated when the user returns from GitHub
    } catch (err) {
      console.error('Error updating private repo setting:', err);
      setError('Failed to update repository access setting');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className={`p-4 rounded-lg ${themeClasses.card}`}>
        <div className="flex justify-center">
          <div className={`animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 ${themeClasses.spinnerBorder || 'border-blue-500'}`}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg ${themeClasses.card}`}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className={`text-lg font-semibold ${themeClasses.text}`}>
            Private Repository Access
          </h3>
          <p className={`mt-1 ${themeClasses.textSecondary}`}>
            {allowPrivateRepos 
              ? "You can view and save your private GitHub repositories." 
              : "Currently you can only access your public GitHub repositories."}
          </p>
          {error && (
            <p className={`text-red-500 mt-1`}>{error}</p>
          )}
        </div>
        
        <button
          onClick={handleToggle}
          disabled={updating}
          className={`${
            updating 
              ? `${themeClasses.secondaryButton} opacity-80`
              : allowPrivateRepos 
                ? themeClasses.secondaryButton 
                : themeClasses.button
          } px-3 py-2 rounded-md flex items-center transition-colors duration-300`}
        >
          {updating ? (
            <>
              <div className={`animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 ${darkMode ? 'border-gray-300' : 'border-gray-600'} mr-2`}></div>
              <span>Updating...</span>
            </>
          ) : allowPrivateRepos ? (
            <>
              <FaLockOpen className="mr-2" />
              <span>Disable Private Access</span>
            </>
          ) : (
            <>
              <FaLock className="mr-2" />
              <span>Enable Private Access</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PrivateRepoToggle;