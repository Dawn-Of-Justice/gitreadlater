import { useState, useEffect } from 'react';
import { FaLock, FaLockOpen, FaSpinner } from 'react-icons/fa';
import { getUserPrivateRepoSetting, updateUserPrivateRepoSetting } from '../services/userService';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabaseClient';

const PrivateRepoToggle = () => {
  const [allowPrivateRepos, setAllowPrivateRepos] = useState(false);
  const [loading, setLoading] = useState(false);
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
        setError('Failed to load your repository access settings');
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
      
      // Update local state
      setAllowPrivateRepos(newValue);
      
      // If turning on private access, need to re-authenticate with GitHub
      if (newValue) {
        // Start the re-authentication process with expanded scope
        await supabase.auth.signInWithOAuth({
          provider: 'github',
          options: {
            scopes: 'repo',
            redirectTo: `${window.location.origin}/auth/callback?refresh=true`
          }
        });
      }
    } catch (err) {
      console.error('Error updating private repo setting:', err);
      setError('Failed to update repository access setting');
      setAllowPrivateRepos(!allowPrivateRepos); // Revert UI state on error
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className={`p-4 rounded-lg ${themeClasses.card}`}>
      <div className="flex items-start justify-between">
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
            <p className="text-red-500 mt-1">{error}</p>
          )}
        </div>
        
        {loading ? (
          <div className="h-6 flex items-center">
            <FaSpinner className="animate-spin text-blue-500" />
          </div>
        ) : (
          <button
            onClick={handleToggle}
            disabled={updating}
            className={`${allowPrivateRepos ? themeClasses.button : themeClasses.secondaryButton} 
              px-3 py-2 rounded-md flex items-center transition-colors duration-300`}
          >
            {updating ? (
              <>
                <FaSpinner className="animate-spin mr-2" />
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
        )}
      </div>
    </div>
  );
};

export default PrivateRepoToggle;