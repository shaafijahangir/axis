import { graphql } from '@/lib/graphql/__generated__';

export const ME_QUERY = graphql(`
  query Me {
    me {
      id
      email
      firstName
      lastName
      roles
      status
      tenantId
      preferences
      title
      officeLocation
      createdAt
    }
  }
`);
