'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CourseHeaderProps {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  instructorName?: string;
  location?: string;
  /** Optional action rendered on the right (e.g. "Book Office Hours"). */
  action?: React.ReactNode;
}

export function CourseHeader({
  courseId,
  courseCode,
  courseTitle,
  instructorName,
  location,
  action,
}: CourseHeaderProps) {
  return (
    <div className="sticky top-0 z-10 border-b bg-background/95 px-4 py-4 md:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4">
        <Link href={`/courses/${courseId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{courseCode}</Badge>
          </div>
          <h1 className="mt-1 truncate text-xl font-bold">{courseTitle}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {instructorName && <span>{instructorName}</span>}
            {instructorName && location && <span>-</span>}
            {location && <span>{location}</span>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
