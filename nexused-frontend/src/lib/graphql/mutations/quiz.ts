import { gql } from '@apollo/client';

export const ADD_QUIZ_QUESTION_MUTATION = gql`
  mutation AddQuizQuestion($input: AddQuizQuestionInput!) {
    addQuizQuestion(input: $input) {
      id
      questionText
      questionType
      options {
        text
        isCorrect
      }
      points
      order
    }
  }
`;

export const UPDATE_QUIZ_QUESTION_MUTATION = gql`
  mutation UpdateQuizQuestion($id: String!, $input: UpdateQuizQuestionInput!) {
    updateQuizQuestion(id: $id, input: $input) {
      id
      questionText
      options {
        text
        isCorrect
      }
      points
    }
  }
`;

export const DELETE_QUIZ_QUESTION_MUTATION = gql`
  mutation DeleteQuizQuestion($id: String!) {
    deleteQuizQuestion(id: $id)
  }
`;

export const REORDER_QUIZ_QUESTIONS_MUTATION = gql`
  mutation ReorderQuizQuestions($input: ReorderQuestionsInput!) {
    reorderQuizQuestions(input: $input) {
      id
      order
    }
  }
`;

export const UPDATE_QUIZ_SETTINGS_MUTATION = gql`
  mutation UpdateQuizSettings($input: UpdateQuizSettingsInput!) {
    updateQuizSettings(input: $input) {
      id
      maxAttempts
      timeLimitMinutes
      displayMode
    }
  }
`;

export const START_QUIZ_MUTATION = gql`
  mutation StartQuiz($assignmentId: String!) {
    startQuiz(assignmentId: $assignmentId) {
      id
      startedAt
      attempt
    }
  }
`;

export const SUBMIT_QUIZ_MUTATION = gql`
  mutation SubmitQuiz($input: SubmitQuizInput!) {
    submitQuiz(input: $input) {
      id
      attempt
      submittedAt
      autoScore
      score
      gradedAt
      answers
    }
  }
`;
