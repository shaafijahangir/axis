'use client';

import { useState, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { cn } from '@/lib/utils';
import { ConversationList } from '@/components/messaging/conversation-list';
import { MessageThread } from '@/components/messaging/message-thread';
import { EmptyState } from '@/components/messaging/empty-state';
import { MY_CONVERSATIONS_QUERY } from '@/lib/graphql/queries/messaging';

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
}

interface ConversationItem {
  id: string;
  title: string | null;
  otherParticipants: Participant[];
}

/**
 * WHY: Two-panel messaging layout with URL-driven conversation selection.
 * PATTERN: Desktop shows both panels side by side; mobile toggles between
 * list view and thread view using local state (no route change needed).
 * The `?conversation=<id>` query param enables deep linking.
 */
export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationIdFromUrl = searchParams.get('conversation');

  // Mobile: track whether we're showing the thread (true) or the list (false)
  const [mobileShowThread, setMobileShowThread] = useState(
    !!conversationIdFromUrl,
  );

  const { data } = useQuery<{ myConversations: ConversationItem[] }>(
    MY_CONVERSATIONS_QUERY,
    { pollInterval: 10_000, fetchPolicy: 'network-only' },
  );

  const conversations = data?.myConversations ?? [];

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === conversationIdFromUrl) ?? null,
    [conversations, conversationIdFromUrl],
  );

  const handleSelectConversation = useCallback(
    (id: string) => {
      router.push(`/messages?conversation=${id}`);
      setMobileShowThread(true);
    },
    [router],
  );

  const handleBack = useCallback(() => {
    setMobileShowThread(false);
  }, []);

  return (
    <div className="flex h-[calc(100vh-10rem)] md:h-[calc(100vh-7rem)] overflow-hidden rounded-lg border">
      {/* Left panel — conversation list */}
      <div
        className={cn(
          'w-full shrink-0 md:w-80 md:block',
          mobileShowThread ? 'hidden' : 'block',
        )}
      >
        <ConversationList
          activeConversationId={conversationIdFromUrl}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* Right panel — thread or empty state */}
      <div
        className={cn(
          'min-w-0 flex-1 md:block',
          mobileShowThread ? 'block' : 'hidden',
        )}
      >
        {activeConversation ? (
          <MessageThread
            conversationId={activeConversation.id}
            participants={activeConversation.otherParticipants}
            onBack={handleBack}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
