import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Profile from './Profile';

describe('Profile Component', () => {
  test('renders profile details and supports callbacks', () => {
    const handleBack = jest.fn();
    const handleAddNew = jest.fn();

    render(<Profile onBack={handleBack} onAddNew={handleAddNew} />);

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Alex Scholar')).toBeInTheDocument();
    expect(screen.getByText('My Listings')).toBeInTheDocument();
    expect(screen.getByText('3 active')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Add New Listing/i }));
    expect(handleAddNew).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Profile/i }));
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  test('displays 3 listing cards and logout button', () => {
    render(<Profile onBack={() => {}} onAddNew={() => {}} />);

    expect(screen.getByText('Log Out')).toBeInTheDocument();
    expect(screen.getByText('Advanced Macroeconomics')).toBeInTheDocument();
    expect(screen.getByText('Vintage Film Camera (Working)')).toBeInTheDocument();
    expect(screen.getByText('Minimalist Desk Lamp')).toBeInTheDocument();
  });
});
