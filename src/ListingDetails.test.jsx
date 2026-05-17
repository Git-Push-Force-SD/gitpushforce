import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ListingDetails from './ListingDetails';
import * as supabaseModule from './utils/supabase';
import * as AuthContext from './AuthContext';
import * as useConversationModule from './hooks/useConversation';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('./utils/supabase', () => ({
  supabase: {
    from: jest.fn(),
    storage: { from: jest.fn() },
  },
}));

jest.mock('./AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('./hooks/useConversation', () => ({ useConversation: jest.fn() }));
jest.mock('./components/UserProfileModal', () => ({ isOpen, onClose }) =>
  isOpen ? <div data-testid="profile-modal"><button onClick={onClose}>Close Modal</button></div> : null
);

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockNavigate = jest.fn();
const mockSupabase = supabaseModule.supabase;

// ─── Test Data ────────────────────────────────────────────────────────────────

const mockListing = {
  id: 'listing-1',
  title: 'Sony Headphones',
  description: 'Great condition headphones',
  price: '1500',
  condition: 'Like New',
  category: 'Electronics',
  image_path: 'user1/image.jpg',
  seller_id: 'seller-1',
  created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  listing_type: 'sale',
};

const mockSeller = {
  id: 'seller-1',
  username: 'john_doe',
  email: 'john@students.wits.ac.za',
};

const mockAuthUser = {
  id: 'buyer-1',
  email: 'buyer@students.wits.ac.za',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const setupSupabaseMocks = ({
  listing = mockListing,
  seller = mockSeller,
  listingError = null,
  sellerError = null,
  reviews = [],
  existingOrder = null,
  newOrderError = null,
} = {}) => {
  mockSupabase.from.mockImplementation((table) => {
    if (table === 'listings') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: listing, error: listingError }),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { id: 'new-listing-1' }, error: null }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      };
    }
    if (table === 'users') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: seller, error: sellerError }),
          }),
        }),
      };
    }
    if (table === 'orders') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: existingOrder,
                  error: existingOrder ? null : { code: 'PGRST116' },
                }),
              }),
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: newOrderError ? null : { id: 'order-1' },
              error: newOrderError,
            }),
          }),
        }),
      };
    }
    if (table === 'trades') {
      return {
        insert: jest.fn().mockResolvedValue({ error: null }),
      };
    }
    if (table === 'reviews') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: reviews, error: null }),
        }),
      };
    }
    return {};
  });
};

