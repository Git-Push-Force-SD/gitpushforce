import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FacilDashboard from './facilDashboard';

// Mock all child view components so we only test the shell
jest.mock('./components/facidashboard/QueueView', () => () => <div>Mock QueueView</div>);
jest.mock('./components/facidashboard/Dropoffsview', () => () => <div>Mock DropOffsView</div>);
jest.mock('./components/facidashboard/Collectionsview', () => () => <div>Mock CollectionsView</div>);
jest.mock('./components/facidashboard/History', () => () => <div>Mock HistoryView</div>);

// Helper — renders FacilDashboard inside a MemoryRouter at the given path
const renderAt = (path = '/staff/queue', props = {}) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <FacilDashboard {...props} />
    </MemoryRouter>
  );

describe('FacilDashboard', () => {

  describe('rendering', () => {
    test('renders without crashing', () => {
      renderAt();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    test('renders the UniMart branding', () => {
      renderAt();
      expect(screen.getByText('UniMart')).toBeInTheDocument();
    });

    test('renders the Trade Staff heading', () => {
      renderAt();
      expect(screen.getAllByText(/Trade Staff/i).length).toBeGreaterThan(0);
    });
  });

  describe('sidebar navigation', () => {
    test('renders all four nav items', () => {
      renderAt();
      expect(screen.getByRole('button', { name: /Queue/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Drop-offs/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Collections/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /History/i })).toBeInTheDocument();
    });

    test('Queue is the active nav item when on /staff/queue', () => {
      renderAt('/staff/queue');
      const queueBtn = screen.getByRole('button', { name: /Queue/i });
      expect(queueBtn.className).toMatch(/bg-dark/);
    });

    test('Collections is the active nav item when on /staff/collections', () => {
      renderAt('/staff/collections');
      const collectionsBtn = screen.getByRole('button', { name: /Collections/i });
      expect(collectionsBtn.className).toMatch(/bg-dark/);
    });

    test('History is the active nav item when on /staff/history', () => {
      renderAt('/staff/history');
      const historyBtn = screen.getByRole('button', { name: /History/i });
      expect(historyBtn.className).toMatch(/bg-dark/);
    });
  });

  describe('page header', () => {
    test('shows Queue heading and description on /staff/queue', () => {
      renderAt('/staff/queue');
      expect(screen.getByRole('heading', { name: 'Queue', level: 2 })).toBeInTheDocument();
      expect(screen.getByText(/Review all pending and confirmed bookings/i)).toBeInTheDocument();
    });

    test('shows Collections heading and description on /staff/collections', () => {
      renderAt('/staff/collections');
      expect(screen.getByRole('heading', { name: 'Collections', level: 2 })).toBeInTheDocument();
      expect(screen.getByText(/Release items to buyers/i)).toBeInTheDocument();
    });
  });

  describe('view switching', () => {
    test('clicking Drop-offs updates header', () => {
      renderAt('/staff/queue');
      fireEvent.click(screen.getByRole('button', { name: /Drop-offs/i }));
      expect(screen.getByRole('heading', { name: 'Drop-offs', level: 2 })).toBeInTheDocument();
      expect(screen.getByText(/Confirm items ready for drop-off/i)).toBeInTheDocument();
    });

    test('clicking Collections updates header', () => {
      renderAt('/staff/queue');
      fireEvent.click(screen.getByRole('button', { name: /Collections/i }));
      expect(screen.getByRole('heading', { name: 'Collections', level: 2 })).toBeInTheDocument();
      expect(screen.getByText(/Release items to buyers/i)).toBeInTheDocument();
    });

    test('clicking History updates header', () => {
      renderAt('/staff/queue');
      fireEvent.click(screen.getByRole('button', { name: /History/i }));
      expect(screen.getByRole('heading', { name: 'History', level: 2 })).toBeInTheDocument();
      expect(screen.getByText(/View completed and cancelled bookings/i)).toBeInTheDocument();
    });

    test('clicking Queue after navigating away updates header back', () => {
      renderAt('/staff/history');
      fireEvent.click(screen.getByRole('button', { name: /Queue/i }));
      expect(screen.getByRole('heading', { name: 'Queue', level: 2 })).toBeInTheDocument();
    });

    test('active nav button gets highlighted style after click', () => {
      renderAt('/staff/queue');
      const dropoffsBtn = screen.getByRole('button', { name: /Drop-offs/i });
      fireEvent.click(dropoffsBtn);
      expect(dropoffsBtn.className).toMatch(/bg-dark/);
    });

    test('previous active nav loses highlight after switching', () => {
      renderAt('/staff/queue');
      const queueBtn = screen.getByRole('button', { name: /Queue/i });
      fireEvent.click(screen.getByRole('button', { name: /Drop-offs/i }));
      expect(queueBtn.className).not.toMatch(/bg-dark/);
    });

    test('correct view renders based on URL path', () => {
      renderAt('/staff/collections');
      expect(screen.getByText('Mock CollectionsView')).toBeInTheDocument();
    });

    test('correct view renders for history path', () => {
      renderAt('/staff/history');
      expect(screen.getByText('Mock HistoryView')).toBeInTheDocument();
    });
  });

  describe('logout button', () => {
    test('renders logout button when handleLogout is provided', () => {
      const handleLogout = jest.fn();
      renderAt('/staff/queue', { handleLogout });
      expect(screen.getByRole('button', { name: /Logout/i })).toBeInTheDocument();
    });

    test('does not render logout button when handleLogout is not provided', () => {
      renderAt('/staff/queue');
      expect(screen.queryByRole('button', { name: /Logout/i })).not.toBeInTheDocument();
    });

    test('calls handleLogout when logout button is clicked', () => {
      const handleLogout = jest.fn();
      renderAt('/staff/queue', { handleLogout });
      fireEvent.click(screen.getByRole('button', { name: /Logout/i }));
      expect(handleLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('mobile menu', () => {
    test('sidebar starts closed on mobile', () => {
      renderAt();
      const aside = document.querySelector('aside');
      expect(aside.className).toMatch(/-translate-x-full/);
    });

    test('toggles sidebar open on mobile menu button click', () => {
      renderAt();
      const toggleBtn = screen.getAllByRole('button').find(
        (btn) => btn.closest('.lg\\:hidden')
      );
      fireEvent.click(toggleBtn);
      const aside = document.querySelector('aside');
      expect(aside.className).toMatch(/translate-x-0/);
    });

    test('closes sidebar after selecting a nav item', () => {
      renderAt();
      const toggleBtn = screen.getAllByRole('button').find(
        (btn) => btn.closest('.lg\\:hidden')
      );
      fireEvent.click(toggleBtn);
      fireEvent.click(screen.getByRole('button', { name: /Collections/i }));
      const aside = document.querySelector('aside');
      expect(aside.className).toMatch(/-translate-x-full/);
    });
  });

});
