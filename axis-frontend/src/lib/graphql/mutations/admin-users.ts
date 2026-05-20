import { gql } from '@apollo/client';

export const ADMIN_CREATE_USER_MUTATION = gql`
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
`;

export const ADMIN_UPDATE_USER_MUTATION = gql`
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
`;

export const DEACTIVATE_USER_MUTATION = gql`
  mutation DeactivateUser($id: String!) {
    deactivateUser(id: $id) {
      id
      status
    }
  }
`;

export const ACTIVATE_USER_MUTATION = gql`
  mutation ActivateUser($id: String!) {
    activateUser(id: $id) {
      id
      status
    }
  }
`;
