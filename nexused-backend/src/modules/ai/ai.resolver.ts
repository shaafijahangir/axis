import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { User, UserRole } from '../../database/entities/user.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { AgentExecutorService } from './agent-executor.service';
import { AgentRegistry } from './agents/agent-registry.service';
import { CustomAgentService } from './custom-agent.service';
import { AiConversation } from './entities/ai-conversation.entity';
import { AiMessage } from './entities/ai-message.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  StartConversationInput,
  SendMessageInput,
} from './dto/chat-message.dto';
import { AgentResponseDto, AgentInfoDto } from './dto/agent-response.dto';

/**
 * GraphQL resolver for AI chat.
 *
 * WHY a dedicated resolver: The AI module is a first-class feature, not a bolt-on.
 * Students and instructors interact with agents through the same GraphQL API
 * they use for everything else. This keeps the frontend simple — just Apollo queries.
 */
@Resolver()
@UseGuards(JwtAuthGuard)
export class AiResolver {
  constructor(
    private agentExecutor: AgentExecutorService,
    private agentRegistry: AgentRegistry,
    private customAgentService: CustomAgentService,
    @InjectRepository(AiConversation)
    private conversationRepo: Repository<AiConversation>,
    @InjectRepository(AiMessage)
    private messageRepo: Repository<AiMessage>,
    @InjectRepository(Enrollment)
    private enrollmentRepo: Repository<Enrollment>,
  ) {}

  // ─── Mutations ──────────────────────────────────────────────────────

  @Mutation(() => AgentResponseDto)
  async startConversation(
    @CurrentUser() user: User,
    @Args('input') input: StartConversationInput,
  ): Promise<AgentResponseDto> {
    return this.agentExecutor.startConversation({
      tenantId: user.tenantId,
      userId: user.id,
      roles: user.roles,
      agentType: input.agentType,
      userMessage: input.message,
      courseId: input.courseId,
      assignmentId: input.assignmentId,
      submissionId: input.submissionId,
      sectionId: input.sectionId,
    });
  }

  @Mutation(() => AgentResponseDto)
  async sendMessage(
    @CurrentUser() user: User,
    @Args('input') input: SendMessageInput,
  ): Promise<AgentResponseDto> {
    return this.agentExecutor.continueConversation({
      conversationId: input.conversationId,
      userId: user.id,
      tenantId: user.tenantId,
      roles: user.roles,
      userMessage: input.message,
    });
  }

  // ─── Queries ────────────────────────────────────────────────────────

  @Query(() => [AgentInfoDto])
  async availableAgents(@CurrentUser() user: User): Promise<AgentInfoDto[]> {
    // Built-in agents filtered by role
    const builtInAgents = this.agentRegistry
      .getAll()
      .filter((agent) =>
        agent.allowedRoles.some((role) =>
          user.roles.includes(role as UserRole),
        ),
      )
      .map((agent) => ({
        type: agent.type,
        displayName: agent.displayName,
        description: agent.description,
        allowedRoles: agent.allowedRoles,
      }));

    // Custom agents: get user's enrolled course IDs for scope filtering
    const enrollments = await this.enrollmentRepo.find({
      where: { userId: user.id, tenantId: user.tenantId },
      relations: ['section'],
    });
    const enrolledCourseIds = [
      ...new Set(
        enrollments
          .map((e) => e.section?.courseId)
          .filter((id): id is string => !!id),
      ),
    ];

    const customAgents = await this.customAgentService.findAvailableForUser(
      user.tenantId,
      user.roles as string[],
      enrolledCourseIds,
    );

    const customAgentInfos = customAgents.map((agent) => ({
      type: `custom-${agent.slug}`,
      displayName: agent.displayName,
      description: agent.description,
      allowedRoles: agent.allowedRoles,
    }));

    return [...builtInAgents, ...customAgentInfos];
  }

  @Query(() => [AiConversation])
  async myAiConversations(
    @CurrentUser() user: User,
  ): Promise<AiConversation[]> {
    return this.conversationRepo.find({
      where: { userId: user.id, tenantId: user.tenantId },
      order: { updatedAt: 'DESC' },
    });
  }

  @Query(() => [AiMessage])
  async aiMessages(
    @Args('conversationId') conversationId: string,
  ): Promise<AiMessage[]> {
    return this.messageRepo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
  }
}
