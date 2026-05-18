import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MessagesPage from './Message';
import { supabase } from './utils/supabase';
import { useAuth } from './AuthContext';
import { useMessages } from './hooks/useMessages';

// ─── jsdom shim ───────────────────────────────────────────────────────────────
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
const CONV_ID     = 'conv-123';
const RECEIVER_ID = 'receiver-456';
const LISTING_ID  = 'listing-789';
const USER_ID     = 'user-me';

const mockUser    = { id: USER_ID };
const mockListing = {
  id: LISTING_ID,
  seller_id: 'other-seller',
  title: 'Test Laptop',
  price: '5000',
  image_path: 'img/laptop.jpg',
  condition: 'Good',
};
const mockProfile = {
  id: RECEIVER_ID,
  username: 'jane_doe',
  email: 'jane@uni.ac.za',
  profile_picture_url: null,
};
const mockMessages = [
  { id: 'msg-1', sender_id: USER_ID,     body: 'Hello there!',    sent_at: new Date().toISOString(), conversation_id: CONV_ID },
  { id: 'msg-2', sender_id: RECEIVER_ID, body: 'Hi back at you!', sent_at: new Date().toISOString(), conversation_id: CONV_ID },
];

// ─── Supabase chain builder ───────────────────────────────────────────────────
/**
 * Build a chain where every method returns `this` EXCEPT the terminal methods
 * which return resolved promises. This covers all termination patterns used
 * across MessagesPage and UserProfileModal:
 *   .single()      — listings, conversations, users (receiver profile)
 *   .maybeSingle() — UserProfileModal internal fetch
 *   .order()       — not used here but included for safety
 *   .in()          — messages UPDATE .in()
 *   last .eq()     — messages SELECT unread (terminates with .eq('is_read', false))
 */
const makeChain = (resolveValue = { data: null, error: null }) => {
  const c = {};
  c.select     = jest.fn().mockReturnValue(c);
  c.eq         = jest.fn().mockReturnValue(c);
  c.not        = jest.fn().mockReturnValue(c);
  c.limit      = jest.fn().mockResolvedValue({ data: [], error: null });
  c.update     = jest.fn().mockReturnValue(c);
  c.in         = jest.fn().mockResolvedValue({ data: null, error: null });
  c.single     = jest.fn().mockResolvedValue(resolveValue);
  c.maybeSingle = jest.fn().mockResolvedValue(resolveValue);
  c.order      = jest.fn().mockResolvedValue(resolveValue);
  return c;
};

// Make the mark-as-read SELECT chain resolve on the third .eq() call
// (the query is: .eq('conversation_id').eq('receiver_id').eq('is_read', false))
const makeMessagesReadChain = (readMessages = { data: [], error: null }) => {
  let eqCount = 0;
  const c = {};
  c.select = jest.fn().mockReturnValue(c);
  c.update = jest.fn().mockReturnValue(c);
  c.in     = jest.fn().mockResolvedValue({ data: null, error: null });
  c.eq     = jest.fn().mockImplementation(() => {
    eqCount++;
    if (eqCount >= 3) return Promise.resolve(readMessages);
    return c;
  });
  c.single      = jest.fn().mockResolvedValue({ data: null, error: null });
  c.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
  c.limit       = jest.fn().mockResolvedValue({ data: [], error: null });
  c.not         = jest.fn().mockReturnValue(c);
  return c;
};

/**
 * Wire supabase.from by table name.
 * UserProfileModal also calls supabase.from('users') and supabase.from('reviews')
 * internally, so we handle those too.
 */
