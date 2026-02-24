/**
 * Grades tab — per-course grade summary, then per-assignment breakdown on expand.
 * WHY: Students check grades constantly. This is one of the top 3 reasons they open the app.
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

interface Submission {
  id: string;
  status: string;
  score: number | null;
  submittedAt: string | null;
  assignment: {
    id: string;
    title: string;
    points: number | null;
    dueAt: string | null;
  };
}

interface GradeSection {
  id: string;
  section: {
    id: string;
    name: string;
    course: { id: string; code: string; title: string };
  };
  submissions: Submission[];
}

function scoreDisplay(score: number | null, points: number | null): string {
  if (score === null) return '—';
  if (points) return `${score} / ${points}`;
  return `${score}`;
}

function scorePercent(
  score: number | null,
  points: number | null,
): number | null {
  if (score === null || !points) return null;
  return Math.round((score / points) * 100);
}

function courseAverage(submissions: Submission[]): string {
  const graded = submissions.filter((s) => s.score !== null);
  if (graded.length === 0) return '—';
  const earned = graded.reduce((sum, s) => sum + (s.score ?? 0), 0);
  const possible = graded.reduce(
    (sum, s) => sum + (s.assignment.points ?? 0),
    0,
  );
  if (!possible) return '—';
  return `${Math.round((earned / possible) * 100)}%`;
}

function SubmissionRow({ sub }: { sub: Submission }) {
  const pct = scorePercent(sub.score, sub.assignment.points);

  return (
    <View style={styles.subRow}>
      <View style={styles.subLeft}>
        <Text style={styles.subTitle} numberOfLines={1}>
          {sub.assignment.title}
        </Text>
        <Text style={styles.subStatus}>{sub.status.toLowerCase()}</Text>
      </View>
      <View style={styles.subRight}>
        <Text style={styles.subScore}>
          {scoreDisplay(sub.score, sub.assignment.points)}
        </Text>
        {pct !== null && (
          <Text
            style={[
              styles.subPct,
              pct >= 80
                ? { color: '#16a34a' }
                : pct >= 60
                  ? { color: '#f59e0b' }
                  : { color: '#ef4444' },
            ]}
          >
            {pct}%
          </Text>
        )}
      </View>
    </View>
  );
}

export default function GradesScreen() {
  const { data, loading, refetch } = useQuery<{
    myEnrollments: GradeSection[];
  }>(MY_GRADES_QUERY, { fetchPolicy: 'cache-and-network' });

  const sections =
    data?.myEnrollments
      .filter((e: GradeSection) => e.submissions && e.submissions.length > 0)
      .map((e: GradeSection) => ({
        key: e.id,
        title: `${e.section.course.code} — ${e.section.course.title}`,
        average: courseAverage(e.submissions),
        data: e.submissions,
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
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <SubmissionRow sub={item} />}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle} numberOfLines={1}>
            {section.title}
          </Text>
          <Text style={styles.sectionAvg}>Avg: {section.average}</Text>
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
    gap: 2,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
  },
  subStatus: {
    fontSize: 12,
    color: '#94a3b8',
    textTransform: 'capitalize',
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
