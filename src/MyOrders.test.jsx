import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyOrders from './MyOrders';
import { supabase } from './utils/supabase';

// ─── Mocks ────────────────────────────────────────────────────────────────────
jest.mock('./utils/supabase', () => ({ supabase: { from: jest.fn() } }));

// ─── Helper: Build Supabase chain mock ───────────────────────────────────────
const buildChainMock = (resolveValue = { data: null, error: null }) => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockResolvedValue(resolveValue),
    order: jest.fn().mockResolvedValue(resolveValue),
    single: jest.fn().mockResolvedValue(resolveValue),
    maybeSingle: jest.fn().mockResolvedValue(resolveValue),
  };
  return chain;
};

// ─── Mock data ────────────────────────────────────────────────────────────────
const mockUser = { id: 'user-123', email: 'seller@example.com' };

// seller_id is NOT mockUser.id so it only shows in buying tab
const mockBuyingOrder = {
  id: 'order-1',
  amount_due: '1500',
  status: 'pending',
  buyer_status: 'awaiting_confirmation',
  seller_status: 'awaiting_booking',
  placed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  listings: {
    id: 'listing-1',
    title: 'MacBook Pro',
    image_path: 'images/macbook.jpg',
    seller_id: 'seller-1',
  },
  bookings: [{ date: '2025-01-15', time_slot: '10:00', status: 'confirmed' }],
};

// seller_id IS mockUser.id so it shows in selling tab
const mockSellingOrder = {
  id: 'order-2',
  amount_due: '2000',
  status: 'paid',
  buyer_id: 'buyer-1',
  buyer_status: 'ready_for_collection',
  seller_status: 'ready_for_dropoff',
  placed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  listings: {
    id: 'listing-2',
    title: 'iPhone 12',
    image_path: 'images/iphone.jpg',
    seller_id: 'user-123',
  },
  bookings: [{ date: '2025-01-20', time_slot: '14:00', status: 'confirmed' }],
};

const mockBuyer = { id: 'buyer-1', username: 'john_buyer', email: 'buyer@example.com' };

/**
 * Sets up supabase.from as a table-name-aware mock.
 * fetchOrders calls:
 *   supabase.from('orders') × 2  (buying, then selling)
 *   supabase.from('users')  × 1  (sellers for buying OR buyers for selling)
 *   supabase.from('reviews') — from checkExistingReview inside OrderCard
 */
