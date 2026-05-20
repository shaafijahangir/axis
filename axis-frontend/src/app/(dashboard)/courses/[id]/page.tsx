'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client/react';
import { ArrowLeft, Plus } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  COURSE_QUERY,
  COURSE_SECTIONS_QUERY,
} from '@/lib/graphql/queries/courses';
import { ACADEMIC_TERMS_QUERY } from '@/lib/graphql/queries/admin-academics';
import { CREATE_SECTION_MUTATION } from '@/lib/graphql/mutations/courses';
import { SectionList } from '@/components/courses/section-list';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@/types/auth';

interface Term {
  id: string;
  name: string;
  isCurrent: boolean;
}

function CreateSectionDialog({
  courseId,
  open,
  onOpenChange,
  onCreated,
}: {
  courseId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [termId, setTermId] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');

  const { data: termsData } = useQuery<{ academicTerms: Term[] }>(
    ACADEMIC_TERMS_QUERY,
  );
  const terms = termsData?.academicTerms ?? [];

  const [createSection, { loading }] = useMutation(CREATE_SECTION_MUTATION, {
    onCompleted: () => {
      toast.success('Section created');
      onOpenChange(false);
      onCreated();
      setTermId('');
      setLocation('');
      setCapacity('');
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termId) return;
    createSection({
      variables: {
        input: {
          courseId,
          termId,
          location: location.trim() || undefined,
          capacity: capacity ? parseInt(capacity) : undefined,
        },
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Section</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="term">
              Term <span className="text-destructive">*</span>
            </Label>
            <Select value={termId} onValueChange={setTermId} required>
              <SelectTrigger id="term">
                <SelectValue placeholder="Select a term…" />
              </SelectTrigger>
              <SelectContent>
                {terms.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                    {t.isCurrent && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (current)
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g. Room 204, Online"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="capacity">Capacity</Label>
            <Input
              id="capacity"
              type="number"
              min={1}
              placeholder="e.g. 30"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !termId}>
              {loading ? 'Creating…' : 'Create Section'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CourseDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuthStore();
  const [showCreateSection, setShowCreateSection] = useState(false);

  const canManage = user?.roles.some((r) =>
    [UserRole.ADMIN, UserRole.INSTRUCTOR].includes(r),
  );

  interface CourseDetail {
    id: string;
    code: string;
    title: string;
    description?: string;
    credits?: number;
  }

  interface SectionItem {
    id: string;
    location?: string;
    capacity?: number;
    status: string;
    instructor?: { id: string; firstName: string; lastName: string };
  }

  const { data: courseData, loading: courseLoading } = useQuery<{
    course: CourseDetail;
  }>(COURSE_QUERY, { variables: { id } });

  const {
    data: sectionsData,
    loading: sectionsLoading,
    refetch: refetchSections,
  } = useQuery<{
    courseSections: SectionItem[];
  }>(COURSE_SECTIONS_QUERY, { variables: { courseId: id } });

  if (courseLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const course = courseData?.course;
  if (!course) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">Course not found.</p>
        <Link href="/courses" className="mt-2 inline-block">
          <Button variant="outline">Back to Courses</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/courses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{course.code}</Badge>
            {course.credits && (
              <Badge variant="outline">{course.credits} credits</Badge>
            )}
          </div>
          <h1 className="mt-1 text-2xl font-bold">{course.title}</h1>
        </div>
      </div>

      {course.description && (
        <p className="text-muted-foreground">{course.description}</p>
      )}

      <Separator />

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Sections</h2>
          {canManage && (
            <Button size="sm" onClick={() => setShowCreateSection(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Add Section
            </Button>
          )}
        </div>
        {sectionsLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <SectionList
            courseId={id}
            sections={sectionsData?.courseSections ?? []}
            showEnroll
          />
        )}
      </div>

      <CreateSectionDialog
        courseId={id}
        open={showCreateSection}
        onOpenChange={setShowCreateSection}
        onCreated={() => void refetchSections()}
      />
    </div>
  );
}
