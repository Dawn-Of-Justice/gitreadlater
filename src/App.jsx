import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import { ThemeProvider, SubscriptionProvider } from './context/ThemeContext';
import { CacheProvider, useCache } from './context/CacheContext';
import { SpeedInsights } from "@vercel/speed-insights/react";
import ScrollToTop from './components/ScrollToTop';

// Components
import Header from './components/Header';
import Footer from './components/Footer';
import AuthCallback from './components/AuthCallback';

// Lazy load route components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const SaveRepository = lazy(() => import('./pages/SaveRepository'));
const RepositoryDetails = lazy(() => import('./pages/RepositoryDetails'));
const Subscription = lazy(() => import('./pages/Subscription'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Contact = lazy(() => import('./pages/Contact'));
const Roadmap = lazy(() => import('./pages/Roadmap'));
const NotFound = lazy(() => import('./pages/NotFound'));
const VotingDashboard = lazy(() => import('./pages/Admin/VotingDashboard'));
const AdminRoute = lazy(() => import('./components/AdminRoute'));

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
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>}>
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
            
            <Route path="/admin/voting-dashboard" element={<AdminRoute />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      
      <Footer />
    </div>
  );
}

function App() {
  return (
    <>
      <ThemeProvider>
        <SubscriptionProvider>
          <Router>
            <CacheProvider>
              <AppContent />
              <ScrollToTop />
            </CacheProvider>
          </Router>
        </SubscriptionProvider>
      </ThemeProvider>
      <SpeedInsights />
    </>
  );
}

export default App;