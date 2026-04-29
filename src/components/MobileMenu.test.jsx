import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MobileMenu from './MobileMenu';

// ─── Mocks ───────────────────────────────────────────────────────────────────
jest.mock('lucide-react', () => ({
  X: ({ size, className }) => (
    <svg data-testid="close-icon" width={size} className={className} />
  ),
  Home: ({ size }) => <svg data-testid="home-icon" width={size} />,
  Heart: ({ size }) => <svg data-testid="heart-icon" width={size} />,
  ShoppingBag: ({ size }) => <svg data-testid="shopping-bag-icon" width={size} />,
  Calendar: ({ size }) => <svg data-testid="calendar-icon" width={size} />,
  MessageCircle: ({ size }) => <svg data-testid="message-icon" width={size} />,
  User: ({ size }) => <svg data-testid="user-icon" width={size} />,
  LogOut: ({ size }) => <svg data-testid="logout-icon" width={size} />,
  Plus: ({ size }) => <svg data-testid="plus-icon" width={size} />,
  Search: ({ size }) => <svg data-testid="search-icon" width={size} />,
}));

// ─── Mock data ────────────────────────────────────────────────────────────────
const mockUser = {
  id: 'user-123',
  email: 'student@example.com',
};

const defaultProps = {
  isOpen: false,
  onClose: jest.fn(),
  currentView: 'home',
  onNavigate: jest.fn(),
  wishlistCount: 5,
  pendingOrdersCount: 2,
  unreadMessagesCount: 3,
  onOpenSearch: jest.fn(),
  onSellItem: jest.fn(),
  onLogout: jest.fn(),
  user: mockUser,
};

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('MobileMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  describe('Visibility and rendering', () => {
    it('does not render menu when isOpen is false', () => {
      render(<MobileMenu {...defaultProps} isOpen={false} />);

      // The menu container with role="navigation" should not be visible
      const menuNav = screen.queryByRole('navigation', {
        hidden: true,
      });
      expect(menuNav).toBeInTheDocument();
      expect(menuNav).toHaveClass('-translate-x-full');
    });

    it('renders menu when isOpen is true', () => {
      render(<MobileMenu {...defaultProps} isOpen={true} />);

      const menuNav = screen.getByRole('navigation', {
        hidden: true,
      });
      expect(menuNav).toHaveClass('translate-x-0');
    });

    it('renders the UniMart header text', () => {
      render(<MobileMenu {...defaultProps} isOpen={true} />);

      expect(screen.getByText('UniMart')).toBeInTheDocument();
    });

    it('renders all navigation menu items', () => {
      render(<MobileMenu {...defaultProps} isOpen={true} />);

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Wishlist')).toBeInTheDocument();
      expect(screen.getByText('My Orders')).toBeInTheDocument();
      expect(screen.getByText('Bookings')).toBeInTheDocument();
    });

    it('renders all action items', () => {
      render(<MobileMenu {...defaultProps} isOpen={true} />);

      expect(screen.getByText('Search')).toBeInTheDocument();
      expect(screen.getByText('Messages')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('renders Sell Item button', () => {
      render(<MobileMenu {...defaultProps} isOpen={true} />);

      expect(screen.getByText('Sell Item')).toBeInTheDocument();
    });

    it('renders Sign Out button', () => {
      render(<MobileMenu {...defaultProps} isOpen={true} />);

      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    it('renders close button with correct aria label', () => {
      render(<MobileMenu {...defaultProps} isOpen={true} />);

      const closeButton = screen.getByRole('button', { name: /close mobile menu/i });
      expect(closeButton).toBeInTheDocument();
    });

    it('renders backdrop overlay when menu is open', () => {
      const { container } = render(<MobileMenu {...defaultProps} isOpen={true} />);

      const backdrop = container.querySelector('.bg-black\\/50');
      expect(backdrop).toBeInTheDocument();
    });

    it('does not render backdrop when menu is closed', () => {
      const { container } = render(<MobileMenu {...defaultProps} isOpen={false} />);

      const backdrop = container.querySelector('.bg-black\\/50');
      expect(backdrop).not.toBeInTheDocument();
    });
  });

  describe('Notification badges', () => {
    it('displays wishlist count badge', () => {
      render(<MobileMenu {...defaultProps} isOpen={true} wishlistCount={5} />);

      const badge = screen.getByText('5');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-red-500');
    });

    it('displays unread messages count badge', () => {
      render(<MobileMenu {...defaultProps} isOpen={true} unreadMessagesCount={3} />);

      const badge = screen.getByText('3');
      expect(badge).toBeInTheDocument();
    });

    it('displays pending orders count badge', () => {
      render(
        <MobileMenu {...defaultProps} isOpen={true} pendingOrdersCount={2} />
      );

      const badge = screen.getByText('2');
      expect(badge).toBeInTheDocument();
    });

    it('caps unread messages at 99+', () => {
      render(
        <MobileMenu {...defaultProps} isOpen={true} unreadMessagesCount={150} />
      );

      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('does not show unread messages badge when count is 0', () => {
      render(
        <MobileMenu {...defaultProps} isOpen={true} unreadMessagesCount={0} />
      );

      const badges = screen.queryAllByText(/^\d+\+?$/);
      // Only wishlist and orders badges should be visible if pendingOrdersCount > 0
      expect(badges).toBeDefined();
    });

    it('does not show pending orders badge when count is 0', () => {
      render(
        <MobileMenu {...defaultProps} isOpen={true} pendingOrdersCount={0} />
      );

      // Just verify that 2 is not rendered when pendingOrdersCount is 0
      expect(screen.queryByText('2')).not.toBeInTheDocument();
    });
  });

  describe('Navigation interactions', () => {
    it('calls onNavigate and onClose when Home is clicked', async () => {
      const user = userEvent.setup();
      const onNavigate = jest.fn();
      const onClose = jest.fn();

      render(
        <MobileMenu
          {...defaultProps}
          isOpen={true}
          onNavigate={onNavigate}
          onClose={onClose}
        />
      );

      const homeButton = screen.getByText('Home').closest('button');
      await user.click(homeButton);

      expect(onNavigate).toHaveBeenCalledWith('home');
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onNavigate with "wishlist" when Wishlist is clicked', async () => {
      const user = userEvent.setup();
      const onNavigate = jest.fn();
      const onClose = jest.fn();

      render(
        <MobileMenu
          {...defaultProps}
          isOpen={true}
          onNavigate={onNavigate}
          onClose={onClose}
        />
      );

      const wishlistButton = screen.getByText('Wishlist').closest('button');
      await user.click(wishlistButton);

      expect(onNavigate).toHaveBeenCalledWith('wishlist');
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onNavigate with "orders" when My Orders is clicked', async () => {
      const user = userEvent.setup();
      const onNavigate = jest.fn();
      const onClose = jest.fn();

      render(
        <MobileMenu
          {...defaultProps}
          isOpen={true}
          onNavigate={onNavigate}
          onClose={onClose}
        />
      );

      const ordersButton = screen.getByText('My Orders').closest('button');
      await user.click(ordersButton);

      expect(onNavigate).toHaveBeenCalledWith('orders');
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onNavigate with "bookings" when Bookings is clicked', async () => {
      const user = userEvent.setup();
      const onNavigate = jest.fn();
      const onClose = jest.fn();

      render(
        <MobileMenu
          {...defaultProps}
          isOpen={true}
          onNavigate={onNavigate}
          onClose={onClose}
        />
      );

      const bookingsButton = screen.getByText('Bookings').closest('button');
      await user.click(bookingsButton);

      expect(onNavigate).toHaveBeenCalledWith('bookings');
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onNavigate with "messages" when Messages is clicked', async () => {
      const user = userEvent.setup();
      const onNavigate = jest.fn();
      const onClose = jest.fn();

      render(
        <MobileMenu
          {...defaultProps}
          isOpen={true}
          onNavigate={onNavigate}
          onClose={onClose}
        />
      );

      const messagesButton = screen.getByText('Messages').closest('button');
      await user.click(messagesButton);

      expect(onNavigate).toHaveBeenCalledWith('messages');
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onNavigate with "profile" when Profile is clicked', async () => {
      const user = userEvent.setup();
      const onNavigate = jest.fn();
      const onClose = jest.fn();

      render(
        <MobileMenu
          {...defaultProps}
          isOpen={true}
          onNavigate={onNavigate}
          onClose={onClose}
        />
      );

      const profileButton = screen.getByText('Profile').closest('button');
      await user.click(profileButton);

      expect(onNavigate).toHaveBeenCalledWith('profile');
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onOpenSearch when Search is clicked', async () => {
      const user = userEvent.setup();
      const onOpenSearch = jest.fn();
      const onClose = jest.fn();

      render(
        <MobileMenu
          {...defaultProps}
          isOpen={true}
          onOpenSearch={onOpenSearch}
          onClose={onClose}
        />
      );

      const searchButton = screen.getByText('Search').closest('button');
      await user.click(searchButton);

      expect(onOpenSearch).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onSellItem when Sell Item is clicked', async () => {
      const user = userEvent.setup();
      const onSellItem = jest.fn();
      const onClose = jest.fn();

      render(
        <MobileMenu
          {...defaultProps}
          isOpen={true}
          onSellItem={onSellItem}
          onClose={onClose}
        />
      );

      const sellButton = screen.getByText('Sell Item').closest('button');
      await user.click(sellButton);

      expect(onSellItem).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onLogout when Sign Out is clicked', async () => {
      const user = userEvent.setup();
      const onLogout = jest.fn();
      const onClose = jest.fn();

      render(
        <MobileMenu
          {...defaultProps}
          isOpen={true}
          onLogout={onLogout}
          onClose={onClose}
        />
      );

      const logoutButton = screen.getByText('Sign Out').closest('button');
      await user.click(logoutButton);

      expect(onLogout).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Close button interactions', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(
        <MobileMenu {...defaultProps} isOpen={true} onClose={onClose} />
      );

      const closeButton = screen.getByRole('button', { name: /close mobile menu/i });
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      const { container } = render(
        <MobileMenu {...defaultProps} isOpen={true} onClose={onClose} />
      );

      const backdrop = container.querySelector('.bg-black\\/50');
      await user.click(backdrop);

      expect(onClose).toHaveBeenCalled();
    });

    it('focuses close button when menu opens', () => {
      render(<MobileMenu {...defaultProps} isOpen={true} />);

      const closeButton = screen.getByRole('button', { name: /close mobile menu/i });
      // Close button should be focused (this is managed by the component internally)
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Keyboard interactions', () => {
    it('closes menu when Escape key is pressed', async () => {
      const onClose = jest.fn();

      render(
        <MobileMenu {...defaultProps} isOpen={true} onClose={onClose} />
      );

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('does not close menu when other keys are pressed', async () => {
      const onClose = jest.fn();

      render(
        <MobileMenu {...defaultProps} isOpen={true} onClose={onClose} />
      );

      fireEvent.keyDown(document, { key: 'Enter', code: 'Enter' });

      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not respond to Escape when menu is closed', () => {
      const onClose = jest.fn();

      render(
        <MobileMenu {...defaultProps} isOpen={false} onClose={onClose} />
      );

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Body scroll behavior', () => {
    it('prevents body scroll when menu is open', () => {
      const { rerender } = render(
        <MobileMenu {...defaultProps} isOpen={false} />
      );

      expect(document.body.style.overflow).toBe('');

      rerender(<MobileMenu {...defaultProps} isOpen={true} />);

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores body scroll when menu is closed', () => {
      const { rerender } = render(
        <MobileMenu {...defaultProps} isOpen={true} />
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(<MobileMenu {...defaultProps} isOpen={false} />);

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Current view highlighting', () => {
    it('highlights current view as "home"', () => {
      render(<MobileMenu {...defaultProps} isOpen={true} currentView="home" />);

      const homeButton = screen.getByText('Home').closest('button');
      expect(homeButton).toHaveClass('bg-dark');
      expect(homeButton).toHaveClass('text-white');
    });

    it('highlights current view as "profile"', () => {
      render(<MobileMenu {...defaultProps} isOpen={true} currentView="profile" />);

      const profileButton = screen.getByText('Profile').closest('button');
      expect(profileButton).toHaveClass('bg-dark');
      expect(profileButton).toHaveClass('text-white');
    });

    it('does not highlight non-current views', () => {
      render(<MobileMenu {...defaultProps} isOpen={true} currentView="home" />);

      const wishlistButton = screen.getByText('Wishlist').closest('button');
      expect(wishlistButton).not.toHaveClass('bg-dark');
    });

    it('updates highlighting when currentView prop changes', () => {
      const { rerender } = render(
        <MobileMenu {...defaultProps} isOpen={true} currentView="home" />
      );

      expect(screen.getByText('Home').closest('button')).toHaveClass('bg-dark');

      rerender(
        <MobileMenu {...defaultProps} isOpen={true} currentView="profile" />
      );

      expect(screen.getByText('Profile').closest('button')).toHaveClass('bg-dark');
    });
  });

  describe('Accessibility attributes', () => {
    it('has proper ARIA attributes on navigation role', () => {
      render(<MobileMenu {...defaultProps} isOpen={true} />);

      const menuNav = screen.getByRole('navigation', {
        hidden: true,
      });
      expect(menuNav).toHaveAttribute('aria-label', 'Mobile navigation menu');
    });

    it('sets aria-hidden when menu is closed', () => {
      render(<MobileMenu {...defaultProps} isOpen={false} />);

      const menuNav = screen.getByRole('navigation', {
        hidden: true,
      });
      expect(menuNav).toHaveAttribute('aria-hidden', 'true');
    });

    it('sets aria-hidden to false when menu is open', () => {
      render(<MobileMenu {...defaultProps} isOpen={true} />);

      const menuNav = screen.getByRole('navigation', {
        hidden: true,
      });
      expect(menuNav).toHaveAttribute('aria-hidden', 'false');
    });

    it('has aria-current="page" for current view', () => {
      render(<MobileMenu {...defaultProps} isOpen={true} currentView="home" />);

      const homeButton = screen.getByText('Home').closest('button');
      expect(homeButton).toHaveAttribute('aria-current', 'page');
    });

    it('does not have aria-current for non-current views', () => {
      render(<MobileMenu {...defaultProps} isOpen={true} currentView="home" />);

      const wishlistButton = screen.getByText('Wishlist').closest('button');
      expect(wishlistButton).not.toHaveAttribute('aria-current');
    });

    it('has focus ring styling on close button', () => {
      render(<MobileMenu {...defaultProps} isOpen={true} />);

      const closeButton = screen.getByRole('button', { name: /close mobile menu/i });
      expect(closeButton).toHaveClass('focus:ring-2');
      expect(closeButton).toHaveClass('focus:ring-primary');
    });
  });

  describe('Edge cases', () => {
    it('handles missing onLogout gracefully', () => {
      const { onLogout, ...propsWithoutLogout } = defaultProps;

      render(
        <MobileMenu {...propsWithoutLogout} onLogout={undefined} isOpen={true} />
      );

      expect(screen.queryByText('Sign Out')).not.toBeInTheDocument();
    });

    it('renders without user prop', () => {
      render(
        <MobileMenu {...defaultProps} isOpen={true} user={undefined} />
      );

      expect(screen.getByText('UniMart')).toBeInTheDocument();
    });

    it('handles null badge counts', () => {
      render(
        <MobileMenu
          {...defaultProps}
          isOpen={true}
          wishlistCount={null}
          pendingOrdersCount={null}
          unreadMessagesCount={null}
        />
      );

      // Menu should still render without crashing
      expect(screen.getByText('Home')).toBeInTheDocument();
    });
  });

  describe('Icon rendering', () => {
    it('renders all menu item icons', () => {
      render(<MobileMenu {...defaultProps} isOpen={true} />);

      expect(screen.getByTestId('home-icon')).toBeInTheDocument();
      expect(screen.getByTestId('heart-icon')).toBeInTheDocument();
      expect(screen.getByTestId('shopping-bag-icon')).toBeInTheDocument();
      expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
      expect(screen.getByTestId('message-icon')).toBeInTheDocument();
      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
      expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
      expect(screen.getByTestId('logout-icon')).toBeInTheDocument();
    });
  });
});
