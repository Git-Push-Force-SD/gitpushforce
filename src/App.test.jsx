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
let authStateCallback;

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

beforeAll(() => {
  // RevealOnScroll uses IntersectionObserver, which jsdom does not implement.
  window.IntersectionObserver = class IntersectionObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
  global.__TEST_ROUTE__ = '/';
  authStateCallback = undefined;

  mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
  mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
    authStateCallback = callback;
    return { data: { subscription: { unsubscribe: jest.fn() } } };
  });
  mockSupabase.auth.signOut.mockImplementation(async () => {
    authStateCallback?.('SIGNED_OUT', null);
    return { error: null };
  });
});

describe('App landing page', () => {
  test('renders landing page for an unauthenticated user', async () => {
    render(<App />);

    expect((await screen.findAllByText('UNIMART')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Sign In/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Browse The Feed')).toBeInTheDocument();
  });

  test('does not render the removed How It Works and Safety sections or links', async () => {
    render(<App />);
    await screen.findByText('Browse The Feed');

    expect(screen.queryByRole('heading', { name: /A faster way to trade on campus/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Security built into every trade/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /List Your Item/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Chat Securely/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Meet on Campus/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /How It Works/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Safety$/i })).not.toBeInTheDocument();
  });

  test('retains marketplace features and browse actions', async () => {
    render(<App />);
    await screen.findByText('Browse The Feed');

    expect(screen.getByText('List in Minutes')).toBeInTheDocument();
    expect(screen.getByText('Message Safely')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Secure Exchange' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View All Marketplace/i })).toBeInTheDocument();
  });

  test('navigates to login from the landing sign-in button', async () => {
    render(<App />);

    const signInButton = (await screen.findAllByRole('button', { name: /Sign In/i }))[0];
    fireEvent.click(signInButton);

    expect(await screen.findByText('Mock Login Page')).toBeInTheDocument();
  });

  test('navigates back to landing from login route', async () => {
    global.__TEST_ROUTE__ = '/login';
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Back' }));

    await waitFor(() => {
      expect(screen.getAllByText('UNIMART').length).toBeGreaterThan(0);
    });
  });
});

describe('App authentication and routing', () => {
  test('redirects authenticated student to student dashboard', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: '1@students.wits.ac.za' } } },
    });
    mockUsersTable({ roleData: { role: 'student' } });

    render(<App />);

    expect(await screen.findByText('Mock Student Dashboard')).toBeInTheDocument();
  });

  test('redirects authenticated staff to staff dashboard', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u2', email: '2@students.wits.ac.za' } } },
    });
    mockUsersTable({ roleData: { role: 'staff' } });

    render(<App />);

    expect(await screen.findByText('Mock Staff Dashboard')).toBeInTheDocument();
  });

  test('redirects authenticated admin from login route to admin dashboard', async () => {
    global.__TEST_ROUTE__ = '/login';
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u3', email: '3@students.wits.ac.za' } } },
    });
    mockUsersTable({ roleData: { role: 'admin' } });

    render(<App />);

    expect(await screen.findByText('Mock Admin Dashboard')).toBeInTheDocument();
  });

  test('protects dashboard route and redirects unauthenticated user to login', async () => {
    global.__TEST_ROUTE__ = '/studentdashboard';

    render(<App />);

    expect(await screen.findByText('Mock Login Page')).toBeInTheDocument();
  });

  test('logout from student dashboard calls supabase signOut and shows login', async () => {
    global.__TEST_ROUTE__ = '/studentdashboard';
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u4', email: '4@students.wits.ac.za' } } },
    });
    mockUsersTable({ roleData: { role: 'student' } });

    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Logout Student' }));

    await waitFor(() => {
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(screen.getByText('Mock Login Page')).toBeInTheDocument();
    });
  });

  test('redirects /staffdashboard to /staff/queue', async () => {
    global.__TEST_ROUTE__ = '/staffdashboard';
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u5', email: '5@students.wits.ac.za' } } },
    });
    mockUsersTable({ roleData: { role: 'staff' } });

    render(<App />);

    expect(await screen.findByText('Mock Staff Dashboard')).toBeInTheDocument();
  });

  test('staff can refresh directly on /staff/collections', async () => {
    global.__TEST_ROUTE__ = '/staff/collections';
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u6', email: '6@students.wits.ac.za' } } },
    });
    mockUsersTable({ roleData: { role: 'staff' } });

    render(<App />);

    expect(await screen.findByText('Mock Staff Dashboard')).toBeInTheDocument();
  });
});
