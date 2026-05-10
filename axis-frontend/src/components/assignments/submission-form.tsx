'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@apollo/client/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SUBMIT_ASSIGNMENT_MUTATION } from '@/lib/graphql/mutations/assignments';
import { ATTACH_UPLOAD_MUTATION } from '@/lib/graphql/mutations/uploads';
import { MY_SUBMISSIONS_QUERY } from '@/lib/graphql/queries/assignments';
import {
  FileUpload,
  type UploadedFile,
} from '@/components/uploads/file-upload';

const submissionSchema = z.object({
  text: z.string().min(1, 'Submission cannot be empty'),
});

type SubmissionFormValues = z.infer<typeof submissionSchema>;

interface SubmissionFormProps {
  assignmentId: string;
}

export function SubmissionForm({ assignmentId }: SubmissionFormProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionSchema),
  });

  const [submitAssignment, { loading: submitting, error }] = useMutation(
    SUBMIT_ASSIGNMENT_MUTATION,
    {
      refetchQueries: [
        { query: MY_SUBMISSIONS_QUERY, variables: { assignmentId } },
      ],
    },
  );
  const [attachUpload] = useMutation(ATTACH_UPLOAD_MUTATION);

  const handleUploadComplete = (file: UploadedFile) => {
    setUploadedFiles((prev) => [...prev, file]);
  };

  const onSubmit = async (values: SubmissionFormValues) => {
    try {
      const { data } = await submitAssignment({
        variables: {
          input: {
            assignmentId,
            content: JSON.stringify({ text: values.text }),
          },
        },
      });

      const submissionId: string =
        (data as { submitAssignment?: { id: string } })?.submitAssignment?.id ??
        '';

      // Link any uploaded files to this submission now that we have an ID.
      // Fire-and-forget in parallel — submission already succeeded.
      if (submissionId && uploadedFiles.length > 0) {
        await Promise.all(
          uploadedFiles.map((f) =>
            attachUpload({
              variables: { input: { fileId: f.id, contextId: submissionId } },
            }),
          ),
        );
      }

      reset();
      setUploadedFiles([]);
    } catch {
      // Apollo useMutation sets `error` state automatically —
      // the UI below will display the error message.
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Submit Your Work</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="submission-text">Your answer</Label>
            <Textarea
              id="submission-text"
              placeholder="Type your submission here..."
              className="min-h-[120px]"
              {...register('text')}
            />
            {errors.text && (
              <p className="text-sm text-destructive">{errors.text.message}</p>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Attachments</Label>
            <p className="text-xs text-muted-foreground">
              Upload files before submitting. They will be linked to your
              submission automatically.
            </p>
            <FileUpload
              context="assignment_submission"
              onUploadComplete={handleUploadComplete}
              maxFiles={5}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">
              Failed to submit. Please try again.
            </p>
          )}

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
