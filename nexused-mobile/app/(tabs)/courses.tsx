/**
 * Courses tab — lists enrolled courses with status badges.
 * Tap → course detail (timeline + assignments).
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
import { useQuery } from '@apollo/client/react';
import { router } from 'expo-router';
import { MY_COURSES_QUERY } from '../../src/graphql/queries';

interface Enrollment {
  id: string;
  status: string;
  section: {
    id: string;
    name: string;
    course: {
      id: string;
      code: string;
      title: string;
      description: string | null;
    };
    instructor: {
      firstName: string;
      lastName: string;
    };
  };
}

function statusBadgeStyle(status: string) {
  switch (status) {
    case 'ACTIVE':
      return { bg: '#dcfce7', text: '#16a34a' };
    case 'COMPLETED':
      return { bg: '#dbeafe', text: '#2563eb' };
    case 'DROPPED':
      return { bg: '#fee2e2', text: '#dc2626' };
    default:
      return { bg: '#f1f5f9', text: '#64748b' };
  }
}

function EnrollmentCard({ item }: { item: Enrollment }) {
  const badge = statusBadgeStyle(item.status);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        router.push(
          `/courses/${item.section.course.id}?sectionId=${item.section.id}`,
        )
      }
      activeOpacity={0.75}
    >
      <View style={styles.cardTop}>
        <View style={styles.codeRow}>
          <Text style={styles.code}>{item.section.course.code}</Text>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>
              {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {item.section.course.title}
        </Text>
        <Text style={styles.instructor}>
          {item.section.instructor.firstName} {item.section.instructor.lastName}
        </Text>
      </View>

      {item.section.course.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {item.section.course.description}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

export default function CoursesScreen() {
  const { data, loading, refetch } = useQuery<{
    myEnrollments: Enrollment[];
  }>(MY_COURSES_QUERY, { fetchPolicy: 'cache-and-network' });

  const enrollments = (data?.myEnrollments ?? []).filter(
    (e: Enrollment) => e.status === 'ACTIVE',
  );

  if (loading && enrollments.length === 0) {
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
      data={enrollments}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <EnrollmentCard item={item} />}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => refetch()}
          tintColor="#0f172a"
        />
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No active courses</Text>
          <Text style={styles.emptyBody}>
            You aren&apos;t enrolled in any courses yet.
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTop: {
    gap: 4,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  code: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    lineHeight: 22,
  },
  instructor: {
    fontSize: 13,
    color: '#64748b',
  },
  description: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
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
  },
});
