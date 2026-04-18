import { renderHook, act, waitFor } from '@testing-library/react';
import { useUnreadMessages } from './useUnreadMessages';
import { supabase } from '../utils/supabase';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../utils/supabase', () => ({
  supabase: {
    from:          jest.fn(),
    channel:       jest.fn(),
    removeChannel: jest.fn(),
  },
}));

// Silence the console.log / console.error noise from the hook
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  console.log.mockRestore();
  console.error.mockRestore();
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const USER_ID = 'user-1';

// ─── Supabase chain builders ──────────────────────────────────────────────────
//
// fetch chain: .from('messages').select().eq().eq()   ← second .eq() is terminal
// (count query uses { count: 'exact', head: true } — same chain shape)

const makeFetchChain = (count, error = null) => {
  const c = {};
  c.select = jest.fn().mockReturnValue(c);
  // Each .eq() returns the chain; the LAST .eq() resolves as a promise
  let eqCalls = 0;
  c.eq = jest.fn().mockImplementation(() => {
    eqCalls++;
    // There are exactly 2 .eq() calls: receiver_id then is_read
    if (eqCalls >= 2) return Promise.resolve({ count, error });
    return c;
  });
  return c;
};

// Real-time channel mock — captures handlers so tests can fire them
const makeChannelMock = () => {
  const handlers = {};
  const ch = {};
  ch.on = jest.fn().mockImplementation((type, config, handler) => {
    handlers[config.event] = handler;
    return ch;
  });
  ch.subscribe  = jest.fn().mockReturnValue(ch);
  ch._handlers  = handlers; // exposed for tests
  return ch;
};

