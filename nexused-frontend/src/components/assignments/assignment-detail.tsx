'use client';

import { Clock, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatRelativeTime } from '@/lib/utils/relative-time';

interface AssignmentDetailProps {
  title: string;
  description?: string;
  type: string;
  pointsPossible: number;
  dueAt?: string;
  unlockAt?: string;
  lockAt?: string;
}

export function AssignmentDetail({
  title,
  description,
  type,
  pointsPossible,
  dueAt,
  unlockAt,
  lockAt,
}: AssignmentDetailProps) {
  const now = new Date();
  const due = dueAt ? new Date(dueAt) : null;
  const isPastDue = due ? due < now : false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <Badge variant="outline" className="capitalize">
            {type}
          </Badge>
          <Badge variant="secondary">{pointsPossible} pts</Badge>
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        {dueAt && (
          <div className="flex items-center gap-2 text-sm">
            <Clock
              className={`h-4 w-4 ${isPastDue ? 'text-red-500' : 'text-amber-500'}`}
            />
            <span
              className={
                isPastDue ? 'font-medium text-red-500' : 'text-muted-foreground'
              }
            >
              {isPastDue ? 'Past due' : `Due ${formatRelativeTime(dueAt)}`}
              {' - '}
              {new Date(dueAt).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}
      </CardHeader>
      {description && (
        <>
          <Separator />
          <CardContent className="pt-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </CardContent>
        </>
      )}
    </Card>
  );
}
