'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Bell, CheckCheck, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MY_NOTIFICATIONS_QUERY,
  UNREAD_NOTIFICATION_COUNT_QUERY,
} from '@/lib/graphql/queries/notifications';
import {
  MARK_NOTIFICATION_READ_MUTATION,
  MARK_ALL_NOTIFICATIONS_READ_MUTATION,
} from '@/lib/graphql/mutations/notifications';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

const PAGE_SIZE = 20;

function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    grade_posted: 'Grade',
    assignment_created: 'Assignment',
    enrollment_confirmed: 'Enrollment',
    due_reminder: 'Reminder',
    new_message: 'Message',
    announcement: 'Announcement',
  };
  return labels[type] ?? type;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export default function NotificationsPage() {
  const [offset, setOffset] = useState(0);

  const { data, loading, fetchMore, refetch } = useQuery<{
    myNotifications: Notification[];
  }>(MY_NOTIFICATIONS_QUERY, {
    variables: { limit: PAGE_SIZE, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });

  const { data: countData, refetch: refetchCount } = useQuery<{
    unreadNotificationCount: number;
  }>(UNREAD_NOTIFICATION_COUNT_QUERY);

  const [markRead] = useMutation(MARK_NOTIFICATION_READ_MUTATION, {
    onCompleted: () => void refetchCount(),
  });

  const [markAllRead, { loading: markingAll }] = useMutation(
    MARK_ALL_NOTIFICATIONS_READ_MUTATION,
    {
      onCompleted: () => {
        void refetch();
        void refetchCount();
        toast.success('All notifications marked as read');
      },
      onError: () => toast.error('Failed to mark all as read'),
    },
  );

  const notifications = data?.myNotifications ?? [];
  const unreadCount = countData?.unreadNotificationCount ?? 0;
  const hasMore = notifications.length === offset + PAGE_SIZE;

  const handleMarkRead = (id: string, alreadyRead: boolean) => {
    if (alreadyRead) return;
    void markRead({ variables: { id } });
  };

  const handleLoadMore = () => {
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    void fetchMore({
      variables: { limit: PAGE_SIZE, offset: newOffset },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          myNotifications: [
            ...prev.myNotifications,
            ...fetchMoreResult.myNotifications,
          ],
        };
      },
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-7 w-7 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {unreadCount} unread
              </p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void markAllRead()}
            disabled={markingAll}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      <Separator />

      {loading && notifications.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-3 rounded-lg border p-4">
              <Skeleton className="mt-0.5 h-4 w-4 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Bell className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <h3 className="text-lg font-medium">No notifications</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            You&apos;re all caught up!
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((n, i) => (
            <div key={n.id}>
              {i > 0 && <Separator />}
              <button
                type="button"
                onClick={() => handleMarkRead(n.id, n.read)}
                className={`w-full rounded-lg px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                  !n.read ? 'bg-primary/5' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0">
                    {n.read ? (
                      <Circle className="h-2 w-2 text-muted-foreground/30 fill-muted-foreground/30" />
                    ) : (
                      <Circle className="h-2 w-2 text-primary fill-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm font-medium ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}
                      >
                        {n.title}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {typeLabel(n.type)}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                      {n.body}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      {formatRelative(n.createdAt)}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          ))}

          {hasMore && (
            <div className="pt-2 text-center">
              <Button variant="outline" size="sm" onClick={handleLoadMore}>
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