const setupSupabaseMocks = ({
  count        = 3,
  fetchError   = null,
  channelMock  = makeChannelMock(),
} = {}) => {
  supabase.from.mockReturnValue(makeFetchChain(count, fetchError));
  supabase.channel.mockReturnValue(channelMock);
  supabase.removeChannel.mockResolvedValue(undefined);
  return { channelMock };
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useUnreadMessages', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    setupSupabaseMocks();
  });

  // ── Initial state ─────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts with unreadCount = 0', () => {
      const { result } = renderHook(() => useUnreadMessages(USER_ID));
      expect(result.current.unreadCount).toBe(0);
    });

    it('exposes refetch as a function', () => {
      const { result } = renderHook(() => useUnreadMessages(USER_ID));
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  // ── No userId guard ───────────────────────────────────────────────────────

  describe('no userId guard', () => {
    it('keeps unreadCount at 0 when userId is null', async () => {
      const { result } = renderHook(() => useUnreadMessages(null));
      await act(async () => {});
      expect(result.current.unreadCount).toBe(0);
    });

    it('does not query supabase when userId is null', () => {
      renderHook(() => useUnreadMessages(null));
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('does not set up a real-time channel when userId is null', () => {
      renderHook(() => useUnreadMessages(null));
      expect(supabase.channel).not.toHaveBeenCalled();
    });

    it('keeps unreadCount at 0 when userId is undefined', async () => {
      const { result } = renderHook(() => useUnreadMessages(undefined));
      await act(async () => {});
      expect(result.current.unreadCount).toBe(0);
    });
  });

  // ── Fetch on mount ────────────────────────────────────────────────────────

  describe('fetch on mount', () => {
    it('sets unreadCount to the fetched count', async () => {
      setupSupabaseMocks({ count: 5 });
      const { result } = renderHook(() => useUnreadMessages(USER_ID));
      await waitFor(() => expect(result.current.unreadCount).toBe(5));
    });

    it('sets unreadCount to 0 when count is null', async () => {
      setupSupabaseMocks({ count: null });
      const { result } = renderHook(() => useUnreadMessages(USER_ID));
      await waitFor(() => expect(result.current.unreadCount).toBe(0));
    });

    it('sets unreadCount to 0 when count is 0', async () => {
      setupSupabaseMocks({ count: 0 });
      const { result } = renderHook(() => useUnreadMessages(USER_ID));
      await waitFor(() => expect(result.current.unreadCount).toBe(0));
    });

    it('queries messages filtered by receiver_id', async () => {
      const fetchChain = makeFetchChain(2);
      supabase.from.mockReturnValue(fetchChain);
      supabase.channel.mockReturnValue(makeChannelMock());

      const { result } = renderHook(() => useUnreadMessages(USER_ID));
      await waitFor(() => expect(result.current.unreadCount).toBe(2));

      expect(fetchChain.eq).toHaveBeenCalledWith('receiver_id', USER_ID);
    });

    it('queries messages filtered by is_read = false', async () => {
      const fetchChain = makeFetchChain(2);
      supabase.from.mockReturnValue(fetchChain);
      supabase.channel.mockReturnValue(makeChannelMock());

      const { result } = renderHook(() => useUnreadMessages(USER_ID));
      await waitFor(() => expect(result.current.unreadCount).toBe(2));

      expect(fetchChain.eq).toHaveBeenCalledWith('is_read', false);
    });

    it('uses count: exact and head: true in select', async () => {
      const fetchChain = makeFetchChain(1);
      supabase.from.mockReturnValue(fetchChain);
      supabase.channel.mockReturnValue(makeChannelMock());

      const { result } = renderHook(() => useUnreadMessages(USER_ID));
      await waitFor(() => expect(result.current.unreadCount).toBe(1));

      expect(fetchChain.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    });

    it('sets unreadCount to 0 on fetch error', async () => {
      setupSupabaseMocks({ count: null, fetchError: { message: 'DB error' } });
      const { result } = renderHook(() => useUnreadMessages(USER_ID));
      await waitFor(() => expect(result.current.unreadCount).toBe(0));
    });

    it('sets unreadCount to 0 when fetch throws', async () => {
      supabase.from.mockImplementation(() => { throw new Error('Network failure'); });
      supabase.channel.mockReturnValue(makeChannelMock());
      const { result } = renderHook(() => useUnreadMessages(USER_ID));
      await act(async () => {});
      expect(result.current.unreadCount).toBe(0);
    });
  });

  // ── Real-time subscription setup ──────────────────────────────────────────

  describe('real-time subscription setup', () => {
    it('creates a channel named unread-messages-{userId}', async () => {
      const { result } = renderHook(() => useUnreadMessages(USER_ID));
      await waitFor(() => expect(result.current.unreadCount).toBe(3));
      expect(supabase.channel).toHaveBeenCalledWith(`unread-messages-${USER_ID}`);
    });

    it('registers an INSERT handler on the messages table', async () => {
      const channelMock = makeChannelMock();
      setupSupabaseMocks({ channelMock });
      const { result } = renderHook(() => useUnreadMessages(USER_ID));
      await waitFor(() => expect(result.current.unreadCount).toBe(3));
      const insertCall = channelMock.on.mock.calls.find(c => c[1]?.event === 'INSERT');
      expect(insertCall).toBeDefined();
      expect(insertCall[1].table).toBe('messages');
    });

    it('registers an UPDATE handler on the messages table', async () => {
      const channelMock = makeChannelMock();
      setupSupabaseMocks({ channelMock });
      const { result } = renderHook(() => useUnreadMessages(USER_ID));
      await waitFor(() => expect(result.current.unreadCount).toBe(3));
      const updateCall = channelMock.on.mock.calls.find(c => c[1]?.event === 'UPDATE');
      expect(updateCall).toBeDefined();
      expect(updateCall[1].table).toBe('messages');
    });

    it('filters subscription by receiver_id', async () => {
      const channelMock = makeChannelMock();
      setupSupabaseMocks({ channelMock });
      const { result } = renderHook(() => useUnreadMessages(USER_ID));
      await waitFor(() => expect(result.current.unreadCount).toBe(3));
      const insertCall = channelMock.on.mock.calls.find(c => c[1]?.event === 'INSERT');
      expect(insertCall[1].filter).toContain(USER_ID);
    });

    it('calls subscribe() to activate the channel', async () => {
      const channelMock = makeChannelMock();
      setupSupabaseMocks({ channelMock });
      const { result } = renderHook(() => useUnreadMessages(USER_ID));
      await waitFor(() => expect(result.current.unreadCount).toBe(3));
      expect(channelMock.subscribe).toHaveBeenCalled();
    });

    it('removes the channel on unmount', async () => {
      const { result, unmount } = renderHook(() => useUnreadMessages(USER_ID));
      await waitFor(() => expect(result.current.unreadCount).toBe(3));
      unmount();
      expect(supabase.removeChannel).toHaveBeenCalled();
    });
  });

  // ── INSERT real-time handler ──────────────────────────────────────────────

  describe('INSERT handler', () => {
    it('increments unreadCount when a new unread message arrives', async () => {
      const channelMock = makeChannelMock();
      setupSupabaseMocks({ count: 2, channelMock });
      const { result } = renderHook(() => useUnreadMessages(USER_ID));
      await waitFor(() => expect(result.current.unreadCount).toBe(2));

      act(() => {
        channelMock._handlers['INSERT']({ new: { id: 'msg-new-1234', is_read: false } });
      });

      expect(result.current.unreadCount).toBe(3);
    });

    it('does NOT increment when inserted message is already read', async () => {
      const channelMock = makeChannelMock();
      setupSupabaseMocks({ count: 2, channelMock });
      const { result } = renderHook(() => useUnreadMessages(USER_ID));
      await waitFor(() => expect(result.current.unreadCount).toBe(2));

      act(() => {
        channelMock._handlers['INSERT']({ new: { id: 'msg-read-1234', is_read: true } });
      });

      expect(result.current.unreadCount).toBe(2);
    });

    it('increments correctly from 0 to 1', async () => {
      const channelMock = makeChannelMock();
      setupSupabaseMocks({ count: 0, channelMock });
      const { result } = renderHook(() => useUnreadMessages(USER_ID));
      await waitFor(() => expect(result.current.unreadCount).toBe(0));

      act(() => {
        channelMock._handlers['INSERT']({ new: { id: 'msg-x-1234567', is_read: false } });
      });

      expect(result.current.unreadCount).toBe(1);
    });

    it('accumulates correctly across multiple unread inserts', async () => {
      const channelMock = makeChannelMock();
      setupSupabaseMocks({ count: 0, channelMock });
      const { result } = renderHook(() => useUnreadMessages(USER_ID));
      await waitFor(() => expect(result.current.unreadCount).toBe(0));

      act(() => {
        channelMock._handlers['INSERT']({ new: { id: 'msg-a-1234567', is_read: false } });
        channelMock._handlers['INSERT']({ new: { id: 'msg-b-1234567', is_read: false } });
        channelMock._handlers['INSERT']({ new: { id: 'msg-c-1234567', is_read: false } });
      });

      expect(result.current.unreadCount).toBe(3);
    });
  });

  // ── UPDATE real-time handler ──────────────────────────────────────────────

  describe('UPDATE handler', () => {
    it('decrements unreadCount when a message is marked as read (old=false → new=true)', async () => {
      const channelMock = makeChannelMock();
      setupSupabaseMocks({ count: 3, channelMock });
      const { result } = renderHook(() => useUnreadMessages(USER_ID));
      await waitFor(() => expect(result.current.unreadCount).toBe(3));

      act(() => {
        channelMock._handlers['UPDATE']({
          old: { id: 'msg-1234567', is_read: false },
          new: { id: 'msg-1234567', is_read: true  },
        });
      });

      expect(result.current.unreadCount).toBe(2);
    });

    it('does not go below 0 when decrementing from 0', async () => {
      const channelMock = makeChannelMock();
      setupSupabaseMocks({ count: 0, channelMock });
      const { result } = renderHook(() => useUnreadMessages(USER_ID));
      await waitFor(() => expect(result.current.unreadCount).toBe(0));

      act(() => {
        channelMock._handlers['UPDATE']({
          old: { id: 'msg-1234567', is_read: false },
          new: { id: 'msg-1234567', is_read: true  },
        });
      });

      expect(result.current.unreadCount).toBe(0);
    });

    it('does NOT decrement when new is_read is false', async () => {
      const channelMock = makeChannelMock();
      setupSupabaseMocks({ count: 3, channelMock });
      const { result } = renderHook(() => useUnreadMessages(USER_ID));
      await waitFor(() => expect(result.current.unreadCount).toBe(3));

      act(() => {
        channelMock._handlers['UPDATE']({
          old: { id: 'msg-1234567', is_read: true  },
          new: { id: 'msg-1234567', is_read: false },
        });
      });

      expect(result.current.unreadCount).toBe(3);
    });

    it('triggers the fallback refetch (not a decrement) when both old and new is_read are true', async () => {
      const channelMock = makeChannelMock();
      // First call (mount) returns 3; second call (fallback refetch) returns 1
      let callCount = 0;
      supabase.from.mockImplementation(() => {
        callCount++;
        return makeFetchChain(callCount === 1 ? 3 : 1);
      });
      supabase.channel.mockReturnValue(channelMock);

      const { result } = renderHook(() => useUnreadMessages(USER_ID));
      await waitFor(() => expect(result.current.unreadCount).toBe(3));

      // old.is_read = true, new.is_read = true →
      //   the decrement branch (old=false→new=true) does NOT fire,
      //   but the else-if (new.is_read === true) fallback DOES fire a refetch.
      act(() => {
        channelMock._handlers['UPDATE']({
          old: { id: 'msg-1234567', is_read: true },
          new: { id: 'msg-1234567', is_read: true },
        });
      });

      // Fallback refetch ran and returned 1
      await waitFor(() => expect(result.current.unreadCount).toBe(1));
      // Confirm supabase.from was called twice (mount + fallback)
      expect(callCount).toBe(2);
    });

    it('refetches when new is_read=true but old is_read is missing (fallback branch)', async () => {
      const channelMock = makeChannelMock();
      // Initial fetch returns 3; refetch (triggered by fallback) returns 1
      let fetchCall = 0;
      supabase.from.mockImplementation(() => {
        fetchCall++;
        return makeFetchChain(fetchCall === 1 ? 3 : 1);
      });
      supabase.channel.mockReturnValue(channelMock);

      const { result } = renderHook(() => useUnreadMessages(USER_ID));
      await waitFor(() => expect(result.current.unreadCount).toBe(3));

      act(() => {
        channelMock._handlers['UPDATE']({
          old: undefined,         // no old value — triggers fallback
          new: { id: 'msg-1234567', is_read: true },
        });
      });

      await waitFor(() => expect(result.current.unreadCount).toBe(1));
    });

    it('decrements correctly across multiple sequential reads', async () => {
      const channelMock = makeChannelMock();
      setupSupabaseMocks({ count: 3, channelMock });
      const { result } = renderHook(() => useUnreadMessages(USER_ID));
      await waitFor(() => expect(result.current.unreadCount).toBe(3));

      act(() => {
        channelMock._handlers['UPDATE']({ old: { is_read: false }, new: { id: 'a-1234567', is_read: true } });
        channelMock._handlers['UPDATE']({ old: { is_read: false }, new: { id: 'b-1234567', is_read: true } });
      });

      expect(result.current.unreadCount).toBe(1);
    });
  });

  // ── refetch ───────────────────────────────────────────────────────────────

  describe('refetch', () => {
    it('updates unreadCount when refetch is called manually', async () => {
      setupSupabaseMocks({ count: 2 });
      const { result } = renderHook(() => useUnreadMessages(USER_ID));
      await waitFor(() => expect(result.current.unreadCount).toBe(2));

      // Change the mock to return a different count on the next call
      supabase.from.mockReturnValue(makeFetchChain(7));

      await act(async () => { await result.current.refetch(); });

      expect(result.current.unreadCount).toBe(7);
    });

    it('sets unreadCount to 0 when refetch is called with no userId', async () => {
      const { result } = renderHook(() => useUnreadMessages(null));
      await act(async () => { await result.current.refetch(); });
      expect(result.current.unreadCount).toBe(0);
    });
  });

  // ── userId changes ────────────────────────────────────────────────────────

  describe('userId prop changes', () => {
    it('re-fetches and creates a new channel when userId changes', async () => {
      setupSupabaseMocks({ count: 2 });
      const { result, rerender } = renderHook(
        ({ uid }) => useUnreadMessages(uid),
        { initialProps: { uid: USER_ID } }
      );
      await waitFor(() => expect(result.current.unreadCount).toBe(2));

      setupSupabaseMocks({ count: 5 });
      rerender({ uid: 'user-2' });

      await waitFor(() => expect(result.current.unreadCount).toBe(5));
      expect(supabase.channel).toHaveBeenCalledWith(`unread-messages-user-2`);
    });

    it('removes the old channel before creating a new one', async () => {
      setupSupabaseMocks({ count: 1 });
      const { rerender, result } = renderHook(
        ({ uid }) => useUnreadMessages(uid),
        { initialProps: { uid: USER_ID } }
      );
      await waitFor(() => expect(result.current.unreadCount).toBe(1));

      setupSupabaseMocks({ count: 1 });
      rerender({ uid: 'user-2' });

      await waitFor(() => expect(supabase.removeChannel).toHaveBeenCalled());
    });

    it('resets to 0 then updates when switching to a user with no unread messages', async () => {
      setupSupabaseMocks({ count: 4 });
      const { result, rerender } = renderHook(
        ({ uid }) => useUnreadMessages(uid),
        { initialProps: { uid: USER_ID } }
      );
      await waitFor(() => expect(result.current.unreadCount).toBe(4));

      setupSupabaseMocks({ count: 0 });
      rerender({ uid: 'user-clean' });

      await waitFor(() => expect(result.current.unreadCount).toBe(0));
    });
  });
});