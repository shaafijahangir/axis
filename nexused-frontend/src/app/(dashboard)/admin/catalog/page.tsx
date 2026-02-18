'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import Link from 'next/link';
import {
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
  Upload,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  CATALOG_COURSES_QUERY,
  DEPARTMENT_LIST_QUERY,
  DEGREE_PROGRAMS_ADMIN_QUERY,
} from '@/lib/graphql/queries/catalog';
import {
  CREATE_CATALOG_COURSE_MUTATION,
  UPDATE_CATALOG_COURSE_MUTATION,
  DELETE_CATALOG_COURSE_MUTATION,
  CREATE_DEGREE_PROGRAM_MUTATION,
  UPDATE_DEGREE_PROGRAM_MUTATION,
} from '@/lib/graphql/mutations/catalog';

// ─── Types ──────────────────────────────────────────────────────────────────

type CourseCategory =
  | 'core'
  | 'elective'
  | 'general_education'
  | 'lab'
  | 'seminar';

interface Course {
  id: string;
  code: string;
  title: string;
  description?: string;
  credits?: number;
  departmentId?: string;
  category?: CourseCategory;
  courseLevel?: number;
  offeredSemesters?: string[];
  prerequisiteCourseIds?: string[];
  corequisiteCourseIds?: string[];
  createdAt?: string;
}

interface CatalogPage {
  items: Course[];
  total: number;
}

interface RequirementGroup {
  name: string;
  type: string;
  creditsRequired: number;
  courseIds: string[];
  minCoursesRequired: number;
  description?: string;
}

