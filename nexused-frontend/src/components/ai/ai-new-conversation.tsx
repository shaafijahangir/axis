'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Send, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { AVAILABLE_AGENTS_QUERY } from '@/lib/graphql/queries/ai';
import { START_AI_CONVERSATION_MUTATION } from '@/lib/graphql/mutations/ai';
import { AiAgentSelector } from './ai-agent-selector';
import { cn } from '@/lib/utils';

interface Agent {
  type: string;
  displayName: string;
  description: string;
  allowedRoles: string[];
}

interface AgentResponse {
  conversationId: string;
  responseText: string;
  toolsUsed: string[];
  totalInputTokens: number;
  totalOutputTokens: number;
  turns: number;
}

interface AiNewConversationProps {
  onConversationStarted: (conversationId: string, agentType: string) => void;
  onBack?: () => void;
  preselectedAgent?: string;
}

const messageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(10000),
});

type MessageFormData = z.infer<typeof messageSchema>;

/**
 * Returns a label for an agent type.
 */
function getAgentLabel(type: string): string {
  switch (type) {
    case 'study-coach':
      return 'Study Coach';
    case 'feedback-copilot':
      return 'Feedback Copilot';
    default:
      return 'AI Assistant';
  }
}

/**
 * Component for starting a new AI conversation.
 * Two-step flow: select agent -> type initial message.
 */
export function AiNewConversation({
  onConversationStarted,
  onBack,
  preselectedAgent,
}: AiNewConversationProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(
    preselectedAgent ?? null,
  );
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Focus textarea when agent is selected (replaces autoFocus)
  useEffect(() => {
    if (selectedAgent && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [selectedAgent]);

  const { data, loading: agentsLoading } = useQuery<{
    availableAgents: Agent[];
  }>(AVAILABLE_AGENTS_QUERY);

  const [startConversation, { loading: starting }] = useMutation<{
    startConversation: AgentResponse;
  }>(START_AI_CONVERSATION_MUTATION);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
  });

  const agents = data?.availableAgents ?? [];

  const onSubmit = async (formData: MessageFormData) => {
    if (!selectedAgent) return;

    try {
      const { data: result } = await startConversation({
        variables: {
          input: {
            agentType: selectedAgent,
            message: formData.message,
          },
        },
      });

      if (result?.startConversation.conversationId) {
        onConversationStarted(
          result.startConversation.conversationId,
          selectedAgent,
        );
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  };

  // Handle Enter key (without shift) to submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && selectedAgent) {
      e.preventDefault();
      handleSubmit(onSubmit)();
    }
  };

  return (
    <div className="flex h-full flex-col border-l">
      {/* Header */}
      <div className="flex h-14 items-center gap-3 border-b px-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <h2 className="font-semibold">
          {selectedAgent ? getAgentLabel(selectedAgent) : 'New Conversation'}
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {!selectedAgent ? (
          // Step 1: Select agent
          <div className="mx-auto max-w-lg">
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Choose an AI Assistant</h3>
              <p className="mt-1 text-muted-foreground text-sm">
                Select the assistant that best fits your needs.
              </p>
            </div>

            {agentsLoading ? (
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
                onSelect={setSelectedAgent}
                disabled={starting}
              />
            )}
          </div>
        ) : (
          // Step 2: Type initial message
          <div className="flex h-full flex-col items-center justify-center">
            <div className="mx-auto max-w-lg text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">
                Start a conversation with {getAgentLabel(selectedAgent)}
              </h3>
              <p className="mt-1 text-muted-foreground text-sm">
                {selectedAgent === 'study-coach'
                  ? "Ask about your courses, assignments, or study strategies. I'll guide you without giving direct answers."
                  : "Ask about grading, feedback, or student performance. I'll help you provide better feedback."}
              </p>

              {/* Change agent */}
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setSelectedAgent(null)}
              >
                Change assistant
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Input area - only shown when agent is selected */}
      {selectedAgent && (
        <form onSubmit={handleSubmit(onSubmit)} className="border-t p-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Textarea
                {...(() => {
                  const { ref, ...rest } = register('message');
                  return {
                    ...rest,
                    ref: (el: HTMLTextAreaElement | null) => {
                      ref(el);
                      textareaRef.current = el;
                    },
                  };
                })()}
                placeholder="Type your first message..."
                className={cn(
                  'min-h-[44px] max-h-32 resize-none',
                  errors.message && 'border-destructive',
                )}
                disabled={starting}
                onKeyDown={handleKeyDown}
                rows={1}
              />
            </div>
            <Button
              type="submit"
              size="icon"
              disabled={starting}
              className="h-[44px] w-[44px]"
            >
              {starting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
