'use client';

import { useState, useCallback, useRef } from 'react';
import { useMutation } from '@apollo/client/react';
import Link from 'next/link';
import {
  Sparkles,
  Upload,
  FileText,
  ChevronLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BookOpen,
  GraduationCap,
  Loader2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  EXTRACT_CATALOG_FROM_DOCUMENT_MUTATION,
  BATCH_CREATE_COURSES_MUTATION,
} from '@/lib/graphql/mutations/catalog-extract';
import { CREATE_DEGREE_PROGRAM_MUTATION } from '@/lib/graphql/mutations/catalog';

// ─── Types ───────────────────────────────────────────────────────────────────

type ExtractionFlag = {
  entityType: string;
  entityCode: string;
  field: string;
  message: string;
};

type ExtractedCourse = {
  code: string;
  title: string;
  credits?: number;
  department?: string;
  category?: string;
  courseLevel?: number;
  description?: string;
  offeredSemesters: string[];
  prerequisiteCodes: string[];
  corequisiteCodes: string[];
  confidence: number;
  flagged: boolean;
};

type ExtractedProgram = {
  name: string;
  code: string;
  programType?: string;
  department?: string;
  totalCreditsRequired?: number;
  expectedDurationSemesters?: number;
  confidence: number;
  flagged: boolean;
};

type ExtractionResult = {
  courses: ExtractedCourse[];
  programs: ExtractedProgram[];
  flags: ExtractionFlag[];
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
};

type ImportSummary = {
  coursesImported: number;
  courseErrors: number;
  programsImported: number;
  programErrors: number;
};

type WizardStep = 'upload' | 'analyzing' | 'review' | 'importing' | 'result';

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'analyzing', label: 'Analyze' },
  { key: 'review', label: 'Review' },
  { key: 'importing', label: 'Import' },
  { key: 'result', label: 'Done' },
];

const STEP_INDEX: Record<WizardStep, number> = {
  upload: 0,
  analyzing: 1,
  review: 2,
  importing: 3,
  result: 4,
};

