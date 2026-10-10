'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '@/lib/api/auth';
import { useAuthStore, getRoleDashboardPath } from '@/stores/auth.store';
import { useHydrated } from '@/components/auth/use-hydrated';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const hydrated = useHydrated();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // WHY: read the values from the DOM at submit time instead of mirroring
    // them in state. Text typed before hydration never fires onChange, so a
    // controlled `useState('')` would keep '' while the field visibly holds
    // the email, and the login would go out empty.
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');
    setError('');
    setIsLoading(true);

    try {
      const response = await authApi.login({ email, password });
      setAuth(response.user);
      router.push(getRoleDashboardPath(response.user.roles));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Axis</h1>
          <p className="mt-2 text-muted-foreground">Sign in to your account</p>
        </div>

        {/*
          method="post": if a native submit ever slips through (no JS), the
          credentials go in a request body, never into the URL / history.
        */}
        <form
          method="post"
          onSubmit={handleSubmit}
          className="mt-8 space-y-6"
        >
          {error && (
            <div
              id="login-error"
              role="alert"
              className="rounded-md bg-destructive/10 border border-destructive/20 p-3"
            >
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="student@example.com"
                disabled={isLoading}
                aria-describedby={error ? 'login-error' : undefined}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                disabled={isLoading}
                aria-describedby={error ? 'login-error' : undefined}
              />
            </div>
          </div>

          {/* Disabled until hydrated: before that, onSubmit is not attached. */}
          <Button
            type="submit"
            className="w-full"
            disabled={!hydrated || isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {"Don't"} have an account?{' '}
            <Link
              href="/register"
              className="font-medium text-primary hover:underline"
            >
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
