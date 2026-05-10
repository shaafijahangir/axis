import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { AiProvider } from './providers/ai-provider.interface';
import {
  AI_PROVIDER,
  AiMessage as ProviderMessage,
  AiContentBlock,
  AiToolResultBlock,
  AiTextBlock,
  AiToolUseBlock,
} from './providers/ai-provider.interface';
import { ContextService } from './context.service';
import { GovernanceService } from './governance.service';
import { UsageTrackingService } from './usage-tracking.service';
import { ToolRegistry } from './tools/tool-registry';
import { CustomAgentService } from './custom-agent.service';
import { AgentContext } from './tools/tool.interface';
import { ContextPayload } from './agents/agent.interface';
import {
  ContextBuilderParams,
  AgentDefinition,
} from './agents/agent.interface';
import {
  AiConversation,
  ConversationStatus,
} from './entities/ai-conversation.entity';
import { AiMessage, MessageRole } from './entities/ai-message.entity';

/**
 * Runs the agent loop: context → Claude → tool calls → response.
 *
 * WHY: This is the heart of the AI-native architecture. The executor
 * handles the full lifecycle: build context, send to Claude, execute
 * any tool calls Claude makes, feed results back, repeat until done.
 *
 * PATTERN: Agentic loop — the standard pattern for tool-using LLMs.
 * Claude sends a response that may contain tool_use blocks. We execute
 * those tools, send the results back, and Claude continues until it
 * produces a final text response (stop_reason !== 'tool_use').
 *
 * TRADEOFF: Synchronous loop (not streaming) for v1. Streaming will
 * be added in Phase 3 when we wire up Socket.IO.
 */

export interface AgentExecutionResult {
  conversationId: string;
  responseText: string;
  toolsUsed: string[];
  totalInputTokens: number;
  totalOutputTokens: number;
  turns: number;
}

export interface StartConversationParams {
  tenantId: string;
  userId: string;
  roles: string[];
  agentType: string;
  userMessage: string;
  courseId?: string;
  assignmentId?: string;
  submissionId?: string;
  sectionId?: string;
}

export interface ContinueConversationParams {
  conversationId: string;
  userId: string;
  tenantId: string;
  roles: string[];
  userMessage: string;
}

@Injectable()
export class AgentExecutorService {
  private readonly logger = new Logger(AgentExecutorService.name);

  constructor(
    @Inject(AI_PROVIDER) private aiProvider: AiProvider,
    private contextService: ContextService,
    private governanceService: GovernanceService,
    private usageTracking: UsageTrackingService,
    private toolRegistry: ToolRegistry,
    private customAgentService: CustomAgentService,
    private eventEmitter: EventEmitter2,
    @InjectRepository(AiConversation)
    private conversationRepository: Repository<AiConversation>,
    @InjectRepository(AiMessage)
    private messageRepository: Repository<AiMessage>,
  ) {}

  /**
   * Start a new conversation with an agent.
   * Creates the conversation record, builds context, and runs the first turn.
   */
  async startConversation(
    params: StartConversationParams,
  ): Promise<AgentExecutionResult> {
    // Resolve agent from built-in registry or custom agents DB
    const agent = await this.customAgentService.resolveAgent(
      params.agentType,
      params.tenantId,
    );
    if (!agent) {
      throw new Error(`Unknown agent type: "${params.agentType}"`);
    }

    // Build context
    const contextParams: ContextBuilderParams = {
      tenantId: params.tenantId,
      userId: params.userId,
      courseId: params.courseId,
      assignmentId: params.assignmentId,
      submissionId: params.submissionId,
      sectionId: params.sectionId,
    };
    const context = await this.contextService.buildContext(contextParams);
    const contextText = this.contextService.formatContextForPrompt(context);

    // Create conversation record
    const conversation = this.conversationRepository.create({
      tenantId: params.tenantId,
      userId: params.userId,
      agentType: params.agentType,
      courseId: params.courseId,
      status: ConversationStatus.ACTIVE,
      contextSnapshot: context,
    });
    const savedConversation =
      await this.conversationRepository.save(conversation);

    this.eventEmitter.emit('ai.conversation.started', {
      conversationId: savedConversation.id,
      agentType: params.agentType,
      userId: params.userId,
      tenantId: params.tenantId,
    });

    // Save the user's message
    await this.saveMessage(
      savedConversation.id,
      MessageRole.USER,
      params.userMessage,
      0,
    );

    // Build system prompt with context
    const systemPrompt = this.buildSystemPrompt(agent, contextText);

    // Run the agent loop
    const messages: ProviderMessage[] = [
      { role: 'user', content: params.userMessage },
    ];

    const agentCtx: AgentContext = {
      tenantId: params.tenantId,
      userId: params.userId,
      roles: params.roles,
      agentType: params.agentType,
      conversationId: savedConversation.id,
    };

    return this.runAgentLoop(
      savedConversation.id,
      agent,
      systemPrompt,
      messages,
      agentCtx,
    );
  }

