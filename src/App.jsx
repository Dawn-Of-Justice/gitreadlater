import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import { ThemeProvider } from './context/ThemeContext';
import { CacheProvider, useCache } from './context/CacheContext';
import { SpeedInsights } from "@vercel/speed-insights/react";
import ScrollToTop from './components/ScrollToTop';
import { AuthProvider, useAuth } from './context/AuthContext';

// Components
import Header from './components/Header';
import Footer from './components/Footer';
import AuthCallback from './components/AuthCallback';

// Lazy load route components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const SaveRepository = lazy(() => import('./pages/SaveRepository'));
const RepositoryDetails = lazy(() => import('./pages/RepositoryDetails'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Contact = lazy(() => import('./pages/Contact'));
const Roadmap = lazy(() => import('./pages/Roadmap'));
const NotFound = lazy(() => import('./pages/NotFound'));
const VotingDashboard = lazy(() => import('./pages/Admin/VotingDashboard'));
const AdminRoute = lazy(() => import('./components/AdminRoute'));

// Create an AppContent component that will use the hooks
function AppContent() {
  const { user, loading, isAuthenticated } = useAuth();
  const { clearCache } = useCache();
  const navigate = useNavigate();
  const [appReady, setAppReady] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('Auth state changed:', { user: !!user, loading, isAuthenticated, appReady });
  }, [user, loading, isAuthenticated, appReady]);

  // Ensure minimum loading time to prevent flash
  useEffect(() => {
    if (!loading) {
      // Add a longer delay to ensure auth state is fully resolved
      const timer = setTimeout(() => {
        console.log('Setting app ready to true');
        setAppReady(true);
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      setAppReady(false);
    }
  }, [loading]);

  // Show loading spinner while checking authentication or during app initialization
  if (loading || !appReady) {
    console.log('Showing loading screen', { loading, appReady });
    return (
      <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
        <div className="flex justify-center items-center flex-grow">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, only show login and public routes
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header user={user} onLogout={null} />
        
        <main className="flex-grow">
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>}>
            <Routes>
              {/* Public routes only when not authenticated */}
              <Route path="/login" element={<Login />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/roadmap" element={<Roadmap />} />
              
              {/* Redirect all other routes to login when not authenticated */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </main>
        
        <Footer />
      </div>
    );
  }

  // Protected route component (simplified since we know user is authenticated)
  const ProtectedRoute = ({ children }) => {
    return children;
  };

  // Use the auth context instead of direct Supabase calls
  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearCache();
    navigate('/login');
  };

  // Authenticated user routes
  return (
    <div className="flex flex-col min-h-screen">
      <Header user={user} onLogout={handleLogout} />
      
      <main className="flex-grow">
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>}>
          <Routes>
            {/* Public routes available to authenticated users */}
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/roadmap" element={<Roadmap />} />
            
            {/* Protected routes */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/save" element={<SaveRepository />} />
            <Route path="/repository/:id" element={<RepositoryDetails />} />
            
            <Route path="/admin/voting-dashboard" element={
              <Suspense fallback={<div>Loading...</div>}>
                <AdminRoute>
                  <VotingDashboard />
                </AdminRoute>
              </Suspense>
            } />
            
            {/* Redirect login to dashboard if already authenticated */}
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/auth/callback" element={<Navigate to="/" replace />} />
            
            {/* Catch all - redirect to dashboard */}
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
        <Router>
          <CacheProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
            <ScrollToTop />
          </CacheProvider>
        </Router>
      </ThemeProvider>
      <SpeedInsights />
    </>
  );
}

export default App;