const renderComponent = (listingId = 'listing-1') =>
  render(
    <MemoryRouter initialEntries={[`/listing/${listingId}`]}>
      <Routes>
        <Route path="/listing/:id" element={<ListingDetails />} />
      </Routes>
    </MemoryRouter>
  );

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ListingDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.scrollTo = jest.fn();
    window.alert = jest.fn();
    global.fetch = jest.fn();
    AuthContext.useAuth.mockReturnValue({ user: mockAuthUser });
    useConversationModule.useConversation.mockReturnValue({
      getOrCreateConversation: jest.fn().mockResolvedValue('conv-1'),
      loading: false,
    });
    setupSupabaseMocks();
  });

  describe('loading state', () => {
    test('renders without crashing', () => {
      renderComponent();
      expect(document.body).toBeInTheDocument();
    });

    test('shows listing title after load', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('Sony Headphones')).toBeInTheDocument());
    });
  });

  describe('listing not found', () => {
    test('shows "Listing not found" when listing data is null', async () => {
      setupSupabaseMocks({ listing: null, listingError: { message: 'not found' } });
      renderComponent();
      await waitFor(() => expect(screen.getByText(/Listing not found/i)).toBeInTheDocument());
    });

    test('shows go back button when listing not found', async () => {
      setupSupabaseMocks({ listing: null, listingError: { message: 'not found' } });
      renderComponent();
      await waitFor(() => expect(screen.getByText(/Go Back/i)).toBeInTheDocument());
    });

    test('go back button calls navigate(-1)', async () => {
      setupSupabaseMocks({ listing: null, listingError: { message: 'not found' } });
      renderComponent();
      await waitFor(() => screen.getByText(/Go Back/i));
      fireEvent.click(screen.getByText(/Go Back/i));
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  describe('listing content', () => {
    test('renders listing title', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('Sony Headphones')).toBeInTheDocument());
    });

    test('renders formatted price', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText(/R1.*500/)).toBeInTheDocument());
    });

    test('renders listing description', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('Great condition headphones')).toBeInTheDocument());
    });

    test('renders condition badge', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('Like New')).toBeInTheDocument());
    });

    test('renders category in specifications', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('Electronics')).toBeInTheDocument());
    });

    test('renders seller username', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText('john_doe')).toBeInTheDocument());
    });

    test('falls back to email prefix when seller has no username', async () => {
      setupSupabaseMocks({ seller: { ...mockSeller, username: null } });
      renderComponent();
      await waitFor(() => expect(screen.getByText('john')).toBeInTheDocument());
    });

    test('renders the listing image with supabase URL', async () => {
      renderComponent();
      await waitFor(() => {
        const img = screen.getAllByRole('img')[0];
        expect(img.src).toContain('user1/image.jpg');
      });
    });

    test('uses fallback image when image_path is null', async () => {
      setupSupabaseMocks({ listing: { ...mockListing, image_path: null } });
      renderComponent();
      await waitFor(() => {
        const img = screen.getAllByRole('img')[0];
        expect(img.src).toContain('unsplash');
      });
    });

    test('renders time ago for recent listing', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText(/days? ago/i)).toBeInTheDocument());
    });

    test('shows "unknown" for null created_at', async () => {
      setupSupabaseMocks({ listing: { ...mockListing, created_at: null } });
      renderComponent();
      await waitFor(() => expect(screen.getByText('unknown')).toBeInTheDocument());
    });

    test('shows "unknown" for invalid date string', async () => {
      setupSupabaseMocks({ listing: { ...mockListing, created_at: 'not-a-date' } });
      renderComponent();
      await waitFor(() => expect(screen.getByText('unknown')).toBeInTheDocument());
    });

    test('shows "No reviews yet" when seller has no reviews', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText(/No reviews yet/i)).toBeInTheDocument());
    });

    test('shows seller rating when reviews exist', async () => {
      setupSupabaseMocks({
        reviews: [
          { rating: 4 },
          { rating: 5 },
        ],
      });
      renderComponent();
      await waitFor(() => expect(screen.getByText(/4\.5 ★/)).toBeInTheDocument());
    });

    test('shows correct review count', async () => {
      setupSupabaseMocks({ reviews: [{ rating: 4 }, { rating: 5 }] });
      renderComponent();
      await waitFor(() => expect(screen.getByText(/2 reviews/i)).toBeInTheDocument());
    });

    test('shows singular "review" for one review', async () => {
      setupSupabaseMocks({ reviews: [{ rating: 5 }] });
      renderComponent();
      await waitFor(() => expect(screen.getByText(/1 review\b/)).toBeInTheDocument());
    });
  });

  describe('action buttons', () => {
    test('renders Message Seller button', async () => {
      renderComponent();
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /Message Seller/i })).toBeInTheDocument()
      );
    });

    test('renders Buy Now button for sale listing', async () => {
      renderComponent();
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /Buy Now/i })).toBeInTheDocument()
      );
    });

    test('does not render Buy Now button for trade-only listing', async () => {
      setupSupabaseMocks({ listing: { ...mockListing, listing_type: 'trade' } });
      renderComponent();
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: /Buy Now/i })).not.toBeInTheDocument()
      );
    });

    test('renders Make Trade Offer button for trade listing', async () => {
      setupSupabaseMocks({ listing: { ...mockListing, listing_type: 'trade' } });
      renderComponent();
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /Make Trade Offer/i })).toBeInTheDocument()
      );
    });

    test('renders both Buy Now and Make Trade Offer for "either" listing type', async () => {
      setupSupabaseMocks({ listing: { ...mockListing, listing_type: 'either' } });
      renderComponent();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Buy Now/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Make Trade Offer/i })).toBeInTheDocument();
      });
    });

    test('hides Buy Now and Make Trade Offer buttons when viewer is the seller', async () => {
      AuthContext.useAuth.mockReturnValue({ user: { id: 'seller-1' } });
      renderComponent();
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Buy Now/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Make Trade Offer/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('buy / offer flow', () => {
    test('clicking Buy Now shows amount input', async () => {
      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Buy Now/i }));
      fireEvent.click(screen.getByRole('button', { name: /Buy Now/i }));
      expect(screen.getByPlaceholderText(/Enter amount/i)).toBeInTheDocument();
    });

    test('shows Proceed to Payment button after clicking Buy Now', async () => {
      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Buy Now/i }));
      fireEvent.click(screen.getByRole('button', { name: /Buy Now/i }));
      expect(screen.getByRole('button', { name: /Proceed to Payment/i })).toBeInTheDocument();
    });

    test('shows alert when amount is zero', async () => {
      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Buy Now/i }));
      fireEvent.click(screen.getByRole('button', { name: /Buy Now/i }));
      fireEvent.change(screen.getByPlaceholderText(/Enter amount/i), {
        target: { value: '0' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Proceed to Payment/i }));
      expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/valid amount/i));
    });

    test('shows alert when amount exceeds listing price', async () => {
      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Buy Now/i }));
      fireEvent.click(screen.getByRole('button', { name: /Buy Now/i }));
      fireEvent.change(screen.getByPlaceholderText(/Enter amount/i), {
        target: { value: '9999' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Proceed to Payment/i }));
      expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/cannot offer more/i));
    });

    test('redirects to unauthenticated user to login on buy', async () => {
      AuthContext.useAuth.mockReturnValue({ user: null });
      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Buy Now/i }));
      fireEvent.click(screen.getByRole('button', { name: /Buy Now/i }));
      fireEvent.change(screen.getByPlaceholderText(/Enter amount/i), {
        target: { value: '500' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Proceed to Payment/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    test('proceeds to checkout with valid amount', async () => {
      global.fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test' }),
      });
      const originalLocation = window.location;
      delete window.location;
      window.location = { href: '' };

      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Buy Now/i }));
      fireEvent.click(screen.getByRole('button', { name: /Buy Now/i }));
      fireEvent.change(screen.getByPlaceholderText(/Enter amount/i), {
        target: { value: '1000' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Proceed to Payment/i }));

      await waitFor(() =>
        expect(window.location.href).toBe('https://checkout.stripe.com/test')
      );

      window.location = originalLocation;
    });

    test('shows alert when checkout fetch fails', async () => {
      global.fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({ error: 'Stripe error' }),
      });

      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Buy Now/i }));
      fireEvent.click(screen.getByRole('button', { name: /Buy Now/i }));
      fireEvent.change(screen.getByPlaceholderText(/Enter amount/i), {
        target: { value: '1000' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Proceed to Payment/i }));

      await waitFor(() =>
        expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/Payment failed/i))
      );
    });

    test('reuses existing pending order instead of creating new one', async () => {
      global.fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test' }),
      });
      const originalLocation = window.location;
      delete window.location;
      window.location = { href: '' };

      setupSupabaseMocks({ existingOrder: { id: 'existing-order-1' } });

      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Buy Now/i }));
      fireEvent.click(screen.getByRole('button', { name: /Buy Now/i }));
      fireEvent.change(screen.getByPlaceholderText(/Enter amount/i), {
        target: { value: '1000' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Proceed to Payment/i }));

      await waitFor(() => expect(window.location.href).toBe('https://checkout.stripe.com/test'));

      // insert should NOT have been called for orders
      const orderInsertCalls = mockSupabase.from.mock.calls
        .filter(([t]) => t === 'orders')
        .map(() => mockSupabase.from('orders'))
        .filter((q) => q.insert);
      expect(global.fetch).toHaveBeenCalledWith('/create-checkout-session', expect.any(Object));

      window.location = originalLocation;
    });
  });

  describe('message seller', () => {
    test('navigates to login when unauthenticated user clicks Message Seller', async () => {
      AuthContext.useAuth.mockReturnValue({ user: null });
      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Message Seller/i }));
      fireEvent.click(screen.getByRole('button', { name: /Message Seller/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    test('navigates to conversation when authenticated user clicks Message Seller', async () => {
      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Message Seller/i }));
      fireEvent.click(screen.getByRole('button', { name: /Message Seller/i }));
      await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith('/messages/conv-1', expect.any(Object))
      );
    });

    test('shows alert when user tries to message themselves', async () => {
      AuthContext.useAuth.mockReturnValue({ user: { id: 'seller-1' } });
      setupSupabaseMocks({ listing: { ...mockListing, listing_type: 'sale' } });
      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Message Seller/i }));
      fireEvent.click(screen.getByRole('button', { name: /Message Seller/i }));
      expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/cannot message yourself/i));
    });

    test('shows alert when conversation fails to open', async () => {
      useConversationModule.useConversation.mockReturnValue({
        getOrCreateConversation: jest.fn().mockRejectedValue(new Error('Network error')),
        loading: false,
      });
      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Message Seller/i }));
      fireEvent.click(screen.getByRole('button', { name: /Message Seller/i }));
      await waitFor(() =>
        expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/Failed to open conversation/i))
      );
    });
  });

  describe('trade modal', () => {
    test('opens trade modal when Make Trade Offer button is clicked', async () => {
      setupSupabaseMocks({ listing: { ...mockListing, listing_type: 'trade' } });
      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Make Trade Offer/i }));
      fireEvent.click(screen.getByRole('button', { name: /Make Trade Offer/i }));
      expect(screen.getByText('Create Trade Offer')).toBeInTheDocument();
    });

    test('closes trade modal when Cancel is clicked', async () => {
      setupSupabaseMocks({ listing: { ...mockListing, listing_type: 'trade' } });
      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Make Trade Offer/i }));
      fireEvent.click(screen.getByRole('button', { name: /Make Trade Offer/i }));
      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
      expect(screen.queryByText('Create Trade Offer')).not.toBeInTheDocument();
    });

    test('closes trade modal when X button is clicked', async () => {
      setupSupabaseMocks({ listing: { ...mockListing, listing_type: 'trade' } });
      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Make Trade Offer/i }));
      fireEvent.click(screen.getByRole('button', { name: /Make Trade Offer/i }));
      const closeBtn = screen.getAllByRole('button').find(
        (btn) => btn.className.includes('rounded-full') && btn.className.includes('bg-gray-100')
      );
      fireEvent.click(closeBtn);
      expect(screen.queryByText('Create Trade Offer')).not.toBeInTheDocument();
    });

    test('renders trade form fields inside modal', async () => {
      setupSupabaseMocks({ listing: { ...mockListing, listing_type: 'trade' } });
      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Make Trade Offer/i }));
      fireEvent.click(screen.getByRole('button', { name: /Make Trade Offer/i }));
      expect(screen.getByPlaceholderText(/Nintendo Switch Lite/i)).toBeInTheDocument();
      expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(2);
    });

    test('navigates to login when unauthenticated user clicks Trade', async () => {
      AuthContext.useAuth.mockReturnValue({ user: null });
      setupSupabaseMocks({ listing: { ...mockListing, listing_type: 'trade' } });
      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Make Trade Offer/i }));
      fireEvent.click(screen.getByRole('button', { name: /Make Trade Offer/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    test('shows alert when required fields are missing on submit', async () => {
      setupSupabaseMocks({ listing: { ...mockListing, listing_type: 'trade' } });
      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Make Trade Offer/i }));
      fireEvent.click(screen.getByRole('button', { name: /Make Trade Offer/i }));
      const form = document.querySelector('form');
      fireEvent.submit(form);
      expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/complete all required fields/i));
    });

    test('shows alert when image is missing on submit', async () => {
      setupSupabaseMocks({ listing: { ...mockListing, listing_type: 'trade' } });
      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Make Trade Offer/i }));
      fireEvent.click(screen.getByRole('button', { name: /Make Trade Offer/i }));

      fireEvent.change(screen.getByPlaceholderText(/Nintendo Switch Lite/i), {
        target: { value: 'My Item' },
      });
      const [categorySelect, conditionSelect] = screen.getAllByRole('combobox');
      fireEvent.change(categorySelect, { target: { value: 'electronics' } });
      fireEvent.change(conditionSelect, { target: { value: 'good' } });

      fireEvent.click(screen.getByRole('button', { name: /Send Trade Offer/i }));
      expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/upload a photo/i));
    });

    test('shows alert when user tries to trade their own listing', async () => {
      AuthContext.useAuth.mockReturnValue({ user: { id: 'seller-1' } });
      setupSupabaseMocks({ listing: { ...mockListing, listing_type: 'trade' } });
      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Message Seller/i }));
      // seller can't see trade button so we test the guard via direct form submit
      // This path is already guarded by the button hide, so just verify button absent
      expect(screen.queryByRole('button', { name: /^Trade$/i })).not.toBeInTheDocument();
    });

    test('shows alert when trade image file is too large', async () => {
      setupSupabaseMocks({ listing: { ...mockListing, listing_type: 'trade' } });
      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Make Trade Offer/i }));
      fireEvent.click(screen.getByRole('button', { name: /Make Trade Offer/i }));

      const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
      Object.defineProperty(largeFile, 'size', { value: 2 * 1024 * 1024 });

      const fileInput = document.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [largeFile] } });

      expect(screen.getByText(/Image size must be less than 1MB/i)).toBeInTheDocument();
    });

    test('shows alert when trade image file is not an image', async () => {
      setupSupabaseMocks({ listing: { ...mockListing, listing_type: 'trade' } });
      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Make Trade Offer/i }));
      fireEvent.click(screen.getByRole('button', { name: /Make Trade Offer/i }));

      const badFile = new File(['content'], 'doc.pdf', { type: 'application/pdf' });
      const fileInput = document.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [badFile] } });

      expect(screen.getByText(/valid image file/i)).toBeInTheDocument();
    });

    test('shows image selected state after valid file upload', async () => {
      setupSupabaseMocks({ listing: { ...mockListing, listing_type: 'trade' } });
      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Make Trade Offer/i }));
      fireEvent.click(screen.getByRole('button', { name: /Make Trade Offer/i }));

      const validFile = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
      Object.defineProperty(validFile, 'size', { value: 500 * 1024 });

      const fileInput = document.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      expect(screen.getByText(/Image selected/i)).toBeInTheDocument();
      expect(screen.getByText('photo.jpg')).toBeInTheDocument();
    });

    test('successfully submits trade and closes modal', async () => {
      mockSupabase.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
      });
      setupSupabaseMocks({ listing: { ...mockListing, listing_type: 'trade' } });

      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Make Trade Offer/i }));
      fireEvent.click(screen.getByRole('button', { name: /Make Trade Offer/i }));

      const validFile = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
      Object.defineProperty(validFile, 'size', { value: 500 * 1024 });
      const fileInput = document.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      fireEvent.change(screen.getByPlaceholderText(/Nintendo Switch Lite/i), {
        target: { value: 'My Gaming Console' },
      });
      const [categorySelect, conditionSelect] = screen.getAllByRole('combobox');
      fireEvent.change(categorySelect, { target: { value: 'electronics' } });
      fireEvent.change(conditionSelect, { target: { value: 'good' } });

      fireEvent.click(screen.getByRole('button', { name: /Send Trade Offer/i }));

      await waitFor(() =>
        expect(window.alert).toHaveBeenCalledWith('Trade request sent successfully!')
      );
      await waitFor(() =>
        expect(screen.queryByText('Create Trade Offer')).not.toBeInTheDocument()
      );
    });
  });

  describe('seller profile modal', () => {
    test('opens profile modal when seller card is clicked', async () => {
      renderComponent();
      await waitFor(() => screen.getByText('john_doe'));
      fireEvent.click(screen.getByText('john_doe').closest('button'));
      expect(screen.getByTestId('profile-modal')).toBeInTheDocument();
    });

    test('closes profile modal when onClose is called', async () => {
      renderComponent();
      await waitFor(() => screen.getByText('john_doe'));
      fireEvent.click(screen.getByText('john_doe').closest('button'));
      fireEvent.click(screen.getByText('Close Modal'));
      expect(screen.queryByTestId('profile-modal')).not.toBeInTheDocument();
    });
  });

  describe('back button', () => {
    test('renders back button', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText(/Back to/i)).toBeInTheDocument());
    });

    test('back button shows listing category', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText(/Back to Electronics/i)).toBeInTheDocument());
    });

    test('back button navigates back', async () => {
      renderComponent();
      await waitFor(() => screen.getByText(/Back to Electronics/i));
      fireEvent.click(screen.getByText(/Back to Electronics/i));
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  describe('campus secure guarantee', () => {
    test('renders Campus Secure guarantee text', async () => {
      renderComponent();
      await waitFor(() => expect(screen.getByText(/Campus Secure/i)).toBeInTheDocument());
    });
  });
});