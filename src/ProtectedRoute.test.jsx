import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

jest.mock('./AuthContext', () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from './AuthContext';

const renderRoute = (allowedRole = 'student') =>
  render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/login" element={<div>Login Route</div>} />
        <Route path="/studentdashboard" element={<div>Student Route</div>} />
        <Route path="/staffdashboard" element={<div>Staff Route</div>} />
        <Route path="/admindashboard" element={<div>Admin Route</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute allowedRole={allowedRole}>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

describe('ProtectedRoute', () => {
  test('shows loading screen while auth is loading', () => {
    useAuth.mockReturnValue({ user: null, role: null, loading: true });
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute allowedRole="student">
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('redirects unauthenticated users to login', () => {
    useAuth.mockReturnValue({ user: null, role: null, loading: false });
    renderRoute();
    expect(screen.getByText('Login Route')).toBeInTheDocument();
  });

  test('redirects role mismatch to correct dashboard', () => {
    useAuth.mockReturnValue({
      user: { id: 's1' },
      role: 'staff',
      loading: false,
    });
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/staffdashboard" element={<div>Staff Route</div>} />
          <Route
            path="/protected"
            element={
              <ProtectedRoute allowedRole="student">
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Staff Route')).toBeInTheDocument();
  });

  test('renders child content when authorized', () => {
    useAuth.mockReturnValue({
      user: { id: 'u1' },
      role: 'student',
      loading: false,
    });
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute allowedRole="student">
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
