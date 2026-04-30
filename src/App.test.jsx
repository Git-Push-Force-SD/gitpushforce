import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import * as supabaseModule from './utils/supabase';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }) => (
      <actual.MemoryRouter initialEntries={[global.__TEST_ROUTE__ || '/']}>
        {children}
      </actual.MemoryRouter>
    ),
  };
});

jest.mock('./utils/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock('./LoginPage', () => function MockLoginPage({ onBack }) {
  return (
    <div>
      <p>Mock Login Page</p>
      <button onClick={onBack}>Back</button>
    </div>
  );
});

jest.mock('./StudentDashboard', () => function MockStudentDashboard({ handleLogout }) {
  return (
    <div>
      <p>Mock Student Dashboard</p>
      <button onClick={handleLogout}>Logout Student</button>
    </div>
  );
});

jest.mock('./facilDashboard', () => function MockStaffDashboard({ handleLogout }) {
  return (
    <div>
      <p>Mock Staff Dashboard</p>
      <button onClick={handleLogout}>Logout Staff</button>
    </div>
  );
});

jest.mock('./AdminDashboard', () => function MockAdminDashboard({ handleLogout }) {
  return (
    <div>
      <p>Mock Admin Dashboard</p>
      <button onClick={handleLogout}>Logout Admin</button>
    </div>
  );
});

const mockSupabase = supabaseModule.supabase;

const mockUsersTable = ({ roleData = { role: 'student' }, selectError = null } = {}) => {
  mockSupabase.from.mockImplementation(() => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: roleData, error: selectError }),
      }),
    }),
    insert: jest.fn().mockResolvedValue({ error: null }),
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }),
  }));
};

describe('App routing + auth integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear(); // prevent stale cached roles bleeding between tests
    global.__TEST_ROUTE__ = '/';
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  test('renders landing page for unauthenticated user', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('UNIMART').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Sign In/i).length).toBeGreaterThan(0);
    });
  });

  test('navigates to login route from landing sign in button', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    render(<App />);

    const signInButton = (await screen.findAllByRole('button', { name: /Sign In/i }))[0];
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(screen.getByText('Mock Login Page')).toBeInTheDocument();
    });
  });

  test('navigates back to landing from login route', async () => {
    global.__TEST_ROUTE__ = '/login';
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    render(<App />);

    const backButton = await screen.findByRole('button', { name: 'Back' });
    fireEvent.click(backButton);

    await waitFor(() => {
      expect(screen.getAllByText('UNIMART').length).toBeGreaterThan(0);
    });
  });

  test('redirects authenticated student to student dashboard', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: '1@students.wits.ac.za' } } },
    });
    mockUsersTable({ roleData: { role: 'student' } });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Mock Student Dashboard')).toBeInTheDocument();
    });
  });

  test('redirects authenticated staff to staff dashboard', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u2', email: '2@students.wits.ac.za' } } },
    });
    mockUsersTable({ roleData: { role: 'staff' } });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Mock Staff Dashboard')).toBeInTheDocument();
    });
  });

  test('redirects authenticated admin from login route to admin dashboard', async () => {
    global.__TEST_ROUTE__ = '/login';
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u3', email: '3@students.wits.ac.za' } } },
    });
    mockUsersTable({ roleData: { role: 'admin' } });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Mock Admin Dashboard')).toBeInTheDocument();
    });
  });

  test('protects dashboard route and redirects unauthenticated user to login', async () => {
    global.__TEST_ROUTE__ = '/studentdashboard';
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Mock Login Page')).toBeInTheDocument();
    });
  });

  test('logout from student dashboard calls supabase signOut', async () => {
    global.__TEST_ROUTE__ = '/studentdashboard';
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u4', email: '4@students.wits.ac.za' } } },
    });
    mockSupabase.auth.signOut.mockResolvedValue({ error: null });
    mockUsersTable({ roleData: { role: 'student' } });

    render(<App />);

    const logoutButton = await screen.findByRole('button', { name: 'Logout Student' });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(screen.getByText('Mock Login Page')).toBeInTheDocument();
    });
  });
});
