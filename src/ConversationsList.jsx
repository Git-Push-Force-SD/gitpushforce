import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './utils/supabase';
import { useAuth } from './AuthContext';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export default function ConversationsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);

  useEffect(() => {
    const fetchConversations = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get ALL messages (no filter yet)
        const { data: allMessages, error: messagesError } = await supabase
          .from('messages')
          .select('id, conversation_id, sender_id, receiver_id, body, sent_at, is_read, listing_id')
          .order('sent_at', { ascending: false });

        if (messagesError) {
          console.error('Error fetching messages:', messagesError);
          throw messagesError;
        }

        if (!allMessages || allMessages.length === 0) {
          setConversations([]);
          setLoading(false);
          return;
        }

        // Filter messages where current user is sender or receiver
        const userMessages = allMessages.filter(
          (msg) => msg.sender_id === user.id || msg.receiver_id === user.id
        );

        if (userMessages.length === 0) {
          setConversations([]);
          setLoading(false);
          return;
        }

        // Get unique conversation IDs
        const uniqueConvIds = [...new Set(userMessages.map((m) => m.conversation_id))];

        // Try to get conversation details from DB
        const { data: convs, error: convsError } = await supabase
          .from('conversations')
          .select('id, listing_id')
          .in('id', uniqueConvIds);

        // Ensure all unique conversation IDs are accounted for
        let finalConvs = convs || [];
        const existingConvIds = finalConvs.map(c => c.id);
        const missingConvIds = uniqueConvIds.filter(id => !existingConvIds.includes(id));
        
        if (missingConvIds.length > 0) {
          // For each conversation ID that doesn't exist in DB, create on the fly
          const missingConvs = missingConvIds.map((convId) => {
            const msg = userMessages.find((m) => m.conversation_id === convId);
            return {
              id: convId,
              listing_id: msg?.listing_id || null,
            };
          });
          finalConvs = [...finalConvs, ...missingConvs];
        }

        if (!finalConvs || finalConvs.length === 0) {
          setConversations([]);
          setLoading(false);
          return;
        }

        // Get listing details
        const listingIds = finalConvs.map((c) => c.listing_id).filter(Boolean);
        let listingMap = {};

        if (listingIds.length > 0) {
          const { data: listings, error: listingsError } = await supabase
            .from('listings')
            .select('id, title, image_path')
            .in('id', listingIds);

          if (!listingsError && listings) {
            listingMap = listings.reduce((acc, listing) => {
              acc[listing.id] = listing;
              return acc;
            }, {});
          }
        }

        // Get all other user IDs involved in these conversations
        const otherUserIds = new Set();
        finalConvs.forEach((conv) => {
          const convMessages = userMessages.filter((m) => m.conversation_id === conv.id);
          convMessages.forEach((msg) => {
            const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
            otherUserIds.add(otherUserId);
          });
        });

        // Fetch user details for all other users
        let userMap = {};
        if (otherUserIds.size > 0) {
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, username, email')
            .in('id', Array.from(otherUserIds));

          if (!usersError && users) {
            userMap = users.reduce((acc, usr) => {
              acc[usr.id] = usr;
              return acc;
            }, {});
          }
        }

        // Build conversation list - get latest message per conversation
        const conversationList = finalConvs
          .map((conv) => {
            // Find latest message for this conversation
            const convMessages = userMessages.filter((m) => m.conversation_id === conv.id);
            if (convMessages.length === 0) return null;

            const latestMessage = convMessages[0]; // Already sorted by sent_at desc
            const isCurrentUserSender = latestMessage.sender_id === user.id;
            const otherUserId = isCurrentUserSender
              ? latestMessage.receiver_id
              : latestMessage.sender_id;
            const listing = listingMap[conv.listing_id];
            const otherUser = userMap[otherUserId];

            return {
              id: conv.id,
              otherUserId,
              otherUserName: otherUser?.username || otherUser?.email?.split('@')[0] || 'User',
              listing,
              listingId: conv.listing_id,
              latestMessage: latestMessage.body,
              sentAt: latestMessage.sent_at,
              isRead: latestMessage.is_read || isCurrentUserSender,
            };
          })
          .filter(Boolean)
          .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

        const unreadConversations = conversationList.filter(c => !c.isRead).length;
        console.log('[READ_RECEIPT] Fetched conversations:', conversationList.length, 'with', unreadConversations, 'unread');

        setConversations(conversationList);
      } catch (err) {
        console.error('Error in fetchConversations:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();

    // Setup real-time subscription for message updates (read status changes)
    if (!user?.id) return;

    const channel = supabase
      .channel(`messages-updates-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          // When a message is marked as read, refresh conversations to update isRead status
          console.log('[READ_RECEIPT] ConversationsList received UPDATE event for message:', payload.new.id.substring(0, 8));
          console.log('[READ_RECEIPT] is_read changed to:', payload.new.is_read);
          setConversations((prevConversations) =>
            prevConversations.map((conv) => {
              // Find if this conversation has a message being updated
              const convMessages = prevConversations.filter((c) => c.id === conv.id);
              // For now, we'll just refetch to be safe
              return conv;
            })
          );
          // Refetch conversations to get updated read status
          console.log('[READ_RECEIPT] Refetching conversations...');
          fetchConversations();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]);

  const handleConversationClick = (conversationId, otherUserId, otherUserName, listingId) => {
    navigate(`/messages/${conversationId}`, {
      state: {
        receiverId: otherUserId,
        receiverName: otherUserName || 'User',
        listingId: listingId,
      },
    });
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const sent = new Date(timestamp);
    const diffMs = now - sent;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return sent.toLocaleDateString();
  };

  return (
    <section className="bg-offwhite h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-offwhite/90 backdrop-blur-md border-b border-light px-6 py-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-3 text-dark hover:text-primary transition-colors"
        >
          <ChevronLeft size={24} />
          <span className="font-bold text-xl">Messages</span>
        </button>
      </header>

      {/* Conversations List */}
      <section className="flex-1 overflow-y-auto">
        {loading && (
          <section className="text-center py-8">
            <p className="text-text-muted">Loading conversations...</p>
          </section>
        )}

        {error && (
          <section className="bg-red-50 border border-red-200 text-red-700 p-4 m-4 rounded-lg">
            <p className="text-sm">Error loading conversations: {error}</p>
          </section>
        )}

        {!loading && conversations.length === 0 && (
          <section className="text-center py-8">
            <p className="text-text-muted">No conversations yet</p>
          </section>
        )}

        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() =>
              handleConversationClick(
                conversation.id,
                conversation.otherUserId,
                conversation.otherUserName,
                conversation.listingId
              )
            }
            className="w-full p-4 border-b border-light hover:bg-light transition-colors text-left"
          >
            <section className="flex gap-3 items-start">
              {conversation.listing?.image_path && (
                <img
                  src={`https://keposlpyrewldohbmesq.supabase.co/storage/v1/object/public/Listings/${conversation.listing.image_path}`}
                  alt={conversation.listing.title}
                  className="w-12 h-12 rounded object-cover flex-shrink-0"
                />
              )}

              <section className="flex-1 min-w-0">
                <h3 className="font-bold text-dark truncate">
                  {conversation.otherUserName}
                </h3>
                <p className="text-xs text-text-muted truncate mb-1">
                  {conversation.listing?.title || 'Item'}
                </p>
                <p className={`text-sm truncate ${conversation.isRead ? 'text-text-muted' : 'text-dark font-semibold'}`}>
                  {conversation.latestMessage}
                </p>
              </section>

              <span className="text-xs text-text-muted flex-shrink-0">
                {formatTimeAgo(conversation.sentAt)}
              </span>

              {!conversation.isRead && (
                <section className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
              )}
            </section>
          </button>
        ))}
      </section>
    </section>
  );
}
