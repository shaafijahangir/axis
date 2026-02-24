'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  ArrowLeft,
  Pin,
  Lock,
  CheckCircle,
  MessageSquare,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { RichTextViewer } from '@/components/courses/rich-text-viewer';
import { RichTextEditor } from '@/components/courses/rich-text-editor';
import { formatRelativeTime } from '@/lib/utils/relative-time';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@/types/auth';
import {
  DISCUSSION_QUERY,
  DISCUSSION_REPLIES_QUERY,
} from '@/lib/graphql/queries/discussions';
import {
  REPLY_TO_DISCUSSION_MUTATION,
  PIN_DISCUSSION_MUTATION,
  LOCK_DISCUSSION_MUTATION,
  MARK_DISCUSSION_ANSWERED_MUTATION,
  MARK_REPLY_AS_ANSWER_MUTATION,
} from '@/lib/graphql/mutations/discussions';

interface DiscussionAuthor {
  id: string;
  firstName: string;
  lastName: string;
}

interface DiscussionData {
  id: string;
  sectionId: string;
  title: string;
  body: string;
  isPinned: boolean;
  isLocked: boolean;
  isAnswered: boolean;
  replyCount: number;
  createdAt: string;
  author: DiscussionAuthor;
}

interface ReplyData {
  id: string;
  discussionId: string;
  authorId: string;
  parentReplyId: string | null;
  body: string;
  isInstructorAnswer: boolean;
  createdAt: string;
  author: DiscussionAuthor;
}

