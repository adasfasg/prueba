import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, getDashboardRoute } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Pages
import LandingPage from './pages/public/LandingPage';
import SuperAdminDashboard from './pages/dashboard/SuperAdminDashboard';
import PMDashboard from './pages/dashboard/PMDashboard';
import CreatorDashboard from './pages/dashboard/CreatorDashboard';
import ServerOwnerDashboard from './pages/dashboard/ServerOwnerDashboard';
import DirectorDashboard from './pages/dashboard/DirectorDashboard';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Cargando PMForgeX...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their own dashboard
    return <Navigate to={getDashboardRoute(user.role)} replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Landing & Catalog */}
            <Route path="/" element={<LandingPage />} />

            {/* Dashboards by Role */}
            <Route 
              path="/dashboard/admin" 
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/dashboard/director-ops" 
              element={
                <ProtectedRoute allowedRoles={['director_ops', 'super_admin']}>
                  <DirectorDashboard />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/dashboard/director-pms" 
              element={
                <ProtectedRoute allowedRoles={['director_pms', 'super_admin']}>
                  <DirectorDashboard />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/dashboard/director-creators" 
              element={
                <ProtectedRoute allowedRoles={['director_creators', 'super_admin']}>
                  <DirectorDashboard />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/dashboard/pm" 
              element={
                <ProtectedRoute allowedRoles={['pm', 'super_admin']}>
                  <PMDashboard />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/dashboard/creator" 
              element={
                <ProtectedRoute allowedRoles={['creator', 'super_admin']}>
                  <CreatorDashboard />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/dashboard/server-owner" 
              element={
                <ProtectedRoute allowedRoles={['server_owner', 'super_admin']}>
                  <ServerOwnerDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}
