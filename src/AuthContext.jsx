import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './utils/supabase';

const AuthContext = createContext(null);
const ROLE_FETCH_TIMEOUT_MS = 5000;

function normalizeRole(rawRole) {
  if (rawRole === 'user') return 'student';
  if (rawRole === 'student' || rawRole === 'staff' || rawRole === 'admin') return rawRole;
  return 'student';
}

async function ensureUserRole(user) {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

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
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: nextRole })
      .eq('id', user.id);

    if (updateError) throw updateError;
  }

  return nextRole;
}

async function resolveRoleWithFallback(user) {
  try {
    const rolePromise = ensureUserRole(user);
    const timeoutPromise = new Promise((resolve) =>
      setTimeout(() => resolve('student'), ROLE_FETCH_TIMEOUT_MS),
    );
    const resolvedRole = await Promise.race([rolePromise, timeoutPromise]);
    return normalizeRole(resolvedRole);
  } catch (error) {
    console.error('Error resolving user role:', error);
    return 'student';
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const sessionUser = session?.user ?? null;
        if (!isMounted) return;

        setUser(sessionUser);

        if (sessionUser) {
          const userRole = await resolveRoleWithFallback(sessionUser);
          if (isMounted) setRole(userRole);
        } else {
          setRole(null);
        }
      } catch (error) {
        console.error('Error loading session:', error);
        if (isMounted) {
          setUser(null);
          setRole(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);

      if (!sessionUser) {
        setRole(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const userRole = await resolveRoleWithFallback(sessionUser);
      setRole(userRole);
      setLoading(false);
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
  };

  const value = useMemo(
    () => ({
      user,
      role,
      loading,
      signOut,
    }),
    [loading, role, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
