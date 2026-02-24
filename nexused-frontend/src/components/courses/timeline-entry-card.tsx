'use client';

import Link from 'next/link';
import {
  FileText,
  Megaphone,
  BookOpen,
  Pin,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  MessageSquare,
  Lock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils/relative-time';

interface TimelineEntryCardProps {
  type: 'assignment' | 'announcement' | 'content' | 'discussion';
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
  publishedAt?: string;
  replyCount?: number;
  isLocked?: boolean;
  isAnswered?: boolean;
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
  publishedAt,
  replyCount,
  isLocked,
  isAnswered,
}: TimelineEntryCardProps) {
  const isAssignment = type === 'assignment';
  const isContent = type === 'content';
  const isDiscussion = type === 'discussion';
  const isDraft = isContent && !publishedAt;

  const Icon = isContent
    ? BookOpen
    : isAssignment
      ? FileText
      : isDiscussion
        ? MessageSquare
        : Megaphone;

  const borderColor = isContent
    ? 'border-l-emerald-500'
    : isAssignment
      ? 'border-l-violet-500'
      : isDiscussion
        ? 'border-l-orange-500'
        : 'border-l-blue-500';

  const iconColor = isContent
    ? 'text-emerald-500'
    : isAssignment
      ? 'text-violet-500'
      : isDiscussion
        ? 'text-orange-500'
        : 'text-blue-500';

  const isGraded = isAssignment && gradedAt != null && score != null;
  const isPastDueUngraded =
    isAssignment && !isGraded && dueAt && new Date(dueAt) < new Date();

  const typeLabel = isContent
    ? 'Content'
    : isAssignment
      ? 'Assignment'
      : isDiscussion
        ? 'Discussion'
        : 'Announcement';
  const content = (
    <Card
      className={`border-l-4 ${borderColor} transition-shadow hover:shadow-md`}
      role="article"
      aria-label={`${typeLabel}: ${title}${isGraded ? `, graded ${score}/${pointsPossible}` : ''}${isDraft ? ' (draft)' : ''}`}
    >
      <CardContent className="flex items-start gap-4 p-4">
        <div className={`mt-0.5 shrink-0 ${iconColor}`} aria-hidden="true">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {pinned && <Pin className="h-3 w-3 text-amber-500" />}
            {isDraft && (
              <Badge variant="secondary" className="text-xs">
                <EyeOff className="mr-1 h-3 w-3" />
                Draft
              </Badge>
            )}
            {isContent && publishedAt && (
              <Badge
                variant="outline"
                className="text-xs text-emerald-600 dark:text-emerald-400"
              >
                <Eye className="mr-1 h-3 w-3" />
                Published
              </Badge>
            )}
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
            {isDiscussion && isAnswered && (
              <Badge className="text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">
                <CheckCircle className="mr-1 h-3 w-3" />
                Answered
              </Badge>
            )}
            {isDiscussion && isLocked && (
              <Badge variant="secondary" className="text-xs">
                <Lock className="mr-1 h-3 w-3" />
                Locked
              </Badge>
            )}
            {isDiscussion && replyCount != null && (
              <Badge variant="outline" className="ml-auto text-xs">
                <MessageSquare className="mr-1 h-3 w-3" />
                {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
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

  if (isContent) {
    return (
      <Link href={`/courses/${courseId}/section/${sectionId}/content/${id}`}>
        {content}
      </Link>
    );
  }

  if (isDiscussion) {
    return (
      <Link href={`/courses/${courseId}/section/${sectionId}/discussion/${id}`}>
        {content}
      </Link>
    );
  }

  return content;
}
