import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { ClaudeToolSchema } from './tools/tool.interface';

/**
 * Core Claude API wrapper.
 *
 * WHY a dedicated service: Centralizes API key management, model selection,
 * and token counting. Every AI interaction in the system goes through here,
 * making it easy to add logging, caching, or fallback models later.
 *
 * PATTERN: Facade — simplifies the Anthropic SDK into the specific
 * operations NexusEd needs (message with tools, streaming).
 */

export interface SendMessageOptions {
  systemPrompt: string;
  messages: Anthropic.MessageParam[];
  tools?: ClaudeToolSchema[];
  model?: string;
  maxTokens?: number;
}

export interface AiResponse {
  content: Anthropic.ContentBlock[];
  stopReason: string | null;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);
  private client: Anthropic;
  private defaultModel: string;
  private defaultMaxTokens: number;

  constructor(private configService: ConfigService) {}

  onModuleInit(): void {
    const apiKey = this.configService.get<string>('ai.anthropicApiKey');
    if (!apiKey) {
      this.logger.warn(
        'ANTHROPIC_API_KEY not set — AI features will be unavailable',
      );
    }

    this.client = new Anthropic({ apiKey: apiKey || 'not-configured' });
    this.defaultModel = this.configService.get<string>('ai.defaultModel')!;
    this.defaultMaxTokens = this.configService.get<number>('ai.maxTokens')!;
    this.logger.log(`AI Service initialized (model: ${this.defaultModel})`);
  }

  /**
   * Send a message to Claude and get a response.
   * Supports tool_use — Claude can request tool calls in its response.
   */
  async sendMessage(options: SendMessageOptions): Promise<AiResponse> {
    const {
      systemPrompt,
      messages,
      tools,
      model = this.defaultModel,
      maxTokens = this.defaultMaxTokens,
    } = options;

    const requestParams: Anthropic.MessageCreateParams = {
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    };

    // Only include tools if provided and non-empty
    if (tools && tools.length > 0) {
      requestParams.tools = tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema as Anthropic.Tool.InputSchema,
      }));
    }

    const response = await this.client.messages.create(requestParams);

    return {
      content: response.content,
      stopReason: response.stop_reason,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: response.model,
    };
  }

  /**
   * Extract text content from a Claude response.
   * Filters out tool_use blocks and joins text blocks.
   */
  extractText(content: Anthropic.ContentBlock[]): string {
    return content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
  }

  /**
   * Extract tool use requests from a Claude response.
   * Returns an array of tool calls with their IDs, names, and inputs.
   */
  extractToolCalls(
    content: Anthropic.ContentBlock[],
  ): Array<{ id: string; name: string; input: Record<string, unknown> }> {
    return content
      .filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
      )
      .map((block) => ({
        id: block.id,
        name: block.name,
        input: block.input as Record<string, unknown>,
      }));
  }

  /**
   * Estimate USD cost for a given token usage.
   *
   * WHY hardcoded prices: These change infrequently and we want cost tracking
   * from day one. We'll make this configurable when we add multi-model support.
   *
   * Prices as of May 2025 for Claude Sonnet:
   * - Input: $3 / 1M tokens
   * - Output: $15 / 1M tokens
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

  /** Check if the AI service is configured and ready. */
  isConfigured(): boolean {
    const apiKey = this.configService.get<string>('ai.anthropicApiKey');
    return !!apiKey && apiKey !== 'not-configured';
  }
}
