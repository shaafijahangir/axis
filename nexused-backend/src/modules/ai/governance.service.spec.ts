import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { GovernanceService, GovernanceDecision } from './governance.service';
import { ToolRegistry } from './tools/tool-registry';
import { AiUsageLog } from './entities/ai-usage-log.entity';
import { AgentContext, ToolDefinition } from './tools/tool.interface';
import {
  createMockRepository,
  createMockQueryBuilder,
  MockRepository,
} from '../../test/mocks/repository.mock';

describe('GovernanceService', () => {
  let service: GovernanceService;
  let toolRegistry: ToolRegistry;
  let usageLogRepo: MockRepository<AiUsageLog>;
  let configService: Partial<ConfigService>;

  // Default context for tests
  const defaultContext: AgentContext = {
    tenantId: 'tenant-1',
    userId: 'user-1',
    roles: ['student'],
    agentType: 'study-coach',
    conversationId: 'conv-1',
  };

  // Mock tools for testing
  const autoTool: ToolDefinition = {
    name: 'get_course',
    description: 'Get course details',
    inputSchema: { type: 'object', properties: {} },
    handler: jest.fn(),
    requiredPermissions: ['courses.read'],
    actionType: 'auto',
  };

  const suggestTool: ToolDefinition = {
    name: 'enroll_student',
    description: 'Enroll a student',
    inputSchema: { type: 'object', properties: {} },
    handler: jest.fn(),
    requiredPermissions: ['enrollments.write'],
    actionType: 'suggest',
  };

  const blockedTool: ToolDefinition = {
    name: 'delete_course',
    description: 'Delete a course',
    inputSchema: { type: 'object', properties: {} },
    handler: jest.fn(),
    requiredPermissions: ['courses.delete'],
    actionType: 'blocked',
  };

  beforeEach(async () => {
    // Create fresh mocks for each test
    usageLogRepo = createMockRepository<AiUsageLog>();
    configService = {
      get: jest.fn((key: string) => {
        const config: Record<string, unknown> = {
          'ai.rateLimits.maxRequestsPerMinute': 60,
          'ai.rateLimits.maxTokensPerDay': 100000,
        };
        return config[key];
      }),
    };

    // Create real ToolRegistry and register test tools
    toolRegistry = new ToolRegistry();
    toolRegistry.register(autoTool);
    toolRegistry.register(suggestTool);
    toolRegistry.register(blockedTool);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GovernanceService,
        { provide: ToolRegistry, useValue: toolRegistry },
        { provide: ConfigService, useValue: configService },
        {
          provide: getRepositoryToken(AiUsageLog),
          useValue: usageLogRepo,
        },
      ],
    }).compile();

    service = module.get<GovernanceService>(GovernanceService);
  });

  describe('checkToolPermission', () => {
    it('should return allowed=true and actionType=auto for auto tools within rate limit', async () => {
      // Mock: user has made 0 requests in the last minute
      usageLogRepo.count!.mockResolvedValue(0);

      const result = await service.checkToolPermission(
        'get_course',
        defaultContext,
      );

      expect(result).toEqual<GovernanceDecision>({
        allowed: true,
        actionType: 'auto',
      });
      expect(usageLogRepo.count).toHaveBeenCalledTimes(1);
    });

    it('should return allowed=true and actionType=suggest for suggest tools within rate limit', async () => {
      usageLogRepo.count!.mockResolvedValue(5);

      const result = await service.checkToolPermission(
        'enroll_student',
        defaultContext,
      );

      expect(result).toEqual<GovernanceDecision>({
        allowed: true,
        actionType: 'suggest',
      });
    });

    it('should return allowed=false for blocked tools', async () => {
      const result = await service.checkToolPermission(
        'delete_course',
        defaultContext,
      );

      expect(result).toEqual<GovernanceDecision>({
        allowed: false,
        actionType: 'blocked',
        reason: 'Tool "delete_course" is blocked by governance policy',
      });
      // Should not check rate limits for blocked tools
      expect(usageLogRepo.count).not.toHaveBeenCalled();
    });

    it('should return allowed=false for unknown tools', async () => {
      const result = await service.checkToolPermission(
        'nonexistent_tool',
        defaultContext,
      );

      expect(result).toEqual<GovernanceDecision>({
        allowed: false,
        actionType: 'blocked',
        reason: 'Unknown tool: "nonexistent_tool"',
      });
    });

    it('should return allowed=false when rate limit is exceeded', async () => {
      // Mock: user has made 60 requests (at the limit)
      usageLogRepo.count!.mockResolvedValue(60);

      const result = await service.checkToolPermission(
        'get_course',
        defaultContext,
      );

      expect(result).toEqual<GovernanceDecision>({
        allowed: false,
        actionType: 'blocked',
        reason: 'Rate limit exceeded',
      });
    });

    it('should allow request when under rate limit by 1', async () => {
      // Mock: user has made 59 requests (1 under limit)
      usageLogRepo.count!.mockResolvedValue(59);

      const result = await service.checkToolPermission(
        'get_course',
        defaultContext,
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('checkRateLimit', () => {
    it('should return true when under rate limit', async () => {
      usageLogRepo.count!.mockResolvedValue(30);

      const result = await service.checkRateLimit('tenant-1', 'user-1');

      expect(result).toBe(true);
    });

    it('should return false when at rate limit', async () => {
      usageLogRepo.count!.mockResolvedValue(60);

      const result = await service.checkRateLimit('tenant-1', 'user-1');

      expect(result).toBe(false);
    });

    it('should return false when over rate limit', async () => {
      usageLogRepo.count!.mockResolvedValue(100);

      const result = await service.checkRateLimit('tenant-1', 'user-1');

      expect(result).toBe(false);
    });

    it('should query with correct tenant and user', async () => {
      usageLogRepo.count!.mockResolvedValue(0);

      await service.checkRateLimit('tenant-xyz', 'user-abc');

      expect(usageLogRepo.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenantId: 'tenant-xyz',
          userId: 'user-abc',
        }),
      });
    });

    it('should only count requests from the last minute', async () => {
      usageLogRepo.count!.mockResolvedValue(0);

      await service.checkRateLimit('tenant-1', 'user-1');

      const callArgs = usageLogRepo.count!.mock.calls[0][0];
      expect(callArgs.where.createdAt).toBeDefined();
      // The createdAt should be a MoreThan condition with a date ~1 minute ago
    });
  });

  describe('checkDailyTokenBudget', () => {
    it('should return true when under daily budget', async () => {
      const queryBuilder = createMockQueryBuilder<AiUsageLog>();
      usageLogRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getRawOne!.mockResolvedValue({ total: '50000' });

      const result = await service.checkDailyTokenBudget('tenant-1');

      expect(result).toBe(true);
    });

    it('should return false when at daily budget', async () => {
      const queryBuilder = createMockQueryBuilder<AiUsageLog>();
      usageLogRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getRawOne!.mockResolvedValue({ total: '100000' });

      const result = await service.checkDailyTokenBudget('tenant-1');

      expect(result).toBe(false);
    });

    it('should return false when over daily budget', async () => {
      const queryBuilder = createMockQueryBuilder<AiUsageLog>();
      usageLogRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getRawOne!.mockResolvedValue({ total: '150000' });

      const result = await service.checkDailyTokenBudget('tenant-1');

      expect(result).toBe(false);
    });

    it('should return true when no usage exists (null total)', async () => {
      const queryBuilder = createMockQueryBuilder<AiUsageLog>();
      usageLogRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getRawOne!.mockResolvedValue({ total: null });

      const result = await service.checkDailyTokenBudget('tenant-1');

      expect(result).toBe(true);
    });

    it('should return true when result is undefined', async () => {
      const queryBuilder = createMockQueryBuilder<AiUsageLog>();
      usageLogRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getRawOne!.mockResolvedValue(undefined);

      const result = await service.checkDailyTokenBudget('tenant-1');

      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle multiple rapid requests correctly', async () => {
      // First request: 59 (under limit)
      usageLogRepo.count!.mockResolvedValueOnce(59);
      // Second request: 60 (at limit)
      usageLogRepo.count!.mockResolvedValueOnce(60);

      const result1 = await service.checkToolPermission(
        'get_course',
        defaultContext,
      );
      const result2 = await service.checkToolPermission(
        'get_course',
        defaultContext,
      );

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(false);
    });

    it('should work with different tenant contexts', async () => {
      usageLogRepo.count!.mockResolvedValue(0);

      const tenant1Ctx: AgentContext = {
        ...defaultContext,
        tenantId: 'tenant-1',
      };
      const tenant2Ctx: AgentContext = {
        ...defaultContext,
        tenantId: 'tenant-2',
      };

      await service.checkToolPermission('get_course', tenant1Ctx);
      await service.checkToolPermission('get_course', tenant2Ctx);

      // Verify different tenants were queried
      expect(usageLogRepo.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-1' }),
        }),
      );
      expect(usageLogRepo.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-2' }),
        }),
      );
    });
  });
});
