import { renderHook, act, waitFor } from '@testing-library/react';
import { useMessages } from './useMessages';
import { supabase } from '../utils/supabase';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../utils/supabase', () => ({
  supabase: {
    auth:          { getUser: jest.fn() },
    from:          jest.fn(),
    channel:       jest.fn(),
    removeChannel: jest.fn(),
  },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CONV_ID    = 'conv-1';
const RECEIVER_ID = 'receiver-1';
const SENDER_ID   = 'sender-1';

const mockMessages = [
  { id: 'msg-1', conversation_id: CONV_ID, sender_id: SENDER_ID,   body: 'Hello!',    sent_at: new Date(Date.now() - 2000).toISOString(), is_read: true  },
  { id: 'msg-2', conversation_id: CONV_ID, sender_id: RECEIVER_ID, body: 'Hi there!', sent_at: new Date(Date.now() - 1000).toISOString(), is_read: false },
];

// ─── Supabase chain builders ──────────────────────────────────────────────────
//
// fetch chain:  .from('messages').select().eq().order()   ← order is terminal
// insert chain: .from('messages').insert().select().single()  ← single is terminal

const makeFetchChain = (result) => {
  const c = {};
  c.select = jest.fn().mockReturnValue(c);
  c.eq     = jest.fn().mockReturnValue(c);
  c.order  = jest.fn().mockResolvedValue(result);
  return c;
};

const makeInsertChain = (result) => {
  const c = {};
  c.insert = jest.fn().mockReturnValue(c);
  c.select = jest.fn().mockReturnValue(c);
  c.single = jest.fn().mockResolvedValue(result);
  return c;
};

// Real-time channel mock
const makeChannelMock = () => {
  const ch = {};
  ch.on        = jest.fn().mockReturnValue(ch);
  ch.subscribe = jest.fn().mockReturnValue(ch);
  return ch;
};

/**
 * Wire supabase.from by table name.
 * The 'messages' table is used for both fetch (terminates with .order)
 * and insert (terminates with .single). We use a call-count approach:
 * first call → fetch chain, subsequent calls → insert chain.
 */
