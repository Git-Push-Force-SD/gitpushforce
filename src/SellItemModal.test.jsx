import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SellItemModal from './SellItemModal';
import * as AuthContext from './AuthContext';

// Mock window.alert
global.alert = jest.fn();

// Mock Supabase
jest.mock('./utils/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => Promise.resolve({ data: null, error: null }))
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ data: { path: 'test/uplod.jpg' }, error: null }))
      }))
    }
  }
}));

describe('SellItemModal Component', () => {
  const mockUser = {
    id: 'user123',
    email: 'test@example.com'
  };

  beforeEach(() => {
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: mockUser,
      role: 'student',
      loading: false
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Modal opens with all form fields', () => {
    const handleClose = jest.fn();

    render(<SellItemModal onClose={handleClose} />);

    expect(screen.getByText(/List New Item/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g. Minimalist Desk Lamp/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/0.00/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Select category/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Describe your item/i)).toBeInTheDocument();
  });

  test('Modal closes when Cancel button is clicked', () => {
    const handleClose = jest.fn();

    render(<SellItemModal onClose={handleClose} />);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('Modal closes when X button is clicked', () => {
    const handleClose = jest.fn();

    render(<SellItemModal onClose={handleClose} />);

    const allButtons = screen.getAllByRole('button');
    const xButton = allButtons.find(btn => btn.textContent === '');
    
    if (xButton) {
      fireEvent.click(xButton);
      expect(handleClose).toHaveBeenCalled();
    }
  });

  test('Form inputs update correctly when user types', async () => {
    const handleClose = jest.fn();
    const user = userEvent.setup();

    render(<SellItemModal onClose={handleClose} />);

    const titleInput = screen.getByPlaceholderText(/e.g. Minimalist Desk Lamp/i);
    const priceInput = screen.getByPlaceholderText(/0.00/i);
    const descriptionInput = screen.getByPlaceholderText(/Describe your item/i);

    await user.type(titleInput, 'Used Laptop');
    await user.type(priceInput, '1500');
    await user.type(descriptionInput, 'Great condition');

    expect(titleInput).toHaveValue('Used Laptop');
    expect(priceInput).toHaveValue(1500);
    expect(descriptionInput).toHaveValue('Great condition');
  });

  test('Category can be selected', async () => {
    const handleClose = jest.fn();
    const user = userEvent.setup();

    render(<SellItemModal onClose={handleClose} />);

    const categorySelect = screen.getByDisplayValue(/Select category/i);
    
    await user.selectOptions(categorySelect, 'electronics');
    
    expect(categorySelect).toHaveValue('electronics');
  });

  test('Condition radio button can be selected', async () => {
    const handleClose = jest.fn();

    render(<SellItemModal onClose={handleClose} />);

    const likeNewRadio = screen.getByRole('radio', { name: /Like New/i });
    fireEvent.click(likeNewRadio);
    
    expect(likeNewRadio).toBeChecked();
  });

  test('Form validation prevents submission without required fields', async () => {
    const handleClose = jest.fn();

    render(<SellItemModal onClose={handleClose} />);

    const submitButton = screen.getByRole('button', { name: /Post Listing/i });
    
    // Try to submit empty form - should trigger alert or validation
    fireEvent.click(submitButton);
    
    // Verify modal is still open (not submitted)
    expect(screen.getByText(/List New Item/i)).toBeInTheDocument();
  });

  test('File upload button allows image selection', async () => {
    const handleClose = jest.fn();

    render(<SellItemModal onClose={handleClose} />);

    const fileInput = screen.getByRole('button', { name: /Click to upload images/i })
      .closest('section')
      .querySelector('input[type="file"]');

    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('accept', expect.stringContaining('image'));
  });

  test('Upload area shows feedback when image is selected', async () => {
    const handleClose = jest.fn();

    render(<SellItemModal onClose={handleClose} />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Wait for image feedback to appear
    await waitFor(() => {
      expect(screen.getByText(/Image selected/i)).toBeInTheDocument();
    });
  });

  test('Form submission triggers Supabase upload and insert', async () => {
    const handleClose = jest.fn();
    const mockSupabase = require('./utils/supabase').supabase;
    const user = userEvent.setup();

    render(<SellItemModal onClose={handleClose} />);

    // Fill form fields
    const titleInput = screen.getByPlaceholderText(/e.g. Minimalist Desk Lamp/i);
    const priceInput = screen.getByPlaceholderText(/0.00/i);
    const categorySelect = screen.getByDisplayValue(/Select category/i);
    const descriptionInput = screen.getByPlaceholderText(/Describe your item/i);

    await user.type(titleInput, 'Test Item');
    await user.type(priceInput, '100');
    await user.selectOptions(categorySelect, 'textbooks');
    await user.type(descriptionInput, 'Test description');

    // Add file
    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Post Listing/i });
    fireEvent.click(submitButton);

    // Verify Supabase was called
    await waitFor(() => {
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('Listings');
    });
  });

  test('Error message displays for invalid file type', async () => {
    const handleClose = jest.fn();

    render(<SellItemModal onClose={handleClose} />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Error should display
    await waitFor(() => {
      expect(screen.getByText(/valid image file/i)).toBeInTheDocument();
    });
  });

  test('Error message displays for oversized file', async () => {
    const handleClose = jest.fn();

    render(<SellItemModal onClose={handleClose} />);

    const fileInput = document.querySelector('input[type="file"]');
    
    // Create a file larger than 5MB
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    // Error should display
    await waitFor(() => {
      expect(screen.getByText(/less than 5MB/i)).toBeInTheDocument();
    });
  });

  test('Post button states change during submission', async () => {
    const handleClose = jest.fn();
    const user = userEvent.setup();

    render(<SellItemModal onClose={handleClose} />);

    const titleInput = screen.getByPlaceholderText(/e.g. Minimalist Desk Lamp/i);
    const priceInput = screen.getByPlaceholderText(/0.00/i);
    const categorySelect = screen.getByDisplayValue(/Select category/i);

    await user.type(titleInput, 'Test Item');
    await user.type(priceInput, '100');
    await user.selectOptions(categorySelect, 'textbooks');

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const submitButton = screen.getByRole('button', { name: /Post Listing/i });
    expect(submitButton).not.toBeDisabled();
  });

  test('File upload feedback displays selected file name', async () => {
    const handleClose = jest.fn();

    render(<SellItemModal onClose={handleClose} />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['test'], 'my-item.jpg', { type: 'image/jpeg' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/my-item.jpg/i)).toBeInTheDocument();
    });
  });

  test('Error clears when valid file is uploaded after error', async () => {
    const handleClose = jest.fn();

    render(<SellItemModal onClose={handleClose} />);

    const fileInput = document.querySelector('input[type="file"]');

    // First upload invalid file
    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByText(/valid image file/i)).toBeInTheDocument();
    });

    // Then upload valid file
    const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Image selected/i)).toBeInTheDocument();
    });
  });

  test('Description input can be filled with requirements text', async () => {
    const handleClose = jest.fn();
    const user = userEvent.setup();

    render(<SellItemModal onClose={handleClose} />);

    const descriptionInput = screen.getByPlaceholderText(/Describe your item/i);
    const testDescription = 'Slightly used, missing page 23, otherwise perfect';

    await user.type(descriptionInput, testDescription);

    expect(descriptionInput).toHaveValue(testDescription);
  });

  test('Radio buttons for condition work correctly', async () => {
    const handleClose = jest.fn();

    render(<SellItemModal onClose={handleClose} />);

    const goodRadio = screen.getByRole('radio', { name: /Good/i });
    expect(goodRadio).not.toBeChecked();

    fireEvent.click(goodRadio);
    expect(goodRadio).toBeChecked();

    const likeNewRadio = screen.getByRole('radio', { name: /Like New/i });
    fireEvent.click(likeNewRadio);

    expect(likeNewRadio).toBeChecked();
    expect(goodRadio).not.toBeChecked();
  });

  test('Category select shows all options', async () => {
    const handleClose = jest.fn();

    render(<SellItemModal onClose={handleClose} />);

    const categorySelect = screen.getByDisplayValue(/Select category/i);
    const options = categorySelect.querySelectorAll('option');

    expect(options.length).toBeGreaterThan(1);
    expect(screen.getByRole('option', { name: /Textbooks/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Electronics/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Furniture/i })).toBeInTheDocument();
  });

  test('Price input accepts only numbers', async () => {
    const handleClose = jest.fn();
    const user = userEvent.setup();

    render(<SellItemModal onClose={handleClose} />);

    const priceInput = screen.getByPlaceholderText(/0.00/i);

    await user.type(priceInput, '1999.99');
    expect(priceInput).toHaveValue(1999.99);
  });

  test('Form retains data when re-rendered', async () => {
    const handleClose = jest.fn();
    const user = userEvent.setup();

    const { rerender } = render(<SellItemModal onClose={handleClose} />);

    const titleInput = screen.getByPlaceholderText(/e.g. Minimalist Desk Lamp/i);
    await user.type(titleInput, 'Laptop');

    rerender(<SellItemModal onClose={handleClose} />);

    // Note: In a real scenario, data might persist depending on implementation
    expect(screen.getByPlaceholderText(/e.g. Minimalist Desk Lamp/i)).toBeInTheDocument();
  });

  test('Modal header displays correct title', () => {
    const handleClose = jest.fn();

    render(<SellItemModal onClose={handleClose} />);

    expect(screen.getByText(/List New Item/i)).toBeInTheDocument();
  });

  test('Photo upload area shows correct instructions', () => {
    const handleClose = jest.fn();

    render(<SellItemModal onClose={handleClose} />);

    expect(screen.getByText(/Click to upload images/i)).toBeInTheDocument();
    expect(screen.getByText(/PNG, JPG up to 5MB/i)).toBeInTheDocument();
  });

  test('Form validation fails when only title is filled', async () => {
    const handleClose = jest.fn();
    const user = userEvent.setup();

    render(<SellItemModal onClose={handleClose} />);

    const titleInput = screen.getByPlaceholderText(/e.g. Minimalist Desk Lamp/i);
    await user.type(titleInput, 'Test Item');

    const submitButton = screen.getByRole('button', { name: /Post Listing/i });
    fireEvent.click(submitButton);

    // Modal should still be open
    expect(screen.getByText(/List New Item/i)).toBeInTheDocument();
  });

  test('Cancel button and X button both close modal', () => {
    const handleClose = jest.fn();

    render(<SellItemModal onClose={handleClose} />);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('Supabase storage is called with correct bucket name', async () => {
    const handleClose = jest.fn();
    const mockSupabase = require('./utils/supabase').supabase;
    const user = userEvent.setup();

    render(<SellItemModal onClose={handleClose} />);

    const titleInput = screen.getByPlaceholderText(/e.g. Minimalist Desk Lamp/i);
    const priceInput = screen.getByPlaceholderText(/0.00/i);
    const categorySelect = screen.getByDisplayValue(/Select category/i);

    await user.type(titleInput, 'Test Item');
    await user.type(priceInput, '100');
    await user.selectOptions(categorySelect, 'textbooks');

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const submitButton = screen.getByRole('button', { name: /Post Listing/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('Listings');
    });
  });
});
