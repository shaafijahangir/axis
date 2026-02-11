'use client';

import { useQuery } from '@apollo/client/react';
import { ADMIN_DASHBOARD_QUERY } from '@/lib/graphql/queries/analytics';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  BookOpen,
  GraduationCap,
  ClipboardCheck,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  DollarSign,
} from 'lucide-react';

interface AdminDashboard {
  tenantStats: {
    totalUsers: number;
    activeUsers: number;
    totalCourses: number;
    activeSections: number;
    totalEnrollments: number;
    activeEnrollments: number;
  };
  userStats: {
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
    roleDistribution: Array<{ role: string; count: number }>;
  };
  gradeStats: {
    averageScore: number;
    medianScore: number | null;
    totalSubmissions: number;
    gradedSubmissions: number;
    ungradedSubmissions: number;
    distribution: Array<{ grade: string; count: number; percentage: number }>;
  };
  submissionMetrics: {
    totalAssignments: number;
    totalSubmissions: number;
    submissionRate: number;
    pendingGrading: number;
    avgGradingTurnaroundHours: number | null;
  };
  aiUsageSummary: {
    totalConversations: number;
    totalMessages: number;
    totalTokens: number;
    totalCostUsd: number;
    uniqueUsers: number;
  };
  aiAgentUsage: Array<{
    agentType: string;
    conversations: number;
    messages: number;
    totalTokens: number;
    costUsd: number;
  }>;
  topCourses: Array<{
    courseId: string;
    courseCode: string;
    courseTitle: string;
    sections: number;
    enrollments: number;
    averageGrade: number | null;
  }>;
  atRiskStudents: Array<{
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    averageScore: number;
    missedAssignments: number;
    enrolledSections: number;
  }>;
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <TrendingUp className="h-3 w-3" />
            {trend.value > 0 ? '+' : ''}
            {trend.value} {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function GradeDistributionBar({
  distribution,
}: {
  distribution: Array<{ grade: string; count: number; percentage: number }>;
}) {
  const gradeColors: Record<string, string> = {
    A: 'bg-green-500',
    B: 'bg-blue-500',
    C: 'bg-yellow-500',
    D: 'bg-orange-500',
    F: 'bg-red-500',
  };

  return (
    <div className="space-y-2">
      <div className="flex h-4 rounded-full overflow-hidden">
        {distribution.map(({ grade, percentage }) => (
          <div
            key={grade}
            className={`${gradeColors[grade] || 'bg-gray-400'}`}
            style={{ width: `${percentage}%` }}
            title={`${grade}: ${percentage.toFixed(1)}%`}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        {distribution.map(({ grade, percentage }) => (
          <span key={grade} className="flex items-center gap-1">
            <span
              className={`w-2 h-2 rounded-full ${gradeColors[grade] || 'bg-gray-400'}`}
            />
            {grade}: {percentage.toFixed(0)}%
          </span>
        ))}
      </div>
    </div>
  );
}

function RoleDistributionChart({
  roles,
}: {
  roles: Array<{ role: string; count: number }>;
}) {
  const total = roles.reduce((sum, r) => sum + r.count, 0);
  const roleLabels: Record<string, string> = {
    STUDENT: 'Students',
    INSTRUCTOR: 'Instructors',
    ADMIN: 'Admins',
    TA: 'TAs',
    PARENT: 'Parents',
  };
  const roleColors: Record<string, string> = {
    STUDENT: 'bg-blue-500',
    INSTRUCTOR: 'bg-purple-500',
    ADMIN: 'bg-red-500',
    TA: 'bg-green-500',
    PARENT: 'bg-orange-500',
  };

  return (
    <div className="space-y-3">
      {roles.map(({ role, count }) => {
        const percentage = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={role} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{roleLabels[role] || role}</span>
              <span className="text-muted-foreground">
                {count} ({percentage.toFixed(0)}%)
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${roleColors[role] || 'bg-gray-500'}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatAgentName(agentType: string): string {
  const names: Record<string, string> = {
    'study-coach': 'Study Coach',
    'feedback-copilot': 'Feedback Copilot',
  };
  return names[agentType] || agentType;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { data, loading, error } = useQuery<{ adminDashboard: AdminDashboard }>(
    ADMIN_DASHBOARD_QUERY,
    { fetchPolicy: 'cache-and-network' },
  );

  if (loading && !data) {
    return (
      <div className="container py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Institution-wide metrics and insights
          </p>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Failed to load analytics data: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dashboard = data?.adminDashboard;
  if (!dashboard) return null;

  const {
    tenantStats,
    userStats,
    gradeStats,
    submissionMetrics,
    aiUsageSummary,
    aiAgentUsage,
    topCourses,
    atRiskStudents,
  } = dashboard;

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Institution-wide metrics and insights (last 30 days for AI data)
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={tenantStats.totalUsers}
          description={`${tenantStats.activeUsers} active`}
          icon={Users}
          trend={
            userStats.newUsersThisMonth > 0
              ? { value: userStats.newUsersThisMonth, label: 'this month' }
              : undefined
          }
        />
        <StatCard
          title="Active Sections"
          value={tenantStats.activeSections}
          description={`${tenantStats.totalCourses} courses`}
          icon={BookOpen}
        />
        <StatCard
          title="Enrollments"
          value={tenantStats.activeEnrollments}
          description={`${tenantStats.totalEnrollments} total`}
          icon={GraduationCap}
        />
        <StatCard
          title="Pending Grading"
          value={submissionMetrics.pendingGrading}
          description={`${submissionMetrics.totalSubmissions} total submissions`}
          icon={ClipboardCheck}
        />
      </div>

      {/* User & Grade Distribution */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Distribution</CardTitle>
            <CardDescription>Users by role</CardDescription>
          </CardHeader>
          <CardContent>
            <RoleDistributionChart roles={userStats.roleDistribution} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Grade Distribution</CardTitle>
            <CardDescription>
              Avg: {gradeStats.averageScore.toFixed(1)}%
              {gradeStats.medianScore !== null &&
                ` | Median: ${gradeStats.medianScore.toFixed(1)}%`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GradeDistributionBar distribution={gradeStats.distribution} />
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Graded:</span>{' '}
                {gradeStats.gradedSubmissions}
              </div>
              <div>
                <span className="text-muted-foreground">Ungraded:</span>{' '}
                {gradeStats.ungradedSubmissions}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Usage */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="AI Conversations"
          value={aiUsageSummary.totalConversations}
          description={`${aiUsageSummary.uniqueUsers} unique users`}
          icon={Sparkles}
        />
        <StatCard
          title="AI Messages"
          value={aiUsageSummary.totalMessages}
          icon={Sparkles}
        />
        <StatCard
          title="AI Tokens"
          value={
            aiUsageSummary.totalTokens >= 1000000
              ? `${(aiUsageSummary.totalTokens / 1000000).toFixed(1)}M`
              : aiUsageSummary.totalTokens >= 1000
                ? `${(aiUsageSummary.totalTokens / 1000).toFixed(1)}K`
                : aiUsageSummary.totalTokens
          }
          icon={Sparkles}
        />
        <StatCard
          title="AI Cost"
          value={`$${aiUsageSummary.totalCostUsd.toFixed(2)}`}
          description="Last 30 days"
          icon={DollarSign}
        />
      </div>

      {/* AI Agent Breakdown */}
      {aiAgentUsage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI Agent Usage</CardTitle>
            <CardDescription>Breakdown by agent type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Agent</th>
                    <th className="text-right py-2">Conversations</th>
                    <th className="text-right py-2">Messages</th>
                    <th className="text-right py-2">Tokens</th>
                    <th className="text-right py-2">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {aiAgentUsage.map((agent) => (
                    <tr key={agent.agentType} className="border-b">
                      <td className="py-2 font-medium">
                        {formatAgentName(agent.agentType)}
                      </td>
                      <td className="text-right py-2">{agent.conversations}</td>
                      <td className="text-right py-2">{agent.messages}</td>
                      <td className="text-right py-2">
                        {agent.totalTokens.toLocaleString()}
                      </td>
                      <td className="text-right py-2">
                        ${agent.costUsd.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Courses & At-Risk Students */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Courses</CardTitle>
            <CardDescription>By enrollment count</CardDescription>
          </CardHeader>
          <CardContent>
            {topCourses.length === 0 ? (
              <p className="text-muted-foreground text-sm">No courses yet</p>
            ) : (
              <div className="space-y-3">
                {topCourses.map((course) => (
                  <div
                    key={course.courseId}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{course.courseCode}</p>
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {course.courseTitle}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p>{course.enrollments} enrolled</p>
                      <p className="text-muted-foreground">
                        {course.sections} section
                        {course.sections !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              At-Risk Students
            </CardTitle>
            <CardDescription>Average score below 60%</CardDescription>
          </CardHeader>
          <CardContent>
            {atRiskStudents.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No at-risk students identified
              </p>
            ) : (
              <div className="space-y-3">
                {atRiskStudents.map((student) => (
                  <div
                    key={student.userId}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {student.email}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p
                        className={
                          student.averageScore < 40
                            ? 'text-red-600 font-medium'
                            : 'text-orange-600'
                        }
                      >
                        {student.averageScore.toFixed(1)}% avg
                      </p>
                      <p className="text-muted-foreground">
                        {student.enrolledSections} section
                        {student.enrolledSections !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Submission Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Submission Metrics</CardTitle>
          <CardDescription>Assignment and grading performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-2xl font-bold">
                {submissionMetrics.totalAssignments}
              </p>
              <p className="text-sm text-muted-foreground">Total Assignments</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {submissionMetrics.totalSubmissions}
              </p>
              <p className="text-sm text-muted-foreground">Total Submissions</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {submissionMetrics.submissionRate.toFixed(0)}%
              </p>
              <p className="text-sm text-muted-foreground">Submission Rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {submissionMetrics.avgGradingTurnaroundHours
                  ? `${submissionMetrics.avgGradingTurnaroundHours.toFixed(1)}h`
                  : 'N/A'}
              </p>
              <p className="text-sm text-muted-foreground">
                Avg Grading Turnaround
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
