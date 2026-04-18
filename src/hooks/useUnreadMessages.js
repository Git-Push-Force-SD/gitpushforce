import { useEffect, useState, useRef } from 'react';
import { supabase } from '../utils/supabase';

export function useUnreadMessages(userId) {
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef(null);

  // Fetch unread messages count
  const fetchUnreadCount = async () => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error fetching unread count:', error);
        setUnreadCount(0);
        return;
      }

      setUnreadCount(count || 0);
    } catch (err) {
      console.error('Error fetching unread messages count:', err);
      setUnreadCount(0);
    }
  };

  // Setup real-time subscription
  useEffect(() => {
    if (!userId) return;

    // Initial fetch
    fetchUnreadCount();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`unread-messages-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          // New message received - increment count if unread
          console.log('[READ_RECEIPT] New message received:', payload.new.id.substring(0, 8), 'is_read:', payload.new.is_read);
          if (payload.new.is_read === false) {
            setUnreadCount((prev) => {
              const newCount = prev + 1;
              console.log('[READ_RECEIPT] New unread message, badge incremented to', newCount);
              return newCount;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          // Message updated - check if it was marked as read
          console.log('[READ_RECEIPT] UPDATE event received for message:', payload.new.id.substring(0, 8));
          console.log('[READ_RECEIPT] Old is_read:', payload.old?.is_read, 'New is_read:', payload.new.is_read);
          
          if (payload.new.is_read === true && payload.old?.is_read === false) {
            setUnreadCount((prev) => {
              const newCount = Math.max(0, prev - 1);
              console.log('[READ_RECEIPT] Badge decremented from', prev, 'to', newCount);
              return newCount;
            });
          } else if (payload.new.is_read === true) {
            // Fallback: if old value isn't provided, refetch to be safe
            console.log('[READ_RECEIPT] Old value missing, refetching count');
            fetchUnreadCount();
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId]);

  return {
    unreadCount,
    refetch: fetchUnreadCount,
  };
}
