import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StudentDashboard from './StudentDashboard';

describe('StudentDashboard Component', () => {
  test('renders home dashboard with recent listings', () => {
    render(<StudentDashboard />);

    expect(screen.getByText('Recent Listings')).toBeInTheDocument();
    expect(screen.getByText('Sell Item')).toBeInTheDocument();
    expect(screen.getByText('UniMart')).toBeInTheDocument();
  });

  test('opens profile view and add-new modal from profile page', () => {
    render(<StudentDashboard />);

    const profileButton = screen.getByRole('button', { name: /Open profile/i });
    fireEvent.click(profileButton);

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add New Listing/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Add New Listing/i }));
    expect(screen.getByText('List New Item')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(screen.queryByText('List New Item')).not.toBeInTheDocument();
  });
});
