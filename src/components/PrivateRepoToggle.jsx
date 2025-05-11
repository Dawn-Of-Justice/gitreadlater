import { useState, useEffect } from 'react';
import { FaLock, FaLockOpen } from 'react-icons/fa';
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
      
      // If turning on private access, need to re-authenticate with GitHub
      if (newValue) {
        // Start the re-authentication process with expanded scope
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'github',
          options: {
            scopes: 'repo',
            redirectTo: `${window.location.origin}/auth/callback?refresh=true`
          }
        });
        
        if (error) throw error;
        // Don't update state here as we're redirecting to GitHub
      } else {
        // If disabling private access, update UI immediately
        setAllowPrivateRepos(false);
      }
    } catch (err) {
      console.error('Error updating private repo setting:', err);
      setError('Failed to update repository access setting');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className={`p-4 rounded-lg ${themeClasses?.card || 'bg-white dark:bg-gray-800'}`}>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg ${themeClasses?.card || 'bg-white dark:bg-gray-800'}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            Private Repository Access
          </h3>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            {allowPrivateRepos 
              ? "You can view and save your private GitHub repositories." 
              : "Currently you can only access your public GitHub repositories."}
          </p>
          {error && (
            <p className="text-red-500 mt-1">{error}</p>
          )}
        </div>
        
        <button
          onClick={handleToggle}
          disabled={updating}
          className={`px-3 py-2 rounded-md flex items-center transition-colors duration-300 ${
            updating 
              ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed' 
              : allowPrivateRepos
                ? 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {updating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current mr-2"></div>
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