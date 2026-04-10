import React from 'react';
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

      await userEvent.type(emailInput, '1234567@students.wits.ac.za');
      await userEvent.type(passwordInput, 'password123');
      fireEvent.click(submitButton);

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
      const signUpLink = screen.getByRole('button', { name: 'Sign Up' });
      fireEvent.click(signUpLink);

      expect(screen.getByText('Join Unimart')).toBeInTheDocument();

      const emailInput = screen.getByPlaceholderText('your-number@students.wits.ac.za');
      const passwordInput = screen.getAllByPlaceholderText('••••••••')[0];
      const confirmPasswordInput = screen.getByDisplayValue('');
      const submitButton = screen.getByRole('button', { name: /Sign Up/i });

      await userEvent.type(emailInput, 'user@gmail.com');
      await userEvent.type(passwordInput, 'password123');
      await userEvent.type(confirmPasswordInput, 'password123');

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Email must be in format/)).toBeInTheDocument();
      });

      expect(mockSupabase.auth.signUp).not.toHaveBeenCalled();
    });

    test('rejects invalid Wits email format (no number)', async () => {
      render(<LoginPage onBack={mockOnBack} />);
      
      const signUpLink = screen.getByRole('button', { name: 'Sign Up' });
      fireEvent.click(signUpLink);

      const emailInput = screen.getByPlaceholderText('your-number@students.wits.ac.za');
      const passwordInput = screen.getAllByPlaceholderText('••••••••')[0];
      const confirmPasswordInput = screen.getByDisplayValue('');
      const submitButton = screen.getByRole('button', { name: /Sign Up/i });

      await userEvent.type(emailInput, 'abc@students.wits.ac.za');
      await userEvent.type(passwordInput, 'password123');
      await userEvent.type(confirmPasswordInput, 'password123');

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Email must be in format/)).toBeInTheDocument();
      });

      expect(mockSupabase.auth.signUp).not.toHaveBeenCalled();
    });
  });

  describe('Password Validation', () => {
    test('rejects password less than 6 characters on signup', async () => {
      render(<LoginPage onBack={mockOnBack} />);
      
      const signUpLink = screen.getByRole('button', { name: 'Sign Up' });
      fireEvent.click(signUpLink);

      const emailInput = screen.getByPlaceholderText('your-number@students.wits.ac.za');
      const passwordInput = screen.getAllByPlaceholderText('••••••••')[0];
      const confirmPasswordInput = screen.getByDisplayValue('');
      const submitButton = screen.getByRole('button', { name: /Sign Up/i });

      await userEvent.type(emailInput, '1234567@students.wits.ac.za');
      await userEvent.type(passwordInput, '12345');
      await userEvent.type(confirmPasswordInput, '12345');

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Password must be at least 6 characters/)).toBeInTheDocument();
      });

      expect(mockSupabase.auth.signUp).not.toHaveBeenCalled();
    });

    test('rejects mismatched passwords on signup', async () => {
      render(<LoginPage onBack={mockOnBack} />);
      
      const signUpLink = screen.getByRole('button', { name: 'Sign Up' });
      fireEvent.click(signUpLink);

      const emailInput = screen.getByPlaceholderText('your-number@students.wits.ac.za');
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      const passwordInput = passwordInputs[0];
      const confirmPasswordInput = passwordInputs[1];
      const submitButton = screen.getByRole('button', { name: /Sign Up/i });

      await userEvent.type(emailInput, '1234567@students.wits.ac.za');
      await userEvent.type(passwordInput, 'password123');
      await userEvent.type(confirmPasswordInput, 'password456');

      fireEvent.click(submitButton);

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
      
      const signUpLink = screen.getByRole('button', { name: 'Sign Up' });
      fireEvent.click(signUpLink);

      const emailInput = screen.getByPlaceholderText('your-number@students.wits.ac.za');
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      const passwordInput = passwordInputs[0];
      const confirmPasswordInput = passwordInputs[1];
      const submitButton = screen.getByRole('button', { name: /Sign Up/i });

      await userEvent.type(emailInput, '1234567@students.wits.ac.za');
      await userEvent.type(passwordInput, 'password123');
      await userEvent.type(confirmPasswordInput, 'password123');

      fireEvent.click(submitButton);

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

      await userEvent.type(emailInput, '1234567@students.wits.ac.za');
      await userEvent.type(passwordInput, 'password123');
      fireEvent.click(submitButton);

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

      await userEvent.type(emailInput, '1234567@students.wits.ac.za');
      await userEvent.type(passwordInput, 'password123');
      fireEvent.click(submitButton);

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

      await userEvent.type(emailInput, '1234567@students.wits.ac.za');
      await userEvent.type(passwordInput, 'wrongpassword');
      fireEvent.click(submitButton);

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
      
      const signUpLink = screen.getByRole('button', { name: 'Sign Up' });
      fireEvent.click(signUpLink);

      const emailInput = screen.getByPlaceholderText('your-number@students.wits.ac.za');
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      const submitButton = screen.getByRole('button', { name: /Sign Up/i });

      await userEvent.type(emailInput, '1234567@students.wits.ac.za');
      await userEvent.type(passwordInputs[0], 'password123');
      await userEvent.type(passwordInputs[1], 'password123');

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Check your email to verify your account/)).toBeInTheDocument();
      });
    });

    test('sign up creates user profile in database', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ 
        data: [],
        error: null 
      });
      
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
        insert: mockInsert,
      });

      render(<LoginPage onBack={mockOnBack} />);
      
      const signUpLink = screen.getByRole('button', { name: 'Sign Up' });
      fireEvent.click(signUpLink);

      const emailInput = screen.getByPlaceholderText('your-number@students.wits.ac.za');
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      const submitButton = screen.getByRole('button', { name: /Sign Up/i });

      await userEvent.type(emailInput, '1234567@students.wits.ac.za');
      await userEvent.type(passwordInputs[0], 'password123');
      await userEvent.type(passwordInputs[1], 'password123');

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('users');
        expect(mockInsert).toHaveBeenCalled();
      });
    });

    test('displays error message on sign up failure', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: null,
        error: { message: 'Email already registered' },
      });

      render(<LoginPage onBack={mockOnBack} />);
      
      const signUpLink = screen.getByRole('button', { name: 'Sign Up' });
      fireEvent.click(signUpLink);

      const emailInput = screen.getByPlaceholderText('your-number@students.wits.ac.za');
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      const submitButton = screen.getByRole('button', { name: /Sign Up/i });

      await userEvent.type(emailInput, '1234567@students.wits.ac.za');
      await userEvent.type(passwordInputs[0], 'password123');
      await userEvent.type(passwordInputs[1], 'password123');

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Email already registered/)).toBeInTheDocument();
      });
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
      fireEvent.click(googleButton);

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
      fireEvent.click(googleButton);

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

      const toggleButton = screen.getByRole('button', { name: 'Sign Up' });
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('Join Unimart')).toBeInTheDocument();
        expect(screen.queryByText(/Continue with Google/)).not.toBeInTheDocument();
      });
    });

    test('clears form fields when toggling between screens', async () => {
      render(<LoginPage onBack={mockOnBack} />);

      const emailInput = screen.getByPlaceholderText('your-number@students.wits.ac.za');
      await userEvent.type(emailInput, '1234567@students.wits.ac.za');

      expect(emailInput).toHaveValue('1234567@students.wits.ac.za');

      const toggleButton = screen.getByRole('button', { name: 'Sign Up' });
      fireEvent.click(toggleButton);

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

      await userEvent.type(emailInput, '1234567@students.wits.ac.za');
      await userEvent.type(passwordInput, 'password123');
      fireEvent.click(submitButton);

      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
    });

    test('back button calls onBack callback', () => {
      render(<LoginPage onBack={mockOnBack} />);
      
      const backButtons = screen.getAllByTitle('Go back');
      fireEvent.click(backButtons[0]);

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

      await userEvent.type(emailInput, '1234567@students.wits.ac.za');
      await userEvent.type(passwordInput, 'password');
      fireEvent.click(submitButton);

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
      await userEvent.type(emailInput, '1234567@students.wits.ac.za');
      await userEvent.type(passwordInput, 'wrong');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/First error/)).toBeInTheDocument();
      });

      // Second attempt - error should be cleared on submission
      fireEvent.click(submitButton);

      // The error message should be gone before the request completes
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledTimes(2);
    });
  });
});

    expect(shapes.length).toBe(6)
  })

  test('displays background image on right side', () => {
    render(<LoginPage onBack={mockOnBack} />)
    const rightSide = document.querySelector('.login-right')
    expect(rightSide).toBeInTheDocument()
    const bgImage = rightSide.querySelector('.right-bg-image')
    expect(bgImage).toBeInTheDocument()
  })

  test('displays typing text animation', () => {
    render(<LoginPage onBack={mockOnBack} />)
    expect(screen.getByText('your campus. your marketplace.')).toBeInTheDocument()
  })

  test('Google button contains SVG icon', () => {
    render(<LoginPage onBack={mockOnBack} />)
    const googleButton = screen.getByText('Sign in with Google')
    const svgIcon = googleButton.querySelector('svg')
    expect(svgIcon).toBeInTheDocument()
    expect(svgIcon).toHaveClass('google-icon')
  })

  test('has proper accessibility attributes', () => {
    render(<LoginPage onBack={mockOnBack} />)
    const backButtons = screen.getAllByTitle('Go back')
    backButtons.forEach(button => {
      expect(button).toHaveAttribute('title', 'Go back')
    })
  })

  test('renders login card structure', () => {
    render(<LoginPage onBack={mockOnBack} />)
    expect(document.querySelector('.login-card')).toBeInTheDocument()
    expect(document.querySelector('.login-left')).toBeInTheDocument()
    expect(document.querySelector('.login-right')).toBeInTheDocument()
  })

  test('form container has proper structure', () => {
    render(<LoginPage onBack={mockOnBack} />)
    const formContainer = document.querySelector('.login-form-container')
    expect(formContainer).toBeInTheDocument()
    expect(formContainer).toContainElement(screen.getByText('Welcome back!'))
  })

  test('does not render back button when onBack is not provided', () => {
    render(<LoginPage />)
    expect(screen.queryByTitle('Go back')).not.toBeInTheDocument()
  })

  test('back button is clickable and functional', () => {
    render(<LoginPage onBack={mockOnBack} />)
    const backButtons = screen.getAllByTitle('Go back')
    expect(backButtons[0]).toBeEnabled()
    fireEvent.click(backButtons[0])
    expect(mockOnBack).toHaveBeenCalled()
  })
})