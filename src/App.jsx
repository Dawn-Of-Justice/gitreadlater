import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import { ThemeProvider } from './context/ThemeContext';

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

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for an existing session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
      
      // Set up auth listener
      const { data: authListener } = supabase.auth.onAuthStateChange(
        (event, session) => {
          setUser(session?.user || null);
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

  useEffect(() => {
    // Reset initialization flag when app loads
    if (localStorage.getItem('subscription_init_attempted')) {
      // Only clear it if we've actually logged in
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          localStorage.removeItem('subscription_init_attempted');
        }
      });
    }
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

  return (
    <ThemeProvider>
      <Router>
        <div className="flex flex-col min-h-screen">
          <Header user={user} />
          
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
      </Router>
    </ThemeProvider>
  );
}

export default App;