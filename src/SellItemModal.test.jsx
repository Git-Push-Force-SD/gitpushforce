import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SellItemModal from './SellItemModal';

describe('SellItemModal Component', () => {
  test('renders form fields and calls onClose when cancel is clicked', () => {
    const handleClose = jest.fn();

    render(<SellItemModal onClose={handleClose} />);

    expect(screen.getByText('List New Item')).toBeInTheDocument();
    expect(screen.getByText('Item Photos')).toBeInTheDocument();
    expect(screen.getByText('Item Title')).toBeInTheDocument();
    expect(screen.getByText('Price (R)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Post Listing/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
