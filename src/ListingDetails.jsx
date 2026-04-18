import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart, ShieldCheck, Clock, MessageCircle, ShoppingBag, ChevronRight } from 'lucide-react';
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
              <button className="w-full bg-white text-dark border border-gray-300 hover:bg-gray-50 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm text-lg">
                <ShoppingBag size={22} className="stroke-[2.5]" /> Buy / Offer
              </button>
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
    </section>
  );
};

export default ListingDetails;
