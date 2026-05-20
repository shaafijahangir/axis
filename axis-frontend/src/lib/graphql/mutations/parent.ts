import { gql } from '@apollo/client';

export const LINK_STUDENT_TO_PARENT_MUTATION = gql`
  mutation LinkStudentToParent($input: LinkStudentInput!) {
    linkStudentToParent(input: $input) {
      id
      parentId
      studentId
    }
  }
`;

export const UNLINK_STUDENT_FROM_PARENT_MUTATION = gql`
  mutation UnlinkStudentFromParent($parentId: String!, $studentId: String!) {
    unlinkStudentFromParent(parentId: $parentId, studentId: $studentId)
  }
`;
