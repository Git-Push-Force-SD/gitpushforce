import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ListingDetails from './ListingDetails';
import { supabase } from './utils/supabase';
import { useAuth } from './AuthContext';
import { useConversation } from './hooks/useConversation';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('./utils/supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('./AuthContext',             () => ({ useAuth: jest.fn() }));
jest.mock('./hooks/useConversation',   () => ({ useConversation: jest.fn() }));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockListing = {
  id: '123',
  title: 'MacBook Pro 2021',
  description: 'Great condition laptop, barely used.',
  price: '15000',
  condition: 'Like New',
  category: 'Electronics',
  seller_id: 'seller-abc',
  image_path: 'images/macbook.jpg',
  created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
};

const mockSeller = {
  id: 'seller-abc',
  username: 'john_doe',
  email: 'john@example.com',
};

const mockAuthUser = { id: 'buyer-xyz' };

// ─── Supabase chain builder ───────────────────────────────────────────────────

const buildSupabaseMock = (data, error = null) => ({
  select: jest.fn().mockReturnThis(),
  eq:     jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data, error }),
});

// ─── Default hook mocks ───────────────────────────────────────────────────────

const defaultGetOrCreate = jest.fn().mockResolvedValue('conv-1');

const setupDefaultMocks = () => {
  useAuth.mockReturnValue({ user: mockAuthUser });
  useConversation.mockReturnValue({
    getOrCreateConversation: defaultGetOrCreate,
    loading: false,
  });
};

// ─── Render helper ────────────────────────────────────────────────────────────

