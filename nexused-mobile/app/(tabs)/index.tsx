/**
 * Home screen — AI-prioritized feed. Same data source as the web feed.
 * Pull-to-refresh. Tap to navigate to the relevant resource.
 *
 * WHY: The feed IS the home screen. Students open the app to see
 * "what matters right now", not to navigate a folder tree.
 */
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@apollo/client/react';
import { FEED_QUERY } from '../../src/graphql/queries';
import { useAuth } from '../../src/hooks/useAuth';

interface FeedItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  subtitle: string | null;
  dueAt: string | null;
  courseTitle: string;
  courseCode: string;
  sectionId: string;
  assignmentId: string | null;
  timestamp: string;
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    DEADLINE: 'Assignment due',
    GRADE_POSTED: 'Grade posted',
    ANNOUNCEMENT: 'Announcement',
    COURSE_UPDATE: 'Course update',
    ENROLLMENT_UPDATE: 'Enrollment update',
  };
  return map[type] ?? type;
}

function typeColor(type: string): string {
  switch (type) {
    case 'DEADLINE':
      return '#f59e0b';
    case 'GRADE_POSTED':
      return '#16a34a';
    case 'ANNOUNCEMENT':
      return '#3b82f6';
    default:
      return '#94a3b8';
  }
}

function formatDue(dueAt: string | null): string | null {
  if (!dueAt) return null;
  const d = new Date(dueAt);
  const now = new Date();
  const diffH = (d.getTime() - now.getTime()) / 3_600_000;
  if (diffH < 0) return 'Overdue';
  if (diffH < 1) return 'Due in < 1 hour';
  if (diffH < 24) return `Due in ${Math.round(diffH)}h`;
  const days = Math.ceil(diffH / 24);
  return `Due in ${days}d`;
}

function FeedCard({ item }: { item: FeedItem }) {
  const due = formatDue(item.dueAt);
  const color = typeColor(item.type);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={[styles.typeLabel, { color }]}>
          {typeLabel(item.type)}
        </Text>
        <Text style={styles.course}>{item.courseCode}</Text>
      </View>

      <Text style={styles.cardTitle} numberOfLines={2}>
        {item.title}
      </Text>

      {item.subtitle ? (
        <Text style={styles.cardBody} numberOfLines={2}>
          {item.subtitle}
        </Text>
      ) : item.body ? (
        <Text style={styles.cardBody} numberOfLines={2}>
          {item.body}
        </Text>
      ) : null}

      <View style={styles.cardFooter}>
        <Text style={styles.courseLabel} numberOfLines={1}>
          {item.courseTitle}
        </Text>
        {due ? (
          <Text
            style={[styles.dueLabel, due === 'Overdue' && { color: '#ef4444' }]}
          >
            {due}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { data, loading, refetch } = useQuery<{ studentFeed: FeedItem[] }>(
    FEED_QUERY,
    { fetchPolicy: 'network-only' },
  );

  const items = data?.studentFeed ?? [];

  if (loading && items.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <FeedCard item={item} />}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => refetch()}
          tintColor="#0f172a"
        />
      }
      ListHeaderComponent={
        <Text style={styles.greeting}>
          Good
          {new Date().getHours() < 12
            ? ' morning'
            : new Date().getHours() < 17
              ? ' afternoon'
              : ' evening'}
          , {user?.firstName ?? 'there'}.
        </Text>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>You&apos;re all caught up</Text>
          <Text style={styles.emptyBody}>
            No pending items right now. Check back when assignments are posted.
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
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  course: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    lineHeight: 21,
  },
  cardBody: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  courseLabel: {
    fontSize: 12,
    color: '#94a3b8',
    flex: 1,
  },
  dueLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#f59e0b',
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
