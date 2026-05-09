'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

import { STUDENT_QUIZ_QUESTIONS_QUERY } from '@/lib/graphql/queries/quiz';
import {
  START_QUIZ_MUTATION,
  SUBMIT_QUIZ_MUTATION,
} from '@/lib/graphql/mutations/quiz';

interface QuizOption {
  text: string;
}

interface QuizQuestion {
  id: string;
  questionText: string;
  questionType: string;
  options: QuizOption[] | null;
  points: number;
  order: number;
}

interface QuizResult {
  id: string;
  attempt: number;
  submittedAt: string;
  autoScore: number | null;
  score: number | null;
  gradedAt: string | null;
}

interface QuizDeliveryProps {
  assignmentId: string;
  pointsPossible: number;
  maxAttempts?: number | null;
  timeLimitMinutes?: number | null;
  displayMode?: string | null;
  existingAttempts: number;
  onSubmitted: () => void;
}

type QuizState = 'intro' | 'taking' | 'submitted';

export function QuizDelivery({
  assignmentId,
  pointsPossible,
  maxAttempts,
  timeLimitMinutes,
  displayMode,
  existingAttempts,
  onSubmitted,
}: QuizDeliveryProps) {
  const [quizState, setQuizState] = useState<QuizState>('intro');
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [, setStartedAt] = useState<Date | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | undefined>>(
    {},
  );
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [submitError, setSubmitError] = useState('');

  const isOneAtATime = displayMode === 'one_at_a_time';
  const attemptsRemaining =
    maxAttempts !== null && maxAttempts !== undefined
      ? maxAttempts - existingAttempts
      : null;

  const { data: questionsData } = useQuery<{
    studentQuizQuestions: QuizQuestion[];
  }>(STUDENT_QUIZ_QUESTIONS_QUERY, {
    variables: { assignmentId },
    skip: quizState === 'intro',
  });

  const questions = useMemo(
    () => questionsData?.studentQuizQuestions ?? [],
    [questionsData?.studentQuizQuestions],
  );

  const [startQuiz, { loading: startLoading }] = useMutation<{
    startQuiz: { id: string; startedAt: string; attempt: number };
  }>(START_QUIZ_MUTATION, {
    onCompleted: (data) => {
      setSubmissionId(data.startQuiz.id);
      setStartedAt(new Date(data.startQuiz.startedAt));
      if (timeLimitMinutes) {
        setTimeLeft(timeLimitMinutes * 60);
      }
      setQuizState('taking');
    },
  });

  const [submitQuiz, { loading: submitLoading }] = useMutation<{
    submitQuiz: QuizResult;
  }>(SUBMIT_QUIZ_MUTATION, {
    onCompleted: (data) => {
      setResult(data.submitQuiz);
      setQuizState('submitted');
      onSubmitted();
    },
    onError: (err) => setSubmitError(err.message),
  });

  // Countdown timer
  useEffect(() => {
    if (quizState !== 'taking' || timeLeft === null) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const interval = setInterval(() => setTimeLeft((t) => (t ?? 0) - 1), 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizState, timeLeft]);

  const handleStart = () => {
    startQuiz({ variables: { assignmentId } });
  };

  const handleAnswerSelect = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleTextAnswer = (questionId: string, text: string) => {
    setTextAnswers((prev) => ({ ...prev, [questionId]: text }));
  };

  const handleSubmit = useCallback(() => {
    if (!submissionId) return;

    const answerPayload = questions.map((q) => ({
      questionId: q.id,
      selectedOption: answers[q.id],
      textAnswer: textAnswers[q.id] ?? undefined,
    }));

    submitQuiz({
      variables: {
        input: { submissionId, answers: answerPayload },
      },
    });
  }, [submissionId, questions, answers, textAnswers, submitQuiz]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const answeredCount = questions.filter(
    (q) =>
      answers[q.id] !== undefined ||
      (textAnswers[q.id] && textAnswers[q.id].trim()),
  ).length;

  // ── Intro screen ──────────────────────────────────────────────────────────
  if (quizState === 'intro') {
    const blocked = attemptsRemaining !== null && attemptsRemaining <= 0;

    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold">Ready to take the quiz?</h3>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between rounded-md bg-muted px-3 py-2">
              <span className="text-muted-foreground">Total points</span>
              <span className="font-medium">{pointsPossible}</span>
            </div>
            {timeLimitMinutes && (
              <div className="flex justify-between rounded-md bg-muted px-3 py-2">
                <span className="text-muted-foreground">Time limit</span>
                <span className="font-medium">{timeLimitMinutes} min</span>
              </div>
            )}
            {maxAttempts && (
              <div className="flex justify-between rounded-md bg-muted px-3 py-2">
                <span className="text-muted-foreground">Attempts</span>
                <span className="font-medium">
                  {existingAttempts}/{maxAttempts} used
                </span>
              </div>
            )}
          </div>
          {blocked ? (
            <p className="text-sm text-destructive">
              You have used all {maxAttempts} attempt
              {maxAttempts !== 1 ? 's' : ''} for this quiz.
            </p>
          ) : (
            <Button onClick={handleStart} disabled={startLoading}>
              {startLoading ? 'Starting...' : 'Start Quiz'}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Result screen ─────────────────────────────────────────────────────────
  if (quizState === 'submitted' && result) {
    const hasShortAnswer = questions.some(
      (q) => q.questionType === 'short_answer',
    );

    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-emerald-500" />
            <h3 className="font-semibold text-lg">Quiz submitted!</h3>
          </div>
          {result.autoScore !== null && !hasShortAnswer ? (
            <div className="space-y-2">
              <p className="text-3xl font-bold">
                {result.autoScore}
                <span className="text-lg font-normal text-muted-foreground">
                  /{pointsPossible}
                </span>
              </p>
              <Progress
                value={(result.autoScore / pointsPossible) * 100}
                className="h-3"
              />
              <p className="text-sm text-muted-foreground">
                {Math.round((result.autoScore / pointsPossible) * 100)}% —{' '}
                Attempt {result.attempt}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {hasShortAnswer
                ? 'Your short-answer responses require manual grading. Check back soon.'
                : 'Grading in progress.'}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Taking the quiz ───────────────────────────────────────────────────────
  if (quizState !== 'taking' || questions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Loading questions...</p>
        </CardContent>
      </Card>
    );
  }

  const displayQuestions = isOneAtATime ? [questions[currentIndex]] : questions;

  return (
    <div className="space-y-4">
      {/* Timer + progress bar */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {answeredCount}/{questions.length} answered
        </span>
        {timeLeft !== null && (
          <div
            className={`flex items-center gap-1 text-sm font-mono font-medium ${
              timeLeft < 60 ? 'text-destructive' : 'text-muted-foreground'
            }`}
          >
            <Clock className="h-4 w-4" />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>
      <Progress
        value={(answeredCount / questions.length) * 100}
        className="h-1.5"
      />

      {/* Questions */}
      <div className="space-y-4">
        {displayQuestions.map((q, i) => {
          const qIndex = isOneAtATime ? currentIndex : i;
          return (
            <QuestionView
              key={q.id}
              question={q}
              index={qIndex}
              selectedOption={answers[q.id]}
              textAnswer={textAnswers[q.id] ?? ''}
              onOptionSelect={(idx) => handleAnswerSelect(q.id, idx)}
              onTextChange={(text) => handleTextAnswer(q.id, text)}
            />
          );
        })}
      </div>

      {/* Navigation (one at a time) */}
      {isOneAtATime && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentIndex((i) => i - 1)}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {questions.length}
          </span>
          {currentIndex < questions.length - 1 ? (
            <Button size="sm" onClick={() => setCurrentIndex((i) => i + 1)}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleSubmit} disabled={submitLoading}>
              {submitLoading ? 'Submitting...' : 'Submit Quiz'}
            </Button>
          )}
        </div>
      )}

      {/* Submit (all at once) */}
      {!isOneAtATime && (
        <div className="space-y-2">
          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={submitLoading}
          >
            {submitLoading ? 'Submitting...' : 'Submit Quiz'}
          </Button>
          {answeredCount < questions.length && (
            <p className="text-center text-xs text-muted-foreground">
              {questions.length - answeredCount} unanswered question
              {questions.length - answeredCount !== 1 ? 's' : ''} will count as
              incorrect.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Single Question View ─────────────────────────────────────────────────────

interface QuestionViewProps {
  question: QuizQuestion;
  index: number;
  selectedOption: number | undefined;
  textAnswer: string;
  onOptionSelect: (index: number) => void;
  onTextChange: (text: string) => void;
}

function QuestionView({
  question,
  index,
  selectedOption,
  textAnswer,
  onOptionSelect,
  onTextChange,
}: QuestionViewProps) {
  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-2">
          <Badge variant="outline" className="mt-0.5 shrink-0 text-xs">
            Q{index + 1}
          </Badge>
          <p className="font-medium">{question.questionText}</p>
          <Badge variant="secondary" className="ml-auto shrink-0 text-xs">
            {question.points} pt{question.points !== 1 ? 's' : ''}
          </Badge>
        </div>

        {question.questionType === 'short_answer' ? (
          <textarea
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            rows={4}
            placeholder="Type your answer..."
            value={textAnswer}
            onChange={(e) => onTextChange(e.target.value)}
          />
        ) : (
          <div className="space-y-2">
            {question.options?.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onOptionSelect(i)}
                className={`w-full rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                  selectedOption === i
                    ? 'border-primary bg-primary/5 font-medium'
                    : 'hover:bg-muted'
                }`}
              >
                <span className="mr-2 font-mono text-xs text-muted-foreground">
                  {String.fromCharCode(65 + i)}.
                </span>
                {opt.text}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
