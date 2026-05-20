'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ADMIN_SECTIONS_QUERY } from '@/lib/graphql/queries/admin-academics';
import { REMOVE_SECTION_MUTATION } from '@/lib/graphql/mutations/admin-academics';
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
import { CreateSectionDialog } from './create-section-dialog';
import { EditSectionDialog } from './edit-section-dialog';

interface AdminSection {
  id: string;
  courseId: string;
  termId: string;
  instructorId: string;
  location: string | null;
  capacity: number | null;
  status: string;
  schedule?: string | null;
  meetingDays?: string[] | null;
  startTime?: string | null;
  endTime?: string | null;
  room?: string | null;
  course: { id: string; code: string; title: string };
  instructor: { id: string; firstName: string; lastName: string };
}

const STATUS_VARIANT: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  active: 'default',
  draft: 'outline',
  completed: 'secondary',
  cancelled: 'destructive',
};

export function SectionsTable() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editSection, setEditSection] = useState<AdminSection | null>(null);
  const [deleteSection, setDeleteSection] = useState<AdminSection | null>(null);

  const { data, loading, refetch } = useQuery<{
    adminSections: AdminSection[];
  }>(ADMIN_SECTIONS_QUERY, { fetchPolicy: 'cache-and-network' });

  const [removeSection, { loading: removing }] = useMutation(
    REMOVE_SECTION_MUTATION,
    {
      onCompleted: () => {
        toast.success('Section deleted');
        setDeleteSection(null);
        refetch();
      },
      onError: (error) => toast.error(error.message),
    },
  );

  const sections = data?.adminSections ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {sections.length} section{sections.length !== 1 ? 's' : ''}
        </p>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Section
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Instructor</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && sections.length === 0 ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : sections.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No sections yet.
                </TableCell>
              </TableRow>
            ) : (
              sections.map((section) => (
                <TableRow key={section.id}>
                  <TableCell>
                    <div>
                      <span className="font-mono text-xs">
                        {section.course.code}
                      </span>
                      <span className="ml-2 text-sm">
                        {section.course.title}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {section.instructor.firstName} {section.instructor.lastName}
                  </TableCell>
                  <TableCell>{section.location ?? '—'}</TableCell>
                  <TableCell>{section.capacity ?? '—'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={STATUS_VARIANT[section.status] ?? 'outline'}
                      className="capitalize"
                    >
                      {section.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setEditSection(section)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive"
                        onClick={() => setDeleteSection(section)}
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

      <CreateSectionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => refetch()}
      />
      <EditSectionDialog
        open={!!editSection}
        onOpenChange={(open) => !open && setEditSection(null)}
        section={editSection}
        onSuccess={() => refetch()}
      />
      <AlertDialog
        open={!!deleteSection}
        onOpenChange={(open) => !open && setDeleteSection(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this section of{' '}
              {deleteSection?.course.code}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteSection &&
                removeSection({ variables: { id: deleteSection.id } })
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
