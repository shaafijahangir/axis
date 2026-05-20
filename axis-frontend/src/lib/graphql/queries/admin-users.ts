import { gql } from '@apollo/client';

export const ADMIN_USERS_QUERY = gql`
  query AdminUsers($filter: UsersFilterInput) {
    adminUsers(filter: $filter) {
      users {
        id
        email
        firstName
        lastName
        roles
        status
        lastLoginAt
        createdAt
        gradeLevel
        homeroomTeacherId
        homeroomTeacher {
          id
          firstName
          lastName
        }
      }
      totalCount
      page
      pageSize
    }
  }
`;

export const ADMIN_USER_QUERY = gql`
  query AdminUser($id: String!) {
    adminUser(id: $id) {
      id
      email
      firstName
      lastName
      roles
      status
      lastLoginAt
      createdAt
      gradeLevel
      homeroomTeacherId
      homeroomTeacher {
        id
        firstName
        lastName
      }
    }
  }
`;

export const USER_COUNT_QUERY = gql`
  query UserCount {
    userCount
  }
`;
