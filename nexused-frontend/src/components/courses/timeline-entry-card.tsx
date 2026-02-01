'use client';

import Link from 'next/link';
import { FileText, Megaphone, Pin, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils/relative-time';

interface TimelineEntryCardProps {
  type: 'assignment' | 'announcement';
  id: string;
  title: string;
  body?: string;
  authorName?: string;
  assignmentType?: string;
  pointsPossible?: number;
  dueAt?: string;
  priority?: string;
  pinned: boolean;
  timestamp: string;
  courseId: string;
  sectionId: string;
  score?: number;
  gradedAt?: string;
  feedback?: string;
}

export function TimelineEntryCard({
  type,
  id,
  title,
  body,
  authorName,
  assignmentType,
  pointsPossible,
  dueAt,
  priority,
  pinned,
  timestamp,
  courseId,
  sectionId,
  score,
  gradedAt,
}: TimelineEntryCardProps) {
  const isAssignment = type === 'assignment';
  const Icon = isAssignment ? FileText : Megaphone;
  const borderColor = isAssignment
    ? 'border-l-violet-500'
    : 'border-l-blue-500';
  const iconColor = isAssignment ? 'text-violet-500' : 'text-blue-500';

  const isGraded = isAssignment && gradedAt != null && score != null;
  const isPastDueUngraded =
    isAssignment && !isGraded && dueAt && new Date(dueAt) < new Date();

  const content = (
    <Card
      className={`border-l-4 ${borderColor} transition-shadow hover:shadow-md`}
    >
      <CardContent className="flex items-start gap-4 p-4">
        <div className={`mt-0.5 shrink-0 ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {pinned && <Pin className="h-3 w-3 text-amber-500" />}
            {assignmentType && (
              <Badge variant="outline" className="text-xs capitalize">
                {assignmentType}
              </Badge>
            )}
            {priority === 'urgent' && (
              <Badge variant="destructive" className="text-xs">
                Urgent
              </Badge>
            )}
            {isGraded && (
              <Badge className="ml-auto bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">
                <CheckCircle className="mr-1 h-3 w-3" />
                {score}/{pointsPossible}
              </Badge>
            )}
            {isPastDueUngraded && (
              <Badge
                variant="secondary"
                className="ml-auto text-muted-foreground"
              >
                <Clock className="mr-1 h-3 w-3" />
                Pending
              </Badge>
            )}
          </div>
          <p className="mt-1 font-medium">{title}</p>
          {body && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {body}
            </p>
          )}
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            {authorName && <span>By {authorName}</span>}
            {pointsPossible != null && <span>{pointsPossible} pts</span>}
            {dueAt && (
              <span className="font-medium text-amber-600">
                Due {formatRelativeTime(dueAt)}
              </span>
            )}
            <span>{formatRelativeTime(timestamp)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isAssignment) {
    return (
      <Link href={`/courses/${courseId}/section/${sectionId}/assignment/${id}`}>
        {content}
      </Link>
    );
  }

  return content;
}
