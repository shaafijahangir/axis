'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { ArrowLeft, BookOpen, Pencil, Eye, EyeOff, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { RichTextViewer } from '@/components/courses/rich-text-viewer';
import { ContentEditorDialog } from '@/components/courses/content-editor-dialog';
import { CONTENT_QUERY } from '@/lib/graphql/queries/content';
import {
  PUBLISH_CONTENT_MUTATION,
  UNPUBLISH_CONTENT_MUTATION,
  DELETE_CONTENT_MUTATION,
} from '@/lib/graphql/mutations/content';
import { SECTION_TIMELINE_QUERY } from '@/lib/graphql/queries/timeline';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@/types/auth';
import { formatRelativeTime } from '@/lib/utils/relative-time';

interface ContentData {
  id: string;
  sectionId: string;
  title: string;
  body: string;
  publishedAt: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const sectionId = params.sectionId as string;
  const contentId = params.contentId as string;
  const { user } = useAuthStore();

  const canEdit = user?.roles.some((r) =>
    [UserRole.INSTRUCTOR, UserRole.ADMIN].includes(r),
  );

  const { data, loading, refetch } = useQuery<{ content: ContentData }>(
    CONTENT_QUERY,
    { variables: { id: contentId } },
  );

  const [publishContent, { loading: publishing }] = useMutation(
    PUBLISH_CONTENT_MUTATION,
    {
      variables: { id: contentId, sectionId },
      refetchQueries: [
        { query: SECTION_TIMELINE_QUERY, variables: { sectionId } },
      ],
      onCompleted: () => {
        toast.success('Content published');
        refetch();
      },
      onError: (error) => toast.error(error.message),
    },
  );

  const [unpublishContent, { loading: unpublishing }] = useMutation(
    UNPUBLISH_CONTENT_MUTATION,
    {
      variables: { id: contentId, sectionId },
      refetchQueries: [
        { query: SECTION_TIMELINE_QUERY, variables: { sectionId } },
      ],
      onCompleted: () => {
        toast.success('Content unpublished — now a draft');
        refetch();
      },
      onError: (error) => toast.error(error.message),
    },
  );

  const [deleteContent, { loading: deleting }] = useMutation(
    DELETE_CONTENT_MUTATION,
    {
      variables: { id: contentId, sectionId },
      refetchQueries: [
        { query: SECTION_TIMELINE_QUERY, variables: { sectionId } },
      ],
      onCompleted: () => {
        toast.success('Content deleted');
        router.push(`/courses/${courseId}/section/${sectionId}`);
      },
      onError: (error) => toast.error(error.message),
    },
  );

  const content = data?.content;
  const isPublished = !!content?.publishedAt;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-medium">Content not found</h2>
        <Button asChild variant="outline" className="mt-4">
          <Link href={`/courses/${courseId}/section/${sectionId}`}>
            Back to timeline
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/courses/${courseId}/section/${sectionId}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Timeline
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-500" />
            {isPublished ? (
              <Badge
                variant="outline"
                className="text-emerald-600 dark:text-emerald-400"
              >
                <Eye className="mr-1 h-3 w-3" />
                Published
              </Badge>
            ) : (
              <Badge variant="secondary">
                <EyeOff className="mr-1 h-3 w-3" />
                Draft
              </Badge>
            )}
          </div>

          <h1 className="text-2xl font-bold">{content.title}</h1>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              By {content.author.firstName} {content.author.lastName}
            </span>
            <span>Created {formatRelativeTime(content.createdAt)}</span>
            {content.updatedAt !== content.createdAt && (
              <span>Updated {formatRelativeTime(content.updatedAt)}</span>
            )}
          </div>

          {/* Instructor controls */}
          {canEdit && (
            <div className="flex flex-wrap gap-2 border-t pt-3">
              <ContentEditorDialog
                sectionId={sectionId}
                editData={{
                  id: content.id,
                  title: content.title,
                  body: content.body,
                }}
                trigger={
                  <Button size="sm" variant="outline">
                    <Pencil className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
                }
                onSuccess={() => refetch()}
              />

              {isPublished ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => unpublishContent()}
                  disabled={unpublishing}
                >
                  <EyeOff className="mr-1 h-4 w-4" />
                  {unpublishing ? 'Unpublishing...' : 'Unpublish'}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => publishContent()}
                  disabled={publishing}
                >
                  <Eye className="mr-1 h-4 w-4" />
                  {publishing ? 'Publishing...' : 'Publish'}
                </Button>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive">
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete content?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete &quot;{content.title}&quot;.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteContent()}
                      disabled={deleting}
                    >
                      {deleting ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <RichTextViewer html={content.body} />
        </CardContent>
      </Card>
    </div>
  );
}
