'use client';

import { MessageSquare } from 'lucide-react';

export default function MessagesPage() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
      <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
      <h1 className="text-lg font-medium">Messages</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Messaging is coming soon. You'll be able to communicate with instructors
        and classmates here.
      </p>
    </div>
  );
}
