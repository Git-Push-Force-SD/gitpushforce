import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase';

export function useMessages(conversationId, receiverId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('sent_at', { ascending: true });

      if (fetchError) throw fetchError;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Setup real-time subscription
  useEffect(() => {
    fetchMessages();

    if (!conversationId) return;

    // Create a unique channel name for this conversation
    const channelName = `messages-${conversationId}`;

    // Subscribe to real-time changes
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          // Append new message to state
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          // Update message in state
          setMessages((prev) =>
            prev.map((msg) => (msg.id === payload.new.id ? payload.new : msg))
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Cleanup subscription
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, fetchMessages]);

  // Send message function
  const sendMessage = useCallback(
    async (body, listingId) => {
      if (!conversationId || !body.trim() || !receiverId) {
        throw new Error('Missing required parameters for sending message');
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error('User not authenticated');

        const { data, error: insertError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            receiver_id: receiverId,
            listing_id: listingId || null,
            body: body.trim(),
            sent_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return data;
      } catch (err) {
        console.error('Error sending message:', err);
        setError(err.message);
        throw err;
      }
    },
    [conversationId, receiverId]
  );

  return {
    messages,
    loading,
    error,
    sendMessage,
    refetch: fetchMessages,
  };
}
