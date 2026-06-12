'use client';

import { useQuery } from '@apollo/client/react';
import {
  UserCheck,
  BookOpen,
  GraduationCap,
  FileText,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { MY_LINKED_STUDENTS_QUERY } from '@/lib/graphql/queries/parent';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface LinkedStudent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  linkId: string;
}

export default function ParentHomePage() {
  const { data, loading } = useQuery<{ myLinkedStudents: LinkedStudent[] }>(
    MY_LINKED_STUDENTS_QUERY,
  );

  const students = data?.myLinkedStudents ?? [];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UserCheck className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">My Children</h1>
      </div>

      {students.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              No students linked to your account yet.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Contact your school administrator to link your child&apos;s
              account.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => (
            <Card
              key={student.id}
              className="transition-shadow hover:shadow-md"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {student.firstName[0]}
                      {student.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">
                      {student.firstName} {student.lastName}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {student.email}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href={`/parent/${student.id}/classes`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Classes
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href={`/parent/${student.id}/grades`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Grades
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href={`/parent/${student.id}/report-cards`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Report Cards
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
