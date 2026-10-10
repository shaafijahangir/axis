import { graphql } from '@/lib/graphql/__generated__';

export const QUESTION_FIELDS = graphql(`
  fragment QuestionFields on QuizQuestion {
    id
    assignmentId
    questionText
    questionType
    options {
      text
      isCorrect
    }
    points
    order
  }
`);

export const STUDENT_QUESTION_FIELDS = graphql(`
  fragment StudentQuestionFields on QuizQuestion {
    id
    assignmentId
    questionText
    questionType
    options {
      text
    }
    points
    order
  }
`);

export const QUIZ_QUESTIONS_QUERY = graphql(`
  query QuizQuestions($assignmentId: String!) {
    quizQuestions(assignmentId: $assignmentId) {
      ...QuestionFields
    }
  }
`);

export const STUDENT_QUIZ_QUESTIONS_QUERY = graphql(`
  query StudentQuizQuestions($assignmentId: String!) {
    studentQuizQuestions(assignmentId: $assignmentId) {
      ...StudentQuestionFields
    }
  }
`);
