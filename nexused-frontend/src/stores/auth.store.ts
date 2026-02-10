import { create } from 'zustand';
import { User, UserRole } from '@/types/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setAuth: (user: User) => void;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  hydrate: () => void;
}

/**
 * WHY: Token is now stored in httpOnly cookie, not localStorage.
 * PATTERN: Only store user info for UI state. The browser manages the cookie.
 * TRADEOFF: We can't check token expiry client-side, but that's fine - the
 * server will reject expired tokens and we handle 401s in Apollo error link.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isHydrated: false,

  setAuth: (user: User) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },

  /**
   * Update user object (e.g., after preferences change) without re-authenticating.
   */
  setUser: (user: User) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },

  logout: async () => {
    try {
      // Call backend to clear the httpOnly cookie
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore network errors - clear local state anyway
    }
    localStorage.removeItem('user');
    set({ user: null, isAuthenticated: false });
  },

  hydrate: () => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? (JSON.parse(userStr) as User) : null;
    set({ user, isAuthenticated: !!user, isHydrated: true });
  },
}));

/**
 * WHY: All roles now land on `/home`. The home page renders the right feed
 * based on role. This eliminates role-specific dashboard routes.
 */
export function getRoleDashboardPath(_roles: UserRole[]): string {
  return '/home';
}
