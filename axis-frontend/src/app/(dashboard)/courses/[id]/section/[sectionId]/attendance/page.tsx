'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { ArrowLeft, Check, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { SECTION_QUERY } from '@/lib/graphql/queries/courses';
import { SECTION_ATTENDANCE_QUERY } from '@/lib/graphql/queries/attendance';
import { MARK_ATTENDANCE_MUTATION } from '@/lib/graphql/mutations/attendance';
import { CourseHeader } from '@/components/courses/course-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

interface AttendanceRecord {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  status: AttendanceStatus;
  notes?: string;
}

interface SectionData {
  id: string;
  location?: string;
  course: { id: string; code: string; title: string };
  instructor: { firstName: string; lastName: string };
}

const STATUS_OPTIONS: {
  value: AttendanceStatus;
  label: string;
  color: string;
}[] = [
  {
    value: 'PRESENT',
    label: 'P',
    color:
      'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  {
    value: 'ABSENT',
    label: 'A',
    color:
      'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400',
  },
  {
    value: 'LATE',
    label: 'L',
    color:
      'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400',
  },
  {
    value: 'EXCUSED',
    label: 'E',
    color:
      'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400',
  },
];

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export default function AttendancePage() {
  const params = useParams();
  const courseId = params.id as string;
  const sectionId = params.sectionId as string;

  const [date, setDate] = useState(todayIso());
  // Unsaved teacher edits, layered over server state. Derived display state
  // (localStatus) = server records + overrides — no sync effect needed.
  const [overrides, setOverrides] = useState<Record<string, AttendanceStatus>>(
    {},
  );

  const { data: sectionData, loading: sectionLoading } = useQuery<{
    section: SectionData;
  }>(SECTION_QUERY, { variables: { id: sectionId } });

  const { data, loading, refetch } = useQuery<{
    sectionAttendance: { date: string; records: AttendanceRecord[] };
  }>(SECTION_ATTENDANCE_QUERY, {
    variables: { sectionId, date },
    fetchPolicy: 'cache-and-network',
  });

  const [markAttendance, { loading: saving }] = useMutation(
    MARK_ATTENDANCE_MUTATION,
  );

  // Discard unsaved edits when the underlying server snapshot changes
  // (date switch or refetch). Render-time state adjustment per React docs —
  // avoids the cascading-render footgun of setState inside an effect.
  const [syncedData, setSyncedData] = useState(data);
  if (data !== syncedData) {
    setSyncedData(data);
    setOverrides({});
  }

  const serverStatus = useMemo(() => {
    const map: Record<string, AttendanceStatus> = {};
    for (const r of data?.sectionAttendance?.records ?? []) {
      map[r.userId] = r.status;
    }
    return map;
  }, [data]);

  const localStatus: Record<string, AttendanceStatus> = {
    ...serverStatus,
    ...overrides,
  };
  const dirty = Object.keys(overrides).length > 0;

  const setStatus = (userId: string, status: AttendanceStatus) => {
    setOverrides((prev) => ({ ...prev, [userId]: status }));
  };

  const handleSave = async () => {
    const records = data?.sectionAttendance?.records ?? [];
    if (records.length === 0) return;

    const input = {
      sectionId,
      date,
      records: records.map((r) => ({
        studentId: r.userId,
        status: localStatus[r.userId] ?? 'PRESENT',
      })),
    };

    try {
      await markAttendance({ variables: { input } });
      toast.success('Attendance saved');
      setOverrides({});
      void refetch();
    } catch {
      toast.error('Failed to save attendance');
    }
  };

  const records = data?.sectionAttendance?.records ?? [];
  const section = sectionData?.section;

  const presentCount = records.filter(
    (r) => localStatus[r.userId] === 'PRESENT',
  ).length;
  const absentCount = records.filter(
    (r) => localStatus[r.userId] === 'ABSENT',
  ).length;
  const lateCount = records.filter(
    (r) => localStatus[r.userId] === 'LATE',
  ).length;
  const excusedCount = records.filter(
    (r) => localStatus[r.userId] === 'EXCUSED',
  ).length;

  return (
    <div className="-m-4 md:-m-6">
      {sectionLoading ? (
        <div className="border-b px-4 py-4 md:p-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-2 h-8 w-64" />
        </div>
      ) : section ? (
        <CourseHeader
          courseId={section.course.id}
          courseCode={section.course.code}
          courseTitle={section.course.title}
          instructorName={`${section.instructor.firstName} ${section.instructor.lastName}`}
          location={section.location}
        />
      ) : null}

      <div className="space-y-4 px-4 py-4 md:p-6">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button asChild size="sm" variant="ghost">
              <Link href={`/courses/${courseId}/section/${sectionId}`}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Link>
            </Button>
            <h2 className="text-xl font-semibold">Attendance</h2>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !dirty || records.length === 0}
            >
              <Check className="mr-1 h-4 w-4" />
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Summary badges */}
        {records.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            >
              Present: {presentCount}
            </Badge>
            <Badge
              variant="outline"
              className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            >
              Absent: {absentCount}
            </Badge>
            <Badge
              variant="outline"
              className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            >
              Late: {lateCount}
            </Badge>
            <Badge
              variant="outline"
              className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            >
              Excused: {excusedCount}
            </Badge>
          </div>
        )}

        {/* Roster */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <h3 className="text-lg font-medium">No students enrolled</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Students must be actively enrolled to take attendance.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Student</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, i) => {
                  const current = localStatus[record.userId] ?? 'PRESENT';
                  return (
                    <tr
                      key={record.userId}
                      className={`border-b transition-colors hover:bg-muted/30 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {record.lastName}, {record.firstName}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {STATUS_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() =>
                                setStatus(record.userId, opt.value)
                              }
                              className={`h-8 w-8 rounded border text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring ${
                                current === opt.value
                                  ? `${opt.color} scale-110 shadow-sm`
                                  : 'border-muted-foreground/20 bg-background text-muted-foreground hover:border-muted-foreground/40'
                              }`}
                              title={
                                opt.value.charAt(0) +
                                opt.value.slice(1).toLowerCase()
                              }
                              aria-pressed={current === opt.value}
                              aria-label={
                                opt.value.charAt(0) +
                                opt.value.slice(1).toLowerCase()
                              }
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
