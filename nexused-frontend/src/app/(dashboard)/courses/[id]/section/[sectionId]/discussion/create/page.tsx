'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation } from '@apollo/client/react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RichTextEditor } from '@/components/courses/rich-text-editor';
import { CREATE_DISCUSSION_MUTATION } from '@/lib/graphql/mutations/discussions';

export default function CreateDiscussionPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const sectionId = params.sectionId as string;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  const [createDiscussion, { loading }] = useMutation<{
    createDiscussion: { id: string };
  }>(CREATE_DISCUSSION_MUTATION, {
    onCompleted: (data) => {
      router.push(
        `/courses/${courseId}/section/${sectionId}/discussion/${data.createDiscussion.id}`,
      );
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!body || body === '<p></p>') {
      setError('Discussion body is required.');
      return;
    }

    createDiscussion({
      variables: {
        input: { sectionId, title: title.trim(), body },
      },
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/courses/${courseId}/section/${sectionId}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">New Discussion</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Start a discussion</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="What's on your mind?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={300}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Body</Label>
              <RichTextEditor
                content={body}
                onChange={setBody}
                placeholder="Describe your question or topic in detail..."
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  router.push(`/courses/${courseId}/section/${sectionId}`)
                }
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Posting...' : 'Post Discussion'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