interface DegreeProgram {
  id: string;
  name: string;
  code: string;
  department?: string;
  description?: string;
  programType?: string;
  totalCreditsRequired: number;
  expectedDurationSemesters?: number;
  catalogYear?: string;
  status: string;
  requirements: string; // JSON string
  createdAt?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORIES: { value: CourseCategory; label: string }[] = [
  { value: 'core', label: 'Core' },
  { value: 'elective', label: 'Elective' },
  { value: 'general_education', label: 'General Education' },
  { value: 'lab', label: 'Lab' },
  { value: 'seminar', label: 'Seminar' },
];

const SEMESTERS = ['Fall', 'Spring', 'Summer'];
const LEVELS = [100, 200, 300, 400, 500];
const PROGRAM_TYPES = ['major', 'minor', 'certificate', 'diploma'];
const PROGRAM_STATUSES = ['draft', 'active', 'archived'];
const REQ_TYPES = ['core', 'elective', 'general_education', 'concentration'];
const PAGE_SIZE = 20;

// ─── Category badge ──────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category?: string }) {
  const colors: Record<string, string> = {
    core: 'bg-blue-100 text-blue-800',
    elective: 'bg-purple-100 text-purple-800',
    general_education: 'bg-green-100 text-green-800',
    lab: 'bg-orange-100 text-orange-800',
    seminar: 'bg-pink-100 text-pink-800',
  };
  if (!category) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[category] ?? 'bg-muted text-muted-foreground'}`}
    >
      {CATEGORIES.find((c) => c.value === category)?.label ?? category}
    </span>
  );
}

// ─── Course Form ─────────────────────────────────────────────────────────────

interface CourseFormState {
  code: string;
  title: string;
  description: string;
  credits: string;
  departmentId: string;
  category: string;
  courseLevel: string;
  offeredSemesters: string[];
  prerequisiteCourseIds: string[];
  corequisiteCourseIds: string[];
}

const emptyCourseForm = (): CourseFormState => ({
  code: '',
  title: '',
  description: '',
  credits: '',
  departmentId: '',
  category: '',
  courseLevel: '',
  offeredSemesters: [],
  prerequisiteCourseIds: [],
  corequisiteCourseIds: [],
});

function courseToForm(course: Course): CourseFormState {
  return {
    code: course.code,
    title: course.title,
    description: course.description ?? '',
    credits: course.credits?.toString() ?? '',
    departmentId: course.departmentId ?? '',
    category: course.category ?? '',
    courseLevel: course.courseLevel?.toString() ?? '',
    offeredSemesters: course.offeredSemesters ?? [],
    prerequisiteCourseIds: course.prerequisiteCourseIds ?? [],
    corequisiteCourseIds: course.corequisiteCourseIds ?? [],
  };
}

interface CourseDialogProps {
  open: boolean;
  course: Course | null;
  allCourses: Course[];
  onClose: () => void;
  onSave: (form: CourseFormState, id?: string) => Promise<void>;
  saving: boolean;
}

function CourseDialog({
  open,
  course,
  allCourses,
  onClose,
  onSave,
  saving,
}: CourseDialogProps) {
  const [form, setForm] = useState<CourseFormState>(() =>
    course ? courseToForm(course) : emptyCourseForm(),
  );
  const [prereqSearch, setPrereqSearch] = useState('');

  // Reset form when dialog opens
  const resetAndClose = useCallback(() => {
    setForm(emptyCourseForm());
    setPrereqSearch('');
    onClose();
  }, [onClose]);

  // Sync form when course prop changes
  if (
    open &&
    course &&
    form.code !== course.code &&
    form.title !== course.title
  ) {
    setForm(courseToForm(course));
  }

  const toggleSemester = (sem: string) => {
    setForm((f) => ({
      ...f,
      offeredSemesters: f.offeredSemesters.includes(sem)
        ? f.offeredSemesters.filter((s) => s !== sem)
        : [...f.offeredSemesters, sem],
    }));
  };

  const togglePrereq = (courseId: string) => {
    setForm((f) => ({
      ...f,
      prerequisiteCourseIds: f.prerequisiteCourseIds.includes(courseId)
        ? f.prerequisiteCourseIds.filter((id) => id !== courseId)
        : [...f.prerequisiteCourseIds, courseId],
    }));
  };

  const filteredCourses = allCourses.filter(
    (c) =>
      c.id !== course?.id &&
      (c.code.toLowerCase().includes(prereqSearch.toLowerCase()) ||
        c.title.toLowerCase().includes(prereqSearch.toLowerCase())),
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && resetAndClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{course ? 'Edit Course' : 'Add Course'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="course-code">Course Code *</Label>
              <Input
                id="course-code"
                placeholder="CS 101"
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="course-credits">Credits</Label>
              <Input
                id="course-credits"
                type="number"
                step="0.5"
                min="0"
                max="12"
                placeholder="3"
                value={form.credits}
                onChange={(e) =>
                  setForm((f) => ({ ...f, credits: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="course-title">Title *</Label>
            <Input
              id="course-title"
              placeholder="Introduction to Computer Science"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="course-description">Description</Label>
            <Textarea
              id="course-description"
              placeholder="Course description..."
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="course-dept">Department</Label>
              <Input
                id="course-dept"
                placeholder="Computer Science"
                value={form.departmentId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, departmentId: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="course-category">Category</Label>
              <Select
                value={form.category || 'none'}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, category: v === 'none' ? '' : v }))
                }
              >
                <SelectTrigger id="course-category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="course-level">Level</Label>
              <Select
                value={form.courseLevel || 'none'}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    courseLevel: v === 'none' ? '' : v,
                  }))
                }
              >
                <SelectTrigger id="course-level">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {LEVELS.map((l) => (
                    <SelectItem key={l} value={l.toString()}>
                      {l}-level
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Offered Semesters</Label>
            <div className="flex gap-2">
              {SEMESTERS.map((sem) => (
                <button
                  key={sem}
                  type="button"
                  onClick={() => toggleSemester(sem)}
                  className={`rounded-full px-3 py-1 text-sm border transition-colors ${
                    form.offeredSemesters.includes(sem)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-input bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {sem}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Prerequisites</Label>
            <Input
              placeholder="Search courses..."
              value={prereqSearch}
              onChange={(e) => setPrereqSearch(e.target.value)}
            />
            <div className="border rounded-md max-h-32 overflow-y-auto divide-y">
              {filteredCourses.slice(0, 30).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => togglePrereq(c.id)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-muted transition-colors ${
                    form.prerequisiteCourseIds.includes(c.id)
                      ? 'bg-primary/10'
                      : ''
                  }`}
                >
                  <span>
                    <span className="font-mono text-xs mr-2">{c.code}</span>
                    {c.title}
                  </span>
                  {form.prerequisiteCourseIds.includes(c.id) && (
                    <Badge variant="secondary" className="text-xs">
                      Selected
                    </Badge>
                  )}
                </button>
              ))}
              {filteredCourses.length === 0 && (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  No courses found
                </p>
              )}
            </div>
            {form.prerequisiteCourseIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {form.prerequisiteCourseIds.length} prerequisite(s) selected
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave(form, course?.id)}
            disabled={saving || !form.code.trim() || !form.title.trim()}
          >
            {saving ? 'Saving...' : course ? 'Save Changes' : 'Create Course'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Requirement Group Editor ─────────────────────────────────────────────────

interface RequirementGroupEditorProps {
  groups: RequirementGroup[];
  allCourses: Course[];
  onChange: (groups: RequirementGroup[]) => void;
}

function RequirementGroupEditor({
  groups,
  allCourses,
  onChange,
}: RequirementGroupEditorProps) {
  const addGroup = () => {
    onChange([
      ...groups,
      {
        name: '',
        type: 'core',
        creditsRequired: 0,
        courseIds: [],
        minCoursesRequired: 0,
      },
    ]);
  };

  const updateGroup = (i: number, patch: Partial<RequirementGroup>) => {
    onChange(groups.map((g, idx) => (idx === i ? { ...g, ...patch } : g)));
  };

  const removeGroup = (i: number) => {
    onChange(groups.filter((_, idx) => idx !== i));
  };

  const toggleCourse = (groupIdx: number, courseId: string) => {
    const group = groups[groupIdx];
    const newIds = group.courseIds.includes(courseId)
      ? group.courseIds.filter((id) => id !== courseId)
      : [...group.courseIds, courseId];
    updateGroup(groupIdx, { courseIds: newIds });
  };

  return (
    <div className="space-y-3">
      {groups.map((group, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Group name (e.g. Core Requirements)"
              value={group.name}
              onChange={(e) => updateGroup(i, { name: e.target.value })}
              className="flex-1"
            />
            <Select
              value={group.type}
              onValueChange={(v) => updateGroup(i, { type: v })}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REQ_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={() => removeGroup(i)}
              className="text-destructive hover:text-destructive/80 p-1"
              aria-label="Remove requirement group"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Credits Required</Label>
              <Input
                type="number"
                min="0"
                value={group.creditsRequired}
                onChange={(e) =>
                  updateGroup(i, {
                    creditsRequired: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Min Courses</Label>
              <Input
                type="number"
                min="0"
                value={group.minCoursesRequired}
                onChange={(e) =>
                  updateGroup(i, {
                    minCoursesRequired: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">
              Courses ({group.courseIds.length} selected)
            </Label>
            <div className="border rounded max-h-28 overflow-y-auto divide-y bg-background">
              {allCourses.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCourse(i, c.id)}
                  className={`w-full text-left px-2 py-1.5 text-xs flex items-center gap-2 hover:bg-muted ${
                    group.courseIds.includes(c.id) ? 'bg-primary/10' : ''
                  }`}
                >
                  <span className="font-mono">{c.code}</span>
                  <span className="truncate text-muted-foreground">
                    {c.title}
                  </span>
                  {group.courseIds.includes(c.id) && (
                    <span className="ml-auto text-primary font-medium">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addGroup}>
        <Plus className="h-3 w-3 mr-1" />
        Add Requirement Group
      </Button>
    </div>
  );
}

// ─── Degree Program Dialog ────────────────────────────────────────────────────

interface ProgramFormState {
  name: string;
  code: string;
  department: string;
  description: string;
  programType: string;
  totalCreditsRequired: string;
  expectedDurationSemesters: string;
  catalogYear: string;
  status: string;
  requirements: RequirementGroup[];
}

const emptyProgramForm = (): ProgramFormState => ({
  name: '',
  code: '',
  department: '',
  description: '',
  programType: 'major',
  totalCreditsRequired: '120',
  expectedDurationSemesters: '8',
  catalogYear: '',
  status: 'draft',
  requirements: [],
});

function programToForm(p: DegreeProgram): ProgramFormState {
  let requirements: RequirementGroup[] = [];
  try {
    requirements = JSON.parse(p.requirements);
  } catch {
    requirements = [];
  }
  return {
    name: p.name,
    code: p.code,
    department: p.department ?? '',
    description: p.description ?? '',
    programType: p.programType ?? 'major',
    totalCreditsRequired: p.totalCreditsRequired.toString(),
    expectedDurationSemesters: p.expectedDurationSemesters?.toString() ?? '8',
    catalogYear: p.catalogYear ?? '',
    status: p.status,
    requirements,
  };
}

interface ProgramDialogProps {
  open: boolean;
  program: DegreeProgram | null;
  allCourses: Course[];
  onClose: () => void;
  onSave: (form: ProgramFormState, id?: string) => Promise<void>;
  saving: boolean;
}

function ProgramDialog({
  open,
  program,
  allCourses,
  onClose,
  onSave,
  saving,
}: ProgramDialogProps) {
  const [form, setForm] = useState<ProgramFormState>(() =>
    program ? programToForm(program) : emptyProgramForm(),
  );

  const resetAndClose = () => {
    setForm(emptyProgramForm());
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && resetAndClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {program ? 'Edit Degree Program' : 'Add Degree Program'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="prog-name">Program Name *</Label>
              <Input
                id="prog-name"
                placeholder="BS Computer Science"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prog-code">Code *</Label>
              <Input
                id="prog-code"
                placeholder="CS-BS"
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="prog-type">Type</Label>
              <Select
                value={form.programType}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, programType: v }))
                }
              >
                <SelectTrigger id="prog-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROGRAM_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="prog-credits">Total Credits *</Label>
              <Input
                id="prog-credits"
                type="number"
                min="1"
                value={form.totalCreditsRequired}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    totalCreditsRequired: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prog-semesters">Duration (semesters)</Label>
              <Input
                id="prog-semesters"
                type="number"
                min="1"
                value={form.expectedDurationSemesters}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    expectedDurationSemesters: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="prog-dept">Department</Label>
              <Input
                id="prog-dept"
                placeholder="Computer Science"
                value={form.department}
                onChange={(e) =>
                  setForm((f) => ({ ...f, department: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prog-year">Catalog Year</Label>
              <Input
                id="prog-year"
                placeholder="2024-2025"
                value={form.catalogYear}
                onChange={(e) =>
                  setForm((f) => ({ ...f, catalogYear: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prog-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
              >
                <SelectTrigger id="prog-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROGRAM_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="prog-desc">Description</Label>
            <Textarea
              id="prog-desc"
              rows={2}
              placeholder="Program description..."
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Requirement Groups</Label>
            <RequirementGroupEditor
              groups={form.requirements}
              allCourses={allCourses}
              onChange={(reqs) =>
                setForm((f) => ({ ...f, requirements: reqs }))
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave(form, program?.id)}
            disabled={
              saving ||
              !form.name.trim() ||
              !form.code.trim() ||
              !form.totalCreditsRequired
            }
          >
            {saving ? 'Saving...' : program ? 'Save Changes' : 'Create Program'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirmation Dialog ───────────────────────────────────────────────

function DeleteDialog({
  open,
  label,
  onConfirm,
  onCancel,
  deleting,
}: {
  open: boolean;
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete {label}?
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This action cannot be undone. The {label.toLowerCase()} will be
          permanently deleted.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Courses Tab ─────────────────────────────────────────────────────────────

function CoursesTab() {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(0);

  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const filters = {
    ...(search && { search }),
    ...(department && { departmentId: department }),
    ...(category && { category }),
    ...(level && { courseLevel: parseInt(level) }),
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };

  const { data, loading, refetch } = useQuery<{ catalogCourses: CatalogPage }>(
    CATALOG_COURSES_QUERY,
    { variables: { filters }, fetchPolicy: 'cache-and-network' },
  );

  // Load all courses for prerequisite picker (no filters, high limit)
  const { data: allCoursesData } = useQuery<{ catalogCourses: CatalogPage }>(
    CATALOG_COURSES_QUERY,
    { variables: { filters: { limit: 500 } }, fetchPolicy: 'cache-first' },
  );

  const { data: deptData } = useQuery<{ departmentList: string[] }>(
    DEPARTMENT_LIST_QUERY,
  );

  const [createCourse] = useMutation(CREATE_CATALOG_COURSE_MUTATION);
  const [updateCourse] = useMutation(UPDATE_CATALOG_COURSE_MUTATION);
  const [deleteCourse] = useMutation(DELETE_CATALOG_COURSE_MUTATION);

  const courses = data?.catalogCourses.items ?? [];
  const total = data?.catalogCourses.total ?? 0;
  const allCourses = allCoursesData?.catalogCourses.items ?? [];
  const departments = deptData?.departmentList ?? [];
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSave = async (form: CourseFormState, id?: string) => {
    setSaving(true);
    try {
      const input = {
        code: form.code.trim(),
        title: form.title.trim(),
        ...(form.description && { description: form.description.trim() }),
        ...(form.credits && { credits: parseFloat(form.credits) }),
        ...(form.departmentId && { departmentId: form.departmentId.trim() }),
        ...(form.category && { category: form.category }),
        ...(form.courseLevel && { courseLevel: parseInt(form.courseLevel) }),
        offeredSemesters: form.offeredSemesters,
        prerequisiteCourseIds: form.prerequisiteCourseIds,
        corequisiteCourseIds: form.corequisiteCourseIds,
      };
      if (id) {
        await updateCourse({ variables: { id, input } });
      } else {
        await createCourse({ variables: { input } });
      }
      await refetch();
      setCourseDialogOpen(false);
      setEditingCourse(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCourse({ variables: { id: deleteTarget.id } });
      await refetch();
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const openCreate = () => {
    setEditingCourse(null);
    setCourseDialogOpen(true);
  };

  const openEdit = (course: Course) => {
    setEditingCourse(course);
    setCourseDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code or title..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9"
          />
        </div>

        <Select
          value={department || 'all'}
          onValueChange={(v) => {
            setDepartment(v === 'all' ? '' : v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d: string) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={category || 'all'}
          onValueChange={(v) => {
            setCategory(v === 'all' ? '' : v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={level || 'all'}
          onValueChange={(v) => {
            setLevel(v === 'all' ? '' : v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {LEVELS.map((l) => (
              <SelectItem key={l} value={l.toString()}>
                {l}-level
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={openCreate} className="ml-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Course
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-20">Credits</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="w-32">Category</TableHead>
              <TableHead className="w-20">Level</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && courses.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-12"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : courses.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-12"
                >
                  No courses found. Add your first course to get started.
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course: Course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-mono text-sm">
                    {course.code}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{course.title}</p>
                      {course.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-xs">
                          {course.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {course.credits ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {course.departmentId ?? '—'}
                  </TableCell>
                  <TableCell>
                    <CategoryBadge category={course.category} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {course.courseLevel ? `${course.courseLevel}` : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(course)}
                        aria-label={`Edit ${course.code}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(course)}
                        aria-label={`Delete ${course.code}`}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of{' '}
            {total} courses
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CourseDialog
        open={courseDialogOpen}
        course={editingCourse}
        allCourses={allCourses}
        onClose={() => {
          setCourseDialogOpen(false);
          setEditingCourse(null);
        }}
        onSave={handleSave}
        saving={saving}
      />

      <DeleteDialog
        open={!!deleteTarget}
        label={`Course "${deleteTarget?.code ?? ''}"`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        deleting={deleting}
      />
    </div>
  );
}

