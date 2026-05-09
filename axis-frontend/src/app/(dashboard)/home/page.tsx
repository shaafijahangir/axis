'use client';

import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@/types/auth';
import { StudentHomeFeed } from '@/components/feed/student-home-feed';
import { InstructorHomeFeed } from '@/components/feed/instructor-home-feed';
import { AdminHomeFeed } from '@/components/feed/admin-home-feed';
import { ParentHomeFeed } from '@/components/feed/parent-home-feed';

/**
 * WHY: One unified /home route that renders the correct feed based on the
 * user's primary role. Replaces /student, /instructor, /admin.
 * PATTERN: Role-based rendering via component map — no switch/case spaghetti.
 */
const feedByRole: Record<string, React.ComponentType> = {
  [UserRole.STUDENT]: StudentHomeFeed,
  [UserRole.INSTRUCTOR]: InstructorHomeFeed,
  [UserRole.ADMIN]: AdminHomeFeed,
  [UserRole.PARENT]: ParentHomeFeed,
  [UserRole.TA]: StudentHomeFeed,
};

export default function HomePage() {
  const { user } = useAuthStore();
  const primaryRole = user?.roles[0] ?? UserRole.STUDENT;
  const FeedComponent = feedByRole[primaryRole] ?? StudentHomeFeed;

  return <FeedComponent />;
}