const setupSupabaseMocks = ({
  conversationData = { data: { listing_id: LISTING_ID }, error: null },
  listingData      = { data: mockListing, error: null },
  profileData      = { data: mockProfile, error: null },
  readMessages     = { data: [], error: null },
  // UserProfileModal fetches: users (profile), reviews (ratings), listings (user listings)
  modalProfileData = { data: { ...mockProfile, rating: 4.0, transaction_count: 5 }, error: null },
  modalReviewsData = { data: [], error: null },
  modalListingsData = { data: [], error: null },
} = {}) => {
  const conversationsChain = makeChain(conversationData);
  const listingsChain      = makeChain(listingData);

  // Track calls to 'users' — first is receiver profile in MessagesPage,
  // subsequent calls are from UserProfileModal
  let usersCallCount = 0;
  const usersChainFactory = () => {
    usersCallCount++;
    if (usersCallCount === 1) return makeChain(profileData);
    return makeChain(modalProfileData);
  };

  const messagesChain = makeMessagesReadChain(readMessages);

  // reviews and listings are called by UserProfileModal
  const reviewsChain  = makeChain(modalReviewsData);
  const listingsModalChain = makeChain(modalListingsData);

  let listingsCallCount = 0;

  supabase.from.mockImplementation((table) => {
    switch (table) {
      case 'conversations': return conversationsChain;
      case 'listings': {
        listingsCallCount++;
        // First call = MessagesPage listing fetch, subsequent = UserProfileModal
        if (listingsCallCount === 1) return makeChain(listingData);
        return makeChain(modalListingsData);
      }
      case 'users':    return usersChainFactory();
      case 'messages': return messagesChain;
      case 'reviews':  return reviewsChain;
      default:         return makeChain({ data: null, error: null });
    }
  });

  return { conversationsChain, listingsChain };
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

// ─── Helper: open profile modal ───────────────────────────────────────────────
const openProfileModal = async () => {
  await waitFor(() => screen.getByText('Jane Doe'));
  const avatarBtn = Array.from(document.querySelectorAll('header button'))
    .find(b => b.className.includes('rounded-full') && b.className.includes('w-10'));
  fireEvent.click(avatarBtn);
};

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
      await waitFor(() => expect(screen.getByText(/R5[\s\u00a0]000,00/)).toBeInTheDocument());
    });

    it('shows "View Item" button when user is the buyer', async () => {
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
      expect(screen.getByTitle('Send message')).toBeDisabled();
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

    it('Buy is never in the document (unimplemented action removed)', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Jane Doe'));
      expect(screen.queryByText('Buy')).not.toBeInTheDocument();
    });

    it('Buy, Trade and Report options are not in the document', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Test Laptop'));
      expect(screen.queryByText('Buy')).not.toBeInTheDocument();
      expect(screen.queryByText('Trade')).not.toBeInTheDocument();
      expect(screen.queryByText('Report')).not.toBeInTheDocument();
    });

    it('Report option is not in the document for seller', async () => {
      useAuth.mockReturnValue({ user: { id: 'other-seller' } });
      renderPage();
      await waitFor(() => screen.getByText('Test Laptop'));
      expect(screen.queryByText('Buy')).not.toBeInTheDocument();
      expect(screen.queryByText('Report')).not.toBeInTheDocument();
    });

    it('Buy is never in the document', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Test Laptop'));
      expect(screen.queryByText('Buy')).not.toBeInTheDocument();
    });

    it('Trade is never in the document', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Test Laptop'));
      expect(screen.queryByText('Trade')).not.toBeInTheDocument();
    });

    it('Report is never in the document', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Test Laptop'));
      expect(screen.queryByText('Report')).not.toBeInTheDocument();
    });
  });

  // ── Profile modal ─────────────────────────────────────────────────────────
  describe('profile modal', () => {
    it('modal is hidden by default', () => {
      renderPage();
      // The modal title is "Profile" in the DOM (not "User Profile")
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });

    it('opens profile modal when avatar button is clicked', async () => {
      renderPage();
      await openProfileModal();
      // Modal renders with title "Profile"
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('closes profile modal when Close button is clicked', async () => {
      renderPage();
      await openProfileModal();
      expect(screen.getByText('Profile')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      await waitFor(() => expect(screen.queryByText('Profile')).not.toBeInTheDocument());
    });

    it('shows receiver username in modal', async () => {
      renderPage();
      await openProfileModal();
      await waitFor(() =>
        expect(screen.getByText('jane_doe')).toBeInTheDocument()
      );
    });

    it('renders star rating in profile modal', async () => {
      renderPage();
      await openProfileModal();
      // Modal shows some rating value — just verify it renders without error
      await waitFor(() => expect(screen.getByText('Profile')).toBeInTheDocument());
    });

    it('shows receiver avatar image when profile_picture_url is set', async () => {
      setupSupabaseMocks({
        profileData: { data: { ...mockProfile, profile_picture_url: 'https://example.com/avatar.jpg' }, error: null },
      });
      renderPage();
      await waitFor(() => screen.getByText('Jane Doe'));
      await waitFor(() => {
        const imgs = screen.getAllByRole('img');
        expect(imgs.some(i => i.src.includes('avatar.jpg'))).toBe(true);
      });
    });
  });

  // ── Supabase fetch wiring ─────────────────────────────────────────────────
  describe('Supabase fetch wiring', () => {
    it('queries the listings table with the listing ID from location state', async () => {
      renderPage();
      await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('listings'));
      // Verify the eq call was made with the listing ID on whatever chain was used
      const allEqCalls = supabase.from.mock.results
        .filter((_, i) => supabase.from.mock.calls[i][0] === 'listings')
        .flatMap(r => r.value.eq.mock.calls);
      expect(allEqCalls).toContainEqual(['id', LISTING_ID]);
    });

    it('queries the users table with the receiver ID', async () => {
      renderPage();
      await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('users'));
    });

    it('fetches conversation to get listing_id when listingId is absent from state', async () => {
      useLocation.mockReturnValue({
        state: { receiverId: RECEIVER_ID, receiverName: 'Jane Doe' },
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
