import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCheck, FaTimes, FaSpinner, FaCrown, FaArrowRight } from 'react-icons/fa';
import { 
  TIERS, 
  TIER_PRICES, 
  PREMIUM_FEATURES, 
  getUserTier, 
  getUserRepositoryCount, 
  REPOSITORY_LIMITS 
} from '../services/subscriptionService';
import { createCheckout, cancelSubscription, createPortalSession } from '../services/paddleClient.js';
import { supabase } from '../lib/supabaseClient';
import { useTheme } from '../context/ThemeContext';

const Subscription = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [userTier, setUserTier] = useState(TIERS.FREE);
  const [repoCount, setRepoCount] = useState(0);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState('');
  const [notified, setNotified] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);
  
  // Get theme from context
  const { darkMode, themeClasses } = useTheme();
  
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/login');
          return;
        }
        
        // Get user tier and repository count
        const tier = await getUserTier();
        const count = await getUserRepositoryCount();
        
        setUserTier(tier);
        setRepoCount(count);
        setError(null);
      } catch (err) {
        console.error('Error fetching subscription data:', err);
        setError('Failed to load subscription data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [navigate]);
  
  const handleSubscribe = async () => {
    try {
      setProcessingPayment(true);
      
      // Create a real Paddle checkout session
      const { url } = await createCheckout();
      
      // Redirect to the Paddle checkout page
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('Failed to generate checkout URL');
      }
      
      // Note: We don't need to set processingPayment to false here
      // as the user will be redirected away from this page
    } catch (err) {
      console.error('Error processing subscription:', err);
      setError('Failed to process subscription. Please try again.');
      setProcessingPayment(false);
    }
  };
  
  const handleManageSubscription = async () => {
    try {
      setProcessingPayment(true);
      
      // Create a real Paddle customer portal session
      const { url } = await createPortalSession();
      
      // Redirect to the Paddle customer portal
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('Failed to generate portal URL');
      }
    } catch (err) {
      console.error('Error managing subscription:', err);
      setError('Failed to open subscription management. Please try again.');
      setProcessingPayment(false);
    }
  };
  
  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your premium subscription? This action cannot be undone.')) {
      return;
    }
    
    try {
      setProcessingPayment(true);
      
      console.log('Subscription cancellation not yet implemented');
      // You could show a message to the user here
      
      setProcessingPayment(false);
    } catch (err) {
      console.error('Error canceling subscription:', err);
      setError('Failed to cancel subscription. Please try again.');
      setProcessingPayment(false);
    }
  };

  // Update the handleNotifyMe function to check for existing entries
