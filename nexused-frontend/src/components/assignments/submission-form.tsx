'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@apollo/client/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SUBMIT_ASSIGNMENT_MUTATION } from '@/lib/graphql/mutations/assignments';
import { MY_SUBMISSIONS_QUERY } from '@/lib/graphql/queries/assignments';

const submissionSchema = z.object({
  text: z.string().min(1, 'Submission cannot be empty'),
});

type SubmissionFormValues = z.infer<typeof submissionSchema>;

interface SubmissionFormProps {
  assignmentId: string;
}

export function SubmissionForm({ assignmentId }: SubmissionFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionSchema),
  });

  const [submitAssignment, { loading, error }] = useMutation(
    SUBMIT_ASSIGNMENT_MUTATION,
    {
      refetchQueries: [
        { query: MY_SUBMISSIONS_QUERY, variables: { assignmentId } },
      ],
    },
  );

  const onSubmit = async (values: SubmissionFormValues) => {
    try {
      await submitAssignment({
        variables: {
          input: {
            assignmentId,
            content: JSON.stringify({ text: values.text }),
          },
        },
      });
      reset();
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
              <p className="text-sm text-red-500">{errors.text.message}</p>
            )}
          </div>
          {error && (
            <p className="text-sm text-red-500">
              Failed to submit. Please try again.
            </p>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
