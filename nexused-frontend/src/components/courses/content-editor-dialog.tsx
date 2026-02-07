'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { FileText, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/courses/rich-text-editor';
import {
  CREATE_CONTENT_MUTATION,
  UPDATE_CONTENT_MUTATION,
} from '@/lib/graphql/mutations/content';
import { SECTION_TIMELINE_QUERY } from '@/lib/graphql/queries/timeline';

interface ContentEditorDialogProps {
  sectionId: string;
  /** When provided, the dialog is in edit mode. */
  editData?: {
    id: string;
    title: string;
    body: string;
  };
  /** Custom trigger element. Defaults to a "Create Content" button. */
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function ContentEditorDialog({
  sectionId,
  editData,
  trigger,
  onSuccess,
}: ContentEditorDialogProps) {
  const isEdit = !!editData;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(editData?.title ?? '');
  const [body, setBody] = useState(editData?.body ?? '');

  const [createContent, { loading: creating }] = useMutation(
    CREATE_CONTENT_MUTATION,
    {
      refetchQueries: [
        { query: SECTION_TIMELINE_QUERY, variables: { sectionId } },
      ],
      onCompleted: () => {
        toast.success('Content created as draft');
        closeAndReset();
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );

  const [updateContent, { loading: updating }] = useMutation(
    UPDATE_CONTENT_MUTATION,
    {
      refetchQueries: [
        { query: SECTION_TIMELINE_QUERY, variables: { sectionId } },
      ],
      onCompleted: () => {
        toast.success('Content updated');
        closeAndReset();
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );

  const loading = creating || updating;

  const closeAndReset = () => {
    setOpen(false);
    if (!isEdit) {
      setTitle('');
      setBody('');
    }
  };

  const handleSubmit = () => {
    if (!title.trim() || !body.trim()) return;

    if (isEdit && editData) {
      updateContent({
        variables: {
          input: {
            id: editData.id,
            sectionId,
            title: title.trim(),
            body,
          },
        },
      });
    } else {
      createContent({
        variables: {
          input: {
            sectionId,
            title: title.trim(),
            body,
          },
        },
      });
    }
  };

  const defaultTrigger = (
    <Button size="sm" variant="outline">
      <Plus className="mr-1 h-4 w-4" />
      <FileText className="mr-1 h-4 w-4" />
      Content
    </Button>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v && isEdit && editData) {
          setTitle(editData.title);
          setBody(editData.body);
        }
        if (!v && !isEdit) {
          setTitle('');
          setBody('');
        }
      }}
    >
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Content' : 'Create Content'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update this content item.'
              : 'New content is saved as a draft. Publish it from the detail view.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content-title">Title</Label>
            <Input
              id="content-title"
              placeholder="Lecture notes, reading material, etc."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label>Body</Label>
            <RichTextEditor
              content={body}
              onChange={setBody}
              placeholder="Write your content here..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !title.trim() || !body.trim()}
          >
            {loading
              ? isEdit
                ? 'Saving...'
                : 'Creating...'
              : isEdit
                ? 'Save Changes'
                : 'Create Draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