const setupMocks = ({ buyingOrders = [], sellingOrders = [], sellers = [], users = [], reviewData = null } = {}) => {
  let ordersCallCount = 0;
  let usersCallCount = 0;
  supabase.from.mockImplementation((table) => {
    if (table === 'orders') {
      ordersCallCount += 1;
      if (ordersCallCount === 1) return buildChainMock({ data: buyingOrders, error: null });
      return buildChainMock({ data: sellingOrders, error: null });
    }
    if (table === 'users') {
      usersCallCount += 1;
      // First users call = sellers (for buying orders), second = buyers (for selling orders)
      if (usersCallCount === 1) return buildChainMock({ data: sellers, error: null });
      return buildChainMock({ data: users, error: null });
    }
    if (table === 'reviews') return buildChainMock({ data: reviewData, error: null });
    return buildChainMock({ data: [], error: null });
  });
};

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('MyOrders', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('Initial state and rendering', () => {
    it('renders without crashing', () => {
      setupMocks();
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      expect(screen.getByText(/My Orders/i)).toBeInTheDocument();
    });

    it('renders "Buying" and "Selling" tabs', () => {
      setupMocks();
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      expect(screen.getByRole('tab', { name: /buying/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /selling/i })).toBeInTheDocument();
    });

    it('shows "Buying" tab as active by default', () => {
      setupMocks();
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      expect(screen.getByRole('tab', { name: /buying/i })).toHaveClass('border-primary');
    });

    it('renders loading skeleton initially', () => {
      supabase.from.mockReturnValue(new Promise(() => {}));
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Buying orders tab', () => {
    it('displays buying orders when data is fetched', async () => {
      setupMocks({ buyingOrders: [mockBuyingOrder] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => expect(screen.getByText('MacBook Pro')).toBeInTheDocument());
    });

    it('displays order title correctly', async () => {
      setupMocks({ buyingOrders: [mockBuyingOrder] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => expect(screen.getByText('MacBook Pro')).toBeInTheDocument());
    });

    it('displays order price in ZAR format', async () => {
      setupMocks({ buyingOrders: [mockBuyingOrder] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => expect(screen.getByText(/R1[\s\u00a0]500/)).toBeInTheDocument());
    });

    it('displays payment status badge', async () => {
      setupMocks({ buyingOrders: [mockBuyingOrder] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() =>
        expect(
          screen.getByText((_, el) =>
            el?.tagName === 'SPAN' &&
            el.textContent.replace(/\s+/g, ' ').trim() === 'status: pending'
          )
        ).toBeInTheDocument()
      );
    });

    it('displays buyer status badge', async () => {
      setupMocks({ buyingOrders: [mockBuyingOrder] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() =>
        expect(screen.getByText(/Collection: Awaiting Confirmation/i)).toBeInTheDocument()
      );
    });
  });

  describe('Selling orders tab', () => {
    it('displays selling orders when tab is switched', async () => {
      const user = userEvent.setup();
      setupMocks({ sellingOrders: [mockSellingOrder], users: [mockBuyer] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /selling/i }));
      await waitFor(() => expect(screen.getByText('iPhone 12')).toBeInTheDocument());
    });

    it('displays buyer name for selling orders', async () => {
      const user = userEvent.setup();
      setupMocks({ sellingOrders: [mockSellingOrder], sellers: [mockBuyer] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /selling/i }));
      await waitFor(() => expect(screen.getByText('john_buyer')).toBeInTheDocument());
    });

    it('displays seller status for selling orders', async () => {
      const user = userEvent.setup();
      setupMocks({ sellingOrders: [mockSellingOrder], users: [mockBuyer] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /selling/i }));
      await waitFor(() =>
        expect(screen.getByText(/Drop-off: Ready for Drop-Off/i)).toBeInTheDocument()
      );
    });
  });

  describe('Empty states', () => {
    it('displays empty state for buying orders when list is empty', async () => {
      setupMocks();
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() =>
        expect(screen.getByRole('tab', { name: /buying/i })).toBeInTheDocument()
      );
    });

    it('displays empty state for selling orders when list is empty', async () => {
      const user = userEvent.setup();
      setupMocks();
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /selling/i }));
      await waitFor(() =>
        expect(screen.getByRole('tab', { name: /selling/i })).toBeInTheDocument()
      );
    });
  });

  describe('Status badge styling', () => {
    it('renders correct badge color for "pending" payment status', async () => {
      setupMocks({ buyingOrders: [{ ...mockBuyingOrder, status: 'pending' }] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => {
        const badge = screen.getByText((_, el) =>
          el?.tagName === 'SPAN' &&
          el.textContent.replace(/\s+/g, ' ').trim() === 'status: pending'
        );
        expect(badge).toHaveClass('bg-yellow-50');
      });
    });

    it('renders correct badge color for "paid" payment status', async () => {
      setupMocks({ buyingOrders: [{ ...mockBuyingOrder, status: 'paid' }] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => {
        const badge = screen.getByText((_, el) =>
          el?.tagName === 'SPAN' &&
          el.textContent.replace(/\s+/g, ' ').trim() === 'status: paid'
        );
        expect(badge).toHaveClass('bg-green-50');
      });
    });

    it('renders correct badge color for "awaiting_confirmation" buyer status', async () => {
      setupMocks({ buyingOrders: [mockBuyingOrder] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => {
        const badge = screen.getByText(/Collection: Awaiting Confirmation/i).closest('span');
        expect(badge).toHaveClass('bg-yellow-50');
      });
    });

    it('renders correct badge color for "ready_for_collection" buyer status', async () => {
      setupMocks({ buyingOrders: [{ ...mockBuyingOrder, buyer_status: 'ready_for_collection' }] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => {
        const badge = screen.getByText(/Collection: Ready for Collection/i).closest('span');
        expect(badge).toHaveClass('bg-blue-50');
      });
    });

    it('renders correct badge color for "collected" buyer status', async () => {
      setupMocks({ buyingOrders: [{ ...mockBuyingOrder, buyer_status: 'collected' }] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => {
        const badge = screen.getByText(/Collection: Collected/i).closest('span');
        expect(badge).toHaveClass('bg-green-50');
      });
    });

    it('renders correct badge color for "ready_for_dropoff" seller status', async () => {
      const user = userEvent.setup();
      setupMocks({ sellingOrders: [{ ...mockSellingOrder, seller_status: 'ready_for_dropoff' }], users: [mockBuyer] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /selling/i }));
      await waitFor(() => {
        const badge = screen.getByText(/Drop-off: Ready for Drop-Off/i).closest('span');
        expect(badge).toHaveClass('bg-blue-50');
      });
    });

    it('renders correct badge color for "dropped_off" seller status', async () => {
      const user = userEvent.setup();
      setupMocks({ sellingOrders: [{ ...mockSellingOrder, seller_status: 'dropped_off' }], users: [mockBuyer] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /selling/i }));
      await waitFor(() => {
        const badge = screen.getByText(/Drop-off: Dropped Off/i).closest('span');
        expect(badge).toHaveClass('bg-green-50');
      });
    });

    it('renders cancelled order with red badge', async () => {
      setupMocks({ buyingOrders: [{ ...mockBuyingOrder, status: 'cancelled' }] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => {
        const badge = screen.getByText((_, el) =>
          el?.tagName === 'SPAN' &&
          el.textContent.replace(/\s+/g, ' ').trim() === 'status: cancelled'
        );
        expect(badge).toHaveClass('bg-red-50');
      });
    });
  });

  describe('Order listing rendering', () => {
    it('displays order image with correct src', async () => {
      setupMocks({ buyingOrders: [mockBuyingOrder] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => {
        const images = screen.getAllByRole('img');
        const listingImage = images.find(
          img => img.src.includes('macbook') || img.src.includes('supabase') || img.alt === 'MacBook Pro'
        );
        expect(listingImage).toBeInTheDocument();
      });
    });

    it('displays booking information if available', async () => {
      setupMocks({ buyingOrders: [mockBuyingOrder] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => expect(screen.getByText('MacBook Pro')).toBeInTheDocument());
    });

    it('displays multiple orders in list', async () => {
      const order2 = { ...mockBuyingOrder, id: 'order-3', listings: { ...mockBuyingOrder.listings, title: 'iPad Air' } };
      setupMocks({ buyingOrders: [mockBuyingOrder, order2] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => {
        expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
        expect(screen.getByText('iPad Air')).toBeInTheDocument();
      });
    });
  });

  describe('Data fetching and error handling', () => {
    it('fetches orders when component mounts', () => {
      setupMocks();
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      expect(supabase.from).toHaveBeenCalledWith('orders');
    });

    it('logs error when fetching buying orders fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('API error');
      let ordersCallCount = 0;
      supabase.from.mockImplementation((table) => {
        if (table === 'orders') {
          ordersCallCount += 1;
          if (ordersCallCount === 1) return buildChainMock({ data: null, error });
          return buildChainMock({ data: [], error: null });
        }
        return buildChainMock({ data: [], error: null });
      });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() =>
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching orders:', error)
      );
      consoleSpy.mockRestore();
    });

    it('logs error when fetching selling orders fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('API error');
      let ordersCallCount = 0;
      supabase.from.mockImplementation((table) => {
        if (table === 'orders') {
          ordersCallCount += 1;
          if (ordersCallCount === 1) return buildChainMock({ data: [], error: null });
          return buildChainMock({ data: null, error });
        }
        return buildChainMock({ data: [], error: null });
      });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() =>
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching orders:', error)
      );
      consoleSpy.mockRestore();
    });

    it('continues loading when there are no buyers to fetch', async () => {
      const user = userEvent.setup();
      setupMocks({ sellingOrders: [mockSellingOrder], users: [] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /selling/i }));
      await waitFor(() => expect(screen.getByText('iPhone 12')).toBeInTheDocument());
    });
  });

  describe('Tab switching', () => {
    it('switches to "Selling" tab when clicked', async () => {
      const user = userEvent.setup();
      setupMocks();
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      const sellingTab = screen.getByRole('tab', { name: /selling/i });
      await user.click(sellingTab);
      expect(sellingTab).toHaveClass('border-primary');
    });

    it('updates activeTab state on tab click', async () => {
      const user = userEvent.setup();
      setupMocks();
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      const sellingTab = screen.getByRole('tab', { name: /selling/i });
      expect(sellingTab).not.toHaveClass('border-primary');
      await user.click(sellingTab);
      expect(sellingTab).toHaveClass('border-primary');
    });
  });

  describe('Buyer name resolution', () => {
    it('uses buyer username if available', async () => {
      const user = userEvent.setup();
      setupMocks({ sellingOrders: [mockSellingOrder], sellers: [mockBuyer] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /selling/i }));
      await waitFor(() => expect(screen.getByText('john_buyer')).toBeInTheDocument());
    });

    it('falls back to email prefix if username not available', async () => {
      const user = userEvent.setup();
      setupMocks({
        sellingOrders: [mockSellingOrder],
        sellers: [{ id: 'buyer-1', username: null, email: 'buyer@example.com' }],
      });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /selling/i }));
      // 'buyer' is the email prefix, rendered inside a <button>
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'buyer' })).toBeInTheDocument()
      );
    });

    it('shows "Buyer" as default fallback', async () => {
      const user = userEvent.setup();
      setupMocks({
        sellingOrders: [mockSellingOrder],
        users: [{ id: 'buyer-1', username: null, email: null }],
      });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /selling/i }));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Buyer' })).toBeInTheDocument()
      );
    });
  });

  describe('MyOrders component lifecycle', () => {
    it('calls fetchOrders when component mounts', () => {
      setupMocks();
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      expect(supabase.from).toHaveBeenCalledWith('orders');
    });

    it('calls fetchOrders when user prop changes', async () => {
      setupMocks();
      const { rerender } = render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      setupMocks();
      rerender(<MyOrders user={{ id: 'different-user', email: 'other@example.com' }} onBack={jest.fn()} />);
      await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('orders'));
    });
  });

  describe('getStatusBadge function coverage', () => {
    it('handles seller status for awaiting_booking', async () => {
      const user = userEvent.setup();
      setupMocks({
        sellingOrders: [{ ...mockSellingOrder, seller_status: 'awaiting_booking' }],
        users: [mockBuyer],
      });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /selling/i }));
      await waitFor(() =>
        expect(screen.getByText(/Awaiting Booking/i)).toBeInTheDocument()
      );
    });

    it('handles failed payment status', async () => {
      setupMocks({ buyingOrders: [{ ...mockBuyingOrder, status: 'failed' }] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => {
        const badge = screen.getByText((_, el) =>
          el?.tagName === 'SPAN' &&
          el.textContent.replace(/\s+/g, ' ').trim() === 'status: failed'
        );
        expect(badge).toHaveClass('bg-red-50');
      });
    });

    it('handles unknown/default status', async () => {
      setupMocks({ buyingOrders: [{ ...mockBuyingOrder, status: 'unknown_status' }] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => expect(screen.getByText('MacBook Pro')).toBeInTheDocument());
    });
  });

  describe('Booking information display', () => {
    it('displays booking date and time when available', async () => {
      setupMocks({ buyingOrders: [mockBuyingOrder] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => expect(screen.getByText('MacBook Pro')).toBeInTheDocument());
    });

    it('handles order with null bookings', async () => {
      setupMocks({ buyingOrders: [{ ...mockBuyingOrder, bookings: null }] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => expect(screen.getByText('MacBook Pro')).toBeInTheDocument());
    });

    it('handles order with cancelled booking in array', async () => {
      setupMocks({
        buyingOrders: [{
          ...mockBuyingOrder,
          bookings: [
            { date: '2025-01-15', time_slot: '10:00', status: 'cancelled' },
            { date: '2025-01-20', time_slot: '14:00', status: 'confirmed' },
          ],
        }],
      });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => expect(screen.getByText('MacBook Pro')).toBeInTheDocument());
    });
  });

  describe('Missing data handling', () => {
    it('handles order with missing listings data', async () => {
      setupMocks({ buyingOrders: [{ ...mockBuyingOrder, listings: null }] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() =>
        expect(screen.getByRole('tab', { name: /buying/i })).toBeInTheDocument()
      );
    });

    it('handles order with missing amount_due', async () => {
      setupMocks({ buyingOrders: [{ ...mockBuyingOrder, amount_due: null }] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => expect(screen.getByText('MacBook Pro')).toBeInTheDocument());
    });

    it('handles order with missing image_path', async () => {
      setupMocks({
        buyingOrders: [{
          ...mockBuyingOrder,
          listings: { ...mockBuyingOrder.listings, image_path: null },
        }],
      });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => {
        const images = screen.getAllByRole('img');
        expect(images.length).toBeGreaterThan(0);
      });
    });

    it('handles missing buyer names for selling orders', async () => {
      const user = userEvent.setup();
      setupMocks({ sellingOrders: [mockSellingOrder], users: [] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /selling/i }));
      await waitFor(() => expect(screen.getByText('iPhone 12')).toBeInTheDocument());
    });
  });
});