  /**
   * Continue an existing conversation with a new user message.
   */
  async continueConversation(
    params: ContinueConversationParams,
  ): Promise<AgentExecutionResult> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: params.conversationId },
    });
    if (!conversation) {
      throw new Error(`Conversation not found: "${params.conversationId}"`);
    }
    if (conversation.status !== ConversationStatus.ACTIVE) {
      throw new Error(
        `Conversation "${params.conversationId}" is ${conversation.status}`,
      );
    }

    const agent = await this.customAgentService.resolveAgent(
      conversation.agentType,
      params.tenantId,
    );
    if (!agent) {
      throw new Error(`Unknown agent type: "${conversation.agentType}"`);
    }

    // Save the new user message
    await this.saveMessage(
      params.conversationId,
      MessageRole.USER,
      params.userMessage,
      0,
    );

    // Rebuild message history from stored messages
    const storedMessages = await this.messageRepository.find({
      where: { conversationId: params.conversationId },
      order: { createdAt: 'ASC' },
    });

    const messages: ProviderMessage[] = [];
    for (const msg of storedMessages) {
      if (msg.role === MessageRole.USER) {
        messages.push({ role: 'user', content: msg.content });
      } else if (msg.role === MessageRole.ASSISTANT) {
        messages.push({ role: 'assistant', content: msg.content });
      }
      // Tool calls/results are embedded in assistant/user message pairs
      // by the agent loop, so we reconstruct from text content here.
      // Full tool call reconstruction will come with streaming support.
    }

    // Rebuild context and system prompt
    const contextText = this.contextService.formatContextForPrompt(
      conversation.contextSnapshot as ContextPayload,
    );
    const systemPrompt = this.buildSystemPrompt(agent, contextText);

    const agentCtx: AgentContext = {
      tenantId: params.tenantId,
      userId: params.userId,
      roles: params.roles,
      agentType: conversation.agentType,
      conversationId: params.conversationId,
    };

    return this.runAgentLoop(
      params.conversationId,
      agent,
      systemPrompt,
      messages,
      agentCtx,
    );
  }

  /**
   * The core agent loop. Sends messages to the AI provider, handles tool calls,
   * and loops until the provider produces a final response or hits max turns.
   */
  private async runAgentLoop(
    conversationId: string,
    agent: AgentDefinition,
    systemPrompt: string,
    messages: ProviderMessage[],
    ctx: AgentContext,
  ): Promise<AgentExecutionResult> {
    const toolsUsed: string[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let turns = 0;
    let responseText = '';

    const tools = this.toolRegistry.toProviderFormat(agent.tools);

    while (turns < agent.maxTurns) {
      turns++;

      const response = await this.aiProvider.sendMessage({
        systemPrompt,
        messages,
        tools,
        model: agent.model,
      });

      totalInputTokens += response.usage.inputTokens;
      totalOutputTokens += response.usage.outputTokens;

      // Log usage for this turn
      await this.usageTracking.logUsage({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        agentType: ctx.agentType,
        conversationId,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        model: response.model,
      });

      // Extract text and tool calls
      const text = this.extractText(response.content);
      const toolCalls = this.extractToolCalls(response.content);

      // If no tool calls, this is the final response
      if (response.stopReason !== 'tool_use' || toolCalls.length === 0) {
        responseText = text;

        // Save assistant's final message
        await this.saveMessage(
          conversationId,
          MessageRole.ASSISTANT,
          responseText,
          response.usage.inputTokens + response.usage.outputTokens,
        );
        break;
      }

      // Handle tool calls
      // Save the assistant message with tool calls
      await this.saveMessage(
        conversationId,
        MessageRole.ASSISTANT,
        text || '(tool calls)',
        response.usage.inputTokens + response.usage.outputTokens,
        toolCalls,
      );

      // Execute each tool call
      const toolResults: AiToolResultBlock[] = [];
      for (const call of toolCalls) {
        // Check governance
        const decision = await this.governanceService.checkToolPermission(
          call.name,
          ctx,
        );

        let result: string;
        if (!decision.allowed) {
          result = JSON.stringify({
            error: decision.reason,
            actionType: decision.actionType,
          });
        } else {
          const toolResult = await this.toolRegistry.execute(
            call.name,
            call.input,
            ctx,
          );
          result = JSON.stringify(
            toolResult.data ?? { error: toolResult.error },
          );
          toolsUsed.push(call.name);

          this.eventEmitter.emit('ai.tool.invoked', {
            toolName: call.name,
            agentType: ctx.agentType,
            input: call.input,
            success: toolResult.success,
            tenantId: ctx.tenantId,
          });
        }

        toolResults.push({
          type: 'tool_result',
          toolUseId: call.id,
          content: result,
        });
      }

      // Save tool results
      await this.saveMessage(
        conversationId,
        MessageRole.TOOL_RESULT,
        JSON.stringify(toolResults.map((r) => r.content)),
        0,
        undefined,
        toolResults,
      );

      // Add the assistant's response (with tool_use blocks) and tool results
      // back to the message array for the next turn
      messages.push({ role: 'assistant', content: response.content });
      messages.push({
        role: 'user',
        content: toolResults.map((r) => ({
          type: 'tool_result' as const,
          toolUseId: r.toolUseId,
          content: r.content,
        })),
      });
    }

    // If we hit max turns without a final response
    if (turns >= agent.maxTurns && !responseText) {
      responseText =
        'I apologize, but I reached the maximum number of steps for this interaction. Please try again with a more specific request.';

      await this.saveMessage(
        conversationId,
        MessageRole.ASSISTANT,
        responseText,
        0,
      );

      this.logger.warn(
        `Agent "${ctx.agentType}" hit max turns (${agent.maxTurns}) for conversation ${conversationId}`,
      );
    }

    return {
      conversationId,
      responseText,
      toolsUsed: [...new Set(toolsUsed)],
      totalInputTokens,
      totalOutputTokens,
      turns,
    };
  }

  /** Build the full system prompt by combining agent prompt + context. */
  private buildSystemPrompt(
    agent: AgentDefinition,
    contextText: string,
  ): string {
    return `${agent.systemPrompt}\n\n--- CONTEXT ---\n${contextText}`;
  }

  /**
   * Extract text content from a response.
   * Filters out tool_use blocks and joins text blocks.
   */
  private extractText(content: AiContentBlock[]): string {
    return content
      .filter((block): block is AiTextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
  }

  /**
   * Extract tool use requests from a response.
   * Returns an array of tool calls with their IDs, names, and inputs.
   */
  private extractToolCalls(
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

  /** Persist a message to the database. */
  private async saveMessage(
    conversationId: string,
    role: MessageRole,
    content: string,
    tokenCount: number,
    toolCalls?: Array<{
      id: string;
      name: string;
      input: Record<string, unknown>;
    }>,
    toolResults?: unknown[],
  ): Promise<AiMessage> {
    const message = this.messageRepository.create({
      conversationId,
      role,
      content,
      tokenCount,
      toolCalls: toolCalls as Record<string, unknown>[],
      toolResults: toolResults as Record<string, unknown>[],
    });
    return this.messageRepository.save(message);
  }
}
