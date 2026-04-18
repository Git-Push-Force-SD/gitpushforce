import React, { useEffect, useRef, useCallback, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useMessages } from "./hooks/useMessages";
import { useAuth } from "./AuthContext";
import { ChevronLeft, MoreVertical, User, Star, X } from "lucide-react";
import { supabase } from "./utils/supabase";

export default function MessagesPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isBuyer, setIsBuyer] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [receiverProfile, setReceiverProfile] = useState(null);
  const [negotiatedItem, setNegotiatedItem] = useState(null);
  const messagesEndRef = useRef(null);

  // Get receiver info from navigation state
  const { receiverId, receiverName, listingId } = location.state || {};

  // Determine if current user is buyer or seller and fetch listing details
  useEffect(() => {
    const fetchListingAndRole = async () => {
      let currentListingId = listingId;
      
      if (!currentListingId && conversationId) {
        try {
          const { data: conv } = await supabase
            .from('conversations')
            .select('listing_id')
            .eq('id', conversationId)
            .single();
          if (conv && conv.listing_id) {
            currentListingId = conv.listing_id;
          } else {
            // Fallback: conversations table might not have this, check messages
            const { data: msgs } = await supabase
              .from('messages')
              .select('listing_id')
              .eq('conversation_id', conversationId)
              .not('listing_id', 'is', null)
              .limit(1);
            if (msgs && msgs.length > 0 && msgs[0].listing_id) {
              currentListingId = msgs[0].listing_id;
            }
          }
        } catch (err) {
          console.error('Error fetching conversation:', err);
        }
      }

      if (!currentListingId || !user?.id) {
        return;
      }
      
      try {
        const { data: listing } = await supabase
          .from('listings')
          .select('id, seller_id, title, price, image_path, condition')
          .eq('id', currentListingId)
          .single();
        
        if (listing) {
          setNegotiatedItem(listing);
          const buyer = user.id !== listing.seller_id;
          setIsBuyer(buyer);
        }
      } catch (err) {
        console.error('Error fetching listing and role:', err);
      }
    };
    fetchListingAndRole();
  }, [listingId, conversationId, user?.id]);

  // Fetch receiver's profile
  useEffect(() => {
    const fetchReceiverProfile = async () => {
      if (!receiverId) return;
      try {
        const { data: profile } = await supabase
          .from('users')
          .select('id, username, email, avatar_url')
          .eq('id', receiverId)
          .single();
        
        if (profile) {
          setReceiverProfile(profile);
        }
      } catch (err) {
        console.error('Error fetching receiver profile:', err);
      }
    };
    fetchReceiverProfile();
  }, [receiverId]);

  // Use the custom hook with the conversation ID and receiver ID
  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
    sendMessage,
  } = useMessages(conversationId, receiverId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read when page loads or messages change
  useEffect(() => {
    const markMessagesAsRead = async () => {
      if (!conversationId || !user?.id) return;

      try {
        // Get unread messages from the other user
        const { data: matchingMessages, error: checkError } = await supabase
          .from('messages')
          .select('id, is_read, sender_id, receiver_id, conversation_id')
          .eq('conversation_id', conversationId)
          .eq('receiver_id', user.id)
          .eq('is_read', false);

        console.log('[READ_RECEIPT] SELECT query result:', { 
          matched: matchingMessages?.length || 0, 
          error: checkError?.message || 'none',
          conversationId,
          userId: user.id
        });

        if (checkError) {
          console.error('[READ_RECEIPT] SELECT error details:', checkError);
          return;
        }

        if (!matchingMessages || matchingMessages.length === 0) {
          console.log('[READ_RECEIPT] No unread messages found');
          return;
        }
        
        // Get the IDs of messages to update
        const messageIdsToUpdate = matchingMessages.map(m => m.id);
        
        console.log('[READ_RECEIPT] About to update', messageIdsToUpdate.length, 'messages');
        
        // Mark all unread messages from receiver as read using IN query
        const { data: updateResult, error } = await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', messageIdsToUpdate);
        
        console.log('[READ_RECEIPT] UPDATE response:', { affectedRows: updateResult?.length || 0, error });
        
        if (error) {
          console.error('[READ_RECEIPT] ERROR marking messages as read:', error.message, error.code);
        } else {
          console.log('[READ_RECEIPT] Marked', messageIdsToUpdate.length, 'messages as read');
          console.log('[READ_RECEIPT] Message IDs:', messageIdsToUpdate);
        }
      } catch (err) {
        console.error('Error marking messages as read:', err);
      }
    };

    // Mark as read after a short delay to ensure messages are loaded
    const timer = setTimeout(markMessagesAsRead, 500);
    return () => clearTimeout(timer);
  }, [conversationId, user?.id]);

  // Handle sending a message
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || !conversationId || sending || !receiverId) return;

    try {
      setSending(true);
      await sendMessage(inputValue, listingId);
      setInputValue("");
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  }, [inputValue, conversationId, sendMessage, sending, receiverId, listingId]);

  // Handle Enter key to send message
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuOpen && !e.target.closest('button') && !e.target.closest('div[class*="relative"]')) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [menuOpen]);

  if (!conversationId || !receiverId) {
    return (
      <section className="bg-offwhite h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-dark text-lg font-bold mb-4">Missing conversation information</p>
          <button
            onClick={() => navigate(-1)}
            className="text-primary hover:underline"
          >
            Go back
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-offwhite font-body text-dark antialiased flex flex-col h-[100dvh] w-full overflow-hidden">
      {/* Main Chat */}
      <section className="flex-1 flex flex-col h-full w-full min-w-0 bg-offwhite">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-offwhite border-b border-light flex justify-between items-center px-4 md:px-6 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="text-dark hover:text-primary transition-colors p-2 hover:bg-light rounded-lg"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setProfileOpen(true)}
                className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-light transition-colors"
              >
                {receiverProfile?.avatar_url ? (
                  <img
                    src={receiverProfile.avatar_url}
                    alt={receiverProfile.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-light flex items-center justify-center">
                    <User size={20} className="text-text-muted" />
                  </div>
                )}
              </button>
              <h1 className="font-bold text-lg text-dark">{receiverName || "User"}</h1>
            </div>
          </div>

          {/* Menu Button */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-dark hover:text-primary transition-colors p-2 hover:bg-light rounded-lg"
            >
              <MoreVertical size={24} />
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-offwhite border border-light rounded-lg shadow-xl z-10 overflow-hidden text-sm">
                {isBuyer ? (
                  <>
                    <button
                      onClick={() => {
                        console.log('Buy action');
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-dark hover:bg-light hover:text-primary transition-colors border-b border-light"
                    >
                      Buy
                    </button>
                    <button
                      onClick={() => {
                        console.log('Trade action');
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-dark hover:bg-light hover:text-primary transition-colors border-b border-light"
                    >
                      Trade
                    </button>
                    <button
                      onClick={() => {
                        console.log('Report action');
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-dark hover:bg-light hover:text-primary transition-colors"
                    >
                      Report
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      console.log('Report action');
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-dark hover:bg-light hover:text-primary transition-colors"
                  >
                    Report
                  </button>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Negotiated Item Banner */}
        {negotiatedItem && (
          <div className="bg-white border-b border-light px-4 md:px-6 py-3 shadow-sm flex-shrink-0 z-40 relative">
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                  <img 
                    src={negotiatedItem.image_path ? `https://keposlpyrewldohbmesq.supabase.co/storage/v1/object/public/Listings/${negotiatedItem.image_path}` : 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80'} 
                    alt={negotiatedItem.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-dark text-sm truncate max-w-[140px] sm:max-w-md">{negotiatedItem.title}</h3>
                  <p className="text-primary font-bold text-sm">R{(parseFloat(negotiatedItem.price) || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
              {isBuyer && (
                <button 
                  onClick={() => navigate(`/listing/${negotiatedItem.id}`)}
                  className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-full transition-colors"
                >
                  View Item
                </button>
              )}
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <main className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
          <section className="w-full flex flex-col gap-4">
            {messagesLoading && !messages.length && (
              <section className="text-center py-8">
                <p className="text-text-muted">Loading messages...</p>
              </section>
            )}

            {messagesError && (
              <section className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                <p className="text-sm">Error loading messages: {messagesError}</p>
              </section>
            )}

            {messages.length === 0 && !messagesLoading && (
              <section className="text-center py-8">
                <p className="text-text-muted">No messages yet. Start the conversation!</p>
              </section>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender_id === user?.id ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[90%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl ${
                    message.sender_id === user?.id
                      ? "bg-primary text-offwhite rounded-br-none"
                      : "bg-light text-dark rounded-bl-none"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words overflow-hidden [word-break:break-word]">{message.body}</p>
                  <span className={`text-xs mt-1.5 block ${
                    message.sender_id === user?.id
                      ? "text-offwhite/70"
                      : "text-text-muted"
                  }`}>
                    {new Date(message.sent_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </section>
        </main>

        {/* Message Input */}
        <section className="sticky bottom-0 bg-offwhite border-t border-light p-3 sm:p-4 w-full">
          <div className="w-full flex items-end gap-3">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending || messagesLoading}
              className="flex-1 p-3 rounded-2xl bg-light text-dark placeholder-text-muted disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary border-none resize-none max-h-32 leading-relaxed text-sm sm:text-base"
              placeholder="Type a message..."
              rows="1"
              style={{ minHeight: '44px' }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || sending || messagesLoading}
              className="bg-primary text-offwhite p-3 rounded-full hover:bg-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold flex-shrink-0 flex items-center justify-center w-12 h-12"
              title="Send message"
            >
              {sending ? "⟳" : "➤"}
            </button>
          </div>
        </section>
      </section>

      {/* Profile Modal */}
      {profileOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 md:rounded-3xl md:mb-10 animate-slide-up mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-dark">User Profile</h2>
              <button
                onClick={() => setProfileOpen(false)}
                className="text-text-muted hover:text-dark p-2"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Profile Picture */}
              <div className="flex justify-center">
                {receiverProfile?.avatar_url ? (
                  <img
                    src={receiverProfile.avatar_url}
                    alt={receiverProfile.username}
                    className="w-24 h-24 rounded-full object-cover border-4 border-primary"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-light border-4 border-primary flex items-center justify-center">
                    <User size={48} className="text-text-muted" />
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="text-center">
                <p className="text-lg font-bold text-dark">{receiverProfile?.username || receiverName || "User"}</p>
                <p className="text-sm text-text-muted">{receiverProfile?.email}</p>
              </div>

              {/* Ratings */}
              <div className="bg-light rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-dark font-semibold">Rating</span>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={18}
                          className={i < 4 ? "fill-yellow-400 text-yellow-400" : "text-text-muted"}
                        />
                      ))}
                    </div>
                    <span className="text-dark font-bold">4.0</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
