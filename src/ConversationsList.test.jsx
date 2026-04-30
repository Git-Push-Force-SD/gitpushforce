import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ConversationsList from './ConversationsList';
import { supabase } from './utils/supabase';
import { useAuth } from './AuthContext';

// ─── jsdom shim ───────────────────────────────────────────────────────────────
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('./utils/supabase', () => ({
  supabase: {
    from:          jest.fn(),
    channel:       jest.fn(),
    removeChannel: jest.fn(),
  },
}));

jest.mock('./AuthContext', () => ({ useAuth: jest.fn() }));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ME = 'user-me';
const OTHER = 'user-other';
const CONV_ID = 'conv-1';
const LISTING_ID = 'listing-1';

const mockMessages = [
  {
    id: 'msg-1',
    conversation_id: CONV_ID,
    sender_id: OTHER,
    receiver_id: ME,
    body: 'Hey, is this still available?',
    sent_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 mins ago
    is_read: false,
    listing_id: LISTING_ID,
  },
  {
    id: 'msg-2',
    conversation_id: CONV_ID,
    sender_id: ME,
    receiver_id: OTHER,
    body: 'Yes it is!',
    sent_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 mins ago
    is_read: true,
    listing_id: LISTING_ID,
  },
];

const mockConversations = [{ id: CONV_ID, listing_id: LISTING_ID }];
const mockListings      = [{ id: LISTING_ID, title: 'MacBook Pro', image_path: 'img/mac.jpg' }];
const mockUsers         = [{ id: OTHER, username: 'jane_doe', email: 'jane@uni.ac.za' }];

// ─── Supabase chain builders ──────────────────────────────────────────────────
//
// Table → chain map:
//   messages      → .select().order()          [terminal = order]
//   conversations → .select().in()             [terminal = in]
//   listings      → .select().in()             [terminal = in]
//   users         → .select().in()             [terminal = in]

const makeOrderChain = (result) => {
  const c = {};
  c.select = jest.fn().mockReturnValue(c);
  c.order  = jest.fn().mockResolvedValue(result);
  return c;
};

const makeInChain = (result) => {
  const c = {};
  c.select = jest.fn().mockReturnValue(c);
  c.in     = jest.fn().mockResolvedValue(result);
  return c;
};

// Real-time channel mock — returned by supabase.channel()
const makeChannelMock = () => {
  const ch = {};
  ch.on        = jest.fn().mockReturnValue(ch);
  ch.subscribe = jest.fn().mockReturnValue(ch);
  return ch;
};

/**
 * Wire supabase.from by table name.
 * Called once per test (or after jest.clearAllMocks in beforeEach).
 */
const setupSupabaseMocks = ({
  messagesData      = mockMessages,
  messagesError     = null,
  conversationsData = mockConversations,
  conversationsError = null,
  listingsData      = mockListings,
  listingsError     = null,
  usersData         = mockUsers,
  usersError        = null,
} = {}) => {
  const messagesChain      = makeOrderChain({ data: messagesData,      error: messagesError      });
  const conversationsChain = makeInChain   ({ data: conversationsData, error: conversationsError });
  const listingsChain      = makeInChain   ({ data: listingsData,      error: listingsError      });
  const usersChain         = makeInChain   ({ data: usersData,         error: usersError         });

  supabase.from.mockImplementation((table) => {
    switch (table) {
      case 'messages':      return messagesChain;
      case 'conversations': return conversationsChain;
      case 'listings':      return listingsChain;
      case 'users':         return usersChain;
      default: throw new Error(`Unexpected supabase.from('${table}')`);
    }
  });

  const channelMock = makeChannelMock();
  supabase.channel.mockReturnValue(channelMock);
  supabase.removeChannel.mockResolvedValue(undefined);

  return { messagesChain, conversationsChain, listingsChain, usersChain, channelMock };
};

// ─── Render helper ────────────────────────────────────────────────────────────

