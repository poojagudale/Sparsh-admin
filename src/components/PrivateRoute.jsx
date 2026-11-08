import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * PrivateRoute for Sparsh Admin.
 * Enforces that user is authenticated AND has the ADMIN role.
 * If not authenticated, redirects to /login.
 */
const PrivateRoute = ({ children, requireRole = 'ADMIN' }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const allowedRoles = Array.isArray(requireRole) ? requireRole : [requireRole];
  if (user?.role && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;

