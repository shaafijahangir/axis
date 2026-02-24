/**
 * AI chat thread — full conversation with an agent.
 *
 * WHY: The AI thread is the core value-add screen on mobile. Students can ask
 * questions mid-study without switching to a laptop. The UX must feel fast
 * even if the AI takes a few seconds — hence the "AI is thinking…" indicator
 * and the optimistic input clear.
 *
 * Tool use messages (role=tool_use/tool_result) are rendered as small chips,
 * not full bubbles — they're implementation detail, not conversation content.
 */
import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  AI_CONVERSATION_QUERY,
  SEND_AI_MESSAGE_MUTATION,
} from '../../src/graphql/queries';

interface AiMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  toolName: string | null;
  toolInput: string | null;
  toolResult: string | null;
}

interface ConversationData {
  aiConversation: {
    id: string;
    title: string | null;
    agentType: string;
    messages: AiMessage[];
  };
}

const AGENT_NAMES: Record<string, string> = {
  study_coach: 'Study Coach',
  feedback_copilot: 'Feedback Copilot',
};

function ToolChip({ message }: { message: AiMessage }) {
  const isUse = message.role === 'tool_use';
  return (
    <View style={styles.toolChip}>
      <Text style={styles.toolChipText}>
        {isUse ? `⚙ Using ${message.toolName ?? 'tool'}…` : '✓ Done'}
      </Text>
    </View>
  );
}

function MessageBubble({ message }: { message: AiMessage }) {
  const isUser = message.role === 'user';
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>AI</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser && styles.bubbleUser]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
          {message.content}
        </Text>
        <Text style={[styles.bubbleTime, isUser && styles.bubbleTimeUser]}>
          {time}
        </Text>
      </View>
    </View>
  );
}

export default function AiChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const { data, loading, refetch } = useQuery<ConversationData>(
    AI_CONVERSATION_QUERY,
    {
      variables: { id },
      skip: !id,
      fetchPolicy: 'cache-and-network',
    },
  );

  const [sendAiMessage] = useMutation(SEND_AI_MESSAGE_MUTATION);

  const conversation = data?.aiConversation;
  const messages = conversation?.messages ?? [];

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setContent(''); // Clear optimistically
    try {
      await sendAiMessage({
        variables: { conversationId: id, content: trimmed },
      });
      // Refetch to get AI response — not streaming on mobile (Phase B)
      await refetch();
    } catch {
      setContent(trimmed); // Restore on failure
    } finally {
      setIsSending(false);
    }
  };

  if (loading && messages.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  const agentName =
    AGENT_NAMES[conversation?.agentType ?? ''] ??
    conversation?.agentType ??
    'AI';
  const title = conversation?.title ?? agentName;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
    >
      <Stack.Screen options={{ title }} />

      <FlatList
        ref={listRef}
        style={styles.list}
        contentContainerStyle={styles.content}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          if (item.role === 'tool_use' || item.role === 'tool_result') {
            return <ToolChip message={item} />;
          }
          return <MessageBubble message={item} />;
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{agentName}</Text>
            <Text style={styles.emptyBody}>Send a message to get started.</Text>
          </View>
        }
      />

      {/* "AI is thinking" shown while waiting for refetch */}
      {isSending && (
        <View style={styles.thinkingBar}>
          <ActivityIndicator size="small" color="#6366f1" />
          <Text style={styles.thinkingText}>AI is thinking…</Text>
        </View>
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={content}
          onChangeText={setContent}
          placeholder="Ask anything…"
          placeholderTextColor="#94a3b8"
          multiline
          maxLength={4000}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!content.trim() || isSending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!content.trim() || isSending}
          activeOpacity={0.8}
        >
          <Text style={styles.sendButtonText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 8,
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  toolChip: {
    alignSelf: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  toolChipText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  avatarText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  bubble: {
    maxWidth: '78%',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  bubbleUser: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    color: '#0f172a',
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: '#fff',
  },
  bubbleTime: {
    fontSize: 10,
    color: '#94a3b8',
    alignSelf: 'flex-end',
  },
  bubbleTimeUser: {
    color: '#ffffff50',
  },
  thinkingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
  },
  thinkingText: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptyBody: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#e2e8f0',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
});