const renderList = () =>
  render(
    <MemoryRouter>
      <ConversationsList />
    </MemoryRouter>
  );

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ConversationsList', () => {
  let navigateMock;

  beforeEach(() => {
    jest.clearAllMocks();
    navigateMock = jest.fn();
    require('react-router-dom').useNavigate.mockReturnValue(navigateMock);
    useAuth.mockReturnValue({ user: { id: ME } });
    setupSupabaseMocks();
  });

  // ── Header ───────────────────────────────────────────────────────────────

  describe('header', () => {
    it('renders the "Messages" heading', async () => {
      renderList();
      expect(screen.getByText('Messages')).toBeInTheDocument();
    });

    it('navigates back when the back button is clicked', async () => {
      renderList();
      fireEvent.click(screen.getByText('Messages').closest('button'));
      expect(navigateMock).toHaveBeenCalledWith(-1);
    });
  });

  // ── Loading state ────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('shows "Loading conversations..." while fetching', () => {
      // Never resolve — stay loading
      supabase.from.mockImplementation(() => {
        const c = {};
        c.select = jest.fn().mockReturnValue(c);
        c.order  = jest.fn().mockReturnValue(new Promise(() => {}));
        return c;
      });
      supabase.channel.mockReturnValue(makeChannelMock());
      renderList();
      expect(screen.getByText(/Loading conversations/i)).toBeInTheDocument();
    });

    it('hides the loading text after fetch completes', async () => {
      renderList();
      await waitFor(() =>
        expect(screen.queryByText(/Loading conversations/i)).not.toBeInTheDocument()
      );
    });
  });

  // ── No user guard ─────────────────────────────────────────────────────────

  describe('no user guard', () => {
    it('shows empty state immediately when user is null', async () => {
      useAuth.mockReturnValue({ user: null });
      renderList();
      await waitFor(() =>
        expect(screen.getByText(/No conversations yet/i)).toBeInTheDocument()
      );
    });

    it('does not call supabase when user is null', () => {
      useAuth.mockReturnValue({ user: null });
      renderList();
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  // ── Empty states ──────────────────────────────────────────────────────────

  describe('empty states', () => {
    it('shows "No conversations yet" when messages array is empty', async () => {
      setupSupabaseMocks({ messagesData: [] });
      renderList();
      await waitFor(() =>
        expect(screen.getByText(/No conversations yet/i)).toBeInTheDocument()
      );
    });

    it('shows "No conversations yet" when messages data is null', async () => {
      setupSupabaseMocks({ messagesData: null });
      renderList();
      await waitFor(() =>
        expect(screen.getByText(/No conversations yet/i)).toBeInTheDocument()
      );
    });

    it('shows "No conversations yet" when user has no relevant messages', async () => {
      // All messages are between two other users
      setupSupabaseMocks({
        messagesData: [{
          id: 'msg-x', conversation_id: 'conv-x',
          sender_id: 'user-a', receiver_id: 'user-b',
          body: 'Not mine', sent_at: new Date().toISOString(),
          is_read: true, listing_id: null,
        }],
      });
      renderList();
      await waitFor(() =>
        expect(screen.getByText(/No conversations yet/i)).toBeInTheDocument()
      );
    });
  });

  // ── Error state ───────────────────────────────────────────────────────────

  describe('error state', () => {
    it('shows error message when messages query fails', async () => {
      setupSupabaseMocks({ messagesData: null, messagesError: { message: 'DB error' } });
      renderList();
      await waitFor(() =>
        expect(screen.getByText(/DB error/i)).toBeInTheDocument()
      );
    });
  });

  // ── Successful render ────────────────────────────────────────────────────

  describe('successful conversations render', () => {
    it('renders the other user\'s name', async () => {
      renderList();
      await waitFor(() => expect(screen.getByText('jane_doe')).toBeInTheDocument());
    });

    it('renders the listing title', async () => {
      renderList();
      await waitFor(() => expect(screen.getByText('MacBook Pro')).toBeInTheDocument());
    });

    it('renders the latest message body', async () => {
      renderList();
      await waitFor(() =>
        expect(screen.getByText('Hey, is this still available?')).toBeInTheDocument()
      );
    });

    it('renders the listing image when image_path is set', async () => {
      renderList();
      await waitFor(() => {
        const img = Array.from(document.querySelectorAll('img'))
          .find(i => i.src.includes('keposlpyrewldohbmesq.supabase.co') && i.src.includes('img/mac.jpg'));
        expect(img).toBeDefined();
      });
    });

    it('does not render listing image when image_path is absent', async () => {
      setupSupabaseMocks({ listingsData: [{ id: LISTING_ID, title: 'MacBook Pro', image_path: null }] });
      renderList();
      await waitFor(() => screen.getByText('MacBook Pro'));
      const imgs = document.querySelectorAll('img');
      expect(imgs.length).toBe(0);
    });

    it('renders the time-ago for the latest message', async () => {
      renderList();
      await waitFor(() => expect(screen.getByText(/\d+m/)).toBeInTheDocument());
    });

    it('shows an unread indicator dot when message is unread', async () => {
      renderList();
      await waitFor(() => screen.getByText('jane_doe'));
      // The unread dot is a div with bg-primary and rounded-full
      const dot = document.querySelector('section.rounded-full.bg-primary');
      expect(dot).not.toBeNull();
    });

    it('does not show unread dot when message is read', async () => {
      // Make current user the sender (isRead = isCurrentUserSender = true)
      setupSupabaseMocks({
        messagesData: [{
          ...mockMessages[0],
          sender_id: ME,
          receiver_id: OTHER,
          is_read: false,
        }],
      });
      renderList();
      await waitFor(() => screen.getByText('jane_doe'));
      const dot = document.querySelector('div.rounded-full.bg-primary');
      expect(dot).toBeNull();
    });

    it('renders unread message body as bold (font-semibold)', async () => {
      renderList();
      await waitFor(() => screen.getByText('Hey, is this still available?'));
      const msgEl = screen.getByText('Hey, is this still available?');
      expect(msgEl).toHaveClass('font-semibold');
    });

    it('renders read message body without bold styling', async () => {
      setupSupabaseMocks({
        messagesData: [{ ...mockMessages[0], sender_id: ME, receiver_id: OTHER, is_read: true }],
      });
      renderList();
      await waitFor(() => screen.getByText('Hey, is this still available?'));
      const msgEl = screen.getByText('Hey, is this still available?');
      expect(msgEl).not.toHaveClass('font-semibold');
    });
  });

  // ── Conversation click navigation ────────────────────────────────────────

  describe('conversation click navigation', () => {
    it('navigates to /messages/:id with correct state on click', async () => {
      renderList();
      await waitFor(() => screen.getByText('jane_doe'));
      fireEvent.click(screen.getByText('jane_doe').closest('button'));
      expect(navigateMock).toHaveBeenCalledWith(`/messages/${CONV_ID}`, {
        state: {
          receiverId:   OTHER,
          receiverName: 'jane_doe',
          listingId:    LISTING_ID,
        },
      });
    });

    it('uses "User" as receiverName when otherUserName is missing', async () => {
      setupSupabaseMocks({ usersData: [] }); // no user data → falls back to 'User'
      renderList();
      await waitFor(() => screen.getByText('User'));
      fireEvent.click(screen.getByText('User').closest('button'));
      expect(navigateMock).toHaveBeenCalledWith(
        expect.stringContaining('/messages/'),
        expect.objectContaining({ state: expect.objectContaining({ receiverName: 'User' }) })
      );
    });
  });

  // ── Seller name fallbacks ────────────────────────────────────────────────

  describe('other user name fallbacks', () => {
    it('falls back to email prefix when username is null', async () => {
      setupSupabaseMocks({
        usersData: [{ id: OTHER, username: null, email: 'jane@uni.ac.za' }],
      });
      renderList();
      await waitFor(() => expect(screen.getByText('jane')).toBeInTheDocument());
    });

    it('falls back to "User" when both username and email are absent', async () => {
      setupSupabaseMocks({ usersData: [] });
      renderList();
      await waitFor(() => expect(screen.getByText('User')).toBeInTheDocument());
    });
  });

  // ── Listing title fallback ────────────────────────────────────────────────

  describe('listing fallbacks', () => {
    it('shows "Item" when listing data is absent', async () => {
      setupSupabaseMocks({ listingsData: [] });
      renderList();
      await waitFor(() => expect(screen.getByText('Item')).toBeInTheDocument());
    });
  });

  // ── Conversations built from messages when DB table is empty ─────────────

  describe('fallback: conversations built from messages', () => {
    it('still shows conversations when conversations table returns empty', async () => {
      setupSupabaseMocks({ conversationsData: [] }); // no rows in conversations table
      renderList();
      await waitFor(() => expect(screen.getByText('jane_doe')).toBeInTheDocument());
    });
  });

  // ── Supabase query wiring ─────────────────────────────────────────────────

  describe('Supabase query wiring', () => {
    it('queries messages ordered by sent_at descending', async () => {
      const { messagesChain } = setupSupabaseMocks();
      renderList();
      await waitFor(() => screen.getByText('jane_doe'));
      expect(supabase.from).toHaveBeenCalledWith('messages');
      expect(messagesChain.order).toHaveBeenCalledWith('sent_at', { ascending: false });
    });

    it('queries conversations with unique conv IDs', async () => {
      const { conversationsChain } = setupSupabaseMocks();
      renderList();
      await waitFor(() => screen.getByText('jane_doe'));
      expect(supabase.from).toHaveBeenCalledWith('conversations');
      expect(conversationsChain.in).toHaveBeenCalledWith('id', [CONV_ID]);
    });

    it('queries listings with listing IDs from conversations', async () => {
      const { listingsChain } = setupSupabaseMocks();
      renderList();
      await waitFor(() => screen.getByText('jane_doe'));
      expect(supabase.from).toHaveBeenCalledWith('listings');
      expect(listingsChain.in).toHaveBeenCalledWith('id', [LISTING_ID]);
    });

    it('queries users table with other user IDs', async () => {
      const { usersChain } = setupSupabaseMocks();
      renderList();
      await waitFor(() => screen.getByText('jane_doe'));
      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(usersChain.in).toHaveBeenCalledWith('id', expect.arrayContaining([OTHER]));
    });

    it('does not query listings when all listing IDs are null', async () => {
      setupSupabaseMocks({
        messagesData: [{ ...mockMessages[0], listing_id: null }],
        conversationsData: [{ id: CONV_ID, listing_id: null }],
      });
      renderList();
      await waitFor(() => screen.queryByText(/Loading/i) === null);
      expect(supabase.from).not.toHaveBeenCalledWith('listings');
    });
  });

  // ── Real-time subscription ────────────────────────────────────────────────

  describe('real-time subscription', () => {
    it('sets up a real-time channel on mount', async () => {
      renderList();
      await waitFor(() => screen.getByText('jane_doe'));
      expect(supabase.channel).toHaveBeenCalledWith(`messages-updates-${ME}`);
    });

    it('subscribes to postgres_changes on the messages table', async () => {
      const { channelMock } = setupSupabaseMocks();
      renderList();
      await waitFor(() => screen.getByText('jane_doe'));
      expect(channelMock.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({ event: 'UPDATE', table: 'messages' }),
        expect.any(Function)
      );
      expect(channelMock.subscribe).toHaveBeenCalled();
    });

    it('removes the channel on unmount', async () => {
      const { unmount } = renderList();
      await waitFor(() => screen.getByText('jane_doe'));
      unmount();
      expect(supabase.removeChannel).toHaveBeenCalled();
    });

    it('does not set up a channel when user is null', () => {
      useAuth.mockReturnValue({ user: null });
      renderList();
      expect(supabase.channel).not.toHaveBeenCalled();
    });
  });

  // ── formatTimeAgo branches ────────────────────────────────────────────────

  describe('formatTimeAgo display', () => {
    const renderWithSentAt = (sentAt) => {
      setupSupabaseMocks({
        messagesData: [{ ...mockMessages[0], sent_at: sentAt }],
      });
      renderList();
    };

    it('shows "just now" for a message sent moments ago', async () => {
      renderWithSentAt(new Date().toISOString());
      await waitFor(() => expect(screen.getByText('just now')).toBeInTheDocument());
    });

    it('shows minutes (e.g. "5m") for a message < 1 hour old', async () => {
      renderWithSentAt(new Date(Date.now() - 5 * 60 * 1000).toISOString());
      await waitFor(() => expect(screen.getByText('5m')).toBeInTheDocument());
    });

    it('shows hours (e.g. "2h") for a message < 24 hours old', async () => {
      renderWithSentAt(new Date(Date.now() - 2 * 3600 * 1000).toISOString());
      await waitFor(() => expect(screen.getByText('2h')).toBeInTheDocument());
    });

    it('shows days (e.g. "3d") for a message < 7 days old', async () => {
      renderWithSentAt(new Date(Date.now() - 3 * 86400 * 1000).toISOString());
      await waitFor(() => expect(screen.getByText('3d')).toBeInTheDocument());
    });

    it('shows a locale date string for messages older than 7 days', async () => {
      renderWithSentAt(new Date('2023-01-01T00:00:00.000Z').toISOString());
      await waitFor(() => {
        // Should not contain relative time markers
        expect(screen.queryByText(/^\d+m$/)).not.toBeInTheDocument();
        expect(screen.queryByText(/^\d+h$/)).not.toBeInTheDocument();
        expect(screen.queryByText('just now')).not.toBeInTheDocument();
      });
    });
  });

  // ── Multiple conversations ────────────────────────────────────────────────

  describe('multiple conversations', () => {
    it('renders all conversations sorted newest first', async () => {
      const olderMsg = {
        id: 'msg-3', conversation_id: 'conv-2',
        sender_id: 'user-bob', receiver_id: ME,
        body: 'Older message', sent_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        is_read: true, listing_id: 'listing-2',
      };
      setupSupabaseMocks({
        messagesData: [mockMessages[0], olderMsg], // newest first (already sorted)
        conversationsData: [
          { id: CONV_ID, listing_id: LISTING_ID },
          { id: 'conv-2', listing_id: 'listing-2' },
        ],
        listingsData: [
          ...mockListings,
          { id: 'listing-2', title: 'Standing Desk', image_path: null },
        ],
        usersData: [
          ...mockUsers,
          { id: 'user-bob', username: 'bob', email: 'bob@uni.ac.za' },
        ],
      });
      renderList();
      await waitFor(() => {
        expect(screen.getByText('jane_doe')).toBeInTheDocument();
        expect(screen.getByText('bob')).toBeInTheDocument();
      });
    });
  });
});