const handleNotifyMe = async (e) => {
  e.preventDefault();
  
  if (!email.trim()) {
    setError('Please enter your email address');
    return;
  }
  
  try {
    setNotifyLoading(true);
    
    // Get current user ID if logged in
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    // Check if email already exists
    const { data: existingEntries } = await supabase
      .from('premium_notifications')
      .select()
      .eq('email', email.trim())
      .limit(1);
    
    if (existingEntries && existingEntries.length > 0) {
      // Already signed up
      setNotified(true);
      setError(null);
      return;
    }
    
    // Save to "premium_notifications" table in Supabase
    const { error: insertError } = await supabase
      .from('premium_notifications')
      .insert([
        { 
          email: email.trim(),
          user_id: userId || null,  // Associate with user if logged in
          created_at: new Date().toISOString()
        }
      ]);
      
    if (insertError) throw insertError;
    
    // Set local state to show success message
    setNotified(true);
    setError(null);
    
  } catch (err) {
    console.error('Error signing up for notifications:', err);
    // Check for unique constraint violation (email already exists)
    if (err.code === '23505') { // PostgreSQL unique constraint violation code
      // Show already subscribed message
      setNotified(true);
    } else {
      setError('Failed to sign up for notifications. Please try again.');
    }
  } finally {
    setNotifyLoading(false);
  }
};
  
  return (
    <div className={`${themeClasses.body} min-h-screen transition-colors duration-300`}>
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">Subscription Plans</h1>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className={`${themeClasses.dangerBanner} p-4 rounded-md transition-colors duration-300`}>
            <p>{error}</p>
          </div>
        ) : (
          <div>
            <div className={`${themeClasses.card} rounded-lg shadow-md p-6 mb-8 transition-colors duration-300`}>
              <h2 className="text-xl font-semibold mb-4">Your Current Plan</h2>
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                  <p className="font-semibold">
                    {userTier === TIERS.PREMIUM ? (
                      <span className="flex items-center text-blue-500">
                        <FaCrown className="mr-2" /> Premium Plan
                      </span>
                    ) : (
                      <span>Free Plan</span>
                    )}
                  </p>
                  
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1 transition-colors duration-300`}>
                    {repoCount} / {REPOSITORY_LIMITS[userTier] === Infinity ? 'Unlimited' : REPOSITORY_LIMITS[userTier]} repositories saved
                  </p>
                </div>
                
                {userTier === TIERS.PREMIUM ? (
                  <div className="mt-4 md:mt-0">
                    <button
                      onClick={handleManageSubscription}
                      disabled={processingPayment}
                      className={`${themeClasses.secondaryButton} px-4 py-2 rounded-md mr-2 transition-colors duration-300`}
                    >
                      Manage Subscription
                    </button>
                    
                    <button
                      onClick={handleCancelSubscription}
                      disabled={processingPayment}
                      className={`${themeClasses.dangerButton} px-4 py-2 rounded-md flex items-center transition-colors duration-300`}
                    >
                      {processingPayment ? (
                        <FaSpinner className="animate-spin mr-2" />
                      ) : (
                        <FaTimes className="mr-2" />
                      )}
                      Cancel Subscription
                    </button>
                  </div>
                ) : null}
              </div>
              
              {userTier === TIERS.FREE && repoCount >= REPOSITORY_LIMITS[TIERS.FREE] * 0.9 && (
                <div className={`${themeClasses.warningBanner} p-4 rounded-md mb-6 transition-colors duration-300`}>
                  <p>
                    You've used {repoCount} out of {REPOSITORY_LIMITS[TIERS.FREE]} repositories in your free plan. 
                    {repoCount >= REPOSITORY_LIMITS[TIERS.FREE] ? (
                      <span className="font-semibold"> You've reached the maximum limit.</span>
                    ) : (
                      <span> Consider upgrading to Premium for unlimited repositories.</span>
                    )}
                  </p>
                </div>
              )}
              
              {userTier === TIERS.FREE && (
                <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} pt-6 transition-colors duration-300`}>
                  <h3 className="text-lg font-semibold mb-4">Premium Plan Coming Soon</h3>
                  
                  <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'} transition-colors duration-300`}>
                    We're working on our Premium plan with unlimited repositories and advanced features. Stay tuned!
                  </p>
                  
                  <button
                    onClick={() => document.getElementById('notify-me-form').scrollIntoView({ behavior: 'smooth' })}
                    className={`${themeClasses.secondaryButton} px-6 py-3 rounded-md flex items-center transition-colors duration-300`}
                  >
                    Get notified when available <FaArrowRight className="ml-2" />
                  </button>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className={`${themeClasses.card} rounded-lg shadow-md overflow-hidden ${userTier === TIERS.FREE ? `border-2 ${themeClasses.cardHighlight}` : ''} transition-colors duration-300`}>
                <div className={`${themeClasses.planHeader} px-6 py-4 border-b transition-colors duration-300`}>
                  <h3 className="text-xl font-semibold">Free Plan</h3>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} transition-colors duration-300`}>$0 / month</p>
                </div>
                
                <div className="p-6">
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <FaCheck className="text-green-500 mt-1 mr-2" />
                      <span>Up to {REPOSITORY_LIMITS[TIERS.FREE]} saved repositories</span>
                    </li>
                    <li className="flex items-start">
                      <FaCheck className="text-green-500 mt-1 mr-2" />
                      <span>Basic search functionality</span>
                    </li>
                    <li className="flex items-start">
                      <FaCheck className="text-green-500 mt-1 mr-2" />
                      <span>Simple tagging system</span>
                    </li>
                    <li className="flex items-start">
                      <FaCheck className="text-green-500 mt-1 mr-2" />
                      <span>Import from GitHub stars</span>
                    </li>
                    <li className="flex items-start">
                      <FaTimes className={`${darkMode ? 'text-gray-500' : 'text-gray-400'} mt-1 mr-2 transition-colors duration-300`} />
                      <span className={`${darkMode ? 'text-gray-500' : 'text-gray-400'} transition-colors duration-300`}>Unlimited repositories</span>
                    </li>
                    <li className="flex items-start">
                      <FaTimes className={`${darkMode ? 'text-gray-500' : 'text-gray-400'} mt-1 mr-2 transition-colors duration-300`} />
                      <span className={`${darkMode ? 'text-gray-500' : 'text-gray-400'} transition-colors duration-300`}>Advanced search filters</span>
                    </li>
                  </ul>
                  
                  {userTier === TIERS.FREE ? (
                    <div className="mt-6">
                      <p className="text-blue-500 font-semibold">Current Plan</p>
                      <p className="text-sm text-gray-500 mt-1">
                        The Premium plan is coming soon. Get notified when it's available!
                      </p>
                    </div>
                  ) : (
                    <div className="mt-6">
                      <button
                        onClick={handleCancelSubscription}
                        disabled={processingPayment}
                        className={`${themeClasses.secondaryButton} w-full px-4 py-2 rounded-md transition-colors duration-300`}
                      >
                        Downgrade to Free
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className={`${themeClasses.card} rounded-lg shadow-md overflow-hidden transition-colors duration-300`}>
                <div className={`${themeClasses.premiumHeader} px-6 py-4 border-b transition-colors duration-300`}>
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold">Premium Plan</h3>
                    <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-semibold">Coming Soon</span>
                  </div>
                  <p className="text-gray-200">${TIER_PRICES[TIERS.PREMIUM]} / month</p>
                </div>
                
                <div className="p-6">
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <FaCheck className="text-green-500 mt-1 mr-2" />
                      <span className="font-semibold">Unlimited saved repositories</span>
                    </li>
                    <li className="flex items-start">
                      <FaCheck className="text-green-500 mt-1 mr-2" />
                      <span>Everything in Free plan</span>
                    </li>
                    {PREMIUM_FEATURES.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <FaCheck className="text-green-500 mt-1 mr-2" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="mt-6 border-t pt-6">
                    <h4 className="font-semibold mb-3">Get notified when Premium is available</h4>
                    
                    {notified ? (
                      <div className={`${themeClasses.infoBanner} p-4 rounded-md`}>
                        <p>Thank you! We'll notify you when Premium is ready.</p>
                      </div>
                    ) : (
                      <form id="notify-me-form" onSubmit={handleNotifyMe} className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Your email address"
                          className={`${themeClasses.input} flex-grow px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                          required
                        />
                        <button
                          type="submit"
                          disabled={notifyLoading}
                          className={`${themeClasses.button} px-4 py-2 rounded-md transition-colors duration-300`}
                        >
                          {notifyLoading ? (
                            <FaSpinner className="animate-spin mx-auto" />
                          ) : (
                            'Notify Me'
                          )}
                        </button>
                      </form>
                    )}
                    
                    <p className="text-xs text-gray-500 mt-2">
                      We'll only email you about Premium availability. No spam.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Subscription;