import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StudentDashboard from './StudentDashboard';
import { supabase } from './utils/supabase';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('./utils/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

jest.mock('./Profile', () => ({ onBack, onAddNew }) => (
  <div data-testid="profile-view">
    <button onClick={onBack}>Back</button>
    <button onClick={onAddNew}>Add New</button>
  </div>
));

jest.mock('./SellItemModal', () => ({ onClose }) => (
  <div data-testid="sell-modal">
    <button onClick={onClose}>Close Modal</button>
  </div>
));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockUser = { id: 'user-1' };

const mockListings = [
  {
    id: 'listing-1',
    seller_id: 'seller-1',
    title: 'Introduction to Algorithms',
    description: 'Great textbook',
    price: '250',
    image_path: 'books/algo.jpg',
    category: 'Textbooks',
    condition: 'Good',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'listing-2',
    seller_id: 'seller-2',
    title: 'Standing Desk',
    description: 'Barely used',
    price: '1500',
    image_path: null,
    category: 'Furniture',
    condition: 'Like New',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
];

const mockSellers = [
  { id: 'seller-1', username: 'alice', email: 'alice@uni.ac.za' },
  { id: 'seller-2', username: null,    email: 'bob@uni.ac.za'   },
];

// ─── Supabase mock helpers ────────────────────────────────────────────────────
//
// listings chain:  .from('listings').select().eq().neq().order()  ← order resolves
// sellers  chain:  .from('users').select().in()                   ← in    resolves
//
// IMPORTANT: Do NOT use a shared beforeEach(() => setupSupabaseMocks()).
// jest.clearAllMocks() wipes mockImplementation, so every test must call
// setupSupabaseMocks() itself right before renderDashboard().

const makeListingsChain = (result) => {
  const c = {};
  c.select = jest.fn().mockReturnValue(c);
  c.eq     = jest.fn().mockReturnValue(c);
  c.neq    = jest.fn().mockReturnValue(c);
  c.order  = jest.fn().mockResolvedValue(result);
  return c;
};

const makeSellersChain = (result) => {
  const c = {};
  c.select = jest.fn().mockReturnValue(c);
  c.in     = jest.fn().mockResolvedValue(result);
  return c;
};

const setupSupabaseMocks = ({
  listingsData  = mockListings,
  listingsError = null,
  sellersData   = mockSellers,
  sellersError  = null,
} = {}) => {
  const listingsChain = makeListingsChain({ data: listingsData, error: listingsError });
  const sellersChain  = makeSellersChain ({ data: sellersData,  error: sellersError  });

  // Route by table name — immune to call-order changes
  supabase.from.mockImplementation((table) => {
    if (table === 'listings') return listingsChain;
    if (table === 'users')    return sellersChain;
    throw new Error(`Unexpected supabase.from('${table}')`);
  });

  return { listingsChain, sellersChain };
};

// ─── Render helper ────────────────────────────────────────────────────────────

const renderDashboard = (props = {}) =>
  render(
    <MemoryRouter>
      <StudentDashboard
        user={mockUser}
        userRole="student"
        handleLogout={jest.fn()}
        {...props}
      />
    </MemoryRouter>
  );

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StudentDashboard', () => {
  let navigateMock;

  beforeEach(() => {
    jest.clearAllMocks();
    navigateMock = jest.fn();
    require('react-router-dom').useNavigate.mockReturnValue(navigateMock);
    // Default mock — each test that needs custom data calls setupSupabaseMocks() itself
    setupSupabaseMocks();
  });

  // ── Static UI ────────────────────────────────────────────────────────────

  describe('static UI', () => {
    it('renders the UniMart logo', () => {
      renderDashboard();
      expect(screen.getByText('UniMart')).toBeInTheDocument();
    });

    it('renders all nav links', () => {
      renderDashboard();
      ['Home', 'My Listings', 'My Orders', 'Trade Facility'].forEach(link =>
        expect(screen.getByText(link)).toBeInTheDocument()
      );
    });

    it('renders the "Sell Item" button', () => {
      renderDashboard();
      expect(screen.getByText('Sell Item')).toBeInTheDocument();
    });

    it('renders the "Recent Listings" heading', () => {
      renderDashboard();
      expect(screen.getByText('Recent Listings')).toBeInTheDocument();
    });

    it('renders the "Main Campus" label', () => {
      renderDashboard();
      expect(screen.getByText('Main Campus')).toBeInTheDocument();
    });

    it('renders the logout button when handleLogout is provided', () => {
      renderDashboard();
      expect(screen.getByLabelText('Logout')).toBeInTheDocument();
    });

    it('does not render logout when handleLogout is undefined', () => {
      renderDashboard({ handleLogout: undefined });
      expect(screen.queryByLabelText('Logout')).not.toBeInTheDocument();
    });
  });

  // ── Category tabs ─────────────────────────────────────────────────────────

  describe('category tabs', () => {
    it('renders all 5 category buttons', () => {
      renderDashboard();
      ['All Items', 'Textbooks', 'Furniture', 'Electronics', 'Clothing'].forEach(cat =>
        expect(screen.getByText(cat)).toBeInTheDocument()
      );
    });

    it('"All Items" is active by default', () => {
      renderDashboard();
      expect(screen.getByText('All Items').closest('button')).toHaveClass('bg-dark');
    });

    it('activates the clicked category', () => {
      renderDashboard();
      const btn = screen.getByText('Textbooks').closest('button');
      fireEvent.click(btn);
      expect(btn).toHaveClass('bg-dark');
    });

    it('deactivates the previously active category', () => {
      renderDashboard();
      fireEvent.click(screen.getByText('Electronics').closest('button'));
      expect(screen.getByText('All Items').closest('button')).not.toHaveClass('bg-dark');
    });
  });

  // ── View mode toggle ──────────────────────────────────────────────────────

  describe('view mode toggle', () => {
    const getToggleBtns = () =>
      Array.from(document.querySelectorAll('button')).filter(b =>
        b.className.includes('w-10') &&
        b.className.includes('h-10') &&
        b.className.includes('rounded-full')
      );

    it('defaults to grid view (lg:grid-cols-3)', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      expect(document.querySelector('.grid')).toHaveClass('lg:grid-cols-3');
    });

    it('switches to list view when list button is clicked', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      fireEvent.click(getToggleBtns()[1]); // 0=grid, 1=list
      const grid = document.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-1');
      expect(grid).not.toHaveClass('lg:grid-cols-3');
    });

    it('grid button regains active style after switching back', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      const [gridBtn, listBtn] = getToggleBtns();
      fireEvent.click(listBtn);
      fireEvent.click(gridBtn);
      expect(gridBtn).toHaveClass('text-white');
    });
  });

  // ── Loading skeletons ─────────────────────────────────────────────────────

  describe('loading state', () => {
    it('renders animate-pulse skeleton elements while fetching', () => {
      // Override with a never-resolving chain
      supabase.from.mockImplementation(() => {
        const c = {};
        c.select = jest.fn().mockReturnValue(c);
        c.eq     = jest.fn().mockReturnValue(c);
        c.neq    = jest.fn().mockReturnValue(c);
        c.order  = jest.fn().mockReturnValue(new Promise(() => {}));
        return c;
      });
      renderDashboard();
      expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(6);
    });
  });

  // ── Successful listings render ────────────────────────────────────────────

  describe('successful listings render', () => {
    it('renders both listing titles', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      expect(screen.getByText('Standing Desk')).toBeInTheDocument();
    });

    it('renders seller username', async () => {
      renderDashboard();
      await waitFor(() => expect(screen.getByText('alice')).toBeInTheDocument());
    });

    it('falls back to email prefix when username is null', async () => {
      renderDashboard();
      await waitFor(() => expect(screen.getByText('bob')).toBeInTheDocument());
    });

    it('renders en-ZA formatted price (comma decimal separator)', async () => {
      renderDashboard();
      await waitFor(() => expect(screen.getByText(/R250,00/)).toBeInTheDocument());
    });

    it('renders the Supabase image URL when image_path is set', async () => {
      renderDashboard();
      await waitFor(() => {
        const img = Array.from(screen.getAllByRole('img'))
          .find(i => i.src.includes('keposlpyrewldohbmesq.supabase.co') && i.src.includes('books/algo.jpg'));
        expect(img).toBeDefined();
      });
    });

    it('uses Unsplash fallback when image_path is null', async () => {
      renderDashboard();
      await waitFor(() => {
        const img = Array.from(screen.getAllByRole('img'))
          .find(i => i.src.includes('unsplash.com') && i.alt === 'Standing Desk');
        expect(img).toBeDefined();
      });
    });

    it('renders condition in uppercase', async () => {
      renderDashboard();
      await waitFor(() => expect(screen.getByText('GOOD')).toBeInTheDocument());
    });

    it('renders category badge in uppercase', async () => {
      renderDashboard();
      await waitFor(() => expect(screen.getAllByText('TEXTBOOKS')[0]).toBeInTheDocument());
    });

    it('navigates to listing detail on card click', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      const card = screen.getByText('Introduction to Algorithms')
        .closest('section[class*="cursor-pointer"]');
      fireEvent.click(card);
      expect(navigateMock).toHaveBeenCalledWith('/listing/listing-1');
    });
  });

  // ── Empty state ───────────────────────────────────────────────────────────

  describe('empty listings state', () => {
    it('shows "No listings available" for an empty array', async () => {
      setupSupabaseMocks({ listingsData: [] });
      renderDashboard();
      await waitFor(() => expect(screen.getByText('No listings available')).toBeInTheDocument());
    });

    it('shows "No listings available" when data is null', async () => {
      setupSupabaseMocks({ listingsData: null });
      renderDashboard();
      await waitFor(() => expect(screen.getByText('No listings available')).toBeInTheDocument());
    });
  });

  // ── Error states ──────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('shows empty state on listings query error', async () => {
      setupSupabaseMocks({ listingsData: null, listingsError: { message: 'DB error' } });
      renderDashboard();
      await waitFor(() => expect(screen.getByText('No listings available')).toBeInTheDocument());
    });

    it('still renders listings when seller query fails', async () => {
      setupSupabaseMocks({ sellersData: null, sellersError: { message: 'fail' } });
      renderDashboard();
      await waitFor(() => expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument());
    });

    it('shows "User" fallback when sellers array is empty', async () => {
      setupSupabaseMocks({ sellersData: [] });
      renderDashboard();
      await waitFor(() => expect(screen.getAllByText('User').length).toBeGreaterThan(0));
    });

    it('does not crash when supabase.from throws synchronously', () => {
      supabase.from.mockImplementation(() => { throw new Error('Network failure'); });
      expect(() => renderDashboard()).not.toThrow();
    });
  });

  // ── Supabase query wiring ─────────────────────────────────────────────────

  describe('Supabase query wiring', () => {
    it('queries the listings table', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      expect(supabase.from).toHaveBeenCalledWith('listings');
    });

    it('filters by status = active', async () => {
      const { listingsChain } = setupSupabaseMocks();
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      expect(listingsChain.eq).toHaveBeenCalledWith('status', 'active');
    });

    it('excludes current user listings via neq', async () => {
      const { listingsChain } = setupSupabaseMocks();
      renderDashboard({ user: { id: 'user-1' } });
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      expect(listingsChain.neq).toHaveBeenCalledWith('seller_id', 'user-1');
    });

    it('does NOT call neq when user is null', async () => {
      const { listingsChain } = setupSupabaseMocks();
      renderDashboard({ user: null });
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      expect(listingsChain.neq).not.toHaveBeenCalled();
    });

    it('orders by created_at descending', async () => {
      const { listingsChain } = setupSupabaseMocks();
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      expect(listingsChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('queries users table with seller IDs', async () => {
      const { sellersChain } = setupSupabaseMocks();
      renderDashboard();
      await waitFor(() => screen.getByText('alice'));
      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(sellersChain.in).toHaveBeenCalledWith(
        'id',
        expect.arrayContaining(['seller-1', 'seller-2'])
      );
    });

    it('re-fetches when the user id prop changes', async () => {
      renderDashboard({ user: { id: 'user-1' } });
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      const callsBefore = supabase.from.mock.calls.length;

      setupSupabaseMocks();
      const { rerender } = render(
        <MemoryRouter>
          <StudentDashboard user={{ id: 'user-2' }} userRole="student" handleLogout={jest.fn()} />
        </MemoryRouter>
      );
      await waitFor(() =>
        expect(supabase.from.mock.calls.length).toBeGreaterThan(callsBefore)
      );
    });
  });

  // ── Sell modal ────────────────────────────────────────────────────────────

  describe('sell modal', () => {
    it('is hidden by default', () => {
      renderDashboard();
      expect(screen.queryByTestId('sell-modal')).not.toBeInTheDocument();
    });

    it('opens when "Sell Item" is clicked', () => {
      renderDashboard();
      fireEvent.click(screen.getByText('Sell Item'));
      expect(screen.getByTestId('sell-modal')).toBeInTheDocument();
    });

    it('closes when modal calls onClose', () => {
      renderDashboard();
      fireEvent.click(screen.getByText('Sell Item'));
      fireEvent.click(screen.getByText('Close Modal'));
      expect(screen.queryByTestId('sell-modal')).not.toBeInTheDocument();
    });
  });

  // ── Profile navigation ────────────────────────────────────────────────────

  describe('profile navigation', () => {
    it('shows profile view on profile button click', () => {
      renderDashboard();
      fireEvent.click(screen.getByLabelText('Open profile'));
      expect(screen.getByTestId('profile-view')).toBeInTheDocument();
    });

    it('returns to home when Profile calls onBack', () => {
      renderDashboard();
      fireEvent.click(screen.getByLabelText('Open profile'));
      fireEvent.click(screen.getByText('Back'));
      expect(screen.queryByTestId('profile-view')).not.toBeInTheDocument();
      expect(screen.getByText('Recent Listings')).toBeInTheDocument();
    });

    it('opens sell modal from profile via onAddNew', () => {
      renderDashboard();
      fireEvent.click(screen.getByLabelText('Open profile'));
      fireEvent.click(screen.getByText('Add New'));
      expect(screen.getByTestId('sell-modal')).toBeInTheDocument();
    });

    it('renders both profile view and sell modal simultaneously', () => {
      renderDashboard();
      fireEvent.click(screen.getByLabelText('Open profile'));
      fireEvent.click(screen.getByText('Add New'));
      expect(screen.getByTestId('profile-view')).toBeInTheDocument();
      expect(screen.getByTestId('sell-modal')).toBeInTheDocument();
    });
  });

  // ── Logout ────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('calls handleLogout on logout button click', () => {
      const handleLogout = jest.fn();
      renderDashboard({ handleLogout });
      fireEvent.click(screen.getByLabelText('Logout'));
      expect(handleLogout).toHaveBeenCalledTimes(1);
    });
  });

  // ── Heart / stopPropagation ───────────────────────────────────────────────

  describe('favourite button', () => {
    it('does not trigger navigation when heart is clicked (stopPropagation)', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      const card = screen.getByText('Introduction to Algorithms')
        .closest('section[class*="cursor-pointer"]');
      fireEvent.click(card.querySelector('button'));
      expect(navigateMock).not.toHaveBeenCalled();
    });
  });

  // ── calculateTimeAgo branches ─────────────────────────────────────────────

  describe('time display', () => {
    it('shows "just now" for a listing created moments ago', async () => {
      setupSupabaseMocks({
        listingsData: [{ ...mockListings[0], created_at: new Date().toISOString() }],
      });
      renderDashboard();
      await waitFor(() => expect(screen.getByText('just now')).toBeInTheDocument());
    });

    it('shows "mins ago" for a listing under an hour old', async () => {
      renderDashboard();
      await waitFor(() => expect(screen.getByText(/\d+ mins? ago/)).toBeInTheDocument());
    });

    it('shows "hours ago" for a listing a few hours old', async () => {
      renderDashboard();
      await waitFor(() => expect(screen.getByText(/\d+ hours? ago/)).toBeInTheDocument());
    });

    it('shows "days ago" for a listing a few days old', async () => {
      setupSupabaseMocks({
        listingsData: [{
          ...mockListings[0],
          created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
        }],
      });
      renderDashboard();
      await waitFor(() => expect(screen.getByText(/\d+ days? ago/)).toBeInTheDocument());
    });

    it('shows a locale date string for listings older than 7 days', async () => {
      setupSupabaseMocks({
        listingsData: [{ ...mockListings[0], created_at: '2023-01-01T00:00:00.000Z' }],
      });
      renderDashboard();
      await waitFor(() => {
        expect(screen.queryByText(/ago/)).not.toBeInTheDocument();
        expect(screen.queryByText('just now')).not.toBeInTheDocument();
      });
    });

    it('shows "unknown" when created_at is null', async () => {
      setupSupabaseMocks({ listingsData: [{ ...mockListings[0], created_at: null }] });
      renderDashboard();
      await waitFor(() => expect(screen.getByText('unknown')).toBeInTheDocument());
    });

    it('shows "unknown" for an invalid date string', async () => {
      setupSupabaseMocks({ listingsData: [{ ...mockListings[0], created_at: 'not-a-date' }] });
      renderDashboard();
      await waitFor(() => expect(screen.getByText('unknown')).toBeInTheDocument());
    });
  });

  // ── Null field fallbacks ──────────────────────────────────────────────────

  describe('null field fallbacks', () => {
    it('displays UNKNOWN when condition is null', async () => {
      setupSupabaseMocks({ listingsData: [{ ...mockListings[0], condition: null }] });
      renderDashboard();
      await waitFor(() => expect(screen.getByText('UNKNOWN')).toBeInTheDocument());
    });

    it('displays OTHER when category is null', async () => {
      setupSupabaseMocks({ listingsData: [{ ...mockListings[0], category: null }] });
      renderDashboard();
      await waitFor(() => expect(screen.getByText('OTHER')).toBeInTheDocument());
    });
  });
});
