'use client';

import { GraduationCap, MessageSquareText, Sparkles } from 'lucide-react';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Agent {
  type: string;
  displayName: string;
  description: string;
  allowedRoles: string[];
}

interface AiAgentSelectorProps {
  agents: Agent[];
  onSelect: (agentType: string) => void;
  disabled?: boolean;
}

/**
 * Returns an icon for an agent type.
 * Defaults to Sparkles for unknown agents.
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
 * Returns a gradient class for an agent type.
 */
function getAgentGradient(type: string) {
  switch (type) {
    case 'study-coach':
      return 'from-blue-500/10 to-purple-500/10';
    case 'feedback-copilot':
      return 'from-green-500/10 to-teal-500/10';
    default:
      return 'from-primary/10 to-primary/5';
  }
}

/**
 * Card-based agent selector for starting a new AI conversation.
 * Shows available agents based on user's roles.
 */
export function AiAgentSelector({
  agents,
  onSelect,
  disabled,
}: AiAgentSelectorProps) {
  if (agents.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No AI agents available for your role.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {agents.map((agent) => {
        const Icon = getAgentIcon(agent.type);
        const gradient = getAgentGradient(agent.type);

        return (
          <Card
            key={agent.type}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
              'bg-gradient-to-br',
              gradient,
              disabled && 'opacity-50 cursor-not-allowed',
            )}
            onClick={() => !disabled && onSelect(agent.type)}
          >
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background shadow-sm">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base">
                    {agent.displayName}
                  </CardTitle>
                  <CardDescription className="mt-1 line-clamp-2">
                    {agent.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}
