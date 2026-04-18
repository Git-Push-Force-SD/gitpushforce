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
  const messagesEndRef = useRef(null);

  // Get receiver info from navigation state
  const { receiverId, receiverName, listingId } = location.state || {};

  // Determine if current user is buyer or seller
  useEffect(() => {
    const checkUserRole = async () => {
      if (!listingId || !user?.id) {
        return;
      }
      try {
        const { data: listing } = await supabase
          .from('listings')
          .select('seller_id')
          .eq('id', listingId)
          .single();
        
        if (listing) {
          const buyer = user.id !== listing.seller_id;
          setIsBuyer(buyer);
        }
      } catch (err) {
        console.error('Error checking user role:', err);
      }
    };
    checkUserRole();
  }, [listingId, user?.id]);

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
        

        
        // Mark all unread messages from receiver as read using IN query
        const { data: updateResult, error } = await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', messageIdsToUpdate);
        

        
        if (error) {

        } else {
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
    <section className="bg-light/30 lg:bg-offwhite/30 font-body text-dark antialiased flex h-screen w-full items-center justify-center lg:p-6 overflow-hidden">
      {/* Main Chat Container */}
      <div className="w-full h-full lg:max-w-5xl lg:max-h-[900px] lg:h-[90vh] bg-offwhite lg:bg-white lg:rounded-[2rem] lg:shadow-[0_8px_30px_rgb(0,0,0,0.08)] lg:border lg:border-light/60 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="flex-none z-50 bg-offwhite lg:bg-white/90 backdrop-blur-md border-b border-light flex justify-between items-center px-6 py-4">
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
              <div className="absolute right-0 mt-2 w-40 bg-offwhite border border-light rounded-lg shadow-xl z-10 overflow-hidden">
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

        {/* Chat Messages */}
        <main className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 bg-offwhite lg:bg-transparent">
          <section className="max-w-3xl mx-auto flex flex-col gap-6">
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
                className={`flex w-full ${
                  message.sender_id === user?.id ? "justify-end" : "justify-start"
                } group`}
              >
                <div className={`flex items-end gap-2 max-w-[85%] sm:max-w-[75%] lg:max-w-[65%] ${
                  message.sender_id === user?.id ? "flex-row-reverse" : "flex-row"
                }`}>
                  <div
                    className={`px-5 py-3.5 shadow-sm relative transition-shadow duration-200 ${
                      message.sender_id === user?.id
                        ? "bg-primary text-offwhite rounded-3xl rounded-br-sm"
                        : "bg-white lg:bg-light text-dark rounded-3xl rounded-bl-sm border border-light lg:border-transparent"
                    }`}
                  >
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{message.body}</p>
                    <div className={`flex items-center gap-1 mt-1.5 ${
                        message.sender_id === user?.id ? "justify-end" : "justify-start"
                    }`}>
                      <span className={`text-[11px] font-medium tracking-wide ${
                        message.sender_id === user?.id
                          ? "text-offwhite/80"
                          : "text-text-muted/80"
                      }`}>
                        {new Date(message.sent_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} className="h-2" />
          </section>
        </main>

        {/* Message Input */}
        <section className="flex-none bg-offwhite lg:bg-white border-t border-light p-4 lg:p-6 lg:pb-8">
          <div className="max-w-3xl mx-auto flex items-end gap-3 bg-white lg:bg-light/50 p-2 rounded-3xl border border-light focus-within:border-primary/30 focus-within:bg-white focus-within:shadow-md transition-all duration-300">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending || messagesLoading}
              className="flex-1 p-3 px-5 rounded-3xl bg-transparent text-dark placeholder-text-muted/70 disabled:opacity-50 focus:outline-none border-none resize-none max-h-32 leading-relaxed"
              placeholder="Type a message..."
              rows="1"
              style={{ minHeight: '48px' }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || sending || messagesLoading}
              className="bg-primary text-offwhite p-3 rounded-full hover:bg-[#32b464] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none font-bold flex-shrink-0 flex items-center justify-center w-[48px] h-[48px] mb-[1px] mr-[1px]"
              title="Send message"
            >
              {sending ? (
                <span className="animate-spin text-xl font-bold">⟳</span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px] ml-0.5">
                  <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
                </svg>
              )}
            </button>
          </div>
        </section>
      </div>

      {/* Profile Modal */}
      {profileOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 animate-slide-up">
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
