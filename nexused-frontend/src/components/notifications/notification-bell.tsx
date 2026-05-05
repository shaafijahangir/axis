'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  MY_NOTIFICATIONS_QUERY,
  UNREAD_NOTIFICATION_COUNT_QUERY,
} from '@/lib/graphql/queries/notifications';
import {
  MARK_NOTIFICATION_READ_MUTATION,
  MARK_ALL_NOTIFICATIONS_READ_MUTATION,
} from '@/lib/graphql/mutations/notifications';

interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: string | null;
  read: boolean;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function NotificationBell() {
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: countData, refetch: refetchCount } = useQuery<{
    unreadNotificationCount: number;
  }>(UNREAD_NOTIFICATION_COUNT_QUERY, { fetchPolicy: 'network-only' });

  const { data: notifData, refetch: refetchNotifs } = useQuery<{
    myNotifications: AppNotification[];
  }>(MY_NOTIFICATIONS_QUERY, {
    variables: { limit: 20, offset: 0 },
    fetchPolicy: 'no-cache',
  });

  const [markRead] = useMutation<{
    markNotificationRead: { id: string; read: boolean };
  }>(MARK_NOTIFICATION_READ_MUTATION, {
    onCompleted: () => {
      void refetchCount();
      void refetchNotifs();
    },
  });

  const [markAllRead] = useMutation<{ markAllNotificationsRead: boolean }>(
    MARK_ALL_NOTIFICATIONS_READ_MUTATION,
    {
      onCompleted: () => {
        void refetchCount();
        void refetchNotifs();
      },
    },
  );

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      void refetchCount();
    }, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refetchCount]);

  const unread = countData?.unreadNotificationCount ?? 0;
  const notifications = notifData?.myNotifications ?? [];

  const handleNotificationClick = async (n: AppNotification) => {
    if (!n.read) {
      await markRead({ variables: { id: n.id } });
    }
    const parsed = n.data
      ? (JSON.parse(n.data) as Record<string, string>)
      : null;
    const path = parsed?.path;
    if (path) router.push(path);
  };

  return (
    <Popover
      onOpenChange={(open) => {
        if (open) {
          void refetchNotifs();
          void refetchCount();
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 p-0"
        align="end"
        sideOffset={8}
        aria-label="Notifications panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => void markAllRead()}
            >
              <Check className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        <Separator />

        {/* List */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              You&apos;re all caught up
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[min(400px,60vh)]">
            {notifications.map((n, i) => (
              <div key={n.id}>
                {i > 0 && <Separator />}
                <button
                  className={`w-full px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                    !n.read ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => void handleNotificationClick(n)}
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm leading-snug ${!n.read ? 'font-medium' : 'font-normal'}`}
                      >
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {n.body}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground/70">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 pt-0.5">
                      {!n.read && (
                        <span
                          className="h-2 w-2 rounded-full bg-primary"
                          aria-hidden="true"
                        />
                      )}
                      {n.data &&
                        (JSON.parse(n.data) as Record<string, string>)
                          ?.path && (
                          <ExternalLink
                            className="h-3 w-3 text-muted-foreground/50"
                            aria-hidden="true"
                          />
                        )}
                    </div>
                  </div>
                </button>
              </div>
            ))}
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
