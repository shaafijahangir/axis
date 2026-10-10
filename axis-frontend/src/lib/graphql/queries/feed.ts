import { graphql } from '@/lib/graphql/__generated__';

export const STUDENT_FEED_QUERY = graphql(`
  query StudentFeed {
    studentFeed {
      type
      id
      title
      subtitle
      body
      courseCode
      courseTitle
      courseId
      sectionId
      assignmentId
      dueAt
      score
      pointsPossible
      timestamp
    }
  }
`);

export const INSTRUCTOR_FEED_QUERY = graphql(`
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
`);
