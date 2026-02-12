'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { ArrowLeft, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth.store';
import {
  CONVERSATION_MESSAGES_QUERY,
  MY_CONVERSATIONS_QUERY,
} from '@/lib/graphql/queries/messaging';
import {
  SEND_MESSAGE_TO_CONVERSATION_MUTATION,
  MARK_AS_READ_MUTATION,
} from '@/lib/graphql/mutations/messaging';
import {
  useSocketConnection,
  useConversationSocket,
  useTypingIndicator,
  useMarkAsRead,
} from '@/hooks/use-socket';
import { NewMessageEvent, UserTypingEvent } from '@/lib/socket';

interface MessageSender {
  id: string;
  firstName: string;
  lastName: string;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: MessageSender;
}

interface MessagesData {
  conversationMessages: {
    messages: Message[];
    totalCount: number;
    hasMore: boolean;
  };
}

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
}

interface MessageThreadProps {
  conversationId: string;
  participants: Participant[];
  onBack: () => void;
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function shouldShowDateSeparator(
  current: Message,
  previous: Message | undefined,
): boolean {
  if (!previous) return true;
  const currentDate = new Date(current.createdAt).toDateString();
  const previousDate = new Date(previous.createdAt).toDateString();
  return currentDate !== previousDate;
}

export function MessageThread({
  conversationId,
  participants,
  onBack,
}: MessageThreadProps) {
  const { user } = useAuthStore();
  const [messageText, setMessageText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  // Socket connection
  const { isConnected } = useSocketConnection();
  const { setTyping } = useTypingIndicator(conversationId);
  const { markAsRead: markAsReadSocket } = useMarkAsRead();

  const { data, loading, fetchMore, refetch } = useQuery<MessagesData>(
    CONVERSATION_MESSAGES_QUERY,
    {
      variables: { conversationId, limit: 50 },
      // Only poll if socket is not connected (fallback)
      pollInterval: isConnected ? 0 : 5_000,
      fetchPolicy: 'network-only',
    },
  );

  // Handle real-time new messages
  const handleNewMessage = useCallback(
    (event: NewMessageEvent) => {
      // Refetch messages when new one arrives
      refetch();
      // Auto-scroll to bottom
      setShouldAutoScroll(true);
      // Mark as read (via socket for speed)
      if (isConnected) {
        markAsReadSocket(conversationId);
      }
    },
    [refetch, isConnected, markAsReadSocket, conversationId],
  );

  // Handle typing indicators
  const handleTyping = useCallback((event: UserTypingEvent) => {
    setTypingUsers((prev) => {
      const next = new Set(prev);
      if (event.isTyping) {
        next.add(event.userId);
      } else {
        next.delete(event.userId);
      }
      return next;
    });
  }, []);

  // Subscribe to conversation socket events
  useConversationSocket({
    conversationId,
    onNewMessage: handleNewMessage,
    onTyping: handleTyping,
  });

  const [sendMessage, { loading: sending }] = useMutation(
    SEND_MESSAGE_TO_CONVERSATION_MUTATION,
    {
      refetchQueries: [
        {
          query: CONVERSATION_MESSAGES_QUERY,
          variables: { conversationId, limit: 50 },
        },
        { query: MY_CONVERSATIONS_QUERY },
      ],
    },
  );

  const [markAsReadMutation] = useMutation(MARK_AS_READ_MUTATION);

  // Mark conversation as read when opened (GraphQL fallback)
  useEffect(() => {
    if (isConnected) {
      markAsReadSocket(conversationId);
    } else {
      markAsReadMutation({ variables: { conversationId } });
    }
  }, [conversationId, markAsReadMutation, isConnected, markAsReadSocket]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (shouldAutoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [data?.conversationMessages.messages.length, shouldAutoScroll]);

  const messages = data?.conversationMessages.messages ?? [];
  const hasMore = data?.conversationMessages.hasMore ?? false;

  const displayName =
    participants.length > 0
      ? participants.map((p) => `${p.firstName} ${p.lastName}`).join(', ')
      : 'Conversation';

  const initials =
    participants.length > 0
      ? `${participants[0].firstName[0]}${participants[0].lastName[0]}`
      : '?';

  function handleSend() {
    if (!messageText.trim() || sending) return;
    const content = messageText.trim();
    setMessageText('');
    setShouldAutoScroll(true);
    sendMessage({
      variables: {
        input: { conversationId, content },
      },
    });
  }

  function handleLoadOlder() {
    if (!messages.length || !hasMore) return;
    const oldestMessage = messages[0];
    fetchMore({
      variables: {
        conversationId,
        cursor: oldestMessage.createdAt,
        limit: 50,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          conversationMessages: {
            ...fetchMoreResult.conversationMessages,
            messages: [
              ...fetchMoreResult.conversationMessages.messages,
              ...prev.conversationMessages.messages,
            ],
          },
        };
      },
    });
  }

  return (
    <div
      className="flex h-full flex-col"
      role="region"
      aria-label={`Conversation with ${displayName}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b p-4">
        <button
          onClick={onBack}
          aria-label="Back to conversation list"
          className="rounded-md p-1 transition-colors hover:bg-accent md:hidden"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <Avatar className="h-9 w-9">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{displayName}</p>
        </div>
      </div>

      {/* Messages — aria-live for new message announcements */}
      <ScrollArea className="flex-1 p-4" aria-label="Message history">
        {loading && messages.length === 0 ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'flex gap-2',
                  i % 2 === 0 ? 'justify-start' : 'justify-end',
                )}
              >
                <Skeleton className="h-16 w-48 rounded-lg" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {hasMore && (
              <div className="mb-4 text-center">
                <Button variant="ghost" size="sm" onClick={handleLoadOlder}>
                  Load older messages
                </Button>
              </div>
            )}

            {messages.map((message, index) => {
              const isOwn = message.senderId === user?.id;
              const prevMessage = index > 0 ? messages[index - 1] : undefined;
              const showDate = shouldShowDateSeparator(message, prevMessage);
              const showSender =
                !isOwn &&
                (!prevMessage || prevMessage.senderId !== message.senderId);

              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="my-4 flex items-center gap-4">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs text-muted-foreground">
                        {formatDateSeparator(message.createdAt)}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}

                  <div
                    className={cn(
                      'flex gap-2',
                      isOwn ? 'justify-end' : 'justify-start',
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[75%] rounded-lg px-3 py-2',
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted',
                      )}
                    >
                      {showSender && (
                        <p className="mb-1 text-xs font-medium opacity-70">
                          {message.sender.firstName} {message.sender.lastName}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap text-sm">
                        {message.content}
                      </p>
                      <p
                        className={cn(
                          'mt-1 text-[10px]',
                          isOwn
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground',
                        )}
                      >
                        {formatMessageTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* New message announcements for screen readers */}
      <div aria-live="polite" aria-atomic="false" className="sr-only">
        {messages.length > 0 && (
          <span>
            {messages[messages.length - 1].sender.firstName} said:{' '}
            {messages[messages.length - 1].content}
          </span>
        )}
      </div>

      {/* Input area */}
      <div className="border-t p-4">
        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <div
            className="mb-2 text-xs text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {getTypingText(typingUsers, participants)}
          </div>
        )}
        <div className="flex items-end gap-2">
          <label htmlFor="message-input" className="sr-only">
            Message to {displayName}
          </label>
          <textarea
            id="message-input"
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              // Send typing indicator via socket
              setTyping();
            }}
            placeholder="Type a message..."
            rows={1}
            className="max-h-32 min-h-[40px] flex-1 resize-none rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
            }}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!messageText.trim() || sending}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Generate typing indicator text from typing user IDs.
 */
function getTypingText(
  typingUserIds: Set<string>,
  participants: Participant[],
): string {
  const typingParticipants = participants.filter((p) =>
    typingUserIds.has(p.id),
  );

  if (typingParticipants.length === 0) return '';
  if (typingParticipants.length === 1) {
    return `${typingParticipants[0].firstName} is typing...`;
  }
  if (typingParticipants.length === 2) {
    return `${typingParticipants[0].firstName} and ${typingParticipants[1].firstName} are typing...`;
  }
  return 'Several people are typing...';
}