export default function DiscussionDetailPage() {
  const params = useParams();
  const courseId = params.id as string;
  const sectionId = params.sectionId as string;
  const discussionId = params.discussionId as string;

  const { user } = useAuthStore();
  const isInstructor = user?.roles.some((r) =>
    [UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.TA].includes(r),
  );

  const [replyBody, setReplyBody] = useState('');
  const [replyError, setReplyError] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const {
    data: discussionData,
    loading: discussionLoading,
    refetch: refetchDiscussion,
  } = useQuery<{
    discussion: DiscussionData;
  }>(DISCUSSION_QUERY, { variables: { id: discussionId } });

  const {
    data: repliesData,
    loading: repliesLoading,
    refetch: refetchReplies,
  } = useQuery<{
    discussionReplies: ReplyData[];
  }>(DISCUSSION_REPLIES_QUERY, { variables: { discussionId } });

  const [replyToDiscussion, { loading: replyLoading }] = useMutation(
    REPLY_TO_DISCUSSION_MUTATION,
    {
      onCompleted: () => {
        setReplyBody('');
        setReplyingTo(null);
        setReplyError('');
        refetchReplies();
        refetchDiscussion();
      },
      onError: (err) => setReplyError(err.message),
    },
  );

  const [pinDiscussion] = useMutation(PIN_DISCUSSION_MUTATION, {
    onCompleted: () => refetchDiscussion(),
  });

  const [lockDiscussion] = useMutation(LOCK_DISCUSSION_MUTATION, {
    onCompleted: () => refetchDiscussion(),
  });

  const [markAnswered] = useMutation(MARK_DISCUSSION_ANSWERED_MUTATION, {
    onCompleted: () => refetchDiscussion(),
  });

  const [markReplyAsAnswer] = useMutation(MARK_REPLY_AS_ANSWER_MUTATION, {
    onCompleted: () => refetchReplies(),
  });

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    setReplyError('');

    if (!replyBody || replyBody === '<p></p>') {
      setReplyError('Reply cannot be empty.');
      return;
    }

    replyToDiscussion({
      variables: {
        input: {
          discussionId,
          body: replyBody,
          parentReplyId: replyingTo ?? undefined,
        },
      },
    });
  };

  const discussion = discussionData?.discussion;
  const replies = repliesData?.discussionReplies ?? [];

  // Separate top-level replies from nested replies
  const topLevelReplies = replies.filter((r) => !r.parentReplyId);
  const repliesByParent = replies.reduce<Record<string, ReplyData[]>>(
    (acc, reply) => {
      if (reply.parentReplyId) {
        if (!acc[reply.parentReplyId]) acc[reply.parentReplyId] = [];
        acc[reply.parentReplyId].push(reply);
      }
      return acc;
    },
    {},
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back nav */}
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={`/courses/${courseId}/section/${sectionId}`}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to timeline
        </Link>
      </Button>

      {/* Discussion OP */}
      {discussionLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : discussion ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            {/* Title + badges */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {discussion.isPinned && (
                  <Pin className="h-4 w-4 text-amber-500" />
                )}
                {discussion.isAnswered && (
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Answered
                  </Badge>
                )}
                {discussion.isLocked && (
                  <Badge variant="secondary">
                    <Lock className="mr-1 h-3 w-3" />
                    Locked
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-semibold">{discussion.title}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">
                  {discussion.author.firstName} {discussion.author.lastName}
                </span>
                <span>·</span>
                <span>{formatRelativeTime(discussion.createdAt)}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {discussion.replyCount}{' '}
                  {discussion.replyCount === 1 ? 'reply' : 'replies'}
                </span>
              </div>
            </div>

            <Separator />

            {/* Body */}
            <RichTextViewer html={discussion.body} />

            {/* Instructor controls */}
            {isInstructor && (
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    pinDiscussion({ variables: { id: discussionId } })
                  }
                >
                  <Pin className="mr-1 h-4 w-4" />
                  {discussion.isPinned ? 'Unpin' : 'Pin'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    lockDiscussion({ variables: { id: discussionId } })
                  }
                >
                  <Lock className="mr-1 h-4 w-4" />
                  {discussion.isLocked ? 'Unlock' : 'Lock'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    markAnswered({ variables: { id: discussionId } })
                  }
                >
                  <CheckCircle className="mr-1 h-4 w-4" />
                  {discussion.isAnswered ? 'Unmark answered' : 'Mark answered'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">Discussion not found.</p>
      )}

      {/* Replies */}
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Replies ({discussion?.replyCount ?? 0})
        </h2>
      </div>

      {repliesLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : topLevelReplies.length > 0 ? (
        <div className="space-y-3">
          {topLevelReplies.map((reply) => (
            <ReplyCard
              key={reply.id}
              reply={reply}
              nestedReplies={repliesByParent[reply.id] ?? []}
              isInstructor={!!isInstructor}
              onMarkAsAnswer={(replyId) =>
                markReplyAsAnswer({ variables: { replyId } })
              }
              onReplyTo={(replyId) => {
                setReplyingTo(replyId);
                document
                  .getElementById('reply-form')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No replies yet. Be the first to respond.
        </p>
      )}

      {/* Reply form */}
      {discussion && !discussion.isLocked && (
        <Card id="reply-form">
          <CardContent className="p-6">
            <h3 className="mb-4 font-medium">
              {replyingTo ? 'Reply to reply' : 'Post a reply'}
              {replyingTo && (
                <Button
                  variant="link"
                  size="sm"
                  className="ml-2 h-auto p-0 text-muted-foreground"
                  onClick={() => setReplyingTo(null)}
                >
                  (cancel)
                </Button>
              )}
            </h3>
            <form onSubmit={handleReply} className="space-y-4">
              <RichTextEditor
                content={replyBody}
                onChange={setReplyBody}
                placeholder="Write your reply... Use @FirstName to mention someone."
              />
              {replyError && (
                <p className="text-sm text-destructive">{replyError}</p>
              )}
              <div className="flex justify-end">
                <Button type="submit" disabled={replyLoading}>
                  {replyLoading ? 'Posting...' : 'Post Reply'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {discussion?.isLocked && (
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            This discussion is locked. No new replies can be posted.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Reply Card ────────────────────────────────────────────────────────────────

interface ReplyCardProps {
  reply: ReplyData;
  nestedReplies: ReplyData[];
  isInstructor: boolean;
  onMarkAsAnswer: (replyId: string) => void;
  onReplyTo: (replyId: string) => void;
}

function ReplyCard({
  reply,
  nestedReplies,
  isInstructor,
  onMarkAsAnswer,
  onReplyTo,
}: ReplyCardProps) {
  return (
    <div className="space-y-2">
      <Card
        className={
          reply.isInstructorAnswer
            ? 'border-emerald-300 dark:border-emerald-700'
            : ''
        }
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">
                {reply.author.firstName} {reply.author.lastName}
              </span>
              <span className="text-muted-foreground">
                · {formatRelativeTime(reply.createdAt)}
              </span>
              {reply.isInstructorAnswer && (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">
                  <Award className="mr-1 h-3 w-3" />
                  Instructor Answer
                </Badge>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground"
                onClick={() => onReplyTo(reply.id)}
              >
                Reply
              </Button>
              {isInstructor && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={() => onMarkAsAnswer(reply.id)}
                >
                  {reply.isInstructorAnswer ? 'Unmark' : 'Mark as answer'}
                </Button>
              )}
            </div>
          </div>
          <RichTextViewer html={reply.body} />
        </CardContent>
      </Card>

      {/* Nested replies (one level deep) */}
      {nestedReplies.length > 0 && (
        <div className="ml-8 space-y-2">
          {nestedReplies.map((nested) => (
            <Card key={nested.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">
                    {nested.author.firstName} {nested.author.lastName}
                  </span>
                  <span className="text-muted-foreground">
                    · {formatRelativeTime(nested.createdAt)}
                  </span>
                </div>
                <RichTextViewer html={nested.body} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
