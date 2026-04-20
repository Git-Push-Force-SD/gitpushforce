import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Edit2, Plus, Trash2, Camera, X, Loader, Check, Heart } from 'lucide-react';
import { useAuth } from './AuthContext';
import { supabase } from './utils/supabase';

const Profile = ({ onBack, onAddNew, onOpenWishlist, wishlistCount = 0 }) => {
  const { user } = useAuth();
  const [profileImage, setProfileImage] = useState(null);
  const [imageError, setImageError] = useState(null);
  
  // Listings state
  const [activeListings, setActiveListings] = useState([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [listingsError, setListingsError] = useState(null);
  
  // Edit modal state
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: 'textbooks',
    condition: 'good',
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState(null);
  
  const fileInputRef = useRef(null);

  // Load avatar from user metadata on mount and when user changes
  useEffect(() => {
    if (user?.user_metadata?.avatar_url) {
      setProfileImage(user.user_metadata.avatar_url);
    } else {
      setProfileImage(null);
    }
  }, [user]);

  // Fetch listings from database (unchanged)
  useEffect(() => {
    const fetchListings = async () => {
      if (!user?.id) {
        setIsLoadingListings(false);
        return;
      }

      try {
        setIsLoadingListings(true);
        setListingsError(null);

        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('seller_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Get Supabase URL - supports both Vite and Jest environments
        let supabaseUrl = 'https://keposlpyrewldohbmesq.supabase.co';
        if (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) {
          supabaseUrl = process.env.VITE_SUPABASE_URL;
        }
        if (typeof globalThis !== 'undefined' && globalThis.__VITE_SUPABASE_URL__) {
          supabaseUrl = globalThis.__VITE_SUPABASE_URL__;
        }
        
        const formattedListings = (data || []).map((listing) => {
          let imageUrl = 'https://images.unsplash.com/photo-1557821552-17105176677c?auto=format&fit=crop&w=200&q=80';
          if (listing.image_path) {
            imageUrl = `${supabaseUrl}/storage/v1/object/public/Listings/${listing.image_path}`;
          } else if (listing.image_url) {
            imageUrl = listing.image_url;
          }
          
          return {
            id: listing.id,
            category: listing.category
              .replace(/_/g, ' ')
              .split(' ')
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' '),
            categoryValue: listing.category,
            title: listing.title,
            description: listing.description,
            price: `R${parseFloat(listing.price).toFixed(2)}`,
            priceValue: listing.price,
            image: imageUrl,
            condition: listing.condition,
          };
        });

        setActiveListings(formattedListings);
      } catch (error) {
        console.error('Error fetching listings:', error);
        setListingsError('Failed to load listings. Please try again.');
        setActiveListings([]);
      } finally {
        setIsLoadingListings(false);
      }
    };

    fetchListings();
  }, [user?.id]);

  // ── Derived user data ─────────────────────────────────────────────────
  const displayName = user?.user_metadata?.full_name || 
                      user?.user_metadata?.name || 
                      user?.email?.split('@')[0] || 
                      'Student';
  const displayEmail = user?.email || '';
  const studentNumber = displayEmail.split('@')[0] || '';
  const role = user?.user_metadata?.role || 'user';
  const roleBadge = role === 'admin' ? 'Admin' : 'Premium Curator';

  // ── Profile picture handlers (with Supabase persistence) ──────────────
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    setImageError(null);
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageError('Please select a valid image file (JPEG, PNG, GIF, etc.)');
      return;
    }

    const maxSize = 1 * 1024 * 1024; // 1MB
    if (file.size > maxSize) {
      setImageError('Image size must be less than 1MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      setProfileImage(dataUrl);
      setImageError(null);

      // Save to Supabase Auth metadata
      try {
        const { error } = await supabase.auth.updateUser({
          data: { avatar_url: dataUrl }
        });
        if (error) throw error;
      } catch (err) {
        console.error('Failed to save avatar:', err.message);
        setImageError('Failed to save profile picture. Please try again.');
      }
    };
    reader.onerror = () => setImageError('Failed to load image. Please try again.');
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      console.error('File input ref is not available');
    }
  };

  const handleRemoveImage = async () => {
    setProfileImage(null);
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Remove avatar from Supabase Auth metadata
    try {
      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: null }
      });
      if (error) throw error;
    } catch (err) {
      console.error('Failed to remove avatar:', err.message);
    }
  };

  // ── Edit and delete handlers (unchanged) ─────────────────────────────
  const handleEditClick = (listing) => {
    setEditingId(listing.id);
    setEditFormData({
      title: listing.title,
      description: listing.description,
      price: listing.priceValue.toString(),
      category: listing.categoryValue,
      condition: listing.condition,
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async () => {
    if (!editFormData.title.trim() || !editFormData.price) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmittingEdit(true);

      const { error } = await supabase
        .from('listings')
        .update({
          title: editFormData.title,
          description: editFormData.description,
          price: parseFloat(editFormData.price),
          category: editFormData.category,
          condition: editFormData.condition,
          updated_at: new Date(),
        })
        .eq('id', editingId);

      if (error) throw error;

      setActiveListings((prev) =>
        prev.map((listing) =>
          listing.id === editingId
            ? {
                ...listing,
                title: editFormData.title,
                description: editFormData.description,
                price: `R${parseFloat(editFormData.price).toFixed(2)}`,
                priceValue: parseFloat(editFormData.price),
                category: editFormData.category
                  .replace(/_/g, ' ')
                  .split(' ')
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' '),
                categoryValue: editFormData.category,
                condition: editFormData.condition,
              }
            : listing
        )
      );

      setEditingId(null);
    } catch (error) {
      console.error('Error updating listing:', error);
      alert('Failed to update listing. Please try again.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteListing = async (listingId) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;

    try {
      setIsDeletingId(listingId);
      const { error } = await supabase
        .from('listings')
        .update({ status: 'removed' })
        .eq('id', listingId);
      if (error) throw error;

      setActiveListings((prev) => prev.filter((listing) => listing.id !== listingId));
    } catch (error) {
      console.error('Error deleting listing:', error);
      alert('Failed to delete listing. Please try again.');
    } finally {
      setIsDeletingId(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <section className="min-h-screen bg-offwhite font-main text-dark pb-20">
      {/* Header */}
      <section className="pt-8 px-8 max-w-3xl mx-auto flex items-center">
        <button
          onClick={onBack}
          className="flex items-center gap-3 text-dark hover:text-gray-500 transition-colors font-medium text-lg"
        >
          <ArrowLeft size={20} />
          Profile
        </button>
      </section>

      {/* Main Content */}
      <section className="max-w-3xl mx-auto mt-12 px-6">
        {/* User Info Header */}
        <section className="flex flex-col md:flex-row items-center gap-8 mb-16">
          {/* Avatar Section */}
          <section className="relative">
            {profileImage ? (
              <div className="relative group">
                <img
                  src={profileImage}
                  alt="User avatar"
                  className="w-28 h-28 rounded-2xl object-cover shadow-sm bg-gray-100"
                />
                <button
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors border-2 border-white opacity-0 group-hover:opacity-100"
                  aria-label="Remove profile picture"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="w-28 h-28 rounded-2xl bg-gray-200 flex items-center justify-center shadow-sm">
                <Camera size={32} className="text-gray-400" />
              </div>
            )}
            <button
              type="button"
              onClick={triggerFileInput}
              className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-md hover:bg-dark transition-colors border-2 border-white"
              aria-label="Upload profile picture"
            >
              <Edit2 size={14} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
            />
            {imageError && (
              <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-red-100 text-red-600 text-xs px-2 py-1 rounded shadow-sm">
                {imageError}
              </div>
            )}
          </section>

          {/* User Details */}
          <section className="text-center md:text-left">
            <h1 className="text-3xl font-bold text-dark tracking-tight mb-1">{displayName}</h1>
            <p className="text-gray-500 mb-4 text-sm font-medium">{displayEmail}</p>
            <section className="flex flex-wrap justify-center md:justify-start gap-2">
              {studentNumber && (
                <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded text-[0.65rem] font-bold tracking-wider uppercase">
                  {studentNumber}
                </span>
              )}
              <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded text-[0.65rem] font-bold tracking-wider uppercase">
                {roleBadge}
              </span>
            </section>
          </section>
        </section>

        {/* Listings Section (unchanged) */}
        <section>
          <section className="mb-6">
            <button
              onClick={onOpenWishlist}
              className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-dark py-3.5 rounded-xl flex items-center justify-between px-4 font-semibold shadow-sm transition-colors"
            >
              <span className="inline-flex items-center gap-2">
                <Heart size={18} className="text-red-500" />
                Wishlist
              </span>
              <span className="text-sm text-gray-500">
                {wishlistCount} item{wishlistCount === 1 ? '' : 's'}
              </span>
            </button>
          </section>

          <section className="flex justify-between items-end mb-4">
            <h2 className="text-xl font-bold text-dark">My Listings</h2>
            <span className="text-primary text-sm font-semibold">
              {isLoadingListings ? (
                <span className="inline-flex items-center gap-1">
                  <Loader size={14} className="animate-spin" />
                </span>
              ) : (
                `${activeListings.length} active`
              )}
            </span>
          </section>

          <button
            onClick={onAddNew}
            className="w-full bg-dark hover:bg-primary text-white py-3.5 rounded-xl flex items-center justify-center gap-2 mb-6 font-semibold shadow-sm transition-colors"
          >
            <Plus size={18} />
            Add New Listing
          </button>

          {isLoadingListings ? (
            <section className="flex items-center justify-center py-12">
              <Loader size={32} className="animate-spin text-primary" />
            </section>
          ) : listingsError ? (
            <section className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-red-600 text-sm">{listingsError}</p>
            </section>
          ) : activeListings.length === 0 ? (
            <section className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
              <p className="text-gray-500 text-sm">No active listings yet. Start by adding a new listing!</p>
            </section>
          ) : (
            <section className="space-y-4">
              {activeListings.map((listing) => (
                <section
                  key={listing.id}
                  className="bg-white p-4 rounded-xl flex items-center shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-50 gap-5 relative group"
                >
                  <section className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                    <img
                      src={listing.image}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1557821552-17105176677c?auto=format&fit=crop&w=200&q=80';
                      }}
                    />
                  </section>

                  <section className="flex-1 pr-16">
                    <span className="text-primary font-bold text-[0.6rem] tracking-widest uppercase mb-1 block">
                      {listing.category}
                    </span>
                    <h3 className="font-semibold text-dark text-sm mb-1">{listing.title}</h3>
                    <p className="text-dark font-medium text-sm">{listing.price}</p>
                  </section>

                  <section className="absolute right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditClick(listing)}
                      className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      aria-label="Edit listing"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteListing(listing.id)}
                      disabled={isDeletingId === listing.id}
                      className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                      aria-label="Delete listing"
                    >
                      {isDeletingId === listing.id ? (
                        <Loader size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </section>
                </section>
              ))}
            </section>
          )}
        </section>

        {/* Edit Modal */}
        {editingId && (
          <section className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <section className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-dark">Edit Listing</h2>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close modal"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-dark mb-2">Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={editFormData.title}
                    onChange={handleEditChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="Item title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-dark mb-2">Description</label>
                  <textarea
                    name="description"
                    value={editFormData.description}
                    onChange={handleEditChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                    placeholder="Item description"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-dark mb-2">Price (R) *</label>
                  <input
                    type="number"
                    name="price"
                    value={editFormData.price}
                    onChange={handleEditChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-dark mb-2">Category</label>
                  <select
                    name="category"
                    value={editFormData.category}
                    onChange={handleEditChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  >
                    <option value="textbooks">Textbooks</option>
                    <option value="electronics">Electronics</option>
                    <option value="furniture">Furniture</option>
                    <option value="clothing">Clothing</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-dark mb-2">Condition</label>
                  <select
                    name="condition"
                    value={editFormData.condition}
                    onChange={handleEditChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  >
                    <option value="new">New</option>
                    <option value="like_new">Like New</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditingId(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSubmit}
                  disabled={isSubmittingEdit}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmittingEdit ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </section>
          </section>
        )}

        {/* Footer */}
        <section className="text-center mt-12 text-gray-400 text-xs tracking-wider uppercase font-semibold">
          <p className="mb-1">UNIMART V1.0.0</p>
          <p className="opacity-70">Marketplace for the Student Elite</p>
        </section>
      </section>
    </section>
  );
};

export default Profile;