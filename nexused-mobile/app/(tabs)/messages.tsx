/**
 * Messages tab — conversation list with unread counts.
 * Tap → full thread (deep-link to messages/[id]).
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
import { MY_CONVERSATIONS_QUERY } from '../../src/graphql/queries';

interface Conversation {
  id: string;
  title: string | null;
  lastMessage: {
    id: string;
    body: string;
    createdAt: string;
    sender: { firstName: string; lastName: string };
  } | null;
  otherParticipants: { id: string; firstName: string; lastName: string }[];
  unreadCount: number;
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = diffMs / 3_600_000;
  if (diffH < 24) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function ConversationRow({ item }: { item: Conversation }) {
  const name =
    item.title ??
    item.otherParticipants
      .slice(0, 2)
      .map((p) => `${p.firstName} ${p.lastName}`)
      .join(', ');

  const initials = item.otherParticipants[0]
    ? `${item.otherParticipants[0].firstName[0]}${item.otherParticipants[0].lastName[0]}`
    : '?';

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/messages/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials.toUpperCase()}</Text>
      </View>

      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text
            style={[styles.name, item.unreadCount > 0 && styles.nameBold]}
            numberOfLines={1}
          >
            {name}
          </Text>
          {item.lastMessage && (
            <Text style={styles.time}>
              {formatTime(item.lastMessage.createdAt)}
            </Text>
          )}
        </View>

        <View style={styles.rowBottom}>
          <Text
            style={[styles.preview, item.unreadCount > 0 && styles.previewBold]}
            numberOfLines={1}
          >
            {item.lastMessage?.body ?? 'No messages yet'}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MessagesScreen() {
  const { data, loading, refetch } = useQuery<{
    myConversations: Conversation[];
  }>(MY_CONVERSATIONS_QUERY, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 10_000,
  });

  const conversations = data?.myConversations ?? [];

  if (loading && conversations.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={conversations}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ConversationRow item={item} />}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => refetch()}
          tintColor="#0f172a"
        />
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No messages</Text>
          <Text style={styles.emptyBody}>
            Messages from instructors and classmates will appear here.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  rowContent: {
    flex: 1,
    gap: 3,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 15,
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  nameBold: {
    fontWeight: '600',
  },
  time: {
    fontSize: 12,
    color: '#94a3b8',
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  preview: {
    fontSize: 14,
    color: '#94a3b8',
    flex: 1,
    marginRight: 8,
  },
  previewBold: {
    color: '#475569',
    fontWeight: '500',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  separator: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginLeft: 72,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 64,
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
