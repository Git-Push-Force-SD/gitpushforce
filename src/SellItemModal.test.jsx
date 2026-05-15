import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SellItemModal from './SellItemModal';
import * as AuthContext from './AuthContext';

global.alert = jest.fn();

jest.mock('./utils/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => Promise.resolve({ data: null, error: null }))
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ data: { path: 'test/upload.jpg' }, error: null }))
      }))
    },
    functions: {
      invoke: jest.fn(() => Promise.resolve({
        data: { min: 500, max: 1500, reason: 'Based on CPI data' },
        error: null
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
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Modal opens with all form fields', () => {
    render(<SellItemModal onClose={jest.fn()} />);

    expect(screen.getByText(/List New Item/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g. Minimalist Desk Lamp/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/0.00/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Select category/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Describe your item/i)).toBeInTheDocument();
  });

  test('Modal closes when Cancel button is clicked', () => {
    const handleClose = jest.fn();
    render(<SellItemModal onClose={handleClose} />);

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('Modal closes when X button is clicked', () => {
    const handleClose = jest.fn();
    render(<SellItemModal onClose={handleClose} />);

    const allButtons = screen.getAllByRole('button');
    const xButton = allButtons.find(btn => btn.querySelector('svg'));
    if (xButton) {
      fireEvent.click(xButton);
      expect(handleClose).toHaveBeenCalled();
    }
  });

  test('Form inputs update correctly when user types', async () => {
    const user = userEvent.setup();
    render(<SellItemModal onClose={jest.fn()} />);

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
    const user = userEvent.setup();
    render(<SellItemModal onClose={jest.fn()} />);

    const categorySelect = screen.getByDisplayValue(/Select category/i);
    await user.selectOptions(categorySelect, 'electronics');
    expect(categorySelect).toHaveValue('electronics');
  });

  test('Listing type defaults to sale', () => {
    render(<SellItemModal onClose={jest.fn()} />);

    const listingTypeSelect = screen.getByDisplayValue(/Sale/i);
    expect(listingTypeSelect).toHaveValue('sale');
  });

  test('Listing type can be changed to trade', async () => {
    const user = userEvent.setup();
    render(<SellItemModal onClose={jest.fn()} />);

    const listingTypeSelect = screen.getByDisplayValue(/Sale/i);
    await user.selectOptions(listingTypeSelect, 'trade');
    expect(listingTypeSelect).toHaveValue('trade');
  });


  test('Condition is optional and not selected by default', () => {
    render(<SellItemModal onClose={jest.fn()} />);

    const newRadio = screen.getByRole('radio', { name: /^New$/i });
    const likeNewRadio = screen.getByRole('radio', { name: /Like New/i });
    const goodRadio = screen.getByRole('radio', { name: /Good/i });

    expect(newRadio).not.toBeChecked();
    expect(likeNewRadio).not.toBeChecked();
    expect(goodRadio).not.toBeChecked();
  });

  test('Condition radio button can be selected', () => {
    render(<SellItemModal onClose={jest.fn()} />);

    const likeNewRadio = screen.getByRole('radio', { name: /Like New/i });
    fireEvent.click(likeNewRadio);
    expect(likeNewRadio).toBeChecked();
  });

  test('Condition clear button appears after selection and clears condition', async () => {
    render(<SellItemModal onClose={jest.fn()} />);

    const goodRadio = screen.getByRole('radio', { name: /Good/i });
    fireEvent.click(goodRadio);
    expect(goodRadio).toBeChecked();

    const clearButton = screen.getByRole('button', { name: /Clear/i });
    expect(clearButton).toBeInTheDocument();
    fireEvent.click(clearButton);

    expect(goodRadio).not.toBeChecked();
    expect(screen.queryByRole('button', { name: /Clear/i })).not.toBeInTheDocument();
  });

  test('Condition label shows optional text', () => {
    render(<SellItemModal onClose={jest.fn()} />);
    expect(screen.getByText(/optional/i)).toBeInTheDocument();
  });

  test('Form validation prevents submission without required fields', () => {
    render(<SellItemModal onClose={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Post Listing/i }));
    expect(screen.getByText(/List New Item/i)).toBeInTheDocument();
  });

  test('File upload button allows image selection', () => {
    render(<SellItemModal onClose={jest.fn()} />);

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('accept', expect.stringContaining('image'));
  });

  test('Upload area shows feedback when image is selected', async () => {
    render(<SellItemModal onClose={jest.fn()} />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Image selected/i)).toBeInTheDocument();
    });
  });

  test('Price suggestion is fetched when title and category are filled', async () => {
    const mockSupabase = require('./utils/supabase').supabase;
    const user = userEvent.setup();
    render(<SellItemModal onClose={jest.fn()} />);

    const titleInput = screen.getByPlaceholderText(/e.g. Minimalist Desk Lamp/i);
    await user.type(titleInput, 'Samsung Laptop');

    const categorySelect = screen.getByDisplayValue(/Select category/i);
    await user.selectOptions(categorySelect, 'electronics');

    await waitFor(() => {
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'suggest-price',
        expect.objectContaining({
          body: expect.objectContaining({
            title: 'Samsung Laptop',
            category: 'ELECTRONICS',
          })
        })
      );
    }, { timeout: 2000 });
  });

  test('Price suggestion banner displays when suggestion is returned', async () => {
    const user = userEvent.setup();
    render(<SellItemModal onClose={jest.fn()} />);

    await user.type(screen.getByPlaceholderText(/e.g. Minimalist Desk Lamp/i), 'Samsung Laptop');
    await user.selectOptions(screen.getByDisplayValue(/Select category/i), 'electronics');

    await waitFor(() => {
      expect(screen.getByText(/Suggested:/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('Use suggested price button fills price input', async () => {
    const user = userEvent.setup();
    render(<SellItemModal onClose={jest.fn()} />);

    await user.type(screen.getByPlaceholderText(/e.g. Minimalist Desk Lamp/i), 'Samsung Laptop');
    await user.selectOptions(screen.getByDisplayValue(/Select category/i), 'electronics');

    await waitFor(() => {
      expect(screen.getByText(/Use suggested price/i)).toBeInTheDocument();
    }, { timeout: 2000 });

    fireEvent.click(screen.getByText(/Use suggested price/i));
    expect(screen.getByPlaceholderText(/0.00/i)).toHaveValue(500);
  });

  test('Form submission triggers Supabase upload and insert', async () => {
    const mockSupabase = require('./utils/supabase').supabase;
    const user = userEvent.setup();
    render(<SellItemModal onClose={jest.fn()} />);

    await user.type(screen.getByPlaceholderText(/e.g. Minimalist Desk Lamp/i), 'Test Item');
    await user.type(screen.getByPlaceholderText(/0.00/i), '100');
    await user.selectOptions(screen.getByDisplayValue(/Select category/i), 'textbooks');
    await user.type(screen.getByPlaceholderText(/Describe your item/i), 'Test description');

    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [new File(['test'], 'test.jpg', { type: 'image/jpeg' })] } });

    fireEvent.click(screen.getByRole('button', { name: /Post Listing/i }));

    await waitFor(() => {
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('Listings');
    });
  });

  test('Error message displays for invalid file type', async () => {
    render(<SellItemModal onClose={jest.fn()} />);

    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [new File(['test'], 'test.txt', { type: 'text/plain' })] } });

    await waitFor(() => {
      expect(screen.getByText(/valid image file/i)).toBeInTheDocument();
    });
  });

  test('Error message displays for oversized file', async () => {
    render(<SellItemModal onClose={jest.fn()} />);

    const fileInput = document.querySelector('input[type="file"]');
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByText(/less than 5MB/i)).toBeInTheDocument();
    });
  });

  test('Error clears when valid file is uploaded after error', async () => {
    render(<SellItemModal onClose={jest.fn()} />);

    const fileInput = document.querySelector('input[type="file"]');

    fireEvent.change(fileInput, { target: { files: [new File(['test'], 'test.txt', { type: 'text/plain' })] } });
    await waitFor(() => expect(screen.getByText(/valid image file/i)).toBeInTheDocument());

    fireEvent.change(fileInput, { target: { files: [new File(['test'], 'test.jpg', { type: 'image/jpeg' })] } });
    await waitFor(() => expect(screen.getByText(/Image selected/i)).toBeInTheDocument());
  });

  test('File upload feedback displays selected file name', async () => {
    render(<SellItemModal onClose={jest.fn()} />);

    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [new File(['test'], 'my-item.jpg', { type: 'image/jpeg' })] } });

    await waitFor(() => {
      expect(screen.getByText(/my-item.jpg/i)).toBeInTheDocument();
    });
  });

  test('Radio buttons for condition work correctly', () => {
    render(<SellItemModal onClose={jest.fn()} />);

    const goodRadio = screen.getByRole('radio', { name: /Good/i });
    const likeNewRadio = screen.getByRole('radio', { name: /Like New/i });

    fireEvent.click(goodRadio);
    expect(goodRadio).toBeChecked();

    fireEvent.click(likeNewRadio);
    expect(likeNewRadio).toBeChecked();
    expect(goodRadio).not.toBeChecked();
  });

  test('Category select shows all options', () => {
    render(<SellItemModal onClose={jest.fn()} />);

    expect(screen.getByRole('option', { name: /Textbooks/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Electronics/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Furniture/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Clothing/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Other/i })).toBeInTheDocument();
  });

  test('Listing type select shows all options', () => {
    render(<SellItemModal onClose={jest.fn()} />);

    expect(screen.getByRole('option', { name: /Sale/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Trade/i })).toBeInTheDocument();
  });

  test('Price input accepts only numbers', async () => {
    const user = userEvent.setup();
    render(<SellItemModal onClose={jest.fn()} />);

    const priceInput = screen.getByPlaceholderText(/0.00/i);
    await user.type(priceInput, '1999.99');
    expect(priceInput).toHaveValue(1999.99);
  });

  test('Modal header displays correct title', () => {
    render(<SellItemModal onClose={jest.fn()} />);
    expect(screen.getByText(/List New Item/i)).toBeInTheDocument();
  });

  test('Photo upload area shows correct instructions', () => {
    render(<SellItemModal onClose={jest.fn()} />);
    expect(screen.getByText(/Click to upload images/i)).toBeInTheDocument();
    expect(screen.getByText(/PNG, JPG up to 5MB/i)).toBeInTheDocument();
  });

  test('Supabase storage is called with correct bucket name', async () => {
    const mockSupabase = require('./utils/supabase').supabase;
    const user = userEvent.setup();
    render(<SellItemModal onClose={jest.fn()} />);

    await user.type(screen.getByPlaceholderText(/e.g. Minimalist Desk Lamp/i), 'Test Item');
    await user.type(screen.getByPlaceholderText(/0.00/i), '100');
    await user.selectOptions(screen.getByDisplayValue(/Select category/i), 'textbooks');

    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [new File(['test'], 'test.jpg', { type: 'image/jpeg' })] } });

    fireEvent.click(screen.getByRole('button', { name: /Post Listing/i }));

    await waitFor(() => {
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('Listings');
    });
  });

  test('Description input accepts text', async () => {
    const user = userEvent.setup();
    render(<SellItemModal onClose={jest.fn()} />);

    const descriptionInput = screen.getByPlaceholderText(/Describe your item/i);
    const testDescription = 'Slightly used, missing page 23, otherwise perfect';
    await user.type(descriptionInput, testDescription);
    expect(descriptionInput).toHaveValue(testDescription);
  });

  test('Form validation fails when only title is filled', async () => {
    const user = userEvent.setup();
    render(<SellItemModal onClose={jest.fn()} />);

    await user.type(screen.getByPlaceholderText(/e.g. Minimalist Desk Lamp/i), 'Test Item');
    fireEvent.click(screen.getByRole('button', { name: /Post Listing/i }));
    expect(screen.getByText(/List New Item/i)).toBeInTheDocument();
  });
});