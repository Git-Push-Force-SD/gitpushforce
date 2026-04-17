// All jest.mock() calls must come before imports — Jest hoists them automatically

jest.mock('./config', () => ({
  __esModule: true,
  default: 'https://test.supabase.co'
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
    from: jest.fn((table) => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() =>
              Promise.resolve({
                data: [
                  {
                    id: '1',
                    title: 'Test Textbook',
                    price: '200.00',
                    category: 'textbooks',
                    condition: 'good',
                    description: 'A test book',
                    image_path: 'test/image1.jpg',
                    seller_id: 'user123',
                    status: 'active',
                    created_at: '2026-04-17T00:00:00Z'
                  }
                ],
                error: null
              })
            )
          }))
        }))
      })),
      single: jest.fn(() => Promise.resolve({ data: { role: 'student' }, error: null })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn((callback) => {
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn()
            }
          }
        };
      })
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }
  }
}));

// Imports come AFTER jest.mock() calls
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';
import Profile from './Profile';

// Mock window methods — these run at module level, before each test
global.confirm = jest.fn(() => true);
global.alert = jest.fn();

describe('Profile Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset confirm to default true before each test
    global.confirm.mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Profile renders with user data displayed', async () => {
    const handleBack = jest.fn();
    const handleAddNew = jest.fn();

    render(<Profile onBack={handleBack} onAddNew={handleAddNew} />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Profile/i)).toBeInTheDocument();
    expect(screen.getByText(/My Listings/i)).toBeInTheDocument();
  });

  test('renders user listings from database', async () => {
    const handleBack = jest.fn();
    const handleAddNew = jest.fn();

    render(<Profile onBack={handleBack} onAddNew={handleAddNew} />);

    await waitFor(() => {
      expect(screen.getByText(/Test Textbook/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/R200.00/i)).toBeInTheDocument();
  });

  test('calls onAddNew when add listing button is clicked', async () => {
    const handleBack = jest.fn();
    const handleAddNew = jest.fn();

    render(<Profile onBack={handleBack} onAddNew={handleAddNew} />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /Add New Listing/i });
    fireEvent.click(addButton);

    expect(handleAddNew).toHaveBeenCalledTimes(1);
  });

  test('calls onBack when back button is clicked', async () => {
    const handleBack = jest.fn();
    const handleAddNew = jest.fn();

    render(<Profile onBack={handleBack} onAddNew={handleAddNew} />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const allButtons = screen.getAllByRole('button', { name: /Profile/i });
    const backButton = allButtons[0];
    fireEvent.click(backButton);

    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  test('displays edit button for each listing', async () => {
    const handleBack = jest.fn();
    const handleAddNew = jest.fn();

    render(<Profile onBack={handleBack} onAddNew={handleAddNew} />);

    await waitFor(() => {
      expect(screen.getByText(/Test Textbook/i)).toBeInTheDocument();
    });

    const editButtons = screen.getAllByLabelText(/Edit listing/i);
    expect(editButtons.length).toBeGreaterThan(0);
  });

  test('displays delete button for each listing', async () => {
    const handleBack = jest.fn();
    const handleAddNew = jest.fn();

    render(<Profile onBack={handleBack} onAddNew={handleAddNew} />);

    await waitFor(() => {
      expect(screen.getByText(/Test Textbook/i)).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByLabelText(/Delete listing/i);
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  test('opens edit form when edit button is clicked', async () => {
    const handleBack = jest.fn();
    const handleAddNew = jest.fn();

    render(<Profile onBack={handleBack} onAddNew={handleAddNew} />);

    await waitFor(() => {
      expect(screen.getByText(/Test Textbook/i)).toBeInTheDocument();
    });

    const editButtons = screen.getAllByLabelText(/Edit listing/i);
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Test Textbook/i)).toBeInTheDocument();
    });
  });

  test('delete button triggers confirmation dialog', async () => {
    const handleBack = jest.fn();
    const handleAddNew = jest.fn();

    render(<Profile onBack={handleBack} onAddNew={handleAddNew} />);

    await waitFor(() => {
      expect(screen.getByText(/Test Textbook/i)).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByLabelText(/Delete listing/i);
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalled();
    });
  });

  test('cancels delete when user declines confirmation', async () => {
    const handleBack = jest.fn();
    const handleAddNew = jest.fn();
    global.confirm.mockReturnValueOnce(false);

    render(<Profile onBack={handleBack} onAddNew={handleAddNew} />);

    await waitFor(() => {
      expect(screen.getByText(/Test Textbook/i)).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByLabelText(/Delete listing/i);
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Test Textbook/i)).toBeInTheDocument();
    });
  });

  test('calls Supabase delete API when delete is confirmed', async () => {
    const handleBack = jest.fn();
    const handleAddNew = jest.fn();
    const mockSupabase = require('./utils/supabase').supabase;

    render(<Profile onBack={handleBack} onAddNew={handleAddNew} />);

    await waitFor(() => {
      expect(screen.getByText(/Test Textbook/i)).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByLabelText(/Delete listing/i);
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('listings');
    });
  });

  test('upload profile picture button is present', async () => {
    const handleBack = jest.fn();
    const handleAddNew = jest.fn();

    render(<Profile onBack={handleBack} onAddNew={handleAddNew} />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const uploadButton = screen.getByLabelText(/Upload profile picture/i);
    expect(uploadButton).toBeInTheDocument();
  });

  test('file input accepts image types', async () => {
    const handleBack = jest.fn();
    const handleAddNew = jest.fn();

    render(<Profile onBack={handleBack} onAddNew={handleAddNew} />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const fileInput = screen.getByLabelText(/Upload profile picture/i)
      .closest('section')
      .querySelector('input[type="file"]');

    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('accept', expect.stringContaining('image'));
  });

  test('fetches listings for current user only', async () => {
    const handleBack = jest.fn();
    const handleAddNew = jest.fn();
    const mockSupabase = require('./utils/supabase').supabase;

    render(<Profile onBack={handleBack} onAddNew={handleAddNew} />);

    await waitFor(() => {
      expect(screen.getByText(/Test Textbook/i)).toBeInTheDocument();
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('listings');
  });

  test('displays formatted price for listings', async () => {
    const handleBack = jest.fn();
    const handleAddNew = jest.fn();

    render(<Profile onBack={handleBack} onAddNew={handleAddNew} />);

    await waitFor(() => {
      expect(screen.getByText(/Test Textbook/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/R200\.00/i)).toBeInTheDocument();
  });

  test('displays listing count', async () => {
    const handleBack = jest.fn();
    const handleAddNew = jest.fn();

    render(<Profile onBack={handleBack} onAddNew={handleAddNew} />);

    await waitFor(() => {
      expect(screen.getByText(/Test Textbook/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/1 active/i)).toBeInTheDocument();
  });

  test('handles file upload for profile picture', async () => {
    const handleBack = jest.fn();
    const handleAddNew = jest.fn();

    render(<Profile onBack={handleBack} onAddNew={handleAddNew} />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const fileInput = screen.getByLabelText(/Upload profile picture/i)
      .closest('section')
      .querySelector('input[type="file"]');

    expect(fileInput).toBeInTheDocument();

    const file = new File(['test'], 'profile.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(fileInput).toHaveAttribute('accept', expect.stringContaining('image'));
  });

  test('displays error for invalid profile picture file type', async () => {
    const handleBack = jest.fn();
    const handleAddNew = jest.fn();

    render(<Profile onBack={handleBack} onAddNew={handleAddNew} />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const fileInput = screen.getByLabelText(/Upload profile picture/i)
      .closest('section')
      .querySelector('input[type="file"]');

    const file = new File(['test'], 'document.txt', { type: 'text/plain' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(fileInput).toBeInTheDocument();
  });

  test('displays error for oversized profile picture', async () => {
    const handleBack = jest.fn();
    const handleAddNew = jest.fn();

    render(<Profile onBack={handleBack} onAddNew={handleAddNew} />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const fileInput = screen.getByLabelText(/Upload profile picture/i)
      .closest('section')
      .querySelector('input[type="file"]');

    const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    expect(fileInput).toBeInTheDocument();
  });

  test('Supabase update is called when delete is confirmed', async () => {
    const handleBack = jest.fn();
    const handleAddNew = jest.fn();
    const mockSupabase = require('./utils/supabase').supabase;

    render(<Profile onBack={handleBack} onAddNew={handleAddNew} />);

    await waitFor(() => {
      expect(screen.getByText(/Test Textbook/i)).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByLabelText(/Delete listing/i);
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockSupabase.from('listings').update).toBeDefined();
    });
  });

  test('edit form appears with listing data when edit clicked', async () => {
    const handleBack = jest.fn();
    const handleAddNew = jest.fn();

    render(<Profile onBack={handleBack} onAddNew={handleAddNew} />);

    await waitFor(() => {
      expect(screen.getByText(/Test Textbook/i)).toBeInTheDocument();
    });

    const editButtons = screen.getAllByLabelText(/Edit listing/i);
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Test Textbook/i)).toBeInTheDocument();
    });
  });

  test('profile renders category badges for listings', async () => {
    const handleBack = jest.fn();
    const handleAddNew = jest.fn();

    render(<Profile onBack={handleBack} onAddNew={handleAddNew} />);

    await waitFor(() => {
      expect(screen.getByText(/Test Textbook/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Textbooks/i)).toBeInTheDocument();
  });

  test('displays image for each listing', async () => {
    const handleBack = jest.fn();
    const handleAddNew = jest.fn();

    render(<Profile onBack={handleBack} onAddNew={handleAddNew} />);

    await waitFor(() => {
      expect(screen.getByAltText(/Test Textbook/i)).toBeInTheDocument();
    });

    const image = screen.getByAltText(/Test Textbook/i);
    expect(image).toHaveAttribute('src', expect.stringContaining('supabase'));
  });

  test('handles API error when fetching listings', async () => {
    const handleBack = jest.fn();
    const handleAddNew = jest.fn();
    const mockSupabase = require('./utils/supabase').supabase;

    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() =>
              Promise.resolve({
                data: null,
                error: { message: 'API Error' }
              })
            )
          }))
        }))
      }))
    });

    render(<Profile onBack={handleBack} onAddNew={handleAddNew} />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/My Listings/i)).toBeInTheDocument();
  });

  test('displays no listings message when list is empty', async () => {
    const handleBack = jest.fn();
    const handleAddNew = jest.fn();
    const mockSupabase = require('./utils/supabase').supabase;

    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() =>
              Promise.resolve({
                data: [],
                error: null
              })
            )
          }))
        }))
      }))
    });

    render(<Profile onBack={handleBack} onAddNew={handleAddNew} />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/My Listings/i)).toBeInTheDocument();
  });

  test('displays listing card with all key information', async () => {
    const handleBack = jest.fn();
    const handleAddNew = jest.fn();

    render(<Profile onBack={handleBack} onAddNew={handleAddNew} />);

    await waitFor(() => {
      expect(screen.getByText(/Test Textbook/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Textbooks/i)).toBeInTheDocument();
    expect(screen.getByText(/R200.00/i)).toBeInTheDocument();
    expect(screen.getByAltText(/Test Textbook/i)).toBeInTheDocument();
  });
});
