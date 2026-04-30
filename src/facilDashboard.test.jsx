import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FacilDashboard from './facilDashboard';

// Mock all child view components so we only test the shell
jest.mock('./components/facidashboard/QueueView', () => () => <div>Mock QueueView</div>);
jest.mock('./components/facidashboard/Dropoffsview', () => () => <div>Mock DropOffsView</div>);
jest.mock('./components/facidashboard/Collectionsview', () => () => <div>Mock CollectionsView</div>);
jest.mock('./components/facidashboard/History', () => () => <div>Mock HistoryView</div>);

describe('FacilDashboard', () => {

  describe('rendering', () => {
    test('renders without crashing', () => {
      render(<FacilDashboard />);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    test('renders the UniMart branding', () => {
      render(<FacilDashboard />);
      expect(screen.getByText('UniMart')).toBeInTheDocument();
    });

    test('renders the Trade Staff heading', () => {
      render(<FacilDashboard />);
      expect(screen.getAllByText(/Trade Staff/i).length).toBeGreaterThan(0);
    });
  });

  describe('sidebar navigation', () => {
    test('renders all four nav items', () => {
      render(<FacilDashboard />);
      expect(screen.getByRole('button', { name: /Queue/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Drop-offs/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Collections/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /History/i })).toBeInTheDocument();
    });

    test('Queue is the active nav item on initial render', () => {
      render(<FacilDashboard />);
      // The active item gets bg-dark text-white classes
      const queueBtn = screen.getByRole('button', { name: /Queue/i });
      expect(queueBtn.className).toMatch(/bg-dark/);
    });
  });

  describe('page header', () => {
    test('shows Queue heading and description by default', () => {
      render(<FacilDashboard />);
      expect(screen.getByRole('heading', { name: 'Queue', level: 2 })).toBeInTheDocument();
      expect(screen.getByText(/Review all pending and confirmed bookings/i)).toBeInTheDocument();
    });
  });

  describe('view switching', () => {
    test('clicking Drop-offs shows DropOffsView and updates header', () => {
      render(<FacilDashboard />);
      fireEvent.click(screen.getByRole('button', { name: /Drop-offs/i }));
      expect(screen.getByText('Mock DropOffsView')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Drop-offs', level: 2 })).toBeInTheDocument();
      expect(screen.getByText(/Confirm items ready for drop-off/i)).toBeInTheDocument();
    });

    test('clicking Collections shows CollectionsView and updates header', () => {
      render(<FacilDashboard />);
      fireEvent.click(screen.getByRole('button', { name: /Collections/i }));
      expect(screen.getByText('Mock CollectionsView')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Collections', level: 2 })).toBeInTheDocument();
      expect(screen.getByText(/Release items to buyers/i)).toBeInTheDocument();
    });

    test('clicking History shows HistoryView and updates header', () => {
      render(<FacilDashboard />);
      fireEvent.click(screen.getByRole('button', { name: /History/i }));
      expect(screen.getByText('Mock HistoryView')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'History', level: 2 })).toBeInTheDocument();
      expect(screen.getByText(/View completed and cancelled bookings/i)).toBeInTheDocument();
    });

    test('clicking Queue shows QueueView', () => {
      render(<FacilDashboard />);
      // Navigate away first
      fireEvent.click(screen.getByRole('button', { name: /History/i }));
      // Then back to Queue
      fireEvent.click(screen.getByRole('button', { name: /Queue/i }));
      expect(screen.getByText('Mock QueueView')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Queue', level: 2 })).toBeInTheDocument();
    });

    test('active nav button gets highlighted style after click', () => {
      render(<FacilDashboard />);
      const dropoffsBtn = screen.getByRole('button', { name: /Drop-offs/i });
      fireEvent.click(dropoffsBtn);
      expect(dropoffsBtn.className).toMatch(/bg-dark/);
    });

    test('previous active nav loses highlight after switching', () => {
      render(<FacilDashboard />);
      const queueBtn = screen.getByRole('button', { name: /Queue/i });
      fireEvent.click(screen.getByRole('button', { name: /Drop-offs/i }));
      expect(queueBtn.className).not.toMatch(/bg-dark/);
    });
  });

  describe('logout button', () => {
    test('renders logout button when handleLogout is provided', () => {
      const handleLogout = jest.fn();
      render(<FacilDashboard handleLogout={handleLogout} />);
      expect(screen.getByRole('button', { name: /Logout/i })).toBeInTheDocument();
    });

    test('does not render logout button when handleLogout is not provided', () => {
      render(<FacilDashboard />);
      expect(screen.queryByRole('button', { name: /Logout/i })).not.toBeInTheDocument();
    });

    test('calls handleLogout when logout button is clicked', () => {
      const handleLogout = jest.fn();
      render(<FacilDashboard handleLogout={handleLogout} />);
      fireEvent.click(screen.getByRole('button', { name: /Logout/i }));
      expect(handleLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('mobile menu', () => {
    test('renders the mobile menu toggle button', () => {
      render(<FacilDashboard />);
      expect(screen.getByRole('button', { name: '' })).toBeInTheDocument();
    });

    test('toggles sidebar open and closed on mobile menu button click', () => {
      render(<FacilDashboard />);
      // Find the mobile toggle (the Menu/X button in the top bar)
      const toggleBtn = screen.getAllByRole('button').find(
        (btn) => !btn.textContent.trim() || btn.closest('.lg\\:hidden')
      );
      // Sidebar starts closed (translate-x-full on mobile)
      const aside = document.querySelector('aside');
      expect(aside.className).toMatch(/-translate-x-full/);
      fireEvent.click(toggleBtn);
      expect(aside.className).toMatch(/translate-x-0/);
    });

    test('closes sidebar after selecting a nav item', () => {
      render(<FacilDashboard />);
      // Open sidebar
      const toggleBtn = screen.getAllByRole('button').find(
        (btn) => btn.closest('.lg\\:hidden')
      );
      fireEvent.click(toggleBtn);
      // Click a nav item
      fireEvent.click(screen.getByRole('button', { name: /Collections/i }));
      const aside = document.querySelector('aside');
      expect(aside.className).toMatch(/-translate-x-full/);
    });
  });

});
