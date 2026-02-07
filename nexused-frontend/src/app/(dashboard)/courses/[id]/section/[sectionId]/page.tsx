'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@apollo/client/react';
import { BarChart3, Plus, Users } from 'lucide-react';
import { SECTION_QUERY } from '@/lib/graphql/queries/courses';
import { SECTION_TIMELINE_QUERY } from '@/lib/graphql/queries/timeline';
import { CourseHeader } from '@/components/courses/course-header';
import { TimelineEntryCard } from '@/components/courses/timeline-entry-card';
import { TimelineSkeleton } from '@/components/courses/timeline-skeleton';
import { ExtendDeadlineDialog } from '@/components/courses/extend-deadline-dialog';
import { SendAnnouncementDialog } from '@/components/courses/send-announcement-dialog';
import { ContentEditorDialog } from '@/components/courses/content-editor-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@/types/auth';

interface SectionData {
  id: string;
  location?: string;
  course: { id: string; code: string; title: string };
  instructor: { firstName: string; lastName: string };
}

interface TimelineEntryData {
  type: 'assignment' | 'announcement' | 'content';
  id: string;
  title: string;
  body?: string;
  authorName?: string;
  assignmentType?: string;
  pointsPossible?: number;
  dueAt?: string;
  priority?: string;
  pinned: boolean;
  timestamp: string;
  score?: number;
  gradedAt?: string;
  feedback?: string;
  publishedAt?: string;
}

export default function SectionTimelinePage() {
  const params = useParams();
  const courseId = params.id as string;
  const sectionId = params.sectionId as string;
  const { user } = useAuthStore();

  const canCreate = user?.roles.some((r) =>
    [UserRole.INSTRUCTOR, UserRole.ADMIN].includes(r),
  );

  const { data: sectionData, loading: sectionLoading } = useQuery<{
    section: SectionData;
  }>(SECTION_QUERY, { variables: { id: sectionId } });

  const { data: timelineData, loading: timelineLoading } = useQuery<{
    sectionTimeline: TimelineEntryData[];
  }>(SECTION_TIMELINE_QUERY, { variables: { sectionId } });

  const section = sectionData?.section;

  // Extract assignment entries for the extend deadline dialog
  const assignmentEntries = (timelineData?.sectionTimeline ?? [])
    .filter((e) => e.type === 'assignment')
    .map((e) => ({ id: e.id, title: e.title, dueAt: e.dueAt }));

  return (
    <div className="-m-6">
      {sectionLoading ? (
        <div className="border-b p-6">
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

      <div className="space-y-3 p-6">
        {canCreate && (
          <div className="flex flex-wrap justify-end gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/courses/${courseId}/section/${sectionId}/roster`}>
                <Users className="mr-1 h-4 w-4" />
                Roster
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link
                href={`/courses/${courseId}/section/${sectionId}/gradebook`}
              >
                <BarChart3 className="mr-1 h-4 w-4" />
                Gradebook
              </Link>
            </Button>
            <ExtendDeadlineDialog
              sectionId={sectionId}
              assignments={assignmentEntries}
            />
            <SendAnnouncementDialog sectionId={sectionId} />
            <ContentEditorDialog sectionId={sectionId} />
            <Button asChild size="sm">
              <Link
                href={`/courses/${courseId}/section/${sectionId}/assignment/create`}
              >
                <Plus className="mr-1 h-4 w-4" />
                Create Assignment
              </Link>
            </Button>
          </div>
        )}

        {timelineLoading ? (
          <TimelineSkeleton />
        ) : timelineData?.sectionTimeline &&
          timelineData.sectionTimeline.length > 0 ? (
          timelineData.sectionTimeline.map((entry) => (
            <TimelineEntryCard
              key={`${entry.type}-${entry.id}`}
              type={entry.type}
              id={entry.id}
              title={entry.title}
              body={entry.body}
              authorName={entry.authorName}
              assignmentType={entry.assignmentType}
              pointsPossible={entry.pointsPossible}
              dueAt={entry.dueAt}
              priority={entry.priority}
              pinned={entry.pinned}
              timestamp={entry.timestamp}
              courseId={courseId}
              sectionId={sectionId}
              score={entry.score}
              gradedAt={entry.gradedAt}
              feedback={entry.feedback}
              publishedAt={entry.publishedAt}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <h3 className="text-lg font-medium">No activity yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Assignments and announcements will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