function StepIndicator({ current }: { current: WizardStep }) {
  const idx = STEP_INDEX[current];
  return (
    <div className="flex items-center gap-2" aria-label="Import steps">
      {STEPS.map((step, i) => (
        <div key={step.key} className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
              i < idx
                ? 'bg-primary text-primary-foreground'
                : i === idx
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {i < idx ? <CheckCircle className="h-4 w-4" /> : i + 1}
          </div>
          <span
            className={`text-sm ${i === idx ? 'font-medium' : 'text-muted-foreground'}`}
          >
            {step.label}
          </span>
          {i < STEPS.length - 1 && (
            <div
              className={`h-px w-8 ${i < idx ? 'bg-primary' : 'bg-border'}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Confidence badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  if (pct >= 90)
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        {pct}%
      </Badge>
    );
  if (pct >= 75)
    return (
      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
        {pct}%
      </Badge>
    );
  return (
    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{pct}%</Badge>
  );
}

// ─── Upload step ──────────────────────────────────────────────────────────────

const ALLOWED_TYPES = ['application/pdf', 'text/plain'];
const MAX_MB = 20;

function UploadStep({
  onAnalyze,
}: {
  onAnalyze: (base64: string, mimeType: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setError('');
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only PDF and plain text (.txt) files are supported.');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_MB} MB.`);
      return;
    }
    setSelectedFile(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleAnalyze = () => {
    if (!selectedFile) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      // Strip "data:<mime>;base64," prefix
      const base64 = dataUrl.split(',')[1];
      onAnalyze(base64, selectedFile.type);
    };
    reader.readAsDataURL(selectedFile);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">How it works</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          <li>Upload your academic catalog (PDF or plain text)</li>
          <li>
            Claude reads the document and extracts all courses and programs
          </li>
          <li>Review and deselect anything you don&apos;t want to import</li>
          <li>Confirm — courses are added to your catalog instantly</li>
        </ol>
      </div>

      {/* Drop zone */}
      <div
        role="button"
        aria-label="File upload area — click or drag and drop a file here"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/30 hover:border-primary/50'
        }`}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
        tabIndex={0}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,text/plain,application/pdf"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          aria-label="Choose file"
        />
        {selectedFile ? (
          <div className="flex flex-col items-center gap-2">
            <FileText className="h-10 w-10 text-primary" />
            <p className="font-medium">{selectedFile.name}</p>
            <p className="text-sm text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(0)} KB —{' '}
              {selectedFile.type === 'application/pdf' ? 'PDF' : 'Text'}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
                if (fileRef.current) fileRef.current.value = '';
              }}
              aria-label="Remove file"
            >
              <X className="mr-1 h-4 w-4" /> Remove
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Drop file here or click to browse</p>
            <p className="text-sm text-muted-foreground">
              PDF or plain text · up to {MAX_MB} MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <p
          className="flex items-center gap-2 text-sm text-destructive"
          role="alert"
        >
          <XCircle className="h-4 w-4" /> {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button onClick={handleAnalyze} disabled={!selectedFile}>
          <Sparkles className="mr-2 h-4 w-4" />
          Analyze Document
        </Button>
      </div>
    </div>
  );
}

// ─── Analyzing step ───────────────────────────────────────────────────────────

function AnalyzingStep() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <div className="text-center">
        <p className="text-lg font-medium">Claude is reading your document…</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This takes 15–60 seconds depending on document size.
        </p>
      </div>
    </div>
  );
}

// ─── Review step ──────────────────────────────────────────────────────────────

function ReviewStep({
  result,
  selectedCourses,
  selectedPrograms,
  onToggleCourse,
  onToggleProgram,
  onToggleAllCourses,
  onToggleAllPrograms,
  onConfirm,
}: {
  result: ExtractionResult;
  selectedCourses: Set<string>;
  selectedPrograms: Set<string>;
  onToggleCourse: (code: string) => void;
  onToggleProgram: (code: string) => void;
  onToggleAllCourses: (select: boolean) => void;
  onToggleAllPrograms: (select: boolean) => void;
  onConfirm: () => void;
}) {
  const [tab, setTab] = useState<'courses' | 'programs'>('courses');
  const flaggedCourses = result.courses.filter((c) => c.flagged).length;
  const flaggedPrograms = result.programs.filter((p) => p.flagged).length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap gap-3 rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {result.courses.length} courses extracted
          </span>
          {flaggedCourses > 0 && (
            <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
              <AlertTriangle className="mr-1 h-3 w-3" />
              {flaggedCourses} flagged
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {result.programs.length} programs extracted
          </span>
          {flaggedPrograms > 0 && (
            <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
              <AlertTriangle className="mr-1 h-3 w-3" />
              {flaggedPrograms} flagged
            </Badge>
          )}
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          {result.inputTokens.toLocaleString()} tokens · $
          {result.estimatedCostUsd.toFixed(4)} estimated cost
        </div>
      </div>

      {/* Flags */}
      {result.flags.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-yellow-800">
            <AlertTriangle className="h-4 w-4" />
            {result.flags.length} item{result.flags.length !== 1 ? 's' : ''}{' '}
            need your attention
          </p>
          <ul className="space-y-1 text-xs text-yellow-700">
            {result.flags.map((f, i) => (
              <li key={i}>
                <span className="font-mono">{f.entityCode}</span> ·{' '}
                <span className="font-medium">{f.field}</span>: {f.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tab navigation */}
      <div className="border-b">
        <nav className="-mb-px flex gap-6">
          {[
            {
              key: 'courses',
              label: `Courses (${result.courses.length})`,
              Icon: BookOpen,
            },
            {
              key: 'programs',
              label: `Programs (${result.programs.length})`,
              Icon: GraduationCap,
            },
          ].map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key as 'courses' | 'programs')}
              className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors ${
                tab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Courses table */}
      {tab === 'courses' && (
        <div className="rounded-lg border">
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all courses"
                      checked={
                        result.courses.length > 0 &&
                        selectedCourses.size === result.courses.length
                      }
                      onChange={(e) => onToggleAllCourses(e.target.checked)}
                      className="h-4 w-4 rounded"
                    />
                  </TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.courses.map((course) => (
                  <TableRow
                    key={course.code}
                    className={course.flagged ? 'bg-yellow-50' : undefined}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`Select ${course.code}`}
                        checked={selectedCourses.has(course.code)}
                        onChange={() => onToggleCourse(course.code)}
                        className="h-4 w-4 rounded"
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {course.code}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <span className="line-clamp-1">{course.title}</span>
                    </TableCell>
                    <TableCell>{course.credits ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {course.department ?? '—'}
                    </TableCell>
                    <TableCell>{course.courseLevel ?? '—'}</TableCell>
                    <TableCell>
                      <ConfidenceBadge value={course.confidence} />
                    </TableCell>
                  </TableRow>
                ))}
                {result.courses.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-8"
                    >
                      No courses were extracted from this document.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Programs table */}
      {tab === 'programs' && (
        <div className="rounded-lg border">
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all programs"
                      checked={
                        result.programs.length > 0 &&
                        selectedPrograms.size === result.programs.length
                      }
                      onChange={(e) => onToggleAllPrograms(e.target.checked)}
                      className="h-4 w-4 rounded"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.programs.map((prog) => (
                  <TableRow
                    key={prog.code}
                    className={prog.flagged ? 'bg-yellow-50' : undefined}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`Select ${prog.code}`}
                        checked={selectedPrograms.has(prog.code)}
                        onChange={() => onToggleProgram(prog.code)}
                        className="h-4 w-4 rounded"
                      />
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <span className="line-clamp-1 font-medium">
                        {prog.name}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {prog.code}
                    </TableCell>
                    <TableCell>
                      {prog.programType ? (
                        <Badge variant="outline" className="capitalize">
                          {prog.programType}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {prog.department ?? '—'}
                    </TableCell>
                    <TableCell>{prog.totalCreditsRequired ?? '—'}</TableCell>
                    <TableCell>
                      <ConfidenceBadge value={prog.confidence} />
                    </TableCell>
                  </TableRow>
                ))}
                {result.programs.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-8"
                    >
                      No degree programs were extracted from this document.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {selectedCourses.size} course{selectedCourses.size !== 1 ? 's' : ''}{' '}
          and {selectedPrograms.size} program
          {selectedPrograms.size !== 1 ? 's' : ''} selected
        </p>
        <Button
          onClick={onConfirm}
          disabled={selectedCourses.size === 0 && selectedPrograms.size === 0}
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Import Selected
        </Button>
      </div>

      {result.programs.length > 0 && selectedPrograms.size > 0 && (
        <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
          Programs will be created without requirement groups. Configure
          requirement groups from the Catalog → Degree Programs page after
          import.
        </p>
      )}
    </div>
  );
}

// ─── Importing step ───────────────────────────────────────────────────────────

function ImportingStep() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <div className="text-center">
        <p className="text-lg font-medium">Importing to catalog…</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Creating courses and programs in the database.
        </p>
      </div>
    </div>
  );
}

// ─── Result step ──────────────────────────────────────────────────────────────

function ResultStep({
  summary,
  onReset,
}: {
  summary: ImportSummary;
  onReset: () => void;
}) {
  const totalImported = summary.coursesImported + summary.programsImported;
  const totalErrors = summary.courseErrors + summary.programErrors;
  const success = totalErrors === 0;

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      {success ? (
        <CheckCircle className="h-16 w-16 text-green-500" />
      ) : (
        <AlertTriangle className="h-16 w-16 text-yellow-500" />
      )}

      <div>
        <h2 className="text-xl font-semibold">
          {success ? 'Import complete!' : 'Import finished with some errors'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {summary.coursesImported} course
          {summary.coursesImported !== 1 ? 's' : ''} and{' '}
          {summary.programsImported} program
          {summary.programsImported !== 1 ? 's' : ''} added to your catalog.
        </p>
        {totalErrors > 0 && (
          <p className="mt-1 text-sm text-yellow-700">
            {totalErrors} item{totalErrors !== 1 ? 's' : ''} failed (duplicates
            or validation errors — they may already exist in your catalog).
          </p>
        )}
      </div>

      {totalImported > 0 && (
        <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
          <div className="rounded-lg border bg-muted/30 p-4 text-center">
            <p className="text-2xl font-bold text-primary">
              {summary.coursesImported}
            </p>
            <p className="text-sm text-muted-foreground">Courses added</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4 text-center">
            <p className="text-2xl font-bold text-primary">
              {summary.programsImported}
            </p>
            <p className="text-sm text-muted-foreground">Programs added</p>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href="/admin/catalog">Go to Catalog</Link>
        </Button>
        <Button onClick={onReset} variant="outline">
          Import Another Document
        </Button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DocumentImportPage() {
  const [step, setStep] = useState<WizardStep>('upload');
  const [extractionResult, setExtractionResult] =
    useState<ExtractionResult | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(
    new Set(),
  );
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(
    new Set(),
  );
  const [importSummary, setImportSummary] = useState<ImportSummary>({
    coursesImported: 0,
    courseErrors: 0,
    programsImported: 0,
    programErrors: 0,
  });
  const [globalError, setGlobalError] = useState('');

  const [extractMutation] = useMutation(EXTRACT_CATALOG_FROM_DOCUMENT_MUTATION);
  const [batchCreateCourses] = useMutation(BATCH_CREATE_COURSES_MUTATION);
  const [createProgram] = useMutation(CREATE_DEGREE_PROGRAM_MUTATION);

  const handleAnalyze = useCallback(
    async (fileBase64: string, mimeType: string) => {
      setGlobalError('');
      setStep('analyzing');
      try {
        const { data } = await extractMutation({
          variables: { fileBase64, mimeType },
        });
        const result = (
          data as { extractCatalogFromDocument: ExtractionResult } | null
        )?.extractCatalogFromDocument;
        if (!result) throw new Error('No extraction result returned');
        setExtractionResult(result);
        setSelectedCourses(new Set(result.courses.map((c) => c.code)));
        setSelectedPrograms(new Set(result.programs.map((p) => p.code)));
        setStep('review');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Extraction failed';
        setGlobalError(msg);
        setStep('upload');
      }
    },
    [extractMutation],
  );

  const handleConfirmImport = useCallback(async () => {
    if (!extractionResult) return;
    setStep('importing');

    const summary: ImportSummary = {
      coursesImported: 0,
      courseErrors: 0,
      programsImported: 0,
      programErrors: 0,
    };

    // Import selected courses in one batch call
    const coursesToImport = extractionResult.courses.filter((c) =>
      selectedCourses.has(c.code),
    );
    if (coursesToImport.length > 0) {
      try {
        const { data } = await batchCreateCourses({
          variables: {
            courses: coursesToImport.map((c) => ({
              code: c.code,
              title: c.title,
              description: c.description,
              credits: c.credits,
              department: c.department,
              category: c.category,
              courseLevel: c.courseLevel,
              offeredSemesters: c.offeredSemesters,
              prerequisiteCodes: c.prerequisiteCodes,
              corequisiteCodes: c.corequisiteCodes,
            })),
          },
        });
        const batchResult = (
          data as {
            batchCreateCourses: { imported: number; errors: unknown[] };
          } | null
        )?.batchCreateCourses;
        if (batchResult) {
          summary.coursesImported = batchResult.imported;
          summary.courseErrors = batchResult.errors.length;
        }
      } catch {
        summary.courseErrors = coursesToImport.length;
      }
    }

    // Import selected programs one-by-one (typically 5–20 programs)
    const programsToImport = extractionResult.programs.filter((p) =>
      selectedPrograms.has(p.code),
    );
    for (const prog of programsToImport) {
      try {
        await createProgram({
          variables: {
            input: {
              name: prog.name,
              code: prog.code,
              programType: prog.programType,
              department: prog.department,
              totalCreditsRequired: prog.totalCreditsRequired ?? 0,
              expectedDurationSemesters: prog.expectedDurationSemesters,
              requirements: [],
            },
          },
        });
        summary.programsImported++;
      } catch {
        summary.programErrors++;
      }
    }

    setImportSummary(summary);
    setStep('result');
  }, [
    extractionResult,
    selectedCourses,
    selectedPrograms,
    batchCreateCourses,
    createProgram,
  ]);

  const handleReset = useCallback(() => {
    setStep('upload');
    setExtractionResult(null);
    setSelectedCourses(new Set());
    setSelectedPrograms(new Set());
    setGlobalError('');
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/admin/catalog">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Catalog
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">AI Catalog Import</h1>
            <p className="text-sm text-muted-foreground">
              Upload an academic catalog document — Claude extracts every course
              and program automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} />

      {/* Global error */}
      {globalError && (
        <div
          className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
          role="alert"
        >
          <XCircle className="h-4 w-4 shrink-0" />
          <span>{globalError}</span>
          <button
            className="ml-auto"
            onClick={() => setGlobalError('')}
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step content */}
      <div className="rounded-lg border bg-card p-6">
        {step === 'upload' && <UploadStep onAnalyze={handleAnalyze} />}
        {step === 'analyzing' && <AnalyzingStep />}
        {step === 'review' && extractionResult && (
          <ReviewStep
            result={extractionResult}
            selectedCourses={selectedCourses}
            selectedPrograms={selectedPrograms}
            onToggleCourse={(code) =>
              setSelectedCourses((prev) => {
                const next = new Set(prev);
                if (next.has(code)) {
                  next.delete(code);
                } else {
                  next.add(code);
                }
                return next;
              })
            }
            onToggleProgram={(code) =>
              setSelectedPrograms((prev) => {
                const next = new Set(prev);
                if (next.has(code)) {
                  next.delete(code);
                } else {
                  next.add(code);
                }
                return next;
              })
            }
            onToggleAllCourses={(select) =>
              setSelectedCourses(
                select
                  ? new Set(extractionResult.courses.map((c) => c.code))
                  : new Set(),
              )
            }
            onToggleAllPrograms={(select) =>
              setSelectedPrograms(
                select
                  ? new Set(extractionResult.programs.map((p) => p.code))
                  : new Set(),
              )
            }
            onConfirm={handleConfirmImport}
          />
        )}
        {step === 'importing' && <ImportingStep />}
        {step === 'result' && (
          <ResultStep summary={importSummary} onReset={handleReset} />
        )}
      </div>
    </div>
  );
}
