'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SectionRoster } from '@/components/courses/section-roster';

export default function RosterPage() {
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

      <Card>
        <CardHeader>
          <CardTitle>Course Roster</CardTitle>
        </CardHeader>
        <CardContent>
          <SectionRoster sectionId={sectionId} />
        </CardContent>
      </Card>
    </div>
  );
}
