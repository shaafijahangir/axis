import { create } from 'zustand';
import { User, UserRole } from '@/types/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isHydrated: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isHydrated: false,

  setAuth: (token: string, user: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
  },

  hydrate: () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const user = userStr ? (JSON.parse(userStr) as User) : null;
    set({ token, user, isHydrated: true });
  },
}));

/**
 * WHY: All roles now land on `/home`. The home page renders the right feed
 * based on role. This eliminates role-specific dashboard routes.
 */
export function getRoleDashboardPath(_roles: UserRole[]): string {
  return '/home';
}
