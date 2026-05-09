/**
 * WHY: Central auth hook — wraps login, register, logout, and biometric unlock.
 * PATTERN: Stores token in SecureStore, user in SecureStore, exposes typed state.
 * Components read from this hook; they never touch SecureStore directly.
 */
import { useState, useEffect, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  storeToken,
  storeUser,
  getToken,
  getStoredUser,
  clearAuth,
  type StoredUser,
} from '../lib/auth';
import { apolloClient } from '../lib/apollo';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

interface AuthState {
  user: StoredUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface LoginParams {
  email: string;
  password: string;
}

interface RegisterParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId: string;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // On mount: check for stored session
  useEffect(() => {
    void restoreSession();
  }, []);

  const restoreSession = async () => {
    const [token, user] = await Promise.all([getToken(), getStoredUser()]);
    if (token && user) {
      setState({ user, isLoading: false, isAuthenticated: true });
    } else {
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  };

  const login = useCallback(async ({ email, password }: LoginParams) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        message?: string;
      };
      throw new Error(body.message ?? 'Login failed');
    }

    const data = (await res.json()) as {
      accessToken: string;
      user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        roles: string[];
        tenantId?: string;
      };
    };

    const storedUser: StoredUser = {
      id: data.user.id,
      email: data.user.email,
      firstName: data.user.firstName,
      lastName: data.user.lastName,
      roles: data.user.roles,
      tenantId: data.user.tenantId ?? '',
    };

    await Promise.all([storeToken(data.accessToken), storeUser(storedUser)]);

    setState({ user: storedUser, isLoading: false, isAuthenticated: true });
  }, []);

  const register = useCallback(
    async ({
      email,
      password,
      firstName,
      lastName,
      tenantId,
    }: RegisterParams) => {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          tenantId,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(body.message ?? 'Registration failed');
      }

      const data = (await res.json()) as {
        accessToken: string;
        user: {
          id: string;
          email: string;
          firstName: string;
          lastName: string;
          roles: string[];
          tenantId?: string;
        };
      };

      const storedUser: StoredUser = {
        id: data.user.id,
        email: data.user.email,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        roles: data.user.roles,
        tenantId: data.user.tenantId ?? '',
      };

      await Promise.all([storeToken(data.accessToken), storeUser(storedUser)]);

      setState({ user: storedUser, isLoading: false, isAuthenticated: true });
    },
    [],
  );

  const logout = useCallback(async () => {
    await clearAuth();
    // Clear Apollo cache so stale data doesn't appear on next login
    await apolloClient.clearStore();
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  /**
   * Biometric unlock: requires an existing session (token in SecureStore).
   * WHY: The token is already there from previous login — we just need to
   * re-verify the user owns the device before trusting it.
   */
  const biometricUnlock = useCallback(async (): Promise<boolean> => {
    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);

    if (!hasHardware || !isEnrolled) return false;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock NexusEd',
      fallbackLabel: 'Use passcode',
    });

    if (result.success) {
      await restoreSession();
      return true;
    }
    return false;
  }, []);

  return {
    ...state,
    login,
    register,
    logout,
    biometricUnlock,
  };
}
