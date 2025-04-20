import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaGithub, FaBookmark, FaCode, FaTag } from 'react-icons/fa';
import { signInWithGitHub, supabase } from '../lib/supabaseClient';

const Login = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    
    checkAuth();
  }, [navigate]);
  
  const handleLogin = async () => {
    try {
      await signInWithGitHub();
      // The redirect will happen automatically
    } catch (error) {
      console.error('Login error:', error);
      alert('Error logging in with GitHub');
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center max-w-3xl mx-auto py-12">
      <div className="text-center mb-10">
        <div className="flex items-center justify-center mb-4">
          <FaBookmark className="text-5xl text-github-blue" />
        </div>
        <h1 className="text-4xl font-bold mb-4">GitHub ReadLater</h1>
        <p className="text-xl text-gray-600">Save and organize GitHub repositories for later reference</p>
      </div>
      
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-6 text-center">Sign In</h2>
        
        <button
          onClick={handleLogin}
          className="w-full bg-github-dark hover:bg-gray-800 text-white py-3 px-4 rounded-md flex items-center justify-center space-x-2 transition-colors"
        >
          <FaGithub className="text-xl" />
          <span>Continue with GitHub</span>
        </button>
      </div>
      
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <div className="flex justify-center mb-4">
            <FaBookmark className="text-3xl text-github-blue" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Save Repositories</h3>
          <p className="text-gray-600">Save interesting GitHub repositories with notes for later reference</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <div className="flex justify-center mb-4">
            <FaTag className="text-3xl text-github-blue" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Organize with Tags</h3>
          <p className="text-gray-600">Add custom tags to categorize and filter your saved repositories</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <div className="flex justify-center mb-4">
            <FaCode className="text-3xl text-github-blue" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Track Everything</h3>
          <p className="text-gray-600">Never lose track of useful repositories, libraries, and code examples</p>
        </div>
      </div>
    </div>
  );
};

export default Login;