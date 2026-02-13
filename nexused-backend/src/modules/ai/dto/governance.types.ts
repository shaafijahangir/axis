import {
  ObjectType,
  Field,
  Int,
  Float,
  InputType,
  registerEnumType,
} from '@nestjs/graphql';
import {
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  Min,
  IsEnum,
  IsString,
} from 'class-validator';

/**
 * DTOs for the AI Governance Console.
 *
 * WHY: Admins need a structured API to configure AI governance per tenant —
 * tool permissions, rate limits, budgets — and view audit logs of AI activity.
 */

// --- Enums ---

export enum GovernanceActionType {
  AUTO = 'auto',
  SUGGEST = 'suggest',
  BLOCKED = 'blocked',
}

registerEnumType(GovernanceActionType, {
  name: 'GovernanceActionType',
  description: 'Action type for AI tool governance',
});

// --- Tool Permissions ---

@ObjectType()
export class ToolPermission {
  @Field()
  toolName: string;

  @Field()
  description: string;

  @Field(() => GovernanceActionType)
  defaultActionType: GovernanceActionType;

  @Field(() => GovernanceActionType)
  effectiveActionType: GovernanceActionType;

  @Field()
  isOverridden: boolean;

  @Field(() => [String])
  requiredPermissions: string[];
}

// --- Governance Config ---

@ObjectType()
export class GovernanceConfig {
  @Field()
  enabled: boolean;

  @Field(() => Int)
  effectiveMaxRequestsPerMinute: number;

  @Field(() => Int)
  effectiveMaxTokensPerDay: number;

  @Field(() => Float, { nullable: true })
  monthlyBudgetUsd: number | null;

  @Field(() => Float)
  currentMonthCostUsd: number;

  @Field(() => Float)
  currentDayTokensUsed: number;

  @Field(() => Int)
  totalToolOverrides: number;

  @Field(() => [ToolPermission])
  toolPermissions: ToolPermission[];
}

// --- Audit Log ---

@ObjectType()
export class AuditLogEntry {
  @Field()
  id: string;

  @Field()
  userId: string;

  @Field()
  userFirstName: string;

  @Field()
  userLastName: string;

  @Field()
  userEmail: string;

  @Field()
  agentType: string;

  @Field({ nullable: true })
  conversationId: string;

  @Field(() => Int)
  inputTokens: number;

  @Field(() => Int)
  outputTokens: number;

  @Field(() => Float)
  estimatedCostUsd: number;

  @Field()
  model: string;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class AuditLogPage {
  @Field(() => [AuditLogEntry])
  entries: AuditLogEntry[];

  @Field(() => Int)
  totalCount: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  pageSize: number;

  @Field()
  hasMore: boolean;
}

// --- Daily Usage ---

@ObjectType()
export class DailyUsagePoint {
  @Field()
  date: string;

  @Field(() => Int)
  requests: number;

  @Field(() => Int)
  tokens: number;

  @Field(() => Float)
  costUsd: number;
}

@ObjectType()
export class UsageTrend {
  @Field(() => [DailyUsagePoint])
  dailyUsage: DailyUsagePoint[];

  @Field(() => Int)
  totalRequests: number;

  @Field(() => Int)
  totalTokens: number;

  @Field(() => Float)
  totalCostUsd: number;
}

// --- Input Types ---

@InputType()
export class UpdateGovernanceConfigInput {
  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @Field(() => Int, {
    nullable: true,
    description: 'Set to null to use global default',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxRequestsPerMinute?: number | null;

  @Field(() => Int, {
    nullable: true,
    description: 'Set to null to use global default',
  })
  @IsOptional()
  @IsInt()
  @Min(1000)
  maxTokensPerDay?: number | null;

  @Field(() => Float, {
    nullable: true,
    description: 'Monthly budget cap in USD. Set to null for unlimited.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyBudgetUsd?: number | null;
}

@InputType()
export class UpdateToolPermissionInput {
  @Field()
  @IsString()
  toolName: string;

  @Field(() => GovernanceActionType)
  @IsEnum(GovernanceActionType)
  actionType: GovernanceActionType;
}

@InputType()
export class ResetToolPermissionInput {
  @Field()
  @IsString()
  toolName: string;
}

@InputType()
export class AuditLogFilterInput {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  userId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  agentType?: string;

  @Field({ nullable: true })
  @IsOptional()
  startDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  endDate?: Date;
}
