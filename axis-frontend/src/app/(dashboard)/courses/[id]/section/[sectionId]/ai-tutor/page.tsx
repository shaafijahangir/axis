'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TutorMissionControl } from '@/components/tutor-insights/tutor-mission-control';

export default function AiTutorPage() {
  const params = useParams();
  const courseId = params.id as string;
  const sectionId = params.sectionId as string;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href={`/courses/${courseId}/section/${sectionId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to timeline
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">AI Tutor</h1>
        <p className="text-sm text-muted-foreground">
          See how your students use Study Coach in this course, who is stuck,
          and where the class shares the same gaps.
        </p>
      </div>

      <TutorMissionControl sectionId={sectionId} />
    </div>
  );
}
