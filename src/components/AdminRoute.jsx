import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const AdminRoute = ({ children }) => {
  const { loading, isAdmin } = useAuth();
  const { themeClasses } = useTheme();

  if (loading) {
    return (
      <div className={`${themeClasses.body} min-h-screen flex items-center justify-center`}>
        <div className={`${themeClasses.card} p-8 text-center shadow-md rounded-lg max-w-md`}>
          <p className={themeClasses.text}>Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;