'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Bot,
  Loader2,
  MessageSquare,
  Radio,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';
import {
  SECTION_TUTOR_ACTIVITY_QUERY,
  SECTION_TUTOR_TRANSCRIPT_QUERY,
} from '@/lib/graphql/queries/tutor-insights';
import { ANALYZE_SECTION_TUTOR_GAPS_MUTATION } from '@/lib/graphql/mutations/tutor-insights';
import type { AnalyzeSectionTutorGapsMutation } from '@/lib/graphql/__generated__/graphql';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** How often the class view refreshes. Tutor chats move at human speed. */
const POLL_INTERVAL_MS = 15_000;

type GapAnalysis = AnalyzeSectionTutorGapsMutation['analyzeSectionTutorGaps'];

interface TutorMissionControlProps {
  sectionId: string;
}

function ago(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/**
 * Instructor view into Study Coach for one section: who is using the tutor,
 * who needs attention, full transcripts, and AI grouping by shared gaps.
 *
 * PATTERN: master/detail. The list polls; the transcript loads on select.
 */
export function TutorMissionControl({ sectionId }: TutorMissionControlProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [analysis, setAnalysis] = useState<GapAnalysis | null>(null);

  const { data, loading, error } = useQuery(SECTION_TUTOR_ACTIVITY_QUERY, {
    variables: { sectionId },
    pollInterval: POLL_INTERVAL_MS,
  });

  const [analyzeGaps, { loading: analyzing }] = useMutation(
    ANALYZE_SECTION_TUTOR_GAPS_MUTATION,
  );

  const students = data?.sectionTutorActivity ?? [];
  const activeCount = students.filter((s) => s.conversationCount > 0).length;
  const attentionCount = students.filter((s) => s.needsAttention).length;

  const handleAnalyze = async () => {
    try {
      const { data: result } = await analyzeGaps({ variables: { sectionId } });
      if (!result) return;
      setAnalysis(result.analyzeSectionTutorGaps);
      if (result.analyzeSectionTutorGaps.analyzedMessageCount === 0) {
        toast.info('No tutor chats in the last 14 days to analyze yet.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      toast.error(message);
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-destructive">
          {error.message}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span
            className="inline-flex items-center gap-1 text-emerald-600"
            title={`Refreshes every ${POLL_INTERVAL_MS / 1000} seconds`}
          >
            <Radio className="h-4 w-4" />
            Live
          </span>
          <span>·</span>
          <span data-testid="tutor-active-count">
            {activeCount} of {students.length} students used the tutor
          </span>
          {attentionCount > 0 && (
            <>
              <span>·</span>
              <span
                className="text-amber-600"
                data-testid="tutor-attention-count"
              >
                {attentionCount} need attention
              </span>
            </>
          )}
        </div>
        <Button
          onClick={handleAnalyze}
          disabled={analyzing || activeCount === 0}
          size="sm"
        >
          {analyzing ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-1 h-4 w-4" />
          )}
          Find gaps
        </Button>
      </div>

      {analysis && analysis.analyzedMessageCount > 0 && (
        <GapResults analysis={analysis} />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Students */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Students</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && !data ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))
            ) : students.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No active students in this section.
              </p>
            ) : (
              students.map((student) => (
                <div
                  key={student.studentId}
                  className={cn(
                    'rounded-lg border p-3',
                    student.needsAttention &&
                      'border-amber-400 bg-amber-50/50 dark:bg-amber-950/20',
                  )}
                  data-testid="tutor-student-row"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {student.studentName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {student.conversationCount === 0
                          ? 'Has not used the tutor'
                          : `${plural(student.studentMessageCount, 'message')} · ${plural(student.conversationCount, 'chat')} · ${ago(student.lastActiveAt as string)}`}
                      </p>
                    </div>
                    {student.needsAttention && (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-amber-500 text-amber-700 dark:text-amber-400"
                      >
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        Needs attention
                      </Badge>
                    )}
                  </div>
                  {student.attentionReasons.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
                      {student.attentionReasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  )}
                  {student.conversations.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {student.conversations.map((conv) => (
                        <button
                          key={conv.id}
                          type="button"
                          onClick={() => setSelectedConversationId(conv.id)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted',
                            selectedConversationId === conv.id && 'bg-muted',
                          )}
                        >
                          <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate">
                            {conv.title}
                          </span>
                          <span className="shrink-0 text-muted-foreground">
                            {ago(conv.lastActiveAt as string)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Transcript */}
        <Card className="lg:sticky lg:top-4 lg:self-start">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedConversationId ? (
              <Transcript
                sectionId={sectionId}
                conversationId={selectedConversationId}
              />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Pick a chat to read the full conversation.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function GapResults({ analysis }: { analysis: GapAnalysis }) {
  return (
    <Card data-testid="tutor-gap-results">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Where the class is stuck
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          From {analysis.analyzedMessageCount} student messages in the last 14
          days · {ago(analysis.generatedAt as string)}. Names are never sent to
          the AI.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {analysis.groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No shared gaps found.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {analysis.groups.map((group) => (
              <div key={group.topic} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{group.topic}</p>
                  <Badge variant="secondary">{group.studentIds.length}</Badge>
                </div>
                {group.summary && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {group.summary}
                  </p>
                )}
                <p className="mt-2 text-xs">{group.studentNames.join(', ')}</p>
              </div>
            ))}
          </div>
        )}
        {analysis.strengths.length > 0 && (
          <div>
            <p className="text-sm font-medium">Going well</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
              {analysis.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Transcript({
  sectionId,
  conversationId,
}: {
  sectionId: string;
  conversationId: string;
}) {
  const { data, loading, error } = useQuery(SECTION_TUTOR_TRANSCRIPT_QUERY, {
    variables: { sectionId, conversationId },
    pollInterval: POLL_INTERVAL_MS,
  });

  if (loading && !data) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }
  if (error) {
    return <p className="text-sm text-destructive">{error.message}</p>;
  }

  const messages = data?.sectionTutorTranscript ?? [];
  return (
    <div
      className="max-h-[70vh] space-y-3 overflow-y-auto pr-1"
      data-testid="tutor-transcript"
    >
      {messages.map((msg) => {
        const isStudent = msg.speaker === 'student';
        return (
          <div
            key={msg.id}
            className={cn(
              'flex gap-2',
              isStudent ? 'flex-row' : 'flex-row-reverse',
            )}
          >
            <div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                isStudent ? 'bg-muted' : 'bg-primary/10 text-primary',
              )}
            >
              {isStudent ? (
                <UserIcon className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
            </div>
            <div
              className={cn(
                'max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm',
                isStudent ? 'bg-muted' : 'bg-primary/5',
              )}
            >
              <p className="mb-0.5 text-[11px] text-muted-foreground">
                {isStudent ? 'Student' : 'Study Coach'} ·{' '}
                {ago(msg.createdAt as string)}
              </p>
              {msg.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
