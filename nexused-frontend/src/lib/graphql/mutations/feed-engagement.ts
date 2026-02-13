import { gql } from '@apollo/client';

export const RECORD_FEED_ENGAGEMENT_MUTATION = gql`
  mutation RecordFeedEngagement($input: RecordEngagementInput!) {
    recordFeedEngagement(input: $input)
  }
`;

export const RECORD_FEED_ENGAGEMENT_BATCH_MUTATION = gql`
  mutation RecordFeedEngagementBatch($input: RecordEngagementBatchInput!) {
    recordFeedEngagementBatch(input: $input)
  }
`;
