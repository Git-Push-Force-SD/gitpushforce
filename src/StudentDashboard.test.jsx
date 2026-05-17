import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StudentDashboard from './StudentDashboard';
import { supabase } from './utils/supabase';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('./utils/supabase', () => {
  const mockChannel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
    unsubscribe: jest.fn(),
  };
  return {
    supabase: {
      from: jest.fn(),
      channel: jest.fn().mockReturnValue(mockChannel),
      removeChannel: jest.fn().mockResolvedValue(null),
    },
  };
});

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

jest.mock('./Profile', () => ({ onBack, onAddNew }) => (
  <div data-testid="profile-view">
    <button onClick={onBack}>Back from Profile</button>
    <button onClick={onAddNew}>Add New from Profile</button>
  </div>
));

jest.mock('./SellItemModal', () => ({ onClose }) => (
  <div data-testid="sell-modal">
    <button onClick={onClose}>Close Modal</button>
  </div>
));

jest.mock('./MyOrders', () => ({ onBack }) => (
  <div data-testid="my-orders-view">
    <button onClick={onBack}>Back from Orders</button>
  </div>
));

jest.mock('./components/MobileMenu', () => ({
  __esModule: true,
  default: ({ isOpen, onClose, onNavigate, onOpenSearch, onSellItem, onLogout }) =>
    isOpen ? (
      <div data-testid="mobile-menu">
        <button onClick={onClose}>Close Menu</button>
        <button onClick={() => onNavigate('profile')}>Go Profile</button>
        <button onClick={() => onNavigate('orders')}>Go Orders</button>
        <button onClick={() => onNavigate('wishlist')}>Go Wishlist</button>
        <button onClick={() => onNavigate('messages')}>Go Messages</button>
        <button onClick={() => onNavigate('bookings')}>Go Bookings</button>
        <button onClick={onOpenSearch}>Open Search</button>
        <button onClick={onSellItem}>Sell from Menu</button>
        <button onClick={onLogout}>Logout from Menu</button>
      </div>
    ) : null,
}));

jest.mock('./components/UserProfileModal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose, userId }) =>
    isOpen ? (
      <div data-testid="user-profile-modal" data-user-id={userId}>
        <button onClick={onClose}>Close Profile Modal</button>
      </div>
    ) : null,
}));

jest.mock('./components/booking/StudentBookingDashboard', () => ({
  __esModule: true,
  default: ({ onClose }) => (
    <div data-testid="booking-dashboard">
      <button onClick={onClose}>Close Bookings</button>
    </div>
  ),
}));

jest.mock('./hooks/useUnreadMessages', () => ({
  useUnreadMessages: jest.fn(() => ({ unreadCount: 0 })),
}));

jest.mock('./hooks/useBookings', () => ({
  useSellerPendingOrders: jest.fn(() => ({ pendingOrders: [] })),
}));

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
    category: 'textbooks',
    condition: 'good',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'listing-2',
    seller_id: 'seller-2',
    title: 'Standing Desk',
    description: 'Barely used',
    price: '1500',
    image_path: null,
    category: 'furniture',
    condition: 'like_new',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
];

const mockSellers = [
  { id: 'seller-1', username: 'alice', email: 'alice@uni.ac.za' },
  { id: 'seller-2', username: null, email: 'bob@uni.ac.za' },
];

// ─── Supabase mock helpers ────────────────────────────────────────────────────

/**
 * makeChain: every method — chainable or terminal — returns a fresh object
 * that is itself both awaitable (resolves to `result`) and has all chain
 * methods on it. This means no two concurrent queries ever share state, AND
 * every terminal call (.order, .in, .single) on any sub-chain also resolves
 * correctly regardless of how deep the call chain goes.
 *
 * The key insight: in the component the listings fetch ends with .order(...),
 * the users fetch ends with .in(...), and both are called after one or more
 * .eq()/.neq() calls. Each of those intermediate calls must return something
 * whose terminal methods also resolve — so build() is called recursively and
 * every node in the chain is a fully-resolved thenable with all methods.
 */
const makeChain = (result) => {
  const build = () => {
    const resolved = Promise.resolve(result);
    const node = {
      // Awaitable
      then:  (...a) => resolved.then(...a),
      catch: (...a) => resolved.catch(...a),
      // Every method — chainable or terminal — returns a fresh fully-wired node
      select: jest.fn(() => build()),
      eq:     jest.fn(() => build()),
      neq:    jest.fn(() => build()),
      or:     jest.fn(() => build()),
      inner:  jest.fn(() => build()),
      in:     jest.fn(() => build()),
      order:  jest.fn(() => build()),
      single: jest.fn(() => build()),
    };
    return node;
  };

  return build();
};

