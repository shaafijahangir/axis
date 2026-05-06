/**
 * Assignment detail + submission screen.
 *
 * Assignment.type (not assignmentType), Assignment.pointsPossible (not points).
 * No mySubmission field on Assignment — use separate mySubmissions query.
 * Submission mutation: submitAssignment (not createSubmission).
 */
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  ASSIGNMENT_QUERY,
  MY_SUBMISSIONS_QUERY,
  SUBMIT_ASSIGNMENT_MUTATION,
} from '../../../../src/graphql/queries';

interface Submission {
  id: string;
  status: string;
  score: number | null;
  feedback: string | null;
  submittedAt: string | null;
}

interface AssignmentData {
  assignment: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    dueAt: string | null;
    pointsPossible: number | null;
    maxAttempts: number | null;
    timeLimitMinutes: number | null;
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusColor(status: string): string {
  switch (status) {
    case 'SUBMITTED':
    case 'GRADED':
      return '#16a34a';
    case 'IN_PROGRESS':
      return '#f59e0b';
    default:
      return '#94a3b8';
  }
}

export default function AssignmentDetailScreen() {
  const { id: courseId, assignmentId } = useLocalSearchParams<{
    id: string;
    assignmentId: string;
    sectionId: string;
  }>();

  const [textContent, setTextContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: assignmentData, loading: assignmentLoading } =
    useQuery<AssignmentData>(ASSIGNMENT_QUERY, {
      variables: { id: assignmentId },
      skip: !assignmentId,
      fetchPolicy: 'cache-and-network',
    });

  const {
    data: submissionsData,
    loading: submissionsLoading,
    refetch,
  } = useQuery<{ mySubmissions: Submission[] }>(MY_SUBMISSIONS_QUERY, {
    variables: { assignmentId },
    skip: !assignmentId,
    fetchPolicy: 'cache-and-network',
  });

  const [submitAssignment] = useMutation(SUBMIT_ASSIGNMENT_MUTATION);

  const assignment = assignmentData?.assignment;
  const submissions = submissionsData?.mySubmissions ?? [];
  const latestSubmission = submissions[submissions.length - 1] ?? null;
  const isSubmitted =
    latestSubmission?.status === 'SUBMITTED' ||
    latestSubmission?.status === 'GRADED';

  const loading = assignmentLoading || submissionsLoading;

  const handleSubmit = async () => {
    if (!textContent.trim()) {
      Alert.alert(
        'Empty submission',
        'Please write something before submitting.',
      );
      return;
    }

    Alert.alert(
      'Submit assignment?',
      'You cannot edit your submission after submitting.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'default',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await submitAssignment({
                variables: {
                  input: {
                    assignmentId,
                    textContent: textContent.trim(),
                  },
                },
              });
              await refetch();
              setTextContent('');
            } catch (err) {
              const msg =
                err instanceof Error ? err.message : 'Submission failed';
              Alert.alert('Submission failed', msg);
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ],
    );
  };

  if (loading && !assignment) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  if (!assignment) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Assignment not found.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: assignment.title }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.section}>
          <Text style={styles.title}>{assignment.title}</Text>

          <View style={styles.metaRow}>
            {assignment.dueAt && (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>
                  Due {formatDate(assignment.dueAt)}
                </Text>
              </View>
            )}
            {assignment.pointsPossible && (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>
                  {assignment.pointsPossible} pts
                </Text>
              </View>
            )}
            {assignment.maxAttempts && (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>
                  Max {assignment.maxAttempts} attempt
                  {assignment.maxAttempts > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>

          {assignment.description ? (
            <Text style={styles.description}>{assignment.description}</Text>
          ) : null}
        </View>

        {/* Most recent submission */}
        {latestSubmission && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Your submission</Text>
            <View style={styles.submissionCard}>
              <View style={styles.submissionHeader}>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: `${statusColor(latestSubmission.status)}20`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: statusColor(latestSubmission.status) },
                    ]}
                  >
                    {latestSubmission.status.charAt(0) +
                      latestSubmission.status.slice(1).toLowerCase()}
                  </Text>
                </View>
                {latestSubmission.submittedAt && (
                  <Text style={styles.submittedAt}>
                    {formatDate(latestSubmission.submittedAt)}
                  </Text>
                )}
              </View>

              {latestSubmission.score !== null && (
                <Text style={styles.score}>
                  Score: {latestSubmission.score}
                  {assignment.pointsPossible
                    ? ` / ${assignment.pointsPossible}`
                    : ''}{' '}
                  pts
                </Text>
              )}

              {latestSubmission.feedback && (
                <View style={styles.feedbackBox}>
                  <Text style={styles.feedbackLabel}>Instructor feedback</Text>
                  <Text style={styles.feedbackText}>
                    {latestSubmission.feedback}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Submission form — only show if not yet submitted */}
        {!isSubmitted && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {latestSubmission ? 'Resubmit your work' : 'Your response'}
            </Text>
            <TextInput
              style={styles.textArea}
              value={textContent}
              onChangeText={setTextContent}
              placeholder="Type your response here…"
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[
                styles.submitButton,
                (isSubmitting || !textContent.trim()) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting || !textContent.trim()}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 20,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  errorText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 30,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  description: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  submissionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  submissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  submittedAt: {
    fontSize: 12,
    color: '#94a3b8',
  },
  score: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  feedbackBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  feedbackLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  feedbackText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#0f172a',
    minHeight: 180,
    lineHeight: 22,
  },
  submitButton: {
    height: 50,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
