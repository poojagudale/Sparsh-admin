import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Public Pages
import Landing from './pages/Landing';
import Login from './pages/Login';

// Protected Admin Pages
import AdminHome from './pages/AdminHome';
import AdminBookings from './pages/AdminBookings';
import AdminBookingDetail from './pages/AdminBookingDetail';
import AdminBirthdayOffers from './pages/AdminBirthdayOffers';
import Services from './pages/Services';
import Profile from './pages/Profile';

// Layout & Route Guards
import FooterTabs from './components/FooterTabs';
import PrivateRoute from './components/PrivateRoute';

/**
 * Sparsh Admin Application Routing
 *
 * Public   : / (Landing Page)  /login (Admin Login)
 * Protected: /home (Dashboard)  /services/*  /admin/bookings  /admin/birthday-offers  /profile
 */
function App() {
  return (
    <Router>
      <Routes>
        {/* ── Public Routes (Freely accessible before login) ───────── */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        {/* ── Protected Admin Routes (Enforces database ADMIN role) ── */}
        <Route
          path="/home"
          element={
            <PrivateRoute>
              <AdminHome />
            </PrivateRoute>
          }
        />
        <Route
          path="/services/*"
          element={
            <PrivateRoute>
              <Services />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/services/*"
          element={
            <PrivateRoute>
              <Services />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/bookings"
          element={
            <PrivateRoute>
              <AdminBookings />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/bookings/:id"
          element={
            <PrivateRoute>
              <AdminBookingDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/bookings"
          element={
            <PrivateRoute>
              <AdminBookings />
            </PrivateRoute>
          }
        />
        <Route
          path="/bookings/:id"
          element={
            <PrivateRoute>
              <AdminBookingDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/birthday-offers"
          element={
            <PrivateRoute>
              <AdminBirthdayOffers />
            </PrivateRoute>
          }
        />
        <Route
          path="/birthday-offers"
          element={
            <PrivateRoute>
              <AdminBirthdayOffers />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Admin fixed footer navigation (hidden on / and /login) */}
      <FooterTabs />
    </Router>
  );
}

export default App;
