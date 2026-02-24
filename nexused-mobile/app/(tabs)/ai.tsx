/**
 * AI tab — conversation list + new conversation entry.
 * Tap → full chat thread (deep-link to ai/[id]).
 *
 * WHY: Study Coach and Feedback Copilot are core value propositions.
 * The AI tab gives students quick access to all AI conversations.
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
import { MY_AI_CONVERSATIONS_QUERY } from '../../src/graphql/queries';

interface AiConversation {
  id: string;
  title: string | null;
  agentType: string;
  createdAt: string;
  lastMessage: {
    role: string;
    content: string;
    createdAt: string;
  } | null;
}

const AGENTS = [
  {
    type: 'study_coach',
    name: 'Study Coach',
    description: 'Socratic tutor. Guides you to answers.',
  },
  {
    type: 'feedback_copilot',
    name: 'Feedback Copilot',
    description: 'Review your work and get feedback.',
  },
];

function agentLabel(type: string): string {
  return AGENTS.find((a) => a.type === type)?.name ?? type;
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

function ConversationCard({ item }: { item: AiConversation }) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/ai/${item.id}`)}
      activeOpacity={0.75}
    >
      <View style={styles.cardHeader}>
        <View style={styles.agentBadge}>
          <Text style={styles.agentBadgeText}>
            {agentLabel(item.agentType)}
          </Text>
        </View>
        <Text style={styles.time}>
          {item.lastMessage
            ? formatTime(item.lastMessage.createdAt)
            : formatTime(item.createdAt)}
        </Text>
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {item.title ?? 'Conversation'}
      </Text>
      {item.lastMessage && (
        <Text style={styles.preview} numberOfLines={2}>
          {item.lastMessage.role === 'assistant' ? '🤖 ' : ''}
          {item.lastMessage.content}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export default function AiScreen() {
  const { data, loading, refetch } = useQuery<{
    myAiConversations: AiConversation[];
  }>(MY_AI_CONVERSATIONS_QUERY, { fetchPolicy: 'cache-and-network' });

  const conversations = data?.myAiConversations ?? [];

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
      contentContainerStyle={styles.content}
      data={conversations}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ConversationCard item={item} />}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => refetch()}
          tintColor="#0f172a"
        />
      }
      ListHeaderComponent={
        <View style={styles.agents}>
          <Text style={styles.agentsTitle}>Start a new conversation</Text>
          {AGENTS.map((agent) => (
            <TouchableOpacity
              key={agent.type}
              style={styles.agentCard}
              onPress={() => router.push(`/ai/new?agent=${agent.type}`)}
              activeOpacity={0.75}
            >
              <View>
                <Text style={styles.agentName}>{agent.name}</Text>
                <Text style={styles.agentDesc}>{agent.description}</Text>
              </View>
              <Text style={styles.agentArrow}>›</Text>
            </TouchableOpacity>
          ))}
          {conversations.length > 0 && (
            <Text style={styles.historyLabel}>Previous conversations</Text>
          )}
        </View>
      }
      ListEmptyComponent={
        conversations.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyBody}>
              Start a conversation with one of the agents above.
            </Text>
          </View>
        ) : null
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
  agents: {
    padding: 16,
    gap: 10,
  },
  agentsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  agentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  agentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  agentDesc: {
    fontSize: 13,
    color: '#64748b',
  },
  agentArrow: {
    fontSize: 22,
    color: '#94a3b8',
    marginLeft: 8,
  },
  historyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
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
  agentBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  agentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  time: {
    fontSize: 12,
    color: '#94a3b8',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  preview: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
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
