'use client';

import { useState, useRef } from 'react';
import { useMutation } from '@apollo/client/react';
import Link from 'next/link';
import {
  Upload,
  FileText,
  GraduationCap,
  List,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  Download,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  IMPORT_COURSES_FROM_CSV_MUTATION,
  IMPORT_PROGRAMS_FROM_CSV_MUTATION,
  IMPORT_REQUIREMENTS_FROM_CSV_MUTATION,
  IMPORT_USERS_FROM_CSV_MUTATION,
  IMPORT_ENROLLMENTS_FROM_CSV_MUTATION,
} from '@/lib/graphql/mutations/csv-import';

// ─── Types ───────────────────────────────────────────────────────────────────

type ImportType =
  | 'courses'
  | 'programs'
  | 'requirements'
  | 'users'
  | 'enrollments';
type WizardStep = 'select-type' | 'upload' | 'preview' | 'result';

interface ImportError {
  row: number;
  field: string;
  message: string;
}

interface ImportResult {
  imported: number;
  success: boolean;
  errors: ImportError[];
}

// ─── CSV Templates ────────────────────────────────────────────────────────────

const TEMPLATES: Record<
  ImportType,
  { headers: string; example: string; description: string }
> = {
  courses: {
    headers:
      'code,title,credits,department,category,level,description,prerequisites,corequisites,offered_semesters',
    example: [
      'CS 101,Introduction to Computer Science,3,Computer Science,core,100,"An introduction to programming concepts.","","","Fall,Spring"',
      'CS 201,Data Structures,3,Computer Science,core,200,"Arrays lists and trees.","CS 101","","Fall,Spring"',
      'CS 301,Algorithms,3,Computer Science,core,300,"Algorithm design and analysis.","CS 201","","Fall"',
      'MATH 101,Calculus I,4,Mathematics,core,100,"Differential calculus.","","","Fall,Spring,Summer"',
    ].join('\n'),
    description:
      'One row per course. prerequisites and offered_semesters are comma-separated values inside quotes.',
  },
  programs: {
    headers:
      'code,name,type,department,total_credits,expected_duration,catalog_year,description',
    example: [
      'CS-BS,BS Computer Science,major,Computer Science,120,8,2024-2025,"Four-year undergraduate program."',
      'CS-MINOR,Computer Science Minor,minor,Computer Science,18,4,2024-2025,"Minor for non-CS majors."',
      'DATA-CERT,Data Analytics Certificate,certificate,Computer Science,30,2,2024-2025,"Graduate certificate."',
    ].join('\n'),
    description:
      'One row per degree program. type: major | minor | certificate | diploma.',
  },
  requirements: {
    headers:
      'program_code,group_name,group_type,course_codes,min_credits,min_courses,description',
    example: [
      'CS-BS,Core Requirements,core,"CS 101,CS 201,CS 301",9,3,"Required CS foundation courses."',
      'CS-BS,Math Requirements,core,"MATH 101",4,1,"Required mathematics."',
      'CS-BS,CS Electives,elective,"CS 301",6,2,"Choose 6 credits from upper-level CS."',
    ].join('\n'),
    description:
      'One row per requirement group. Import programs before requirements. course_codes are comma-separated codes in quotes.',
  },
  users: {
    headers: 'email,first_name,last_name,role,password,grade_level',
    example: [
      'alice@brentwood.ca,Alice,Smith,student,ChangeMe123!,11',
      'bob@brentwood.ca,Bob,Jones,instructor,ChangeMe123!,',
      'carol@brentwood.ca,Carol,White,parent,ChangeMe123!,',
      'dave@brentwood.ca,Dave,Brown,student,ChangeMe123!,12',
    ].join('\n'),
    description:
      'One row per user. role: student | instructor | teacher | admin | parent | ta. grade_level is optional (for students). Default password is used if omitted.',
  },
  enrollments: {
    headers: 'student_email,course_code,term_name',
    example: [
      'alice@brentwood.ca,CS 101,Fall 2025',
      'alice@brentwood.ca,MATH 101,Fall 2025',
      'dave@brentwood.ca,CS 101,Fall 2025',
    ].join('\n'),
    description:
      'One row per enrollment. Import users and sections before enrollments. Matches student by email, course by code, section by course+term.',
  },
};

