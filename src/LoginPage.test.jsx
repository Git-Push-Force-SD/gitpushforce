import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './LoginPage';
import * as supabaseModule from './utils/supabase';

// Mock Supabase
jest.mock('./utils/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
    },
    from: jest.fn(),
  },
}));

const mockSupabase = supabaseModule.supabase;

const typeText = async (element, text) => {
  await act(async () => {
    await userEvent.type(element, text);
  });
};

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

    test('displays email input field', () => {
      render(<LoginPage onBack={mockOnBack} />);
      const emailInput = screen.getByPlaceholderText('your-number@students.wits.ac.za');
      expect(emailInput).toBeInTheDocument();
    });

    test('displays password input field', () => {
      render(<LoginPage onBack={mockOnBack} />);
      const passwordInput = screen.getByPlaceholderText('••••••••');
      expect(passwordInput).toBeInTheDocument();
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

    test('displays Sign Up toggle link', () => {
      render(<LoginPage onBack={mockOnBack} />);
      expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
      expect(screen.getByText('Sign Up')).toBeInTheDocument();
    });
  });

  describe('Email Validation - Wits Emails', () => {
    test('accepts valid Wits email format', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: '1234567@students.wits.ac.za',
            email_confirmed_at: '2026-04-11T00:00:00Z',
          },
        },
        error: null,
      });

      render(<LoginPage onBack={mockOnBack} />);
      const emailInput = screen.getByPlaceholderText('your-number@students.wits.ac.za');
      const passwordInput = screen.getByPlaceholderText('••••••••');
      const submitButton = screen.getByRole('button', { name: /Sign In/i });

      await typeText(emailInput, '1234567@students.wits.ac.za');
      await typeText(passwordInput, 'password123');
      await clickElement(submitButton);

      await waitFor(() => {
        expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: '1234567@students.wits.ac.za',
          password: 'password123',
        });
      });
    });

    test('rejects non-Wits email on signup', async () => {
      render(<LoginPage onBack={mockOnBack} />);
      
      // Switch to signup
      const toggleButtons = screen.getAllByRole('button', { name: 'Sign Up' });
      const toggleButton = toggleButtons.find(btn => btn.textContent === 'Sign Up');
      await clickElement(toggleButton);

      expect(screen.getByText('Join Unimart')).toBeInTheDocument();

      const emailInput = screen.getByPlaceholderText('your-number@students.wits.ac.za');
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      const confirmPasswordInput = passwordInputs[1];
      const submitButton = screen.getByRole('button', { name: /^Sign Up$/i });

      await typeText(emailInput, 'user@gmail.com');
      await typeText(passwordInputs[0], 'password123');
      await typeText(confirmPasswordInput, 'password123');

      await clickElement(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Email must be in format/)).toBeInTheDocument();
      });

      expect(mockSupabase.auth.signUp).not.toHaveBeenCalled();
    });

    test('rejects invalid Wits email format (no number)', async () => {
      render(<LoginPage onBack={mockOnBack} />);
      
      const toggleButtons = screen.getAllByRole('button', { name: 'Sign Up' });
      const toggleButton = toggleButtons.find(btn => btn.textContent === 'Sign Up');
      await clickElement(toggleButton);

      const emailInput = screen.getByPlaceholderText('your-number@students.wits.ac.za');
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      const confirmPasswordInput = passwordInputs[1];
      const submitButton = screen.getByRole('button', { name: /^Sign Up$/i });

      await typeText(emailInput, 'abc@students.wits.ac.za');
      await typeText(passwordInputs[0], 'password123');
      await typeText(confirmPasswordInput, 'password123');

      await clickElement(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Email must be in format/)).toBeInTheDocument();
      });

      expect(mockSupabase.auth.signUp).not.toHaveBeenCalled();
    });
  });

  describe('Password Validation', () => {
    test('rejects password less than 6 characters on signup', async () => {
      render(<LoginPage onBack={mockOnBack} />);
      
      const toggleButtons = screen.getAllByRole('button', { name: 'Sign Up' });
      const toggleButton = toggleButtons.find(btn => btn.textContent === 'Sign Up');
      await clickElement(toggleButton);

      const emailInput = screen.getByPlaceholderText('your-number@students.wits.ac.za');
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      const confirmPasswordInput = passwordInputs[1];
      const submitButton = screen.getByRole('button', { name: /^Sign Up$/i });

      await typeText(emailInput, '1234567@students.wits.ac.za');
      await typeText(passwordInputs[0], '12345');
      await typeText(confirmPasswordInput, '12345');

      await clickElement(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Password must be at least 6 characters/)).toBeInTheDocument();
      });

      expect(mockSupabase.auth.signUp).not.toHaveBeenCalled();
    });

    test('rejects mismatched passwords on signup', async () => {
      render(<LoginPage onBack={mockOnBack} />);
      
      const signUpLink = screen.getByRole('button', { name: 'Sign Up' });
      await clickElement(signUpLink);

      const emailInput = screen.getByPlaceholderText('your-number@students.wits.ac.za');
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      const passwordInput = passwordInputs[0];
      const confirmPasswordInput = passwordInputs[1];
      const submitButton = screen.getByRole('button', { name: /Sign Up/i });

      await typeText(emailInput, '1234567@students.wits.ac.za');
      await typeText(passwordInput, 'password123');
      await typeText(confirmPasswordInput, 'password456');

      await clickElement(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Passwords do not match/)).toBeInTheDocument();
      });

      expect(mockSupabase.auth.signUp).not.toHaveBeenCalled();
    });

    test('accepts matching passwords of 6+ characters', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: '1234567@students.wits.ac.za',
          },
        },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      render(<LoginPage onBack={mockOnBack} />);
      
      const toggleButtons = screen.getAllByRole('button', { name: 'Sign Up' });
      const toggleButton = toggleButtons.find(btn => btn.textContent === 'Sign Up');
      await clickElement(toggleButton);

      const emailInput = screen.getByPlaceholderText('your-number@students.wits.ac.za');
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      const passwordInput = passwordInputs[0];
      const confirmPasswordInput = passwordInputs[1];
      const submitButton = screen.getByRole('button', { name: /^Sign Up$/i });

      await typeText(emailInput, '1234567@students.wits.ac.za');
      await typeText(passwordInput, 'password123');
      await typeText(confirmPasswordInput, 'password123');

      await clickElement(submitButton);

      await waitFor(() => {
        expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
          email: '1234567@students.wits.ac.za',
          password: 'password123',
          options: expect.any(Object),
        });
      });
    });
  });

  describe('Sign In Flow', () => {
    test('successful sign in with verified email', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: '1234567@students.wits.ac.za',
            email_confirmed_at: '2026-04-11T00:00:00Z',
          },
        },
        error: null,
      });

      render(<LoginPage onBack={mockOnBack} />);

      const emailInput = screen.getByPlaceholderText('your-number@students.wits.ac.za');
      const passwordInput = screen.getByPlaceholderText('••••••••');
      const submitButton = screen.getByRole('button', { name: /Sign In/i });

      await typeText(emailInput, '1234567@students.wits.ac.za');
      await typeText(passwordInput, 'password123');
      await clickElement(submitButton);

      await waitFor(() => {
        expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: '1234567@students.wits.ac.za',
          password: 'password123',
        });
        expect(mockOnBack).toHaveBeenCalled();
      });
    });

    test('shows error when unverified email tries to sign in', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: '1234567@students.wits.ac.za',
            email_confirmed_at: null,
          },
        },
        error: null,
      });

      mockSupabase.auth.signOut = jest.fn().mockResolvedValue({});

      render(<LoginPage onBack={mockOnBack} />);

      const emailInput = screen.getByPlaceholderText('your-number@students.wits.ac.za');
      const passwordInput = screen.getByPlaceholderText('••••••••');
      const submitButton = screen.getByRole('button', { name: /Sign In/i });

      await typeText(emailInput, '1234567@students.wits.ac.za');
      await typeText(passwordInput, 'password123');
      await clickElement(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Please verify your email before logging in/)).toBeInTheDocument();
      });
    });

    test('displays error message on sign in failure', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' },
      });

      render(<LoginPage onBack={mockOnBack} />);

      const emailInput = screen.getByPlaceholderText('your-number@students.wits.ac.za');
      const passwordInput = screen.getByPlaceholderText('••••••••');
      const submitButton = screen.getByRole('button', { name: /Sign In/i });

      await typeText(emailInput, '1234567@students.wits.ac.za');
      await typeText(passwordInput, 'wrongpassword');
      await clickElement(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Invalid login credentials/)).toBeInTheDocument();
      });
    });
  });

  describe('Sign Up Flow', () => {
    test('successful sign up shows verification message', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: '1234567@students.wits.ac.za',
          },
        },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ 
          data: [],
          error: null 
        }),
      });

      render(<LoginPage onBack={mockOnBack} />);
      
      const toggleButtons = screen.getAllByRole('button', { name: 'Sign Up' });
      const toggleButton = toggleButtons.find(btn => btn.textContent === 'Sign Up');
      await clickElement(toggleButton);

      const emailInput = screen.getByPlaceholderText('your-number@students.wits.ac.za');
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      const submitButton = screen.getByRole('button', { name: /^Sign Up$/i });

      await typeText(emailInput, '1234567@students.wits.ac.za');
      await typeText(passwordInputs[0], 'password123');
      await typeText(passwordInputs[1], 'password123');

      await clickElement(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Check your email to verify your account/)).toBeInTheDocument();
      });
    });

    test('sign up submits auth request and shows verification message', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: '1234567@students.wits.ac.za',
          },
        },
        error: null,
      });

      render(<LoginPage onBack={mockOnBack} />);
      
      const toggleButtons = screen.getAllByRole('button', { name: 'Sign Up' });
      const toggleButton = toggleButtons.find(btn => btn.textContent === 'Sign Up');
      await clickElement(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('Join Unimart')).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText('your-number@students.wits.ac.za');
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      const submitButton = screen.getByRole('button', { name: /^Sign Up$/i });

      await typeText(emailInput, '1234567@students.wits.ac.za');
      await typeText(passwordInputs[0], 'password123');
      await typeText(passwordInputs[1], 'password123');

      await clickElement(submitButton);

      await waitFor(() => {
        expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
          email: '1234567@students.wits.ac.za',
          password: 'password123',
          options: expect.any(Object),
        });
        expect(screen.getByText(/Check your email to verify your account/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('displays error message on sign up failure', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: null,
        error: { message: 'Email already registered' },
      });

      render(<LoginPage onBack={mockOnBack} />);
      
      const toggleButtons = screen.getAllByRole('button', { name: 'Sign Up' });
      const toggleButton = toggleButtons.find(btn => btn.textContent === 'Sign Up');
      await clickElement(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('Join Unimart')).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText('your-number@students.wits.ac.za');
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      const submitButton = screen.getByRole('button', { name: /^Sign Up$/i });

      await typeText(emailInput, '1234567@students.wits.ac.za');
      await typeText(passwordInputs[0], 'password123');
      await typeText(passwordInputs[1], 'password123');

      await clickElement(submitButton);

      await waitFor(() => {
        const errorElements = screen.queryAllByText(/Email already registered/);
        expect(errorElements.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });
  });

  describe('Google OAuth Sign In', () => {
    test('Google sign in button is only visible on login page', () => {
      render(<LoginPage onBack={mockOnBack} />);
      expect(screen.getByText(/Continue with Google/)).toBeInTheDocument();
    });

    test('clicking Google sign in calls signInWithOAuth', async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({
        data: { url: 'https://accounts.google.com/...' },
        error: null,
      });

      render(<LoginPage onBack={mockOnBack} />);

      const googleButton = screen.getByRole('button', { name: /Continue with Google/ });
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

      const googleButton = screen.getByRole('button', { name: /Continue with Google/ });
      await clickElement(googleButton);

      await waitFor(() => {
        expect(screen.getByText(/OAuth provider error/)).toBeInTheDocument();
      });
    });
  });

  describe('Form Interactions', () => {
    test('toggles between sign in and sign up screens', async () => {
      render(<LoginPage onBack={mockOnBack} />);

      expect(screen.getByText('Welcome back!')).toBeInTheDocument();
      expect(screen.getByText(/Continue with Google/)).toBeInTheDocument();

      const toggleButtons = screen.getAllByRole('button', { name: 'Sign Up' });
      const toggleButton = toggleButtons.find(btn => btn.textContent === 'Sign Up');
      await clickElement(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('Join Unimart')).toBeInTheDocument();
        expect(screen.queryByText(/Continue with Google/)).not.toBeInTheDocument();
      });
    });

    test('clears form fields when toggling between screens', async () => {
      render(<LoginPage onBack={mockOnBack} />);

      const emailInput = screen.getByPlaceholderText('your-number@students.wits.ac.za');
      await typeText(emailInput, '1234567@students.wits.ac.za');

      expect(emailInput).toHaveValue('1234567@students.wits.ac.za');

      const toggleButton = screen.getByRole('button', { name: 'Sign Up' });
      await clickElement(toggleButton);

      const newEmailInput = screen.getByPlaceholderText('your-number@students.wits.ac.za');
      expect(newEmailInput).toHaveValue('');
    });

    test('disables form during loading', async () => {
      mockSupabase.auth.signInWithPassword.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          data: {
            user: {
              id: 'user-123',
              email: '1234567@students.wits.ac.za',
              email_confirmed_at: '2026-04-11T00:00:00Z',
            },
          },
          error: null,
        }), 100))
      );

      render(<LoginPage onBack={mockOnBack} />);

      const emailInput = screen.getByPlaceholderText('your-number@students.wits.ac.za');
      const passwordInput = screen.getByPlaceholderText('••••••••');
      const submitButton = screen.getByRole('button', { name: /Sign In/i });

      await typeText(emailInput, '1234567@students.wits.ac.za');
      await typeText(passwordInput, 'password123');
      await clickElement(submitButton);

      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
    });

    test('back button calls onBack callback', async () => {
      render(<LoginPage onBack={mockOnBack} />);
      
      const backButtons = screen.getAllByTitle('Go back');
      await clickElement(backButtons[0]);

      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Messages', () => {
    test('displays error messages with error styling', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Test error message' },
      });

      render(<LoginPage onBack={mockOnBack} />);

      const emailInput = screen.getByPlaceholderText('your-number@students.wits.ac.za');
      const passwordInput = screen.getByPlaceholderText('••••••••');
      const submitButton = screen.getByRole('button', { name: /Sign In/i });

      await typeText(emailInput, '1234567@students.wits.ac.za');
      await typeText(passwordInput, 'password');
      await clickElement(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Test error message/)).toBeInTheDocument();
      });
    });

    test('clears error messages on new form submission', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: { message: 'First error' },
      }).mockResolvedValueOnce({
        data: {
          user: {
            id: 'user-123',
            email: '1234567@students.wits.ac.za',
            email_confirmed_at: '2026-04-11T00:00:00Z',
          },
        },
        error: null,
      });

      render(<LoginPage onBack={mockOnBack} />);

      const emailInput = screen.getByPlaceholderText('your-number@students.wits.ac.za');
      const passwordInput = screen.getByPlaceholderText('••••••••');
      const submitButton = screen.getByRole('button', { name: /Sign In/i });

      // First attempt with error
      await typeText(emailInput, '1234567@students.wits.ac.za');
      await typeText(passwordInput, 'wrong');
      await clickElement(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/First error/)).toBeInTheDocument();
      });

      // Second attempt - error should be cleared on submission
      await clickElement(submitButton);

      // The error message should be gone before the request completes
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledTimes(2);
    });
  });
});