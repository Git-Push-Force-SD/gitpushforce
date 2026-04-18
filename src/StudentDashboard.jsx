import React, { useMemo,useState } from 'react';
import { Search, MessageCircle, User, Plus, LayoutGrid, List, Heart, SlidersHorizontal, Settings, LogOut,X } from 'lucide-react';
import Profile from './Profile';
import SellItemModal from './SellItemModal';
import AdminPanel from './AdminPanel';
import { isAdminUser } from './utils/constants';

const StudentDashboard = ({ user, userRole, handleLogout }) => {
  const [activeCategory, setActiveCategory] = useState('All Items');
  const [viewMode, setViewMode] = useState('grid');
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'profile' | 'admin'
  const [showSellModal, setShowSellModal] = useState(false);

  // Search filter states
 const [showSearchFilters, setShowSearchFilters] = useState(false);
 const [searchQuery, setSearchQuery] = useState('');
 const [minPrice, setMinPrice] = useState('');
 const [maxPrice, setMaxPrice] = useState('');
  
  const isAdmin = userRole === 'admin' || isAdminUser(user?.email);

  const categories = [
    { name: 'All Items', count: '1.2k' },
    { name: 'Textbooks', count: '432' },
    { name: 'Furniture', count: '156' },
    { name: 'Electronics', count: '89' },
    { name: 'Clothing', count: '210' }
  ];

  const products = [
    {
      id: 1,
      title: 'Introduction to Psychology',
      price: 'R450',
      condition: 'LIKE NEW',
      timePosted: '2 hours ago',
      category: 'TEXTBOOK',
      sellerName: 'Alex M.',
      sellerAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60',
      image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80',
      isFavorite: false,
    },
    {
      id: 2,
      title: 'Mid-Century Desk Chair',
      price: 'R1200',
      condition: 'GOOD',
      timePosted: '5 hours ago',
      category: 'FURNITURE',
      sellerName: 'Sarah K.',
      sellerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60',
      image: 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&w=800&q=80',
      isFavorite: false,
    },
    {
      id: 3,
      title: 'Wireless Headphones',
      price: 'R850',
      condition: 'NEW',
      timePosted: '1 day ago',
      category: 'ELECTRONICS',
      sellerName: 'James L.',
      sellerAvatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&auto=format&fit=crop&q=60',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
      isFavorite: false,
    },
    {
      id: 4,
      title: 'Laptop Stand + Mouse',
      price: 'R300',
      condition: 'LIKE NEW',
      timePosted: '3 hours ago',
      category: 'ELECTRONICS',
      sellerName: 'Emily R.',
      sellerAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=60',
      image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80',
      isFavorite: false,
    },
    {
      id: 5,
      title: 'University Hoodie',
      price: 'R250',
      condition: 'NEW',
      timePosted: '10 mins ago',
      category: 'CLOTHING',
      sellerName: 'Daniel W.',
      sellerAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=60',
      image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=80',
      isFavorite: false,
    },
    {
      id: 6,
      title: 'Canon EOS Rebel T7',
      price: 'R3100',
      condition: 'LIKE NEW',
      timePosted: '8 hours ago',
      category: 'ELECTRONICS',
      sellerName: 'Chloe B.',
      sellerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60',
      image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
      isFavorite: false,
    }
  ];

  const getNumericPrice = (price) => Number(price.replace(/[^\d]/g, '') || 0);

const matchesCategory = (product) => {
  if (activeCategory === 'All Items') return true;

  const categoryMap = {
    Textbooks: 'TEXTBOOK',
    Furniture: 'FURNITURE',
    Electronics: 'ELECTRONICS',
    Clothing: 'CLOTHING',
  };

  return product.category === categoryMap[activeCategory];
};

// Memoized filtered products based on active category, search query, and price range
const filteredProducts = useMemo(() => {
  return products.filter((product) => {
    const priceValue = getNumericPrice(product.price);
    const min = minPrice === '' ? null : Number(minPrice);
    const max = maxPrice === '' ? null : Number(maxPrice);

    const matchesSearch =
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sellerName.toLowerCase().includes(searchQuery.toLowerCase());

    const withinMin = min === null || priceValue >= min;
    const withinMax = max === null || priceValue <= max;

    return matchesCategory(product) && matchesSearch && withinMin && withinMax;
  });
}, [activeCategory, searchQuery, minPrice, maxPrice]);

const clearFilters = () => {
  setSearchQuery('');
  setMinPrice('');
  setMaxPrice('');
  setActiveCategory('All Items');
};

  if (currentView === 'admin') {
    return (
      <AdminPanel user={user} userRole={userRole} onBack={() => setCurrentView('home')} />
    );
  }

  if (currentView === 'profile') {
    return (
      <>
        <Profile 
          onBack={() => setCurrentView('home')} 
          onAddNew={() => setShowSellModal(true)} 
        />
        {showSellModal && <SellItemModal onClose={() => setShowSellModal(false)} />}
      </>
    );
  }

  return (
    <section className="min-h-screen bg-offwhite font-main text-dark pb-20">
      
      {/* Top Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-[1400px] mx-auto">
        <section className="flex items-center gap-10">
          {/* Logo */}
          <section className="text-2xl font-display uppercase tracking-wider font-bold text-dark">
            UniMart
          </section>
          {/* Nav Links */}
          <section className="hidden md:flex gap-6 font-medium text-sm">
            <a href="#" className="hover:text-primary transition-colors border-b-2 border-dark pb-1 text-dark font-semibold">Home</a>
            <a href="#" className="text-gray-500 hover:text-dark transition-colors">My Listings</a>
            <a href="#" className="text-gray-500 hover:text-dark transition-colors">My Orders</a>
            <a href="#" className="text-gray-500 hover:text-dark transition-colors">Trade Facility</a>
          </section>
        </section>

        <section className="flex items-center gap-6">

          // Search Button (toggles search filters)
          <button className="text-dark hover:text-primary transition-colors"
            onClick={() => setShowSearchFilters(!showSearchFilters)}
            >
            <Search size={22} className="stroke-[1.5]" />
          </button>

          <button className="text-dark hover:text-primary transition-colors">
            <MessageCircle size={22} className="stroke-[1.5]" />
          </button>
          {isAdmin && (
            <button 
              aria-label="Admin panel"
              className="text-dark hover:text-primary transition-colors relative"
              onClick={() => setCurrentView('admin')}
              title="Admin Panel"
            >
              <Settings size={22} className="stroke-[1.5]" />
            </button>
          )}
          <button 
            aria-label="Open profile"
            className="text-dark hover:text-primary transition-colors relative"
            onClick={() => setCurrentView('profile')}
          >
            <User size={22} className="stroke-[1.5]" />
          </button>
          {handleLogout && (
            <button
              aria-label="Logout"
              className="text-dark hover:text-red-500 transition-colors relative"
              onClick={handleLogout}
              title="Sign Out"
            >
              <LogOut size={22} className="stroke-[1.5]" />
            </button>
          )}
          
          <button 
            onClick={() => setShowSellModal(true)}
            className="hidden md:flex items-center gap-2 bg-dark text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-primary transition-colors"
          >
            <Plus size={18} />
            Sell Item
          </button>
        </section>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-8">

// Search Filters Section (conditionally rendered)
        {showSearchFilters && (
<section className="mb-8 bg-white border rounded-2xl p-5 shadow-sm">

<input
type="text"
placeholder="Search..."
value={searchQuery}
onChange={(e) => setSearchQuery(e.target.value)}
className="w-full border rounded-xl px-4 py-3 mb-4"
/>

<div className="grid grid-cols-2 gap-4">
<input
type="number"
placeholder="Min Price"
value={minPrice}
onChange={(e) => setMinPrice(e.target.value)}
className="border rounded-xl px-4 py-3"
/>

<input
type="number"
placeholder="Max Price"
value={maxPrice}
onChange={(e) => setMaxPrice(e.target.value)}
className="border rounded-xl px-4 py-3"
/>
</div>

<button
onClick={clearFilters}
className="mt-4 px-4 py-2 bg-dark text-white rounded-full"
>
Clear Filters
</button>

</section>
)}
        
        {/* Categories & Filter Bar */}
        <section className="mt-8 flex flex-col gap-6 mb-8">
          <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <section>
              <h1 className="text-3xl font-bold text-dark tracking-tight">Recent Listings</h1>
              <p className="text-gray-500 text-sm mt-1">Showing items in <span className="font-semibold text-primary">Main Campus</span></p>
            </section>
            
            <section className="flex items-center gap-2">
              <button 
                onClick={() => setViewMode('grid')}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors border ${viewMode === 'grid' ? 'bg-dark shadow-sm border-dark text-white' : 'bg-white text-dark hover:bg-gray-50 border-gray-200 shadow-sm'}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors border ${viewMode === 'list' ? 'bg-dark shadow-sm border-dark text-white' : 'bg-white text-dark hover:bg-gray-50 border-gray-200 shadow-sm'}`}
              >
                <List size={16} />
              </button>
              <button className="ml-2 flex items-center justify-center bg-white border border-gray-200 text-dark w-10 h-10 rounded-full shadow-sm hover:bg-gray-50 transition-colors">
                <SlidersHorizontal size={16} />
              </button>
            </section>
          </section>

          <section className="flex items-center gap-3 overflow-x-auto pb-2 w-full scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-medium transition-colors border ${
                  activeCategory === cat.name 
                    ? 'bg-dark text-white border-dark' 
                    : 'bg-white text-dark hover:border-dark border-transparent shadow-sm'
                }`}
              >
                {cat.name} {cat.count && <span className={`ml-2 text-xs ${activeCategory === cat.name ? 'opacity-80' : 'text-gray-400'}`}>{cat.count}</span>}
              </button>
            ))}
          </section>
        </section>

        {/* Product Grid Layout */}
        <section className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {/*products.map((product) => ( */}
            {filteredProducts.map((product) => (
            <section 
              key={product.id} 
              className={`bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 cursor-pointer group flex ${viewMode === 'list' ? 'flex-row h-48' : 'flex-col'}`}
            >
              
              {/* Product Image Box */}
              <section className={`relative overflow-hidden bg-gray-50 ${viewMode === 'list' ? 'w-48 shrink-0' : 'h-64 w-full'}`}>
                <section className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md text-[0.65rem] font-bold text-primary uppercase tracking-wider shadow-sm z-10">
                  {product.category}
                </section>
                <img 
                  src={product.image} 
                  alt={product.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </section>

              {/* Product Info */}
              <section className="p-5 flex flex-col flex-1">
                
                {/* Title & Price Row */}
                <section className="flex justify-between items-start gap-4 mb-2">
                  <h3 className="font-semibold text-dark text-base leading-tight break-words">{product.title}</h3>
                  <span className="font-bold text-xl text-dark shrink-0">{product.price}</span>
                </section>
                
                {/* Condition & Time */}
                <section className="flex items-center gap-2 mb-4">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[0.7rem] font-bold tracking-wide uppercase">{product.condition}</span>
                  <span className="text-gray-300 text-xs">•</span>
                  <span className="text-gray-500 text-xs">{product.timePosted}</span>
                </section>
                
                <section className="mt-auto"></section>

                {/* Seller Info & Action (Border Top) */}
                <section className="border-t border-gray-100 pt-4 flex items-center justify-between">
                  <section className="flex items-center gap-2.5">
                    <img src={product.sellerAvatar} alt={product.sellerName} className="w-8 h-8 rounded-full object-cover shadow-sm" />
                    <span className="text-sm font-medium text-gray-700">{product.sellerName}</span>
                  </section>
                  <button className="text-gray-400 hover:text-red-500 transition-colors p-1 relative z-10" onClick={(e) => {
                      e.stopPropagation();
                      // Toggle favorite logic would go here
                    }}>
                    <Heart size={20} fill={product.isFavorite ? "currentColor" : "none"} className={product.isFavorite ? "text-red-500" : ""} />
                  </button>
                </section>
              </section>
              
            </section>
          ))}
        </section>
      </main>

      {/* Render the Sell Modal overlay if true */}
      {showSellModal && <SellItemModal onClose={() => setShowSellModal(false)} />}
    </section>
  );
};

export default StudentDashboard;
