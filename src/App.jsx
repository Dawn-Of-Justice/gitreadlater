import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import { ThemeProvider, SubscriptionProvider } from './context/ThemeContext';
import { CacheProvider, useCache } from './context/CacheContext';

// Componentsss
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
          
          <Route path="*" element={<NotFound />} />
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