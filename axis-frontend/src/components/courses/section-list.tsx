'use client';

import Link from 'next/link';
import { useMutation } from '@apollo/client/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ENROLL_STUDENT_MUTATION } from '@/lib/graphql/mutations/courses';
import { MY_ENROLLMENTS_QUERY } from '@/lib/graphql/queries/courses';

interface Section {
  id: string;
  location?: string;
  capacity?: number;
  status: string;
  instructor?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface SectionListProps {
  courseId: string;
  sections: Section[];
  showEnroll?: boolean;
}

export function SectionList({
  courseId,
  sections,
  showEnroll,
}: SectionListProps) {
  const [enrollStudent, { loading }] = useMutation(ENROLL_STUDENT_MUTATION, {
    refetchQueries: [{ query: MY_ENROLLMENTS_QUERY }],
  });

  if (sections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No sections available for this course.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Instructor</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Capacity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead />
          {showEnroll && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sections.map((section) => (
          <TableRow key={section.id}>
            <TableCell>
              {section.instructor
                ? `${section.instructor.firstName} ${section.instructor.lastName}`
                : 'TBA'}
            </TableCell>
            <TableCell>{section.location || 'TBA'}</TableCell>
            <TableCell>{section.capacity ?? '-'}</TableCell>
            <TableCell>
              <Badge variant="outline" className="capitalize">
                {section.status}
              </Badge>
            </TableCell>
            <TableCell>
              <Link href={`/courses/${courseId}/section/${section.id}`}>
                <Button size="sm" variant="ghost">
                  View
                </Button>
              </Link>
            </TableCell>
            {showEnroll && (
              <TableCell>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loading || section.status !== 'active'}
                  onClick={() =>
                    enrollStudent({ variables: { sectionId: section.id } })
                  }
                >
                  Enroll
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
