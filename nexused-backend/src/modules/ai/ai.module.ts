import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// AI entities
import { AiConversation } from './entities/ai-conversation.entity';
import { AiMessage } from './entities/ai-message.entity';
import { AiUsageLog } from './entities/ai-usage-log.entity';

// Domain entities (for tools + context)
import { User } from '../../database/entities/user.entity';
import { Course } from '../../database/entities/course.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { Assignment } from '../../database/entities/assignment.entity';
import { Submission } from '../../database/entities/submission.entity';
import { Tenant } from '../../database/entities/tenant.entity';

// AI services
import { AiService } from './ai.service';
import { ContextService } from './context.service';
import { GovernanceService } from './governance.service';
import { UsageTrackingService } from './usage-tracking.service';
import { AgentExecutorService } from './agent-executor.service';

// Registries
import { ToolRegistry } from './tools/tool-registry';
import { AgentRegistry } from './agents/agent-registry.service';

// Tool factories
import { createCourseTools } from './tools/course.tools';
import { createEnrollmentTools } from './tools/enrollment.tools';
import { createAssignmentTools } from './tools/assignment.tools';
import { createGradingTools } from './tools/grading.tools';
import { createAnalyticsTools } from './tools/analytics.tools';

// Agent definitions
import { studyCoachAgent } from './agents/study-coach.agent';
import { feedbackCopilotAgent } from './agents/feedback-copilot.agent';

// Resolver
import { AiResolver } from './ai.resolver';

// Event listener
import { AiEventListener } from './events/ai-event.listener';

// External module imports
import { CoursesModule } from '../courses/courses.module';
import { CoursesService } from '../courses/courses.service';

/**
 * The AI module — core of the AI-native architecture.
 *
 * WHY OnModuleInit: Tools and agents need injected services (CoursesService,
 * repositories) to build their handlers. We register them after DI is complete.
 *
 * PATTERN: Module initialization — NestJS lifecycle hook ensures all
 * dependencies are resolved before we wire up tools and agents.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiConversation,
      AiMessage,
      AiUsageLog,
      User,
      Course,
      Enrollment,
      Assignment,
      Submission,
      Tenant,
    ]),
    CoursesModule,
  ],
  providers: [
    AiService,
    ContextService,
    GovernanceService,
    UsageTrackingService,
    AgentExecutorService,
    ToolRegistry,
    AgentRegistry,
    AiResolver,
    AiEventListener,
  ],
  exports: [
    AiService,
    AgentExecutorService,
    ToolRegistry,
    AgentRegistry,
    UsageTrackingService,
  ],
})
export class AiModule implements OnModuleInit {
  private readonly logger = new Logger(AiModule.name);

  constructor(
    private toolRegistry: ToolRegistry,
    private agentRegistry: AgentRegistry,
    private coursesService: CoursesService,
    @InjectRepository(Assignment)
    private assignmentRepo: Repository<Assignment>,
    @InjectRepository(Submission)
    private submissionRepo: Repository<Submission>,
    @InjectRepository(Enrollment)
    private enrollmentRepo: Repository<Enrollment>,
  ) {}

  onModuleInit(): void {
    this.registerTools();
    this.registerAgents();
    this.logger.log(
      `AI Module initialized: ${this.toolRegistry.size} tools, ${this.agentRegistry.size} agents`,
    );
  }

  private registerTools(): void {
    // Course + section tools (wraps CoursesService)
    this.toolRegistry.registerAll(createCourseTools(this.coursesService));

    // Enrollment tools (wraps CoursesService enrollment methods)
    this.toolRegistry.registerAll(createEnrollmentTools(this.coursesService));

    // Assignment + submission tools (direct repo access)
    this.toolRegistry.registerAll(
      createAssignmentTools(this.assignmentRepo, this.submissionRepo),
    );

    // Grading tools (submission repo)
    this.toolRegistry.registerAll(createGradingTools(this.submissionRepo));

    // Analytics tools (aggregate queries)
    this.toolRegistry.registerAll(
      createAnalyticsTools(
        this.submissionRepo,
        this.enrollmentRepo,
        this.assignmentRepo,
      ),
    );
  }

  private registerAgents(): void {
    this.agentRegistry.register(studyCoachAgent);
    this.agentRegistry.register(feedbackCopilotAgent);
  }
}
