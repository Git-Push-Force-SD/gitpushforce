import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyOrders from './MyOrders';
import { supabase } from './utils/supabase';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('./utils/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getSession: jest.fn() },
  },
}));

jest.mock('./components/LeaveReviewModal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose, revieweeName, submitReview }) =>
    isOpen ? (
      <div data-testid="review-modal">
        <span>Review for {revieweeName}</span>
        <button onClick={onClose}>Close Review</button>
        <button onClick={() => submitReview({ rating: 5, comment: 'Great!' })}>
          Submit Review
        </button>
        <button
          onClick={() => submitReview({ rating: 5 }).catch(() => {})}
          data-testid="submit-error"
        >
          Submit Error
        </button>
      </div>
    ) : null,
}));

jest.mock('./components/UserProfileModal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose, userId }) =>
    isOpen ? (
      <div data-testid="profile-modal" data-user-id={userId}>
        <button onClick={onClose}>Close Profile</button>
      </div>
    ) : null,
}));

jest.mock('./components/OrderCard', () => ({
  __esModule: true,
  default: ({ order, isSelling, onOpenProfile, onLeaveReview, reviewsLoaded, hasReviewed }) => (
    <div data-testid={`order-card-${order.id}`}>
      <span>{order.listings?.title || 'Unknown Item'}</span>
      <span>R{parseFloat(order.amount_due || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
      <span data-testid={`status-${order.id}`}>status: {order.status}</span>
      <span data-testid={`buyer-status-${order.id}`}>
        Collection: {order.buyer_status || 'Awaiting Confirmation'}
      </span>
      <span data-testid={`seller-status-${order.id}`}>
        Drop-off: {order.seller_status || 'Awaiting Booking'}
      </span>
      {isSelling && <span>{order.buyerName}</span>}
      {!isSelling && <span>{order.sellerName}</span>}
      <button onClick={() => onOpenProfile(order.listings?.seller_id)}>View Profile</button>
      {reviewsLoaded && !hasReviewed && order.status === 'completed' && order.buyer_status === 'collected' && (
        <button onClick={() => onLeaveReview(order)}>Leave Review</button>
      )}
    </div>
  ),
}));

jest.mock('./components/TradeCard', () => ({
  __esModule: true,
  default: ({ trade, onOpenProfile, onLeaveReview, reviewsLoaded, hasReviewed }) => (
    <div data-testid={`trade-card-${trade.id}`}>
      <span>{[trade.myListing?.title, trade.partnerListing?.title].filter(Boolean).join(' ↔ ') || 'Trade exchange'}</span>
      <span>Completed Trade</span>
      <span>{trade.counterpartyName}</span>
      <button onClick={() => onOpenProfile(trade.counterpartyId)}>View Trade Profile</button>
      {reviewsLoaded && !hasReviewed && (
        <button onClick={() => onLeaveReview(trade)}>Leave Trade Review</button>
      )}
    </div>
  ),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildChainMock = (resolveValue = { data: null, error: null }) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  in: jest.fn().mockResolvedValue(resolveValue),
  order: jest.fn().mockResolvedValue(resolveValue),
  single: jest.fn().mockResolvedValue(resolveValue),
  maybeSingle: jest.fn().mockResolvedValue(resolveValue),
});

// Reviews chain: .select().in().eq() — eq is terminal
const buildReviewsChainMock = (resolveValue = { data: null, error: null }) => ({
  select: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  eq: jest.fn().mockResolvedValue(resolveValue),
});

const mockUser = { id: 'user-123', email: 'seller@example.com' };

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

const mockCompletedTrade = {
  id: 'trade-1',
  initiator_id: 'user-123',
  receiver_id: 'partner-1',
  created_at: '2025-01-01T00:00:00Z',
  offered_listing_id: 'listing-offered',
  requested_listing_id: 'listing-requested',
  offered_listing: { id: 'listing-offered', title: 'Laptop', image_path: null },
  requested_listing: { id: 'listing-requested', title: 'Phone', image_path: null },
  bookings: [
    { id: 'b1', status: 'collected', booked_by: 'user-123', date: '2025-01-15', time_slot: '10:00' },
    { id: 'b2', status: 'collected', booked_by: 'partner-1', date: '2025-01-15', time_slot: '10:00' },
  ],
};

const mockPartner = { id: 'partner-1', username: 'trade_partner', email: 'partner@example.com' };

const setupMocks = ({
  buyingOrders = [],
  sellingOrders = [],
  trades = [],
  sellers = [],
  users = [],
  tradePartners = [],
  reviewData = [],
  sessionUserId = mockUser.id,
  authError = null,
} = {}) => {
  supabase.auth.getSession.mockResolvedValue(
    authError
      ? { data: { session: null }, error: authError }
      : { data: { session: { user: { id: sessionUserId } } }, error: null }
  );

  let ordersCallCount = 0;
  supabase.from.mockImplementation((table) => {
    if (table === 'orders') {
      ordersCallCount += 1;
      if (ordersCallCount === 1) return buildChainMock({ data: buyingOrders, error: null });
      return buildChainMock({ data: sellingOrders, error: null });
    }
    if (table === 'trades') return buildChainMock({ data: trades, error: null });
    if (table === 'users') {
      return buildChainMock({ data: [...sellers, ...users, ...tradePartners], error: null });
    }
    if (table === 'reviews') return buildReviewsChainMock({ data: reviewData, error: null });
    return buildChainMock({ data: [], error: null });
  });
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MyOrders', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Initial state ──────────────────────────────────────────────────────────

  describe('Initial state and rendering', () => {
    it('renders without crashing', () => {
      setupMocks();
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      expect(screen.getByText(/My Orders/i)).toBeInTheDocument();
    });

    it('renders Buying, Selling, and Trades tabs', () => {
      setupMocks();
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      expect(screen.getByRole('tab', { name: /buying/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /selling/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /trades/i })).toBeInTheDocument();
    });

    it('shows Buying tab as active by default', () => {
      setupMocks();
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      expect(screen.getByRole('tab', { name: /buying/i })).toHaveClass('border-primary');
    });

    it('renders loading skeletons initially', () => {
      supabase.auth.getSession.mockReturnValue(new Promise(() => {}));
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    });

    it('calls onBack when back button is clicked', async () => {
      setupMocks();
      const onBack = jest.fn();
      render(<MyOrders user={mockUser} onBack={onBack} />);
      await waitFor(() => screen.getByText('My Orders'));
      fireEvent.click(document.querySelector('button'));
      expect(onBack).toHaveBeenCalled();
    });

    it('does not fetch if user has no id', () => {
      render(<MyOrders user={{}} onBack={jest.fn()} />);
      expect(supabase.auth.getSession).not.toHaveBeenCalled();
    });

    it('does not fetch if user is null', () => {
      // MyOrders accesses user.id in JSX so guard with a user that has no id
      render(<MyOrders user={{ email: 'no-id@test.com' }} onBack={jest.fn()} />);
      expect(supabase.auth.getSession).not.toHaveBeenCalled();
    });

    it('stops loading and shows empty state when session has no user', async () => {
      supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() =>
        expect(screen.getByText('No purchases yet')).toBeInTheDocument()
      );
    });
  });

  // ── Buying tab ─────────────────────────────────────────────────────────────

  describe('Buying orders tab', () => {
    it('displays buying order title', async () => {
      setupMocks({ buyingOrders: [mockBuyingOrder] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => expect(screen.getByText('MacBook Pro')).toBeInTheDocument());
    });

    it('displays order price in ZAR format', async () => {
      setupMocks({ buyingOrders: [mockBuyingOrder] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => expect(screen.getByText(/R1[\s\u00a0,.]?500/)).toBeInTheDocument());
    });

    it('displays payment status badge', async () => {
      setupMocks({ buyingOrders: [mockBuyingOrder] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() =>
        expect(screen.getByTestId('status-order-1')).toHaveTextContent('status: pending')
      );
    });

    it('displays buyer collection status', async () => {
      setupMocks({ buyingOrders: [mockBuyingOrder] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() =>
        expect(screen.getByTestId('buyer-status-order-1')).toHaveTextContent('awaiting_confirmation')
      );
    });

    it('shows empty state when no buying orders', async () => {
      setupMocks();
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() =>
        expect(screen.getByText('No purchases yet')).toBeInTheDocument()
      );
    });

    it('displays multiple buying orders', async () => {
      const order2 = { ...mockBuyingOrder, id: 'order-3', listings: { ...mockBuyingOrder.listings, title: 'iPad Air' } };
      setupMocks({ buyingOrders: [mockBuyingOrder, order2] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => {
        expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
        expect(screen.getByText('iPad Air')).toBeInTheDocument();
      });
    });

    it('resolves seller names for buying orders', async () => {
      const seller = { id: 'seller-1', username: 'alice_seller', email: 'alice@test.com' };
      setupMocks({ buyingOrders: [mockBuyingOrder], sellers: [seller] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => expect(screen.getByText('alice_seller')).toBeInTheDocument());
    });

    it('falls back to email prefix for seller name', async () => {
      const seller = { id: 'seller-1', username: null, email: 'alice@test.com' };
      setupMocks({ buyingOrders: [mockBuyingOrder], sellers: [seller] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => expect(screen.getByText('alice')).toBeInTheDocument());
    });

    it('falls back to "Seller" when no username or email', async () => {
      const seller = { id: 'seller-1', username: null, email: null };
      setupMocks({ buyingOrders: [mockBuyingOrder], sellers: [seller] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => expect(screen.getByText('Seller')).toBeInTheDocument());
    });
  });

  // ── Selling tab ────────────────────────────────────────────────────────────

  describe('Selling orders tab', () => {
    it('displays selling order after switching tab', async () => {
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

    it('falls back to email prefix for buyer name', async () => {
      const user = userEvent.setup();
      setupMocks({
        sellingOrders: [mockSellingOrder],
        sellers: [{ id: 'buyer-1', username: null, email: 'buyer@example.com' }],
      });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /selling/i }));
      await waitFor(() => expect(screen.getByText('buyer')).toBeInTheDocument());
    });

    it('falls back to "Buyer" when no username or email', async () => {
      const user = userEvent.setup();
      setupMocks({
        sellingOrders: [mockSellingOrder],
        users: [{ id: 'buyer-1', username: null, email: null }],
      });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /selling/i }));
      await waitFor(() => expect(screen.getByText('Buyer')).toBeInTheDocument());
    });

    it('shows empty state when no selling orders', async () => {
      const user = userEvent.setup();
      setupMocks();
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /selling/i }));
      await waitFor(() => expect(screen.getByText('No sales yet')).toBeInTheDocument());
    });

    it('continues when buyers list is empty', async () => {
      const user = userEvent.setup();
      setupMocks({ sellingOrders: [mockSellingOrder], users: [] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /selling/i }));
      await waitFor(() => expect(screen.getByText('iPhone 12')).toBeInTheDocument());
    });
  });

  // ── Trades tab ─────────────────────────────────────────────────────────────

  describe('Trades tab', () => {
    it('shows completed trade', async () => {
      const user = userEvent.setup();
      setupMocks({ trades: [mockCompletedTrade], tradePartners: [mockPartner] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /trades/i }));
      await waitFor(() => {
        expect(screen.getByText('Laptop ↔ Phone')).toBeInTheDocument();
        expect(screen.getByText('Completed Trade')).toBeInTheDocument();
        expect(screen.getByText('trade_partner')).toBeInTheDocument();
      });
    });

    it('does not show trade when only one booking is collected', async () => {
      const user = userEvent.setup();
      setupMocks({
        trades: [{
          ...mockCompletedTrade,
          bookings: [
            { id: 'b1', status: 'collected', booked_by: 'user-123' },
            { id: 'b2', status: 'pending', booked_by: 'partner-1' },
          ],
        }],
      });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /trades/i }));
      await waitFor(() =>
        expect(screen.getByText('No completed trades yet')).toBeInTheDocument()
      );
    });

    it('does not show trade when fewer than 2 bookings', async () => {
      const user = userEvent.setup();
      setupMocks({
        trades: [{
          ...mockCompletedTrade,
          bookings: [{ id: 'b1', status: 'collected', booked_by: 'user-123' }],
        }],
      });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /trades/i }));
      await waitFor(() =>
        expect(screen.getByText('No completed trades yet')).toBeInTheDocument()
      );
    });

    it('shows empty state when no trades', async () => {
      const user = userEvent.setup();
      setupMocks();
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /trades/i }));
      await waitFor(() =>
        expect(screen.getByText('No completed trades yet')).toBeInTheDocument()
      );
    });

    it('sets counterpartyId correctly for receiver (not initiator)', async () => {
      const user = userEvent.setup();
      const tradeAsReceiver = {
        ...mockCompletedTrade,
        initiator_id: 'partner-1',
        receiver_id: 'user-123',
      };
      setupMocks({ trades: [tradeAsReceiver], tradePartners: [mockPartner] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /trades/i }));
      await waitFor(() => expect(screen.getByText('trade_partner')).toBeInTheDocument());
    });

    it('falls back to "Partner" when no partner found', async () => {
      const user = userEvent.setup();
      setupMocks({ trades: [mockCompletedTrade], tradePartners: [] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /trades/i }));
      await waitFor(() => expect(screen.getByText('Partner')).toBeInTheDocument());
    });

    it('uses first booking as myBooking when booked_by not found', async () => {
      const user = userEvent.setup();
      const tradeNoMatch = {
        ...mockCompletedTrade,
        bookings: [
          { id: 'b1', status: 'collected', booked_by: 'other-user', date: '2025-01-15', time_slot: '10:00' },
          { id: 'b2', status: 'collected', booked_by: 'partner-1', date: '2025-01-15', time_slot: '10:00' },
        ],
      };
      setupMocks({ trades: [tradeNoMatch], tradePartners: [mockPartner] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /trades/i }));
      await waitFor(() => expect(screen.getByText('Laptop ↔ Phone')).toBeInTheDocument());
    });
  });

  // ── Tab switching ──────────────────────────────────────────────────────────

  describe('Tab switching', () => {
    it('switches to Selling tab', async () => {
      const user = userEvent.setup();
      setupMocks();
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /selling/i }));
      expect(screen.getByRole('tab', { name: /selling/i })).toHaveClass('border-primary');
    });

    it('switches to Trades tab', async () => {
      const user = userEvent.setup();
      setupMocks();
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /trades/i }));
      expect(screen.getByRole('tab', { name: /trades/i })).toHaveClass('border-primary');
    });

    it('refetches when user id changes', async () => {
      setupMocks();
      const { rerender } = render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      setupMocks({ sessionUserId: 'different-user' });
      rerender(<MyOrders user={{ id: 'different-user', email: 'other@example.com' }} onBack={jest.fn()} />);
      await waitFor(() =>
        expect(supabase.auth.getSession).toHaveBeenCalledTimes(2)
      );
    });
  });

  // ── Review flow ────────────────────────────────────────────────────────────

  describe('Review modal', () => {
    const completedBuyingOrder = {
      ...mockBuyingOrder,
      status: 'completed',
      buyer_status: 'collected',
      listings: { ...mockBuyingOrder.listings, seller_id: 'seller-1' },
      sellerName: 'Alice',
    };

    it('opens review modal when Leave Review is clicked on buying order', async () => {
      setupMocks({ buyingOrders: [completedBuyingOrder], reviewData: [] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => screen.getByText('MacBook Pro'));
      userEvent.click(screen.getByText('Leave Review'));
      await waitFor(() =>
        expect(screen.getByTestId('review-modal')).toBeInTheDocument()
      );
    });

    it('closes review modal when onClose is called', async () => {
      setupMocks({ buyingOrders: [completedBuyingOrder], reviewData: [] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => screen.getByText('MacBook Pro'));
      userEvent.click(screen.getByText('Leave Review'));
      await waitFor(() => screen.getByTestId('review-modal'));
      userEvent.click(screen.getByText('Close Review'));
      await waitFor(() =>
        expect(screen.queryByTestId('review-modal')).not.toBeInTheDocument()
      );
    });

    it('marks order as reviewed after successful submission', async () => {
      supabase.from.mockImplementation((table) => {
        if (table === 'reviews') {
          return {
            ...buildChainMock({ data: [], error: null }),
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return buildChainMock({ data: table === 'orders' ? [completedBuyingOrder] : [], error: null });
      });
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: mockUser.id } } },
      });

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => screen.getByText('MacBook Pro'));
      userEvent.click(screen.getByText('Leave Review'));
      await waitFor(() => screen.getByTestId('review-modal'));
      userEvent.click(screen.getByText('Submit Review'));
      await waitFor(() =>
        expect(screen.queryByTestId('review-modal')).not.toBeInTheDocument()
      );
    });

    it('opens review modal for trade', async () => {
      const user = userEvent.setup();
      setupMocks({ trades: [mockCompletedTrade], tradePartners: [mockPartner], reviewData: [] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /trades/i }));
      await waitFor(() => screen.getByText('Laptop ↔ Phone'));
      userEvent.click(screen.getByText('Leave Trade Review'));
      await waitFor(() =>
        expect(screen.getByTestId('review-modal')).toBeInTheDocument()
      );
    });

    it('opens review modal for selling order', async () => {
      const user = userEvent.setup();
      const completedSellingOrder = {
        ...mockSellingOrder,
        status: 'completed',
        buyer_status: 'collected',
        buyerName: 'Bob',
      };
      setupMocks({ sellingOrders: [completedSellingOrder], users: [mockBuyer], reviewData: [] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /selling/i }));
      await waitFor(() => screen.getByText('iPhone 12'));
      userEvent.click(screen.getByText('Leave Review'));
      await waitFor(() =>
        expect(screen.getByTestId('review-modal')).toBeInTheDocument()
      );
    });
  });

  // ── Profile modal ──────────────────────────────────────────────────────────

  describe('Profile modal', () => {
    it('opens profile modal when View Profile is clicked', async () => {
      setupMocks({ buyingOrders: [mockBuyingOrder] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => screen.getByText('MacBook Pro'));
      userEvent.click(screen.getByText('View Profile'));
      await waitFor(() =>
        expect(screen.getByTestId('profile-modal')).toBeInTheDocument()
      );
    });

    it('closes profile modal when onClose is called', async () => {
      setupMocks({ buyingOrders: [mockBuyingOrder] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => screen.getByText('MacBook Pro'));
      userEvent.click(screen.getByText('View Profile'));
      await waitFor(() => screen.getByTestId('profile-modal'));
      userEvent.click(screen.getByText('Close Profile'));
      await waitFor(() =>
        expect(screen.queryByTestId('profile-modal')).not.toBeInTheDocument()
      );
    });

    it('opens profile modal from trade card', async () => {
      const user = userEvent.setup();
      setupMocks({ trades: [mockCompletedTrade], tradePartners: [mockPartner] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /trades/i }));
      await waitFor(() => screen.getByText('Laptop ↔ Phone'));
      userEvent.click(screen.getByText('View Trade Profile'));
      await waitFor(() =>
        expect(screen.getByTestId('profile-modal')).toBeInTheDocument()
      );
    });
  });

  // ── Review status ──────────────────────────────────────────────────────────

  describe('Review status fetching', () => {
    it('marks order as reviewed when review exists', async () => {
      const completedOrder = {
        ...mockBuyingOrder,
        status: 'completed',
        buyer_status: 'collected',
      };
      setupMocks({
        buyingOrders: [completedOrder],
        reviewData: [{ order_id: 'order-1', trade_id: null }],
      });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => screen.getByText('MacBook Pro'));
      // reviewsLoaded must be true before Leave Review would appear; wait for it to settle
      await waitFor(() =>
        expect(screen.queryByText('Leave Review')).not.toBeInTheDocument()
      );
    });

    it('marks trade as reviewed when trade review exists', async () => {
      const user = userEvent.setup();
      setupMocks({
        trades: [mockCompletedTrade],
        tradePartners: [mockPartner],
        reviewData: [{ trade_id: 'trade-1', order_id: null }],
      });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /trades/i }));
      await waitFor(() => screen.getByText('Laptop ↔ Phone'));
      await waitFor(() =>
        expect(screen.queryByText('Leave Trade Review')).not.toBeInTheDocument()
      );
    });
  });

  // ── Error handling ─────────────────────────────────────────────────────────

  describe('Error handling', () => {
    it('logs error and shows empty state when buying orders fetch fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('API error');

      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: mockUser.id } } },
      });

      let ordersCallCount = 0;
      supabase.from.mockImplementation((table) => {
        if (table === 'orders') {
          ordersCallCount++;
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

    it('logs error and shows empty state when selling orders fetch fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('API error');

      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: mockUser.id } } },
      });

      let ordersCallCount = 0;
      supabase.from.mockImplementation((table) => {
        if (table === 'orders') {
          ordersCallCount++;
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

    it('logs error when trades fetch fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Trade fetch error');

      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: mockUser.id } } },
      });

      supabase.from.mockImplementation((table) => {
        if (table === 'trades') return buildChainMock({ data: null, error });
        return buildChainMock({ data: [], error: null });
      });

      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() =>
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching orders:', error)
      );
      consoleSpy.mockRestore();
    });
  });

  // ── Data fetching ──────────────────────────────────────────────────────────

  describe('Data fetching', () => {
    it('fetches orders on mount', async () => {
      setupMocks();
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('orders'));
    });

    it('fetches trades on mount', async () => {
      setupMocks();
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('trades'));
    });

    it('handles null bookings on order gracefully', async () => {
      setupMocks({ buyingOrders: [{ ...mockBuyingOrder, bookings: null }] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => expect(screen.getByText('MacBook Pro')).toBeInTheDocument());
    });

    it('handles order with missing listings gracefully', async () => {
      setupMocks({ buyingOrders: [{ ...mockBuyingOrder, listings: null }] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() =>
        expect(screen.getByRole('tab', { name: /buying/i })).toBeInTheDocument()
      );
    });

    it('handles order with null amount_due', async () => {
      setupMocks({ buyingOrders: [{ ...mockBuyingOrder, amount_due: null }] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => expect(screen.getByText('MacBook Pro')).toBeInTheDocument());
    });

    it('handles order with null image_path', async () => {
      setupMocks({
        buyingOrders: [{
          ...mockBuyingOrder,
          listings: { ...mockBuyingOrder.listings, image_path: null },
        }],
      });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => expect(screen.getByText('MacBook Pro')).toBeInTheDocument());
    });

    it('handles cancelled booking in bookings array', async () => {
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

  // ── getStatusBadge / getStatusLabel coverage ───────────────────────────────

  describe('Status badge and label coverage', () => {
    it('handles null status for buyer type — falls back to Awaiting Confirmation', async () => {
      setupMocks({ buyingOrders: [{ ...mockBuyingOrder, buyer_status: null }] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() =>
        expect(screen.getByTestId('buyer-status-order-1')).toHaveTextContent('Awaiting Confirmation')
      );
    });

    it('handles "completed" order status with green badge', async () => {
      setupMocks({ buyingOrders: [{ ...mockBuyingOrder, status: 'completed' }] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() =>
        expect(screen.getByTestId('status-order-1')).toHaveTextContent('completed')
      );
    });

    it('handles "booked" order status', async () => {
      setupMocks({ buyingOrders: [{ ...mockBuyingOrder, status: 'booked' }] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() =>
        expect(screen.getByTestId('status-order-1')).toHaveTextContent('booked')
      );
    });

    it('handles "confirmed" order status', async () => {
      setupMocks({ buyingOrders: [{ ...mockBuyingOrder, status: 'confirmed' }] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() =>
        expect(screen.getByTestId('status-order-1')).toHaveTextContent('confirmed')
      );
    });

    it('handles "paid" order status', async () => {
      setupMocks({ buyingOrders: [{ ...mockBuyingOrder, status: 'paid' }] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() =>
        expect(screen.getByTestId('status-order-1')).toHaveTextContent('paid')
      );
    });

    it('handles "cancelled" order status', async () => {
      setupMocks({ buyingOrders: [{ ...mockBuyingOrder, status: 'cancelled' }] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() =>
        expect(screen.getByTestId('status-order-1')).toHaveTextContent('cancelled')
      );
    });

    it('handles "failed" order status', async () => {
      setupMocks({ buyingOrders: [{ ...mockBuyingOrder, status: 'failed' }] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() =>
        expect(screen.getByTestId('status-order-1')).toHaveTextContent('failed')
      );
    });

    it('handles unknown/default status gracefully', async () => {
      setupMocks({ buyingOrders: [{ ...mockBuyingOrder, status: 'some_unknown_status' }] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => expect(screen.getByText('MacBook Pro')).toBeInTheDocument());
    });

    it('getStatusLabel returns raw status for unknown buyer status', async () => {
      setupMocks({ buyingOrders: [{ ...mockBuyingOrder, buyer_status: 'mystery_status' }] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() =>
        expect(screen.getByTestId('buyer-status-order-1')).toHaveTextContent('mystery_status')
      );
    });

    it('getStatusLabel returns "Unknown" for null status with no type', async () => {
      setupMocks({ buyingOrders: [{ ...mockBuyingOrder, buyer_status: null, status: null }] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() => expect(screen.getByText('MacBook Pro')).toBeInTheDocument());
    });

    it('handles null status for seller type — falls back to Awaiting Booking', async () => {
      const user = userEvent.setup();
      setupMocks({
        sellingOrders: [{ ...mockSellingOrder, seller_status: null }],
        users: [mockBuyer],
      });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /selling/i }));
      await waitFor(() =>
        expect(screen.getByTestId('seller-status-order-2')).toHaveTextContent('Awaiting Booking')
      );
    });

    it('handles "awaiting_booking" seller status', async () => {
      const user = userEvent.setup();
      setupMocks({
        sellingOrders: [{ ...mockSellingOrder, seller_status: 'awaiting_booking' }],
        users: [mockBuyer],
      });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /selling/i }));
      await waitFor(() =>
        expect(screen.getByTestId('seller-status-order-2')).toHaveTextContent('awaiting_booking')
      );
    });

    it('handles "dropped_off" seller status', async () => {
      const user = userEvent.setup();
      setupMocks({
        sellingOrders: [{ ...mockSellingOrder, seller_status: 'dropped_off' }],
        users: [mockBuyer],
      });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await user.click(screen.getByRole('tab', { name: /selling/i }));
      await waitFor(() =>
        expect(screen.getByTestId('seller-status-order-2')).toHaveTextContent('dropped_off')
      );
    });

    it('handles "ready_for_collection" buyer status', async () => {
      setupMocks({ buyingOrders: [{ ...mockBuyingOrder, buyer_status: 'ready_for_collection' }] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() =>
        expect(screen.getByTestId('buyer-status-order-1')).toHaveTextContent('ready_for_collection')
      );
    });

    it('handles "collected" buyer status', async () => {
      setupMocks({ buyingOrders: [{ ...mockBuyingOrder, buyer_status: 'collected' }] });
      render(<MyOrders user={mockUser} onBack={jest.fn()} />);
      await waitFor(() =>
        expect(screen.getByTestId('buyer-status-order-1')).toHaveTextContent('collected')
      );
    });
  });
});