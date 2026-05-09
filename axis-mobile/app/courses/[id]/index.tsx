/**
 * Course detail screen — unified timeline (assignments + content + announcements).
 * Backend returns flat TimelineEntry type (sectionTimeline query), not a union.
 *
 * WHY: The timeline is the core course UX. Students don't navigate folders —
 * they scroll a chronological stream of what's happening in the course.
 */
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useQuery } from '@apollo/client/react';
import { COURSE_TIMELINE_QUERY } from '../../../src/graphql/queries';

// TimelineEntryType enum: ANNOUNCEMENT | ASSIGNMENT | CONTENT
interface TimelineEntry {
  id: string;
  type: string;
  title: string;
  body: string | null;
  dueAt: string | null;
  pointsPossible: number | null;
  assignmentType: string | null;
  authorName: string | null;
  pinned: boolean;
  publishedAt: string | null;
  timestamp: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
}

function formatDue(dueAt: string | null): string {
  if (!dueAt) return '';
  const d = new Date(dueAt);
  const now = new Date();
  const diffH = (d.getTime() - now.getTime()) / 3_600_000;
  if (diffH < 0) return `Overdue · ${formatDate(dueAt)}`;
  if (diffH < 24) return `Due today`;
  return `Due ${formatDate(dueAt)}`;
}

function entryColor(type: string): string {
  switch (type) {
    case 'ASSIGNMENT':
      return '#f59e0b';
    case 'ANNOUNCEMENT':
      return '#3b82f6';
    case 'CONTENT':
      return '#10b981';
    default:
      return '#94a3b8';
  }
}

function entryLabel(type: string): string {
  switch (type) {
    case 'ASSIGNMENT':
      return 'Assignment';
    case 'ANNOUNCEMENT':
      return 'Announcement';
    case 'CONTENT':
      return 'Content';
    default:
      return type;
  }
}

function TimelineCard({
  item,
  sectionId,
  courseId,
}: {
  item: TimelineEntry;
  sectionId: string;
  courseId: string;
}) {
  const color = entryColor(item.type);
  const label = entryLabel(item.type);
  const isAssignment = item.type === 'ASSIGNMENT';
  const due = isAssignment ? formatDue(item.dueAt) : '';
  const date = !isAssignment
    ? formatDate(item.publishedAt ?? item.timestamp)
    : '';

  const handlePress = () => {
    if (isAssignment) {
      router.push(
        `/courses/${courseId}/assignment/${item.id}?sectionId=${sectionId}`,
      );
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={isAssignment ? handlePress : undefined}
      activeOpacity={isAssignment ? 0.75 : 1}
    >
      <View style={styles.cardLeft}>
        <View style={[styles.typeDot, { backgroundColor: color }]} />
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.typeLabel, { color }]}>{label}</Text>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>

        {item.body ? (
          <Text style={styles.cardSub} numberOfLines={2}>
            {item.body}
          </Text>
        ) : null}

        <View style={styles.cardMeta}>
          {due ? (
            <Text
              style={[
                styles.due,
                due.startsWith('Overdue') && { color: '#ef4444' },
              ]}
            >
              {due}
            </Text>
          ) : null}
          {date ? <Text style={styles.date}>{date}</Text> : null}
          {isAssignment && item.pointsPossible ? (
            <Text style={styles.points}>{item.pointsPossible} pts</Text>
          ) : null}
        </View>
      </View>
      {isAssignment && <Text style={styles.chevron}>›</Text>}
    </TouchableOpacity>
  );
}

export default function CourseDetailScreen() {
  const { id, sectionId } = useLocalSearchParams<{
    id: string;
    sectionId: string;
  }>();

  const { data, loading, refetch } = useQuery<{
    sectionTimeline: TimelineEntry[];
  }>(COURSE_TIMELINE_QUERY, {
    variables: { sectionId },
    skip: !sectionId,
    fetchPolicy: 'cache-and-network',
  });

  const items = data?.sectionTimeline ?? [];

  return (
    <>
      <Stack.Screen options={{ title: 'Course Timeline' }} />
      {loading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0f172a" />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.content}
          data={items}
          keyExtractor={(item, i) => `${item.type}-${item.id}-${i}`}
          renderItem={({ item }) => (
            <TimelineCard
              item={item}
              sectionId={sectionId ?? ''}
              courseId={id ?? ''}
            />
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
              <Text style={styles.emptyTitle}>No content yet</Text>
              <Text style={styles.emptyBody}>
                Your instructor hasn&apos;t posted anything yet.
              </Text>
            </View>
          }
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    gap: 10,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardLeft: {
    paddingTop: 4,
  },
  typeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 2,
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    lineHeight: 21,
  },
  cardSub: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  due: {
    fontSize: 12,
    fontWeight: '500',
    color: '#f59e0b',
  },
  date: {
    fontSize: 12,
    color: '#94a3b8',
  },
  points: {
    fontSize: 12,
    color: '#94a3b8',
  },
  chevron: {
    fontSize: 22,
    color: '#cbd5e1',
    alignSelf: 'center',
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
