import { CheckCircle } from 'lucide-react';

export function EmptyFeed() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
      <CheckCircle className="mb-4 h-12 w-12 text-green-500" />
      <h3 className="text-lg font-medium">You're all caught up!</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        No new items right now. Check back later for updates.
      </p>
    </div>
  );
}
