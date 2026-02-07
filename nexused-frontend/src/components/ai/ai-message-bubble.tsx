'use client';

import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';
import { AiToolIndicator } from './ai-tool-indicator';

export type MessageRole =
  | 'user'
  | 'assistant'
  | 'system'
  | 'tool_call'
  | 'tool_result';

interface AiMessageBubbleProps {
  role: MessageRole;
  content: string;
  toolCalls?: Record<string, unknown>[] | null;
  toolResults?: Record<string, unknown>[] | null;
  createdAt?: Date;
  isLatest?: boolean;
}

/**
 * Individual message bubble in the AI chat.
 * User messages are right-aligned, assistant messages are left-aligned.
 * Tool call/result messages are hidden (shown via AiToolIndicator on assistant messages).
 */
export function AiMessageBubble({
  role,
  content,
  toolCalls,
  createdAt,
  isLatest,
}: AiMessageBubbleProps) {
  // Don't render tool_call or tool_result messages directly - they're shown via indicators
  if (role === 'tool_call' || role === 'tool_result' || role === 'system') {
    return null;
  }

  const isUser = role === 'user';
  const hasTools = toolCalls && toolCalls.length > 0;

  return (
    <div
      className={cn(
        'flex gap-3 max-w-[85%]',
        isUser ? 'ml-auto flex-row-reverse' : 'mr-auto',
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message content */}
      <div className="flex flex-col gap-1">
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground',
          )}
        >
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {content}
          </p>
        </div>

        {/* Tool indicator for assistant messages */}
        {!isUser && hasTools && <AiToolIndicator toolCalls={toolCalls} />}

        {/* Timestamp */}
        {createdAt && (
          <span
            className={cn(
              'text-xs text-muted-foreground',
              isUser ? 'text-right' : 'text-left',
            )}
          >
            {new Date(createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>
    </div>
  );
}
