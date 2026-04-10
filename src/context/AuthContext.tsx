/**
 * AuthContext — wraps the real Servify backend API.
 *
 * Replaces the previous mock-based implementation.
 * Login stores JWT tokens in localStorage; the `client.ts` apiFetch()
 * automatically attaches the Bearer token to every request.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, type UserProfile } from '../api/client';
import { UserRole } from '../types';

interface AuthContextType {
  user: AppUser | null;
  login: (email: string, password: string) => Promise<AppUser>;
  logout: () => void;
  isLoading: boolean;
}

/** Adapts the backend UserProfile to the frontend User shape. */
export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  wallet_balance: number;
  is_email_verified: boolean;
}

function profileToAppUser(p: UserProfile): AppUser {
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    role: p.role as UserRole,
    avatar_url: p.avatar_url,
    wallet_balance: p.wallet_balance,
    is_email_verified: p.is_email_verified,
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, restore user from localStorage (token already stored by client.ts)
  useEffect(() => {
    const raw = localStorage.getItem('servify_user');
    if (raw) {
      try {
        const parsed: UserProfile = JSON.parse(raw);
        setUser(profileToAppUser(parsed));
      } catch {
        localStorage.removeItem('servify_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<AppUser> => {
    const res = await authApi.login(email, password);
    const appUser = profileToAppUser(res.user);
    setUser(appUser);
    return appUser;
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
