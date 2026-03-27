'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  Plus,
  Trash2,
  GripVertical,
  Settings2,
  CheckCircle,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { QUIZ_QUESTIONS_QUERY } from '@/lib/graphql/queries/quiz';
import {
  ADD_QUIZ_QUESTION_MUTATION,
  DELETE_QUIZ_QUESTION_MUTATION,
  UPDATE_QUIZ_SETTINGS_MUTATION,
} from '@/lib/graphql/mutations/quiz';

type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

interface QuizOption {
  text: string;
  isCorrect?: boolean;
}

interface QuizQuestion {
  id: string;
  questionText: string;
  questionType: QuestionType;
  options: QuizOption[] | null;
  points: number;
  order: number;
}

interface QuizBuilderProps {
  assignmentId: string;
  maxAttempts?: number | null;
  timeLimitMinutes?: number | null;
  displayMode?: string | null;
}

const DEFAULT_MCQ_OPTIONS: QuizOption[] = [
  { text: '', isCorrect: false },
  { text: '', isCorrect: false },
  { text: '', isCorrect: false },
  { text: '', isCorrect: false },
];

const DEFAULT_TF_OPTIONS: QuizOption[] = [
  { text: 'True', isCorrect: false },
  { text: 'False', isCorrect: false },
];

export function QuizBuilder({
  assignmentId,
  maxAttempts,
  timeLimitMinutes,
  displayMode,
}: QuizBuilderProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // New question form state
  const [questionType, setQuestionType] =
    useState<QuestionType>('multiple_choice');
  const [questionText, setQuestionText] = useState('');
  const [points, setPoints] = useState('1');
  const [options, setOptions] = useState<QuizOption[]>(DEFAULT_MCQ_OPTIONS);

  // Settings state
  const [settingsMaxAttempts, setSettingsMaxAttempts] = useState(
    maxAttempts?.toString() ?? '',
  );
  const [settingsTimeLimit, setSettingsTimeLimit] = useState(
    timeLimitMinutes?.toString() ?? '',
  );
  const [settingsDisplayMode, setSettingsDisplayMode] = useState(
    displayMode ?? 'all_at_once',
  );

  const { data, loading, refetch } = useQuery<{
    quizQuestions: QuizQuestion[];
  }>(QUIZ_QUESTIONS_QUERY, { variables: { assignmentId } });

  const [addQuestion, { loading: addLoading }] = useMutation(
    ADD_QUIZ_QUESTION_MUTATION,
    {
      onCompleted: () => {
        resetForm();
        refetch();
      },
    },
  );

  const [deleteQuestion] = useMutation(DELETE_QUIZ_QUESTION_MUTATION, {
    onCompleted: () => refetch(),
  });

  const [updateSettings] = useMutation(UPDATE_QUIZ_SETTINGS_MUTATION, {
    onCompleted: () => setShowSettings(false),
  });

  const resetForm = () => {
    setShowAddForm(false);
    setQuestionText('');
    setPoints('1');
    setQuestionType('multiple_choice');
    setOptions(DEFAULT_MCQ_OPTIONS);
  };

  const handleTypeChange = (t: QuestionType) => {
    setQuestionType(t);
    if (t === 'multiple_choice') setOptions(DEFAULT_MCQ_OPTIONS);
    else if (t === 'true_false') setOptions(DEFAULT_TF_OPTIONS);
    else setOptions([]);
  };

  const handleOptionTextChange = (index: number, text: string) => {
    setOptions((prev) =>
      prev.map((o, i) => (i === index ? { ...o, text } : o)),
    );
  };

  const handleCorrectToggle = (index: number) => {
    setOptions((prev) =>
      prev.map((o, i) => ({
        ...o,
        // For MCQ: only one correct. For TF: same.
        isCorrect: i === index,
      })),
    );
  };

  const handleAddQuestion = () => {
    if (!questionText.trim()) return;

    const pts = parseFloat(points);
    if (isNaN(pts) || pts < 0) return;

    const sanitizedOptions = questionType === 'short_answer' ? null : options;

    addQuestion({
      variables: {
        input: {
          assignmentId,
          questionText: questionText.trim(),
          questionType,
          options: sanitizedOptions,
          points: pts,
        },
      },
    });
  };

  const handleSaveSettings = () => {
    updateSettings({
      variables: {
        input: {
          assignmentId,
          maxAttempts: settingsMaxAttempts
            ? parseInt(settingsMaxAttempts)
            : null,
          timeLimitMinutes: settingsTimeLimit
            ? parseInt(settingsTimeLimit)
            : null,
          displayMode: settingsDisplayMode,
        },
      },
    });
  };

  const questions = data?.quizQuestions ?? [];
  const totalPoints = questions.reduce((sum, q) => sum + Number(q.points), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Quiz Builder</h3>
          <p className="text-sm text-muted-foreground">
            {questions.length} question{questions.length !== 1 ? 's' : ''} ·{' '}
            {totalPoints} pts total
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSettings((s) => !s)}
          >
            <Settings2 className="mr-1 h-4 w-4" />
            Settings
          </Button>
          <Button size="sm" onClick={() => setShowAddForm((s) => !s)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Quiz Settings panel */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quiz Settings</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Max Attempts</Label>
              <Input
                type="number"
                min={1}
                placeholder="Unlimited"
                value={settingsMaxAttempts}
                onChange={(e) => setSettingsMaxAttempts(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Time Limit (minutes)</Label>
              <Input
                type="number"
                min={1}
                placeholder="No limit"
                value={settingsTimeLimit}
                onChange={(e) => setSettingsTimeLimit(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Display Mode</Label>
              <Select
                value={settingsDisplayMode}
                onValueChange={setSettingsDisplayMode}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_at_once">All at once</SelectItem>
                  <SelectItem value="one_at_a_time">One at a time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-3 flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowSettings(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveSettings}>
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add question form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">New Question</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Question Type</Label>
                <Select
                  value={questionType}
                  onValueChange={(v) => handleTypeChange(v as QuestionType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">
                      Multiple Choice
                    </SelectItem>
                    <SelectItem value="true_false">True / False</SelectItem>
                    <SelectItem value="short_answer">Short Answer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Points</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Question Text</Label>
              <Input
                placeholder="Enter your question..."
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
              />
            </div>

            {/* Options for MCQ / TF */}
            {questionType !== 'short_answer' && (
              <div className="space-y-2">
                <Label className="text-xs">
                  Options{' '}
                  <span className="text-muted-foreground">
                    (click circle to mark correct)
                  </span>
                </Label>
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCorrectToggle(i)}
                      className="shrink-0 text-muted-foreground hover:text-emerald-500"
                    >
                      {opt.isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>
                    <Input
                      placeholder={`Option ${i + 1}`}
                      value={opt.text}
                      onChange={(e) =>
                        handleOptionTextChange(i, e.target.value)
                      }
                      readOnly={questionType === 'true_false'}
                    />
                  </div>
                ))}
              </div>
            )}

            {questionType === 'short_answer' && (
              <p className="text-sm text-muted-foreground">
                Students will type a free-text answer. You&apos;ll grade this
                manually after submission.
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={resetForm}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddQuestion}
                disabled={addLoading}
              >
                {addLoading ? 'Adding...' : 'Add Question'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Question list */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading questions...</p>
      ) : questions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No questions yet. Add your first question above.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map((q, index) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={index}
              onDelete={() => deleteQuestion({ variables: { id: q.id } })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Question Card ────────────────────────────────────────────────────────────

interface QuestionCardProps {
  question: QuizQuestion;
  index: number;
  onDelete: () => void;
}

function QuestionCard({ question, index, onDelete }: QuestionCardProps) {
  const typeLabels: Record<QuestionType, string> = {
    multiple_choice: 'MCQ',
    true_false: 'T/F',
    short_answer: 'Short Answer',
  };

  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Q{index + 1}
            </span>
            <Badge variant="outline" className="text-xs">
              {typeLabels[question.questionType]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {question.points} pt{question.points !== 1 ? 's' : ''}
            </Badge>
          </div>
          <p className="text-sm">{question.questionText}</p>
          {question.options && (
            <div className="space-y-0.5">
              {question.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  {opt.isCorrect ? (
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span
                    className={`text-xs ${opt.isCorrect ? 'font-medium text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}
                  >
                    {opt.text}
                  </span>
                </div>
              ))}
            </div>
          )}
          {question.questionType === 'short_answer' && (
            <p className="text-xs text-muted-foreground italic">
              Free-text answer — graded manually
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
