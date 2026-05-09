'use client';

import { Bot } from 'lucide-react';

/**
 * Animated thinking indicator shown while waiting for AI response.
 * Three dots with staggered bounce animation.
 */
export function AiThinkingIndicator() {
  return (
    <div className="flex gap-3 mr-auto max-w-[85%]">
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Bot className="h-4 w-4" />
      </div>

      {/* Thinking dots */}
      <div className="flex items-center gap-1 rounded-2xl bg-muted px-4 py-3">
        <span
          className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
    </div>
  );
}
