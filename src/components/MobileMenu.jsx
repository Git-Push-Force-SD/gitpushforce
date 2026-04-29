import React, { useEffect, useRef } from 'react';
import { X, Home, Heart, ShoppingBag, Calendar, MessageCircle, User, LogOut, Plus, Search } from 'lucide-react';

const MobileMenu = ({ 
  isOpen, 
  onClose, 
  currentView, 
  onNavigate, 
  wishlistCount,
  pendingOrdersCount,
  unreadMessagesCount,
  onOpenSearch,
  onSellItem,
  onLogout,
  user
}) => {
  const closeButtonRef = useRef(null);

  // Handle keyboard events (Escape key to close, focus management)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Focus the close button when menu opens for better accessibility
    if (closeButtonRef.current) {
      closeButtonRef.current.focus();
    }

    // Prevent body scroll when menu is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  // Close menu when a navigation item is clicked
  const handleNavClick = (view) => {
    onNavigate(view);
    onClose();
  };

  return (
    <>
      {/* Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Slide-out Menu */}
      <div
        className={`fixed top-0 left-0 h-screen w-64 bg-offwhite shadow-lg z-50 transform transition-transform duration-300 ease-in-out md:hidden overflow-y-auto overscroll-contain ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="navigation"
        aria-label="Mobile navigation menu"
        aria-hidden={!isOpen}
      >
        {/* Header with Close Button */}
        <div className="sticky top-0 bg-offwhite border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-xl font-display font-bold text-dark tracking-wider">UniMart</h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close mobile menu"
            title="Close menu (Esc)"
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
          >
            <X size={24} className="text-dark" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="p-6 space-y-2">
          
          {/* Primary Navigation */}
          <div className="space-y-1 pb-6 border-b border-gray-200">
            
            {/* Home */}
            <button
              onClick={() => handleNavClick('home')}
              aria-current={currentView === 'home' ? 'page' : undefined}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                currentView === 'home'
                  ? 'bg-dark text-white'
                  : 'text-dark hover:bg-gray-100'
              }`}
            >
              <Home size={20} />
              <span className="font-medium">Home</span>
            </button>

            {/* Wishlist */}
            <button
              onClick={() => handleNavClick('wishlist')}
              aria-current={currentView === 'wishlist' ? 'page' : undefined}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                currentView === 'wishlist'
                  ? 'bg-dark text-white'
                  : 'text-dark hover:bg-gray-100'
              }`}
            >
              <Heart size={20} />
              <div className="flex items-center justify-between flex-1">
                <span className="font-medium">Wishlist</span>
                <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full font-bold">
                  {wishlistCount}
                </span>
              </div>
            </button>

            {/* My Orders */}
            <button
              onClick={() => handleNavClick('orders')}
              aria-current={currentView === 'orders' ? 'page' : undefined}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                currentView === 'orders'
                  ? 'bg-dark text-white'
                  : 'text-dark hover:bg-gray-100'
              }`}
            >
              <ShoppingBag size={20} />
              <span className="font-medium">My Orders</span>
            </button>

            {/* Bookings */}
            <button
              onClick={() => handleNavClick('bookings')}
              aria-current={currentView === 'bookings' ? 'page' : undefined}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                currentView === 'bookings'
                  ? 'bg-dark text-white'
                  : 'text-dark hover:bg-gray-100'
              }`}
            >
              <Calendar size={20} />
              <div className="flex items-center justify-between flex-1">
                <span className="font-medium">Bookings</span>
                {pendingOrdersCount > 0 && (
                  <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full font-bold">
                    {pendingOrdersCount}
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Action Items */}
          <div className="space-y-1 pb-6 border-b border-gray-200">
            
            {/* Search */}
            <button
              onClick={() => {
                onOpenSearch();
                onClose();
              }}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-lg text-dark hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <Search size={20} />
              <span className="font-medium">Search</span>
            </button>

            {/* Messages */}
            <button
              onClick={() => handleNavClick('messages')}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-lg text-dark hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <MessageCircle size={20} />
              <div className="flex items-center justify-between flex-1">
                <span className="font-medium">Messages</span>
                {unreadMessagesCount > 0 && (
                  <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full font-bold">
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </span>
                )}
              </div>
            </button>

            {/* Profile */}
            <button
              onClick={() => handleNavClick('profile')}
              aria-current={currentView === 'profile' ? 'page' : undefined}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                currentView === 'profile'
                  ? 'bg-dark text-white'
                  : 'text-dark hover:bg-gray-100'
              }`}
            >
              <User size={20} />
              <span className="font-medium">Profile</span>
            </button>
          </div>

          {/* Sell Item */}
          <button
            onClick={() => {
              onSellItem();
              onClose();
            }}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-lg text-dark hover:bg-gray-100 transition-colors mb-6 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <Plus size={20} />
            <span className="font-medium">Sell Item</span>
          </button>

          {/* Sign Out */}
          {onLogout && (
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-lg text-dark hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <LogOut size={20} />
              <span className="font-medium">Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default MobileMenu;