function buildTemplate(type: ImportType): string {
  const t = TEMPLATES[type];
  return `${t.headers}\n${t.example}`;
}

function downloadTemplate(type: ImportType) {
  const content = buildTemplate(type);
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}-template.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Client-side CSV preview parser ──────────────────────────────────────────

function parseCSVPreview(
  text: string,
  maxRows = 10,
): { headers: string[]; rows: string[][] } {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
    .split('\n');
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const fields: string[] = [];
    let field = '';
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        i++;
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') {
            field += '"';
            i += 2;
          } else if (line[i] === '"') {
            i++;
            break;
          } else {
            field += line[i++];
          }
        }
      } else if (line[i] === ',') {
        fields.push(field.trim());
        field = '';
        i++;
      } else {
        field += line[i++];
      }
    }
    fields.push(field.trim());
    return fields;
  };

  const headers = parseRow(lines[0]);
  const rows = lines
    .slice(1, maxRows + 1)
    .filter((l) => l.trim())
    .map(parseRow);

  return { headers, rows };
}

// ─── Step Components ──────────────────────────────────────────────────────────

const TYPE_OPTIONS: {
  value: ImportType;
  label: string;
  icon: typeof BookOpen;
  description: string;
  note: string;
}[] = [
  {
    value: 'users',
    label: 'Students & Staff',
    icon: FileText,
    description: 'Import student, teacher, and parent accounts',
    note: 'Import first — enrollments reference user accounts',
  },
  {
    value: 'enrollments',
    label: 'Enrollments',
    icon: List,
    description: 'Enroll students into class sections',
    note: 'Import after users and sections are created',
  },
  {
    value: 'courses',
    label: 'Courses',
    icon: BookOpen,
    description: 'Import your course catalog',
    note: 'Import first — programs and requirements reference course codes',
  },
  {
    value: 'programs',
    label: 'Degree Programs',
    icon: GraduationCap,
    description: 'Import degree program definitions',
    note: 'Import after courses',
  },
  {
    value: 'requirements',
    label: 'Degree Requirements',
    icon: List,
    description: 'Assign courses to requirement groups',
    note: 'Import after both courses and programs',
  },
];

