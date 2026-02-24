'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { AI_CONVERSATION_MESSAGES_QUERY } from '@/lib/graphql/queries/ai';
import { SEND_AI_MESSAGE_MUTATION } from '@/lib/graphql/mutations/ai';
import { AiMessageBubble, MessageRole } from './ai-message-bubble';
import { AiThinkingIndicator } from './ai-thinking-indicator';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  toolCalls: Record<string, unknown>[] | null;
  toolResults: Record<string, unknown>[] | null;
  tokenCount: number;
  createdAt: string;
}

interface AgentResponse {
  conversationId: string;
  responseText: string;
  toolsUsed: string[];
  totalInputTokens: number;
  totalOutputTokens: number;
  turns: number;
}

interface AiChatThreadProps {
  conversationId: string;
  agentType: string;
  onBack?: () => void;
}

const messageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(10000),
});

type MessageFormData = z.infer<typeof messageSchema>;

/**
 * Formats a date for display as a separator.
 */
function formatDateSeparator(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Main chat thread component for AI conversations.
 * Handles message display, sending, and auto-scrolling.
 */
export function AiChatThread({
  conversationId,
  agentType,
  onBack,
}: AiChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const { data, loading, refetch } = useQuery<{
    conversationMessages: Message[];
  }>(AI_CONVERSATION_MESSAGES_QUERY, {
    variables: { conversationId },
    pollInterval: 5000,
    fetchPolicy: 'network-only',
  });

  const [sendMessage, { loading: sending }] = useMutation<{
    sendMessage: AgentResponse;
  }>(SEND_AI_MESSAGE_MUTATION);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
  });

  const messages = data?.conversationMessages ?? [];

  // Group messages by date for separators
  const groupedMessages = messages.reduce<Record<string, Message[]>>(
    (acc: Record<string, Message[]>, msg: Message) => {
      const date = new Date(msg.createdAt).toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(msg);
      return acc;
    },
    {},
  );

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current && isAtBottom) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isAtBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Track scroll position
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAtBottom(atBottom);
  }, []);

  const onSubmit = async (formData: MessageFormData) => {
    try {
      await sendMessage({
        variables: {
          input: {
            conversationId,
            message: formData.message,
          },
        },
      });
      reset();
      await refetch();
      setIsAtBottom(true);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Handle Enter key (without shift) to submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(onSubmit)();
    }
  };

  // Get agent display name
  const agentLabel =
    agentType === 'study-coach'
      ? 'Study Coach'
      : agentType === 'feedback-copilot'
        ? 'Feedback Copilot'
        : 'AI Assistant';

  return (
    <div
      className="flex h-full flex-col border-l"
      role="region"
      aria-label={`${agentLabel} conversation`}
    >
      {/* Header */}
      <div className="flex h-14 items-center gap-3 border-b px-4">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="md:hidden h-11 w-11"
            aria-label="Back to conversation list"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
        <div>
          <h2 className="font-semibold">{agentLabel}</h2>
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea
        className="flex-1 p-4"
        ref={scrollRef}
        onScroll={handleScroll}
        aria-label="Chat messages"
      >
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p>Start your conversation above.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMessages).map(([dateStr, dayMessages]) => (
              <div key={dateStr}>
                {/* Date separator */}
                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-background px-2 text-xs text-muted-foreground">
                      {formatDateSeparator(new Date(dateStr))}
                    </span>
                  </div>
                </div>

                {/* Messages for this day */}
                <div className="space-y-4">
                  {dayMessages.map((msg, idx) => (
                    <AiMessageBubble
                      key={msg.id}
                      role={msg.role}
                      content={msg.content}
                      toolCalls={msg.toolCalls}
                      toolResults={msg.toolResults}
                      createdAt={new Date(msg.createdAt)}
                      isLatest={idx === dayMessages.length - 1}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Thinking indicator */}
            {sending && (
              <div role="status" aria-live="polite">
                <AiThinkingIndicator />
                <span className="sr-only">{agentLabel} is thinking...</span>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Screen-reader announcement for new AI responses */}
      <div aria-live="polite" aria-atomic="false" className="sr-only">
        {messages.length > 0 &&
          messages[messages.length - 1].role === 'assistant' && (
            <span>
              {agentLabel} responded:{' '}
              {messages[messages.length - 1].content.slice(0, 200)}
            </span>
          )}
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="border-t p-4"
        aria-label={`Send message to ${agentLabel}`}
      >
        <div className="flex gap-2">
          <div className="flex-1">
            <label htmlFor="ai-message-input" className="sr-only">
              Message to {agentLabel}
            </label>
            <Textarea
              {...register('message')}
              id="ai-message-input"
              placeholder="Type your message..."
              className={cn(
                'min-h-[44px] max-h-32 resize-none',
                errors.message && 'border-destructive',
              )}
              disabled={sending}
              onKeyDown={handleKeyDown}
              rows={1}
              aria-invalid={errors.message ? 'true' : undefined}
              aria-describedby={errors.message ? 'ai-message-error' : undefined}
            />
            {errors.message && (
              <p id="ai-message-error" className="sr-only" role="alert">
                {errors.message.message}
              </p>
            )}
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={sending}
            className="h-[44px] w-[44px]"
            aria-label={sending ? 'Sending message...' : 'Send message'}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
