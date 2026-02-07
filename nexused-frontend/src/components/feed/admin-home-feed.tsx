'use client';

import Link from 'next/link';
import { useQuery } from '@apollo/client/react';
import { BookOpen, Users, Layers, UserCheck } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import {
  COURSE_COUNT_QUERY,
  SECTION_COUNT_QUERY,
  ENROLLMENT_COUNT_QUERY,
} from '@/lib/graphql/queries/courses';
import { USER_COUNT_QUERY } from '@/lib/graphql/queries/admin-users';
import { StatsCard } from '@/components/dashboard/stats-card';
import { Skeleton } from '@/components/ui/skeleton';

export function AdminHomeFeed() {
  const { user } = useAuthStore();
  const { data: courseData, loading: courseLoading } = useQuery<{
    courseCount: number;
  }>(COURSE_COUNT_QUERY);
  const { data: sectionData, loading: sectionLoading } = useQuery<{
    sectionCount: number;
  }>(SECTION_COUNT_QUERY);
  const { data: enrollmentData, loading: enrollmentLoading } = useQuery<{
    enrollmentCount: number;
  }>(ENROLLMENT_COUNT_QUERY);
  const { data: userData, loading: userLoading } = useQuery<{
    userCount: number;
  }>(USER_COUNT_QUERY);

  const loading =
    courseLoading || sectionLoading || enrollmentLoading || userLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.firstName}. Here&apos;s an overview of your
          institution.
        </p>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Overview</h2>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/people">
              <StatsCard
                title="Total Users"
                value={userData?.userCount ?? 0}
                description="People in your institution"
                icon={<UserCheck className="h-4 w-4" />}
              />
            </Link>
            <Link href="/academics">
              <StatsCard
                title="Total Courses"
                value={courseData?.courseCount ?? 0}
                description="Courses in your institution"
                icon={<BookOpen className="h-4 w-4" />}
              />
            </Link>
            <Link href="/academics">
              <StatsCard
                title="Active Sections"
                value={sectionData?.sectionCount ?? 0}
                description="Course sections this term"
                icon={<Layers className="h-4 w-4" />}
              />
            </Link>
            <Link href="/academics">
              <StatsCard
                title="Enrollments"
                value={enrollmentData?.enrollmentCount ?? 0}
                description="Total student enrollments"
                icon={<Users className="h-4 w-4" />}
              />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
