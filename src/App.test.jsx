import React from 'react';
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

      await waitFor(() => {
        const signInButtons = screen.getAllByText(/Sign [Ii]n/);
        expect(signInButtons.length).toBeGreaterThan(0);
      });
    });

    test('displays UNIMART logo', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('UNIMART')).toBeInTheDocument();
      });
    });

    test('displays navigation links', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('How It Works')).toBeInTheDocument();
        expect(screen.getByText('Safety')).toBeInTheDocument();
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

    test('displays user email when logged in', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('1234567@students.wits.ac.za')).toBeInTheDocument();
      });
    });

    test('displays Sign Out button when logged in', async () => {
      render(<App />);

      await waitFor(() => {
        const signOutButton = screen.getByText('Sign Out');
        expect(signOutButton).toBeInTheDocument();
      });
    });

    test('calls signOut when Sign Out button is clicked', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      render(<App />);

      await waitFor(() => {
        const signOutButton = screen.getByText('Sign Out');
        fireEvent.click(signOutButton);
      });

      await waitFor(() => {
        expect(mockSupabase.auth.signOut).toHaveBeenCalled();
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

      await waitFor(() => {
        expect(screen.getByText('[Admin]')).toBeInTheDocument();
      });
    });

    test('renders Admin Panel for admin users', async () => {
      render(<App />);

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
        expect(screen.getByText('1234567@students.wits.ac.za')).toBeInTheDocument();
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

      await waitFor(() => {
        const signInButtons = screen.getAllByText(/Sign [Ii]n/);
        fireEvent.click(signInButtons[0]);
      });

      await waitFor(() => {
        expect(screen.getByText('Welcome back!')).toBeInTheDocument();
      });
    });

    test('hides hero content when Login Page is shown', async () => {
      render(<App />);

      await waitFor(() => {
        const heroText = screen.getByText(/SAFE TRADES/);
        expect(heroText).toBeVisible();
      });

      const signInButtons = screen.getAllByText(/Sign [Ii]n/);
      fireEvent.click(signInButtons[0]);

      await waitFor(() => {
        const heroText = screen.getByText(/SAFE TRADES/);
        expect(heroText).not.toBeVisible();
      });
    });

    test('hides Login Page when back button is clicked', async () => {
      render(<App />);

      const signInButtons = screen.getAllByText(/Sign [Ii]n/);
      await waitFor(() => {
        fireEvent.click(signInButtons[0]);
      });

      await waitFor(() => {
        expect(screen.getByText('Welcome back!')).toBeInTheDocument();
      });

      const backButtons = screen.getAllByTitle('Go back');
      fireEvent.click(backButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText('Welcome back!')).not.toBeInTheDocument();
        expect(screen.getByText(/SAFE TRADES/)).toBeVisible();
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

      // Test with valid Wits email
      authCallback('SIGNED_IN', {
        user: {
          id: 'oauth-user',
          email: '1234567@students.wits.ac.za',
        },
      });

      await waitFor(() => {
        expect(screen.getByText('1234567@students.wits.ac.za')).toBeInTheDocument();
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

      await waitFor(() => {
        const logo = screen.getByText('UNIMART');
        expect(logo).toBeInTheDocument();
      });
    });

    test('displays navigation links', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('How It Works')).toBeInTheDocument();
        expect(screen.getByText('Safety')).toBeInTheDocument();
      });
    });

    test('displays hero heading with SAFE TRADES FOR VERIFIED STUDENTS', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/SAFE TRADES/i)).toBeInTheDocument();
        expect(screen.getByText(/VERIFIED/i)).toBeInTheDocument();
      });
    });
  });
});

