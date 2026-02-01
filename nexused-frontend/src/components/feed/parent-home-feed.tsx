'use client';

import { Heart } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

export function ParentHomeFeed() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user?.firstName}</h1>
        <p className="text-muted-foreground">
          Stay connected with your child's academic progress.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <Heart className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-medium">Parent Dashboard</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          The parent view is coming soon. You'll be able to see your child's
          grades, assignments, and announcements here.
        </p>
      </div>
    </div>
  );
}
