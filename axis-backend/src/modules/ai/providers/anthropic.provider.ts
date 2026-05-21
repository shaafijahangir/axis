import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import {
  AiProvider,
  AiSendOptions,
  AiProviderResponse,
  AiContentBlock,
  AiToolDefinition,
  AiMessage,
} from './ai-provider.interface';

/**
 * Anthropic Claude provider implementation.
 *
 * WHY: This is the only place in the codebase that imports @anthropic-ai/sdk.
 * The rest of the AI module uses our vendor-agnostic types, making it possible
 * to swap providers without touching the agentic loop or tools.
 *
 * PATTERN: Adapter — converts between our interface types and Anthropic SDK types.
 */
@Injectable()
export class AnthropicProvider implements AiProvider, OnModuleInit {
  private readonly logger = new Logger(AnthropicProvider.name);
  private client: Anthropic;
  private defaultModel: string;
  private defaultMaxTokens: number;

  readonly providerId = 'anthropic';

  constructor(private configService: ConfigService) {}

  onModuleInit(): void {
    const apiKey = this.configService.get<string>('ai.anthropicApiKey');
    if (!apiKey) {
      this.logger.warn(
        'ANTHROPIC_API_KEY not set — Anthropic provider will be unavailable',
      );
    }

    this.client = new Anthropic({ apiKey: apiKey || 'not-configured' });
    this.defaultModel = this.configService.get<string>('ai.defaultModel')!;
    this.defaultMaxTokens = this.configService.get<number>('ai.maxTokens')!;
    this.logger.log(
      `Anthropic provider initialized (model: ${this.defaultModel})`,
    );
  }

  async sendMessage(options: AiSendOptions): Promise<AiProviderResponse> {
    const {
      systemPrompt,
      messages,
      tools,
      model = this.defaultModel,
      maxTokens = this.defaultMaxTokens,
    } = options;

    // Convert our messages to Anthropic format
    const anthropicMessages = this.toAnthropicMessages(messages);

    const requestParams: Anthropic.MessageCreateParams = {
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: anthropicMessages,
    };

    // Only include tools if provided and non-empty
    if (tools && tools.length > 0) {
      requestParams.tools = tools.map((t) => this.toAnthropicTool(t));
    }

    const response = await this.client.messages.create(requestParams);

    // Convert Anthropic response to our format
    return {
      content: this.fromAnthropicContent(response.content),
      stopReason: this.fromAnthropicStopReason(response.stop_reason),
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      model: response.model,
    };
  }

  isConfigured(): boolean {
    const apiKey = this.configService.get<string>('ai.anthropicApiKey');
    return !!apiKey && apiKey !== 'not-configured';
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }

  /**
   * Estimate USD cost for a given token usage.
   *
   * Prices as of May 2025 for Claude models:
   * - Claude Sonnet 4: $3 input / $15 output per 1M tokens
   * - Claude Haiku 3.5: $0.80 input / $4 output per 1M tokens
   * - Claude Opus 4: $15 input / $75 output per 1M tokens
   */
  estimateCost(
    inputTokens: number,
    outputTokens: number,
    model?: string,
  ): number {
    const m = model || this.defaultModel;

    // Cost per 1M tokens [input, output]
    const pricing: Record<string, [number, number]> = {
      'claude-sonnet-4-20250514': [3, 15],
      'claude-haiku-3-5-20241022': [0.8, 4],
      'claude-opus-4-20250514': [15, 75],
    };

    const [inputRate, outputRate] = pricing[m] || [3, 15];

    return (
      (inputTokens / 1_000_000) * inputRate +
      (outputTokens / 1_000_000) * outputRate
    );
  }

  // --- Private conversion methods ---

  private toAnthropicMessages(messages: AiMessage[]): Anthropic.MessageParam[] {
    return messages.map((msg) => {
      if (typeof msg.content === 'string') {
        return {
          role: msg.role,
          content: msg.content,
        };
      }

      // Content is an array of blocks (tool_result, etc.)
      type MsgBlock = {
        type: string;
        text?: string;
        id?: string;
        name?: string;
        input?: Record<string, unknown>;
        toolUseId?: string;
        content?: string;
      };
      const blocks = msg.content as MsgBlock[];
      const content = blocks.map((block) => {
        if (block.type === 'text') {
          return { type: 'text' as const, text: block.text ?? '' };
        }
        if (block.type === 'tool_use') {
          return {
            type: 'tool_use' as const,
            id: block.id ?? '',
            name: block.name ?? '',
            input: block.input ?? {},
          };
        }
        // Handle tool_result blocks (sent as user messages)
        if (block.type === 'tool_result') {
          return {
            type: 'tool_result' as const,
            tool_use_id: block.toolUseId ?? '',
            content: block.content ?? '',
          };
        }
        return { type: 'text' as const, text: '' };
      });

      return {
        role: msg.role,
        content,
      };
    });
  }

  private toAnthropicTool(tool: AiToolDefinition): Anthropic.Tool {
    return {
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    };
  }

  private fromAnthropicContent(
    content: Anthropic.ContentBlock[],
  ): AiContentBlock[] {
    return content.map((block) => {
      if (block.type === 'text') {
        return { type: 'text', text: block.text };
      }
      if (block.type === 'tool_use') {
        return {
          type: 'tool_use',
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        };
      }
      // Fallback for unknown types
      return { type: 'text', text: '' };
    });
  }

  private fromAnthropicStopReason(
    stopReason: Anthropic.Message['stop_reason'],
  ): string {
    switch (stopReason) {
      case 'end_turn':
        return 'end_turn';
      case 'tool_use':
        return 'tool_use';
      case 'max_tokens':
        return 'max_tokens';
      default:
        return stopReason || 'unknown';
    }
  }
}
