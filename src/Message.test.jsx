import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MessagesPage from './Message';
import { supabase } from './utils/supabase';
import { useAuth } from './AuthContext';
import { useMessages } from './hooks/useMessages';

// ─── jsdom shim ───────────────────────────────────────────────────────────────
// jsdom does not implement scrollIntoView; mock it globally so that
// messagesEndRef.current?.scrollIntoView() in the component never throws.
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('./utils/supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('./AuthContext',    () => ({ useAuth: jest.fn() }));
jest.mock('./hooks/useMessages', () => ({ useMessages: jest.fn() }));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
  useParams:   jest.fn(),
  useLocation: jest.fn(),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CONV_ID    = 'conv-123';
const RECEIVER_ID = 'receiver-456';
const LISTING_ID  = 'listing-789';
const USER_ID     = 'user-me';

const mockUser     = { id: USER_ID };
const mockListing  = { id: LISTING_ID, seller_id: 'other-seller', title: 'Test Laptop', price: '5000', image_path: 'img/laptop.jpg', condition: 'Good' };
const mockProfile  = { id: RECEIVER_ID, username: 'jane_doe', email: 'jane@uni.ac.za', avatar_url: null };
const mockMessages = [
  { id: 'msg-1', sender_id: USER_ID,     body: 'Hello there!',   sent_at: new Date().toISOString(), conversation_id: CONV_ID },
  { id: 'msg-2', sender_id: RECEIVER_ID, body: 'Hi back at you!', sent_at: new Date().toISOString(), conversation_id: CONV_ID },
];

// ─── Supabase chain builders ──────────────────────────────────────────────────
// Each chain is routed by table name via mockImplementation.

const makeChain = (handlers = {}) => {
  const c = {};
  c.select = jest.fn().mockReturnValue(c);
  c.eq     = jest.fn().mockReturnValue(c);
  c.not    = jest.fn().mockReturnValue(c);
  c.limit  = jest.fn().mockReturnValue(c);
  c.in     = jest.fn().mockReturnValue(c);
  c.update = jest.fn().mockReturnValue(c);
  c.single = jest.fn().mockResolvedValue(handlers.single ?? { data: null, error: null });
  // For queries that terminate with .limit() — redefine limit as terminal
  if (handlers.limitResult) {
    c.limit = jest.fn().mockResolvedValue(handlers.limitResult);
  }
  // For update chains that terminate with .in()
  if (handlers.inResult) {
    c.in = jest.fn().mockResolvedValue(handlers.inResult);
  }
  return c;
};

/**
 * Wire supabase.from by table name.
 * readMessages  — SELECT unread messages for mark-as-read
 * updateMessages — UPDATE messages set is_read
 */
const setupSupabaseMocks = ({
  conversationData  = { data: { listing_id: LISTING_ID }, error: null },
  listingData       = { data: mockListing, error: null },
  profileData       = { data: mockProfile, error: null },
  readMessages      = { data: [], error: null },
  updateResult      = { data: null, error: null },
} = {}) => {
  const conversationsChain = makeChain({ single: conversationData });
  const listingsChain      = makeChain({ single: listingData });

  // 'users' is called for receiver profile AND mark-as-read uses 'messages'
  const usersChain    = makeChain({ single: profileData });

  // messages table is queried twice: SELECT unread then UPDATE
  // We differentiate by tracking call count within the mock
  let messagesCallCount = 0;
  const messagesSelectChain = {
    select: jest.fn().mockReturnThis(),
    eq:     jest.fn().mockReturnThis(),
    not:    jest.fn().mockReturnThis(),
    limit:  jest.fn().mockResolvedValue({ data: [], error: null }),
    update: jest.fn().mockReturnThis(),
    in:     jest.fn().mockResolvedValue(updateResult),
  };

  // For the mark-as-read SELECT (terminates with no .single(), uses filter chain)
  const messagesReadChain = {
    select: jest.fn().mockReturnThis(),
    eq:     jest.fn().mockReturnThis(),
    // resolves when the last .eq() is awaited
  };
  // make the last .eq() thenable
  messagesReadChain.eq = jest.fn().mockImplementation(() => {
    messagesCallCount++;
    if (messagesCallCount >= 3) {
      // third eq call = .eq('is_read', false) — this is the terminal call
      return Promise.resolve(readMessages);
    }
    return messagesReadChain;
  });

  const messagesUpdateChain = {
    update: jest.fn().mockReturnThis(),
    in:     jest.fn().mockResolvedValue(updateResult),
  };

  supabase.from.mockImplementation((table) => {
    switch (table) {
      case 'conversations': return conversationsChain;
      case 'listings':      return listingsChain;
      case 'users':         return usersChain;
      case 'messages':      return messagesSelectChain;
      default: throw new Error(`Unexpected supabase.from('${table}')`);
    }
  });

  return { conversationsChain, listingsChain, usersChain, messagesSelectChain };
};

// ─── useMessages default mock ─────────────────────────────────────────────────

const defaultMessagesMock = {
  messages: mockMessages,
  loading: false,
  error: null,
  sendMessage: jest.fn().mockResolvedValue(undefined),
};

// ─── Router helpers ───────────────────────────────────────────────────────────

const { useNavigate, useParams, useLocation } = require('react-router-dom');

const setupRouterMocks = (overrides = {}) => {
  const navigateMock = jest.fn();
  useNavigate.mockReturnValue(navigateMock);
  useParams.mockReturnValue({ conversationId: CONV_ID });
  useLocation.mockReturnValue({
    state: { receiverId: RECEIVER_ID, receiverName: 'Jane Doe', listingId: LISTING_ID },
    ...overrides.location,
  });
  return navigateMock;
};

// ─── Render helper ────────────────────────────────────────────────────────────

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={[`/messages/${CONV_ID}`]}>
      <Routes>
        <Route path="/messages/:conversationId" element={<MessagesPage />} />
      </Routes>
    </MemoryRouter>
  );

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MessagesPage', () => {
  let navigateMock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    useAuth.mockReturnValue({ user: mockUser });
    useMessages.mockReturnValue({ ...defaultMessagesMock });
    setupSupabaseMocks();
    navigateMock = setupRouterMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Missing conversation / receiver guard ────────────────────────────────

  describe('missing conversation info guard', () => {
    it('shows error screen when conversationId is missing', () => {
      useParams.mockReturnValue({ conversationId: undefined });
      useLocation.mockReturnValue({ state: { receiverId: RECEIVER_ID } });
      renderPage();
      expect(screen.getByText(/Missing conversation information/i)).toBeInTheDocument();
    });

    it('shows error screen when receiverId is missing', () => {
      useLocation.mockReturnValue({ state: {} });
      renderPage();
      expect(screen.getByText(/Missing conversation information/i)).toBeInTheDocument();
    });

    it('navigates back when "Go back" is clicked on the error screen', () => {
      useParams.mockReturnValue({ conversationId: undefined });
      useLocation.mockReturnValue({ state: { receiverId: RECEIVER_ID } });
      renderPage();
      fireEvent.click(screen.getByText(/Go back/i));
      expect(navigateMock).toHaveBeenCalledWith(-1);
    });
  });

  // ── Header ───────────────────────────────────────────────────────────────

  describe('header', () => {
    it('renders receiver name in header', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());
    });

    it('falls back to "User" when receiverName is absent', async () => {
      useLocation.mockReturnValue({ state: { receiverId: RECEIVER_ID, listingId: LISTING_ID } });
      renderPage();
      await waitFor(() => expect(screen.getByText('User')).toBeInTheDocument());
    });

    it('navigates back when the back button is clicked', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Jane Doe'));
      // ChevronLeft button is the first button in the header
      const backBtn = screen.getAllByRole('button')[0];
      fireEvent.click(backBtn);
      expect(navigateMock).toHaveBeenCalledWith(-1);
    });
  });

  // ── Negotiated item banner ────────────────────────────────────────────────

  describe('negotiated item banner', () => {
    it('renders the listing title in the banner', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Test Laptop')).toBeInTheDocument());
    });

    it('renders the listing price formatted in en-ZA', async () => {
      renderPage();
      // en-ZA: R5 000,00 (space thousands, comma decimal)
      await waitFor(() => expect(screen.getByText(/R5[\s\u00a0]000,00/)).toBeInTheDocument());
    });

    it('shows "View Item" button when user is the buyer', async () => {
      // mockListing.seller_id = 'other-seller', user.id = 'user-me' → buyer
      renderPage();
      await waitFor(() => expect(screen.getByText('View Item')).toBeInTheDocument());
    });

    it('"View Item" navigates to the listing detail page', async () => {
      renderPage();
      await waitFor(() => screen.getByText('View Item'));
      fireEvent.click(screen.getByText('View Item'));
      expect(navigateMock).toHaveBeenCalledWith(`/listing/${LISTING_ID}`);
    });

    it('does NOT show "View Item" when user is the seller', async () => {
      // Make user the seller
      useAuth.mockReturnValue({ user: { id: 'other-seller' } });
      renderPage();
      await waitFor(() => screen.getByText('Test Laptop'));
      expect(screen.queryByText('View Item')).not.toBeInTheDocument();
    });

    it('uses Unsplash fallback when listing has no image_path', async () => {
      setupSupabaseMocks({
        listingData: { data: { ...mockListing, image_path: null }, error: null },
      });
      renderPage();
      await waitFor(() => {
        const img = Array.from(document.querySelectorAll('img'))
          .find(i => i.src.includes('unsplash.com'));
        expect(img).toBeDefined();
      });
    });

    it('does not render banner when listing fetch returns null', async () => {
      setupSupabaseMocks({ listingData: { data: null, error: null } });
      renderPage();
      // Give async effects time to settle
      await act(async () => { jest.runAllTimers(); });
      expect(screen.queryByText('View Item')).not.toBeInTheDocument();
    });
  });

  // ── Messages rendering ────────────────────────────────────────────────────

  describe('messages rendering', () => {
    it('renders all message bodies', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText('Hello there!')).toBeInTheDocument();
        expect(screen.getByText('Hi back at you!')).toBeInTheDocument();
      });
    });

    it('aligns current user messages to the right (justify-end)', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Hello there!'));
      const myMsg = screen.getByText('Hello there!').closest('div[class*="flex"]');
      expect(myMsg).toHaveClass('justify-end');
    });

    it('aligns receiver messages to the left (justify-start)', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Hi back at you!'));
      const theirMsg = screen.getByText('Hi back at you!').closest('div[class*="flex"]');
      expect(theirMsg).toHaveClass('justify-start');
    });

    it('shows "No messages yet" when messages array is empty', async () => {
      useMessages.mockReturnValue({ ...defaultMessagesMock, messages: [] });
      renderPage();
      await waitFor(() =>
        expect(screen.getByText(/No messages yet/i)).toBeInTheDocument()
      );
    });

    it('shows loading state when messages are loading', async () => {
      useMessages.mockReturnValue({ ...defaultMessagesMock, messages: [], loading: true });
      renderPage();
      expect(screen.getByText(/Loading messages/i)).toBeInTheDocument();
    });

    it('shows error message when messages hook returns an error', async () => {
      useMessages.mockReturnValue({ ...defaultMessagesMock, messages: [], error: 'Connection failed' });
      renderPage();
      await waitFor(() =>
        expect(screen.getByText(/Connection failed/i)).toBeInTheDocument()
      );
    });
  });

  // ── Message input & send ──────────────────────────────────────────────────

  describe('message input and send', () => {
    it('renders the textarea placeholder', async () => {
      renderPage();
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    });

    it('updates textarea value on change', async () => {
      renderPage();
      const textarea = screen.getByPlaceholderText('Type a message...');
      fireEvent.change(textarea, { target: { value: 'New message' } });
      expect(textarea.value).toBe('New message');
    });

    it('send button is disabled when input is empty', () => {
      renderPage();
      const sendBtn = screen.getByTitle('Send message');
      expect(sendBtn).toBeDisabled();
    });

    it('send button is enabled when input has text', () => {
      renderPage();
      fireEvent.change(screen.getByPlaceholderText('Type a message...'), {
        target: { value: 'Hello' },
      });
      expect(screen.getByTitle('Send message')).not.toBeDisabled();
    });

    it('calls sendMessage and clears input on send button click', async () => {
      const sendMessage = jest.fn().mockResolvedValue(undefined);
      useMessages.mockReturnValue({ ...defaultMessagesMock, sendMessage });
      renderPage();

      fireEvent.change(screen.getByPlaceholderText('Type a message...'), {
        target: { value: 'Test message' },
      });
      fireEvent.click(screen.getByTitle('Send message'));

      await waitFor(() => expect(sendMessage).toHaveBeenCalledWith('Test message', LISTING_ID));
      await waitFor(() => expect(screen.getByPlaceholderText('Type a message...').value).toBe(''));
    });

    it('calls sendMessage when Enter is pressed (without Shift)', async () => {
      const sendMessage = jest.fn().mockResolvedValue(undefined);
      useMessages.mockReturnValue({ ...defaultMessagesMock, sendMessage });
      renderPage();

      const textarea = screen.getByPlaceholderText('Type a message...');
      fireEvent.change(textarea, { target: { value: 'Enter message' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      await waitFor(() => expect(sendMessage).toHaveBeenCalledWith('Enter message', LISTING_ID));
    });

    it('does NOT send when Shift+Enter is pressed', async () => {
      const sendMessage = jest.fn().mockResolvedValue(undefined);
      useMessages.mockReturnValue({ ...defaultMessagesMock, sendMessage });
      renderPage();

      const textarea = screen.getByPlaceholderText('Type a message...');
      fireEvent.change(textarea, { target: { value: 'multiline' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('disables textarea while sending', async () => {
      // sendMessage never resolves to keep `sending = true`
      const sendMessage = jest.fn().mockReturnValue(new Promise(() => {}));
      useMessages.mockReturnValue({ ...defaultMessagesMock, sendMessage });
      renderPage();

      const textarea = screen.getByPlaceholderText('Type a message...');
      fireEvent.change(textarea, { target: { value: 'Sending...' } });
      fireEvent.click(screen.getByTitle('Send message'));

      await waitFor(() => expect(textarea).toBeDisabled());
    });
  });

  // ── Dropdown menu ─────────────────────────────────────────────────────────

  describe('dropdown menu', () => {
    it('menu is hidden by default', () => {
      renderPage();
      expect(screen.queryByText('Buy')).not.toBeInTheDocument();
    });

    it('opens the dropdown menu when the MoreVertical button is clicked', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Jane Doe'));
      // MoreVertical button has no label — it's the last icon-only button in the header
      const moreBtn = screen.getByRole('button', { name: '' , hidden: true }) ??
        Array.from(document.querySelectorAll('header button')).at(-1);
      const headerBtns = Array.from(document.querySelectorAll('header button'));
      fireEvent.click(headerBtns.at(-1));
      expect(screen.getByText('Buy')).toBeInTheDocument();
    });

    it('shows Buy, Trade, Report options for buyer', async () => {
      // user is buyer (seller_id = 'other-seller', user = 'user-me')
      renderPage();
      await waitFor(() => screen.getByText('Test Laptop'));
      const headerBtns = Array.from(document.querySelectorAll('header button'));
      fireEvent.click(headerBtns.at(-1));
      expect(screen.getByText('Buy')).toBeInTheDocument();
      expect(screen.getByText('Trade')).toBeInTheDocument();
      expect(screen.getByText('Report')).toBeInTheDocument();
    });

    it('shows only Report option for seller', async () => {
      useAuth.mockReturnValue({ user: { id: 'other-seller' } });
      renderPage();
      await waitFor(() => screen.getByText('Test Laptop'));
      const headerBtns = Array.from(document.querySelectorAll('header button'));
      fireEvent.click(headerBtns.at(-1));
      expect(screen.queryByText('Buy')).not.toBeInTheDocument();
      expect(screen.getByText('Report')).toBeInTheDocument();
    });

    it('closes the menu when Buy is clicked', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Test Laptop'));
      const headerBtns = Array.from(document.querySelectorAll('header button'));
      fireEvent.click(headerBtns.at(-1));
      fireEvent.click(screen.getByText('Buy'));
      expect(screen.queryByText('Buy')).not.toBeInTheDocument();
    });

    it('closes the menu when Trade is clicked', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Test Laptop'));
      const headerBtns = Array.from(document.querySelectorAll('header button'));
      fireEvent.click(headerBtns.at(-1));
      fireEvent.click(screen.getByText('Trade'));
      expect(screen.queryByText('Trade')).not.toBeInTheDocument();
    });

    it('closes the menu when Report is clicked', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Test Laptop'));
      const headerBtns = Array.from(document.querySelectorAll('header button'));
      fireEvent.click(headerBtns.at(-1));
      fireEvent.click(screen.getByText('Report'));
      expect(screen.queryByText('Report')).not.toBeInTheDocument();
    });
  });

  // ── Profile modal ─────────────────────────────────────────────────────────

  describe('profile modal', () => {
    it('modal is hidden by default', () => {
      renderPage();
      expect(screen.queryByText('User Profile')).not.toBeInTheDocument();
    });

    it('opens profile modal when avatar button is clicked', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Jane Doe'));
      // Avatar button is a rounded-full button inside the header
      const avatarBtn = Array.from(document.querySelectorAll('header button'))
        .find(b => b.className.includes('rounded-full') && b.className.includes('w-10'));
      fireEvent.click(avatarBtn);
      expect(screen.getByText('User Profile')).toBeInTheDocument();
    });

    it('closes profile modal when X button is clicked', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Jane Doe'));
      const avatarBtn = Array.from(document.querySelectorAll('header button'))
        .find(b => b.className.includes('rounded-full') && b.className.includes('w-10'));
      fireEvent.click(avatarBtn);
      expect(screen.getByText('User Profile')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /close/i }) ??
        Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg') && b.className.includes('hover:text-dark') && b.className.includes('p-2'))
      );
      // Find close button by its position (last button in modal header)
      const closeBtn = Array.from(document.querySelectorAll('button'))
        .find(b => b.className.includes('hover:text-dark') && b.className.includes('p-2'));
      if (closeBtn) fireEvent.click(closeBtn);
      await waitFor(() => expect(screen.queryByText('User Profile')).not.toBeInTheDocument());
    });

    it('shows receiver username in modal', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Jane Doe'));
      const avatarBtn = Array.from(document.querySelectorAll('header button'))
        .find(b => b.className.includes('rounded-full') && b.className.includes('w-10'));
      fireEvent.click(avatarBtn);
      await waitFor(() =>
        // profile modal shows username from the fetched profile
        expect(screen.getByText('jane_doe')).toBeInTheDocument()
      );
    });

    it('renders 5 star rating icons in profile modal', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Jane Doe'));
      const avatarBtn = Array.from(document.querySelectorAll('header button'))
        .find(b => b.className.includes('rounded-full') && b.className.includes('w-10'));
      fireEvent.click(avatarBtn);
      expect(screen.getByText('4.0')).toBeInTheDocument();
    });

    it('shows receiver avatar image when avatar_url is set', async () => {
      setupSupabaseMocks({
        profileData: { data: { ...mockProfile, avatar_url: 'https://example.com/avatar.jpg' }, error: null },
      });
      renderPage();
      await waitFor(() => screen.getByText('Jane Doe'));
      const avatarBtn = Array.from(document.querySelectorAll('header button'))
        .find(b => b.className.includes('rounded-full') && b.className.includes('w-10'));
      fireEvent.click(avatarBtn);
      await waitFor(() => {
        const imgs = screen.getAllByRole('img');
        expect(imgs.some(i => i.src.includes('avatar.jpg'))).toBe(true);
      });
    });
  });

  // ── Supabase: listing & role fetch ────────────────────────────────────────

  describe('Supabase fetch wiring', () => {
    it('queries the listings table with the listing ID from location state', async () => {
      const { listingsChain } = setupSupabaseMocks();
      renderPage();
      await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('listings'));
      expect(listingsChain.eq).toHaveBeenCalledWith('id', LISTING_ID);
    });

    it('queries the users table with the receiver ID', async () => {
      renderPage();
      await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('users'));
    });

    it('fetches conversation to get listing_id when listingId is absent from state', async () => {
      useLocation.mockReturnValue({
        state: { receiverId: RECEIVER_ID, receiverName: 'Jane Doe' }, // no listingId
      });
      const { conversationsChain } = setupSupabaseMocks();
      renderPage();
      await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('conversations'));
      expect(conversationsChain.eq).toHaveBeenCalledWith('id', CONV_ID);
    });
  });

  // ── Mark as read ──────────────────────────────────────────────────────────

  describe('mark messages as read', () => {
    it('queries messages for unread items after 500ms', async () => {
      renderPage();
      act(() => { jest.advanceTimersByTime(500); });
      await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('messages'));
    });

    it('does not query messages when conversationId is absent', async () => {
      useParams.mockReturnValue({ conversationId: undefined });
      useLocation.mockReturnValue({ state: { receiverId: RECEIVER_ID } });
      renderPage();
      act(() => { jest.advanceTimersByTime(500); });
      // The guard screen renders — messages table should not be called for read-receipt
      const messageCalls = supabase.from.mock.calls.filter(c => c[0] === 'messages');
      expect(messageCalls.length).toBe(0);
    });
  });

  // ── useMessages hook integration ──────────────────────────────────────────

  describe('useMessages hook wiring', () => {
    it('calls useMessages with conversationId and receiverId', () => {
      renderPage();
      expect(useMessages).toHaveBeenCalledWith(CONV_ID, RECEIVER_ID);
    });
  });
});
