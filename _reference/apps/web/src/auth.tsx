import React, { createContext, useContext, useMemo, useState } from 'react';
import { api } from './api';

type User = {
  id: string;
  companyId: string;
  role: string;
  email: string;
  name: string;
  projectIds: string[];
};

type AuthCtx = {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('luxaria_token'));
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('luxaria_user');
    return raw ? JSON.parse(raw) : null;
  });

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      token,
      async login(email, password) {
        const data = await api<{ token: string; user: User }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        localStorage.setItem('luxaria_token', data.token);
        localStorage.setItem('luxaria_user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
      },
      logout() {
        localStorage.removeItem('luxaria_token');
        localStorage.removeItem('luxaria_user');
        setToken(null);
        setUser(null);
      },
    }),
    [user, token]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('AuthProvider missing');
  return ctx;
}
