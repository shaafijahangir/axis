import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Repository } from 'typeorm';

// AI entities
import { AiConversation } from './entities/ai-conversation.entity';
import { AiMessage } from './entities/ai-message.entity';
import { AiUsageLog } from './entities/ai-usage-log.entity';
import { TenantAiConfig } from './entities/tenant-ai-config.entity';
import { CustomAgent } from './entities/custom-agent.entity';

// Domain entities (for tools + context + event listener)
import { User } from '../../database/entities/user.entity';
import { Course } from '../../database/entities/course.entity';
import { CourseSection } from '../../database/entities/course-section.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { Assignment } from '../../database/entities/assignment.entity';
import { Submission } from '../../database/entities/submission.entity';
import { Tenant } from '../../database/entities/tenant.entity';

// AI provider abstraction
import { AI_PROVIDER } from './providers/ai-provider.interface';
import { AnthropicProvider } from './providers/anthropic.provider';

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
import { createPlannerTools } from './tools/planner.tools';
import { createGraduationPlannerTools } from './tools/graduation-planner.tools';
import { createCourseDiscoveryTools } from './tools/course-discovery.tools';
import { createCareerTools } from './tools/career.tools';

// Agent definitions
import { studyCoachAgent } from './agents/study-coach.agent';
import { feedbackCopilotAgent } from './agents/feedback-copilot.agent';
import { coursePlannerAgent } from './agents/course-planner.agent';

// Resolvers
import { AiResolver } from './ai.resolver';
import { GovernanceResolver } from './governance.resolver';
import { CustomAgentResolver } from './custom-agent.resolver';

// Custom agent service
import { CustomAgentService } from './custom-agent.service';

// Event listener + reactions queue/processor
import { AiEventListener } from './events/ai-event.listener';
import { AiReactionsProcessor } from './events/ai-reactions.processor';
import { AI_REACTIONS_QUEUE } from './events/ai-reactions.queue';

// External module imports
import { CoursesModule } from '../courses/courses.module';
import { CoursesService } from '../courses/courses.service';
import { PlannerModule } from '../planner/planner.module';
import { PlannerService } from '../planner/planner.service';
import { GraduationPlannerService } from '../planner/graduation-planner.service';
import { CareerService } from '../planner/career.service';

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
      TenantAiConfig,
      CustomAgent,
      User,
      Course,
      CourseSection,
      Enrollment,
      Assignment,
      Submission,
      Tenant,
    ]),
    // Durable queue for proactive AI reactions (retry/backoff on Anthropic
    // transient failures instead of fire-and-forget drops).
    BullModule.registerQueue({ name: AI_REACTIONS_QUEUE }),
    CoursesModule,
    PlannerModule,
  ],
  providers: [
    // AI Provider abstraction — Anthropic is the default implementation
    AnthropicProvider,
    {
      provide: AI_PROVIDER,
      useExisting: AnthropicProvider,
    },
    // Services
    AiService, // Kept for backward compatibility, delegates to provider
    ContextService,
    GovernanceService,
    UsageTrackingService,
    AgentExecutorService,
    ToolRegistry,
    AgentRegistry,
    AiResolver,
    GovernanceResolver,
    CustomAgentResolver,
    CustomAgentService,
    AiEventListener,
    AiReactionsProcessor,
  ],
  exports: [
    AI_PROVIDER,
    AnthropicProvider,
    AiService, // Deprecated — use AI_PROVIDER injection token instead
    AgentExecutorService,
    ToolRegistry,
    AgentRegistry,
    UsageTrackingService,
    GovernanceService,
    CustomAgentService,
  ],
})
export class AiModule implements OnModuleInit {
  private readonly logger = new Logger(AiModule.name);

  constructor(
    private toolRegistry: ToolRegistry,
    private agentRegistry: AgentRegistry,
    private coursesService: CoursesService,
    private plannerService: PlannerService,
    private graduationPlannerService: GraduationPlannerService,
    private careerService: CareerService,
    @InjectRepository(Assignment)
    private assignmentRepo: Repository<Assignment>,
    @InjectRepository(Submission)
    private submissionRepo: Repository<Submission>,
    @InjectRepository(Enrollment)
    private enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Course)
    private courseRepo: Repository<Course>,
    @InjectRepository(CourseSection)
    private sectionRepo: Repository<CourseSection>,
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
    this.toolRegistry.registerAll(
      createEnrollmentTools(this.coursesService, this.plannerService),
    );

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

    // Planner tools (degree progress, eligibility, major simulation)
    this.toolRegistry.registerAll(createPlannerTools(this.plannerService));

    // Graduation planner tools (plan generation, what-if replanning, simulation)
    this.toolRegistry.registerAll(
      createGraduationPlannerTools(
        this.plannerService,
        this.graduationPlannerService,
      ),
    );

    // Course discovery tool — natural language catalog search (ENROLL-007)
    this.toolRegistry.registerAll(
      createCourseDiscoveryTools(
        this.courseRepo,
        this.sectionRepo,
        this.plannerService,
      ),
    );

    // Career exploration + skill gap tools (GRAD-006)
    this.toolRegistry.registerAll(createCareerTools(this.careerService));
  }

  private registerAgents(): void {
    this.agentRegistry.register(studyCoachAgent);
    this.agentRegistry.register(feedbackCopilotAgent);
    this.agentRegistry.register(coursePlannerAgent);
  }
}