function SelectTypeStep({
  selected,
  onSelect,
  onNext,
}: {
  selected: ImportType | null;
  onSelect: (t: ImportType) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">What are you importing?</h2>
        <p className="text-sm text-muted-foreground">
          Import in order: Courses → Programs → Requirements.
        </p>
      </div>

      <div className="grid gap-3">
        {TYPE_OPTIONS.map(({ value, label, icon: Icon, description, note }) => (
          <button
            key={value}
            onClick={() => onSelect(value)}
            className={`flex items-start gap-4 rounded-xl border p-4 text-left transition-all hover:bg-muted/50 ${
              selected === value
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border'
            }`}
          >
            <div
              className={`mt-0.5 rounded-lg p-2 ${selected === value ? 'bg-primary/10' : 'bg-muted'}`}
            >
              <Icon
                className={`h-5 w-5 ${selected === value ? 'text-primary' : 'text-muted-foreground'}`}
                aria-hidden="true"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{label}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">{note}</p>
            </div>
            {selected === value && (
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary shrink-0" />
            )}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!selected}>
          Next: Upload File
        </Button>
      </div>
    </div>
  );
}

function UploadStep({
  type,
  csvText,
  onCsvChange,
  onBack,
  onNext,
}: {
  type: ImportType;
  csvText: string;
  onCsvChange: (text: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const template = TEMPLATES[type];

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      onCsvChange((ev.target?.result as string) ?? '');
    };
    reader.readAsText(file);
  };

  const rowCount = csvText.split('\n').filter((l) => l.trim()).length - 1; // minus header
  const hasData = rowCount > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Upload CSV File</h2>
        <p className="text-sm text-muted-foreground">{template.description}</p>
      </div>

      {/* Template download */}
      <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 bg-muted/30">
        <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Don&apos;t have a file yet?</p>
          <p className="text-xs text-muted-foreground">
            Download our template with example data and the correct column
            headers.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadTemplate(type)}
        >
          <Download className="h-4 w-4 mr-2" aria-hidden="true" />
          Template
        </Button>
      </div>

      {/* File upload */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            type="button"
          >
            <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
            Choose File
          </Button>
          <span className="text-sm text-muted-foreground">or paste below</span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFile}
          aria-label="Upload CSV file"
        />
      </div>

      {/* Text area */}
      <div className="space-y-1">
        <label htmlFor="csv-paste" className="text-sm font-medium">
          CSV Content
        </label>
        <Textarea
          id="csv-paste"
          placeholder={`${template.headers}\n${template.example.split('\n')[0]}`}
          rows={10}
          value={csvText}
          onChange={(e) => onCsvChange(e.target.value)}
          className="font-mono text-xs"
        />
        {hasData && (
          <p className="text-xs text-muted-foreground">
            {rowCount} data row{rowCount !== 1 ? 's' : ''} detected
          </p>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!hasData}>
          Preview Import
        </Button>
      </div>
    </div>
  );
}

function PreviewStep({
  type,
  csvText,
  onBack,
  onImport,
  importing,
}: {
  type: ImportType;
  csvText: string;
  onBack: () => void;
  onImport: () => void;
  importing: boolean;
}) {
  const { headers, rows } = parseCSVPreview(csvText, 10);
  const totalRows = csvText.split('\n').filter((l) => l.trim()).length - 1;
  const showing = Math.min(rows.length, 10);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Preview</h2>
        <p className="text-sm text-muted-foreground">
          Showing first {showing} of {totalRows} rows. Confirm to run the import
          — if any row fails validation, the entire import will be rolled back.
        </p>
      </div>

      <div className="border rounded-lg overflow-auto max-h-80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-muted-foreground">#</TableHead>
              {headers.map((h) => (
                <TableHead key={h} className="whitespace-nowrap text-xs">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                <TableCell className="text-muted-foreground text-xs">
                  {i + 2}
                </TableCell>
                {row.map((cell, j) => (
                  <TableCell
                    key={j}
                    className="text-xs max-w-48 truncate"
                    title={cell}
                  >
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalRows > 10 && (
        <p className="text-xs text-muted-foreground text-center">
          +{totalRows - 10} more rows not shown
        </p>
      )}

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <strong>All-or-nothing:</strong> If any row has invalid data, the whole
        import will fail and nothing will be saved. Fix all errors and
        re-import.
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={importing}>
          Back
        </Button>
        <Button onClick={onImport} disabled={importing}>
          {importing
            ? `Importing ${totalRows} rows...`
            : `Import ${totalRows} ${type}`}
        </Button>
      </div>
    </div>
  );
}

function ResultStep({
  type,
  result,
  onStartOver,
}: {
  type: ImportType;
  result: ImportResult;
  onStartOver: () => void;
}) {
  return (
    <div className="space-y-6">
      {result.success ? (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-900">Import Successful</p>
            <p className="text-sm text-green-800">
              {result.imported} {type} imported successfully.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive">Import Failed</p>
            <p className="text-sm text-destructive/80">
              {result.errors.length} error
              {result.errors.length !== 1 ? 's' : ''} found. Nothing was saved.
              Fix the errors and try again.
            </p>
          </div>
        </div>
      )}

      {result.errors.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Errors</h3>
          <div className="border rounded-lg overflow-auto max-h-64">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Row</TableHead>
                  <TableHead className="w-32">Field</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.errors.map((err, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm font-mono">
                      {err.row > 0 ? err.row : '—'}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {err.field}
                    </TableCell>
                    <TableCell className="text-sm">{err.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {result.success ? (
          <>
            <Button variant="outline" onClick={onStartOver}>
              Import More
            </Button>
            <Button asChild>
              <Link href="/admin/catalog">Back to Catalog</Link>
            </Button>
          </>
        ) : (
          <Button onClick={onStartOver} variant="outline">
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Wizard Page ──────────────────────────────────────────────────────────────

const STEP_LABELS: Record<WizardStep, string> = {
  'select-type': 'Select Type',
  upload: 'Upload',
  preview: 'Preview',
  result: 'Result',
};

const STEPS: WizardStep[] = ['select-type', 'upload', 'preview', 'result'];

export default function CatalogImportPage() {
  const [step, setStep] = useState<WizardStep>('select-type');
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [csvText, setCsvText] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  const [importCourses] = useMutation<{
    importCoursesFromCsv: ImportResult;
  }>(IMPORT_COURSES_FROM_CSV_MUTATION);

  const [importPrograms] = useMutation<{
    importProgramsFromCsv: ImportResult;
  }>(IMPORT_PROGRAMS_FROM_CSV_MUTATION);

  const [importRequirements] = useMutation<{
    importRequirementsFromCsv: ImportResult;
  }>(IMPORT_REQUIREMENTS_FROM_CSV_MUTATION);

  const [importUsers] = useMutation<{
    importUsersFromCsv: ImportResult;
  }>(IMPORT_USERS_FROM_CSV_MUTATION);

  const [importEnrollments] = useMutation<{
    importEnrollmentsFromCsv: ImportResult;
  }>(IMPORT_ENROLLMENTS_FROM_CSV_MUTATION);

  const handleImport = async () => {
    if (!importType) return;
    setImporting(true);
    try {
      let result: ImportResult;

      if (importType === 'courses') {
        const { data } = await importCourses({
          variables: { csvData: csvText },
        });
        result = data!.importCoursesFromCsv;
      } else if (importType === 'programs') {
        const { data } = await importPrograms({
          variables: { csvData: csvText },
        });
        result = data!.importProgramsFromCsv;
      } else if (importType === 'users') {
        const { data } = await importUsers({ variables: { csvData: csvText } });
        result = data!.importUsersFromCsv;
      } else if (importType === 'enrollments') {
        const { data } = await importEnrollments({
          variables: { csvData: csvText },
        });
        result = data!.importEnrollmentsFromCsv;
      } else {
        const { data } = await importRequirements({
          variables: { csvData: csvText },
        });
        result = data!.importRequirementsFromCsv;
      }

      setImportResult(result);
      setStep('result');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      setImportResult({
        imported: 0,
        success: false,
        errors: [{ row: 0, field: 'server', message }],
      });
      setStep('result');
    } finally {
      setImporting(false);
    }
  };

  const startOver = () => {
    setStep('select-type');
    setImportType(null);
    setCsvText('');
    setImportResult(null);
  };

  const currentStepIndex = STEPS.indexOf(step);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/catalog" aria-label="Back to catalog">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Import Catalog</h1>
          <p className="text-sm text-muted-foreground">
            Bulk import courses, programs, or requirements from CSV
          </p>
        </div>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2">
        {STEPS.filter((s) => s !== 'result').map((s, i) => {
          const idx = STEPS.indexOf(s);
          const done = currentStepIndex > idx;
          const active = currentStepIndex === idx;
          return (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold border ${
                  done
                    ? 'bg-primary text-primary-foreground border-primary'
                    : active
                      ? 'border-primary text-primary'
                      : 'border-muted-foreground/30 text-muted-foreground'
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-sm ${active ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
              >
                {STEP_LABELS[s]}
              </span>
              {i < 2 && (
                <div
                  className={`h-px w-8 ${done ? 'bg-primary' : 'bg-muted-foreground/20'}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="border rounded-xl p-6">
        {step === 'select-type' && (
          <SelectTypeStep
            selected={importType}
            onSelect={setImportType}
            onNext={() => setStep('upload')}
          />
        )}

        {step === 'upload' && importType && (
          <UploadStep
            type={importType}
            csvText={csvText}
            onCsvChange={setCsvText}
            onBack={() => setStep('select-type')}
            onNext={() => setStep('preview')}
          />
        )}

        {step === 'preview' && importType && (
          <PreviewStep
            type={importType}
            csvText={csvText}
            onBack={() => setStep('upload')}
            onImport={handleImport}
            importing={importing}
          />
        )}

        {step === 'result' && importType && importResult && (
          <ResultStep
            type={importType}
            result={importResult}
            onStartOver={startOver}
          />
        )}
      </div>
    </div>
  );
}