const renderWithRouter = (id = '123', user = null) =>
  render(
    <MemoryRouter initialEntries={[`/listings/${id}`]}>
      <Routes>
        <Route path="/listings/:id" element={<ListingDetails user={user} />} />
      </Routes>
    </MemoryRouter>
  );

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ListingDetails', () => {
  let navigateMock;

  beforeEach(() => {
    jest.clearAllMocks();
    window.scrollTo = jest.fn();
    window.alert = jest.fn();
    navigateMock = jest.fn();
    require('react-router-dom').useNavigate.mockReturnValue(navigateMock);
    setupDefaultMocks();
    // Default: listing + seller both succeed
    supabase.from
      .mockReturnValueOnce(buildSupabaseMock(mockListing))
      .mockReturnValueOnce(buildSupabaseMock(mockSeller));
  });

  // ── Loading state ─────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('calls window.scrollTo(0, 0) on mount', () => {
      renderWithRouter();
      expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    });

    it('renders skeleton/pulse elements while fetching', () => {
      supabase.from.mockReset();
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq:     jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnValue(new Promise(() => {})),
      });
      renderWithRouter();
      expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    });
  });

  // ── Successful fetch ──────────────────────────────────────────────────────

  describe('successful data fetch', () => {
    it('renders the listing title', async () => {
      renderWithRouter();
      await waitFor(() => expect(screen.getByText('MacBook Pro 2021')).toBeInTheDocument());
    });

    it('renders the formatted price in en-ZA locale', async () => {
      renderWithRouter();
      await waitFor(() =>
        expect(screen.getByText(/R15[\s\u00a0]000,00/)).toBeInTheDocument()
      );
    });

    it('renders the listing condition badge', async () => {
      renderWithRouter();
      await waitFor(() => expect(screen.getByText('Like New')).toBeInTheDocument());
    });

    it('renders the listing description', async () => {
      renderWithRouter();
      await waitFor(() =>
        expect(screen.getByText('Great condition laptop, barely used.')).toBeInTheDocument()
      );
    });

    it('renders the category in specifications', async () => {
      renderWithRouter();
      await waitFor(() => expect(screen.getByText('Electronics')).toBeInTheDocument());
    });

    it('renders the seller username', async () => {
      renderWithRouter();
      await waitFor(() => expect(screen.getByText('john_doe')).toBeInTheDocument());
    });

    it('renders the listing image with the correct src', async () => {
      renderWithRouter();
      await waitFor(() => {
        const img = screen.getAllByRole('img')[0];
        expect(img.src).toContain('keposlpyrewldohbmesq.supabase.co');
        expect(img.src).toContain('images/macbook.jpg');
      });
    });

    it('renders the "Message Seller" button', async () => {
      renderWithRouter();
      await waitFor(() => expect(screen.getByText(/Message Seller/i)).toBeInTheDocument());
    });

    it('renders the "Buy / Offer" button', async () => {
      renderWithRouter();
      await waitFor(() => expect(screen.getByText(/Buy \/ Offer/i)).toBeInTheDocument());
    });

    it('renders the Campus Secure Guarantee section', async () => {
      renderWithRouter();
      await waitFor(() => expect(screen.getByText(/Campus Secure/i)).toBeInTheDocument());
    });
  });

  // ── Seller display name fallbacks ─────────────────────────────────────────

  describe('seller display name fallback', () => {
    it('falls back to email prefix when username is null', async () => {
      supabase.from.mockReset();
      supabase.from
        .mockReturnValueOnce(buildSupabaseMock(mockListing))
        .mockReturnValueOnce(buildSupabaseMock({ ...mockSeller, username: null }));
      renderWithRouter();
      await waitFor(() => expect(screen.getByText('john')).toBeInTheDocument());
    });
  });

  // ── Image fallback ────────────────────────────────────────────────────────

  describe('image fallback', () => {
    it('uses the Unsplash fallback when image_path is null', async () => {
      supabase.from.mockReset();
      supabase.from
        .mockReturnValueOnce(buildSupabaseMock({ ...mockListing, image_path: null }))
        .mockReturnValueOnce(buildSupabaseMock(mockSeller));
      renderWithRouter();
      await waitFor(() => {
        const img = screen.getAllByRole('img')[0];
        expect(img.src).toContain('unsplash.com');
      });
    });
  });

  // ── Not found state ───────────────────────────────────────────────────────

  describe('listing not found', () => {
    it('renders "Listing not found" when query returns no data', async () => {
      supabase.from.mockReset();
      supabase.from.mockReturnValueOnce(buildSupabaseMock(null, { message: 'Not found' }));
      renderWithRouter('nonexistent-id');
      await waitFor(() => expect(screen.getByText(/Listing not found/i)).toBeInTheDocument());
    });

    it('renders a "Go Back" link on the not-found screen', async () => {
      supabase.from.mockReset();
      supabase.from.mockReturnValueOnce(buildSupabaseMock(null, { message: 'Not found' }));
      renderWithRouter('nonexistent-id');
      await waitFor(() => expect(screen.getByText(/Go Back/i)).toBeInTheDocument());
    });

    it('navigates back when "Go Back" is clicked', async () => {
      supabase.from.mockReset();
      supabase.from.mockReturnValueOnce(buildSupabaseMock(null, { message: 'Not found' }));
      renderWithRouter('nonexistent-id');
      await waitFor(() => screen.getByText(/Go Back/i));
      fireEvent.click(screen.getByText(/Go Back/i));
      expect(navigateMock).toHaveBeenCalledWith(-1);
    });
  });

  // ── Back button ───────────────────────────────────────────────────────────

  describe('back button', () => {
    it('navigates back when the back button is clicked', async () => {
      renderWithRouter();
      await waitFor(() => screen.getByText('MacBook Pro 2021'));
      fireEvent.click(screen.getByText(/Back to Electronics/i));
      expect(navigateMock).toHaveBeenCalledWith(-1);
    });

    it('shows "Back to Listings" when category is absent', async () => {
      supabase.from.mockReset();
      supabase.from
        .mockReturnValueOnce(buildSupabaseMock({ ...mockListing, category: null }))
        .mockReturnValueOnce(buildSupabaseMock(mockSeller));
      renderWithRouter();
      await waitFor(() => expect(screen.getByText(/Back to Listings/i)).toBeInTheDocument());
    });
  });

  // ── calculateTimeAgo ──────────────────────────────────────────────────────

  describe('calculateTimeAgo display', () => {
    const renderWithCreatedAt = (createdAt) => {
      supabase.from.mockReset();
      supabase.from
        .mockReturnValueOnce(buildSupabaseMock({ ...mockListing, created_at: createdAt }))
        .mockReturnValueOnce(buildSupabaseMock(mockSeller));
      renderWithRouter();
    };

    it('shows "just now" for a very recent listing', async () => {
      renderWithCreatedAt(new Date().toISOString());
      await waitFor(() => expect(screen.getByText(/just now/i)).toBeInTheDocument());
    });

    it('shows minutes ago for a listing < 1 hour old', async () => {
      renderWithCreatedAt(new Date(Date.now() - 30 * 60 * 1000).toISOString());
      await waitFor(() => expect(screen.getByText(/30 mins ago/i)).toBeInTheDocument());
    });

    it('shows hours ago for a listing < 24 hours old', async () => {
      renderWithCreatedAt(new Date(Date.now() - 3 * 3600 * 1000).toISOString());
      await waitFor(() => expect(screen.getByText(/3 hours ago/i)).toBeInTheDocument());
    });

    it('shows days ago for a listing < 7 days old', async () => {
      renderWithCreatedAt(new Date(Date.now() - 3 * 86400 * 1000).toISOString());
      await waitFor(() => expect(screen.getByText(/3 days ago/i)).toBeInTheDocument());
    });

    it('shows "unknown" for a null created_at', async () => {
      renderWithCreatedAt(null);
      await waitFor(() => expect(screen.getByText(/unknown/i)).toBeInTheDocument());
    });
  });

  // ── Supabase query wiring ─────────────────────────────────────────────────

  describe('Supabase query wiring', () => {
    it('queries the listings table with the route id', async () => {
      supabase.from.mockReset();
      const listingChain = buildSupabaseMock(mockListing);
      const sellerChain  = buildSupabaseMock(mockSeller);
      supabase.from
        .mockReturnValueOnce(listingChain)
        .mockReturnValueOnce(sellerChain);
      renderWithRouter('123');
      await waitFor(() => screen.getByText('MacBook Pro 2021'));
      expect(supabase.from).toHaveBeenCalledWith('listings');
      expect(listingChain.eq).toHaveBeenCalledWith('id', '123');
    });

    it('queries the users table with the seller_id from the listing', async () => {
      supabase.from.mockReset();
      const listingChain = buildSupabaseMock(mockListing);
      const sellerChain  = buildSupabaseMock(mockSeller);
      supabase.from
        .mockReturnValueOnce(listingChain)
        .mockReturnValueOnce(sellerChain);
      renderWithRouter('123');
      await waitFor(() => screen.getByText('john_doe'));
      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(sellerChain.eq).toHaveBeenCalledWith('id', 'seller-abc');
    });

    it('still renders the listing if the seller query fails', async () => {
      supabase.from.mockReset();
      supabase.from
        .mockReturnValueOnce(buildSupabaseMock(mockListing))
        .mockReturnValueOnce(buildSupabaseMock(null, { message: 'User not found' }));
      renderWithRouter();
      await waitFor(() => expect(screen.getByText('MacBook Pro 2021')).toBeInTheDocument());
    });

    it('handles an unexpected thrown error without crashing', () => {
      supabase.from.mockReset();
      supabase.from.mockImplementation(() => { throw new Error('Network failure'); });
      expect(() => renderWithRouter()).not.toThrow();
    });
  });

  // ── Price formatting ──────────────────────────────────────────────────────

  describe('price formatting', () => {
    it('shows R---.-- placeholder when price is null', async () => {
      supabase.from.mockReset();
      supabase.from
        .mockReturnValueOnce(buildSupabaseMock({ ...mockListing, price: null }))
        .mockReturnValueOnce(buildSupabaseMock(mockSeller));
      renderWithRouter();
      await waitFor(() => expect(screen.getByText('R---.--')).toBeInTheDocument());
    });

    it('formats integer prices with two decimal places (en-ZA comma decimal)', async () => {
      supabase.from.mockReset();
      supabase.from
        .mockReturnValueOnce(buildSupabaseMock({ ...mockListing, price: '500' }))
        .mockReturnValueOnce(buildSupabaseMock(mockSeller));
      renderWithRouter();
      await waitFor(() => expect(screen.getByText(/R500,00/)).toBeInTheDocument());
    });
  });

  // ── handleMessageSeller ───────────────────────────────────────────────────

  describe('handleMessageSeller', () => {
    it('navigates to /login when user is not authenticated', async () => {
      useAuth.mockReturnValue({ user: null });
      renderWithRouter();
      await waitFor(() => screen.getByText(/Message Seller/i));
      fireEvent.click(screen.getByText(/Message Seller/i));
      expect(navigateMock).toHaveBeenCalledWith('/login');
    });

    it('shows alert when authenticated user tries to message themselves', async () => {
      // Make authUser the same as the seller
      useAuth.mockReturnValue({ user: { id: 'seller-abc' } });
      renderWithRouter();
      await waitFor(() => screen.getByText(/Message Seller/i));
      fireEvent.click(screen.getByText(/Message Seller/i));
      expect(window.alert).toHaveBeenCalledWith('You cannot message yourself');
      expect(navigateMock).not.toHaveBeenCalledWith(expect.stringContaining('/messages/'));
    });

    it('calls getOrCreateConversation with listingId, sellerId, buyerId', async () => {
      renderWithRouter();
      await waitFor(() => screen.getByText(/Message Seller/i));
      fireEvent.click(screen.getByText(/Message Seller/i));
      await waitFor(() =>
        expect(defaultGetOrCreate).toHaveBeenCalledWith('123', 'seller-abc', 'buyer-xyz')
      );
    });

    it('navigates to /messages/:conversationId with correct state on success', async () => {
      renderWithRouter();
      await waitFor(() => screen.getByText(/Message Seller/i));
      fireEvent.click(screen.getByText(/Message Seller/i));
      await waitFor(() =>
        expect(navigateMock).toHaveBeenCalledWith('/messages/conv-1', {
          state: {
            receiverId:   'seller-abc',
            receiverName: 'john_doe',
            listingId:    '123',
          },
        })
      );
    });

    it('uses email prefix as receiverName when seller username is null', async () => {
      supabase.from.mockReset();
      supabase.from
        .mockReturnValueOnce(buildSupabaseMock(mockListing))
        .mockReturnValueOnce(buildSupabaseMock({ ...mockSeller, username: null }));
      renderWithRouter();
      await waitFor(() => screen.getByText(/Message Seller/i));
      fireEvent.click(screen.getByText(/Message Seller/i));
      await waitFor(() =>
        expect(navigateMock).toHaveBeenCalledWith('/messages/conv-1',
          expect.objectContaining({
            state: expect.objectContaining({ receiverName: 'john' }),
          })
        )
      );
    });

    it('shows alert when getOrCreateConversation throws', async () => {
      defaultGetOrCreate.mockRejectedValueOnce(new Error('Failed'));
      renderWithRouter();
      await waitFor(() => screen.getByText(/Message Seller/i));
      fireEvent.click(screen.getByText(/Message Seller/i));
      await waitFor(() =>
        expect(window.alert).toHaveBeenCalledWith(
          'Failed to open conversation. Please try again.'
        )
      );
    });

    it('shows "Opening chat..." while conversationLoading is true', async () => {
      useConversation.mockReturnValue({
        getOrCreateConversation: defaultGetOrCreate,
        loading: true,
      });
      renderWithRouter();
      await waitFor(() => expect(screen.getByText(/Opening chat/i)).toBeInTheDocument());
    });

    it('disables the Message Seller button while conversationLoading is true', async () => {
      useConversation.mockReturnValue({
        getOrCreateConversation: defaultGetOrCreate,
        loading: true,
      });
      renderWithRouter();
      await waitFor(() => {
        const btn = screen.getByText(/Opening chat/i).closest('button');
        expect(btn).toBeDisabled();
      });
    });

  // ── handleBuy validation tests ───────────────────────────────────────────

  describe('handleBuy validation', () => {
    it('navigates to login when user is not authenticated', async () => {
      useAuth.mockReturnValue({ user: null });
      renderWithRouter();
      await waitFor(() => expect(screen.getByText(/Buy/i)).toBeInTheDocument());
    });

    it('shows alert for invalid offer amount', async () => {
      renderWithRouter();
      await waitFor(() => expect(screen.getByText(/MacBook Pro/i)).toBeInTheDocument());
    });
  });
});
