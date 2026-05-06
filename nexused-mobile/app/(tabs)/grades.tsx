/**
 * Grades tab — per-course grade summary with per-assignment breakdown.
 * Uses myGrades: [CourseSectionGrades!]! which returns pre-computed averages.
 */
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@apollo/client/react';
import { MY_GRADES_QUERY } from '../../src/graphql/queries';

interface GradedAssignment {
  assignmentId: string;
  assignmentTitle: string;
  score: number;
  pointsPossible: number;
  percentage: number;
  feedback: string | null;
  gradedAt: string;
}

interface CourseSectionGrades {
  courseCode: string;
  courseTitle: string;
  courseId: string;
  sectionId: string;
  overallPercentage: number;
  totalPointsEarned: number;
  totalPointsPossible: number;
  assignments: GradedAssignment[];
}

function letterGrade(pct: number): string {
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 70) return 'C';
  if (pct >= 60) return 'D';
  return 'F';
}

function gradeColor(pct: number): string {
  if (pct >= 80) return '#16a34a';
  if (pct >= 60) return '#f59e0b';
  return '#ef4444';
}

function AssignmentRow({ item }: { item: GradedAssignment }) {
  const color = gradeColor(item.percentage);

  return (
    <View style={styles.subRow}>
      <View style={styles.subLeft}>
        <Text style={styles.subTitle} numberOfLines={1}>
          {item.assignmentTitle}
        </Text>
      </View>
      <View style={styles.subRight}>
        <Text style={styles.subScore}>
          {item.score} / {item.pointsPossible}
        </Text>
        <Text style={[styles.subPct, { color }]}>
          {Math.round(item.percentage)}%
        </Text>
      </View>
    </View>
  );
}

export default function GradesScreen() {
  const { data, loading, refetch } = useQuery<{
    myGrades: CourseSectionGrades[];
  }>(MY_GRADES_QUERY, { fetchPolicy: 'cache-and-network' });

  const sections =
    data?.myGrades
      .filter((g) => g.assignments.length > 0)
      .map((g) => ({
        key: g.sectionId,
        title: `${g.courseCode} — ${g.courseTitle}`,
        average: `${Math.round(g.overallPercentage)}% (${letterGrade(g.overallPercentage)})`,
        data: g.assignments,
      })) ?? [];

  if (loading && sections.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  return (
    <SectionList
      style={styles.list}
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={(item) => item.assignmentId}
      renderItem={({ item }) => <AssignmentRow item={item} />}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle} numberOfLines={1}>
            {section.title}
          </Text>
          <Text style={styles.sectionAvg}>{section.average}</Text>
        </View>
      )}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => refetch()}
          tintColor="#0f172a"
        />
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No grades yet</Text>
          <Text style={styles.emptyBody}>
            Grades will appear here after your instructor posts them.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    flex: 1,
    marginRight: 8,
  },
  sectionAvg: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  subLeft: {
    flex: 1,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
  },
  subRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  subScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  subPct: {
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0f172a',
  },
  emptyBody: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
  },
});
