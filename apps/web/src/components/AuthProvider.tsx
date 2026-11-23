'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, post } from '@/lib/api';
import type { User } from '@/lib/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (u: User | null) => void;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState>({ user: null, loading: true, setUser: () => {}, logout: async () => {} });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<User>('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = useCallback(async () => {
    await post('/auth/logout').catch(() => undefined);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, setUser, logout }), [user, loading, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
