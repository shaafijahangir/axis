import { graphql } from '@/lib/graphql/__generated__';

/**
 * ARCH-007 reference implementation — demonstrates the typed `graphql(...)`
 * pattern from `@graphql-codegen/client-preset`.
 *
 * Why this matters: every `useQuery(ADMIN_USERS_QUERY)` consumer below gets
 * full TypeScript inference on `data` for free, with no explicit generic and
 * no hand-written `interface AdminUser { ... }`. Field renames in the backend
 * schema fail typecheck on the next `pnpm codegen` run instead of 500ing at
 * runtime — which is exactly how this codegen pass found three pre-existing
 * field-name bugs (see PR description).
 *
 * Migration: this file is the template. Other queries can adopt the pattern
 * one at a time by replacing `import { gql } from '@apollo/client'` with
 * `import { graphql } from '@/lib/graphql/__generated__'` and renaming `gql`
 * to `graphql`. Existing `gql`-based files keep working unchanged.
 */

export const ADMIN_USERS_QUERY = graphql(`
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
`);

export const ADMIN_USER_QUERY = graphql(`
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
`);

export const USER_COUNT_QUERY = graphql(`
  query UserCount {
    userCount
  }
`);
