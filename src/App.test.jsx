import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import * as supabaseModule from './utils/supabase';

// Mock Supabase
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

const mockSupabase = supabaseModule.supabase;

const waitForAppLoad = async () => {
  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });
};

describe('App Component - Authentication Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders main App component', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      render(<App />);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    test('displays loading state initially', async () => {
      mockSupabase.auth.getSession.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          data: { session: null },
        }), 100))
      );

      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      render(<App />);
      expect(screen.getByText(/Loading/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      }, { timeout: 500 });
    });
  });

  describe('Unauthenticated User Display', () => {
    beforeEach(() => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });
    });

    test('displays Sign In button when not logged in', async () => {
      render(<App />);
      await waitForAppLoad();

      await waitFor(() => {
        const signInButtons = screen.getAllByText(/Sign [Ii]n/);
        expect(signInButtons.length).toBeGreaterThan(0);
      });
    });

    test('displays UNIMART logo', async () => {
      render(<App />);
      await waitForAppLoad();

      await waitFor(() => {
        expect(screen.getAllByText('UNIMART')[0]).toBeInTheDocument();
      });
    });

    test('displays navigation links', async () => {
      render(<App />);
      await waitForAppLoad();

      await waitFor(() => {
        expect(screen.getAllByText('How It Works')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Safety')[0]).toBeInTheDocument();
      });
    });
  });

  describe('Authenticated User Display', () => {
    beforeEach(() => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'user-123',
              email: '1234567@students.wits.ac.za',
            },
          },
        },
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'user' },
            }),
          }),
        }),
      });

      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });
    });

    test('renders StudentDashboard when logged in instead of landing page', async () => {
      render(<App />);
      await waitForAppLoad();

      await waitFor(() => {
        expect(screen.getByText('Recent Listings')).toBeInTheDocument();
        expect(screen.getByText('Sell Item')).toBeInTheDocument();
      });
    });

    test('shows profile button for authenticated users', async () => {
      render(<App />);
      await waitForAppLoad();

      await waitFor(() => {
        expect(screen.getByLabelText('Open profile')).toBeInTheDocument();
      });
    });

    test('renders StudentDashboard for authenticated student users', async () => {
      render(<App />);
      await waitForAppLoad();

      await waitFor(() => {
        expect(screen.getByText('Recent Listings')).toBeInTheDocument();
        expect(screen.getByText('Sell Item')).toBeInTheDocument();
      });
    });

    test('authenticated user lands on StudentDashboard and can access profile', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      render(<App />);
      await waitForAppLoad();

      await waitFor(() => {
        expect(screen.getByText('Sell Item')).toBeInTheDocument();
        expect(screen.getByLabelText('Open profile')).toBeInTheDocument();
      });
    });
  });

  describe('Admin User Display', () => {
    beforeEach(() => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'admin-123',
              email: '2624301@students.wits.ac.za',
            },
          },
        },
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'admin' },
            }),
          }),
        }),
      });

      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });
    });

    test('displays [Admin] label for admin users', async () => {
      render(<App />);
      await waitForAppLoad();

      await waitFor(() => {
        expect(screen.getByText('[Admin]')).toBeInTheDocument();
      });
    });

    test('renders Admin Panel for admin users', async () => {
      render(<App />);
      await waitForAppLoad();

      await waitFor(() => {
        expect(screen.getByText('Admin Panel')).toBeInTheDocument();
      });
    });

    test('Admin Panel does not render for regular users', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'user' },
            }),
          }),
        }),
      });

      render(<App />);
      await waitForAppLoad();

      await waitFor(() => {
        expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
      });
    });
  });

  describe('Auth State Changes', () => {
    test('updates user state when auth state changes', async () => {
      let authCallback;

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authCallback = callback;
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        };
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'user' },
            }),
          }),
        }),
      });

      render(<App />);
      await waitForAppLoad();

      await waitFor(() => {
        expect(screen.queryByText(/1234567@students.wits.ac.za/)).not.toBeInTheDocument();
      });

      // Simulate auth state change
      authCallback('SIGNED_IN', {
        user: {
          id: 'user-123',
          email: '1234567@students.wits.ac.za',
        },
      });

      await waitFor(() => {
        expect(screen.getByText('Recent Listings')).toBeInTheDocument();
      });
    });

    test('unsubscribes from auth changes on unmount', async () => {
      const mockUnsubscribe = jest.fn();

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      });

      const { unmount } = render(<App />);

      await waitFor(() => {
        expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
      });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Login Page Modal', () => {
    beforeEach(() => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });
    });

    test('displays Login Page when Sign In button is clicked', async () => {
      render(<App />);
      await waitForAppLoad();

      await act(async () => {
        const signInButtons = screen.getAllByText(/Sign [Ii]n/);
        fireEvent.click(signInButtons[0]);
      });

      await waitFor(() => {
        expect(screen.getByText('Welcome back!')).toBeInTheDocument();
      });
    });

    test('hides hero content when Login Page is shown', async () => {
      render(<App />);
      await waitForAppLoad();

      await waitFor(() => {
        const heroText = screen.getAllByText(/SAFE TRADES/i)[0];
        expect(heroText).toBeVisible();
      });

      await act(async () => {
        const signInButtons = screen.getAllByText(/Sign [Ii]n/);
        fireEvent.click(signInButtons[0]);
      });

      await waitFor(() => {
        expect(screen.queryByText(/SAFE TRADES/i)).not.toBeInTheDocument();
      });
    });

    test('hides Login Page when back button is clicked', async () => {
      render(<App />);
      await waitForAppLoad();

      await act(async () => {
        const signInButtons = screen.getAllByText(/Sign [Ii]n/);
        fireEvent.click(signInButtons[0]);
      });

      await waitFor(() => {
        expect(screen.getByText('Welcome back!')).toBeInTheDocument();
      });

      await act(async () => {
        const backButtons = screen.getAllByTitle('Go back');
        fireEvent.click(backButtons[0]);
      });

      await waitFor(() => {
        expect(screen.queryByText('Welcome back!')).not.toBeInTheDocument();
        expect(screen.getAllByText(/SAFE TRADES/i)[0]).toBeVisible();
      });
    });
  });

  describe('Email Validation for OAuth', () => {
    test('validates Wits email domain for authenticated users', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      let authCallback;
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authCallback = callback;
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        };
      });

      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      render(<App />);

      // Test with non-Wits email (should sign out)
      authCallback('SIGNED_IN', {
        user: {
          id: 'oauth-user',
          email: 'user@gmail.com',
        },
      });

      await waitFor(() => {
        expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      });
    });

    test('allows Wits email domain for authenticated users', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      let authCallback;
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authCallback = callback;
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        };
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'user' },
            }),
          }),
        }),
      });

      render(<App />);
      await waitForAppLoad();

      // Test with valid Wits email
      act(() => {
        authCallback('SIGNED_IN', {
          user: {
            id: 'oauth-user',
            email: '1234567@students.wits.ac.za',
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Recent Listings')).toBeInTheDocument();
      });
    });
  });

  describe('Existing App Features Still Work', () => {
    beforeEach(() => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      });
    });

    test('renders header with UNIMART logo', async () => {
      render(<App />);
      await waitForAppLoad();

      await waitFor(() => {
        const logo = screen.getAllByText('UNIMART')[0];
        expect(logo).toBeInTheDocument();
      });
    });

    test('displays navigation links', async () => {
      render(<App />);
      await waitForAppLoad();

      await waitFor(() => {
        expect(screen.getAllByText('How It Works')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Safety')[0]).toBeInTheDocument();
      });
    });

    test('displays hero heading with SAFE TRADES FOR VERIFIED STUDENTS', async () => {
      render(<App />);
      await waitForAppLoad();

      await waitFor(() => {
        expect(screen.getAllByText(/SAFE TRADES/i)[0]).toBeInTheDocument();
        expect(screen.getAllByText(/VERIFIED/i)[0]).toBeInTheDocument();
      });
    });
  });
});

