'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { ArrowLeft, BookOpen, MapPin, User2 } from 'lucide-react';
import Link from 'next/link';
import { PARENT_STUDENT_ENROLLMENTS_QUERY } from '@/lib/graphql/queries/parent';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ParentEnrollmentItem {
  enrollmentId: string;
  sectionId: string;
  courseCode: string;
  courseTitle: string;
  location?: string;
  instructorName?: string;
  status: string;
  termName?: string;
}

export default function ParentStudentClassesPage() {
  const { studentId } = useParams<{ studentId: string }>();

  const { data, loading } = useQuery<{
    parentStudentEnrollments: ParentEnrollmentItem[];
  }>(PARENT_STUDENT_ENROLLMENTS_QUERY, { variables: { studentId } });

  const enrollments = data?.parentStudentEnrollments ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/parent">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Classes</h1>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : enrollments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              No active enrollments found.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {enrollments.map((e) => (
            <Card key={e.enrollmentId}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{e.courseCode}</Badge>
                      {e.termName && (
                        <span className="text-xs text-muted-foreground">
                          {e.termName}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold">{e.courseTitle}</p>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      {e.instructorName && (
                        <span className="flex items-center gap-1">
                          <User2 className="h-3.5 w-3.5" />
                          {e.instructorName}
                        </span>
                      )}
                      {e.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {e.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={e.status === 'active' ? 'default' : 'outline'}
                    className="shrink-0 capitalize"
                  >
                    {e.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
