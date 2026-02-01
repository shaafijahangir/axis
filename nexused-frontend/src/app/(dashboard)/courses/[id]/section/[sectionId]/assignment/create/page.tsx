'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CreateAssignmentForm } from '@/components/assignments/create-assignment-form';

export default function CreateAssignmentPage() {
  const params = useParams();
  const courseId = params.id as string;
  const sectionId = params.sectionId as string;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/courses/${courseId}/section/${sectionId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to timeline
      </Link>

      <CreateAssignmentForm sectionId={sectionId} courseId={courseId} />
    </div>
  );
}
