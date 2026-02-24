/**
 * New AI conversation screen — agent picker + first message.
 *
 * WHY: Instead of a blank chat, we show a contextual intro from the agent
 * so users know what to expect. The "start conversation" action calls
 * startAiConversation and immediately replaces this screen with the thread.
 *
 * router.replace (not push) so pressing Back from the thread goes to the
 * AI tab, not back here — no one wants to restart the same conversation.
 */
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useMutation } from '@apollo/client/react';
import { START_AI_CONVERSATION_MUTATION } from '../../../src/graphql/queries';

interface AgentConfig {
  name: string;
  description: string;
  placeholder: string;
}

const AGENTS: Record<string, AgentConfig> = {
  study_coach: {
    name: 'Study Coach',
    description:
      "I use the Socratic method — I'll guide you to answers rather than just giving them. What are you working on?",
    placeholder: 'e.g. I need help understanding Big-O notation…',
  },
  feedback_copilot: {
    name: 'Feedback Copilot',
    description:
      "Share your work and I'll give you actionable, specific feedback to help you improve it.",
    placeholder: 'e.g. Can you review my essay introduction?',
  },
};

export default function NewAiConversationScreen() {
  const { agent } = useLocalSearchParams<{ agent: string }>();
  const [content, setContent] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  const agentKey = agent ?? 'study_coach';
  const agentConfig = AGENTS[agentKey] ?? AGENTS.study_coach;

  const [startAiConversation] = useMutation(START_AI_CONVERSATION_MUTATION);

  const handleStart = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    setIsStarting(true);
    try {
      const { data } = await startAiConversation({
        variables: {
          input: {
            agentType: agentKey,
            initialMessage: trimmed,
          },
        },
      });

      const id = data?.startAiConversation?.id;
      if (!id) throw new Error('No conversation ID returned');

      // Replace this screen — back button goes to AI tab, not back here
      router.replace(`/ai/${id}`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Could not start conversation';
      Alert.alert('Error', msg);
      setIsStarting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
    >
      <Stack.Screen options={{ title: agentConfig.name }} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Agent intro bubble */}
        <View style={styles.introRow}>
          <View style={styles.introAvatar}>
            <Text style={styles.introAvatarText}>AI</Text>
          </View>
          <View style={styles.introBubble}>
            <Text style={styles.introAgentName}>{agentConfig.name}</Text>
            <Text style={styles.introDesc}>{agentConfig.description}</Text>
          </View>
        </View>

        {/* First message input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Your first message</Text>
          <TextInput
            style={styles.textArea}
            value={content}
            onChangeText={setContent}
            placeholder={agentConfig.placeholder}
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            autoFocus
          />
          <TouchableOpacity
            style={[
              styles.startButton,
              (!content.trim() || isStarting) && styles.startButtonDisabled,
            ]}
            onPress={handleStart}
            disabled={!content.trim() || isStarting}
            activeOpacity={0.8}
          >
            {isStarting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.startButtonText}>Start conversation</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 24,
    flexGrow: 1,
  },
  introRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  introAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  introAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  introBubble: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  introAgentName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  introDesc: {
    fontSize: 15,
    color: '#0f172a',
    lineHeight: 22,
  },
  inputSection: {
    gap: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#0f172a',
    minHeight: 160,
    lineHeight: 22,
  },
  startButton: {
    height: 52,
    backgroundColor: '#6366f1',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonDisabled: {
    opacity: 0.4,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
