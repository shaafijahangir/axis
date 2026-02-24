import { gql } from '@apollo/client';

const QUESTION_FIELDS = gql`
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
`;

const STUDENT_QUESTION_FIELDS = gql`
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
`;

export const QUIZ_QUESTIONS_QUERY = gql`
  ${QUESTION_FIELDS}
  query QuizQuestions($assignmentId: String!) {
    quizQuestions(assignmentId: $assignmentId) {
      ...QuestionFields
    }
  }
`;

export const STUDENT_QUIZ_QUESTIONS_QUERY = gql`
  ${STUDENT_QUESTION_FIELDS}
  query StudentQuizQuestions($assignmentId: String!) {
    studentQuizQuestions(assignmentId: $assignmentId) {
      ...StudentQuestionFields
    }
  }
`;
