'use client';

import { useQuery } from '@apollo/client/react';
import { GraduationCap, MessageSquareText, Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { MY_AI_CONVERSATIONS_QUERY } from '@/lib/graphql/queries/ai';
import { formatRelativeTime } from '@/lib/utils/relative-time';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  agentType: string;
  courseId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface AiConversationListProps {
  activeConversationId: string | null;
  onSelectConversation: (id: string, agentType: string) => void;
  onNewConversation: () => void;
}

/**
 * Returns an icon for an agent type.
 */
function getAgentIcon(type: string) {
  switch (type) {
    case 'study-coach':
      return GraduationCap;
    case 'feedback-copilot':
      return MessageSquareText;
    default:
      return Sparkles;
  }
}

/**
 * Returns a display label for an agent type.
 */
function getAgentLabel(type: string): string {
  switch (type) {
    case 'study-coach':
      return 'Study Coach';
    case 'feedback-copilot':
      return 'Feedback Copilot';
    default:
      return 'AI Chat';
  }
}

/**
 * Returns a color class for an agent type badge.
 */
function getAgentBadgeVariant(
  type: string,
): 'default' | 'secondary' | 'outline' {
  switch (type) {
    case 'study-coach':
      return 'default';
    case 'feedback-copilot':
      return 'secondary';
    default:
      return 'outline';
  }
}

/**
 * Sidebar showing past AI conversations.
 * Each item shows the agent type, time, and status.
 */
export function AiConversationList({
  activeConversationId,
  onSelectConversation,
  onNewConversation,
}: AiConversationListProps) {
  const { data, loading } = useQuery<{ myConversations: Conversation[] }>(
    MY_AI_CONVERSATIONS_QUERY,
    { pollInterval: 10_000, fetchPolicy: 'network-only' },
  );

  const conversations = data?.myConversations ?? [];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        <h2 className="font-semibold">AI Chats</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewConversation}
          aria-label="Start new AI conversation"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="space-y-1 p-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-3 rounded-lg p-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <Sparkles
              className="mx-auto h-8 w-8 opacity-50"
              aria-hidden="true"
            />
            <p className="mt-2 text-sm">No conversations yet</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={onNewConversation}
            >
              Start a chat
            </Button>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {conversations.map((conv: Conversation) => {
              const Icon = getAgentIcon(conv.agentType);
              const isActive = conv.id === activeConversationId;

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id, conv.agentType)}
                  aria-current={isActive ? 'true' : undefined}
                  aria-label={`${getAgentLabel(conv.agentType)} conversation from ${formatRelativeTime(new Date(conv.updatedAt))}`}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-muted',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted',
                    )}
                    aria-hidden="true"
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={getAgentBadgeVariant(conv.agentType)}>
                        {getAgentLabel(conv.agentType)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatRelativeTime(new Date(conv.updatedAt))}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
