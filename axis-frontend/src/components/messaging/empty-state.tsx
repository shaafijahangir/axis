'use client';

import { MessageSquare } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
      <h2 className="text-lg font-medium">No conversation selected</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Select a conversation or start a new one.
      </p>
    </div>
  );
}
