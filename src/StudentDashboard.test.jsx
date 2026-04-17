jest.mock('./utils/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('./Profile', () => function MockProfile({ onBack, onAddNew }) {
  return (
    <div data-testid="mock-profile">
      <button onClick={onBack}>Back to Dashboard</button>
      <button onClick={onAddNew}>Add New Listing</button>
    </div>
  );
});

jest.mock('./SellItemModal', () => function MockSellItemModal({ onClose }) {
  return (
    <div data-testid="mock-modal">
      <button onClick={onClose}>Close Modal</button>
    </div>
  );
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StudentDashboard from './StudentDashboard';

const mockUser = { id: 'user123', email: 'user@example.com' };

const sampleListings = [
  {
    id: 'listing1',
    seller_id: 'seller1',
    title: 'Engineering Textbook',
    description: 'Good condition',
    price: '250.00',
    image_path: null,
    category: 'textbooks',
    condition: 'good',
    created_at: new Date().toISOString(),
  },
  {
    id: 'listing2',
    seller_id: 'seller2',
    title: 'Study Desk',
    description: 'Wooden desk',
    price: '800.00',
    image_path: 'test/desk.jpg',
    category: 'furniture',
    condition: 'like_new',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

/**
 * Routes the supabase mock by table name so listings and users
 * calls never interfere with each other.
 *
 * The listings chain supports both:
 *   .eq().neq().order()  — logged-in user (excludes own listings)
 *   .eq().order()        — null user (no exclusion)
 */
const setupMocks = ({ listings = [], sellers = [], listingError = null } = {}) => {
  const mockSupabase = require('./utils/supabase').supabase;
  mockSupabase.from.mockImplementation((table) => {
    if (table === 'listings') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            neq: jest.fn(() => ({
              order: jest.fn(() => Promise.resolve({ data: listings, error: listingError })),
            })),
            order: jest.fn(() => Promise.resolve({ data: listings, error: listingError })),
          })),
        })),
      };
    }
    if (table === 'users') {
      return {
        select: jest.fn(() => ({
          in: jest.fn(() => Promise.resolve({ data: sellers, error: null })),
        })),
      };
    }
    return { select: jest.fn(() => ({ eq: jest.fn(), in: jest.fn() })) };
  });
};

