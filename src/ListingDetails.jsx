import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart, ShieldCheck, Clock, MessageCircle, ShoppingBag, ChevronRight, UploadCloud, Loader, X, ArrowLeftRight } from 'lucide-react';
import { supabase } from './utils/supabase';
import { useAuth } from './AuthContext';
import { useConversation } from './hooks/useConversation';

const ListingDetails = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { getOrCreateConversation, loading: conversationLoading } = useConversation();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seller, setSeller] = useState(null);
  const [buyLoading, setBuyLoading] = useState(false);
  const [showOfferInput, setShowOfferInput] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradeSubmitting, setTradeSubmitting] = useState(false);
  const [tradeUploadError, setTradeUploadError] = useState(null);
  const [tradeImageFile, setTradeImageFile] = useState(null);
  const tradeFileInputRef = useRef(null);
  const [tradeForm, setTradeForm] = useState({
    title: '',
    description: '',
    category: '',
    condition: '',
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchListing = async () => {
      try {
        setLoading(true);
        const { data: listingData, error: listingError } = await supabase
          .from('listings')
          .select('*')
          .eq('id', id)
          .single();

        if (listingError || !listingData) {
          console.error(listingError);
          setLoading(false);
          return;
        }
        
        setListing(listingData);

        const { data: sellerData, error: sellerError } = await supabase
          .from('users')
          .select('id, username, email')
          .eq('id', listingData.seller_id)
          .single();
          
        if (!sellerError && sellerData) {
          setSeller(sellerData);
        }

        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    fetchListing();
  }, [id]);

  const calculateTimeAgo = (createdAt) => {
    if (!createdAt) return 'unknown';
    const now = new Date();
    const created = new Date(createdAt);
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
    const handleBuy = async () => {
    if (!authUser) { navigate('/login'); return; }
    
    const amount = parseFloat(offerAmount);
    if (!offerAmount || isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount greater than 0.");
      return;
    }

    if (amount > parseFloat(listing.price)) {
      alert(`You cannot offer more than the asking price of R${parseFloat(listing.price).toFixed(2)}.`);
      return;
    }

    setBuyLoading(true);
    try {
      // 1. Create order in Supabase first
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        buyer_id:   authUser.id,
        listing_id: listing.id,
        status:     'pending',
        amount_due: amount,
      })
      .select()
      .single();

      if (orderError) throw orderError;

      // //2.Send order_id to Stripe as metadata
      // const res = await fetch('/create-checkout-session', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ 
      //     price: parseFloat(offerAmount), 
      //     name: listing.title,
      //     paymentType: 'custom'

      // 2. Send order_id to Stripe as metadata
      const res = await fetch('/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        price:     amount,
        name:      listing.title,
        order_id:  order.id,  // ← pass order id
      }),
          
        });
      


      const data = await res.json();
      if (!data.url) throw new Error(data.error || 'No checkout URL');
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      alert('Payment failed. Please try again.');
      setBuyLoading(false);
    }
  };

  const handleMessageSeller = async () => {
    if (!authUser) {
      navigate('/login');
      return;
    }

    if (authUser.id === seller?.id) {
      alert('You cannot message yourself');
      return;
    }

    try {
      const conversationId = await getOrCreateConversation(id, seller.id, authUser.id);
      navigate(`/messages/${conversationId}`, {
        state: {
          receiverId: seller.id,
          receiverName: seller.username || seller.email?.split('@')[0],
          listingId: id,
        },
      });
    } catch (err) {
      console.error('Error opening conversation:', err);
      alert('Failed to open conversation. Please try again.');
    }
  };

  const handleTradeFileUpload = (event) => {
    const file = event.target.files?.[0];
    setTradeUploadError(null);
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setTradeUploadError('Please select a valid image file');
      return;
    }

    if (file.size > 1 * 1024 * 1024) {
      setTradeUploadError('Image size must be less than 1MB');
      return;
    }

    setTradeImageFile(file);
    if (tradeFileInputRef.current) tradeFileInputRef.current.value = '';
  };

  const resetTradeForm = () => {
    setTradeForm({
      title: '',
      description: '',
      category: '',
      condition: '',
    });
    setTradeImageFile(null);
    setTradeUploadError(null);
  };

  const openTradeModal = () => {
    if (!authUser) {
      navigate('/login');
      return;
    }
    setShowTradeModal(true);
  };

  const closeTradeModal = () => {
    setShowTradeModal(false);
    resetTradeForm();
  };

  const handleTradeFormChange = (e) => {
    const { name, value } = e.target;
    setTradeForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitTrade = async (e) => {
    e.preventDefault();
    if (!authUser) {
      navigate('/login');
      return;
    }

    if (!listing?.id || !listing?.seller_id) {
      alert('Listing data is unavailable. Please refresh and try again.');
      return;
    }

    if (authUser.id === listing.seller_id) {
      alert('You cannot create a trade for your own listing.');
      return;
    }

    if (!tradeForm.title.trim() || !tradeForm.category || !tradeForm.condition) {
      alert('Please complete all required fields.');
      return;
    }

    if (!tradeImageFile) {
      alert('Please upload a photo of your trade item.');
      return;
    }

    setTradeSubmitting(true);
    let offeredListingId = null;
    try {
      const fileName = `${authUser.id}/trade_${Date.now()}_${tradeImageFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('Listings')
        .upload(fileName, tradeImageFile);

      if (uploadError) throw uploadError;

      const { data: offeredListing, error: offeredListingError } = await supabase
        .from('listings')
        .insert({
          seller_id: authUser.id,
          title: tradeForm.title.trim(),
          description: tradeForm.description.trim(),
          price: 0,
          category: tradeForm.category,
          condition: tradeForm.condition,
          image_path: fileName,
          // Keep trade-offer listings hidden from public feeds.
          status: 'removed',
          listing_type: 'trade',
        })
        .select('id')
        .single();

      if (offeredListingError) throw offeredListingError;
      offeredListingId = offeredListing.id;

      const { error: tradeError } = await supabase
        .from('trades')
        .insert({
          initiator_id: authUser.id,
          receiver_id: listing.seller_id,
          offered_listing_id: offeredListing.id,
          requested_listing_id: listing.id,
          status: 'pending',
        });

      if (tradeError) throw tradeError;

      alert('Trade request sent successfully!');
      closeTradeModal();
    } catch (err) {
      console.error('Error creating trade:', err);
      if (offeredListingId) {
        await supabase
          .from('listings')
          .update({ status: 'removed' })
          .eq('id', offeredListingId);
      }
      const message = err?.message || err?.error_description || 'Unknown error';
      if (err?.code === '42501' || err?.status === 403) {
        alert(`Trade failed due to database permissions (RLS). Please add a trades insert policy in Supabase.\n\nDetails: ${message}`);
      } else {
        alert(`Failed to send trade request. ${message}`);
      }
    } finally {
      setTradeSubmitting(false);
    }
  };

  if (!loading && !listing) {
    return (
      <section className="min-h-screen bg-offwhite flex flex-col items-center justify-center">
        <p className="text-dark text-xl font-bold mb-4 font-display uppercase tracking-wide">Listing not found</p>
        <button onClick={() => navigate(-1)} className="text-primary hover:underline font-semibold flex items-center gap-2">
          <ChevronLeft size={20} /> Go Back
        </button>
      </section>
    );
  }

  const sellerDisplayName = seller?.username || (seller?.email ? seller.email.split('@')[0] : 'Loading...');
  const imageUrl = listing?.image_path ? `https://keposlpyrewldohbmesq.supabase.co/storage/v1/object/public/Listings/${listing.image_path}` : 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80';
  const formattedPrice = listing?.price 
    ? `R${parseFloat(listing.price).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : 'R---.--';
  const canTradeThisListing = ['trade', 'both'].includes((listing?.listing_type || '').toLowerCase());
  const isTradeOnly = listing?.listing_type === 'trade';
  const canBuyThisListing = !isTradeOnly; // Hide buy/offer for trade-only listings
  return (
    <section className="min-h-screen bg-offwhite font-main text-dark pb-20">
      <section className="w-full px-5 md:px-10 pt-8">
        
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-text-muted hover:text-dark font-medium transition-colors mb-8 group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 
          Back to {listing?.category || 'Listings'}
        </button>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Left Column - Images */}
          <section className="flex flex-col gap-4">
            {/* Main Image */}
            <section className={`relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-light border border-gray-200 group ${loading ? 'animate-pulse' : ''}`}>
              <img 
                src={imageUrl} 
                alt={listing?.title || 'Loading'} 
                className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02] ${loading ? 'opacity-0' : 'opacity-100'}`}
              />
              <button className="absolute top-4 right-4 bg-white/90 p-2.5 rounded-full shadow-sm hover:scale-110 transition-transform">
                <Heart size={22} className="text-dark hover:text-red-500 transition-colors" />
              </button>
            </section>
          </section>

          {/* Right Column - Details */}
          <section className="flex flex-col">
            
            {/* Condition & Time */}
            <section className="flex items-center gap-4 mb-4">
              <span className={`px-3 py-1 bg-light text-dark text-[0.75rem] font-bold tracking-wider uppercase rounded-full border border-gray-200 shadow-sm ${loading ? 'animate-pulse text-transparent bg-gray-200 border-none' : ''}`}>
                {listing?.condition || 'DEFAULT'}
              </span>
              <span className={`flex items-center gap-1.5 text-text-muted text-sm font-medium ${loading ? 'opacity-0' : 'opacity-100'}`}>
                <Clock size={16} /> {calculateTimeAgo(listing?.created_at)}
              </span>
            </section>

            {/* Title */}
            <h1 className={`text-4xl md:text-5xl font-display uppercase tracking-tight leading-[1.05] mb-4 ${loading ? 'animate-pulse text-transparent bg-gray-200 rounded min-h-[3rem]' : 'text-dark'}`}>
              {listing?.title || 'Loading item'}
            </h1>

            {/* Price */}
            <section className="flex items-end gap-3 mb-8">
              <span className={`font-bold text-4xl ${loading ? 'text-transparent bg-gray-200 animate-pulse rounded' : 'text-dark'}`}>
                {formattedPrice}
              </span>
            </section>

            {/* Seller Card */}
            <section className="bg-white rounded-2xl p-4 flex items-center justify-between border border-gray-200 shadow-sm mb-6 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all group">
              <section className="flex items-center gap-4">
                <section className={`w-12 h-12 rounded-full border border-light overflow-hidden ${loading ? 'bg-gray-200 animate-pulse' : 'bg-white'}`}>
                  <img 
                    src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60" 
                    alt={sellerDisplayName} 
                    className={`w-full h-full object-cover ${loading ? 'opacity-0' : 'opacity-100'}`}
                  />
                </section>
                <section>
                  <h3 className={`font-bold text-dark ${loading ? 'text-transparent bg-gray-200 animate-pulse rounded' : ''}`}>{sellerDisplayName}</h3>
                  <p className={`text-sm text-text-muted ${loading ? 'opacity-0' : 'opacity-100'}`}>Student • 4.9 ★ (12 reviews)</p>
                </section>
              </section>
              <ChevronRight className="text-gray-400 group-hover:text-dark transition-colors" />
            </section>

            {/* Action Buttons */}
            <section className="flex flex-col gap-3 mb-4">
              <button 
                onClick={handleMessageSeller}
                disabled={conversationLoading || !seller}
                className="w-full bg-dark hover:bg-black text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MessageCircle size={22} className="stroke-[2.5]" /> 
                {conversationLoading ? 'Opening chat...' : 'Message Seller'}
              </button>

               {(!authUser || authUser.id !== listing?.seller_id) && (
                <>
                  {canBuyThisListing && !showOfferInput && (
                    <button 
                      onClick={() => setShowOfferInput(true)}
                      className="w-full bg-white text-dark border border-gray-300 hover:bg-gray-50 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm text-lg"
                    >
                      <ShoppingBag size={22} className="stroke-[2.5]" /> Buy / Offer
                    </button>
                  )}
                  {canBuyThisListing && showOfferInput && (
                    <section className="w-full flex flex-col gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Enter amount (R)"
                        value={offerAmount}
                        onChange={(e) => setOfferAmount(e.target.value)}
                        className="w-full border border-gray-300 py-3.5 px-4 rounded-xl font-bold text-center text-lg focus:outline-none focus:ring-2 focus:ring-dark"
                        autoFocus
                      />
                      <button 
                        onClick={handleBuy}
                        disabled={buyLoading || !offerAmount}
                        className="w-full bg-primary text-white hover:bg-primary-dark py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm text-lg disabled:opacity-50"
                      >
                        {buyLoading ? 'Processing...' : 'Proceed to Payment'}
                        <ShoppingBag size={20} />
                      </button>
                    </section>
                  )}
                  {canTradeThisListing && (
                    <button
                      onClick={openTradeModal}
                      className="w-full bg-white text-dark border border-gray-300 hover:bg-gray-50 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm text-lg"
                    >
                      <ArrowLeftRight size={20} className="stroke-[2.5]" />
                      Trade
                    </button>
                  )}
                </>
              )}
            </section>

            {/* Campus Secure Guarantee */}
            <section className="flex items-center justify-center gap-2 text-[0.8rem] text-text-muted font-medium mb-10 pb-8 border-b border-gray-200">
              <ShieldCheck size={16} className="text-primary" />
              <span><strong className="text-dark">Campus Secure™ Guarantee:</strong> Transaction protection for all students.</span>
            </section>

            {/* Description */}
            <section className="mb-8">
              <h3 className="text-lg font-display mb-3 uppercase tracking-wider text-dark">Description</h3>
              <p className={`text-text-muted leading-relaxed whitespace-pre-wrap ${loading ? 'text-transparent bg-gray-200 animate-pulse rounded min-h-[4rem]' : ''}`}>
                {listing?.description || (!loading ? 'No description provided.' : 'Loading')}
              </p>
            </section>

            {/* Specifications */}
            <section>
              <h3 className="text-lg font-display mb-4 uppercase tracking-wider text-dark">Specifications</h3>
              <section className="grid grid-cols-2 gap-y-4">
                <section>
                  <p className="text-[0.7rem] font-display uppercase tracking-wider text-gray-400 mb-1">Category</p>
                  <p className={`font-semibold text-dark ${loading ? 'text-transparent bg-gray-200 animate-pulse rounded max-w-[100px]' : ''}`}>{listing?.category || (!loading ? 'Other' : 'Loading')}</p>
                </section>
                <section>
                  <p className="text-[0.7rem] font-display uppercase tracking-wider text-gray-400 mb-1">Condition</p>
                  <p className={`font-semibold text-dark capitalize ${loading ? 'text-transparent bg-gray-200 animate-pulse rounded max-w-[100px]' : ''}`}>{listing?.condition ? listing.condition.toLowerCase() : (!loading ? 'Not Specified' : 'Loading')}</p>
                </section>
              </section>
            </section>

          </section>
        </section>
      </section>
      {showTradeModal && (
        <section className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm overflow-y-auto">
          <section className="bg-white w-full max-w-xl rounded-2xl shadow-xl relative">
            <section className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-dark">Create Trade Offer</h2>
              <button
                onClick={closeTradeModal}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-dark transition-colors"
                disabled={tradeSubmitting}
              >
                <X size={18} />
              </button>
            </section>

            <form className="p-6 space-y-5" onSubmit={handleSubmitTrade}>
              <section>
                <label className="block text-sm font-semibold text-dark mb-2">Photo of your item</label>
                <button
                  type="button"
                  onClick={() => tradeFileInputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-100 hover:border-gray-400 transition-colors"
                >
                  {tradeImageFile ? (
                    <>
                      <span className="text-sm font-medium text-green-600">Image selected</span>
                      <span className="text-xs text-green-500 mt-1">{tradeImageFile.name}</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={28} className="mb-2" />
                      <span className="text-sm font-medium">Click to upload image</span>
                      <span className="text-xs mt-1">PNG, JPG up to 5MB</span>
                    </>
                  )}
                </button>
                <input
                  ref={tradeFileInputRef}
                  type="file"
                  onChange={handleTradeFileUpload}
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                />
                {tradeUploadError && <p className="text-red-600 text-xs mt-2">{tradeUploadError}</p>}
              </section>

              <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <section className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-dark mb-2">Item Title</label>
                  <input
                    type="text"
                    name="title"
                    value={tradeForm.title}
                    onChange={handleTradeFormChange}
                    placeholder="e.g. Nintendo Switch Lite"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    required
                  />
                </section>

                <section>
                  <label className="block text-sm font-semibold text-dark mb-2">Category</label>
                  <select
                    name="category"
                    value={tradeForm.category}
                    onChange={handleTradeFormChange}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm bg-white"
                    required
                  >
                    <option value="">Select category...</option>
                    <option value="textbooks">Textbooks</option>
                    <option value="electronics">Electronics</option>
                    <option value="furniture">Furniture</option>
                    <option value="clothing">Clothing</option>
                    <option value="other">Other</option>
                  </select>
                </section>

                <section>
                  <label className="block text-sm font-semibold text-dark mb-2">Condition</label>
                  <select
                    name="condition"
                    value={tradeForm.condition}
                    onChange={handleTradeFormChange}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm bg-white"
                    required
                  >
                    <option value="">Select condition...</option>
                    <option value="new">New</option>
                    <option value="like_new">Like New</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                </section>

                <section className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-dark mb-2">Description</label>
                  <textarea
                    rows="3"
                    name="description"
                    value={tradeForm.description}
                    onChange={handleTradeFormChange}
                    placeholder="Describe your item and what makes it a fair trade..."
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm resize-none"
                  />
                </section>
              </section>

              <section className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeTradeModal}
                  disabled={tradeSubmitting}
                  className="px-6 py-2.5 rounded-lg font-semibold text-gray-600 hover:bg-gray-200 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={tradeSubmitting}
                  className="px-6 py-2.5 rounded-lg font-semibold bg-dark text-white hover:bg-primary transition-colors text-sm shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {tradeSubmitting ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Trade Offer'
                  )}
                </button>
              </section>
            </form>
          </section>
        </section>
      )}
    </section>
  );
};

export default ListingDetails;
