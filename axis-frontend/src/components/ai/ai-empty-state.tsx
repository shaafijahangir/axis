'use client';

import { useQuery } from '@apollo/client/react';
import { Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AVAILABLE_AGENTS_QUERY } from '@/lib/graphql/queries/ai';
import { AiAgentSelector } from './ai-agent-selector';

interface Agent {
  type: string;
  displayName: string;
  description: string;
  allowedRoles: string[];
}

interface AiEmptyStateProps {
  onSelectAgent: (agentType: string) => void;
  disabled?: boolean;
}

/**
 * Welcome screen shown when no conversation is selected.
 * Displays available agents and prompts the user to start a chat.
 */
export function AiEmptyState({ onSelectAgent, disabled }: AiEmptyStateProps) {
  const { data, loading } = useQuery<{ availableAgents: Agent[] }>(
    AVAILABLE_AGENTS_QUERY,
  );

  const agents = data?.availableAgents ?? [];

  return (
    <div className="flex h-full flex-col items-center justify-center p-6 border-l">
      <div className="max-w-md text-center">
        {/* Hero */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">AI Assistants</h2>
        <p className="mt-2 text-muted-foreground">
          Get personalized help from our AI assistants. Choose one to start a
          conversation.
        </p>

        {/* Agent selector */}
        <div className="mt-8">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="rounded-lg border p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <AiAgentSelector
              agents={agents}
              onSelect={onSelectAgent}
              disabled={disabled}
            />
          )}
        </div>
      </div>
    </div>
  );
}
