import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SellItemModal from './SellItemModal';

// Mock useAuth hook
jest.mock('./AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
  }),
}));

// Mock supabase
jest.mock('./utils/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
      })),
    },
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
    })),
  },
}));

describe('SellItemModal Component', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.alert = jest.fn();
  });

  test('renders all form fields', () => {
    render(<SellItemModal onClose={mockOnClose} />);

    expect(screen.getByText('List New Item')).toBeInTheDocument();
    expect(screen.getByText('Item Photos')).toBeInTheDocument();
    expect(screen.getByText('Item Title')).toBeInTheDocument();
    expect(screen.getByText('Price (R)')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Condition')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Post Listing/i })).toBeInTheDocument();
  });

  test('calls onClose when cancel button is clicked', () => {
    render(<SellItemModal onClose={mockOnClose} />);

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when X button is clicked', () => {
    render(<SellItemModal onClose={mockOnClose} />);

    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('updates form fields on user input', async () => {
    const user = userEvent.setup();
    render(<SellItemModal onClose={mockOnClose} />);

    const titleInput = screen.getByPlaceholderText('e.g. Minimalist Desk Lamp');
    const priceInput = screen.getByPlaceholderText('0.00');
    const descriptionInput = screen.getByPlaceholderText('Describe your item, mention any flaws...');

    await user.type(titleInput, 'Test Item');
    await user.type(priceInput, '100.50');
    await user.type(descriptionInput, 'Test description');

    expect(titleInput).toHaveValue('Test Item');
    expect(priceInput).toHaveValue(100.50);
    expect(descriptionInput).toHaveValue('Test description');
  });

  test('displays validation error when required fields are missing', async () => {
    render(<SellItemModal onClose={mockOnClose} />);

    const postButton = screen.getByRole('button', { name: /Post Listing/i });
    fireEvent.click(postButton);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Please fill in all required fields');
    });
  });

  test('shows selected image confirmation', async () => {
    const user = userEvent.setup();
    render(<SellItemModal onClose={mockOnClose} />);

    const file = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });
    const uploadArea = screen.getByText('Click to upload images');

    const input = uploadArea.closest('button').parentElement.querySelector('input[type="file"]');
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/Image selected/i)).toBeInTheDocument();
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });
  });

  test('validates image file type', async () => {
    const user = userEvent.setup();
    render(<SellItemModal onClose={mockOnClose} />);

    const file = new File(['dummy content'], 'test.txt', { type: 'text/plain' });
    const uploadArea = screen.getByText('Click to upload images');

    const input = uploadArea.closest('button').parentElement.querySelector('input[type="file"]');
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/Please select a valid image file/i)).toBeInTheDocument();
    });
  });
});
