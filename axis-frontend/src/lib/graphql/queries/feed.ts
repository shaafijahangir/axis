import { gql } from '@apollo/client';

export const STUDENT_FEED_QUERY = gql`
  query StudentFeed {
    studentFeed {
      type
      id
      title
      subtitle
      body
      courseCode
      courseTitle
      sectionId
      assignmentId
      dueAt
      score
      pointsPossible
      timestamp
    }
  }
`;

export const INSTRUCTOR_FEED_QUERY = gql`
  query InstructorFeed {
    instructorFeed {
      type
      id
      title
      subtitle
      courseCode
      courseTitle
      sectionId
      assignmentId
      ungradedCount
      dueAt
      timestamp
    }
  }
`;
