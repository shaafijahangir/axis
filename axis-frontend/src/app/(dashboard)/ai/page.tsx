'use client';

import { useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AiConversationList } from '@/components/ai/ai-conversation-list';
import { AiChatThread } from '@/components/ai/ai-chat-thread';
import { AiNewConversation } from '@/components/ai/ai-new-conversation';
import { AiEmptyState } from '@/components/ai/ai-empty-state';

type ViewMode = 'empty' | 'new' | 'conversation';

/**
 * AI Chat page with two-panel layout.
 *
 * WHY: Matches the messaging page pattern for consistency.
 * URL param `?conversation=<id>` enables deep linking.
 * Mobile view toggles between list and thread.
 *
 * PATTERN: The view mode determines what's shown in the right panel:
 * - 'empty': Welcome screen with agent selector
 * - 'new': New conversation flow (agent select → initial message)
 * - 'conversation': Active chat thread
 */
export default function AiPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationIdFromUrl = searchParams.get('conversation');
  // agentType is encoded in the URL so it survives router.push remounts
  const agentTypeFromUrl = searchParams.get('agent');

  // Used only for the 'new' conversation flow (no URL yet)
  const [pendingAgentType, setPendingAgentType] = useState<string | null>(null);

  // Mobile: track whether we're showing the right panel
  const [mobileShowRight, setMobileShowRight] = useState(
    !!conversationIdFromUrl,
  );

  // View mode for right panel
  const [viewMode, setViewMode] = useState<ViewMode>(
    conversationIdFromUrl ? 'conversation' : 'empty',
  );

  // Handle selecting an existing conversation
  const handleSelectConversation = useCallback(
    (id: string, agentType: string) => {
      router.push(`/ai?conversation=${id}&agent=${agentType}`);
      setViewMode('conversation');
      setMobileShowRight(true);
    },
    [router],
  );

  // Handle starting a new conversation flow — no URL push to avoid remount
  const handleNewConversation = useCallback(() => {
    setPendingAgentType(null);
    setViewMode('new');
    setMobileShowRight(true);
  }, []);

  // Handle when a new conversation is successfully created
  const handleConversationStarted = useCallback(
    (conversationId: string, agentType: string) => {
      router.push(`/ai?conversation=${conversationId}&agent=${agentType}`);
      setViewMode('conversation');
    },
    [router],
  );

  // Handle selecting an agent from the empty state
  const handleSelectAgentFromEmpty = useCallback((agentType: string) => {
    setPendingAgentType(agentType);
    setViewMode('new');
    setMobileShowRight(true);
  }, []);

  // Handle back navigation on mobile
  const handleBack = useCallback(() => {
    setMobileShowRight(false);
    setViewMode(conversationIdFromUrl ? 'conversation' : 'empty');
  }, [conversationIdFromUrl]);

  // Determine what to render in the right panel
  const renderRightPanel = () => {
    switch (viewMode) {
      case 'new':
        return (
          <AiNewConversation
            onConversationStarted={handleConversationStarted}
            onBack={handleBack}
            preselectedAgent={pendingAgentType ?? undefined}
          />
        );
      case 'conversation':
        if (conversationIdFromUrl && agentTypeFromUrl) {
          return (
            <AiChatThread
              conversationId={conversationIdFromUrl}
              agentType={agentTypeFromUrl}
              onBack={handleBack}
            />
          );
        }
        return <AiEmptyState onSelectAgent={handleSelectAgentFromEmpty} />;
      case 'empty':
      default:
        return <AiEmptyState onSelectAgent={handleSelectAgentFromEmpty} />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] md:h-[calc(100vh-7rem)] overflow-hidden rounded-lg border">
      {/* Left panel — conversation list */}
      <div
        className={cn(
          'w-full shrink-0 md:w-80 md:block',
          mobileShowRight ? 'hidden' : 'block',
        )}
      >
        <AiConversationList
          activeConversationId={conversationIdFromUrl}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
        />
      </div>

      {/* Right panel — thread, new conversation, or empty state */}
      <div
        className={cn(
          'min-w-0 flex-1 md:block',
          mobileShowRight ? 'block' : 'hidden',
        )}
      >
        {renderRightPanel()}
      </div>
    </div>
  );
}
