'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { CalendarClock } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { EXTEND_DEADLINES_MUTATION } from '@/lib/graphql/mutations/assignments';
import { SECTION_TIMELINE_QUERY } from '@/lib/graphql/queries/timeline';

interface AssignmentItem {
  id: string;
  title: string;
  dueAt?: string;
}

interface ExtendDeadlineDialogProps {
  sectionId: string;
  assignments: AssignmentItem[];
}

export function ExtendDeadlineDialog({
  sectionId,
  assignments,
}: ExtendDeadlineDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [newDueAt, setNewDueAt] = useState('');

  const [extendDeadlines, { loading }] = useMutation(
    EXTEND_DEADLINES_MUTATION,
    {
      refetchQueries: [
        { query: SECTION_TIMELINE_QUERY, variables: { sectionId } },
      ],
      onCompleted: () => {
        toast.success(
          `Deadline extended for ${selectedIds.length} assignment${selectedIds.length !== 1 ? 's' : ''}`,
        );
        setOpen(false);
        setSelectedIds([]);
        setNewDueAt('');
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );

  const assignmentsWithDue = assignments.filter((a) => a.dueAt);

  const handleToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleToggleAll = () => {
    if (selectedIds.length === assignmentsWithDue.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(assignmentsWithDue.map((a) => a.id));
    }
  };

  const handleSubmit = () => {
    if (selectedIds.length === 0 || !newDueAt) return;
    extendDeadlines({
      variables: {
        input: {
          assignmentIds: selectedIds,
          sectionId,
          newDueAt: new Date(newDueAt).toISOString(),
        },
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CalendarClock className="mr-1 h-4 w-4" />
          Extend Deadlines
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Extend Deadlines</DialogTitle>
          <DialogDescription>
            Select assignments and set a new due date.
          </DialogDescription>
        </DialogHeader>

        {assignmentsWithDue.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No assignments with due dates found.
          </p>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b pb-2">
                <Checkbox
                  id="select-all"
                  checked={selectedIds.length === assignmentsWithDue.length}
                  onCheckedChange={handleToggleAll}
                />
                <Label htmlFor="select-all" className="text-sm font-medium">
                  Select all ({assignmentsWithDue.length})
                </Label>
              </div>

              <div className="max-h-48 space-y-2 overflow-y-auto">
                {assignmentsWithDue.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center gap-2 rounded-md p-2 hover:bg-muted/50"
                  >
                    <Checkbox
                      id={assignment.id}
                      checked={selectedIds.includes(assignment.id)}
                      onCheckedChange={() => handleToggle(assignment.id)}
                    />
                    <Label
                      htmlFor={assignment.id}
                      className="flex flex-1 cursor-pointer items-center justify-between text-sm"
                    >
                      <span className="truncate">{assignment.title}</span>
                      {assignment.dueAt && (
                        <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                          Due{' '}
                          {new Date(assignment.dueAt).toLocaleDateString(
                            'en-US',
                            {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            },
                          )}
                        </span>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-due-date">New Due Date</Label>
              <Input
                id="new-due-date"
                type="datetime-local"
                value={newDueAt}
                onChange={(e) => setNewDueAt(e.target.value)}
              />
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || selectedIds.length === 0 || !newDueAt}
          >
            {loading ? 'Extending...' : 'Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
