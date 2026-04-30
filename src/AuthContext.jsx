import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './utils/supabase';

const AuthContext = createContext(null);
const ROLE_STORAGE_KEY = 'unimart_user_role';
const USER_STORAGE_KEY = 'unimart_user_id';
const USER_EMAIL_KEY = 'unimart_user_email';

function normalizeRole(rawRole) {
  if (rawRole === 'user') return 'student';
  if (rawRole === 'student' || rawRole === 'staff' || rawRole === 'admin') return rawRole;
  return 'student';
}

async function fetchRoleFromDB(user) {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  if (!data) {
    const { error: insertError } = await supabase.from('users').insert({
      id: user.id,
      email: user.email,
      role: 'student',
    });
    if (insertError) throw insertError;
    return 'student';
  }

  const nextRole = normalizeRole(data.role);

  if (data.role !== nextRole) {
    await supabase.from('users').update({ role: nextRole }).eq('id', user.id);
  }

  return nextRole;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedId = localStorage.getItem(USER_STORAGE_KEY);
    const storedEmail = localStorage.getItem(USER_EMAIL_KEY);
    return storedId ? { id: storedId, email: storedEmail } : null;
  });

  const [role, setRole] = useState(() => {
    return localStorage.getItem(ROLE_STORAGE_KEY) ?? null;
  });

  // If we have both user and role cached, skip the loading spinner entirely
  const [loading, setLoading] = useState(() => {
    const hasCache =
      localStorage.getItem(USER_STORAGE_KEY) &&
      localStorage.getItem(ROLE_STORAGE_KEY);
    return !hasCache;
  });

  const initialSessionHandled = useRef(false);

  // Sync role to localStorage
  useEffect(() => {
    if (role) {
      localStorage.setItem(ROLE_STORAGE_KEY, role);
    } else {
      localStorage.removeItem(ROLE_STORAGE_KEY);
    }
  }, [role]);

  // Sync user to localStorage
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(USER_STORAGE_KEY, user.id);
      if (user.email) localStorage.setItem(USER_EMAIL_KEY, user.email);
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(USER_EMAIL_KEY);
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const sessionUser = session?.user ?? null;
        if (!isMounted) return;

        if (sessionUser) {
          setUser(sessionUser);

          const cachedRole = localStorage.getItem(ROLE_STORAGE_KEY);

          if (cachedRole) {
            // We already have a role — use it immediately, verify in background
            if (isMounted) setRole(cachedRole);
            // Background verify — silently update if role changed in DB
            fetchRoleFromDB(sessionUser)
              .then((freshRole) => {
                if (isMounted && freshRole !== cachedRole) {
                  console.log('[loadSession] role updated in background:', cachedRole, '→', freshRole);
                  setRole(freshRole);
                }
              })
              .catch((err) => console.warn('[loadSession] background role check failed:', err));
          } else {
            // No cache — must wait for DB
            const userRole = await fetchRoleFromDB(sessionUser);
            if (isMounted) setRole(normalizeRole(userRole));
          }
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.error('[loadSession] error:', error);
        if (isMounted) {
          setUser(null);
          setRole(null);
        }
      } finally {
        if (isMounted) {
          initialSessionHandled.current = true;
          setLoading(false);
        }
      }
    };

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!initialSessionHandled.current) return;

      const sessionUser = session?.user ?? null;
      setUser(sessionUser);

      if (!sessionUser) {
        setRole(null);
        setLoading(false);
        return;
      }

      // Always use cached role immediately — never block on DB here
      const cachedRole = localStorage.getItem(ROLE_STORAGE_KEY);
      if (cachedRole) {
        setRole(cachedRole);
        setLoading(false);
        // Background verify
        fetchRoleFromDB(sessionUser)
          .then((freshRole) => {
            if (isMounted && freshRole !== cachedRole) {
              setRole(freshRole);
            }
          })
          .catch((err) => console.warn('[onAuthStateChange] background role check failed:', err));
      } else {
        setLoading(true);
        try {
          const userRole = await fetchRoleFromDB(sessionUser);
          if (isMounted) setRole(normalizeRole(userRole));
        } catch (err) {
          console.error('[onAuthStateChange] role fetch failed:', err);
        } finally {
          if (isMounted) setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(USER_EMAIL_KEY);
    localStorage.removeItem(ROLE_STORAGE_KEY);
  };

  const value = useMemo(
    () => ({ user, role, loading, signOut }),
    [loading, role, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}