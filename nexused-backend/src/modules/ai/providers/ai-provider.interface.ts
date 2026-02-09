/**
 * AI Provider Abstraction Layer
 *
 * WHY: Decouples the agentic loop from any specific LLM vendor. This allows:
 * - Switching providers without touching business logic
 * - Adding fallback providers (if Claude is down, try OpenAI)
 * - A/B testing different models
 * - Local models for institutions with data residency requirements
 *
 * PATTERN: Strategy — different providers implement the same interface.
 * The AgentExecutorService depends on the interface, not concrete implementations.
 */

/**
 * A single message in a conversation.
 * Vendor-agnostic representation that maps to any LLM's format.
 */
export interface AiMessage {
  role: 'user' | 'assistant';
  content: string | AiContentBlock[] | AiToolResultBlock[];
}

/**
 * Content blocks that can appear in an assistant message.
 */
export type AiContentBlock = AiTextBlock | AiToolUseBlock;

export interface AiTextBlock {
  type: 'text';
  text: string;
}

export interface AiToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Tool result sent back to the model after tool execution.
 */
export interface AiToolResultBlock {
  type: 'tool_result';
  toolUseId: string;
  content: string;
  isError?: boolean;
}

/**
 * Tool definition for function calling.
 */
export interface AiToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Options for sending a message to the AI provider.
 */
export interface AiSendOptions {
  systemPrompt: string;
  messages: AiMessage[];
  tools?: AiToolDefinition[];
  model?: string;
  maxTokens?: number;
}

/**
 * Response from the AI provider.
 */
export interface AiProviderResponse {
  content: AiContentBlock[];
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  model: string;
}

/**
 * The AI Provider interface that all implementations must satisfy.
 *
 * Implementing a new provider:
 * 1. Create a class that implements this interface
 * 2. Map provider-specific types to/from our types in the implementation
 * 3. Register the provider in the AI module
 */
export interface AiProvider {
  /**
   * Unique identifier for this provider (e.g., 'anthropic', 'openai', 'local')
   */
  readonly providerId: string;

  /**
   * Send a message to the AI and get a response.
   * The response may contain tool_use blocks if tools were provided.
   */
  sendMessage(options: AiSendOptions): Promise<AiProviderResponse>;

  /**
   * Check if the provider is configured and ready to use.
   */
  isConfigured(): boolean;

  /**
   * Get the default model for this provider.
   */
  getDefaultModel(): string;

  /**
   * Estimate cost in USD for given token usage.
   */
  estimateCost(
    inputTokens: number,
    outputTokens: number,
    model?: string,
  ): number;
}

/**
 * Injection token for the AI provider.
 * Use this to inject the provider into services.
 *
 * Example:
 * ```typescript
 * constructor(@Inject(AI_PROVIDER) private aiProvider: AiProvider) {}
 * ```
 */
export const AI_PROVIDER = Symbol('AI_PROVIDER');
