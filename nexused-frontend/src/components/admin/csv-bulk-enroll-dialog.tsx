'use client';

import { useState, useRef, useCallback } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { toast } from 'sonner';
import { Upload, Download, CheckCircle2, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ADMIN_SECTIONS_QUERY,
  ADMIN_USERS_LIST_QUERY,
} from '@/lib/graphql/queries/admin-academics';
import { BULK_ENROLL_MUTATION } from '@/lib/graphql/mutations/admin-academics';

interface CsvBulkEnrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedRow {
  email: string;
  role: string;
  userId: string | null;
  userName: string | null;
  /** 'match' | 'not_found' */
  status: 'match' | 'not_found';
}

/**
 * Minimal CSV parser — handles quoted fields and CRLF/LF.
 * Returns string[][] where row[0] is the header row.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trimEnd();
  if (!src) return rows;
  let row: string[] = [];
  let field = '';
  let i = 0;
  while (i < src.length) {
    if (src[i] === '"') {
      i++;
      while (i < src.length) {
        if (src[i] === '"' && src[i + 1] === '"') {
          field += '"';
          i += 2;
        } else if (src[i] === '"') {
          i++;
          break;
        } else {
          field += src[i++];
        }
      }
    } else if (src[i] === ',') {
      row.push(field.trim());
      field = '';
      i++;
    } else if (src[i] === '\n') {
      row.push(field.trim());
      rows.push(row);
      row = [];
      field = '';
      i++;
    } else {
      field += src[i++];
    }
  }
  row.push(field.trim());
  if (row.some((c) => c)) rows.push(row);
  return rows;
}

function downloadTemplate() {
  const csv =
    'email,role\njohn.doe@example.com,student\njane.smith@example.com,ta\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'enrollment-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function CsvBulkEnrollDialog({
  open,
  onOpenChange,
  onSuccess,
}: CsvBulkEnrollDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sectionId, setSectionId] = useState('');
  const [defaultRole, setDefaultRole] = useState('student');
  const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const { data: sectionsData } = useQuery<{
    adminSections: {
      id: string;
      course: { code: string; title: string };
    }[];
  }>(ADMIN_SECTIONS_QUERY, { skip: !open });

  const { data: usersData } = useQuery<{
    adminUsers: {
      users: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      }[];
    };
  }>(ADMIN_USERS_LIST_QUERY, {
    variables: { filter: { pageSize: 1000 } },
    skip: !open,
  });

  const [bulkEnroll, { loading }] = useMutation<{
    bulkEnroll: { id: string }[];
  }>(BULK_ENROLL_MUTATION, {
    onCompleted: (data) => {
      const count = data.bulkEnroll.length;
      toast.success(`${count} user${count !== 1 ? 's' : ''} enrolled`);
      handleClose();
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleClose = useCallback(() => {
    setSectionId('');
    setDefaultRole('student');
    setParsedRows(null);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onOpenChange(false);
  }, [onOpenChange]);

  const handleFile = useCallback(
    (file: File) => {
      setParseError(null);
      setParsedRows(null);

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const rows = parseCsv(text);

        if (rows.length < 2) {
          setParseError(
            'CSV has no data rows. Download the template to see the expected format.',
          );
          return;
        }

        const headers = rows[0].map((h) => h.toLowerCase().trim());
        const emailIdx = headers.indexOf('email');
        if (emailIdx === -1) {
          setParseError('CSV must have an "email" column header.');
          return;
        }
        const roleIdx = headers.indexOf('role');

        const userByEmail = new Map(
          (usersData?.adminUsers.users ?? []).map((u) => [
            u.email.toLowerCase(),
            u,
          ]),
        );

        const dataRows = rows.slice(1).filter((r) => r.some((c) => c.trim()));
        const parsed: ParsedRow[] = dataRows.map((row) => {
          const email = row[emailIdx]?.trim().toLowerCase() ?? '';
          const role =
            roleIdx >= 0 && row[roleIdx]?.trim()
              ? row[roleIdx].trim().toLowerCase()
              : defaultRole;
          const user = userByEmail.get(email);
          return {
            email,
            role,
            userId: user?.id ?? null,
            userName: user ? `${user.firstName} ${user.lastName}` : null,
            status: user ? 'match' : 'not_found',
          };
        });

        setParsedRows(parsed);
      };
      reader.readAsText(file);
    },
    [usersData, defaultRole],
  );

  const matchedRows = parsedRows?.filter((r) => r.status === 'match') ?? [];
  const unmatchedRows =
    parsedRows?.filter((r) => r.status === 'not_found') ?? [];

  const handleSubmit = () => {
    if (!sectionId || matchedRows.length === 0) {
      toast.error(
        'Select a section and upload a valid CSV with at least one matched user',
      );
      return;
    }
    bulkEnroll({
      variables: {
        input: {
          sectionId,
          userIds: matchedRows.map((r) => r.userId!),
          role: matchedRows[0].role,
        },
      },
    });
  };

  const sections = sectionsData?.adminSections ?? [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Enrollments from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with student emails to bulk enroll into a section.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Section + role selectors */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Section</Label>
              <Select value={sectionId} onValueChange={setSectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.course.code} — {s.course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default Role</Label>
              <Select value={defaultRole} onValueChange={setDefaultRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="ta">TA</SelectItem>
                  <SelectItem value="observer">Observer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* File upload area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>CSV File</Label>
              <button
                type="button"
                onClick={downloadTemplate}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Download className="h-3 w-3" />
                Download template
              </button>
            </div>
            <div
              role="button"
              tabIndex={0}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-sm text-muted-foreground hover:border-primary/50 hover:bg-muted/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ')
                  fileInputRef.current?.click();
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
            >
              <Upload className="mb-2 h-6 w-6" aria-hidden="true" />
              <span>Click to upload or drag &amp; drop</span>
              <span className="text-xs">
                CSV files only · columns: email, role (optional)
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>

          {/* Parse error */}
          {parseError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {parseError}
            </div>
          )}

          {/* Preview */}
          {parsedRows && parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {matchedRows.length} will enroll
                </Badge>
                {unmatchedRows.length > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    {unmatchedRows.length} not found
                  </Badge>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/80">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Email</th>
                      <th className="px-3 py-2 text-left font-medium">Name</th>
                      <th className="px-3 py-2 text-left font-medium">Role</th>
                      <th className="px-3 py-2 text-left font-medium">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-1.5 text-xs text-muted-foreground">
                          {row.email}
                        </td>
                        <td className="px-3 py-1.5">
                          {row.userName ?? (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 capitalize text-xs">
                          {row.role}
                        </td>
                        <td className="px-3 py-1.5">
                          {row.status === 'match' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                loading ||
                !sectionId ||
                (parsedRows !== null && matchedRows.length === 0)
              }
            >
              {loading
                ? 'Enrolling...'
                : parsedRows
                  ? `Enroll ${matchedRows.length} User${matchedRows.length !== 1 ? 's' : ''}`
                  : 'Upload CSV to preview'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