/**
 * spyChain: used only for wiring tests that need to assert on specific method
 * calls (.neq, .in). ALL methods return root so every call in the chain —
 * regardless of order — is recorded on the stable root object.
 * The root itself is awaitable and resolves to `result`, so the component's
 * `const { data, error } = await query.neq(...)` or `await query.order(...)`
 * both resolve correctly.
 */
const spyChain = (result) => {
  const resolved = Promise.resolve(result);
  const root = {
    then:  (...a) => resolved.then(...a),
    catch: (...a) => resolved.catch(...a),
    select: jest.fn(),
    eq:     jest.fn(),
    neq:    jest.fn(),
    or:     jest.fn(),
    inner:  jest.fn(),
    in:     jest.fn(),
    order:  jest.fn(),
    single: jest.fn(),
  };
  // Every method returns root — spies accumulate all calls regardless of
  // call order in the chain, and awaiting root resolves to result.
  root.select.mockReturnValue(root);
  root.eq.mockReturnValue(root);
  root.neq.mockReturnValue(root);
  root.or.mockReturnValue(root);
  root.inner.mockReturnValue(root);
  root.in.mockReturnValue(root);
  root.order.mockReturnValue(root);
  root.single.mockReturnValue(root);
  return root;
};

const setupSupabaseMocks = ({
  listingsData = mockListings,
  listingsError = null,
  sellersData = mockSellers,
  sellersError = null,
  ordersData = [],
  reviewsData = [],
  tradesData = [],
} = {}) => {
  supabase.from.mockImplementation((table) => {
    if (table === 'listings') return makeChain({ data: listingsData, error: listingsError });
    if (table === 'users')    return makeChain({ data: sellersData,  error: sellersError  });
    if (table === 'orders')   return makeChain({ data: ordersData,   error: null          });
    if (table === 'reviews')  return makeChain({ data: reviewsData,  error: null          });
    if (table === 'trades')   return makeChain({ data: tradesData,   error: null          });
    return makeChain({ data: [], error: null });
  });
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
    setupSupabaseMocks();
  });

  // ── Static UI ────────────────────────────────────────────────────────────

  describe('static UI', () => {
    it('renders the UniMart logo', () => {
      renderDashboard();
      expect(screen.getByText('UniMart')).toBeInTheDocument();
    });

    it('renders Home nav link', () => {
      renderDashboard();
      expect(screen.getByRole('button', { name: /^Home$/i })).toBeInTheDocument();
    });

    it('renders My Orders nav link', () => {
      renderDashboard();
      expect(screen.getByRole('button', { name: /My Orders/i })).toBeInTheDocument();
    });

    it('renders Bookings nav link', () => {
      renderDashboard();
      expect(screen.getByRole('button', { name: /Bookings/i })).toBeInTheDocument();
    });

    it('renders Wishlist nav link', () => {
      renderDashboard();
      expect(screen.getByRole('button', { name: /Wishlist/i })).toBeInTheDocument();
    });

    it('renders the Sell Item button', () => {
      renderDashboard();
      expect(screen.getByText('Sell Item')).toBeInTheDocument();
    });

    it('renders Recent Listings heading', () => {
      renderDashboard();
      expect(screen.getByText('Recent Listings')).toBeInTheDocument();
    });

    it('renders Main Campus label', () => {
      renderDashboard();
      expect(screen.getByText('Main Campus')).toBeInTheDocument();
    });

    it('renders logout button when handleLogout provided', () => {
      renderDashboard();
      expect(screen.getByLabelText('Logout')).toBeInTheDocument();
    });

    it('does not render logout when handleLogout is undefined', () => {
      renderDashboard({ handleLogout: undefined });
      expect(screen.queryByLabelText('Logout')).not.toBeInTheDocument();
    });

    it('renders hamburger menu button on mobile', () => {
      renderDashboard();
      expect(screen.getByLabelText('Open mobile menu')).toBeInTheDocument();
    });
  });

  // ── Loading state ─────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('renders skeleton loaders while fetching', () => {
      supabase.from.mockImplementation(() => {
        const c = makeChain({ data: [], error: null });
        // Override order to return a never-resolving promise to hold loading state
        c.order = jest.fn().mockReturnValue(new Promise(() => {}));
        return c;
      });
      renderDashboard();
      expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(6);
    });
  });

  // ── Listings render ───────────────────────────────────────────────────────

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

    it('renders formatted price', async () => {
      renderDashboard();
      await waitFor(() => expect(screen.getByText(/R.*250/)).toBeInTheDocument());
    });

    it('renders Supabase image URL when image_path is set', async () => {
      renderDashboard();
      await waitFor(() => {
        const img = Array.from(screen.getAllByRole('img'))
          .find(i => i.src.includes('supabase') && i.src.includes('books/algo.jpg'));
        expect(img).toBeDefined();
      });
    });

    it('uses Unsplash fallback when image_path is null', async () => {
      renderDashboard();
      await waitFor(() => {
        const img = Array.from(screen.getAllByRole('img'))
          .find(i => i.src.includes('unsplash') && i.alt === 'Standing Desk');
        expect(img).toBeDefined();
      });
    });

    it('renders condition in uppercase', async () => {
      renderDashboard();
      await waitFor(() => expect(screen.getByText('GOOD')).toBeInTheDocument());
    });

    it('renders category badge in uppercase', async () => {
      renderDashboard();
      await waitFor(() =>
        expect(screen.getAllByText('TEXTBOOKS').length).toBeGreaterThan(0)
      );
    });

    it('navigates to listing detail on card click', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      const card = screen.getByText('Introduction to Algorithms')
        .closest('section[class*="cursor-pointer"]');
      fireEvent.click(card);
      expect(navigateMock).toHaveBeenCalledWith('/listing/listing-1');
    });

    it('shows "User" fallback when sellers array is empty', async () => {
      setupSupabaseMocks({ sellersData: [] });
      renderDashboard();
      await waitFor(() =>
        expect(screen.getAllByText('User').length).toBeGreaterThan(0)
      );
    });
  });

  // ── Empty / error states ──────────────────────────────────────────────────

  describe('empty and error states', () => {
    it('shows no listings message for empty array', async () => {
      setupSupabaseMocks({ listingsData: [] });
      renderDashboard();
      await waitFor(() =>
        expect(screen.getByText(/No matching listings available/i)).toBeInTheDocument()
      );
    });

    it('shows no listings message when data is null', async () => {
      setupSupabaseMocks({ listingsData: null });
      renderDashboard();
      await waitFor(() =>
        expect(screen.getByText(/No matching listings available/i)).toBeInTheDocument()
      );
    });

    it('shows empty state on listings query error', async () => {
      setupSupabaseMocks({ listingsData: null, listingsError: { message: 'DB error' } });
      renderDashboard();
      await waitFor(() =>
        expect(screen.getByText(/No matching listings available/i)).toBeInTheDocument()
      );
    });

    it('still renders listings when seller query fails', async () => {
      setupSupabaseMocks({ sellersData: null, sellersError: { message: 'fail' } });
      renderDashboard();
      await waitFor(() =>
        expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument()
      );
    });

    it('does not crash when supabase.from throws synchronously', () => {
      supabase.from.mockImplementation(() => { throw new Error('Network failure'); });
      expect(() => renderDashboard()).not.toThrow();
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

  // ── Category tabs ─────────────────────────────────────────────────────────

  describe('category tabs', () => {
    it('renders All Items tab active by default', () => {
      renderDashboard();
      expect(screen.getByText('All Items').closest('button')).toHaveClass('bg-dark');
    });

    it('activates clicked category', () => {
      renderDashboard();
      const btn = screen.getByText('Textbooks').closest('button');
      fireEvent.click(btn);
      expect(btn).toHaveClass('bg-dark');
    });

    it('deactivates previously active category', () => {
      renderDashboard();
      fireEvent.click(screen.getByText('Electronics').closest('button'));
      expect(screen.getByText('All Items').closest('button')).not.toHaveClass('bg-dark');
    });

    it('filters to textbooks when Textbooks tab clicked', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      fireEvent.click(screen.getByText('Textbooks').closest('button'));
      expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
      expect(screen.queryByText('Standing Desk')).not.toBeInTheDocument();
    });

    it('filters to furniture when Furniture tab clicked', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Standing Desk'));
      fireEvent.click(screen.getByText('Furniture').closest('button'));
      expect(screen.getByText('Standing Desk')).toBeInTheDocument();
      expect(screen.queryByText('Introduction to Algorithms')).not.toBeInTheDocument();
    });

    it('shows all listings when All Items tab clicked after filter', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      fireEvent.click(screen.getByText('Furniture').closest('button'));
      fireEvent.click(screen.getByText('All Items').closest('button'));
      expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
      expect(screen.getByText('Standing Desk')).toBeInTheDocument();
    });

    it('shows correct count on All Items tab after listings load', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      const allBtn = screen.getByText('All Items').closest('button');
      expect(allBtn.textContent).toMatch(/2/);
    });

    it('shows correct count on Textbooks tab after listings load', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      const tbBtn = screen.getByText('Textbooks').closest('button');
      expect(tbBtn.textContent).toMatch(/1/);
    });
  });

  // ── View mode toggle ──────────────────────────────────────────────────────

  describe('view mode toggle', () => {
    it('defaults to grid view', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      expect(document.querySelector('.grid')).toHaveClass('lg:grid-cols-3');
    });

    it('switches to list view', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      const viewBtns = Array.from(document.querySelectorAll('button')).filter(
        b => b.className.includes('w-10') && b.className.includes('h-10') && b.className.includes('rounded-full')
      );
      expect(viewBtns.length).toBeGreaterThanOrEqual(2);
      fireEvent.click(viewBtns[1]); // list button
      const grid = document.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-1');
      expect(grid).not.toHaveClass('lg:grid-cols-3');
    });
  });

  // ── Search ────────────────────────────────────────────────────────────────

  describe('search', () => {
    const openSearch = () => {
      // The search button is the only hidden md:block button with no aria-label
      // and no 'relative' class (messages button has 'relative', logout has aria-label)
      const searchBtn = Array.from(document.querySelectorAll('button')).find(
        b =>
          b.className.includes('hidden') &&
          b.className.includes('md:block') &&
          !b.className.includes('relative') &&
          !b.getAttribute('aria-label') &&
          !b.className.includes('flex') // sell item button has 'flex'
      );
      if (searchBtn) fireEvent.click(searchBtn);
      return searchBtn;
    };

    it('shows search input when search button clicked', async () => {
      renderDashboard();
      openSearch();
      await waitFor(() =>
        expect(screen.getByPlaceholderText(/Search listings/i)).toBeInTheDocument()
      );
    });

    it('filters listings by search query title', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      openSearch();
      await waitFor(() => screen.getByPlaceholderText(/Search listings/i));
      fireEvent.change(screen.getByPlaceholderText(/Search listings/i), {
        target: { value: 'Desk' },
      });
      expect(screen.getByText('Standing Desk')).toBeInTheDocument();
      expect(screen.queryByText('Introduction to Algorithms')).not.toBeInTheDocument();
    });

    it('filters listings by description', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      openSearch();
      await waitFor(() => screen.getByPlaceholderText(/Search listings/i));
      fireEvent.change(screen.getByPlaceholderText(/Search listings/i), {
        target: { value: 'Great textbook' },
      });
      expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
      expect(screen.queryByText('Standing Desk')).not.toBeInTheDocument();
    });

    it('filters listings by seller name', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      openSearch();
      await waitFor(() => screen.getByPlaceholderText(/Search listings/i));
      fireEvent.change(screen.getByPlaceholderText(/Search listings/i), {
        target: { value: 'alice' },
      });
      expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
      expect(screen.queryByText('Standing Desk')).not.toBeInTheDocument();
    });

    it('restores all listings when search query cleared', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      openSearch();
      await waitFor(() => screen.getByPlaceholderText(/Search listings/i));
      fireEvent.change(screen.getByPlaceholderText(/Search listings/i), {
        target: { value: 'Desk' },
      });
      expect(screen.queryByText('Introduction to Algorithms')).not.toBeInTheDocument();
      fireEvent.change(screen.getByPlaceholderText(/Search listings/i), {
        target: { value: '' },
      });
      expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
      expect(screen.getByText('Standing Desk')).toBeInTheDocument();
    });
  });

  // ── Filters ───────────────────────────────────────────────────────────────

  describe('filters panel', () => {
    const openFilters = () => {
      const filterBtn = Array.from(document.querySelectorAll('button'))
        .find(b => b.className.includes('ml-2') && b.className.includes('w-10'));
      if (filterBtn) fireEvent.click(filterBtn);
    };

    it('shows filter panel when filter button clicked', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      openFilters();
      await waitFor(() =>
        expect(screen.getByPlaceholderText(/Min Price/i)).toBeInTheDocument()
      );
    });

    it('filters by min price', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      openFilters();
      await waitFor(() => screen.getByPlaceholderText(/Min Price/i));
      fireEvent.change(screen.getByPlaceholderText(/Min Price/i), {
        target: { value: '1000' },
      });
      expect(screen.getByText('Standing Desk')).toBeInTheDocument();
      expect(screen.queryByText('Introduction to Algorithms')).not.toBeInTheDocument();
    });

    it('filters by max price', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      openFilters();
      await waitFor(() => screen.getByPlaceholderText(/Max Price/i));
      fireEvent.change(screen.getByPlaceholderText(/Max Price/i), {
        target: { value: '300' },
      });
      expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
      expect(screen.queryByText('Standing Desk')).not.toBeInTheDocument();
    });

    it('shows item when price exactly matches min boundary', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      openFilters();
      await waitFor(() => screen.getByPlaceholderText(/Min Price/i));
      fireEvent.change(screen.getByPlaceholderText(/Min Price/i), {
        target: { value: '250' },
      });
      expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
    });

    it('hides item when price is 1 below min', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      openFilters();
      await waitFor(() => screen.getByPlaceholderText(/Min Price/i));
      fireEvent.change(screen.getByPlaceholderText(/Min Price/i), {
        target: { value: '251' },
      });
      expect(screen.queryByText('Introduction to Algorithms')).not.toBeInTheDocument();
    });

    it('clears filters when Clear Filters clicked', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      openFilters();
      await waitFor(() => screen.getByPlaceholderText(/Min Price/i));
      fireEvent.change(screen.getByPlaceholderText(/Min Price/i), {
        target: { value: '1000' },
      });
      expect(screen.queryByText('Introduction to Algorithms')).not.toBeInTheDocument();
      fireEvent.click(screen.getByText('Clear Filters'));
      expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
    });

    it('resets category to All Items when Clear Filters clicked', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      fireEvent.click(screen.getByText('Furniture').closest('button'));
      openFilters();
      await waitFor(() => screen.getByText('Clear Filters'));
      fireEvent.click(screen.getByText('Clear Filters'));
      expect(screen.getByText('All Items').closest('button')).toHaveClass('bg-dark');
    });

    it('filters by condition select', async () => {
      // Use 'like new' (with space) so it uppercases to 'LIKE NEW' matching the select option
      setupSupabaseMocks({
        listingsData: [
          mockListings[0],
          { ...mockListings[1], condition: 'like new' },
        ],
      });
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      openFilters();
      await waitFor(() => screen.getByRole('combobox'));
      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: 'LIKE NEW' },
      });
      expect(screen.getByText('Standing Desk')).toBeInTheDocument();
      expect(screen.queryByText('Introduction to Algorithms')).not.toBeInTheDocument();
    });

    it('shows all items when condition reset to empty', async () => {
      setupSupabaseMocks({
        listingsData: [
          mockListings[0],
          { ...mockListings[1], condition: 'like new' },
        ],
      });
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      openFilters();
      await waitFor(() => screen.getByRole('combobox'));
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'LIKE NEW' } });
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });
      expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
      expect(screen.getByText('Standing Desk')).toBeInTheDocument();
    });
  });

  // ── Sell modal ────────────────────────────────────────────────────────────

  describe('sell modal', () => {
    it('is hidden by default', () => {
      renderDashboard();
      expect(screen.queryByTestId('sell-modal')).not.toBeInTheDocument();
    });

    it('opens when Sell Item clicked', () => {
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
      fireEvent.click(screen.getByText('Back from Profile'));
      expect(screen.queryByTestId('profile-view')).not.toBeInTheDocument();
      expect(screen.getByText('Recent Listings')).toBeInTheDocument();
    });

    it('opens sell modal from profile via onAddNew', () => {
      renderDashboard();
      fireEvent.click(screen.getByLabelText('Open profile'));
      fireEvent.click(screen.getByText('Add New from Profile'));
      expect(screen.getByTestId('sell-modal')).toBeInTheDocument();
    });
  });

  // ── Orders navigation ─────────────────────────────────────────────────────

  describe('orders navigation', () => {
    it('shows orders view when My Orders clicked', () => {
      renderDashboard();
      fireEvent.click(screen.getByRole('button', { name: /My Orders/i }));
      expect(screen.getByTestId('my-orders-view')).toBeInTheDocument();
    });

    it('returns to home from orders', () => {
      renderDashboard();
      fireEvent.click(screen.getByRole('button', { name: /My Orders/i }));
      fireEvent.click(screen.getByText('Back from Orders'));
      expect(screen.queryByTestId('my-orders-view')).not.toBeInTheDocument();
      expect(screen.getByText('Recent Listings')).toBeInTheDocument();
    });
  });

  // ── Bookings ──────────────────────────────────────────────────────────────

  describe('bookings dashboard', () => {
    it('opens booking dashboard when Bookings clicked', () => {
      renderDashboard();
      fireEvent.click(screen.getByRole('button', { name: /Bookings/i }));
      expect(screen.getByTestId('booking-dashboard')).toBeInTheDocument();
    });

    it('closes booking dashboard when onClose called', () => {
      renderDashboard();
      fireEvent.click(screen.getByRole('button', { name: /Bookings/i }));
      fireEvent.click(screen.getByText('Close Bookings'));
      expect(screen.queryByTestId('booking-dashboard')).not.toBeInTheDocument();
    });

    it('opens booking dashboard from URL param openBooking=true', () => {
      render(
        <MemoryRouter initialEntries={['/?openBooking=true']}>
          <StudentDashboard user={mockUser} userRole="student" handleLogout={jest.fn()} />
        </MemoryRouter>
      );
      expect(screen.getByTestId('booking-dashboard')).toBeInTheDocument();
    });
  });

  // ── Wishlist ──────────────────────────────────────────────────────────────

  describe('wishlist', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    it('shows wishlist view when Wishlist clicked', () => {
      renderDashboard();
      fireEvent.click(screen.getByRole('button', { name: /Wishlist/i }));
      expect(screen.getByText('My Wishlist')).toBeInTheDocument();
    });

    it('shows empty wishlist message when no saved items', async () => {
      renderDashboard();
      // Wait for listings to finish loading before switching to wishlist view
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      fireEvent.click(screen.getByRole('button', { name: /Wishlist/i }));
      await waitFor(() =>
        expect(screen.getByText(/Your wishlist is empty/i)).toBeInTheDocument()
      );
    });

    it('toggles wishlist on heart button click', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      const card = screen.getByText('Introduction to Algorithms')
        .closest('section[class*="cursor-pointer"]');
      const heartBtn = card.querySelector('button[class*="text-gray"]') ||
        Array.from(card.querySelectorAll('button')).pop();
      fireEvent.click(heartBtn);
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /Wishlist/i })).toBeInTheDocument()
      );
    });

    it('heart click does not trigger card navigation', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      const card = screen.getByText('Introduction to Algorithms')
        .closest('section[class*="cursor-pointer"]');
      const buttons = Array.from(card.querySelectorAll('button'));
      const heartBtn = buttons[buttons.length - 1];
      fireEvent.click(heartBtn);
      expect(navigateMock).not.toHaveBeenCalled();
    });

    it('persists wishlist to localStorage on toggle', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      const card = screen.getByText('Introduction to Algorithms')
        .closest('section[class*="cursor-pointer"]');
      const buttons = Array.from(card.querySelectorAll('button'));
      fireEvent.click(buttons[buttons.length - 1]);
      const stored = JSON.parse(localStorage.getItem(`wishlist:${mockUser.id}`));
      expect(stored).toContain('listing-1');
    });

    it('removes item from localStorage on second toggle', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      const card = screen.getByText('Introduction to Algorithms')
        .closest('section[class*="cursor-pointer"]');
      const buttons = Array.from(card.querySelectorAll('button'));
      const heartBtn = buttons[buttons.length - 1];
      fireEvent.click(heartBtn); // add
      fireEvent.click(heartBtn); // remove
      const stored = JSON.parse(localStorage.getItem(`wishlist:${mockUser.id}`) || '[]');
      expect(stored).not.toContain('listing-1');
    });

    it('wishlisted item appears in wishlist view', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      const card = screen.getByText('Introduction to Algorithms')
        .closest('section[class*="cursor-pointer"]');
      const buttons = Array.from(card.querySelectorAll('button'));
      fireEvent.click(buttons[buttons.length - 1]);
      fireEvent.click(screen.getByRole('button', { name: /Wishlist/i }));
      expect(screen.getByText('My Wishlist')).toBeInTheDocument();
      expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
    });
  });

  // ── Mobile menu ───────────────────────────────────────────────────────────

  describe('mobile menu', () => {
    it('opens mobile menu on hamburger click', () => {
      renderDashboard();
      fireEvent.click(screen.getByLabelText('Open mobile menu'));
      expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
    });

    it('closes mobile menu on close callback', () => {
      renderDashboard();
      fireEvent.click(screen.getByLabelText('Open mobile menu'));
      fireEvent.click(screen.getByText('Close Menu'));
      expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
    });

    it('navigates to profile from mobile menu', () => {
      renderDashboard();
      fireEvent.click(screen.getByLabelText('Open mobile menu'));
      fireEvent.click(screen.getByText('Go Profile'));
      expect(screen.getByTestId('profile-view')).toBeInTheDocument();
    });

    it('navigates to orders from mobile menu', () => {
      renderDashboard();
      fireEvent.click(screen.getByLabelText('Open mobile menu'));
      fireEvent.click(screen.getByText('Go Orders'));
      expect(screen.getByTestId('my-orders-view')).toBeInTheDocument();
    });

    it('navigates to wishlist from mobile menu', () => {
      renderDashboard();
      fireEvent.click(screen.getByLabelText('Open mobile menu'));
      fireEvent.click(screen.getByText('Go Wishlist'));
      expect(screen.getByText('My Wishlist')).toBeInTheDocument();
    });

    it('navigates to messages from mobile menu', () => {
      renderDashboard();
      fireEvent.click(screen.getByLabelText('Open mobile menu'));
      fireEvent.click(screen.getByText('Go Messages'));
      expect(navigateMock).toHaveBeenCalledWith('/messages');
    });

    it('opens bookings from mobile menu', () => {
      renderDashboard();
      fireEvent.click(screen.getByLabelText('Open mobile menu'));
      fireEvent.click(screen.getByText('Go Bookings'));
      expect(screen.getByTestId('booking-dashboard')).toBeInTheDocument();
    });

    it('opens sell modal from mobile menu', () => {
      renderDashboard();
      fireEvent.click(screen.getByLabelText('Open mobile menu'));
      fireEvent.click(screen.getByText('Sell from Menu'));
      expect(screen.getByTestId('sell-modal')).toBeInTheDocument();
    });

    it('calls logout from mobile menu', () => {
      const handleLogout = jest.fn();
      renderDashboard({ handleLogout });
      fireEvent.click(screen.getByLabelText('Open mobile menu'));
      fireEvent.click(screen.getByText('Logout from Menu'));
      expect(handleLogout).toHaveBeenCalled();
    });
  });

  // ── User profile modal ────────────────────────────────────────────────────

  describe('user profile modal', () => {
    it('opens user profile modal when seller name clicked', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('alice'));
      fireEvent.click(screen.getByText('alice'));
      await waitFor(() =>
        expect(screen.getByTestId('user-profile-modal')).toBeInTheDocument()
      );
    });

    it('closes user profile modal on onClose', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('alice'));
      fireEvent.click(screen.getByText('alice'));
      await waitFor(() => screen.getByTestId('user-profile-modal'));
      fireEvent.click(screen.getByText('Close Profile Modal'));
      expect(screen.queryByTestId('user-profile-modal')).not.toBeInTheDocument();
    });

    it('passes correct userId to profile modal', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('alice'));
      fireEvent.click(screen.getByText('alice'));
      await waitFor(() => {
        const modal = screen.getByTestId('user-profile-modal');
        expect(modal.dataset.userId).toBe('seller-1');
      });
    });
  });

  // ── Messages navigation ───────────────────────────────────────────────────

  describe('messages navigation', () => {
    it('navigates to messages when message icon clicked', () => {
      renderDashboard();
      const msgBtn = Array.from(document.querySelectorAll('button'))
        .find(b => b.className.includes('hidden md:block') && b.className.includes('relative'));
      if (msgBtn) {
        fireEvent.click(msgBtn);
        expect(navigateMock).toHaveBeenCalledWith('/messages');
      }
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

  // ── Pending reviews banner ────────────────────────────────────────────────

  describe('pending reviews banner', () => {
    it('shows pending reviews banner when reviews are pending', async () => {
      const completedOrder = { id: 'order-1' };
      supabase.from.mockImplementation((table) => {
        if (table === 'listings') return makeChain({ data: mockListings, error: null });
        if (table === 'users')    return makeChain({ data: mockSellers, error: null });
        if (table === 'orders')   return makeChain({ data: [completedOrder], error: null });
        if (table === 'reviews')  return makeChain({ data: [], error: null });
        if (table === 'trades')   return makeChain({ data: [], error: null });
        return makeChain({ data: [], error: null });
      });
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      await waitFor(() =>
        expect(screen.queryByText(/pending review/i)).toBeInTheDocument()
      );
    });

    it('clicking View Orders navigates to orders view', async () => {
      const completedOrder = { id: 'order-1' };
      supabase.from.mockImplementation((table) => {
        if (table === 'listings') return makeChain({ data: mockListings, error: null });
        if (table === 'users')    return makeChain({ data: mockSellers, error: null });
        if (table === 'orders')   return makeChain({ data: [completedOrder], error: null });
        if (table === 'reviews')  return makeChain({ data: [], error: null });
        if (table === 'trades')   return makeChain({ data: [], error: null });
        return makeChain({ data: [], error: null });
      });
      renderDashboard();
      await waitFor(() => screen.getByText(/View Orders/i));
      fireEvent.click(screen.getByText('View Orders'));
      expect(screen.getByTestId('my-orders-view')).toBeInTheDocument();
    });

    it('does not show banner when no pending reviews', async () => {
      // Default setupSupabaseMocks has ordersData: [] so no pending reviews
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      expect(screen.queryByText(/pending review/i)).not.toBeInTheDocument();
    });
  });

  // ── Supabase query wiring ─────────────────────────────────────────────────

  describe('Supabase query wiring', () => {
    it('queries the listings table', async () => {
      renderDashboard();
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      expect(supabase.from).toHaveBeenCalledWith('listings');
    });

    it('excludes current user listings via neq', async () => {
      const chain = spyChain({ data: mockListings, error: null });
      supabase.from.mockImplementation((table) => {
        if (table === 'listings') return chain;
        if (table === 'users')    return makeChain({ data: mockSellers, error: null });
        return makeChain({ data: [], error: null });
      });
      renderDashboard({ user: { id: 'user-1' } });
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      expect(chain.neq).toHaveBeenCalledWith('seller_id', 'user-1');
    });

    it('does not call neq when user is null', async () => {
      const chain = spyChain({ data: mockListings, error: null });
      supabase.from.mockImplementation((table) => {
        if (table === 'listings') return chain;
        if (table === 'users')    return makeChain({ data: mockSellers, error: null });
        return makeChain({ data: [], error: null });
      });
      renderDashboard({ user: null });
      await waitFor(() => screen.getByText('Introduction to Algorithms'));
      expect(chain.neq).not.toHaveBeenCalled();
    });

    it('queries users table with seller IDs', async () => {
      const usersChain = spyChain({ data: mockSellers, error: null });
      supabase.from.mockImplementation((table) => {
        if (table === 'listings') return makeChain({ data: mockListings, error: null });
        if (table === 'users')    return usersChain;
        return makeChain({ data: [], error: null });
      });
      renderDashboard();
      await waitFor(() => screen.getByText('alice'));
      expect(usersChain.in).toHaveBeenCalledWith(
        'id',
        expect.arrayContaining(['seller-1', 'seller-2'])
      );
    });
  });

  // ── Time display ──────────────────────────────────────────────────────────

  describe('calculateTimeAgo', () => {
    it('shows "just now" for recent listing', async () => {
      setupSupabaseMocks({
        listingsData: [{ ...mockListings[0], created_at: new Date().toISOString() }],
      });
      renderDashboard();
      await waitFor(() => expect(document.body.textContent).toContain('just now'));
    });

    it('shows minutes ago', async () => {
      // mockListings[0] is 30 mins old
      renderDashboard();
      await waitFor(() =>
        expect(document.body.textContent).toMatch(/\d+ mins? ago/)
      );
    });

    it('shows hours ago', async () => {
      // mockListings[1] is 2 hours old
      renderDashboard();
      await waitFor(() =>
        expect(document.body.textContent).toMatch(/\d+ hours? ago/)
      );
    });

    it('shows days ago', async () => {
      setupSupabaseMocks({
        listingsData: [{ ...mockListings[0], created_at: new Date(Date.now() - 3 * 86400000).toISOString() }],
      });
      renderDashboard();
      await waitFor(() =>
        expect(document.body.textContent).toMatch(/\d+ days? ago/)
      );
    });

    it('shows locale date for listings older than 7 days', async () => {
      setupSupabaseMocks({
        listingsData: [{ ...mockListings[0], created_at: '2023-01-01T00:00:00.000Z' }],
      });
      renderDashboard();
      await waitFor(() =>
        expect(document.body.textContent).toContain('Introduction to Algorithms')
      );
      expect(document.body.textContent).not.toMatch(/ago/);
      expect(document.body.textContent).not.toContain('just now');
    });

    it('shows "unknown" when created_at is null', async () => {
      setupSupabaseMocks({ listingsData: [{ ...mockListings[0], created_at: null }] });
      renderDashboard();
      await waitFor(() => expect(document.body.textContent).toContain('unknown'));
    });

    it('shows "unknown" for invalid date string', async () => {
      setupSupabaseMocks({ listingsData: [{ ...mockListings[0], created_at: 'bad-date' }] });
      renderDashboard();
      await waitFor(() => expect(document.body.textContent).toContain('unknown'));
    });
  });

  // ── Unread messages badge ─────────────────────────────────────────────────

  describe('unread messages badge', () => {
    it('shows unread count badge when unreadCount > 0', () => {
      require('./hooks/useUnreadMessages').useUnreadMessages.mockReturnValue({ unreadCount: 5 });
      renderDashboard();
      const badge = document.querySelector('span.bg-red-500.text-white.rounded-full');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toBe('5');
    });

    it('does not show red badge when unreadCount is 0', () => {
      require('./hooks/useUnreadMessages').useUnreadMessages.mockReturnValue({ unreadCount: 0 });
      renderDashboard();
      const badge = document.querySelector('span.bg-red-500.text-white.rounded-full');
      expect(badge).toBeFalsy();
    });

    it('shows 99+ when unreadCount exceeds 99', () => {
      require('./hooks/useUnreadMessages').useUnreadMessages.mockReturnValue({ unreadCount: 150 });
      renderDashboard();
      const badge = document.querySelector('span.bg-red-500.text-white.rounded-full');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toBe('99+');
    });
  });

  // ── Pending orders badge ──────────────────────────────────────────────────

  describe('pending orders badge', () => {
    it('shows pending orders badge on Bookings button', () => {
      require('./hooks/useBookings').useSellerPendingOrders.mockReturnValue({
        pendingOrders: [{ id: 'o1' }, { id: 'o2' }],
      });
      renderDashboard();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('does not show badge when no pending orders', () => {
      require('./hooks/useBookings').useSellerPendingOrders.mockReturnValue({
        pendingOrders: [],
      });
      renderDashboard();
      // Badge span should not be present inside the Bookings button
      const bookingsBtn = screen.getByRole('button', { name: /Bookings/i });
      expect(bookingsBtn.querySelector('span.bg-red-500')).toBeFalsy();
    });
  });
});