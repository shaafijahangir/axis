'use client';

import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';
import type { MessageRole } from '@/lib/graphql/__generated__/graphql';
import { AiToolIndicator } from './ai-tool-indicator';

interface AiMessageBubbleProps {
  role: MessageRole;
  content: string;
  /** JSON-encoded array — the API exposes the jsonb column as `String`. */
  toolCalls?: string | null;
  toolResults?: string | null;
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
}: AiMessageBubbleProps) {
  // Don't render tool_call or tool_result messages directly - they're shown via indicators
  if (role === 'TOOL_CALL' || role === 'TOOL_RESULT' || role === 'SYSTEM') {
    return null;
  }

  const isUser = role === 'USER';
  const parsedToolCalls = parseToolCalls(toolCalls);
  const hasTools = parsedToolCalls.length > 0;

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
        {!isUser && hasTools && <AiToolIndicator toolCalls={parsedToolCalls} />}

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

/**
 * The API returns `toolCalls` as a JSON string. Parse defensively: a malformed
 * or non-array payload just hides the tool indicator instead of crashing the
 * whole thread.
 */
function parseToolCalls(
  raw: string | null | undefined,
): Record<string, unknown>[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(
          (c): c is Record<string, unknown> =>
            typeof c === 'object' && c !== null,
        )
      : [];
  } catch {
    return [];
  }
}
