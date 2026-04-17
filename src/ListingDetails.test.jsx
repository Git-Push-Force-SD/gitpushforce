import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ListingDetails from './ListingDetails';
import { supabase } from './utils/supabase';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('./utils/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockListing = {
  id: '123',
  title: 'MacBook Pro 2021',
  description: 'Great condition laptop, barely used.',
  price: '15000',
  condition: 'Like New',
  category: 'Electronics',
  seller_id: 'seller-abc',
  image_path: 'images/macbook.jpg',
  created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
};

const mockSeller = {
  id: 'seller-abc',
  username: 'john_doe',
  email: 'john@example.com',
};

/** Builds a chainable Supabase query mock that resolves to { data, error } */
const buildSupabaseMock = (data, error = null) => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
  };
  return chain;
};

/** Renders the component with an in-memory router at /listings/:id */
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

    navigateMock = jest.fn();
    const { useNavigate } = require('react-router-dom');
    useNavigate.mockReturnValue(navigateMock);
  });

  // ── Loading state ────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('calls window.scrollTo(0, 0) on mount', async () => {
      supabase.from.mockReturnValue(buildSupabaseMock(mockListing));
      renderWithRouter();
      expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    });

    it('renders skeleton/pulse elements while fetching', () => {
      // Never resolve so we stay in loading state
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnValue(new Promise(() => {})),
      });

      renderWithRouter();
      // animate-pulse classes indicate skeleton loading
      const pulsingElements = document.querySelectorAll('.animate-pulse');
      expect(pulsingElements.length).toBeGreaterThan(0);
    });
  });

  // ── Successful fetch ──────────────────────────────────────────────────────

  describe('successful data fetch', () => {
    beforeEach(() => {
      supabase.from
        .mockReturnValueOnce(buildSupabaseMock(mockListing))  // listings query
        .mockReturnValueOnce(buildSupabaseMock(mockSeller));   // users query
    });

    it('renders the listing title', async () => {
      renderWithRouter();
      await waitFor(() =>
        expect(screen.getByText('MacBook Pro 2021')).toBeInTheDocument()
      );
    });

    it('renders the formatted price', async () => {
      renderWithRouter();
      // en-ZA locale uses a non-breaking space as thousands separator and comma as decimal
      // e.g. "R15 000,00" or "R15\u00a0000,00"
      await waitFor(() =>
        expect(screen.getByText(/R15[\s\u00a0]000,00/)).toBeInTheDocument()
      );
    });

    it('renders the listing condition badge', async () => {
      renderWithRouter();
      await waitFor(() =>
        expect(screen.getByText('Like New')).toBeInTheDocument()
      );
    });

    it('renders the listing description', async () => {
      renderWithRouter();
      await waitFor(() =>
        expect(screen.getByText('Great condition laptop, barely used.')).toBeInTheDocument()
      );
    });

    it('renders the category in specifications', async () => {
      renderWithRouter();
      await waitFor(() =>
        expect(screen.getByText('Electronics')).toBeInTheDocument()
      );
    });

    it('renders the seller username', async () => {
      renderWithRouter();
      await waitFor(() =>
        expect(screen.getByText('john_doe')).toBeInTheDocument()
      );
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
      await waitFor(() =>
        expect(screen.getByText(/Message Seller/i)).toBeInTheDocument()
      );
    });

    it('renders the "Buy / Offer" button', async () => {
      renderWithRouter();
      await waitFor(() =>
        expect(screen.getByText(/Buy \/ Offer/i)).toBeInTheDocument()
      );
    });

    it('renders the Campus Secure Guarantee section', async () => {
      renderWithRouter();
      await waitFor(() =>
        expect(screen.getByText(/Campus Secure/i)).toBeInTheDocument()
      );
    });
  });

  // ── Seller fallback to email prefix ──────────────────────────────────────

  describe('seller display name fallback', () => {
    it('falls back to email prefix when username is null', async () => {
      const sellerNoUsername = { ...mockSeller, username: null };
      supabase.from
        .mockReturnValueOnce(buildSupabaseMock(mockListing))
        .mockReturnValueOnce(buildSupabaseMock(sellerNoUsername));

      renderWithRouter();
      await waitFor(() =>
        expect(screen.getByText('john')).toBeInTheDocument()
      );
    });
  });

  // ── Missing image fallback ────────────────────────────────────────────────

  describe('image fallback', () => {
    it('uses the Unsplash fallback when image_path is null', async () => {
      const listingNoImage = { ...mockListing, image_path: null };
      supabase.from
        .mockReturnValueOnce(buildSupabaseMock(listingNoImage))
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
      supabase.from.mockReturnValueOnce(buildSupabaseMock(null, { message: 'Not found' }));

      renderWithRouter('nonexistent-id');
      await waitFor(() =>
        expect(screen.getByText(/Listing not found/i)).toBeInTheDocument()
      );
    });

    it('renders a "Go Back" link on the not-found screen', async () => {
      supabase.from.mockReturnValueOnce(buildSupabaseMock(null, { message: 'Not found' }));

      renderWithRouter('nonexistent-id');
      await waitFor(() =>
        expect(screen.getByText(/Go Back/i)).toBeInTheDocument()
      );
    });

    it('navigates back when "Go Back" is clicked on not-found screen', async () => {
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
      supabase.from
        .mockReturnValueOnce(buildSupabaseMock(mockListing))
        .mockReturnValueOnce(buildSupabaseMock(mockSeller));

      renderWithRouter();
      await waitFor(() => screen.getByText('MacBook Pro 2021'));

      const backBtn = screen.getByText(/Back to Electronics/i);
      fireEvent.click(backBtn);
      expect(navigateMock).toHaveBeenCalledWith(-1);
    });

    it('shows "Back to Listings" when category is absent', async () => {
      const listingNoCategory = { ...mockListing, category: null };
      supabase.from
        .mockReturnValueOnce(buildSupabaseMock(listingNoCategory))
        .mockReturnValueOnce(buildSupabaseMock(mockSeller));

      renderWithRouter();
      await waitFor(() =>
        expect(screen.getByText(/Back to Listings/i)).toBeInTheDocument()
      );
    });
  });

  // ── calculateTimeAgo ──────────────────────────────────────────────────────

  describe('calculateTimeAgo display', () => {
    const renderWithCreatedAt = (createdAt) => {
      const listing = { ...mockListing, created_at: createdAt };
      supabase.from
        .mockReturnValueOnce(buildSupabaseMock(listing))
        .mockReturnValueOnce(buildSupabaseMock(mockSeller));
      renderWithRouter();
    };

    it('shows "just now" for a very recent listing', async () => {
      renderWithCreatedAt(new Date().toISOString());
      await waitFor(() =>
        expect(screen.getByText(/just now/i)).toBeInTheDocument()
      );
    });

    it('shows minutes ago for a listing < 1 hour old', async () => {
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      renderWithCreatedAt(thirtyMinsAgo);
      await waitFor(() =>
        expect(screen.getByText(/30 mins ago/i)).toBeInTheDocument()
      );
    });

    it('shows hours ago for a listing < 24 hours old', async () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      renderWithCreatedAt(threeHoursAgo);
      await waitFor(() =>
        expect(screen.getByText(/3 hours ago/i)).toBeInTheDocument()
      );
    });

    it('shows days ago for a listing < 7 days old', async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      renderWithCreatedAt(threeDaysAgo);
      await waitFor(() =>
        expect(screen.getByText(/3 days ago/i)).toBeInTheDocument()
      );
    });

    it('shows a locale date string for listings older than 7 days', async () => {
      const oldDate = new Date('2024-01-01').toISOString();
      renderWithCreatedAt(oldDate);
      await waitFor(() => {
        // The component calls toLocaleDateString('en-ZA') which yields e.g. "2024/01/01"
        const timeEl = document.querySelector('.opacity-100');
        expect(timeEl).not.toBeNull();
      });
    });

    it('shows "unknown" for a null created_at', async () => {
      renderWithCreatedAt(null);
      await waitFor(() =>
        expect(screen.getByText(/unknown/i)).toBeInTheDocument()
      );
    });
  });

  // ── Supabase query wiring ─────────────────────────────────────────────────

  describe('Supabase query wiring', () => {
    it('queries the listings table with the route id', async () => {
      const listingChain = buildSupabaseMock(mockListing);
      const sellerChain = buildSupabaseMock(mockSeller);
      supabase.from
        .mockReturnValueOnce(listingChain)
        .mockReturnValueOnce(sellerChain);

      renderWithRouter('123');
      await waitFor(() => screen.getByText('MacBook Pro 2021'));

      expect(supabase.from).toHaveBeenCalledWith('listings');
      expect(listingChain.eq).toHaveBeenCalledWith('id', '123');
    });

    it('queries the users table with the seller_id from the listing', async () => {
      const listingChain = buildSupabaseMock(mockListing);
      const sellerChain = buildSupabaseMock(mockSeller);
      supabase.from
        .mockReturnValueOnce(listingChain)
        .mockReturnValueOnce(sellerChain);

      renderWithRouter('123');
      await waitFor(() => screen.getByText('john_doe'));

      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(sellerChain.eq).toHaveBeenCalledWith('id', 'seller-abc');
    });

    it('still renders the listing if the seller query fails', async () => {
      supabase.from
        .mockReturnValueOnce(buildSupabaseMock(mockListing))
        .mockReturnValueOnce(buildSupabaseMock(null, { message: 'User not found' }));

      renderWithRouter();
      await waitFor(() =>
        expect(screen.getByText('MacBook Pro 2021')).toBeInTheDocument()
      );
    });

    it('handles an unexpected thrown error without crashing', async () => {
      supabase.from.mockImplementation(() => {
        throw new Error('Network failure');
      });

      // Should not throw – the catch block calls setLoading(false)
      expect(() => renderWithRouter()).not.toThrow();
    });
  });

  // ── Price formatting ──────────────────────────────────────────────────────

  describe('price formatting', () => {
    it('shows R---.-- placeholder when price is null', async () => {
      const listingNoPrice = { ...mockListing, price: null };
      supabase.from
        .mockReturnValueOnce(buildSupabaseMock(listingNoPrice))
        .mockReturnValueOnce(buildSupabaseMock(mockSeller));

      renderWithRouter();
      await waitFor(() =>
        expect(screen.getByText('R---.--')).toBeInTheDocument()
      );
    });

    it('formats integer prices with two decimal places', async () => {
      const listing = { ...mockListing, price: '500' };
      supabase.from
        .mockReturnValueOnce(buildSupabaseMock(listing))
        .mockReturnValueOnce(buildSupabaseMock(mockSeller));

      renderWithRouter();
      await waitFor(() =>
        expect(screen.getByText(/R500,00/)).toBeInTheDocument()
      );
    });
  });
});
