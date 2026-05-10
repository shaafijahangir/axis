import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

/**
 * Analytics DTO types for admin dashboard.
 *
 * WHY: Admins need institution-wide metrics to understand platform health,
 * report to stakeholders, and identify at-risk students or overloaded instructors.
 */

// --- Tenant Overview ---

@ObjectType()
export class TenantStats {
  @Field(() => Int)
  totalUsers: number;

  @Field(() => Int)
  activeUsers: number;

  @Field(() => Int)
  totalCourses: number;

  @Field(() => Int)
  activeSections: number;

  @Field(() => Int)
  totalEnrollments: number;

  @Field(() => Int)
  activeEnrollments: number;
}

@ObjectType()
export class UserRoleCount {
  @Field()
  role: string;

  @Field(() => Int)
  count: number;
}

@ObjectType()
export class UserStats {
  @Field(() => Int)
  totalUsers: number;

  @Field(() => Int)
  activeUsers: number;

  @Field(() => Int)
  newUsersThisMonth: number;

  @Field(() => [UserRoleCount])
  roleDistribution: UserRoleCount[];
}

// --- Academic Performance ---

@ObjectType()
export class GradeDistribution {
  @Field()
  grade: string;

  @Field(() => Int)
  count: number;

  @Field(() => Float)
  percentage: number;
}

@ObjectType()
export class GradeStats {
  @Field(() => Float)
  averageScore: number;

  @Field(() => Float, { nullable: true })
  medianScore: number | null;

  @Field(() => Int)
  totalSubmissions: number;

  @Field(() => Int)
  gradedSubmissions: number;

  @Field(() => Int)
  ungradedSubmissions: number;

  @Field(() => [GradeDistribution])
  distribution: GradeDistribution[];
}

@ObjectType()
export class SubmissionMetrics {
  @Field(() => Int)
  totalAssignments: number;

  @Field(() => Int)
  totalSubmissions: number;

  @Field(() => Float)
  submissionRate: number;

  @Field(() => Int)
  pendingGrading: number;

  @Field(() => Float, { nullable: true })
  avgGradingTurnaroundHours: number | null;
}

@ObjectType()
export class AtRiskStudent {
  @Field()
  userId: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field()
  email: string;

  @Field(() => Float)
  averageScore: number;

  @Field(() => Int)
  missedAssignments: number;

  @Field(() => Int)
  enrolledSections: number;
}

// --- AI Usage ---

@ObjectType()
export class AiUsageSummary {
  @Field(() => Int)
  totalConversations: number;

  @Field(() => Int)
  totalMessages: number;

  @Field(() => Int)
  totalTokens: number;

  @Field(() => Float)
  totalCostUsd: number;

  @Field(() => Int)
  uniqueUsers: number;
}

@ObjectType()
export class AiAgentUsage {
  @Field()
  agentType: string;

  @Field(() => Int)
  conversations: number;

  @Field(() => Int)
  messages: number;

  @Field(() => Int)
  totalTokens: number;

  @Field(() => Float)
  costUsd: number;
}

@ObjectType()
export class AiUsageByRole {
  @Field()
  role: string;

  @Field(() => Int)
  users: number;

  @Field(() => Int)
  conversations: number;

  @Field(() => Float)
  costUsd: number;
}

// --- Time Series ---

@ObjectType()
export class TimeSeriesDataPoint {
  @Field()
  date: string;

  @Field(() => Float)
  value: number;
}

@ObjectType()
export class EnrollmentTrends {
  @Field(() => [TimeSeriesDataPoint])
  newEnrollments: TimeSeriesDataPoint[];

  @Field(() => [TimeSeriesDataPoint])
  completedEnrollments: TimeSeriesDataPoint[];

  @Field(() => [TimeSeriesDataPoint])
  droppedEnrollments: TimeSeriesDataPoint[];
}

// --- Course Analytics ---

@ObjectType()
export class CourseStats {
  @Field()
  courseId: string;

  @Field()
  courseCode: string;

  @Field()
  courseTitle: string;

  @Field(() => Int)
  sections: number;

  @Field(() => Int)
  enrollments: number;

  @Field(() => Float, { nullable: true })
  averageGrade: number | null;
}

// --- Complete Dashboard Response ---

@ObjectType()
export class AdminDashboard {
  @Field(() => TenantStats)
  tenantStats: TenantStats;

  @Field(() => UserStats)
  userStats: UserStats;

  @Field(() => GradeStats)
  gradeStats: GradeStats;

  @Field(() => SubmissionMetrics)
  submissionMetrics: SubmissionMetrics;

  @Field(() => AiUsageSummary)
  aiUsageSummary: AiUsageSummary;

  @Field(() => [AiAgentUsage])
  aiAgentUsage: AiAgentUsage[];

  @Field(() => [CourseStats])
  topCourses: CourseStats[];

  @Field(() => [AtRiskStudent])
  atRiskStudents: AtRiskStudent[];
}
