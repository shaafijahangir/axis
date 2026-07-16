'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { Clock, CheckCircle, Megaphone, Info, UserCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils/relative-time';
import { useFeedCardVisibility } from '@/hooks/use-feed-engagement';

type FeedItemType =
  | 'deadline'
  | 'grade_posted'
  | 'announcement'
  | 'course_update'
  | 'enrollment_update';

interface FeedCardProps {
  type: FeedItemType;
  title: string;
  subtitle?: string;
  body?: string;
  courseCode: string;
  courseTitle: string;
  sectionId: string;
  assignmentId?: string;
  dueAt?: string;
  score?: number;
  pointsPossible?: number;
  timestamp: string;
  id: string;
  onImpression?: (
    feedItemType: string,
    feedItemId: string,
    courseCode: string,
    sectionId: string,
  ) => void;
  onClick?: (
    feedItemType: string,
    feedItemId: string,
    courseCode: string,
    sectionId: string,
  ) => void;
}

const typeConfig: Record<
  FeedItemType,
  { icon: typeof Clock; borderColor: string; iconColor: string }
> = {
  deadline: {
    icon: Clock,
    borderColor: 'border-l-amber-500',
    iconColor: 'text-amber-500',
  },
  grade_posted: {
    icon: CheckCircle,
    borderColor: 'border-l-green-500',
    iconColor: 'text-green-500',
  },
  announcement: {
    icon: Megaphone,
    borderColor: 'border-l-blue-500',
    iconColor: 'text-blue-500',
  },
  course_update: {
    icon: Info,
    borderColor: 'border-l-purple-500',
    iconColor: 'text-purple-500',
  },
  enrollment_update: {
    icon: UserCheck,
    borderColor: 'border-l-indigo-500',
    iconColor: 'text-indigo-500',
  },
};

export function FeedCard({
  type,
  title,
  subtitle,
  body,
  courseCode,
  sectionId,
  assignmentId,
  dueAt,
  score,
  pointsPossible,
  timestamp,
  id,
  onImpression,
  onClick,
}: FeedCardProps) {
  const config = typeConfig[type] ?? typeConfig.course_update;
  const Icon = config.icon;

  const href =
    assignmentId && type !== 'announcement'
      ? `/courses/${sectionId}/section/${sectionId}/assignment/${assignmentId}`
      : undefined;

  const typeLabel =
    type === 'deadline'
      ? 'Upcoming deadline'
      : type === 'grade_posted'
        ? 'Grade posted'
        : type === 'announcement'
          ? 'Announcement'
          : type === 'enrollment_update'
            ? 'Enrollment update'
            : 'Course update';

  // FEAT-014: Track impression when card becomes visible
  const handleVisible = useCallback(() => {
    onImpression?.(type, id, courseCode, sectionId);
  }, [type, id, courseCode, sectionId, onImpression]);

  const visibilityRef = useFeedCardVisibility(handleVisible);

  // FEAT-014: Track click when card is clicked
  const handleClick = useCallback(() => {
    onClick?.(type, id, courseCode, sectionId);
  }, [type, id, courseCode, sectionId, onClick]);

  const content = (
    <Card
      className={`border-l-4 ${config.borderColor} transition-shadow hover:shadow-md`}
      role="article"
      aria-label={`${typeLabel}: ${title} — ${courseCode}`}
    >
      <CardContent className="flex items-start gap-4 p-4">
        <div
          className={`mt-0.5 shrink-0 ${config.iconColor}`}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="shrink-0 text-xs">
              {courseCode}
            </Badge>
            {dueAt && type === 'deadline' && (
              <span className="text-xs font-medium text-amber-600">
                {formatRelativeTime(dueAt)}
              </span>
            )}
          </div>
          <p className="mt-1 font-medium leading-tight">{title}</p>
          {subtitle && (
            <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
          )}
          {body && type === 'announcement' && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {body}
            </p>
          )}
          {type === 'grade_posted' &&
            score != null &&
            pointsPossible != null && (
              <p className="mt-1 text-sm font-semibold text-green-600">
                {score}/{pointsPossible} points
              </p>
            )}
          <p className="mt-2 text-xs text-muted-foreground">
            {formatRelativeTime(timestamp)}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    // The Link is the interactive element — the wrapper must NOT be
    // focusable (no role/tabIndex): a focusable element containing a
    // focusable element is an axe `nested-interactive` violation.
    // FEAT-014 engagement tracking rides the Link's own onClick, which
    // also fires on keyboard activation.
    return (
      <div ref={visibilityRef}>
        <Link href={href} onClick={handleClick}>
          {content}
        </Link>
      </div>
    );
  }
  return (
    <div
      ref={visibilityRef}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick();
      }}
    >
      {content}
    </div>
  );
}
