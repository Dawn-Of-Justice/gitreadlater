import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import { ThemeProvider, SubscriptionProvider } from './context/ThemeContext';
import { CacheProvider, useCache } from './context/CacheContext';

// Components
import Header from './components/Header';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import AuthCallback from './components/AuthCallback';
import SaveRepository from './pages/SaveRepository';
import RepositoryDetails from './pages/RepositoryDetails';
import Subscription from './pages/Subscription';
import NotFound from './pages/NotFound';

// New static pages
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Contact from './pages/Contact';
import Roadmap from './pages/Roadmap';

// Create an AppContent component that will use the hooks
function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { clearCache } = useCache();

  // Add these state variables
  const [repositories, setRepositories] = useState([]);
  const [filteredRepositories, setFilteredRepositories] = useState([]);
  const [showRepositories, setShowRepositories] = useState(false);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false); // Renamed to avoid conflict

  useEffect(() => {
    // Check for an existing session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
      }
      
      setLoading(false);
      
      // Set up auth listener
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            setUser(session.user);
          } else {
            setUser(null);
          }
        }
      );
      
      return () => {
        if (authListener && authListener.subscription) {
          authListener.subscription.unsubscribe();
        }
      };
    };
    
    checkSession();
  }, []);

  // Load repositories when component mounts
  useEffect(() => {
    if (user) {
      loadAllRepositories();
    }
  }, [user]);

  // Filter repositories when url changes
  useEffect(() => {
    if (!repositories.length) return;
    
    const query = url.toLowerCase();
    if (!query) {
      setFilteredRepositories(repositories);
      return;
    }

    const filtered = repositories.filter(repo => 
      repo.name.toLowerCase().includes(query) || 
      repo.full_name.toLowerCase().includes(query) ||
      (repo.description && repo.description.toLowerCase().includes(query))
    );

    setFilteredRepositories(filtered);
  }, [url, repositories]);

  // Load all repositories (both starred and user's own)
  const loadAllRepositories = async () => {
    setIsLoadingRepos(true); // Changed from setLoading
    try {
      // Load starred repositories
      const starredRepos = await getStarredRepositories();
      
      // Mark these as starred
      const markedStarred = starredRepos.map(repo => ({
        ...repo,
        isStarred: true
      }));
      
      // Load user repositories
      const userRepos = await getUserRepositories();
      
      // Mark these as user's own
      const markedUserRepos = userRepos.map(repo => ({
        ...repo,
        isOwned: true
      }));
      
      // Combine both types, removing duplicates by ID
      const allRepos = [...markedStarred];
      
      // Add user repos that aren't already in the list
      markedUserRepos.forEach(userRepo => {
        if (!allRepos.find(repo => repo.id === userRepo.id)) {
          allRepos.push(userRepo);
        }
      });
      
      setRepositories(allRepos);
      setFilteredRepositories(allRepos);
    } catch (error) {
      console.error('Failed to load repositories:', error);
    } finally {
      setIsLoadingRepos(false); // Changed from setLoading
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (repositories.length === 0) {
      loadAllRepositories();
    }
    setShowRepositories(true);
  };

  // Handle repository selection
  const selectRepository = (repo) => {
    setUrl(repo.html_url);
    setRepoPreview({
      name: repo.name,
      owner: repo.owner.login,
      full_name: repo.full_name,
      description: repo.description,
      language: repo.language,
      stargazers_count: repo.stargazers_count
    });
    setShowRepositories(false);
  };

  // Protected route component
  const ProtectedRoute = ({ children }) => {
    if (loading) {
      return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }
    
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    
    return children;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearCache(); // Clear cache on logout
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header user={user} onLogout={handleLogout} />
      
      <main className="flex-grow">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/roadmap" element={<Roadmap />} />
          
          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/save" element={
            <ProtectedRoute>
              <SaveRepository />
            </ProtectedRoute>
          } />
          
          <Route path="/repository/:id" element={
            <ProtectedRoute>
              <RepositoryDetails />
            </ProtectedRoute>
          } />
          
          <Route path="/subscription" element={
            <ProtectedRoute>
              <Subscription />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      
      <Footer />
    </div>
  );
}

// Main App component now just provides context providers and the router
function App() {
  return (
    <ThemeProvider>
      <SubscriptionProvider>
        <Router>
          <CacheProvider>
            <AppContent />
          </CacheProvider>
        </Router>
      </SubscriptionProvider>
    </ThemeProvider>
  );
}

export default App;