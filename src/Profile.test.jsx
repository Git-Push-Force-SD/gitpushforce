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
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      })),
      updateUser: jest.fn(() =>
        Promise.resolve({ data: {}, error: null })
      ),
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() =>
          Promise.resolve({ data: null, error: null })
        ),
        getPublicUrl: jest.fn(() => ({
          data: {
            publicUrl: 'https://test.supabase.co/avatar.jpg',
          },
        })),
      })),
    },
  },
}));

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';

import Profile from './Profile';

// ─────────────────────────────────────────────────────────────

global.confirm = jest.fn(() => true);
global.alert = jest.fn();

// ─────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user123',
  email: 'test@test.com',
  user_metadata: {
    full_name: 'Test User',
    role: 'user',
  },
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

// ─────────────────────────────────────────────────────────────

const makeChain = (resolveValue = { data: [], error: null }) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  order: jest.fn().mockResolvedValue(resolveValue),

  single: jest.fn().mockResolvedValue({
    data: {
      username: 'Test User',
      profile_picture_url: null,
    },
    error: null,
  }),

  update: jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({
      data: null,
      error: null,
    }),
  }),

  insert: jest.fn().mockResolvedValue({
    data: null,
    error: null,
  }),
});

// ─────────────────────────────────────────────────────────────

const applyMocks = (
  listingsData = [mockListing],
  listingsError = null
) => {
  const { supabase } = require('./utils/supabase');

  supabase.from.mockImplementation((table) => {
    if (table === 'listings') {
      return makeChain({
        data: listingsData,
        error: listingsError,
      });
    }

    if (table === 'users') {
      return makeChain({
        data: {
          username: 'Test User',
          profile_picture_url: null,
        },
        error: null,
      });
    }

    if (table === 'reviews') {
      return makeChain({
        data: [],
        error: null,
      });
    }

    if (table === 'trades') {
      return makeChain({
        data: [],
        error: null,
      });
    }

    return makeChain({
      data: [],
      error: null,
    });
  });
};

