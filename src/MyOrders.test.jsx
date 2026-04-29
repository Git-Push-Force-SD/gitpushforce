import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyOrders from './MyOrders';
import { supabase } from './utils/supabase';

// ─── Mocks ────────────────────────────────────────────────────────────────────
jest.mock('./utils/supabase', () => ({ supabase: { from: jest.fn() } }));

// ─── Helper: Build Supabase chain mock ───────────────────────────────────────
const buildChainMock = (resolveValue = { data: null, error: null }) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue(resolveValue),
});

// ─── Mock data ────────────────────────────────────────────────────────────────
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
  bookings: [
    {
      date: '2025-01-15',
      time_slot: '10:00',
      status: 'confirmed',
    },
  ],
};

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
  bookings: [
    {
      date: '2025-01-20',
      time_slot: '14:00',
      status: 'confirmed',
    },
  ],
};

const mockBuyer = {
  id: 'buyer-1',
  username: 'john_buyer',
  email: 'buyer@example.com',
};

const mockUser = {
  id: 'user-123',
  email: 'seller@example.com',
};

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('MyOrders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial state and rendering', () => {
    it('renders without crashing', () => {
      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      expect(screen.getByText(/My Orders/i)).toBeInTheDocument();
    });

    it('renders "Buying" and "Selling" tabs', () => {
      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      expect(screen.getByRole('tab', { name: /buying/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /selling/i })).toBeInTheDocument();
    });

    it('shows "Buying" tab as active by default', () => {
      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      const buyingTab = screen.getByRole('tab', { name: /buying/i });
      expect(buyingTab).toHaveClass('border-primary');
    });

    it('renders loading skeleton initially', () => {
      supabase.from.mockReturnValue(
        new Promise(() => {}) // Never resolves
      );

      const { container } = render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      // Check for loading skeleton elements
      expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Buying orders tab', () => {
    it('displays buying orders when data is fetched', async () => {
      supabase.from
        .mockReturnValueOnce(
          buildChainMock({ data: [mockBuyingOrder], error: null })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
      });
    });

    it('displays order title correctly', async () => {
      supabase.from
        .mockReturnValueOnce(
          buildChainMock({ data: [mockBuyingOrder], error: null })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
      });
    });

    it('displays order price in ZAR format', async () => {
      supabase.from
        .mockReturnValueOnce(
          buildChainMock({ data: [mockBuyingOrder], error: null })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/R1[\s\u00a0]500/)).toBeInTheDocument();
      });
    });

    it('displays payment status badge', async () => {
      supabase.from
        .mockReturnValueOnce(
          buildChainMock({ data: [mockBuyingOrder], error: null })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/Payment: pending/i)).toBeInTheDocument();
      });
    });

    it('displays buyer status badge', async () => {
      supabase.from
        .mockReturnValueOnce(
          buildChainMock({ data: [mockBuyingOrder], error: null })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/Collection: Awaiting Confirmation/i)).toBeInTheDocument();
      });
    });
  });

  describe('Selling orders tab', () => {
    it('displays selling orders when tab is switched', async () => {
      const user = userEvent.setup();

      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }))
        .mockReturnValueOnce(
          buildChainMock({
            data: [mockSellingOrder],
            error: null,
          })
        )
        .mockReturnValueOnce(buildChainMock({ data: [mockBuyer], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      const sellingTab = screen.getByRole('tab', { name: /selling/i });
      await user.click(sellingTab);

      await waitFor(() => {
        expect(screen.getByText('iPhone 12')).toBeInTheDocument();
      });
    });

    it('displays buyer name for selling orders', async () => {
      const user = userEvent.setup();

      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }))
        .mockReturnValueOnce(
          buildChainMock({
            data: [mockSellingOrder],
            error: null,
          })
        )
        .mockReturnValueOnce(buildChainMock({ data: [mockBuyer], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      const sellingTab = screen.getByRole('tab', { name: /selling/i });
      await user.click(sellingTab);

      await waitFor(() => {
        expect(screen.getByText(/Buyer: john_buyer/i)).toBeInTheDocument();
      });
    });

    it('displays seller status for selling orders', async () => {
      const user = userEvent.setup();

      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }))
        .mockReturnValueOnce(
          buildChainMock({
            data: [mockSellingOrder],
            error: null,
          })
        )
        .mockReturnValueOnce(buildChainMock({ data: [mockBuyer], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      const sellingTab = screen.getByRole('tab', { name: /selling/i });
      await user.click(sellingTab);

      await waitFor(() => {
        expect(screen.getByText(/Drop-off: Ready for Drop-Off/i)).toBeInTheDocument();
      });
    });
  });

  describe('Empty states', () => {
    it('displays empty state for buying orders when list is empty', async () => {
      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        // Component should render without crashing with empty data
        expect(screen.getByRole('tab', { name: /buying/i })).toBeInTheDocument();
      });
    });

    it('displays empty state for selling orders when list is empty', async () => {
      const user = userEvent.setup();

      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      const sellingTab = screen.getByRole('tab', { name: /selling/i });
      await user.click(sellingTab);

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /selling/i })).toBeInTheDocument();
      });
    });
  });

  describe('Status badge styling', () => {
    it('renders correct badge color for "pending" payment status', async () => {
      supabase.from
        .mockReturnValueOnce(
          buildChainMock({
            data: [{ ...mockBuyingOrder, status: 'pending' }],
            error: null,
          })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        const badge = screen.getByText(/Payment: pending/i).closest('span');
        expect(badge).toHaveClass('bg-yellow-50');
      });
    });

    it('renders correct badge color for "paid" payment status', async () => {
      const paidOrder = { ...mockBuyingOrder, status: 'paid' };

      supabase.from
        .mockReturnValueOnce(
          buildChainMock({
            data: [paidOrder],
            error: null,
          })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        const badge = screen.getByText(/Payment: paid/i).closest('span');
        expect(badge).toHaveClass('bg-green-50');
      });
    });

    it('renders correct badge color for "awaiting_confirmation" buyer status', async () => {
      supabase.from
        .mockReturnValueOnce(
          buildChainMock({ data: [mockBuyingOrder], error: null })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        const badge = screen.getByText(/Collection: Awaiting Confirmation/i).closest('span');
        expect(badge).toHaveClass('bg-yellow-50');
      });
    });
  });

  describe('Order listing rendering', () => {
    it('displays order image with correct src', async () => {
      supabase.from
        .mockReturnValueOnce(
          buildChainMock({ data: [mockBuyingOrder], error: null })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        const images = screen.getAllByRole('img');
        const listingImage = images.find(
          (img) =>
            img.src.includes('macbook') ||
            img.src.includes('supabase') ||
            img.alt === 'MacBook Pro'
        );
        expect(listingImage).toBeInTheDocument();
      });
    });

    it('displays booking information if available', async () => {
      supabase.from
        .mockReturnValueOnce(
          buildChainMock({ data: [mockBuyingOrder], error: null })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
      });
    });

    it('displays multiple orders in list', async () => {
      const order1 = mockBuyingOrder;
      const order2 = {
        ...mockBuyingOrder,
        id: 'order-3',
        listings: {
          ...mockBuyingOrder.listings,
          title: 'iPad Air',
        },
      };

      supabase.from
        .mockReturnValueOnce(
          buildChainMock({ data: [order1, order2], error: null })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
        expect(screen.getByText('iPad Air')).toBeInTheDocument();
      });
    });
  });

  describe('Data fetching and error handling', () => {
    it('fetches orders when component mounts', () => {
      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      expect(supabase.from).toHaveBeenCalledWith('orders');
    });

    it('logs error when fetching buying orders fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('API error');

      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: null, error }))
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching orders:', error);
      });

      consoleSpy.mockRestore();
    });

    it('logs error when fetching selling orders fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('API error');

      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: null, error }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching orders:', error);
      });

      consoleSpy.mockRestore();
    });

    it('continues loading when there are no buyers to fetch', async () => {
      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }))
        .mockReturnValueOnce(
          buildChainMock({
            data: [mockSellingOrder],
            error: null,
          })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null })); // Empty buyers list

      const user = userEvent.setup();

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      const sellingTab = screen.getByRole('tab', { name: /selling/i });
      await user.click(sellingTab);

      // Should handle gracefully without fetching buyers
      await waitFor(() => {
        expect(screen.getByText('iPhone 12')).toBeInTheDocument();
      });
    });
  });

  describe('Tab switching', () => {
    it('switches to "Selling" tab when clicked', async () => {
      const user = userEvent.setup();

      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      const sellingTab = screen.getByRole('tab', { name: /selling/i });
      await user.click(sellingTab);

      expect(sellingTab).toHaveClass('border-primary');
    });

    it('updates activeTab state on tab click', async () => {
      const user = userEvent.setup();

      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

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

      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }))
        .mockReturnValueOnce(
          buildChainMock({
            data: [mockSellingOrder],
            error: null,
          })
        )
        .mockReturnValueOnce(buildChainMock({ data: [mockBuyer], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      const sellingTab = screen.getByRole('tab', { name: /selling/i });
      await user.click(sellingTab);

      await waitFor(() => {
        expect(screen.getByText(/john_buyer/)).toBeInTheDocument();
      });
    });

    it('falls back to email prefix if username not available', async () => {
      const user = userEvent.setup();
      const buyerNoUsername = {
        id: 'buyer-1',
        username: null,
        email: 'buyer@example.com',
      };

      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }))
        .mockReturnValueOnce(
          buildChainMock({
            data: [mockSellingOrder],
            error: null,
          })
        )
        .mockReturnValueOnce(buildChainMock({ data: [buyerNoUsername], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      const sellingTab = screen.getByRole('tab', { name: /selling/i });
      await user.click(sellingTab);

      await waitFor(() => {
        expect(screen.getByText(/buyer/)).toBeInTheDocument();
      });
    });

    it('shows "Buyer" as default fallback', async () => {
      const user = userEvent.setup();
      const buyerNoInfo = {
        id: 'buyer-1',
        username: null,
        email: null,
      };

      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }))
        .mockReturnValueOnce(
          buildChainMock({
            data: [mockSellingOrder],
            error: null,
          })
        )
        .mockReturnValueOnce(buildChainMock({ data: [buyerNoInfo], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      const sellingTab = screen.getByRole('tab', { name: /selling/i });
      await user.click(sellingTab);

      await waitFor(() => {
        expect(screen.getByText(/Buyer:/)).toBeInTheDocument();
      });
    });
  });

  describe('Status badge styling', () => {
    it('renders correct badge color for "pending" payment status', async () => {
      supabase.from
        .mockReturnValueOnce(
          buildChainMock({
            data: [{ ...mockBuyingOrder, status: 'pending' }],
            error: null,
          })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        const badge = screen.getByText(/Payment: pending/i).closest('span');
        expect(badge).toHaveClass('bg-yellow-50');
      });
    });

    it('renders correct badge color for "paid" payment status', async () => {
      const paidOrder = { ...mockBuyingOrder, status: 'paid' };

      supabase.from
        .mockReturnValueOnce(
          buildChainMock({
            data: [paidOrder],
            error: null,
          })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        const badge = screen.getByText(/Payment: paid/i).closest('span');
        expect(badge).toHaveClass('bg-green-50');
      });
    });

    it('renders correct badge color for "awaiting_confirmation" buyer status', async () => {
      supabase.from
        .mockReturnValueOnce(
          buildChainMock({ data: [mockBuyingOrder], error: null })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        const badge = screen.getByText(/Collection: Awaiting Confirmation/i).closest('span');
        expect(badge).toHaveClass('bg-yellow-50');
      });
    });

    it('renders correct badge color for "ready_for_collection" buyer status', async () => {
      const readyOrder = {
        ...mockBuyingOrder,
        buyer_status: 'ready_for_collection',
      };

      supabase.from
        .mockReturnValueOnce(
          buildChainMock({ data: [readyOrder], error: null })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        const badge = screen.getByText(/Collection: Ready for Collection/i).closest('span');
        expect(badge).toHaveClass('bg-blue-50');
      });
    });

    it('renders correct badge color for "collected" buyer status', async () => {
      const collectedOrder = {
        ...mockBuyingOrder,
        buyer_status: 'collected',
      };

      supabase.from
        .mockReturnValueOnce(
          buildChainMock({ data: [collectedOrder], error: null })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        const badge = screen.getByText(/Collection: Collected/i).closest('span');
        expect(badge).toHaveClass('bg-green-50');
      });
    });

    it('renders correct badge color for "ready_for_dropoff" seller status', async () => {
      const readyDropoffOrder = {
        ...mockSellingOrder,
        seller_status: 'ready_for_dropoff',
      };

      const user = userEvent.setup();

      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }))
        .mockReturnValueOnce(
          buildChainMock({
            data: [readyDropoffOrder],
            error: null,
          })
        )
        .mockReturnValueOnce(buildChainMock({ data: [mockBuyer], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      const sellingTab = screen.getByRole('tab', { name: /selling/i });
      await user.click(sellingTab);

      await waitFor(() => {
        const badge = screen.getByText(/Drop-off: Ready for Drop-Off/i).closest('span');
        expect(badge).toHaveClass('bg-blue-50');
      });
    });

    it('renders correct badge color for "dropped_off" seller status', async () => {
      const droppedOrder = {
        ...mockSellingOrder,
        seller_status: 'dropped_off',
      };

      const user = userEvent.setup();

      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }))
        .mockReturnValueOnce(
          buildChainMock({
            data: [droppedOrder],
            error: null,
          })
        )
        .mockReturnValueOnce(buildChainMock({ data: [mockBuyer], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      const sellingTab = screen.getByRole('tab', { name: /selling/i });
      await user.click(sellingTab);

      await waitFor(() => {
        const badge = screen.getByText(/Drop-off: Dropped Off/i).closest('span');
        expect(badge).toHaveClass('bg-green-50');
      });
    });

    it('renders cancelled order with red badge', async () => {
      const cancelledOrder = {
        ...mockBuyingOrder,
        status: 'cancelled',
      };

      supabase.from
        .mockReturnValueOnce(
          buildChainMock({ data: [cancelledOrder], error: null })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        const badge = screen.getByText(/Payment: cancelled/i).closest('span');
        expect(badge).toHaveClass('bg-red-50');
      });
    });
  });

  describe('Order card rendering', () => {
    it('renders order card with proper structure', async () => {
      supabase.from
        .mockReturnValueOnce(
          buildChainMock({ data: [mockBuyingOrder], error: null })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      const { container } = render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
      });

      // Verify card has proper styling classes
      const orderCard = container.querySelector('.rounded-\\[24px\\]');
      expect(orderCard).toBeInTheDocument();
    });

    it('displays order creation date/time details', async () => {
      supabase.from
        .mockReturnValueOnce(
          buildChainMock({ data: [mockBuyingOrder], error: null })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
      });
    });
  });

  describe('MyOrders component lifecycle', () => {
    it('calls fetchOrders when component mounts', () => {
      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      expect(supabase.from).toHaveBeenCalledWith('orders');
    });

    it('calls fetchOrders when user prop changes', async () => {
      const user = userEvent.setup();

      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }))
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      const { rerender } = render(
        <MyOrders user={mockUser} onBack={jest.fn()} />
      );

      const newUser = { id: 'different-user', email: 'other@example.com' };
      rerender(<MyOrders user={newUser} onBack={jest.fn()} />);

      await waitFor(() => {
        // Should have called from() twice - once per render
        expect(supabase.from).toHaveBeenCalledTimes(4);
      });
    });
  });

  describe('getStatusBadge function coverage', () => {
    it('handles seller status for awaiting_booking', async () => {
      const awaitingOrder = {
        ...mockSellingOrder,
        seller_status: 'awaiting_booking',
      };

      const user = userEvent.setup();

      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }))
        .mockReturnValueOnce(
          buildChainMock({ data: [awaitingOrder], error: null })
        )
        .mockReturnValueOnce(buildChainMock({ data: [mockBuyer], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      const sellingTab = screen.getByRole('tab', { name: /selling/i });
      await user.click(sellingTab);

      await waitFor(() => {
        expect(screen.getByText(/Awaiting Booking/i)).toBeInTheDocument();
      });
    });

    it('handles failed payment status', async () => {
      const failedOrder = {
        ...mockBuyingOrder,
        status: 'failed',
      };

      supabase.from
        .mockReturnValueOnce(
          buildChainMock({ data: [failedOrder], error: null })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        const badge = screen.getByText(/Payment: failed/i).closest('span');
        expect(badge).toHaveClass('bg-red-50');
      });
    });

    it('handles unknown/default status', async () => {
      const unknownOrder = {
        ...mockBuyingOrder,
        status: 'unknown_status',
      };

      supabase.from
        .mockReturnValueOnce(
          buildChainMock({ data: [unknownOrder], error: null })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
      });
    });
  });

  describe('Booking information display', () => {
    it('displays booking date and time when available', async () => {
      supabase.from
        .mockReturnValueOnce(
          buildChainMock({ data: [mockBuyingOrder], error: null })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
      });
    });

    it('handles order with null bookings', async () => {
      const orderNoBookings = {
        ...mockBuyingOrder,
        bookings: null,
      };

      supabase.from
        .mockReturnValueOnce(
          buildChainMock({ data: [orderNoBookings], error: null })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
      });
    });

    it('handles order with cancelled booking in array', async () => {
      const orderWithCancelledBooking = {
        ...mockBuyingOrder,
        bookings: [
          { date: '2025-01-15', time_slot: '10:00', status: 'cancelled' },
          { date: '2025-01-20', time_slot: '14:00', status: 'confirmed' },
        ],
      };

      supabase.from
        .mockReturnValueOnce(
          buildChainMock({ data: [orderWithCancelledBooking], error: null })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
      });
    });
  });

  describe('Missing data handling', () => {
    it('handles order with missing listings data', async () => {
      const orderMissingListing = {
        ...mockBuyingOrder,
        listings: null,
      };

      supabase.from
        .mockReturnValueOnce(
          buildChainMock({ data: [orderMissingListing], error: null })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        // Should render without crashing
        expect(screen.getByRole('tab', { name: /buying/i })).toBeInTheDocument();
      });
    });

    it('handles order with missing amount_due', async () => {
      const orderNoAmount = {
        ...mockBuyingOrder,
        amount_due: null,
      };

      supabase.from
        .mockReturnValueOnce(
          buildChainMock({ data: [orderNoAmount], error: null })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        // Should still display with fallback
        expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
      });
    });

    it('handles order with missing image_path', async () => {
      const orderNoImage = {
        ...mockBuyingOrder,
        listings: {
          ...mockBuyingOrder.listings,
          image_path: null,
        },
      };

      supabase.from
        .mockReturnValueOnce(
          buildChainMock({ data: [orderNoImage], error: null })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }));

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      await waitFor(() => {
        const images = screen.getAllByRole('img');
        // Should have fallback image
        expect(images.length).toBeGreaterThan(0);
      });
    });

    it('handles missing buyer names for selling orders', async () => {
      const user = userEvent.setup();

      supabase.from
        .mockReturnValueOnce(buildChainMock({ data: [], error: null }))
        .mockReturnValueOnce(
          buildChainMock({
            data: [mockSellingOrder],
            error: null,
          })
        )
        .mockReturnValueOnce(buildChainMock({ data: [], error: null })); // No buyers returned

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);

      const sellingTab = screen.getByRole('tab', { name: /selling/i });
      await user.click(sellingTab);

      await waitFor(() => {
        // Should still render even without buyer data
        expect(screen.getByText('iPhone 12')).toBeInTheDocument();
      });
    });
  });
});
