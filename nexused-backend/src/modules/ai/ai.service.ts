import { Injectable, Logger, Inject } from '@nestjs/common';
import type { AiProvider } from './providers/ai-provider.interface';
import {
  AI_PROVIDER,
  AiContentBlock,
  AiTextBlock,
  AiToolUseBlock,
} from './providers/ai-provider.interface';
import { ClaudeToolSchema } from './tools/tool.interface';

/**
 * Core AI wrapper service.
 *
 * @deprecated This service exists for backward compatibility. New code should
 * inject AI_PROVIDER directly and use the AiProvider interface.
 *
 * WHY a dedicated service: Centralizes API key management, model selection,
 * and token counting. Every AI interaction in the system goes through here,
 * making it easy to add logging, caching, or fallback models later.
 *
 * PATTERN: Facade — simplifies the provider into the specific operations
 * NexusEd needs (message with tools, streaming).
 */

export interface SendMessageOptions {
  systemPrompt: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string | AiContentBlock[];
  }>;
  tools?: ClaudeToolSchema[];
  model?: string;
  maxTokens?: number;
}

export interface AiResponse {
  content: AiContentBlock[];
  stopReason: string | null;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(@Inject(AI_PROVIDER) private aiProvider: AiProvider) {
    this.logger.log(
      `AI Service initialized (delegating to ${this.aiProvider.providerId} provider)`,
    );
  }

  /**
   * Send a message to the AI provider and get a response.
   * Supports tool_use — the AI can request tool calls in its response.
   * @deprecated Use AiProvider.sendMessage() directly instead.
   */
  async sendMessage(options: SendMessageOptions): Promise<AiResponse> {
    const { systemPrompt, messages, tools, model, maxTokens } = options;

    // Convert ClaudeToolSchema to AiToolDefinition
    const providerTools = tools?.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: {
        type: 'object' as const,
        properties: (t.input_schema.properties ?? {}) as Record<
          string,
          unknown
        >,
        required: t.input_schema.required as string[] | undefined,
      },
    }));

    const response = await this.aiProvider.sendMessage({
      systemPrompt,
      messages,
      tools: providerTools,
      model,
      maxTokens,
    });

    return {
      content: response.content,
      stopReason: response.stopReason,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      model: response.model,
    };
  }

  /**
   * Extract text content from a response.
   * Filters out tool_use blocks and joins text blocks.
   */
  extractText(content: AiContentBlock[]): string {
    return content
      .filter((block): block is AiTextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
  }

  /**
   * Extract tool use requests from a response.
   * Returns an array of tool calls with their IDs, names, and inputs.
   */
  extractToolCalls(
    content: AiContentBlock[],
  ): Array<{ id: string; name: string; input: Record<string, unknown> }> {
    return content
      .filter((block): block is AiToolUseBlock => block.type === 'tool_use')
      .map((block) => ({
        id: block.id,
        name: block.name,
        input: block.input,
      }));
  }

  /**
   * Estimate USD cost for a given token usage.
   */
  estimateCost(
    inputTokens: number,
    outputTokens: number,
    model?: string,
  ): number {
    return this.aiProvider.estimateCost(inputTokens, outputTokens, model);
  }

  /** Check if the AI service is configured and ready. */
  isConfigured(): boolean {
    return this.aiProvider.isConfigured();
  }
}
