import { useCallback, useState } from 'react';
import { supabase } from '../utils/supabase';

export function useConversation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getOrCreateConversation = useCallback(async (listingId, sellerId, buyerId) => {
    if (!listingId || !sellerId || !buyerId) {
      throw new Error('Missing required parameters: listingId, sellerId, buyerId');
    }

    try {
      setLoading(true);
      setError(null);

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Check if a conversation already exists by looking for messages
      // between these two users for this listing
      const { data: existingMessages, error: queryError } = await supabase
        .from('messages')
        .select('conversation_id')
        .eq('listing_id', listingId)
        .or(
          `and(sender_id.eq.${buyerId},receiver_id.eq.${sellerId}),` +
          `and(sender_id.eq.${sellerId},receiver_id.eq.${buyerId})`
        )
        .limit(1);

      if (!queryError && existingMessages && existingMessages.length > 0) {
        // Conversation already exists
        setLoading(false);
        return existingMessages[0].conversation_id;
      }

      // Create a new conversation
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          listing_id: listingId,
          created_by: user.id,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (createError) {
        throw createError;
      }

      setLoading(false);
      return newConversation.id;
    } catch (err) {
      console.error('Error getting or creating conversation:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, []);

  return {
    getOrCreateConversation,
    loading,
    error,
  };
}
