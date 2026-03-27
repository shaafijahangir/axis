import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  User,
  UserStatus,
  Course,
  CourseSection,
  SectionStatus,
  Enrollment,
  EnrollmentStatus,
  Assignment,
  Submission,
} from '../../database/entities';
import { AiConversation } from '../ai/entities/ai-conversation.entity';
import { AiUsageLog } from '../ai/entities/ai-usage-log.entity';
import {
  TenantStats,
  UserStats,
  UserRoleCount,
  GradeStats,
  GradeDistribution,
  SubmissionMetrics,
  AtRiskStudent,
  AiUsageSummary,
  AiAgentUsage,
  CourseStats,
  AdminDashboard,
} from './dto/analytics.types';

/**
 * AnalyticsService provides aggregated metrics for the admin dashboard.
 *
 * WHY: Admins need visibility into institution-wide metrics without
 * manually querying individual tables. All queries are tenant-scoped.
 *
 * PATTERN: Uses TypeORM QueryBuilder for complex aggregations.
 * All numeric values use COALESCE to handle empty results gracefully.
 */
@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Course)
    private courseRepo: Repository<Course>,
    @InjectRepository(CourseSection)
    private sectionRepo: Repository<CourseSection>,
    @InjectRepository(Enrollment)
    private enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Assignment)
    private assignmentRepo: Repository<Assignment>,
    @InjectRepository(Submission)
    private submissionRepo: Repository<Submission>,
    @InjectRepository(AiConversation)
    private aiConversationRepo: Repository<AiConversation>,
    @InjectRepository(AiUsageLog)
    private aiUsageLogRepo: Repository<AiUsageLog>,
    private dataSource: DataSource,
  ) {}

  /**
   * Get high-level tenant statistics.
   */
  async getTenantStats(tenantId: string): Promise<TenantStats> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Run all queries in parallel
    const [
      totalUsers,
      activeUsers,
      totalCourses,
      activeSections,
      totalEnrollments,
      activeEnrollments,
    ] = await Promise.all([
      this.userRepo.count({ where: { tenantId } }),
      this.userRepo.count({
        where: { tenantId, status: UserStatus.ACTIVE },
      }),
      this.courseRepo.count({ where: { tenantId } }),
      this.sectionRepo
        .createQueryBuilder('section')
        .leftJoin('section.course', 'course')
        .where('course.tenantId = :tenantId', { tenantId })
        .andWhere('section.status = :status', { status: SectionStatus.ACTIVE })
        .getCount(),
      this.enrollmentRepo.count({ where: { tenantId } }),
      this.enrollmentRepo.count({
        where: { tenantId, status: EnrollmentStatus.ACTIVE },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalCourses,
      activeSections,
      totalEnrollments,
      activeEnrollments,
    };
  }

  /**
   * Get user statistics with role distribution.
   */
  async getUserStats(tenantId: string): Promise<UserStats> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalUsers, activeUsers, newUsersThisMonth] = await Promise.all([
      this.userRepo.count({ where: { tenantId } }),
      this.userRepo.count({ where: { tenantId, status: UserStatus.ACTIVE } }),
      this.userRepo
        .createQueryBuilder('user')
        .where('user.tenantId = :tenantId', { tenantId })
        .andWhere('user.createdAt >= :date', { date: thirtyDaysAgo })
        .getCount(),
    ]);

    // Get role distribution using PostgreSQL array unnest
    const roleResults = await this.userRepo
      .createQueryBuilder('user')
      .select('unnest(user.roles)', 'role')
      .addSelect('COUNT(*)', 'count')
      .where('user.tenantId = :tenantId', { tenantId })
      .groupBy('role')
      .orderBy('count', 'DESC')
      .getRawMany<{ role: string; count: string }>();

    const roleDistribution: UserRoleCount[] = roleResults.map((r) => ({
      role: r.role,
      count: parseInt(r.count, 10),
    }));

    return {
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      roleDistribution,
    };
  }

  /**
   * Get grade statistics with distribution.
   */
  async getGradeStats(tenantId: string): Promise<GradeStats> {
    // Get aggregate stats
    const stats = await this.submissionRepo
      .createQueryBuilder('submission')
      .select('COUNT(*)', 'total')
      .addSelect('COUNT(submission.gradedAt)', 'graded')
      .addSelect('COALESCE(AVG(submission.score), 0)', 'avgScore')
      .where('submission.tenantId = :tenantId', { tenantId })
      .andWhere('submission.score IS NOT NULL')
      .getRawOne<{ total: string; graded: string; avgScore: string }>();

    const totalSubmissions = parseInt(stats?.total ?? '0', 10);
    const gradedSubmissions = parseInt(stats?.graded ?? '0', 10);
    const averageScore = parseFloat(stats?.avgScore ?? '0');

    // Get all scores for median calculation
    const allScores = await this.submissionRepo
      .createQueryBuilder('submission')
      .select('submission.score', 'score')
      .where('submission.tenantId = :tenantId', { tenantId })
      .andWhere('submission.score IS NOT NULL')
      .orderBy('submission.score', 'ASC')
      .getRawMany<{ score: string }>();

    let medianScore: number | null = null;
    if (allScores.length > 0) {
      const mid = Math.floor(allScores.length / 2);
      medianScore =
        allScores.length % 2 !== 0
          ? parseFloat(allScores[mid].score)
          : (parseFloat(allScores[mid - 1].score) +
              parseFloat(allScores[mid].score)) /
            2;
    }

    // Grade distribution (A=90-100, B=80-89, C=70-79, D=60-69, F=0-59)
    const distributionQuery = await this.submissionRepo
      .createQueryBuilder('submission')
      .leftJoin('submission.assignment', 'assignment')
      .select(
        `
        CASE
          WHEN (submission.score / NULLIF(assignment.pointsPossible, 0)) * 100 >= 90 THEN 'A'
          WHEN (submission.score / NULLIF(assignment.pointsPossible, 0)) * 100 >= 80 THEN 'B'
          WHEN (submission.score / NULLIF(assignment.pointsPossible, 0)) * 100 >= 70 THEN 'C'
          WHEN (submission.score / NULLIF(assignment.pointsPossible, 0)) * 100 >= 60 THEN 'D'
          ELSE 'F'
        END
      `,
        'grade',
      )
      .addSelect('COUNT(*)', 'count')
      .where('submission.tenantId = :tenantId', { tenantId })
      .andWhere('submission.score IS NOT NULL')
      .andWhere('assignment.pointsPossible > 0')
      .groupBy('grade')
      .getRawMany<{ grade: string; count: string }>();

    const gradeOrder = ['A', 'B', 'C', 'D', 'F'];
    const gradeMap = new Map(
      distributionQuery.map((d) => [d.grade, parseInt(d.count, 10)]),
    );
    const totalGraded = distributionQuery.reduce(
      (sum, d) => sum + parseInt(d.count, 10),
      0,
    );

    const distribution: GradeDistribution[] = gradeOrder.map((grade) => {
      const count = gradeMap.get(grade) || 0;
      return {
        grade,
        count,
        percentage: totalGraded > 0 ? (count / totalGraded) * 100 : 0,
      };
    });

    return {
      averageScore,
      medianScore,
      totalSubmissions,
      gradedSubmissions,
      ungradedSubmissions: totalSubmissions - gradedSubmissions,
      distribution,
    };
  }

  /**
   * Get submission metrics including grading backlog.
   */
  async getSubmissionMetrics(tenantId: string): Promise<SubmissionMetrics> {
    const [totalAssignments, totalSubmissions, pendingGrading, avgTurnaround] =
      await Promise.all([
        this.assignmentRepo.count({ where: { tenantId } }),
        this.submissionRepo.count({ where: { tenantId } }),
        this.submissionRepo.count({
          where: { tenantId, gradedAt: null as unknown as Date },
        }),
        this.submissionRepo
          .createQueryBuilder('submission')
          .select(
            'AVG(EXTRACT(EPOCH FROM (submission.gradedAt - submission.submittedAt)) / 3600)',
            'avgHours',
          )
          .where('submission.tenantId = :tenantId', { tenantId })
          .andWhere('submission.gradedAt IS NOT NULL')
          .getRawOne<{ avgHours: string | null }>(),
      ]);

    const avgGradingTurnaroundHours = avgTurnaround?.avgHours
      ? parseFloat(avgTurnaround.avgHours)
      : null;

    // Calculate submission rate (submissions / expected submissions)
    // Expected = assignments * active enrollments (simplified)
    const expectedSubmissions = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(DISTINCT e.userId)', 'students')
      .from(Enrollment, 'e')
      .where('e.tenantId = :tenantId', { tenantId })
      .andWhere('e.status = :status', { status: EnrollmentStatus.ACTIVE })
      .getRawOne<{ students: string }>();

    const studentCount = parseInt(expectedSubmissions?.students ?? '1', 10);
    const submissionRate =
      totalAssignments > 0
        ? (totalSubmissions / (totalAssignments * studentCount)) * 100
        : 0;

    return {
      totalAssignments,
      totalSubmissions,
      submissionRate: Math.min(submissionRate, 100),
      pendingGrading,
      avgGradingTurnaroundHours,
    };
  }

  /**
   * Get students at risk (average score < 60%).
   */
  async getAtRiskStudents(
    tenantId: string,
    threshold = 60,
    limit = 10,
  ): Promise<AtRiskStudent[]> {
    const results = await this.submissionRepo
      .createQueryBuilder('submission')
      .leftJoin('submission.user', 'user')
      .leftJoin('submission.assignment', 'assignment')
      .select('user.id', 'userId')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .addSelect('user.email', 'email')
      .addSelect(
        'AVG((submission.score / NULLIF(assignment.pointsPossible, 0)) * 100)',
        'avgScore',
      )
      .addSelect(
        `SUM(CASE WHEN submission.id IS NULL THEN 1 ELSE 0 END)`,
        'missedAssignments',
      )
      .where('submission.tenantId = :tenantId', { tenantId })
      .andWhere('submission.score IS NOT NULL')
      .groupBy('user.id')
      .addGroupBy('user.firstName')
      .addGroupBy('user.lastName')
      .addGroupBy('user.email')
      .having(
        'AVG((submission.score / NULLIF(assignment.pointsPossible, 0)) * 100) < :threshold',
        { threshold },
      )
      .orderBy('"avgScore"', 'ASC')
      .limit(limit)
      .getRawMany<{
        userId: string;
        firstName: string;
        lastName: string;
        email: string;
        avgScore: string;
        missedAssignments: string;
      }>();

    // Get enrollment counts for at-risk students
    const userIds = results.map((r) => r.userId);
    const enrollmentCounts = userIds.length
      ? await this.enrollmentRepo
          .createQueryBuilder('enrollment')
          .select('enrollment.userId', 'userId')
          .addSelect('COUNT(*)', 'count')
          .where('enrollment.userId IN (:...userIds)', { userIds })
          .andWhere('enrollment.status = :status', {
            status: EnrollmentStatus.ACTIVE,
          })
          .groupBy('enrollment.userId')
          .getRawMany<{ userId: string; count: string }>()
      : [];

    const enrollmentMap = new Map(
      enrollmentCounts.map((e) => [e.userId, parseInt(e.count, 10)]),
    );

    return results.map((r) => ({
      userId: r.userId,
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      averageScore: parseFloat(r.avgScore || '0'),
      missedAssignments: parseInt(r.missedAssignments || '0', 10),
      enrolledSections: enrollmentMap.get(r.userId) || 0,
    }));
  }

  /**
   * Get AI usage summary.
   */
  async getAiUsageSummary(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AiUsageSummary> {
    const start = startDate || new Date(0);
    const end = endDate || new Date();

    const [conversationStats, usageStats] = await Promise.all([
      this.aiConversationRepo
        .createQueryBuilder('conv')
        .select('COUNT(*)', 'totalConversations')
        .addSelect('COUNT(DISTINCT conv.userId)', 'uniqueUsers')
        .where('conv.tenantId = :tenantId', { tenantId })
        .andWhere('conv.createdAt BETWEEN :start AND :end', { start, end })
        .getRawOne<{ totalConversations: string; uniqueUsers: string }>(),
      this.aiUsageLogRepo
        .createQueryBuilder('log')
        .select(
          'COALESCE(SUM(log.inputTokens + log.outputTokens), 0)',
          'tokens',
        )
        .addSelect('COALESCE(SUM(log.estimatedCostUsd), 0)', 'cost')
        .addSelect('COUNT(*)', 'messages')
        .where('log.tenantId = :tenantId', { tenantId })
        .andWhere('log.createdAt BETWEEN :start AND :end', { start, end })
        .getRawOne<{ tokens: string; cost: string; messages: string }>(),
    ]);

    return {
      totalConversations: parseInt(
        conversationStats?.totalConversations ?? '0',
        10,
      ),
      totalMessages: parseInt(usageStats?.messages ?? '0', 10),
      totalTokens: parseInt(usageStats?.tokens ?? '0', 10),
      totalCostUsd: parseFloat(usageStats?.cost ?? '0'),
      uniqueUsers: parseInt(conversationStats?.uniqueUsers || '0', 10),
    };
  }

  /**
   * Get AI usage breakdown by agent type.
   */
  async getAiAgentUsage(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AiAgentUsage[]> {
    const start = startDate || new Date(0);
    const end = endDate || new Date();

    const results = await this.aiUsageLogRepo
      .createQueryBuilder('log')
      .select('log.agentType', 'agentType')
      .addSelect('COUNT(DISTINCT log.conversationId)', 'conversations')
      .addSelect('COUNT(*)', 'messages')
      .addSelect('SUM(log.inputTokens + log.outputTokens)', 'tokens')
      .addSelect('SUM(log.estimatedCostUsd)', 'cost')
      .where('log.tenantId = :tenantId', { tenantId })
      .andWhere('log.createdAt BETWEEN :start AND :end', { start, end })
      .groupBy('log.agentType')
      .orderBy('"tokens"', 'DESC')
      .getRawMany<{
        agentType: string | null;
        conversations: string;
        messages: string;
        tokens: string;
        cost: string;
      }>();

    return results.map((r) => ({
      agentType: r.agentType ?? 'unknown',
      conversations: parseInt(r.conversations ?? '0', 10),
      messages: parseInt(r.messages ?? '0', 10),
      totalTokens: parseInt(r.tokens ?? '0', 10),
      costUsd: parseFloat(r.cost ?? '0'),
    }));
  }

  /**
   * Get top courses by enrollment.
   */
  async getTopCourses(tenantId: string, limit = 10): Promise<CourseStats[]> {
    const results = await this.courseRepo
      .createQueryBuilder('course')
      .leftJoin('course.sections', 'section')
      .leftJoin('section.enrollments', 'enrollment')
      .leftJoin('enrollment.submissions', 'submission')
      .leftJoin('submission.assignment', 'assignment')
      .select('course.id', 'courseId')
      .addSelect('course.code', 'courseCode')
      .addSelect('course.title', 'courseTitle')
      .addSelect('COUNT(DISTINCT section.id)', 'sections')
      .addSelect('COUNT(DISTINCT enrollment.id)', 'enrollments')
      .addSelect(
        'AVG((submission.score / NULLIF(assignment.pointsPossible, 0)) * 100)',
        'avgGrade',
      )
      .where('course.tenantId = :tenantId', { tenantId })
      .groupBy('course.id')
      .addGroupBy('course.code')
      .addGroupBy('course.title')
      .orderBy('"enrollments"', 'DESC')
      .limit(limit)
      .getRawMany<{
        courseId: string;
        courseCode: string;
        courseTitle: string;
        sections: string;
        enrollments: string;
        avgGrade: string | null;
      }>();

    return results.map((r) => ({
      courseId: r.courseId,
      courseCode: r.courseCode,
      courseTitle: r.courseTitle,
      sections: parseInt(r.sections ?? '0', 10),
      enrollments: parseInt(r.enrollments ?? '0', 10),
      averageGrade: r.avgGrade ? parseFloat(r.avgGrade) : null,
    }));
  }

  /**
   * Get complete admin dashboard data.
   */
  async getAdminDashboard(tenantId: string): Promise<AdminDashboard> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      tenantStats,
      userStats,
      gradeStats,
      submissionMetrics,
      aiUsageSummary,
      aiAgentUsage,
      topCourses,
      atRiskStudents,
    ] = await Promise.all([
      this.getTenantStats(tenantId),
      this.getUserStats(tenantId),
      this.getGradeStats(tenantId),
      this.getSubmissionMetrics(tenantId),
      this.getAiUsageSummary(tenantId, thirtyDaysAgo, new Date()),
      this.getAiAgentUsage(tenantId, thirtyDaysAgo, new Date()),
      this.getTopCourses(tenantId, 5),
      this.getAtRiskStudents(tenantId, 60, 5),
    ]);

    return {
      tenantStats,
      userStats,
      gradeStats,
      submissionMetrics,
      aiUsageSummary,
      aiAgentUsage,
      topCourses,
      atRiskStudents,
    };
  }
}
