import { graphql } from '@/lib/graphql/__generated__';

export const ADMIN_CREATE_USER_MUTATION = graphql(`
  mutation AdminCreateUser($input: AdminCreateUserInput!) {
    adminCreateUser(input: $input) {
      id
      email
      firstName
      lastName
      roles
      status
      gradeLevel
      homeroomTeacherId
    }
  }
`);

export const ADMIN_UPDATE_USER_MUTATION = graphql(`
  mutation AdminUpdateUser($id: String!, $input: AdminUpdateUserInput!) {
    adminUpdateUser(id: $id, input: $input) {
      id
      email
      firstName
      lastName
      roles
      status
      gradeLevel
      homeroomTeacherId
    }
  }
`);

export const DEACTIVATE_USER_MUTATION = graphql(`
  mutation DeactivateUser($id: String!) {
    deactivateUser(id: $id) {
      id
      status
    }
  }
`);

export const ACTIVATE_USER_MUTATION = graphql(`
  mutation ActivateUser($id: String!) {
    activateUser(id: $id) {
      id
      status
    }
  }
`);