const setupSupabaseMocks = ({
  fetchData    = mockMessages,
  fetchError   = null,
  insertData   = { id: 'msg-new', body: 'New message' },
  insertError  = null,
  authUser     = { id: SENDER_ID },
  authError    = null,
} = {}) => {
  const fetchChain  = makeFetchChain ({ data: fetchData,  error: fetchError  });
  const insertChain = makeInsertChain({ data: insertData, error: insertError });

  let fromCallCount = 0;
  supabase.from.mockImplementation((table) => {
    if (table !== 'messages') throw new Error(`Unexpected table: ${table}`);
    fromCallCount++;
    // First call is always the initial fetch triggered by useEffect
    return fromCallCount === 1 ? fetchChain : insertChain;
  });

  supabase.auth.getUser.mockResolvedValue({
    data: { user: authUser },
    error: authError,
  });

  const channelMock = makeChannelMock();
  supabase.channel.mockReturnValue(channelMock);
  supabase.removeChannel.mockResolvedValue(undefined);

  return { fetchChain, insertChain, channelMock };
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useMessages', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    setupSupabaseMocks();
  });

  // ── Initial state ─────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts with loading = true', () => {
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      expect(result.current.loading).toBe(true);
    });

    it('starts with an empty messages array', () => {
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      expect(result.current.messages).toEqual([]);
    });

    it('starts with error = null', () => {
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      expect(result.current.error).toBeNull();
    });

    it('exposes sendMessage as a function', () => {
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      expect(typeof result.current.sendMessage).toBe('function');
    });

    it('exposes refetch as a function', () => {
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  // ── Fetch messages on mount ───────────────────────────────────────────────

  describe('fetchMessages on mount', () => {
    it('sets messages after a successful fetch', async () => {
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.messages).toEqual(mockMessages);
    });

    it('sets loading to false after fetch completes', async () => {
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it('queries messages filtered by conversation_id', async () => {
      const { fetchChain } = setupSupabaseMocks();
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(fetchChain.eq).toHaveBeenCalledWith('conversation_id', CONV_ID);
    });

    it('orders messages by sent_at ascending', async () => {
      const { fetchChain } = setupSupabaseMocks();
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(fetchChain.order).toHaveBeenCalledWith('sent_at', { ascending: true });
    });

    it('sets messages to empty array when data is null', async () => {
      setupSupabaseMocks({ fetchData: null });
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.messages).toEqual([]);
    });

    it('sets error state when fetch fails', async () => {
      setupSupabaseMocks({ fetchData: null, fetchError: { message: 'Fetch failed' } });
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error).toBe('Fetch failed');
    });

    it('sets loading to false even when fetch throws', async () => {
      setupSupabaseMocks({ fetchData: null, fetchError: { message: 'err' } });
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));
    });
  });

  // ── No conversationId guard ───────────────────────────────────────────────

  describe('no conversationId guard', () => {
    it('sets messages to [] and loading to false when conversationId is absent', async () => {
      const { result } = renderHook(() => useMessages(null, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.messages).toEqual([]);
    });

    it('does not query supabase when conversationId is absent', async () => {
      renderHook(() => useMessages(null, RECEIVER_ID));
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('does not set up a real-time channel when conversationId is absent', () => {
      renderHook(() => useMessages(null, RECEIVER_ID));
      expect(supabase.channel).not.toHaveBeenCalled();
    });
  });

  // ── Real-time subscription ────────────────────────────────────────────────

  describe('real-time subscription', () => {
    it('creates a channel named messages-{conversationId}', async () => {
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(supabase.channel).toHaveBeenCalledWith(`messages-${CONV_ID}`);
    });

    it('subscribes to INSERT events on the messages table', async () => {
      const { channelMock } = setupSupabaseMocks();
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(channelMock.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({ event: 'INSERT', table: 'messages' }),
        expect.any(Function)
      );
    });

    it('subscribes to UPDATE events on the messages table', async () => {
      const { channelMock } = setupSupabaseMocks();
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(channelMock.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({ event: 'UPDATE', table: 'messages' }),
        expect.any(Function)
      );
    });

    it('includes the conversation_id filter on subscriptions', async () => {
      const { channelMock } = setupSupabaseMocks();
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));
      const insertCall = channelMock.on.mock.calls.find(c => c[1]?.event === 'INSERT');
      expect(insertCall[1].filter).toContain(CONV_ID);
    });

    it('calls subscribe() to activate the channel', async () => {
      const { channelMock } = setupSupabaseMocks();
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(channelMock.subscribe).toHaveBeenCalled();
    });

    it('removes the channel on unmount', async () => {
      const { result, unmount } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));
      unmount();
      expect(supabase.removeChannel).toHaveBeenCalled();
    });

    it('appends a new message when an INSERT event fires', async () => {
      const { channelMock } = setupSupabaseMocks();
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Grab the INSERT handler and fire it
      const insertCall = channelMock.on.mock.calls.find(c => c[1]?.event === 'INSERT');
      const insertHandler = insertCall[2];
      const newMsg = { id: 'msg-new', body: 'Real-time!', sent_at: new Date().toISOString() };

      act(() => insertHandler({ new: newMsg }));

      expect(result.current.messages).toContainEqual(newMsg);
    });

    it('updates an existing message when an UPDATE event fires', async () => {
      const { channelMock } = setupSupabaseMocks();
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      const updateCall = channelMock.on.mock.calls.find(c => c[1]?.event === 'UPDATE');
      const updateHandler = updateCall[2];
      const updatedMsg = { ...mockMessages[0], is_read: true };

      act(() => updateHandler({ new: updatedMsg }));

      const found = result.current.messages.find(m => m.id === mockMessages[0].id);
      expect(found?.is_read).toBe(true);
    });

    it('does not duplicate existing messages on UPDATE', async () => {
      const { channelMock } = setupSupabaseMocks();
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      const updateCall = channelMock.on.mock.calls.find(c => c[1]?.event === 'UPDATE');
      act(() => updateCall[2]({ new: { ...mockMessages[0], body: 'edited' } }));

      expect(result.current.messages).toHaveLength(mockMessages.length);
    });
  });

  // ── sendMessage ───────────────────────────────────────────────────────────

  describe('sendMessage', () => {
    it('returns the inserted message data on success', async () => {
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      let returned;
      await act(async () => {
        returned = await result.current.sendMessage('Hello!', 'listing-1');
      });

      expect(returned).toEqual({ id: 'msg-new', body: 'New message' });
    });

    it('inserts with the correct fields', async () => {
      const { insertChain } = setupSupabaseMocks();
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.sendMessage('Test body', 'listing-1');
      });

      expect(insertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          conversation_id: CONV_ID,
          sender_id:       SENDER_ID,
          receiver_id:     RECEIVER_ID,
          body:            'Test body',
          listing_id:      'listing-1',
        })
      );
    });

    it('trims whitespace from the message body', async () => {
      const { insertChain } = setupSupabaseMocks();
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.sendMessage('  trimmed  ', null);
      });

      expect(insertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ body: 'trimmed' })
      );
    });

    it('sets listing_id to null when not provided', async () => {
      const { insertChain } = setupSupabaseMocks();
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.sendMessage('Hello!', undefined);
      });

      expect(insertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ listing_id: null })
      );
    });

    it('includes a sent_at ISO timestamp', async () => {
      const { insertChain } = setupSupabaseMocks();
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.sendMessage('Hi', null);
      });

      const insertArg = insertChain.insert.mock.calls[0][0];
      expect(new Date(insertArg.sent_at).toString()).not.toBe('Invalid Date');
    });

    it('throws when body is empty', async () => {
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(
        act(() => result.current.sendMessage('   ', 'listing-1'))
      ).rejects.toThrow('Missing required parameters');
    });

    it('throws when conversationId is absent', async () => {
      const { result } = renderHook(() => useMessages(null, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(
        act(() => result.current.sendMessage('Hello', 'listing-1'))
      ).rejects.toThrow('Missing required parameters');
    });

    it('throws when receiverId is absent', async () => {
      const { result } = renderHook(() => useMessages(CONV_ID, null));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(
        act(() => result.current.sendMessage('Hello', 'listing-1'))
      ).rejects.toThrow('Missing required parameters');
    });

    it('throws "User not authenticated" when getUser returns no user', async () => {
      setupSupabaseMocks({ authUser: null });
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(
        act(() => result.current.sendMessage('Hello', null))
      ).rejects.toThrow('User not authenticated');
    });

    it('sets error state when insert fails', async () => {
      setupSupabaseMocks({ insertError: { message: 'Insert failed' }, insertData: null });
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        try { await result.current.sendMessage('Hello', null); } catch {}
      });

      expect(result.current.error).toBe('Insert failed');
    });

    it('throws the insert error so the caller can handle it', async () => {
      setupSupabaseMocks({ insertError: { message: 'Insert failed' }, insertData: null });
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(
        act(() => result.current.sendMessage('Hello', null))
      ).rejects.toMatchObject({ message: 'Insert failed' });
    });
  });

  // ── refetch ───────────────────────────────────────────────────────────────

  describe('refetch', () => {
    it('re-queries messages when refetch is called', async () => {
      const { result } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Reset the from mock to return a fresh fetch chain for the refetch call
      const newFetch = makeFetchChain({ data: [mockMessages[0]], error: null });
      supabase.from.mockReturnValue(newFetch);

      await act(async () => { await result.current.refetch(); });

      expect(supabase.from).toHaveBeenCalledWith('messages');
      expect(result.current.messages).toEqual([mockMessages[0]]);
    });
  });

  // ── Stable references (useCallback) ──────────────────────────────────────

  describe('stable function references', () => {
    it('sendMessage is the same reference when conversationId/receiverId do not change', async () => {
      const { result, rerender } = renderHook(() => useMessages(CONV_ID, RECEIVER_ID));
      await waitFor(() => expect(result.current.loading).toBe(false));
      const first = result.current.sendMessage;
      rerender();
      expect(result.current.sendMessage).toBe(first);
    });

    it('sendMessage reference changes when conversationId changes', async () => {
      const { result, rerender } = renderHook(
        ({ convId }) => useMessages(convId, RECEIVER_ID),
        { initialProps: { convId: CONV_ID } }
      );
      await waitFor(() => expect(result.current.loading).toBe(false));
      const first = result.current.sendMessage;

      setupSupabaseMocks();
      rerender({ convId: 'conv-2' });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.sendMessage).not.toBe(first);
    });
  });
});