import { AuthResponse, LoginCredentials, RegisterData } from '@/types/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * WHY: credentials: 'include' is required for the browser to accept
 * and send httpOnly cookies from cross-origin requests.
 */
export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid email or password. Please try again.');
      }
      if (response.status === 429) {
        throw new Error('Too many login attempts. Please wait and try again.');
      }
      const error = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      throw new Error(error.message || 'Login failed. Please try again.');
    }

    return response.json();
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    return response.json();
  },
};
