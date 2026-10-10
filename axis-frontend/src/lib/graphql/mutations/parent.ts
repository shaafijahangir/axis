import { graphql } from '@/lib/graphql/__generated__';

export const LINK_STUDENT_TO_PARENT_MUTATION = graphql(`
  mutation LinkStudentToParent($input: LinkStudentInput!) {
    linkStudentToParent(input: $input) {
      id
      parentId
      studentId
      relationship
    }
  }
`);

export const UNLINK_STUDENT_FROM_PARENT_MUTATION = graphql(`
  mutation UnlinkStudentFromParent($parentId: String!, $studentId: String!) {
    unlinkStudentFromParent(parentId: $parentId, studentId: $studentId)
  }
`);