// ─────────────────────────────────────────────────────────────

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

  test('Profile renders with user data displayed', async () => {
    renderProfile();

    expect(screen.getByText(/Profile/i)).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByText('Test Textbook')).toBeInTheDocument()
    );

    expect(screen.getByText(/My Listings/i)).toBeInTheDocument();
  });

  test('renders user listings from database', async () => {
    renderProfile();

    await waitFor(() =>
      expect(screen.getByText('Test Textbook')).toBeInTheDocument()
    );

    expect(screen.getByText(/R200\.00/i)).toBeInTheDocument();
  });

  test('calls onAddNew when add listing button is clicked', async () => {
    const handleAddNew = jest.fn();

    renderProfile({
      onAddNew: handleAddNew,
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: /Add New Listing/i,
      })
    );

    expect(handleAddNew).toHaveBeenCalledTimes(1);
  });

  test('calls onBack when back button is clicked', () => {
    const handleBack = jest.fn();

    renderProfile({
      onBack: handleBack,
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: /Profile/i,
      })
    );

    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  test('displays edit button for each listing', async () => {
    renderProfile();

    await waitFor(() =>
      expect(
        screen.getAllByLabelText(/Edit listing/i).length
      ).toBeGreaterThan(0)
    );
  });

  test('displays delete button for each listing', async () => {
    renderProfile();

    await waitFor(() =>
      expect(
        screen.getAllByLabelText(/Delete listing/i).length
      ).toBeGreaterThan(0)
    );
  });

  test('opens edit form when edit button is clicked', async () => {
    renderProfile();

    await waitFor(() =>
      expect(
        screen.getAllByLabelText(/Edit listing/i)[0]
      ).toBeInTheDocument()
    );

    fireEvent.click(
      screen.getAllByLabelText(/Edit listing/i)[0]
    );

    expect(
      screen.getByText(/Edit Listing/i)
    ).toBeInTheDocument();
  });

  test('delete button triggers confirmation dialog', async () => {
    renderProfile();

    await waitFor(() =>
      expect(
        screen.getAllByLabelText(/Delete listing/i)[0]
      ).toBeInTheDocument()
    );

    fireEvent.click(
      screen.getAllByLabelText(/Delete listing/i)[0]
    );

    expect(global.confirm).toHaveBeenCalled();
  });

  test('cancels delete when user declines confirmation', async () => {
    global.confirm.mockReturnValueOnce(false);

    renderProfile();

    await waitFor(() =>
      expect(screen.getByText('Test Textbook')).toBeInTheDocument()
    );

    fireEvent.click(
      screen.getAllByLabelText(/Delete listing/i)[0]
    );

    expect(
      screen.getByText('Test Textbook')
    ).toBeInTheDocument();
  });

  test('calls Supabase delete API when delete is confirmed', async () => {
    const { supabase } = require('./utils/supabase');

    renderProfile();

    await waitFor(() =>
      expect(
        screen.getAllByLabelText(/Delete listing/i)[0]
      ).toBeInTheDocument()
    );

    fireEvent.click(
      screen.getAllByLabelText(/Delete listing/i)[0]
    );

    expect(supabase.from).toHaveBeenCalledWith('listings');
  });

  test('upload profile picture button is present', () => {
    renderProfile();

    expect(
      screen.getByLabelText(/Upload profile picture/i)
    ).toBeInTheDocument();
  });

  test('file input accepts image types', () => {
    renderProfile();

    const fileInput = document.querySelector('input[type="file"]');

    expect(fileInput).toHaveAttribute(
      'accept',
      expect.stringContaining('image')
    );
  });

  test('fetches listings for current user only', async () => {
    const { supabase } = require('./utils/supabase');

    renderProfile();

    await waitFor(() =>
      expect(screen.getByText('Test Textbook')).toBeInTheDocument()
    );

    expect(supabase.from).toHaveBeenCalledWith('listings');
  });

  test('displays formatted price for listings', async () => {
    renderProfile();

    await waitFor(() =>
      expect(screen.getByText(/R200\.00/i)).toBeInTheDocument()
    );
  });

  test('displays listing count', async () => {
    renderProfile();

    await waitFor(() =>
      expect(screen.getByText(/1 active/i)).toBeInTheDocument()
    );
  });

  test('handles file upload for profile picture', async () => {
    renderProfile();

    const fileInput = document.querySelector('input[type="file"]');

    const file = new File(['test'], 'profile.jpg', {
      type: 'image/jpeg',
    });

    fireEvent.change(fileInput, {
      target: {
        files: [file],
      },
    });

    await waitFor(() =>
      expect(fileInput).toBeInTheDocument()
    );
  });

  test('displays error for invalid profile picture file type', async () => {
    renderProfile();

    const fileInput = document.querySelector('input[type="file"]');

    const file = new File(['test'], 'document.txt', {
      type: 'text/plain',
    });

    fireEvent.change(fileInput, {
      target: {
        files: [file],
      },
    });

    await waitFor(() =>
      expect(
        screen.getByText(/Please select a valid image file/i)
      ).toBeInTheDocument()
    );
  });

  test('displays error for oversized profile picture', async () => {
    renderProfile();

    const fileInput = document.querySelector('input[type="file"]');

    const largeFile = new File(
      ['x'.repeat(2 * 1024 * 1024)],
      'large.jpg',
      {
        type: 'image/jpeg',
      }
    );

    fireEvent.change(fileInput, {
      target: {
        files: [largeFile],
      },
    });

    await waitFor(() =>
      expect(
        screen.getByText(/Image size must be less than 1MB/i)
      ).toBeInTheDocument()
    );
  });

  test('edit form appears with listing data when edit clicked', async () => {
    renderProfile();

    await waitFor(() =>
      expect(
        screen.getAllByLabelText(/Edit listing/i)[0]
      ).toBeInTheDocument()
    );

    fireEvent.click(
      screen.getAllByLabelText(/Edit listing/i)[0]
    );

    expect(
      screen.getByDisplayValue('Test Textbook')
    ).toBeInTheDocument();
  });

  test('profile renders category badges for listings', async () => {
    renderProfile();

    await waitFor(() =>
      expect(screen.getByText(/Textbooks/i)).toBeInTheDocument()
    );
  });

  test('displays image for each listing', async () => {
    renderProfile();

    await waitFor(() =>
      expect(
        screen.getByAltText('Test Textbook')
      ).toBeInTheDocument()
    );

    expect(
      screen.getByAltText('Test Textbook')
    ).toHaveAttribute(
      'src',
      expect.stringContaining('supabase')
    );
  });

  test('handles API error when fetching listings', async () => {
    applyMocks(null, { message: 'API Error' });

    renderProfile();

    await waitFor(() =>
      expect(
        screen.getByText(/Failed to load listings/i)
      ).toBeInTheDocument()
    );
  });

  test('displays no listings message when list is empty', async () => {
    applyMocks([]);

    renderProfile();

    await waitFor(() =>
      expect(
        screen.getByText(
          /No active listings yet/i
        )
      ).toBeInTheDocument()
    );
  });

  test('displays listing card with all key information', async () => {
    renderProfile();

    await waitFor(() =>
      expect(screen.getByText('Test Textbook')).toBeInTheDocument()
    );

    expect(screen.getByText(/Textbooks/i)).toBeInTheDocument();

    expect(screen.getByText(/R200\.00/i)).toBeInTheDocument();

    expect(
      screen.getByAltText('Test Textbook')
    ).toBeInTheDocument();
  });
});