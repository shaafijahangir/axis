'use client';

import Link from 'next/link';
import { Clock, CheckCircle, Megaphone, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils/relative-time';

type FeedItemType =
  | 'deadline'
  | 'grade_posted'
  | 'announcement'
  | 'course_update';

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
};

export function FeedCard({
  type,
  title,
  subtitle,
  body,
  courseCode,
  courseTitle,
  sectionId,
  assignmentId,
  dueAt,
  score,
  pointsPossible,
  timestamp,
}: FeedCardProps) {
  const config = typeConfig[type];
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
          : 'Course update';

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
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
