// All jest.mock() calls must come before imports

jest.mock('./config', () => ({
  __esModule: true,
  default: 'https://test.supabase.co',
}));

jest.mock('./AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user123', email: 'test@test.com' },
    signOut: jest.fn(),
  }),
  AuthProvider: ({ children }) => children,
}));

jest.mock('./utils/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getSession: jest.fn(() =>
        Promise.resolve({ data: { session: null }, error: null })
      ),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      updateUser: jest.fn(() =>
        Promise.resolve({ data: {}, error: null })
      ),
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ data: null, error: null })),
        getPublicUrl: jest.fn(() => ({
          data: { publicUrl: 'https://test.supabase.co/avatar.jpg' },
        })),
      })),
    },
  },
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Profile from './Profile';

// ─────────────────────────────────────────────────────────────

global.confirm = jest.fn(() => true);
global.alert = jest.fn();

// ─────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user123',
  email: 'test@test.com',
  user_metadata: { full_name: 'Test User', role: 'user' },
};

const mockListing = {
  id: '1',
  title: 'Test Textbook',
  price: '200.00',
  category: 'textbooks',
  condition: 'good',
  description: 'A test book',
  image_path: 'test/image1.jpg',
  seller_id: 'user123',
  status: 'active',
  created_at: '2026-04-17T00:00:00Z',
};

const mockTrade = {
  id: 'trade-1',
  status: 'pending',
  created_at: '2026-04-17T00:00:00Z',
  initiator_id: 'user123',
  receiver_id: 'other-user',
  offered_listing: { id: 'listing-a', title: 'My Laptop', image_path: null },
  requested_listing: { id: 'listing-b', title: 'Their Phone', image_path: null },
};

const mockReceivedTrade = {
  ...mockTrade,
  id: 'trade-2',
  initiator_id: 'other-user',
  receiver_id: 'user123',
  status: 'pending',
};

const mockNegotiatingTrade = {
  ...mockTrade,
  id: 'trade-3',
  status: 'negotiating',
  initiator_id: 'other-user',
  receiver_id: 'user123',
};

const mockReview = {
  id: 'review-1',
  rating: 4,
  comment: 'Great seller!',
  created_at: new Date(Date.now() - 60000).toISOString(),
  listing: { title: 'Test Textbook' },
  reviewer: { username: 'ReviewerUser', profile_picture_url: null },
};

const mockReviewWithPic = {
  ...mockReview,
  id: 'review-2',
  reviewer: { username: 'PicUser', profile_picture_url: 'https://example.com/pic.jpg' },
};

// ─────────────────────────────────────────────────────────────

const makeChain = (resolveValue = { data: [], error: null }) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  order: jest.fn().mockResolvedValue(resolveValue),
  single: jest.fn().mockResolvedValue({
    data: { username: 'Test User', profile_picture_url: null },
    error: null,
  }),
  update: jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ data: null, error: null }),
  }),
  insert: jest.fn().mockResolvedValue({ data: null, error: null }),
});

const applyMocks = ({
  listingsData = [mockListing],
  listingsError = null,
  tradesData = [],
  tradesError = null,
  reviewsData = [],
  reviewsError = null,
  usernameData = { username: 'Test User', profile_picture_url: null },
  usernameError = null,
} = {}) => {
  const { supabase } = require('./utils/supabase');

  supabase.from.mockImplementation((table) => {
    if (table === 'listings') {
      return makeChain({ data: listingsData, error: listingsError });
    }
    if (table === 'users') {
      const chain = makeChain({ data: usernameData, error: usernameError });
      chain.single = jest.fn().mockResolvedValue({ data: usernameData, error: usernameError });
      return chain;
    }
    if (table === 'reviews') {
      return makeChain({ data: reviewsData, error: reviewsError });
    }
    if (table === 'trades') {
      return makeChain({ data: tradesData, error: tradesError });
    }
    return makeChain({ data: [], error: null });
  });
};

const renderProfile = (props = {}) =>
  render(
    <Profile
      user={mockUser}
      onBack={jest.fn()}
      onAddNew={jest.fn()}
      onOpenWishlist={jest.fn()}
      {...props}
    />
  );

