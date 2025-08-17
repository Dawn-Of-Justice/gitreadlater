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

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex justify-center items-center flex-grow">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Protected route using the auth context
  const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    
    return children;
  };

  // Use the auth context instead of direct Supabase calls
  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearCache();
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
            
            <Route path="/admin/voting-dashboard" element={
              <Suspense fallback={<div>Loading...</div>}>
                <AdminRoute>
                  <VotingDashboard />
                </AdminRoute>
              </Suspense>
            } />
            
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