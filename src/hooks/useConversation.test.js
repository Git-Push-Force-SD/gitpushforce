import { renderHook, act } from '@testing-library/react';
import { useConversation } from './useConversation';
import { supabase } from '../utils/supabase';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../utils/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const LISTING_ID = 'listing-1';
const SELLER_ID  = 'seller-1';
const BUYER_ID   = 'buyer-1';
const CONV_ID    = 'conv-abc';
const AUTH_USER  = { id: BUYER_ID };

// ─── Supabase chain builders ──────────────────────────────────────────────────
//
// messages chain:  .from('messages').select().eq().or().limit()   ← limit is terminal
// conversations chain: .from('conversations').insert().select().single()  ← single is terminal

const makeMessagesChain = (result) => {
  const c = {};
  c.select = jest.fn().mockReturnValue(c);
  c.eq     = jest.fn().mockReturnValue(c);
  c.or     = jest.fn().mockReturnValue(c);
  c.limit  = jest.fn().mockResolvedValue(result);
  return c;
};

const makeConversationsChain = (result) => {
  const c = {};
  c.insert = jest.fn().mockReturnValue(c);
  c.select = jest.fn().mockReturnValue(c);
  c.single = jest.fn().mockResolvedValue(result);
  return c;
};

const setupSupabaseMocks = ({
  authUser          = AUTH_USER,
  authError         = null,
  existingMessages  = [],
  messagesError     = null,
  newConversation   = { id: CONV_ID },
  createError       = null,
} = {}) => {
  supabase.auth.getUser.mockResolvedValue({
    data: { user: authUser },
    error: authError,
  });

  const messagesChain      = makeMessagesChain({ data: existingMessages, error: messagesError });
  const conversationsChain = makeConversationsChain({ data: newConversation, error: createError });

  supabase.from.mockImplementation((table) => {
    if (table === 'messages')      return messagesChain;
    if (table === 'conversations') return conversationsChain;
    throw new Error(`Unexpected supabase.from('${table}')`);
  });

  return { messagesChain, conversationsChain };
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useConversation', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    setupSupabaseMocks();
  });

  // ── Initial state ─────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('initialises loading as false', () => {
      const { result } = renderHook(() => useConversation());
      expect(result.current.loading).toBe(false);
    });

    it('initialises error as null', () => {
      const { result } = renderHook(() => useConversation());
      expect(result.current.error).toBeNull();
    });

    it('exposes getOrCreateConversation as a function', () => {
      const { result } = renderHook(() => useConversation());
      expect(typeof result.current.getOrCreateConversation).toBe('function');
    });
  });

  // ── Parameter validation ──────────────────────────────────────────────────

  describe('parameter validation', () => {
    it('throws when listingId is missing', async () => {
      const { result } = renderHook(() => useConversation());
      await expect(
        act(() => result.current.getOrCreateConversation(null, SELLER_ID, BUYER_ID))
      ).rejects.toThrow('Missing required parameters');
    });

    it('throws when sellerId is missing', async () => {
      const { result } = renderHook(() => useConversation());
      await expect(
        act(() => result.current.getOrCreateConversation(LISTING_ID, null, BUYER_ID))
      ).rejects.toThrow('Missing required parameters');
    });

    it('throws when buyerId is missing', async () => {
      const { result } = renderHook(() => useConversation());
      await expect(
        act(() => result.current.getOrCreateConversation(LISTING_ID, SELLER_ID, null))
      ).rejects.toThrow('Missing required parameters');
    });

    it('throws when all parameters are missing', async () => {
      const { result } = renderHook(() => useConversation());
      await expect(
        act(() => result.current.getOrCreateConversation())
      ).rejects.toThrow('Missing required parameters');
    });

    it('does not call supabase when parameters are missing', async () => {
      const { result } = renderHook(() => useConversation());
      await act(async () => {
        try { await result.current.getOrCreateConversation(null, null, null); } catch {}
      });
      expect(supabase.auth.getUser).not.toHaveBeenCalled();
    });
  });

  // ── Authentication check ──────────────────────────────────────────────────

  describe('authentication', () => {
    it('throws "User not authenticated" when getUser returns an error', async () => {
      setupSupabaseMocks({ authUser: null, authError: { message: 'Not signed in' } });
      const { result } = renderHook(() => useConversation());
      await expect(
        act(() => result.current.getOrCreateConversation(LISTING_ID, SELLER_ID, BUYER_ID))
      ).rejects.toThrow('User not authenticated');
    });

    it('throws "User not authenticated" when user is null with no error', async () => {
      setupSupabaseMocks({ authUser: null, authError: null });
      const { result } = renderHook(() => useConversation());
      await expect(
        act(() => result.current.getOrCreateConversation(LISTING_ID, SELLER_ID, BUYER_ID))
      ).rejects.toThrow('User not authenticated');
    });

    it('sets error state when authentication fails', async () => {
      setupSupabaseMocks({ authUser: null, authError: { message: 'Not signed in' } });
      const { result } = renderHook(() => useConversation());
      await act(async () => {
        try { await result.current.getOrCreateConversation(LISTING_ID, SELLER_ID, BUYER_ID); } catch {}
      });
      expect(result.current.error).toBe('User not authenticated');
    });
  });

  // ── Existing conversation found ───────────────────────────────────────────

  describe('existing conversation', () => {
    it('returns the existing conversation_id without creating a new one', async () => {
      setupSupabaseMocks({
        existingMessages: [{ conversation_id: CONV_ID }],
      });
      const { result } = renderHook(() => useConversation());

      let returnedId;
      await act(async () => {
        returnedId = await result.current.getOrCreateConversation(LISTING_ID, SELLER_ID, BUYER_ID);
      });

      expect(returnedId).toBe(CONV_ID);
    });

    it('does NOT call the conversations insert when a match is found', async () => {
      const { conversationsChain } = setupSupabaseMocks({
        existingMessages: [{ conversation_id: CONV_ID }],
      });
      const { result } = renderHook(() => useConversation());
      await act(async () => {
        await result.current.getOrCreateConversation(LISTING_ID, SELLER_ID, BUYER_ID);
      });
      expect(supabase.from).not.toHaveBeenCalledWith('conversations');
    });

    it('loading returns to false after finding existing conversation', async () => {
      setupSupabaseMocks({ existingMessages: [{ conversation_id: CONV_ID }] });
      const { result } = renderHook(() => useConversation());
      await act(async () => {
        await result.current.getOrCreateConversation(LISTING_ID, SELLER_ID, BUYER_ID);
      });
      expect(result.current.loading).toBe(false);
    });
  });

  // ── New conversation creation ─────────────────────────────────────────────

  describe('new conversation creation', () => {
    it('returns the new conversation id when no existing conversation is found', async () => {
      setupSupabaseMocks({ existingMessages: [] });
      const { result } = renderHook(() => useConversation());

      let returnedId;
      await act(async () => {
        returnedId = await result.current.getOrCreateConversation(LISTING_ID, SELLER_ID, BUYER_ID);
      });

      expect(returnedId).toBe(CONV_ID);
    });

    it('inserts a new conversation with listing_id and created_by', async () => {
      const { conversationsChain } = setupSupabaseMocks({ existingMessages: [] });
      const { result } = renderHook(() => useConversation());
      await act(async () => {
        await result.current.getOrCreateConversation(LISTING_ID, SELLER_ID, BUYER_ID);
      });
      expect(conversationsChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          listing_id: LISTING_ID,
          created_by: BUYER_ID,
        })
      );
    });

    it('includes a created_at ISO timestamp in the insert payload', async () => {
      const { conversationsChain } = setupSupabaseMocks({ existingMessages: [] });
      const { result } = renderHook(() => useConversation());
      await act(async () => {
        await result.current.getOrCreateConversation(LISTING_ID, SELLER_ID, BUYER_ID);
      });
      const insertArg = conversationsChain.insert.mock.calls[0][0];
      expect(new Date(insertArg.created_at).toString()).not.toBe('Invalid Date');
    });

    it('loading is false after successful creation', async () => {
      const { result } = renderHook(() => useConversation());
      await act(async () => {
        await result.current.getOrCreateConversation(LISTING_ID, SELLER_ID, BUYER_ID);
      });
      expect(result.current.loading).toBe(false);
    });

    it('error remains null after successful creation', async () => {
      const { result } = renderHook(() => useConversation());
      await act(async () => {
        await result.current.getOrCreateConversation(LISTING_ID, SELLER_ID, BUYER_ID);
      });
      expect(result.current.error).toBeNull();
    });
  });

  // ── Loading state transitions ─────────────────────────────────────────────

  describe('loading state transitions', () => {
    it('sets loading to true while the operation is in flight', async () => {
      // Auth resolves immediately with a valid user; stall the messages query
      // so the hook stays in the loading state while we assert.
      supabase.auth.getUser.mockResolvedValue({ data: { user: AUTH_USER }, error: null });

      let resolveMessages;
      const messagesChain = {
        select: jest.fn().mockReturnThis(),
        eq:     jest.fn().mockReturnThis(),
        or:     jest.fn().mockReturnThis(),
        limit:  jest.fn().mockReturnValue(new Promise((res) => { resolveMessages = res; })),
      };
      supabase.from.mockReturnValue(messagesChain);

      const { result } = renderHook(() => useConversation());

      // Start the operation but don't await it
      act(() => {
        result.current.getOrCreateConversation(LISTING_ID, SELLER_ID, BUYER_ID);
      });

      expect(result.current.loading).toBe(true);

      // Clean up — resolve the pending promise so the hook finishes
      await act(async () => {
        resolveMessages({ data: [{ conversation_id: CONV_ID }], error: null });
      });
    });

    it('resets loading to false even when an error is thrown', async () => {
      setupSupabaseMocks({ authUser: null, authError: { message: 'fail' } });
      const { result } = renderHook(() => useConversation());
      await act(async () => {
        try { await result.current.getOrCreateConversation(LISTING_ID, SELLER_ID, BUYER_ID); } catch {}
      });
      expect(result.current.loading).toBe(false);
    });
  });

  // ── Conversation create error ─────────────────────────────────────────────

  describe('create conversation error', () => {
    it('throws and sets error when insert fails', async () => {
      setupSupabaseMocks({
        existingMessages: [],
        createError: { message: 'Insert failed' },
        newConversation: null,
      });
      const { result } = renderHook(() => useConversation());

      // Wrap the whole throw + state-settle in one act so React flushes
      // all state updates before we assert error.
      await act(async () => {
        try {
          await result.current.getOrCreateConversation(LISTING_ID, SELLER_ID, BUYER_ID);
        } catch (err) {
          expect(err).toMatchObject({ message: 'Insert failed' });
        }
      });

      expect(result.current.error).toBe('Insert failed');
    });

    it('loading resets to false after insert error', async () => {
      setupSupabaseMocks({
        existingMessages: [],
        createError: { message: 'Insert failed' },
        newConversation: null,
      });
      const { result } = renderHook(() => useConversation());
      await act(async () => {
        try { await result.current.getOrCreateConversation(LISTING_ID, SELLER_ID, BUYER_ID); } catch {}
      });
      expect(result.current.loading).toBe(false);
    });
  });

  // ── Messages query error ──────────────────────────────────────────────────

  describe('messages query error', () => {
    it('falls through to create a new conversation when messages query errors', async () => {
      // queryError is truthy → the `if (!queryError && ...)` branch is skipped
      // → proceeds to insert
      setupSupabaseMocks({
        existingMessages: null,
        messagesError: { message: 'Query failed' },
      });
      const { result } = renderHook(() => useConversation());

      let returnedId;
      await act(async () => {
        returnedId = await result.current.getOrCreateConversation(LISTING_ID, SELLER_ID, BUYER_ID);
      });

      expect(returnedId).toBe(CONV_ID);
    });
  });

  // ── Supabase query wiring ─────────────────────────────────────────────────

  describe('Supabase query wiring', () => {
    it('queries messages filtered by listing_id', async () => {
      const { messagesChain } = setupSupabaseMocks();
      const { result } = renderHook(() => useConversation());
      await act(async () => {
        await result.current.getOrCreateConversation(LISTING_ID, SELLER_ID, BUYER_ID);
      });
      expect(messagesChain.eq).toHaveBeenCalledWith('listing_id', LISTING_ID);
    });

    it('uses .or() with buyer/seller combinations', async () => {
      const { messagesChain } = setupSupabaseMocks();
      const { result } = renderHook(() => useConversation());
      await act(async () => {
        await result.current.getOrCreateConversation(LISTING_ID, SELLER_ID, BUYER_ID);
      });
      const orArg = messagesChain.or.mock.calls[0][0];
      expect(orArg).toContain(BUYER_ID);
      expect(orArg).toContain(SELLER_ID);
    });

    it('limits the messages query to 1 result', async () => {
      const { messagesChain } = setupSupabaseMocks();
      const { result } = renderHook(() => useConversation());
      await act(async () => {
        await result.current.getOrCreateConversation(LISTING_ID, SELLER_ID, BUYER_ID);
      });
      expect(messagesChain.limit).toHaveBeenCalledWith(1);
    });

    it('calls getUser before any DB operations', async () => {
      const callOrder = [];
      supabase.auth.getUser.mockImplementation(async () => {
        callOrder.push('getUser');
        return { data: { user: AUTH_USER }, error: null };
      });
      supabase.from.mockImplementation((table) => {
        callOrder.push(`from:${table}`);
        return makeMessagesChain({ data: [], error: null });
      });
      // Re-mock conversations for the create step
      supabase.from.mockImplementation((table) => {
        callOrder.push(`from:${table}`);
        if (table === 'messages') return makeMessagesChain({ data: [], error: null });
        if (table === 'conversations') return makeConversationsChain({ data: { id: CONV_ID }, error: null });
      });

      const { result } = renderHook(() => useConversation());
      await act(async () => {
        await result.current.getOrCreateConversation(LISTING_ID, SELLER_ID, BUYER_ID);
      });

      expect(callOrder[0]).toBe('getUser');
    });
  });

  // ── Stable reference (useCallback) ───────────────────────────────────────

  describe('stable function reference', () => {
    it('getOrCreateConversation is the same reference across re-renders', () => {
      const { result, rerender } = renderHook(() => useConversation());
      const first = result.current.getOrCreateConversation;
      rerender();
      expect(result.current.getOrCreateConversation).toBe(first);
    });
  });
});
