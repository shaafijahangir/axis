'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ACADEMIC_TERMS_QUERY } from '@/lib/graphql/queries/admin-academics';
import { REMOVE_ACADEMIC_TERM_MUTATION } from '@/lib/graphql/mutations/admin-academics';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateTermDialog } from './create-term-dialog';
import { EditTermDialog } from './edit-term-dialog';

interface AcademicTerm {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  createdAt: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function TermsTable() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTerm, setEditTerm] = useState<AcademicTerm | null>(null);
  const [deleteTerm, setDeleteTerm] = useState<AcademicTerm | null>(null);

  const { data, loading, refetch } = useQuery<{
    academicTerms: AcademicTerm[];
  }>(ACADEMIC_TERMS_QUERY, { fetchPolicy: 'cache-and-network' });

  const [removeTerm, { loading: removing }] = useMutation(
    REMOVE_ACADEMIC_TERM_MUTATION,
    {
      onCompleted: () => {
        toast.success('Term deleted');
        setDeleteTerm(null);
        refetch();
      },
      onError: (error) => toast.error(error.message),
    },
  );

  const terms = data?.academicTerms ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {terms.length} term{terms.length !== 1 ? 's' : ''}
        </p>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Term
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && terms.length === 0 ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : terms.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No academic terms yet.
                </TableCell>
              </TableRow>
            ) : (
              terms.map((term) => (
                <TableRow key={term.id}>
                  <TableCell className="font-medium">{term.name}</TableCell>
                  <TableCell>{formatDate(term.startDate)}</TableCell>
                  <TableCell>{formatDate(term.endDate)}</TableCell>
                  <TableCell>
                    {term.isCurrent ? (
                      <Badge>Current</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setEditTerm(term)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive"
                        onClick={() => setDeleteTerm(term)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateTermDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => refetch()}
      />
      <EditTermDialog
        open={!!editTerm}
        onOpenChange={(open) => !open && setEditTerm(null)}
        term={editTerm}
        onSuccess={() => refetch()}
      />
      <AlertDialog
        open={!!deleteTerm}
        onOpenChange={(open) => !open && setDeleteTerm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Term</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteTerm?.name}&rdquo;?
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteTerm && removeTerm({ variables: { id: deleteTerm.id } })
              }
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
