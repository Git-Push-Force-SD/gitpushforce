import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, MessageCircle, User, Plus, LayoutGrid, List, Heart, SlidersHorizontal, LogOut } from 'lucide-react';
import Profile from './Profile';
import SellItemModal from './SellItemModal';
import { supabase } from './utils/supabase';
import { useUnreadMessages } from './hooks/useUnreadMessages';
import StudentBookingDashboard from './components/booking/StudentBookingDashboard';
import { useSellerPendingOrders } from './hooks/useBookings';

const StudentDashboard = ({ user, userRole, handleLogout }) => {
  const navigate = useNavigate();
  const location = useLocation(); 
  const [activeCategory, setActiveCategory] = useState('All Items');
  const [viewMode, setViewMode] = useState('grid');
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'profile'
  const [showSellModal, setShowSellModal] = useState(false);
  const [showBookingDashboard, setShowBookingDashboard] = useState(false); 
  const [products, setProducts] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const[filterCondition, setFilterCondition] = useState('');
  const [wishlistIds, setWishlistIds] = useState(new Set());
  
  // Use unread messages hook
  const { unreadCount } = useUnreadMessages(user?.id);
  const { pendingOrders } = useSellerPendingOrders(user?.id);

  useEffect(() => {
  const params = new URLSearchParams(location.search);
  if (params.get('openBooking') === 'true') {
    setShowBookingDashboard(true);
  }
}, [location.search]);

  const wishlistStorageKey = useMemo(
    () => (user?.id ? `wishlist:${user.id}` : null),
    [user?.id]
  );

const categories = useMemo(() => {
  const counts = {
    Textbooks: 0,
    Electronics: 0,
    Clothing: 0,
    Furniture: 0,
    other: 0,
  };

  products.forEach((p) => {
    if (p.category === 'TEXTBOOKS') counts.Textbooks++;
    else if (p.category === 'ELECTRONICS') counts.Electronics++;
    else if (p.category === 'CLOTHING') counts.Clothing++;
    else if (p.category === 'FURNITURE') counts.Furniture++;
    else if (p.category === 'OTHER') counts.other++;
  });

  return [
    { name: 'All Items', count: products.length },
    { name: 'Textbooks', count: counts.Textbooks },
    { name: 'Electronics', count: counts.Electronics },
    { name: 'Clothing', count: counts.Clothing },
    { name: 'Furniture', count: counts.Furniture },
    { name: 'other', count: counts.other },
  ];
}, [products])

  const normalizeCategory = (categoryName) => {
    const map ={
       'All Items': 'ALL',
    Textbooks: 'TEXTBOOKS',
    Furniture: 'FURNITURE',
    Electronics: 'ELECTRONICS',
    Clothing: 'CLOTHING',
    other: 'OTHER',
  };
    return map[categoryName] || categoryName.toUpperCase();
};
const getNumericPrice = (price) => {
  if(typeof price == 'number') return price;
  const cleaned = String(price).replace(/[R\s,]/g,'');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
  //return Number(String(price).replace(/[^\d.]/g, '')) || 0;
};

const filteredProducts = useMemo(() => {
  return products.filter((product) => {
    const matchesCategory =
      activeCategory === 'All Items' ||
      product.category == normalizeCategory(activeCategory);

      const q = searchQuery.trim().toLowerCase();

      const matchesSearch =
        q === '' ||
        product.title?.toLowerCase().includes(q) ||
        product.description?.toLowerCase().includes(q) ||
        product.sellerName?.toLowerCase().includes(q)||
        product.condition?.toLowerCase().includes(q);

        const numericPrice = getNumericPrice(product.price);
        const min = minPrice == ''? null : Number(minPrice);
        const max = maxPrice == ''? null : Number(maxPrice);

        const matchesMin = min === null || numericPrice >= min;
        const matchesMax = max === null || numericPrice <= max;

        const matchesCondition= 
        filterCondition === '' || 
        product.condition === filterCondition.toUpperCase();

    return matchesCategory && matchesSearch && matchesMin && matchesMax && matchesCondition;
  });
    }, [products, activeCategory, searchQuery, minPrice, maxPrice,filterCondition]);

  const wishlistProducts = useMemo(
    () => products.filter((product) => wishlistIds.has(product.id)),
    [products, wishlistIds]
  );

  const isWishlistView = currentView === 'wishlist';
  const displayedProducts = isWishlistView ? wishlistProducts : filteredProducts;

  const toggleWishlist = (listingId) => {
    if (!wishlistStorageKey) return;

    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (next.has(listingId)) {
        next.delete(listingId);
      } else {
        next.add(listingId);
      }
      localStorage.setItem(wishlistStorageKey, JSON.stringify(Array.from(next)));
      return next;
    });
  };
  
  const clearFilters = () => {
    setSearchQuery('');
    setMinPrice('');
    setMaxPrice('');
    setActiveCategory('All Items')
    setFilterCondition('');
  };

  // Helper function to calculate time ago
  const calculateTimeAgo = (createdAt) => {
    if (!createdAt) return 'unknown';
    
    const now = new Date();
    const created = new Date(createdAt);
    
    // Handle invalid dates
    if (isNaN(created.getTime())) return 'unknown';
    
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return created.toLocaleDateString('en-ZA');
  };

  // Fetch listings from database, excluding the logged-in user's listings
  useEffect(() => {
    if (!wishlistStorageKey) {
      setWishlistIds(new Set());
      return;
    }

    try {
      const raw = localStorage.getItem(wishlistStorageKey);
      if (!raw) {
        setWishlistIds(new Set());
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setWishlistIds(new Set(parsed));
      } else {
        setWishlistIds(new Set());
      }
    } catch {
      setWishlistIds(new Set());
    }
  }, [wishlistStorageKey]);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoadingListings(true);
        
        // Fetch all active listings
        let query = supabase
          .from('listings')
          .select('id, seller_id, title, description, price, image_path, category, condition, created_at')
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        // Exclude current user's listings if user is logged in
        if (user?.id) {
          query = query.neq('seller_id', user.id);
        }

        const { data, error } = await query;

        if (error) {
          setProducts([]);
          setLoadingListings(false);
          return;
        }

        if (!data || data.length === 0) {
          setProducts([]);
          setLoadingListings(false);
          return;
        }

        // Get unique seller IDs
        const sellerIds = [...new Set((data || []).map(listing => listing.seller_id))];

        // Fetch seller information
        let sellerMap = {};
        if (sellerIds.length > 0) {
          const { data: sellers, error: sellersError } = await supabase
            .from('users')
            .select('id, username, email')
            .in('id', sellerIds);

          if (!sellersError && sellers && sellers.length > 0) {
            sellerMap = sellers.reduce((acc, seller) => {
              acc[seller.id] = seller;
              return acc;
            }, {});
          }
        }

        // Transform database listings to product format
        const formattedProducts = (data || []).map((listing) => {
          const seller = sellerMap[listing.seller_id];
          const displayName = seller?.username || (seller?.email ? seller.email.split('@')[0] : 'User');
          return {
            id: listing.id,
            seller_id: listing.seller_id,
            title: listing.title,
            description: listing.description,
            price: `R${parseFloat(listing.price).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            condition: listing.condition?.toUpperCase() || 'UNKNOWN',
            timePosted: calculateTimeAgo(listing.created_at),
            category: listing.category?.toUpperCase() || 'OTHER',
            sellerName: displayName,
            sellerAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60',
            image: listing.image_path ? `https://keposlpyrewldohbmesq.supabase.co/storage/v1/object/public/Listings/${listing.image_path}` : 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80',
          };
        });

        setProducts(formattedProducts);
        setLoadingListings(false);
      } catch (err) {
        setProducts([]);
        setLoadingListings(false);
      }
    };

    fetchListings();
  }, [user?.id]);

  if (currentView === 'profile') {
    return (
      <>
        <Profile 
          onBack={() => setCurrentView('home')} 
          onAddNew={() => setShowSellModal(true)}
          onOpenWishlist={() => setCurrentView('wishlist')}
          wishlistCount={wishlistIds.size}
        />
        {showSellModal && <SellItemModal onClose={() => setShowSellModal(false)} />}
      </>
    );
  }

  return (
    <section className="min-h-screen bg-offwhite font-main text-dark pb-20">
      
      {/* Top Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 w-full">
        <section className="flex items-center gap-10">
          {/* Logo */}
          <section className="text-2xl font-display uppercase tracking-wider font-bold text-dark">
            UniMart
          </section>
          {/* Nav Links */}
          <section className="hidden md:flex gap-6 font-medium text-sm">
            <button
              onClick={() => setCurrentView('home')}
              className={`transition-colors pb-1 ${!isWishlistView ? 'border-b-2 border-dark text-dark font-semibold' : 'text-gray-500 hover:text-dark'}`}
            >
              Home
            </button>
            <button
              onClick={() => setCurrentView('wishlist')}
              className={`transition-colors pb-1 flex items-center gap-1 ${isWishlistView ? 'border-b-2 border-dark text-dark font-semibold' : 'text-gray-500 hover:text-dark'}`}
            >
              <Heart size={14} />
              Wishlist ({wishlistIds.size})
            </button>
            <span className="text-gray-500">My Orders</span>
            <button
            onClick={() => setShowBookingDashboard(true)}
            className="text-gray-500 hover:text-dark transition-colors relative flex items-center gap-1"
            >
          Bookings
            {pendingOrders.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {pendingOrders.length}
          </span>
            )}
        </button>


          </section>
        </section>

        <section className="flex items-center gap-6">
          <button
           className="text-dark hover:text-primary transition-colors"
           onClick={() =>{
             setShowSearch(!showSearch);
            if (showFilters) setShowFilters(false);
          }}
        
           >
            <Search size={22} className="stroke-[1.5]" />
          </button>

          <button 
            onClick={() => navigate('/messages')}
            className="text-dark hover:text-primary transition-colors relative"
          >
            <MessageCircle size={22} className="stroke-[1.5]" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
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
      <main className="w-full px-4 sm:px-8">

        {/*Search Section */}

        {showSearch && (
          <section className="mt -6 -mb -4 bg-offwhite" >
            <input
              type="text"
              placeholder="Search listings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 mb-4"
              />
              <p className ="text-sm text-gray-500">
                {displayedProducts.length} items found
                </p>
                </section>
        )}

        {/*Filter Section */}
        {showFilters && (
          <section className="mt-6 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <input
              type="number"
              placeholder="Min Price"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className ="border rounded-xl px-4 py-3"
              />
              <input
              type="number"
              placeholder="Max Price"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="border rounded-xl px-4 py-3"
              />
            </div>

            <select
            value={filterCondition}
            onChange={(e) => setFilterCondition(e.target.value)}
            className="w-full border rounded-xl px-4 py-3 bg-white"
            >
              <option value = ""> All Conditions</option>
              <option value = "NEW"> New</option>
              <option value = "LIKE NEW">Like New</option>
              <option value = "GOOD">Good</option>

              </select>

            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 bg-dark text-white rounded-full"
              >
                Clear Filters
              </button>
              <p className="mt-3 text-sm text-gray-500">
                {displayedProducts.length} items found
              </p>
            </section>
        )}
        
        {/* Categories & Filter Bar */}
        <section className="mt-8 flex flex-col gap-6 mb-8">
          <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <section>
              <h1 className="text-3xl font-bold text-dark tracking-tight">
                {isWishlistView ? 'My Wishlist' : 'Recent Listings'}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {isWishlistView
                  ? `${wishlistIds.size} saved item${wishlistIds.size === 1 ? '' : 's'}`
                  : <>Showing items in <span className="font-semibold text-primary">Main Campus</span></>}
              </p>
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

              <button 
              onClick={() =>{
                 setShowFilters(!showFilters);
                 if(showSearch) setShowSearch(false);
                }}
              className="ml-2 flex items-center justify-center bg-white border border-gray-200 text-dark w-10 h-10 rounded-full shadow-sm hover:bg-gray-50 transition-colors">
                <SlidersHorizontal size={16} />
              </button>

            </section>
          </section>

          {!isWishlistView && (
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
                  {cat.name} {cat.count !== undefined && ( <span className={`ml-2 text-xs ${activeCategory === cat.name ? 'opacity-80' : 'text-gray-400'}`}>{cat.count} </span>
  )}
                </button>
              ))}
            </section>
          )}
        </section>

        {/* Product Grid Layout */}
        <section className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {loadingListings ? (
            // Skeleton loaders
            Array.from({ length: 6 }).map((_, idx) => (
              <section 
                key={`skeleton-${idx}`}
                className={`bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 flex ${viewMode === 'list' ? 'flex-row h-48' : 'flex-col'}`}
              >
                <section className={`relative overflow-hidden bg-gray-200 animate-pulse ${viewMode === 'list' ? 'w-48 shrink-0' : 'h-64 w-full'}`} />
                <section className="p-5 flex flex-col flex-1 gap-3 w-full">
                  <section className="h-5 bg-gray-200 rounded animate-pulse w-3/4"></section>
                  <section className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></section>
                  <section className="flex gap-2 mt-2">
                    <section className="h-4 bg-gray-200 rounded animate-pulse w-16"></section>
                    <section className="h-4 bg-gray-200 rounded animate-pulse w-24"></section>
                  </section>
                  <section className="mt-auto border-t border-gray-100 pt-4">
                    <section className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></section>
                  </section>
                </section>
              </section>
            ))
          ) : displayedProducts.length === 0 ? (
            <section className="col-span-full flex items-center justify-center py-12">
              <p className="text-gray-500 text-lg">
                {isWishlistView ? 'Your wishlist is empty. Tap the heart icon on listings to save them.' : 'No matching listings available'}
              </p>
            </section>
          ) : (
            displayedProducts.map((product) => (
            <section 
              key={product.id} 
              onClick={() => navigate(`/listing/${product.id}`)}
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
                      toggleWishlist(product.id);
                    }}>
                    <Heart size={20} fill={wishlistIds.has(product.id) ? "currentColor" : "none"} className={wishlistIds.has(product.id) ? "text-red-500" : ""} />
                  </button>
                </section>
              </section>
              
            </section>
            ))
          )}
        </section>
      </main>

      {/* Render the Sell Modal overlay if true */}
      {showSellModal && <SellItemModal onClose={() => setShowSellModal(false)} />}
      {showBookingDashboard && (
        <StudentBookingDashboard onClose={() => setShowBookingDashboard(false)} />
)} 
    </section>
  );
};

export default StudentDashboard;
