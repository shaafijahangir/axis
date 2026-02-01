'use client';

import { CheckCircle, Clock, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SubmissionData {
  id: string;
  attempt: number;
  content?: string;
  submittedAt?: string;
  score?: number;
  gradedAt?: string;
  feedback?: string;
}

interface SubmissionHistoryProps {
  submissions: SubmissionData[];
  pointsPossible: number;
}

export function SubmissionHistory({
  submissions,
  pointsPossible,
}: SubmissionHistoryProps) {
  if (submissions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Past Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-6 text-center">
            <FileText className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No submissions yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Past Submissions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {submissions.map((sub) => {
          const isGraded = sub.gradedAt != null;
          const contentObj = sub.content ? tryParseJson(sub.content) : null;
          const displayText = contentObj?.text ?? sub.content;

          return (
            <div key={sub.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Attempt {sub.attempt}</Badge>
                  {isGraded ? (
                    <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      {sub.score}/{pointsPossible}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Pending
                    </div>
                  )}
                </div>
                {sub.submittedAt && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(sub.submittedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
              {displayText && (
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                  {displayText}
                </p>
              )}
              {sub.feedback && (
                <div className="mt-2 rounded bg-muted p-2">
                  <p className="text-xs font-medium">Feedback</p>
                  <p className="mt-1 text-sm">{sub.feedback}</p>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function tryParseJson(str: string): Record<string, any> | null {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
