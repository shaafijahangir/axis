'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@apollo/client/react';
import { Plus, Search, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MY_CONVERSATIONS_QUERY } from '@/lib/graphql/queries/messaging';
import { NewMessageDialog } from './new-message-dialog';
import {
  useSocketConnection,
  useConversationUpdates,
} from '@/hooks/use-socket';

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
}

interface LastMessage {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: { id: string; firstName: string; lastName: string };
}

interface ConversationItem {
  id: string;
  title: string | null;
  lastMessage: LastMessage | null;
  unreadCount: number;
  otherParticipants: Participant[];
  createdAt: string;
  updatedAt: string;
}

interface ConversationListProps {
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function getDisplayName(participants: Participant[]): string {
  if (participants.length === 0) return 'Unknown';
  return participants.map((p) => `${p.firstName} ${p.lastName}`).join(', ');
}

function getInitials(participants: Participant[]): string {
  if (participants.length === 0) return '?';
  const first = participants[0];
  return `${first.firstName[0]}${first.lastName[0]}`;
}

export function ConversationList({
  activeConversationId,
  onSelectConversation,
}: ConversationListProps) {
  const [search, setSearch] = useState('');
  const [newMessageOpen, setNewMessageOpen] = useState(false);

  // Socket connection status
  const { isConnected } = useSocketConnection();

  // Fetch conversations - use polling only when socket is disconnected
  const { data, loading, refetch } = useQuery<{
    myConversations: ConversationItem[];
  }>(MY_CONVERSATIONS_QUERY, {
    // Only poll if socket is not connected (fallback)
    pollInterval: isConnected ? 0 : 10_000,
    fetchPolicy: 'network-only',
  });

  const conversations = data?.myConversations ?? [];

  // Refetch callback for socket events
  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  // Subscribe to real-time conversation updates
  useConversationUpdates({
    onConversationCreated: handleRefetch,
    onConversationUpdated: handleRefetch,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((conv) => {
      const name = getDisplayName(conv.otherParticipants).toLowerCase();
      const preview = conv.lastMessage?.content.toLowerCase() ?? '';
      return name.includes(q) || preview.includes(q);
    });
  }, [conversations, search]);

  function handleConversationCreated() {
    refetch();
  }

  return (
    <div className="flex h-full flex-col border-r">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Messages</h2>
          {/* Real-time connection indicator */}
          {isConnected ? (
            <Wifi
              className="h-3.5 w-3.5 text-green-500"
              aria-label="Real-time connected"
            />
          ) : (
            <WifiOff
              className="h-3.5 w-3.5 text-muted-foreground"
              aria-label="Polling mode"
            />
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setNewMessageOpen(true)}
        >
          <Plus className="mr-1 h-4 w-4" />
          New
        </Button>
      </div>

      {/* Search */}
      <div className="border-b p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        {loading && conversations.length === 0 ? (
          <div className="flex flex-col gap-1 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-md p-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            {search ? 'No matching conversations.' : 'No conversations yet.'}
          </p>
        ) : (
          <div className="flex flex-col gap-0.5 p-2">
            {filtered.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const displayName = getDisplayName(conv.otherParticipants);
              const initials = getInitials(conv.otherParticipants);
              const preview = conv.lastMessage?.content ?? 'No messages yet';
              const time = conv.lastMessage?.createdAt ?? conv.createdAt;

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-md p-3 text-left transition-colors',
                    isActive ? 'bg-primary/10' : 'hover:bg-accent',
                  )}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          'truncate text-sm',
                          conv.unreadCount > 0
                            ? 'font-semibold'
                            : 'font-medium',
                        )}
                      >
                        {conv.title ?? displayName}
                      </p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatRelativeTime(time)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-muted-foreground">
                        {preview}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                          {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <NewMessageDialog
        open={newMessageOpen}
        onOpenChange={setNewMessageOpen}
        onConversationCreated={handleConversationCreated}
      />
    </div>
  );
}
