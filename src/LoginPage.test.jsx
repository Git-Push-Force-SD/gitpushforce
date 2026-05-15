import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './LoginPage';
import * as supabaseModule from './utils/supabase';

// Mock Supabase
jest.mock('./utils/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: jest.fn(),
    },
  },
}));

const mockSupabase = supabaseModule.supabase;

const clickElement = async (element) => {
  await act(async () => {
    fireEvent.click(element);
  });
};

describe('LoginPage Component - Authentication Tests', () => {
  const mockOnBack = jest.fn();

  beforeEach(() => {
    mockOnBack.mockClear();
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders login form on initial load', () => {
      render(<LoginPage onBack={mockOnBack} />);
      expect(screen.getByText('Welcome back!')).toBeInTheDocument();
      expect(screen.getByText(/Sign in with your university email/i)).toBeInTheDocument();
    });

    test('displays back button', () => {
      render(<LoginPage onBack={mockOnBack} />);
      const backButtons = screen.getAllByTitle('Go back');
      expect(backButtons.length).toBeGreaterThan(0);
    });

    test('displays Google sign-in button', () => {
      render(<LoginPage onBack={mockOnBack} />);
      expect(screen.getByText(/Continue with Google/)).toBeInTheDocument();
    });

    test('displays tagline on right panel', () => {
      render(<LoginPage onBack={mockOnBack} />);
      expect(screen.getByText('your campus. your marketplace.')).toBeInTheDocument();
    });
  });

  describe('Google OAuth Sign In', () => {
    test('clicking Google sign in calls signInWithOAuth', async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({
        data: { url: 'https://accounts.google.com/...' },
        error: null,
      });

      render(<LoginPage onBack={mockOnBack} />);

      const googleButton = screen.getByRole('button', { name: /Continue with Google/i });
      await clickElement(googleButton);

      await waitFor(() => {
        expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: expect.objectContaining({
            redirectTo: expect.any(String),
            queryParams: expect.any(Object),
          }),
        });
      });
    });

    test('displays error on Google sign in failure', async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({
        data: null,
        error: { message: 'OAuth provider error' },
      });

      render(<LoginPage onBack={mockOnBack} />);

      const googleButton = screen.getByRole('button', { name: /Continue with Google/i });
      await clickElement(googleButton);

      await waitFor(() => {
        expect(screen.getByText(/OAuth provider error/)).toBeInTheDocument();
      });
    });

    test('Google button is disabled while loading', async () => {
      mockSupabase.auth.signInWithOAuth.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          data: { url: 'https://accounts.google.com/...' },
          error: null,
        }), 100))
      );

      render(<LoginPage onBack={mockOnBack} />);

      const googleButton = screen.getByRole('button', { name: /Continue with Google/i });
      await clickElement(googleButton);

      expect(googleButton).toBeDisabled();
    });

    test('Google button shows loading text while signing in', async () => {
      mockSupabase.auth.signInWithOAuth.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          data: { url: 'https://accounts.google.com/...' },
          error: null,
        }), 100))
      );

      render(<LoginPage onBack={mockOnBack} />);

      const googleButton = screen.getByRole('button', { name: /Continue with Google/i });
      await clickElement(googleButton);

      expect(screen.getByText('Signing in...')).toBeInTheDocument();
    });

    test('signInWithOAuth is called with correct queryParams', async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({
        data: { url: 'https://accounts.google.com/...' },
        error: null,
      });

      render(<LoginPage onBack={mockOnBack} />);

      const googleButton = screen.getByRole('button', { name: /Continue with Google/i });
      await clickElement(googleButton);

      await waitFor(() => {
        expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith(
          expect.objectContaining({
            provider: 'google',
            options: expect.objectContaining({
              queryParams: expect.objectContaining({
                access_type: 'offline',
                prompt: 'consent',
              }),
            }),
          })
        );
      });
    });
  });

  describe('Form Interactions', () => {
    test('back button calls onBack callback', async () => {
      render(<LoginPage onBack={mockOnBack} />);

      const backButtons = screen.getAllByTitle('Go back');
      await clickElement(backButtons[0]);

      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    test('both back buttons call onBack', async () => {
      render(<LoginPage onBack={mockOnBack} />);

      const backButtons = screen.getAllByTitle('Go back');
      expect(backButtons.length).toBe(2);

      await clickElement(backButtons[1]);
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    test('does not render back button when onBack is not provided', () => {
      render(<LoginPage />);
      const backButtons = screen.queryAllByTitle('Go back');
      expect(backButtons.length).toBe(0);
    });
  });

  describe('Error Messages', () => {
    test('displays error message with error styling', async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({
        data: null,
        error: { message: 'Test error message' },
      });

      render(<LoginPage onBack={mockOnBack} />);

      const googleButton = screen.getByRole('button', { name: /Continue with Google/i });
      await clickElement(googleButton);

      await waitFor(() => {
        expect(screen.getByText(/Test error message/)).toBeInTheDocument();
      });
    });

    test('clears previous error message on new sign in attempt', async () => {
      mockSupabase.auth.signInWithOAuth
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'First error' },
        })
        .mockResolvedValueOnce({
          data: { url: 'https://accounts.google.com/...' },
          error: null,
        });

      render(<LoginPage onBack={mockOnBack} />);

      const googleButton = screen.getByRole('button', { name: /Continue with Google/i });

      await clickElement(googleButton);
      await waitFor(() => {
        expect(screen.getByText(/First error/)).toBeInTheDocument();
      });

      await clickElement(googleButton);
      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledTimes(2);
    });
  });
});