describe('StudentDashboard Component', () => {
  let mockSupabase;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = require('./utils/supabase').supabase;
  });

  // ─── Rendering ───────────────────────────────────────────────────────────────

  test('renders core navigation elements', () => {
    setupMocks();
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    expect(screen.getByText('UniMart')).toBeInTheDocument();
    expect(screen.getByText('Recent Listings')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sell Item/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open profile/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Logout/i })).toBeInTheDocument();
  });

  test('renders all five category filter buttons', () => {
    setupMocks();
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    expect(screen.getByRole('button', { name: /All Items/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Textbooks/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Furniture/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Electronics/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clothing/i })).toBeInTheDocument();
  });

  test('shows skeleton loaders while fetching', () => {
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          neq: jest.fn(() => ({
            order: jest.fn(() => new Promise(() => {})), // never resolves
          })),
        })),
      })),
    }));

    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // ─── Data fetching ────────────────────────────────────────────────────────────

  test('queries listings table on mount', async () => {
    setupMocks();
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('listings');
    });
  });

  test('filters listings by status active', async () => {
    const mockEq = jest.fn(() => ({
      neq: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    }));
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'listings') return { select: jest.fn(() => ({ eq: mockEq })) };
      return { select: jest.fn(() => ({ in: jest.fn(() => Promise.resolve({ data: [], error: null })) })) };
    });

    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('status', 'active');
    });
  });

  test('shows "No listings available" when data is empty', async () => {
    setupMocks({ listings: [] });
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('No listings available')).toBeInTheDocument();
    });
  });

  test('shows "No listings available" on API error', async () => {
    setupMocks({ listingError: { message: 'DB error' } });
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('No listings available')).toBeInTheDocument();
    });
  });

  test('renders product listings when data is returned', async () => {
    setupMocks({
      listings: sampleListings,
      sellers: [
        { id: 'seller1', username: 'Alice', email: 'alice@test.com' },
        { id: 'seller2', username: 'Bob', email: 'bob@test.com' },
      ],
    });

    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Engineering Textbook')).toBeInTheDocument();
      expect(screen.getByText('Study Desk')).toBeInTheDocument();
    });
  });

  test('displays formatted price for listings', async () => {
    setupMocks({ listings: sampleListings, sellers: [] });
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('R250.00')).toBeInTheDocument();
    });
  });

  test('displays seller username when available', async () => {
    setupMocks({
      listings: sampleListings,
      sellers: [{ id: 'seller1', username: 'Alice', email: 'alice@test.com' }],
    });

    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });

  test('falls back to email prefix when username is null', async () => {
    setupMocks({
      listings: [sampleListings[0]],
      sellers: [{ id: 'seller1', username: null, email: 'alice@students.ac.za' }],
    });

    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument();
    });
  });

  test('handles null user without crashing', async () => {
    setupMocks({ listings: [] });
    render(<StudentDashboard user={null} userRole="student" handleLogout={jest.fn()} />);

    expect(screen.getByText('UniMart')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('No listings available')).toBeInTheDocument();
    });
  });

  test('displays condition badge in uppercase', async () => {
    setupMocks({ listings: sampleListings, sellers: [] });
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('GOOD')).toBeInTheDocument();
    });
  });

  test('displays category badge in uppercase', async () => {
    setupMocks({ listings: sampleListings, sellers: [] });
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('TEXTBOOKS')).toBeInTheDocument();
    });
  });

  // ─── Navigation & modals ─────────────────────────────────────────────────────

  test('opens profile view when profile button clicked', () => {
    setupMocks();
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Open profile/i }));
    expect(screen.getByTestId('mock-profile')).toBeInTheDocument();
  });

  test('returns to home when back button clicked in profile', () => {
    setupMocks();
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Open profile/i }));
    fireEvent.click(screen.getByRole('button', { name: /Back to Dashboard/i }));

    expect(screen.queryByTestId('mock-profile')).not.toBeInTheDocument();
    expect(screen.getByText('UniMart')).toBeInTheDocument();
  });

  test('opens sell modal when Sell Item clicked', () => {
    setupMocks();
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Sell Item/i }));
    expect(screen.getByTestId('mock-modal')).toBeInTheDocument();
  });

  test('closes sell modal when close button clicked', () => {
    setupMocks();
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Sell Item/i }));
    fireEvent.click(screen.getByRole('button', { name: /Close Modal/i }));

    expect(screen.queryByTestId('mock-modal')).not.toBeInTheDocument();
  });

  test('opens sell modal from profile page via Add New Listing', () => {
    setupMocks();
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Open profile/i }));
    fireEvent.click(screen.getByRole('button', { name: /Add New Listing/i }));

    expect(screen.getByTestId('mock-modal')).toBeInTheDocument();
  });

  test('calls handleLogout when logout button clicked', () => {
    const mockLogout = jest.fn();
    setupMocks();
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={mockLogout} />);

    fireEvent.click(screen.getByRole('button', { name: /Logout/i }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  test('does not render logout button when handleLogout is not provided', () => {
    setupMocks();
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={undefined} />);

    expect(screen.queryByRole('button', { name: /Logout/i })).not.toBeInTheDocument();
  });

  // ─── Category & view mode ─────────────────────────────────────────────────────

  test('clicking a category button marks it as active', () => {
    setupMocks();
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    const textbooksBtn = screen.getByRole('button', { name: /Textbooks/i });
    fireEvent.click(textbooksBtn);

    expect(textbooksBtn.className).toContain('bg-dark');
  });

  test('All Items is active by default', () => {
    setupMocks();
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    const allItemsBtn = screen.getByRole('button', { name: /All Items/i });
    expect(allItemsBtn.className).toContain('bg-dark');
  });

  test('rerenders without crashing when user prop changes', async () => {
    setupMocks();
    const { rerender } = render(
      <StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />
    );

    setupMocks();
    rerender(
      <StudentDashboard user={{ id: 'user456', email: 'new@test.com' }} userRole="student" handleLogout={jest.fn()} />
    );

    expect(screen.getByText('UniMart')).toBeInTheDocument();
  });

  // ─── calculateTimeAgo coverage (lines 25–43) ─────────────────────────────────

  test('displays "just now" for listings posted seconds ago', async () => {
    const justNow = new Date(Date.now() - 30000).toISOString(); // 30s ago
    setupMocks({ listings: [{ ...sampleListings[0], created_at: justNow }], sellers: [] });
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('just now')).toBeInTheDocument();
    });
  });

  test('displays minutes ago for listings posted under an hour ago', async () => {
    const fiveMinsAgo = new Date(Date.now() - 5 * 60000).toISOString();
    setupMocks({ listings: [{ ...sampleListings[0], created_at: fiveMinsAgo }], sellers: [] });
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('5 mins ago')).toBeInTheDocument();
    });
  });

  test('displays singular "min ago" for exactly 1 minute', async () => {
    const oneMinAgo = new Date(Date.now() - 60000).toISOString();
    setupMocks({ listings: [{ ...sampleListings[0], created_at: oneMinAgo }], sellers: [] });
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('1 min ago')).toBeInTheDocument();
    });
  });

  test('displays hours ago for listings posted under a day ago', async () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600000).toISOString();
    setupMocks({ listings: [{ ...sampleListings[0], created_at: threeHoursAgo }], sellers: [] });
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('3 hours ago')).toBeInTheDocument();
    });
  });

  test('displays singular "hour ago" for exactly 1 hour', async () => {
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    setupMocks({ listings: [{ ...sampleListings[0], created_at: oneHourAgo }], sellers: [] });
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('1 hour ago')).toBeInTheDocument();
    });
  });

  test('displays days ago for listings posted under a week ago', async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    setupMocks({ listings: [{ ...sampleListings[0], created_at: threeDaysAgo }], sellers: [] });
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('3 days ago')).toBeInTheDocument();
    });
  });

  test('displays formatted date for listings older than a week', async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();
    setupMocks({ listings: [{ ...sampleListings[0], created_at: tenDaysAgo }], sellers: [] });
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    const expected = new Date(tenDaysAgo).toLocaleDateString('en-ZA');
    await waitFor(() => {
      expect(screen.getByText(expected)).toBeInTheDocument();
    });
  });

  test('displays "unknown" for null created_at', async () => {
    setupMocks({ listings: [{ ...sampleListings[0], created_at: null }], sellers: [] });
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('unknown')).toBeInTheDocument();
    });
  });

  test('displays "unknown" for invalid date string', async () => {
    setupMocks({ listings: [{ ...sampleListings[0], created_at: 'not-a-date' }], sellers: [] });
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('unknown')).toBeInTheDocument();
    });
  });

  // ─── Seller fetch fallbacks (lines 79–117) ───────────────────────────────────

  test('shows "User" when seller is not found in users table', async () => {
    // sellers array is empty — no match for seller_id
    setupMocks({ listings: [sampleListings[0]], sellers: [] });
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('User')).toBeInTheDocument();
    });
  });

  test('queries users table with seller IDs after fetching listings', async () => {
    setupMocks({
      listings: sampleListings,
      sellers: [{ id: 'seller1', username: 'Alice', email: 'alice@test.com' }],
    });

    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });
  });

  test('handles seller fetch error gracefully and still renders listings', async () => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'listings') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              neq: jest.fn(() => ({
                order: jest.fn(() => Promise.resolve({ data: sampleListings, error: null })),
              })),
            })),
          })),
        };
      }
      if (table === 'users') {
        return {
          select: jest.fn(() => ({
            in: jest.fn(() => Promise.resolve({ data: null, error: { message: 'Users fetch failed' } })),
          })),
        };
      }
    });

    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    // Listings still render even when seller fetch fails
    await waitFor(() => {
      expect(screen.getByText('Engineering Textbook')).toBeInTheDocument();
    });
  });

  // ─── Image URL building (lines 134, 206–212) ─────────────────────────────────

  test('uses Supabase storage URL when image_path is set', async () => {
    const listingWithPath = { ...sampleListings[0], image_path: 'uploads/book.jpg' };
    setupMocks({ listings: [listingWithPath], sellers: [] });
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    await waitFor(() => {
      const img = screen.getByAltText('Engineering Textbook');
      expect(img.src).toContain('supabase.co');
      expect(img.src).toContain('uploads/book.jpg');
    });
  });

  test('uses fallback unsplash image when no image_path', async () => {
    const listingNoImage = { ...sampleListings[0], image_path: null };
    setupMocks({ listings: [listingNoImage], sellers: [] });
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    await waitFor(() => {
      const img = screen.getByAltText('Engineering Textbook');
      expect(img.src).toContain('unsplash.com');
    });
  });

  // ─── List view mode (lines 269–311) ──────────────────────────────────────────

  test('switches to list view when list button clicked', async () => {
    setupMocks({ listings: sampleListings, sellers: [] });
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Engineering Textbook')).toBeInTheDocument();
    });

    // Find the list view button by its SVG icon presence — it's the second view toggle
    const viewButtons = document.querySelectorAll('.rounded-full.border');
    const listBtn = Array.from(viewButtons).find(btn =>
      btn.querySelector('svg.lucide-list')
    );
    fireEvent.click(listBtn);

    // Grid changes to single column list layout
    const grid = document.querySelector('.grid');
    expect(grid.className).toContain('grid-cols-1');
  });

  test('list view renders listings in horizontal layout', async () => {
    setupMocks({ listings: sampleListings, sellers: [] });
    render(<StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Engineering Textbook')).toBeInTheDocument();
    });

    const viewButtons = document.querySelectorAll('.rounded-full.border');
    const listBtn = Array.from(viewButtons).find(btn =>
      btn.querySelector('svg.lucide-list')
    );
    fireEvent.click(listBtn);

    // List view cards use flex-row
    await waitFor(() => {
      const cards = document.querySelectorAll('.flex-row');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

});
