'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { ArrowLeft, FileText, Send } from 'lucide-react';
import { toast } from 'sonner';
import { SECTION_QUERY } from '@/lib/graphql/queries/courses';
import { SECTION_REPORT_CARDS_QUERY } from '@/lib/graphql/queries/report-cards';
import {
  GENERATE_REPORT_CARDS_MUTATION,
  UPDATE_REPORT_CARD_MUTATION,
  PUBLISH_REPORT_CARDS_MUTATION,
} from '@/lib/graphql/mutations/report-cards';
import { CourseHeader } from '@/components/courses/course-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface ReportCardSummary {
  id: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string;
  studentEmail: string;
  status: 'DRAFT' | 'PUBLISHED';
  teacherComment?: string;
  finalGrade?: string;
  gradeSummary?: string;
  attendanceSummary?: string;
  publishedAt?: string;
  createdAt: string;
}

interface GradeSummary {
  totalEarned: number;
  totalPossible: number;
  percentage: number;
}

interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  attendanceRate: number;
}

function parseJson<T>(s?: string): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

interface SectionData {
  id: string;
  location?: string;
  course: { id: string; code: string; title: string };
  instructor: { firstName: string; lastName: string };
}

export default function ReportCardsPage() {
  const params = useParams();
  const courseId = params.id as string;
  const sectionId = params.sectionId as string;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftComment, setDraftComment] = useState('');
  const [draftGrade, setDraftGrade] = useState('');

  const { data: sectionData, loading: sectionLoading } = useQuery<{
    section: SectionData;
  }>(SECTION_QUERY, { variables: { id: sectionId } });

  const { data, loading, refetch } = useQuery<{
    sectionReportCards: ReportCardSummary[];
  }>(SECTION_REPORT_CARDS_QUERY, {
    variables: { sectionId },
    fetchPolicy: 'cache-and-network',
  });

  const [generateCards, { loading: generating }] = useMutation(
    GENERATE_REPORT_CARDS_MUTATION,
    {
      onCompleted: () => {
        toast.success('Report cards generated');
        void refetch();
      },
      onError: () => toast.error('Failed to generate report cards'),
    },
  );

  const [updateCard, { loading: updatingCard }] = useMutation(
    UPDATE_REPORT_CARD_MUTATION,
    {
      onCompleted: () => {
        toast.success('Saved');
        setEditingId(null);
        void refetch();
      },
      onError: () => toast.error('Failed to save'),
    },
  );

  const [publishCards, { loading: publishing }] = useMutation(
    PUBLISH_REPORT_CARDS_MUTATION,
    {
      onCompleted: () => {
        toast.success('Report cards published');
        void refetch();
      },
      onError: () => toast.error('Failed to publish'),
    },
  );

  const cards = data?.sectionReportCards ?? [];
  const section = sectionData?.section;
  const hasDrafts = cards.some((c) => c.status === 'DRAFT');
  const allPublished =
    cards.length > 0 && cards.every((c) => c.status === 'PUBLISHED');

  const startEdit = (card: ReportCardSummary) => {
    setEditingId(card.id);
    setDraftComment(card.teacherComment ?? '');
    setDraftGrade(card.finalGrade ?? '');
  };

  const saveEdit = (id: string) => {
    void updateCard({
      variables: {
        input: {
          id,
          teacherComment: draftComment,
          finalGrade: draftGrade || undefined,
        },
      },
    });
  };

  return (
    <div className="-m-4 md:-m-6">
      {sectionLoading ? (
        <div className="border-b px-4 py-4 md:p-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-2 h-8 w-64" />
        </div>
      ) : section ? (
        <CourseHeader
          courseId={section.course.id}
          courseCode={section.course.code}
          courseTitle={section.course.title}
          instructorName={`${section.instructor.firstName} ${section.instructor.lastName}`}
          location={section.location}
        />
      ) : null}

      <div className="space-y-4 px-4 py-4 md:p-6">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button asChild size="sm" variant="ghost">
              <Link href={`/courses/${courseId}/section/${sectionId}`}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Link>
            </Button>
            <h2 className="text-xl font-semibold">Report Cards</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void generateCards({ variables: { sectionId } })}
              disabled={generating}
            >
              <FileText className="mr-1 h-4 w-4" />
              {generating
                ? 'Generating…'
                : cards.length > 0
                  ? 'Refresh Grades'
                  : 'Generate Report Cards'}
            </Button>
            {hasDrafts && (
              <Button
                size="sm"
                onClick={() => void publishCards({ variables: { sectionId } })}
                disabled={publishing}
              >
                <Send className="mr-1 h-4 w-4" />
                {publishing ? 'Publishing…' : 'Publish All'}
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <h3 className="text-lg font-medium">No report cards yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Click &ldquo;Generate Report Cards&rdquo; to create draft cards
              for all enrolled students.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Student</th>
                  <th className="px-4 py-3 text-center font-medium">Grade %</th>
                  <th className="px-4 py-3 text-center font-medium">
                    Attendance
                  </th>
                  <th className="px-4 py-3 text-center font-medium">Letter</th>
                  <th className="px-4 py-3 text-left font-medium">Comment</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cards.map((card) => {
                  const grade = parseJson<GradeSummary>(card.gradeSummary);
                  const attend = parseJson<AttendanceSummary>(
                    card.attendanceSummary,
                  );
                  const isEditing = editingId === card.id;
                  const isPublished = card.status === 'PUBLISHED';

                  return (
                    <tr
                      key={card.id}
                      className="border-b transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {card.studentLastName}, {card.studentFirstName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {card.studentEmail}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">
                        {grade ? `${grade.percentage}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">
                        {attend && attend.total > 0
                          ? `${attend.attendanceRate}%`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditing && !isPublished ? (
                          <Input
                            value={draftGrade}
                            onChange={(e) =>
                              setDraftGrade(
                                e.target.value.toUpperCase().slice(0, 2),
                              )
                            }
                            className="h-8 w-14 text-center text-sm"
                            placeholder="A+"
                            maxLength={2}
                          />
                        ) : (
                          <span className="font-semibold">
                            {card.finalGrade ?? '—'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        {isEditing && !isPublished ? (
                          <Textarea
                            value={draftComment}
                            onChange={(e) => setDraftComment(e.target.value)}
                            className="min-h-[60px] text-sm"
                            placeholder="Teacher comment…"
                          />
                        ) : (
                          <span className="text-muted-foreground">
                            {card.teacherComment
                              ? card.teacherComment.length > 60
                                ? card.teacherComment.slice(0, 60) + '…'
                                : card.teacherComment
                              : '—'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={isPublished ? 'default' : 'secondary'}>
                          {isPublished ? 'Published' : 'Draft'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isPublished ? null : isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              onClick={() => saveEdit(card.id)}
                              disabled={updatingCard}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit(card)}
                          >
                            Edit
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {allPublished && (
              <div className="border-t bg-muted/30 px-4 py-3 text-center text-sm text-muted-foreground">
                All report cards have been published to students.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
