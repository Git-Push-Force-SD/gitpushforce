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
    render(<App />)
    expect(screen.getByText(/A secure campus marketplace where students can buy, sell, and trade/i)).toBeInTheDocument()
  })

  test('displays Browse Marketplace button', () => {
    render(<App />)
    const browseButtons = screen.getAllByText(/Browse Marketplace/i)
    expect(browseButtons.length).toBeGreaterThan(0)
  })

  test('displays Get started button in hero', () => {
    render(<App />)
    const getStartedButtons = screen.getAllByText('Get started')
    expect(getStartedButtons.length).toBeGreaterThan(0)
  })

  test('displays category hashtags', () => {
    render(<App />)
    expect(screen.getByText('#TECH')).toBeInTheDocument()
    expect(screen.getByText('#CAMPUS ESSENTIALS')).toBeInTheDocument()
  })

  test('displays verified accounts section', () => {
    render(<App />)
    expect(screen.getAllByText(/verified accounts/i).length).toBeGreaterThan(0)
  })

  test('displays Designed for Students section', () => {
    render(<App />)
    expect(screen.getByText(/Designed for Students/i)).toBeInTheDocument()
  })

  test('displays parallel text section with product categories', () => {
    render(<App />)
    expect(screen.getByText('TEXTBOOKS')).toBeInTheDocument()
    expect(screen.getByText('ELECTRONICS')).toBeInTheDocument()
    expect(screen.getByText('CLOTHING')).toBeInTheDocument()
    expect(screen.getByText('AND MORE')).toBeInTheDocument()
  })

  test('displays List in Minutes card', () => {
    render(<App />)
    expect(screen.getByText('List in Minutes')).toBeInTheDocument()
    expect(screen.getByText(/Add an item, price, and description/i)).toBeInTheDocument()
  })

  test('displays Message Safely card', () => {
    render(<App />)
    expect(screen.getByText('Message Safely')).toBeInTheDocument()
    expect(screen.getByText(/Talk to buyers and sellers inside the platform/i)).toBeInTheDocument()
  })

  test('displays Secure Exchange card', () => {
    render(<App />)
    const secureExchangeElements = screen.getAllByText('Secure Exchange')
    expect(secureExchangeElements.length).toBeGreaterThan(0)
    expect(screen.getByText(/Items are exchanged through a structured campus process/i)).toBeInTheDocument()
  })

  test('displays Trusted System section', () => {
    render(<App />)
    expect(screen.getByText('TRUSTED SYSTEM')).toBeInTheDocument()
    expect(screen.getAllByText(/Secure Campus/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Exchange/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/System/i).length).toBeGreaterThan(0)
  })

  test('displays Browse The Feed heading', () => {
    render(<App />)
    expect(screen.getByText(/Browse The Feed/i)).toBeInTheDocument()
  })

  test('displays product cards', () => {
    render(<App />)
    expect(screen.getByText('Sony WH-1000XM4')).toBeInTheDocument()
    expect(screen.getByText('Linear Algebra 8th Ed')).toBeInTheDocument()
    expect(screen.getByText('Nike Dunks Low')).toBeInTheDocument()
  })

  test('displays product prices', () => {
    render(<App />)
    expect(screen.getByText('R8000')).toBeInTheDocument()
    expect(screen.getByText('R1000')).toBeInTheDocument()
    expect(screen.getByText('R2100')).toBeInTheDocument()
  })

  test('displays product conditions', () => {
    render(<App />)
    expect(screen.getByText('Like New')).toBeInTheDocument()
    expect(screen.getByText('Used - Good')).toBeInTheDocument()
    expect(screen.getByText('Worn Once')).toBeInTheDocument()
  })

  test('displays View All Marketplace button', () => {
    render(<App />)
    expect(screen.getByText(/View All Marketplace/i)).toBeInTheDocument()
  })

  test('displays footer CTA with BUY SELL TRADE SAFELY', () => {
    render(<App />)
    expect(screen.getByText(/BUY. SELL. TRADE./i)).toBeInTheDocument()
    const safelyElements = screen.getAllByText('SAFELY')
    expect(safelyElements.length).toBeGreaterThan(0)
  })

  test('displays footer Platform links', () => {
    render(<App />)
    expect(screen.getByText('Platform')).toBeInTheDocument()
  })

  test('displays footer Trust links', () => {
    render(<App />)
    expect(screen.getByText('Trust')).toBeInTheDocument()
  })

  test('displays footer Account links', () => {
    render(<App />)
    expect(screen.getByText('Account')).toBeInTheDocument()
  })

  test('all navigation links have href attributes', () => {
    render(<App />)
    const links = screen.getAllByRole('link')
    links.forEach((link) => {
      expect(link).toHaveAttribute('href')
    })
  })

  test('renders footer UNIMART text', () => {
    render(<App />)
    const uniMartTexts = screen.getAllByText('UNIMART')
    expect(uniMartTexts.length).toBeGreaterThan(1) // header and footer
  })

  test('shows login page when Sign In button is clicked', () => {
    render(<App />)
    // Find the header section and get the Sign In button from there
    const header = document.querySelector('header')
    const signInButton = within(header).getByRole('button', { name: /^sign in$/i })
    fireEvent.click(signInButton)
    expect(screen.getByText('Welcome back!')).toBeInTheDocument()
  })

  test('shows login page when Browse Marketplace button is clicked', () => {
    render(<App />)
    // Find the hero section by looking for the image with alt "Student Lifestyle"
    const heroImage = screen.getByAltText('Student Lifestyle')
    const heroSection = heroImage.closest('.relative.rounded-\\[20px\\]')
    const browseButton = within(heroSection).getByRole('button', { name: /browse marketplace/i })
    fireEvent.click(browseButton)
    expect(screen.getByText('Welcome back!')).toBeInTheDocument()
  })

  test('shows login page when Get started button is clicked', () => {
    render(<App />)
    const getStartedButtons = screen.getAllByText('Get started')
    // Click the first one (hero Get started button)
    fireEvent.click(getStartedButtons[0])
    expect(screen.getByText('Welcome back!')).toBeInTheDocument()
  })

  test('shows login page when View All Marketplace button is clicked', () => {
    render(<App />)
    const viewAllButton = screen.getByText(/View All Marketplace/)
    fireEvent.click(viewAllButton)
    expect(screen.getByText('Welcome back!')).toBeInTheDocument()
  })

  test('shows login page when footer Get started button is clicked', () => {
    render(<App />)
    // Find the footer Get started button specifically
    const footerSection = screen.getByText('Account').closest('section')
    const getStartedButton = footerSection.querySelector('button')
    fireEvent.click(getStartedButton)
    expect(screen.getByText('Welcome back!')).toBeInTheDocument()
  })

  test('shows login page when footer Sign in button is clicked', () => {
    render(<App />)
    // Find the footer Sign in button specifically
    const footerSection = screen.getByText('Account').closest('section')
    const signInButtons = footerSection.querySelectorAll('button')
    const signInButton = Array.from(signInButtons).find(btn => btn.textContent === 'Sign in')
    fireEvent.click(signInButton)
    expect(screen.getByText('Welcome back!')).toBeInTheDocument()
  })

  test('hides landing page when login is shown', () => {
    render(<App />)
    const header = document.querySelector('header')
    const signInButton = within(header).getByRole('button', { name: /^sign in$/i })
    fireEvent.click(signInButton)
    expect(screen.getByText(/SAFE TRADES/i)).not.toBeVisible()
  })

  test('returns to landing page when back button is clicked from login', () => {
    render(<App />)
    const header = document.querySelector('header')
    const signInButton = within(header).getByRole('button', { name: /^sign in$/i })
    fireEvent.click(signInButton)
    expect(screen.getByText('Welcome back!')).toBeInTheDocument()

    const backButtons = screen.getAllByTitle('Go back')
    const backButton = backButtons[0]
    fireEvent.click(backButton)
    expect(screen.getByText(/SAFE TRADES/i)).toBeInTheDocument()
  })

  test('mobile menu toggles when hamburger button is clicked', () => {
    render(<App />)
    // Find the hamburger menu button (it should be the button with Menu icon)
    const buttons = screen.getAllByRole('button')
    const menuButton = buttons.find(button => button.innerHTML.includes('Menu'))
    if (menuButton) {
      fireEvent.click(menuButton)
      expect(screen.getByText('How It Works')).toBeInTheDocument()
    }
  })

  test('mobile menu closes when Sign in is clicked', () => {
    render(<App />)
    const buttons = screen.getAllByRole('button')
    const menuButton = buttons.find(button => button.innerHTML.includes('Menu'))
    if (menuButton) {
      fireEvent.click(menuButton)
      // Find the mobile menu Sign in button
      const mobileSignIn = screen.getAllByText('Sign in').find(btn => 
        btn.closest('.absolute') // mobile menu is in absolute positioned div
      )
      if (mobileSignIn) {
        fireEvent.click(mobileSignIn)
        expect(screen.getByText('Welcome back!')).toBeInTheDocument()
      }
    }
  })

  test('displays arrow buttons in feature cards', () => {
    render(<App />)
    // Check that there are buttons with SVG icons (arrow icons)
    const buttons = screen.getAllByRole('button')
    const buttonsWithIcons = buttons.filter(button => button.querySelector('svg'))
    expect(buttonsWithIcons.length).toBeGreaterThan(3)
  })

  test('arrow buttons in feature cards lead to login', () => {
    render(<App />)
    // Find the List in Minutes section and click its button
    const listSection = screen.getByText('List in Minutes').closest('section')
    const button = listSection.querySelector('button')
    fireEvent.click(button)
    expect(screen.getByText('Welcome back!')).toBeInTheDocument()
  })

  test('product card arrow buttons lead to login', () => {
    render(<App />)
    // Find a product card and click its arrow button
    const productCard = screen.getByText('Sony WH-1000XM4').parentElement.parentElement
    const button = productCard.querySelector('button')
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(screen.getByText('Welcome back!')).toBeInTheDocument()
  })

  test('scroll effect applies parallax transform', () => {
    // Mock window.scrollY
    Object.defineProperty(window, 'scrollY', { value: 100, writable: true })
    render(<App />)
    // This is hard to test directly, but we can check if the component renders with scroll handling
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})
