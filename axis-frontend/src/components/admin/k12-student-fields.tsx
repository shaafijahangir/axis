'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ADMIN_USERS_QUERY } from '@/lib/graphql/queries/admin-users';

/**
 * SPRINT-3: K-12 student fields used by both create and edit user dialogs.
 * Renders the grade level dropdown + a debounce-able homeroom teacher
 * search input. Parent component controls visibility (typically only when
 * the STUDENT role is selected).
 *
 * Server-side rules enforced in UsersService.validateK12Fields:
 *   - gradeLevel only allowed when roles includes STUDENT
 *   - homeroomTeacherId must reference an INSTRUCTOR in the same tenant
 */

export interface K12FieldsValue {
  gradeLevel: number | null;
  homeroomTeacherId: string | null;
  /** Cached so the picker can render the current selection without an extra query. */
  homeroomTeacherName?: string | null;
}

interface Props {
  value: K12FieldsValue;
  onChange: (value: K12FieldsValue) => void;
}

interface InstructorOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export function K12StudentFields({ value, onChange }: Props) {
  const [teacherSearch, setTeacherSearch] = useState('');

  // Only query when the search box is non-empty to avoid loading every
  // instructor on first render. Limit to 20 — the picker is for narrowing,
  // not browsing the full instructor list.
  const { data, loading } = useQuery<{
    adminUsers: { users: InstructorOption[] };
  }>(ADMIN_USERS_QUERY, {
    variables: {
      filter: {
        role: 'instructor',
        search: teacherSearch || undefined,
        pageSize: 20,
        page: 1,
      },
    },
    skip: teacherSearch.length < 1,
  });

  const candidates = data?.adminUsers.users ?? [];

  return (
    <div className="space-y-4 rounded-md border border-dashed bg-muted/30 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Student details
      </p>

      <div className="space-y-2">
        <Label>Grade Level</Label>
        <Select
          value={value.gradeLevel == null ? 'none' : String(value.gradeLevel)}
          onValueChange={(v) =>
            onChange({
              ...value,
              gradeLevel: v === 'none' ? null : parseInt(v, 10),
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select grade…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— not set —</SelectItem>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
              <SelectItem key={g} value={String(g)}>
                Grade {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Homeroom Teacher</Label>
        {value.homeroomTeacherId && value.homeroomTeacherName && (
          <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm">
            <Badge variant="secondary">{value.homeroomTeacherName}</Badge>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() =>
                onChange({
                  ...value,
                  homeroomTeacherId: null,
                  homeroomTeacherName: null,
                })
              }
            >
              Clear
            </button>
          </div>
        )}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search instructors by name or email…"
            value={teacherSearch}
            onChange={(e) => setTeacherSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {teacherSearch.length >= 1 && (
          <div className="max-h-40 overflow-y-auto rounded-md border">
            {loading ? (
              <div className="space-y-1 p-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : candidates.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">
                No instructors match that search.
              </p>
            ) : (
              candidates.map((t) => {
                const fullName = `${t.firstName} ${t.lastName}`;
                const selected = value.homeroomTeacherId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onChange({
                        ...value,
                        homeroomTeacherId: t.id,
                        homeroomTeacherName: fullName,
                      });
                      setTeacherSearch('');
                    }}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent ${
                      selected ? 'bg-accent' : ''
                    }`}
                  >
                    <span className="font-medium">{fullName}</span>
                    <span className="text-xs text-muted-foreground">
                      {t.email}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const EMPTY_K12_FIELDS: K12FieldsValue = {
  gradeLevel: null,
  homeroomTeacherId: null,
  homeroomTeacherName: null,
};
