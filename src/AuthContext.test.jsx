import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

// ─── Supabase mock ────────────────────────────────────────────────────────────
jest.mock('./utils/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
  },
}));

import { supabase } from './utils/supabase';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TEST_USER = { id: 'user-123', email: 'alice@test.com' };

function buildFromMock({ role = 'student', insertError = null, fetchError = null } = {}) {
  supabase.from.mockImplementation(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(
      fetchError
        ? { data: null, error: fetchError }
        : { data: { role }, error: null }
    ),
    insert: jest.fn().mockResolvedValue({ error: insertError }),
    update: jest.fn().mockReturnThis(),
  }));
}

function buildAuthMock({ session = null, onChangeCb = null } = {}) {
  supabase.auth.getSession.mockResolvedValue({ data: { session } });
  supabase.auth.onAuthStateChange.mockImplementation((cb) => {
    if (onChangeCb) onChangeCb(cb);
    return { data: { subscription: { unsubscribe: jest.fn() } } };
  });
  supabase.auth.signOut.mockResolvedValue({});
}

// Consumer component to expose context values
function Consumer() {
  const { user, role, loading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user?.id ?? 'null'}</span>
      <span data-testid="role">{role ?? 'null'}</span>
    </div>
  );
}

function renderWithAuth() {
  return render(
    <AuthProvider>
      <Consumer />
    </AuthProvider>
  );
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('AuthContext', () => {
  describe('normalizeRole', () => {
    it('maps "user" role to "student"', async () => {
      buildAuthMock({ session: { user: TEST_USER } });
      buildFromMock({ role: 'user' });
      renderWithAuth();
      await waitFor(() => expect(screen.getByTestId('role').textContent).toBe('student'));
    });

    it('keeps "staff" role unchanged', async () => {
      buildAuthMock({ session: { user: TEST_USER } });
      buildFromMock({ role: 'staff' });
      renderWithAuth();
      await waitFor(() => expect(screen.getByTestId('role').textContent).toBe('staff'));
    });

    it('keeps "admin" role unchanged', async () => {
      buildAuthMock({ session: { user: TEST_USER } });
      buildFromMock({ role: 'admin' });
      renderWithAuth();
      await waitFor(() => expect(screen.getByTestId('role').textContent).toBe('admin'));
    });

    it('falls back to "student" for unknown role', async () => {
      buildAuthMock({ session: { user: TEST_USER } });
      buildFromMock({ role: 'superuser' });
      renderWithAuth();
      await waitFor(() => expect(screen.getByTestId('role').textContent).toBe('student'));
    });
  });

  describe('initial load — no session', () => {
    it('sets user and role to null when no session', async () => {
      buildAuthMock({ session: null });
      buildFromMock();
      renderWithAuth();
      await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
      expect(screen.getByTestId('user').textContent).toBe('null');
      expect(screen.getByTestId('role').textContent).toBe('null');
    });
  });

  describe('initial load — with session', () => {
    it('sets user id from session', async () => {
      buildAuthMock({ session: { user: TEST_USER } });
      buildFromMock({ role: 'student' });
      renderWithAuth();
      await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('user-123'));
    });

    it('sets role from DB when no cache', async () => {
      buildAuthMock({ session: { user: TEST_USER } });
      buildFromMock({ role: 'staff' });
      renderWithAuth();
      await waitFor(() => expect(screen.getByTestId('role').textContent).toBe('staff'));
    });

    it('sets loading false after session load', async () => {
      buildAuthMock({ session: { user: TEST_USER } });
      buildFromMock({ role: 'student' });
      renderWithAuth();
      await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    });
  });

  describe('cache-first behaviour', () => {
    it('uses cached role immediately without waiting for DB', async () => {
      localStorage.setItem('unimart_user_id', TEST_USER.id);
      localStorage.setItem('unimart_user_role', 'admin');
      localStorage.setItem('unimart_user_email', TEST_USER.email);

      buildAuthMock({ session: { user: TEST_USER } });
      buildFromMock({ role: 'admin' });

      renderWithAuth();

      // loading should be false immediately due to cache
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('role').textContent).toBe('admin');
    });

    it('updates role if DB returns a different value than cache', async () => {
      localStorage.setItem('unimart_user_id', TEST_USER.id);
      localStorage.setItem('unimart_user_role', 'student');
      localStorage.setItem('unimart_user_email', TEST_USER.email);

      buildAuthMock({ session: { user: TEST_USER } });
      buildFromMock({ role: 'staff' }); // DB has updated role

      renderWithAuth();
      await waitFor(() => expect(screen.getByTestId('role').textContent).toBe('staff'));
    });
  });

  describe('new user creation', () => {
    it('inserts new user row and returns student role when not found', async () => {
      buildAuthMock({ session: { user: TEST_USER } });
      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        insert: jest.fn().mockResolvedValue({ error: null }),
        update: jest.fn().mockReturnThis(),
      }));

      renderWithAuth();
      await waitFor(() => expect(screen.getByTestId('role').textContent).toBe('student'));
    });
  });

  describe('localStorage sync', () => {
    it('persists user id to localStorage after login', async () => {
      buildAuthMock({ session: { user: TEST_USER } });
      buildFromMock({ role: 'student' });
      renderWithAuth();
      await waitFor(() => expect(localStorage.getItem('unimart_user_id')).toBe('user-123'));
    });

    it('persists role to localStorage after login', async () => {
      buildAuthMock({ session: { user: TEST_USER } });
      buildFromMock({ role: 'staff' });
      renderWithAuth();
      await waitFor(() => expect(localStorage.getItem('unimart_user_role')).toBe('staff'));
    });

    it('clears localStorage on sign out', async () => {
      localStorage.setItem('unimart_user_id', TEST_USER.id);
      localStorage.setItem('unimart_user_role', 'student');
      localStorage.setItem('unimart_user_email', TEST_USER.email);

      buildAuthMock({ session: { user: TEST_USER } });
      buildFromMock({ role: 'student' });

      function SignOutConsumer() {
        const { signOut, user } = useAuth();
        return (
          <div>
            <span data-testid="user">{user?.id ?? 'null'}</span>
            <button onClick={signOut}>Sign out</button>
          </div>
        );
      }

      const { getByText } = render(
        <AuthProvider>
          <SignOutConsumer />
        </AuthProvider>
      );

      await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('user-123'));

      await act(async () => {
        getByText('Sign out').click();
      });

      expect(localStorage.getItem('unimart_user_id')).toBeNull();
      expect(localStorage.getItem('unimart_user_role')).toBeNull();
      expect(localStorage.getItem('unimart_user_email')).toBeNull();
    });
  });

  describe('useAuth hook', () => {
    it('throws when used outside AuthProvider', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => render(<Consumer />)).toThrow('useAuth must be used inside AuthProvider');
      spy.mockRestore();
    });
  });
});