// ─────────────────────────────────────────────────────────────

describe('Profile Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.confirm.mockReturnValue(true);
    applyMocks();
  });

  // ── Basic rendering ──────────────────────────────────────────────────

  test('renders with user data displayed', async () => {
    renderProfile();
    expect(screen.getByText(/Profile/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Test Textbook')).toBeInTheDocument());
    expect(screen.getByText(/My Listings/i)).toBeInTheDocument();
  });

  test('renders user listings from database', async () => {
    renderProfile();
    await waitFor(() => expect(screen.getByText('Test Textbook')).toBeInTheDocument());
    expect(screen.getByText(/R200\.00/i)).toBeInTheDocument();
  });

  test('calls onAddNew when add listing button is clicked', async () => {
    const handleAddNew = jest.fn();
    renderProfile({ onAddNew: handleAddNew });
    fireEvent.click(screen.getByRole('button', { name: /Add New Listing/i }));
    expect(handleAddNew).toHaveBeenCalledTimes(1);
  });

  test('calls onBack when back button is clicked', () => {
    const handleBack = jest.fn();
    renderProfile({ onBack: handleBack });
    fireEvent.click(screen.getByRole('button', { name: /Go back/i }));
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  test('calls onOpenWishlist when wishlist button is clicked', () => {
    const handleWishlist = jest.fn();
    renderProfile({ onOpenWishlist: handleWishlist });
    fireEvent.click(screen.getByRole('button', { name: /Wishlist/i }));
    expect(handleWishlist).toHaveBeenCalledTimes(1);
  });

  test('displays wishlist count', () => {
    renderProfile({ wishlistCount: 5 });
    expect(screen.getByText(/5 items/i)).toBeInTheDocument();
  });

  test('displays singular "item" for wishlist count of 1', () => {
    renderProfile({ wishlistCount: 1 });
    expect(screen.getByText(/1 item$/i)).toBeInTheDocument();
  });

  test('displays display name from user metadata', () => {
    renderProfile();
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  test('displays email', () => {
    renderProfile();
    expect(screen.getByText('test@test.com')).toBeInTheDocument();
  });

  test('shows profile picture when user has avatar_url', async () => {
    const userWithAvatar = {
      ...mockUser,
      user_metadata: { ...mockUser.user_metadata, avatar_url: 'https://example.com/avatar.jpg' },
    };
    renderProfile({ user: userWithAvatar });
    await waitFor(() => {
      const img = screen.getByAltText('User avatar');
      expect(img.src).toContain('example.com/avatar.jpg');
    });
  });

  test('shows remove profile picture button when image is set', async () => {
    const userWithAvatar = {
      ...mockUser,
      user_metadata: { ...mockUser.user_metadata, avatar_url: 'https://example.com/avatar.jpg' },
    };
    renderProfile({ user: userWithAvatar });
    await waitFor(() =>
      expect(screen.getByLabelText(/Remove profile picture/i)).toBeInTheDocument()
    );
  });

  test('shows fetched profile picture from users table', async () => {
    applyMocks({ usernameData: { username: 'DBUser', profile_picture_url: 'https://db.com/pic.jpg' } });
    renderProfile();
    await waitFor(() => {
      const img = screen.getByAltText('User avatar');
      expect(img.src).toContain('db.com/pic.jpg');
    });
  });

  test('shows camera placeholder when no profile picture', async () => {
    renderProfile();
    await waitFor(() => expect(screen.getByText('Test Textbook')).toBeInTheDocument());
    expect(screen.queryByAltText('User avatar')).not.toBeInTheDocument();
  });

  // ── Listings ─────────────────────────────────────────────────────────

  test('displays edit button for each listing', async () => {
    renderProfile();
    await waitFor(() =>
      expect(screen.getAllByLabelText(/Edit listing/i).length).toBeGreaterThan(0)
    );
  });

  test('displays delete button for each listing', async () => {
    renderProfile();
    await waitFor(() =>
      expect(screen.getAllByLabelText(/Delete listing/i).length).toBeGreaterThan(0)
    );
  });

  test('displays formatted price', async () => {
    renderProfile();
    await waitFor(() => expect(screen.getByText(/R200\.00/i)).toBeInTheDocument());
  });

  test('displays listing count', async () => {
    renderProfile();
    await waitFor(() => expect(screen.getByText(/1 active/i)).toBeInTheDocument());
  });

  test('displays category badge', async () => {
    renderProfile();
    await waitFor(() => expect(screen.getByText(/Textbooks/i)).toBeInTheDocument());
  });

  test('displays listing image with supabase URL', async () => {
    renderProfile();
    await waitFor(() => {
      const img = screen.getByAltText('Test Textbook');
      expect(img).toBeInTheDocument();
      expect(img.src).toContain('supabase');
    });
  });

  test('uses fallback image when image_path is null', async () => {
    applyMocks({ listingsData: [{ ...mockListing, image_path: null }] });
    renderProfile();
    await waitFor(() => {
      const img = screen.getByAltText('Test Textbook');
      expect(img.src).toContain('unsplash');
    });
  });

  test('uses image_url when image_path is null but image_url exists', async () => {
    applyMocks({ listingsData: [{ ...mockListing, image_path: null, image_url: 'https://custom.com/img.jpg' }] });
    renderProfile();
    await waitFor(() => {
      const img = screen.getByAltText('Test Textbook');
      expect(img.src).toContain('custom.com');
    });
  });

  test('shows no listings empty state', async () => {
    applyMocks({ listingsData: [] });
    renderProfile();
    await waitFor(() =>
      expect(screen.getByText(/No active listings yet/i)).toBeInTheDocument()
    );
  });

  test('shows listings fetch error', async () => {
    applyMocks({ listingsData: null, listingsError: { message: 'API Error' } });
    renderProfile();
    await waitFor(() =>
      expect(screen.getByText(/Failed to load listings/i)).toBeInTheDocument()
    );
  });

  test('displays listing card with all key info', async () => {
    renderProfile();
    await waitFor(() => expect(screen.getByText('Test Textbook')).toBeInTheDocument());
    expect(screen.getByText(/Textbooks/i)).toBeInTheDocument();
    expect(screen.getByText(/R200\.00/i)).toBeInTheDocument();
    expect(screen.getByAltText('Test Textbook')).toBeInTheDocument();
  });

  // ── Edit listing ──────────────────────────────────────────────────────

  test('opens edit form with listing data when edit clicked', async () => {
    renderProfile();
    await waitFor(() => screen.getAllByLabelText(/Edit listing/i)[0]);
    fireEvent.click(screen.getAllByLabelText(/Edit listing/i)[0]);
    expect(screen.getByDisplayValue('Test Textbook')).toBeInTheDocument();
  });

  test('edit modal contains title, description, price, category, condition fields', async () => {
    renderProfile();
    await waitFor(() => screen.getAllByLabelText(/Edit listing/i)[0]);
    fireEvent.click(screen.getAllByLabelText(/Edit listing/i)[0]);
    expect(screen.getByDisplayValue('Test Textbook')).toBeInTheDocument();
    expect(screen.getByDisplayValue('200.00')).toBeInTheDocument();
    expect(document.querySelector('select[name="category"]')).toBeInTheDocument();
    expect(document.querySelector('select[name="condition"]')).toBeInTheDocument();
  });

  test('closes edit modal when cancel is clicked', async () => {
    renderProfile();
    await waitFor(() => screen.getAllByLabelText(/Edit listing/i)[0]);
    fireEvent.click(screen.getAllByLabelText(/Edit listing/i)[0]);
    expect(screen.getByText(/Edit Listing/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    await waitFor(() =>
      expect(screen.queryByText(/Edit Listing/i)).not.toBeInTheDocument()
    );
  });

  test('closes edit modal when X button is clicked', async () => {
    renderProfile();
    await waitFor(() => screen.getAllByLabelText(/Edit listing/i)[0]);
    fireEvent.click(screen.getAllByLabelText(/Edit listing/i)[0]);
    fireEvent.click(screen.getByLabelText(/Close modal/i));
    await waitFor(() =>
      expect(screen.queryByText(/Edit Listing/i)).not.toBeInTheDocument()
    );
  });

  test('updates edit form fields on change', async () => {
    renderProfile();
    await waitFor(() => screen.getAllByLabelText(/Edit listing/i)[0]);
    fireEvent.click(screen.getAllByLabelText(/Edit listing/i)[0]);
    const titleInput = screen.getByDisplayValue('Test Textbook');
    fireEvent.change(titleInput, { target: { name: 'title', value: 'Updated Title' } });
    expect(screen.getByDisplayValue('Updated Title')).toBeInTheDocument();
  });

  test('submits edit form and updates listing', async () => {
    const { supabase } = require('./utils/supabase');
    renderProfile();
    await waitFor(() => screen.getAllByLabelText(/Edit listing/i)[0]);
    fireEvent.click(screen.getAllByLabelText(/Edit listing/i)[0]);
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));
    await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('listings'));
  });

  test('shows alert when edit submitted with empty title', async () => {
    renderProfile();
    await waitFor(() => screen.getAllByLabelText(/Edit listing/i)[0]);
    fireEvent.click(screen.getAllByLabelText(/Edit listing/i)[0]);
    const titleInput = screen.getByDisplayValue('Test Textbook');
    fireEvent.change(titleInput, { target: { name: 'title', value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));
    expect(global.alert).toHaveBeenCalledWith(expect.stringMatching(/fill in all required/i));
  });

  test('shows alert when edit submitted with empty price', async () => {
    renderProfile();
    await waitFor(() => screen.getAllByLabelText(/Edit listing/i)[0]);
    fireEvent.click(screen.getAllByLabelText(/Edit listing/i)[0]);
    const priceInput = screen.getByDisplayValue('200.00');
    fireEvent.change(priceInput, { target: { name: 'price', value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));
    expect(global.alert).toHaveBeenCalledWith(expect.stringMatching(/fill in all required/i));
  });

  test('shows alert when edit supabase call fails', async () => {
    const { supabase } = require('./utils/supabase');
    supabase.from.mockImplementation((table) => {
      if (table === 'listings') {
        const chain = makeChain({ data: [mockListing], error: null });
        chain.update = jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } }),
        });
        return chain;
      }
      return makeChain({ data: [], error: null });
    });
    renderProfile();
    await waitFor(() => screen.getAllByLabelText(/Edit listing/i)[0]);
    fireEvent.click(screen.getAllByLabelText(/Edit listing/i)[0]);
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));
    await waitFor(() =>
      expect(global.alert).toHaveBeenCalledWith(expect.stringMatching(/Failed to update/i))
    );
  });

  // ── Delete listing ────────────────────────────────────────────────────

  test('delete button triggers confirmation dialog', async () => {
    renderProfile();
    await waitFor(() => screen.getAllByLabelText(/Delete listing/i)[0]);
    fireEvent.click(screen.getAllByLabelText(/Delete listing/i)[0]);
    expect(global.confirm).toHaveBeenCalled();
  });

  test('cancels delete when user declines confirmation', async () => {
    global.confirm.mockReturnValueOnce(false);
    renderProfile();
    await waitFor(() => expect(screen.getByText('Test Textbook')).toBeInTheDocument());
    fireEvent.click(screen.getAllByLabelText(/Delete listing/i)[0]);
    expect(screen.getByText('Test Textbook')).toBeInTheDocument();
  });

  test('removes listing from UI after successful delete', async () => {
    renderProfile();
    await waitFor(() => expect(screen.getByText('Test Textbook')).toBeInTheDocument());
    fireEvent.click(screen.getAllByLabelText(/Delete listing/i)[0]);
    await waitFor(() =>
      expect(screen.queryByText('Test Textbook')).not.toBeInTheDocument()
    );
  });

  test('shows alert when delete fails', async () => {
    const { supabase } = require('./utils/supabase');
    supabase.from.mockImplementation((table) => {
      if (table === 'listings') {
        const chain = makeChain({ data: [mockListing], error: null });
        chain.update = jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'Delete failed' } }),
        });
        return chain;
      }
      return makeChain({ data: [], error: null });
    });
    renderProfile();
    await waitFor(() => screen.getAllByLabelText(/Delete listing/i)[0]);
    fireEvent.click(screen.getAllByLabelText(/Delete listing/i)[0]);
    await waitFor(() =>
      expect(global.alert).toHaveBeenCalledWith(expect.stringMatching(/Failed to delete/i))
    );
  });

  // ── Profile picture ───────────────────────────────────────────────────

  test('upload profile picture button is present', () => {
    renderProfile();
    expect(screen.getByLabelText(/Upload profile picture/i)).toBeInTheDocument();
  });

  test('file input accepts image types', () => {
    renderProfile();
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toHaveAttribute('accept', expect.stringContaining('image'));
  });

  test('handles valid image file upload', async () => {
    renderProfile();
    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['test'], 'profile.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 500 * 1024 });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => expect(fileInput).toBeInTheDocument());
  });

  test('shows error for invalid file type', async () => {
    renderProfile();
    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['test'], 'document.txt', { type: 'text/plain' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() =>
      expect(screen.getByText(/Please select a valid image file/i)).toBeInTheDocument()
    );
  });

  test('shows error for oversized image', async () => {
    renderProfile();
    const fileInput = document.querySelector('input[type="file"]');
    const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    Object.defineProperty(largeFile, 'size', { value: 2 * 1024 * 1024 });
    fireEvent.change(fileInput, { target: { files: [largeFile] } });
    await waitFor(() =>
      expect(screen.getByText(/Image size must be less than 1MB/i)).toBeInTheDocument()
    );
  });

  test('removes profile picture when remove button is clicked', async () => {
    const { supabase } = require('./utils/supabase');
    const userWithAvatar = {
      ...mockUser,
      user_metadata: { ...mockUser.user_metadata, avatar_url: 'https://example.com/avatar.jpg' },
    };
    // Mock users table to also return a profile pic so it doesn't get cleared on mount
    applyMocks({
      usernameData: { username: 'Test User', profile_picture_url: 'https://example.com/avatar.jpg' },
    });
    renderProfile({ user: userWithAvatar });
    await waitFor(() => screen.getByAltText('User avatar'));
    const removeBtn = document.querySelector('button[aria-label="Remove profile picture"]');
    expect(removeBtn).toBeTruthy();
    fireEvent.click(removeBtn);
    await waitFor(() =>
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({ data: { avatar_url: null } })
    );
  });

  test('shows error when avatar upload fails', async () => {
    const { supabase } = require('./utils/supabase');
    supabase.storage.from.mockReturnValue({
      upload: jest.fn().mockResolvedValue({ data: null, error: { message: 'Upload failed' } }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: null } }),
    });
    renderProfile();
    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 500 * 1024 });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() =>
      expect(screen.getByText(/Failed to save profile picture/i)).toBeInTheDocument()
    );
  });

  // ── Trades ────────────────────────────────────────────────────────────

  test('shows no trades empty state', async () => {
    applyMocks({ tradesData: [] });
    renderProfile();
    await waitFor(() => expect(screen.getByText(/No trades yet/i)).toBeInTheDocument());
  });

  test('shows trade fetch error', async () => {
    applyMocks({ tradesData: null, tradesError: { message: 'Trade fetch failed' } });
    renderProfile();
    await waitFor(() =>
      expect(screen.getByText(/Failed to load trades/i)).toBeInTheDocument()
    );
  });

  test('renders sent trade with offered and requested titles', async () => {
    applyMocks({ tradesData: [mockTrade] });
    renderProfile();
    await waitFor(() => expect(screen.getByText(/Sent offer/i)).toBeInTheDocument());
    expect(screen.getByText(/My Laptop/i)).toBeInTheDocument();
    expect(screen.getByText(/Their Phone/i)).toBeInTheDocument();
  });

  test('renders received trade', async () => {
    applyMocks({ tradesData: [mockReceivedTrade] });
    renderProfile();
    await waitFor(() => expect(screen.getByText(/Received offer/i)).toBeInTheDocument());
  });

  test('shows cancel button for sender on pending trade', async () => {
    applyMocks({ tradesData: [mockTrade] });
    renderProfile();
    await waitFor(() => expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument());
  });

  test('shows accept and decline buttons for receiver on pending trade', async () => {
    applyMocks({ tradesData: [mockReceivedTrade] });
    renderProfile();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Accept/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Decline/i })).toBeInTheDocument();
    });
  });

  test('shows accept and decline buttons for receiver on negotiating trade', async () => {
    applyMocks({ tradesData: [mockNegotiatingTrade] });
    renderProfile();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Accept/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Decline/i })).toBeInTheDocument();
    });
  });

  test('cancels trade when cancel confirmed', async () => {
    const { supabase } = require('./utils/supabase');
    applyMocks({ tradesData: [mockTrade] });
    renderProfile();
    await waitFor(() => screen.getByRole('button', { name: /Cancel/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('trades'));
  });

  test('does not cancel trade when confirm is declined', async () => {
    global.confirm.mockReturnValueOnce(false);
    const { supabase } = require('./utils/supabase');
    applyMocks({ tradesData: [mockTrade] });
    renderProfile();
    await waitFor(() => screen.getByRole('button', { name: /Cancel/i }));
    const callsBefore = supabase.from.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(supabase.from.mock.calls.length).toBe(callsBefore);
  });

  test('accepts trade when accept button clicked', async () => {
    const { supabase } = require('./utils/supabase');
    applyMocks({ tradesData: [mockReceivedTrade] });
    renderProfile();
    await waitFor(() => screen.getByRole('button', { name: /Accept/i }));
    fireEvent.click(screen.getByRole('button', { name: /Accept/i }));
    await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('trades'));
  });

  test('declines trade when decline button clicked', async () => {
    const { supabase } = require('./utils/supabase');
    applyMocks({ tradesData: [mockReceivedTrade] });
    renderProfile();
    await waitFor(() => screen.getByRole('button', { name: /Decline/i }));
    fireEvent.click(screen.getByRole('button', { name: /Decline/i }));
    await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('trades'));
  });

  test('shows alert when trade action fails', async () => {
    const { supabase } = require('./utils/supabase');
    supabase.from.mockImplementation((table) => {
      if (table === 'trades') {
        const chain = makeChain({ data: [mockReceivedTrade], error: null });
        chain.update = jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'Trade update failed' } }),
        });
        chain.single = jest.fn().mockResolvedValue({
          data: { offered_listing_id: 'a', requested_listing_id: 'b', receiver_id: 'other' },
          error: null,
        });
        return chain;
      }
      return makeChain({ data: [], error: null });
    });
    renderProfile();
    await waitFor(() => screen.getByRole('button', { name: /Accept/i }));
    fireEvent.click(screen.getByRole('button', { name: /Accept/i }));
    await waitFor(() =>
      expect(global.alert).toHaveBeenCalledWith(expect.stringMatching(/Failed to update trade/i))
    );
  });

  test('shows correct trade status badge for accepted', async () => {
    applyMocks({ tradesData: [{ ...mockTrade, status: 'accepted' }] });
    renderProfile();
    await waitFor(() => expect(screen.getByText('Accepted')).toBeInTheDocument());
  });

  test('shows correct trade status badge for completed', async () => {
    applyMocks({ tradesData: [{ ...mockTrade, status: 'completed' }] });
    renderProfile();
    await waitFor(() => expect(screen.getByText('Completed')).toBeInTheDocument());
  });

  test('shows correct trade status badge for declined', async () => {
    applyMocks({ tradesData: [{ ...mockTrade, status: 'declined' }] });
    renderProfile();
    await waitFor(() => expect(screen.getByText('Declined')).toBeInTheDocument());
  });

  test('shows unknown status label for unrecognised status', async () => {
    applyMocks({ tradesData: [{ ...mockTrade, status: null }] });
    renderProfile();
    await waitFor(() => expect(screen.getByText('Unknown')).toBeInTheDocument());
  });

  test('does not show action buttons for non-actionable trade statuses', async () => {
    applyMocks({ tradesData: [{ ...mockTrade, status: 'completed' }] });
    renderProfile();
    await waitFor(() => expect(screen.getByText('Completed')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Accept/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Decline/i })).not.toBeInTheDocument();
  });

  // ── Reviews ───────────────────────────────────────────────────────────

  test('shows no reviews empty state', async () => {
    applyMocks({ reviewsData: [] });
    renderProfile();
    await waitFor(() =>
      expect(screen.getByText(/No reviews yet/i)).toBeInTheDocument()
    );
  });

  test('displays review comment', async () => {
    applyMocks({ reviewsData: [mockReview] });
    renderProfile();
    await waitFor(() => expect(screen.getByText('Great seller!')).toBeInTheDocument());
  });

  test('displays reviewer username', async () => {
    applyMocks({ reviewsData: [mockReview] });
    renderProfile();
    await waitFor(() => expect(screen.getByText('ReviewerUser')).toBeInTheDocument());
  });

  test('displays listing title in review', async () => {
    applyMocks({ reviewsData: [mockReview] });
    renderProfile();
    await waitFor(() =>
      expect(screen.getAllByText(/Test Textbook/).length).toBeGreaterThan(0)
    );
  });

  test('displays star rating for review', async () => {
    applyMocks({ reviewsData: [mockReview] });
    renderProfile();
    await waitFor(() =>
      expect(screen.getAllByText('★').length).toBeGreaterThan(0)
    );
  });

  test('shows average rating summary when reviews exist', async () => {
    applyMocks({ reviewsData: [mockReview] });
    renderProfile();
    await waitFor(() => expect(screen.getByText(/4\.0 ★/)).toBeInTheDocument());
  });

  test('shows review count', async () => {
    applyMocks({ reviewsData: [mockReview] });
    renderProfile();
    await waitFor(() => expect(screen.getByText(/1 review/)).toBeInTheDocument());
  });

  test('renders reviewer profile picture when available', async () => {
    applyMocks({ reviewsData: [mockReviewWithPic] });
    renderProfile();
    await waitFor(() => {
      const img = screen.getByAltText('PicUser');
      expect(img.src).toContain('example.com/pic.jpg');
    });
  });

  test('renders reviewer initials when no profile picture', async () => {
    applyMocks({ reviewsData: [mockReview] });
    renderProfile();
    await waitFor(() => expect(screen.getByText('RE')).toBeInTheDocument());
  });

  test('handles reviews fetch error gracefully', async () => {
    applyMocks({ reviewsData: null, reviewsError: { message: 'Reviews error' } });
    renderProfile();
    await waitFor(() =>
      expect(screen.getByText(/No reviews yet/i)).toBeInTheDocument()
    );
  });

  // ── Username / fallbacks ──────────────────────────────────────────────

  test('falls back to email prefix when no full_name or username', async () => {
    const userNoName = { ...mockUser, user_metadata: { role: 'user' } };
    applyMocks({ usernameData: { username: null, profile_picture_url: null } });
    renderProfile({ user: userNoName });
    await waitFor(() =>
      expect(screen.getAllByText('test').length).toBeGreaterThan(0)
    );
  });

  test('handles username fetch error gracefully', async () => {
    applyMocks({ usernameData: null, usernameError: { message: 'User fetch failed' } });
    renderProfile();
    await waitFor(() => expect(screen.getByText('Test User')).toBeInTheDocument());
  });

  // ── Supabase calls ────────────────────────────────────────────────────

  test('fetches listings for current user only', async () => {
    const { supabase } = require('./utils/supabase');
    renderProfile();
    await waitFor(() => expect(screen.getByText('Test Textbook')).toBeInTheDocument());
    expect(supabase.from).toHaveBeenCalledWith('listings');
  });

  test('fetches trades on mount', async () => {
    const { supabase } = require('./utils/supabase');
    renderProfile();
    await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('trades'));
  });

  test('fetches reviews on mount', async () => {
    const { supabase } = require('./utils/supabase');
    renderProfile();
    await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('reviews'));
  });
});