import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

function roleToPath(role) {
  if (role === 'student') return '/studentdashboard';
  if (role === 'staff') return '/staffdashboard';
  if (role === 'admin') return '/admindashboard';
  return '/login';
}

export default function ProtectedRoute({ children, allowedRole }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <main className="w-full min-h-screen bg-offwhite flex items-center justify-center">
        <section className="text-center">
          <p className="text-dark text-lg">Loading...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && role !== allowedRole) {
    return <Navigate to={roleToPath(role)} replace />;
  }

  return children;
}
