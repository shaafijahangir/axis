import { Skeleton } from '@/components/ui/skeleton';

export function FeedCardSkeleton() {
  return (
    <div className="rounded-lg border border-l-4 border-l-muted p-4">
      <div className="flex items-start gap-4">
        <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}
