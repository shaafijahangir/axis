/**
 * Message thread screen — full conversation with send input.
 * Uses polling (5s) instead of Socket.IO for now; Socket.IO on RN
 * requires react-native-url-polyfill setup and is a Phase B enhancement.
 *
 * WHY: Polling at 5s is acceptable for messaging UX on mobile;
 * Socket.IO real-time is a nice-to-have, not a blocker.
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
  CONVERSATION_MESSAGES_QUERY,
  SEND_MESSAGE_MUTATION,
} from '../../src/graphql/queries';
import { useAuth } from '../../src/hooks/useAuth';

interface Message {
  id: string;
  body: string;
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function MessageBubble({
  message,
  isOwn,
}: {
  message: Message;
  isOwn: boolean;
}) {
  return (
    <View style={[styles.bubbleRow, isOwn && styles.bubbleRowOwn]}>
      {!isOwn && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {message.sender.firstName[0].toUpperCase()}
          </Text>
        </View>
      )}
      <View style={[styles.bubble, isOwn && styles.bubbleOwn]}>
        {!isOwn && (
          <Text style={styles.senderName}>
            {message.sender.firstName} {message.sender.lastName}
          </Text>
        )}
        <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>
          {message.body}
        </Text>
        <Text style={[styles.bubbleTime, isOwn && styles.bubbleTimeOwn]}>
          {formatTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

export default function MessageThreadScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const { data, loading } = useQuery<{ conversationMessages: Message[] }>(
    CONVERSATION_MESSAGES_QUERY,
    {
      variables: { conversationId },
      skip: !conversationId,
      fetchPolicy: 'cache-and-network',
      pollInterval: 5_000,
    },
  );

  const [sendMessage] = useMutation(SEND_MESSAGE_MUTATION, {
    refetchQueries: [
      {
        query: CONVERSATION_MESSAGES_QUERY,
        variables: { conversationId },
      },
    ],
  });

  const messages = data?.conversationMessages ?? [];

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setBody('');
    try {
      await sendMessage({
        variables: {
          input: { conversationId, body: trimmed },
        },
      });
    } catch {
      // Restore body on failure
      setBody(trimmed);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
    >
      <Stack.Screen options={{ title: 'Message' }} />

      {loading && messages.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0f172a" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          style={styles.list}
          contentContainerStyle={styles.content}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble message={item} isOwn={item.sender.id === user?.id} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
            </View>
          }
        />
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={body}
          onChangeText={setBody}
          placeholder="Message…"
          placeholderTextColor="#94a3b8"
          multiline
          maxLength={2000}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!body.trim() || isSending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!body.trim() || isSending}
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
    gap: 10,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  bubbleRowOwn: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  bubble: {
    maxWidth: '75%',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 2,
  },
  bubbleOwn: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 1,
  },
  bubbleText: {
    fontSize: 15,
    color: '#0f172a',
    lineHeight: 20,
  },
  bubbleTextOwn: {
    color: '#fff',
  },
  bubbleTime: {
    fontSize: 10,
    color: '#94a3b8',
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  bubbleTimeOwn: {
    color: '#94a3b830',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
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
    backgroundColor: '#0f172a',
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
