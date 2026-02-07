import { gql } from '@apollo/client';

export const CREATE_ANNOUNCEMENT_MUTATION = gql`
  mutation CreateAnnouncement($input: CreateAnnouncementInput!) {
    createAnnouncement(input: $input) {
      id
      title
      body
      priority
      pinned
      createdAt
    }
  }
`;
