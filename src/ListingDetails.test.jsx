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

jest.mock('./AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('./hooks/useConversation', () => ({
  useConversation: jest.fn(),
}));

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
  created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
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

const setupSupabaseMocks = ({ listing = mockListing, seller = mockSeller, listingError = null, sellerError = null } = {}) => {
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
                single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
              }),
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { id: 'order-1' }, error: null }),
          }),
        }),
      };
    }
    if (table === 'trades') {
      return {
        insert: jest.fn().mockResolvedValue({ error: null }),
      };
    }
    return {};
  });
};

const renderComponent = (listingId = 'listing-1') => {
  return render(
    <MemoryRouter initialEntries={[`/listing/${listingId}`]}>
      <Routes>
        <Route path="/listing/:id" element={<ListingDetails />} />
      </Routes>
    </MemoryRouter>
  );
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ListingDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.scrollTo = jest.fn(); // jsdom does not implement scrollTo
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
      await waitFor(() => {
        expect(screen.getByText('Sony Headphones')).toBeInTheDocument();
      });
    });
  });

  describe('listing not found', () => {
    test('shows "Listing not found" when listing data is null', async () => {
      setupSupabaseMocks({ listing: null, listingError: { message: 'not found' } });
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText(/Listing not found/i)).toBeInTheDocument();
      });
    });

    test('shows go back button when listing not found', async () => {
      setupSupabaseMocks({ listing: null, listingError: { message: 'not found' } });
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText(/Go Back/i)).toBeInTheDocument();
      });
    });
  });

  describe('listing content', () => {
    test('renders listing title', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Sony Headphones')).toBeInTheDocument();
      });
    });

    test('renders formatted price', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText(/R1.*500/)).toBeInTheDocument();
      });
    });

    test('renders listing description', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Great condition headphones')).toBeInTheDocument();
      });
    });

    test('renders condition badge', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Like New')).toBeInTheDocument();
      });
    });

    test('renders category in specifications', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });
    });

    test('renders seller username', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('john_doe')).toBeInTheDocument();
      });
    });

    test('falls back to email prefix when seller has no username', async () => {
      setupSupabaseMocks({ seller: { ...mockSeller, username: null } });
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('john')).toBeInTheDocument();
      });
    });

    test('renders the listing image', async () => {
      renderComponent();
      await waitFor(() => {
        const img = screen.getAllByRole('img')[0];
        expect(img).toBeInTheDocument();
        expect(img.src).toContain('user1/image.jpg');
      });
    });

    test('renders time ago for recent listing', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText(/days? ago/i)).toBeInTheDocument();
      });
    });

    test('shows "unknown" for null created_at', async () => {
      setupSupabaseMocks({ listing: { ...mockListing, created_at: null } });
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('unknown')).toBeInTheDocument();
      });
    });

    test('shows "unknown" for invalid date string', async () => {
      setupSupabaseMocks({ listing: { ...mockListing, created_at: 'not-a-date' } });
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('unknown')).toBeInTheDocument();
      });
    });
  });

  describe('action buttons', () => {
    test('renders Message Seller button', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Message Seller/i })).toBeInTheDocument();
      });
    });

    test('renders Buy / Offer button for sale listing', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Buy \/ Offer/i })).toBeInTheDocument();
      });
    });

    test('does not render Buy / Offer button for trade-only listing', async () => {
      setupSupabaseMocks({ listing: { ...mockListing, listing_type: 'trade' } });
      renderComponent();
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Buy \/ Offer/i })).not.toBeInTheDocument();
      });
    });

    test('renders Trade button for trade listing', async () => {
      setupSupabaseMocks({ listing: { ...mockListing, listing_type: 'trade' } });
      renderComponent();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Trade/i })).toBeInTheDocument();
      });
    });

    test('renders Trade button for both listing type', async () => {
      setupSupabaseMocks({ listing: { ...mockListing, listing_type: 'both' } });
      renderComponent();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Trade/i })).toBeInTheDocument();
      });
    });

    test('hides Buy / Offer and Trade buttons when viewer is the seller', async () => {
      AuthContext.useAuth.mockReturnValue({ user: { id: 'seller-1' } });
      renderComponent();
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Buy \/ Offer/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^Trade$/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('buy / offer flow', () => {
    test('clicking Buy / Offer shows amount input', async () => {
      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Buy \/ Offer/i }));
      fireEvent.click(screen.getByRole('button', { name: /Buy \/ Offer/i }));
      expect(screen.getByPlaceholderText(/Enter amount/i)).toBeInTheDocument();
    });

    test('shows Proceed to Payment button after clicking Buy / Offer', async () => {
      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Buy \/ Offer/i }));
      fireEvent.click(screen.getByRole('button', { name: /Buy \/ Offer/i }));
      expect(screen.getByRole('button', { name: /Proceed to Payment/i })).toBeInTheDocument();
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
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/messages/conv-1', expect.any(Object));
      });
    });
  });

  describe('trade modal', () => {
    test('opens trade modal when Trade button is clicked', async () => {
      setupSupabaseMocks({ listing: { ...mockListing, listing_type: 'trade' } });
      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Trade/i }));
      fireEvent.click(screen.getByRole('button', { name: /Trade/i }));
      expect(screen.getByText('Create Trade Offer')).toBeInTheDocument();
    });

    test('closes trade modal when Cancel is clicked', async () => {
      setupSupabaseMocks({ listing: { ...mockListing, listing_type: 'trade' } });
      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Trade/i }));
      fireEvent.click(screen.getByRole('button', { name: /Trade/i }));
      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
      expect(screen.queryByText('Create Trade Offer')).not.toBeInTheDocument();
    });

    test('closes trade modal when X button is clicked', async () => {
      setupSupabaseMocks({ listing: { ...mockListing, listing_type: 'trade' } });
      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Trade/i }));
      fireEvent.click(screen.getByRole('button', { name: /Trade/i }));
      // X button is the close icon button in the modal header
      const closeBtn = screen.getAllByRole('button').find(
        (btn) => btn.querySelector('svg') && btn.className.includes('rounded-full') && btn.className.includes('bg-gray-100')
      );
      fireEvent.click(closeBtn);
      expect(screen.queryByText('Create Trade Offer')).not.toBeInTheDocument();
    });

    test('renders trade form fields inside modal', async () => {
      setupSupabaseMocks({ listing: { ...mockListing, listing_type: 'trade' } });
      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Trade/i }));
      fireEvent.click(screen.getByRole('button', { name: /Trade/i }));
      expect(screen.getByPlaceholderText(/Nintendo Switch Lite/i)).toBeInTheDocument();
      // Use getAllByText since "Category" and "Condition" also appear in the specs section
      expect(screen.getAllByText('Category').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Condition').length).toBeGreaterThan(0);
      // Verify the modal select dropdowns are present
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThanOrEqual(2);
    });

    test('navigates to login when unauthenticated user clicks Trade', async () => {
      AuthContext.useAuth.mockReturnValue({ user: null });
      setupSupabaseMocks({ listing: { ...mockListing, listing_type: 'trade' } });
      renderComponent();
      await waitFor(() => screen.getByRole('button', { name: /Trade/i }));
      fireEvent.click(screen.getByRole('button', { name: /Trade/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('back button', () => {
    test('renders back button', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText(/Back to/i)).toBeInTheDocument();
      });
    });

    test('back button shows listing category', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText(/Back to Electronics/i)).toBeInTheDocument();
      });
    });
  });

  describe('campus secure guarantee', () => {
    test('renders Campus Secure guarantee text', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText(/Campus Secure/i)).toBeInTheDocument();
      });
    });
  });
});
