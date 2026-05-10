import { gql } from '@apollo/client';

/**
 * Admin analytics dashboard queries.
 * All queries are admin-only and tenant-scoped.
 */

export const ADMIN_DASHBOARD_QUERY = gql`
  query AdminDashboard {
    adminDashboard {
      tenantStats {
        totalUsers
        activeUsers
        totalCourses
        activeSections
        totalEnrollments
        activeEnrollments
      }
      userStats {
        totalUsers
        activeUsers
        newUsersThisMonth
        roleDistribution {
          role
          count
        }
      }
      gradeStats {
        averageScore
        medianScore
        totalSubmissions
        gradedSubmissions
        ungradedSubmissions
        distribution {
          grade
          count
          percentage
        }
      }
      submissionMetrics {
        totalAssignments
        totalSubmissions
        submissionRate
        pendingGrading
        avgGradingTurnaroundHours
      }
      aiUsageSummary {
        totalConversations
        totalMessages
        totalTokens
        totalCostUsd
        uniqueUsers
      }
      aiAgentUsage {
        agentType
        conversations
        messages
        totalTokens
        costUsd
      }
      topCourses {
        courseId
        courseCode
        courseTitle
        sections
        enrollments
        averageGrade
      }
      atRiskStudents {
        userId
        firstName
        lastName
        email
        averageScore
        missedAssignments
        enrolledSections
      }
    }
  }
`;

export const TENANT_STATS_QUERY = gql`
  query TenantStats {
    tenantStats {
      totalUsers
      activeUsers
      totalCourses
      activeSections
      totalEnrollments
      activeEnrollments
    }
  }
`;

export const USER_STATS_QUERY = gql`
  query UserStats {
    userStats {
      totalUsers
      activeUsers
      newUsersThisMonth
      roleDistribution {
        role
        count
      }
    }
  }
`;

export const GRADE_STATS_QUERY = gql`
  query GradeStats {
    gradeStats {
      averageScore
      medianScore
      totalSubmissions
      gradedSubmissions
      ungradedSubmissions
      distribution {
        grade
        count
        percentage
      }
    }
  }
`;

export const AI_USAGE_SUMMARY_QUERY = gql`
  query AiUsageSummary {
    aiUsageSummary {
      totalConversations
      totalMessages
      totalTokens
      totalCostUsd
      uniqueUsers
    }
  }
`;

export const AT_RISK_STUDENTS_QUERY = gql`
  query AtRiskStudents($threshold: Int, $limit: Int) {
    atRiskStudents(threshold: $threshold, limit: $limit) {
      userId
      firstName
      lastName
      email
      averageScore
      missedAssignments
      enrolledSections
    }
  }
`;
