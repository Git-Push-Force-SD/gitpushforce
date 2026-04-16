import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Profile from './Profile';

// Mock useAuth hook
jest.mock('./AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
  }),
}));

// Mock supabase
const mockListings = [
  {
    id: '1',
    title: 'Nike Dunk',
    description: 'Great condition',
    price: 500,
    category: 'clothing',
    condition: 'good',
    image_path: 'test-user-id/1234_nike.jpg',
  },
  {
    id: '2',
    title: 'Desk Lamp',
    description: 'Like new',
    price: 250,
    category: 'furniture',
    condition: 'like_new',
    image_path: 'test-user-id/5678_lamp.jpg',
  },
];

jest.mock('./utils/supabase', () => ({
  supabase: {
    from: jest.fn((table) => {
      if (table === 'listings') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockListings, error: null }),
          update: jest.fn().mockResolvedValue({ data: {}, error: null }),
        };
      }
      return {};
    }),
    storage: {
      from: jest.fn(() => ({
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'http://example.com/image.jpg' } })),
      })),
    },
  },
}));

describe('Profile Component', () => {
  const mockOnBack = jest.fn();
  const mockOnAddNew = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.alert = jest.fn();
    window.confirm = jest.fn(() => true);
  });

  test('renders profile header and user info', async () => {
    render(<Profile onBack={mockOnBack} onAddNew={mockOnAddNew} />);

    await waitFor(() => {
      expect(screen.getByText('Alex Scholar')).toBeInTheDocument();
      expect(screen.getByText('alex.scholar@students.wits.ac.za')).toBeInTheDocument();
      expect(screen.getByText('My Listings')).toBeInTheDocument();
    });
  });

  test('calls onBack when back button is clicked', async () => {
    render(<Profile onBack={mockOnBack} onAddNew={mockOnAddNew} />);

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /Profile/i }));
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });

  test('calls onAddNew when Add New Listing button is clicked', async () => {
    render(<Profile onBack={mockOnBack} onAddNew={mockOnAddNew} />);

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /Add New Listing/i }));
      expect(mockOnAddNew).toHaveBeenCalledTimes(1);
    });
  });

  test('displays loading state initially', () => {
    render(<Profile onBack={mockOnBack} onAddNew={mockOnAddNew} />);

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  test('displays listings after loading', async () => {
    render(<Profile onBack={mockOnBack} onAddNew={mockOnAddNew} />);

    await waitFor(() => {
      expect(screen.getByText('Nike Dunk')).toBeInTheDocument();
      expect(screen.getByText('Desk Lamp')).toBeInTheDocument();
      expect(screen.getByText('R500.00')).toBeInTheDocument();
      expect(screen.getByText('R250.00')).toBeInTheDocument();
    });
  });

  test('displays correct listing count', async () => {
    render(<Profile onBack={mockOnBack} onAddNew={mockOnAddNew} />);

    await waitFor(() => {
      expect(screen.getByText('2 active')).toBeInTheDocument();
    });
  });

  test('shows edit modal when edit button is clicked', async () => {
    render(<Profile onBack={mockOnBack} onAddNew={mockOnAddNew} />);

    await waitFor(() => {
      const editButtons = screen.getAllByLabelText('Edit listing');
      fireEvent.click(editButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Edit Listing')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Nike Dunk')).toBeInTheDocument();
    });
  });

  test('closes edit modal when close button is clicked', async () => {
    render(<Profile onBack={mockOnBack} onAddNew={mockOnAddNew} />);

    await waitFor(() => {
      const editButtons = screen.getAllByLabelText('Edit listing');
      fireEvent.click(editButtons[0]);
    });

    await waitFor(() => {
      const closeButton = screen.getByLabelText('Close modal');
      fireEvent.click(closeButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('Edit Listing')).not.toBeInTheDocument();
    });
  });

  test('closes edit modal when cancel button is clicked', async () => {
    render(<Profile onBack={mockOnBack} onAddNew={mockOnAddNew} />);

    await waitFor(() => {
      const editButtons = screen.getAllByLabelText('Edit listing');
      fireEvent.click(editButtons[0]);
    });

    await waitFor(() => {
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('Edit Listing')).not.toBeInTheDocument();
    });
  });

  test('confirms before deleting listing', async () => {
    render(<Profile onBack={mockOnBack} onAddNew={mockOnAddNew} />);

    await waitFor(() => {
      const deleteButtons = screen.getAllByLabelText('Delete listing');
      fireEvent.click(deleteButtons[0]);
    });

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this listing?');
    });
  });

  test('displays footer information', async () => {
    render(<Profile onBack={mockOnBack} onAddNew={mockOnAddNew} />);

    await waitFor(() => {
      expect(screen.getByText('UNIMART V1.0.0')).toBeInTheDocument();
      expect(screen.getByText('Marketplace for the Student Elite')).toBeInTheDocument();
    });
  });
});