// ─── Degree Programs Tab ──────────────────────────────────────────────────────

function DegreeProgramsTab() {
  const [programDialogOpen, setProgramDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<DegreeProgram | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  const { data, loading, refetch } = useQuery<{
    degreePrograms: DegreeProgram[];
  }>(DEGREE_PROGRAMS_ADMIN_QUERY, { fetchPolicy: 'cache-and-network' });

  // Need all courses for the requirement group editor
  const { data: allCoursesData } = useQuery<{ catalogCourses: CatalogPage }>(
    CATALOG_COURSES_QUERY,
    { variables: { filters: { limit: 500 } }, fetchPolicy: 'cache-first' },
  );

  const [createProgram] = useMutation(CREATE_DEGREE_PROGRAM_MUTATION);
  const [updateProgram] = useMutation(UPDATE_DEGREE_PROGRAM_MUTATION);

  const programs = data?.degreePrograms ?? [];
  const allCourses = allCoursesData?.catalogCourses.items ?? [];

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    draft: 'bg-yellow-100 text-yellow-800',
    archived: 'bg-gray-100 text-gray-800',
  };

  const handleSave = async (form: ProgramFormState, id?: string) => {
    setSaving(true);
    try {
      if (id) {
        await updateProgram({
          variables: {
            input: {
              id,
              name: form.name.trim(),
              code: form.code.trim(),
              ...(form.department && { department: form.department.trim() }),
              ...(form.description && { description: form.description.trim() }),
              totalCreditsRequired: parseInt(form.totalCreditsRequired),
              requirements: form.requirements,
              status: form.status,
            },
          },
        });
      } else {
        await createProgram({
          variables: {
            input: {
              name: form.name.trim(),
              code: form.code.trim(),
              ...(form.department && { department: form.department.trim() }),
              ...(form.description && { description: form.description.trim() }),
              totalCreditsRequired: parseInt(form.totalCreditsRequired),
              requirements: form.requirements,
            },
          },
        });
      }
      await refetch();
      setProgramDialogOpen(false);
      setEditingProgram(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage degree programs and their course requirements.
        </p>
        <Button
          onClick={() => {
            setEditingProgram(null);
            setProgramDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Program
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Program</TableHead>
              <TableHead className="w-24">Code</TableHead>
              <TableHead className="w-28">Type</TableHead>
              <TableHead className="w-24">Credits</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="w-20">Status</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && programs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-12"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : programs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-12"
                >
                  No degree programs yet. Add your first program.
                </TableCell>
              </TableRow>
            ) : (
              programs.map((p: DegreeProgram) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{p.name}</p>
                      {p.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-xs">
                          {p.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{p.code}</TableCell>
                  <TableCell className="text-sm capitalize">
                    {p.programType ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.totalCreditsRequired} cr.
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.department ?? '—'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColors[p.status] ?? 'bg-muted text-muted-foreground'}`}
                    >
                      {p.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingProgram(p);
                        setProgramDialogOpen(true);
                      }}
                      aria-label={`Edit ${p.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProgramDialog
        open={programDialogOpen}
        program={editingProgram}
        allCourses={allCourses}
        onClose={() => {
          setProgramDialogOpen(false);
          setEditingProgram(null);
        }}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'courses' | 'programs';

export default function CatalogPage() {
  const [activeTab, setActiveTab] = useState<Tab>('courses');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Course Catalog</h1>
            <p className="text-sm text-muted-foreground">
              Manage courses, requirements, and degree programs for your
              institution.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/catalog/import">
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/catalog/import/document">
              <Sparkles className="mr-2 h-4 w-4" />
              AI Import
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="-mb-px flex gap-6">
          {(
            [
              { key: 'courses', label: 'Courses', Icon: BookOpen },
              {
                key: 'programs',
                label: 'Degree Programs',
                Icon: GraduationCap,
              },
            ] as { key: Tab; label: string; Icon: typeof BookOpen }[]
          ).map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'courses' ? <CoursesTab /> : <DegreeProgramsTab />}
    </div>
  );
}
