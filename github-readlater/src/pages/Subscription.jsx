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
import { 
  createCheckoutSession, 
  createCustomerPortalSession, 
  cancelSubscription 
} from '../services/stripeService';
import { supabase } from '../lib/supabaseClient';

const Subscription = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [userTier, setUserTier] = useState(TIERS.FREE);
  const [repoCount, setRepoCount] = useState(0);
  const [error, setError] = useState(null);
  
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
        console.error('Error fetching user data:', err);
        setError('Failed to load subscription information. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [navigate]);
  
  const handleSubscribe = async () => {
    try {
      setProcessingPayment(true);
      
      // In a real implementation, this would create a Stripe checkout session
      // and redirect the user to Stripe's checkout page
      
      // For development, we'll simulate the process
      const priceId = 'price_mock_premium_monthly';
      const { url } = await createCheckoutSession(priceId);
      
      // Normally, we would redirect to the Stripe checkout page
      // window.location.href = url;
      
      // For development, we'll simulate a successful subscription
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Simulate successful subscription
        setTimeout(() => {
          setUserTier(TIERS.PREMIUM);
          setProcessingPayment(false);
        }, 2000);
      }
    } catch (err) {
      console.error('Error processing subscription:', err);
      setError('Failed to process subscription. Please try again.');
      setProcessingPayment(false);
    }
  };
  
  const handleManageSubscription = async () => {
    try {
      setProcessingPayment(true);
      
      // In a real implementation, this would create a Stripe customer portal session
      // and redirect the user to Stripe's customer portal
      
      // For development, we'll simulate the process
      const { url } = await createCustomerPortalSession();
      
      // Normally, we would redirect to the Stripe customer portal
      // window.location.href = url;
      
      // For development, we'll just show a message
      alert('In a production environment, you would be redirected to Stripe\'s customer portal.');
      setProcessingPayment(false);
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
      
      // In a real implementation, this would call Stripe to cancel the subscription
      
      // For development, we'll simulate the process
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Simulate successful cancellation
        await cancelSubscription(session.user.id);
        setUserTier(TIERS.FREE);
      }
      
      setProcessingPayment(false);
    } catch (err) {
      console.error('Error canceling subscription:', err);
      setError('Failed to cancel subscription. Please try again.');
      setProcessingPayment(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Subscription Plans</h1>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-10 h-10 border-4 border-github-blue border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-md text-red-600">
          <p>{error}</p>
        </div>
      ) : (
        <div>
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Your Current Plan</h2>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <div>
                <p className="font-semibold">
                  {userTier === TIERS.PREMIUM ? (
                    <span className="flex items-center text-github-blue">
                      <FaCrown className="mr-2" /> Premium Plan
                    </span>
                  ) : (
                    <span>Free Plan</span>
                  )}
                </p>
                
                <p className="text-gray-600 mt-1">
                  {repoCount} / {REPOSITORY_LIMITS[userTier] === Infinity ? 'Unlimited' : REPOSITORY_LIMITS[userTier]} repositories saved
                </p>
              </div>
              
              {userTier === TIERS.PREMIUM ? (
                <div className="mt-4 md:mt-0">
                  <button
                    onClick={handleManageSubscription}
                    disabled={processingPayment}
                    className="btn btn-secondary mr-2"
                  >
                    Manage Subscription
                  </button>
                  
                  <button
                    onClick={handleCancelSubscription}
                    disabled={processingPayment}
                    className="btn bg-red-500 text-white hover:bg-red-600"
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
              <div className="bg-yellow-50 p-4 rounded-md mb-6">
                <p className="text-yellow-700">
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
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Upgrade to Premium</h3>
                
                <p className="mb-4">
                  Upgrade to our Premium plan for unlimited repositories and more advanced features.
                </p>
                
                <button
                  onClick={handleSubscribe}
                  disabled={processingPayment}
                  className="btn btn-primary"
                >
                  {processingPayment ? (
                    <FaSpinner className="animate-spin mr-2" />
                  ) : (
                    <>
                      Subscribe Now <FaArrowRight className="ml-2" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className={`bg-white rounded-lg shadow-md overflow-hidden ${userTier === TIERS.FREE ? 'border-2 border-github-blue' : ''}`}>
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h3 className="text-xl font-semibold">Free Plan</h3>
                <p className="text-gray-600">$0 / month</p>
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
                    <FaTimes className="text-gray-400 mt-1 mr-2" />
                    <span className="text-gray-500">Unlimited repositories</span>
                  </li>
                  <li className="flex items-start">
                    <FaTimes className="text-gray-400 mt-1 mr-2" />
                    <span className="text-gray-500">Advanced search filters</span>
                  </li>
                </ul>
                
                {userTier === TIERS.FREE ? (
                  <div className="mt-6">
                    <p className="text-github-blue font-semibold">Current Plan</p>
                  </div>
                ) : (
                  <div className="mt-6">
                    <button
                      onClick={handleCancelSubscription}
                      disabled={processingPayment}
                      className="btn btn-secondary w-full"
                    >
                      Downgrade to Free
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className={`bg-white rounded-lg shadow-md overflow-hidden ${userTier === TIERS.PREMIUM ? 'border-2 border-github-blue' : ''}`}>
              <div className="bg-github-blue px-6 py-4 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-white">Premium Plan</h3>
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
                
                {userTier === TIERS.PREMIUM ? (
                  <div className="mt-6">
                    <p className="text-github-blue font-semibold">Current Plan</p>
                  </div>
                ) : (
                  <div className="mt-6">
                    <button
                      onClick={handleSubscribe}
                      disabled={processingPayment}
                      className="btn btn-primary w-full"
                    >
                      {processingPayment ? (
                        <FaSpinner className="animate-spin mr-2" />
                      ) : (
                        'Upgrade to Premium'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscription;