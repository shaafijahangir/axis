import { ObjectType, Field, Float, registerEnumType } from '@nestjs/graphql';

// ─── Student Feed ─────────────────────────────────────────────────────────

export enum FeedItemType {
  DEADLINE = 'deadline',
  GRADE_POSTED = 'grade_posted',
  ANNOUNCEMENT = 'announcement',
  COURSE_UPDATE = 'course_update',
  ENROLLMENT_UPDATE = 'enrollment_update',
  /** FEAT-020: upcoming office-hours booking. `dueAt` = appointment start. */
  APPOINTMENT = 'appointment',
}

registerEnumType(FeedItemType, { name: 'FeedItemType' });

/**
 * WHY: A flattened union type rather than a GraphQL union.
 * GraphQL unions require __typename resolution which adds complexity.
 * Nullable fields per type are simpler for the frontend to consume.
 *
 * TRADEOFF: Some fields are null depending on type. Frontend checks `type`
 * to know which fields are populated.
 */
@ObjectType()
export class FeedItem {
  @Field(() => FeedItemType)
  type: FeedItemType;

  @Field()
  id: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  subtitle?: string;

  @Field({ nullable: true })
  body?: string;

  /**
   * FEAT-020: course fields are nullable — APPOINTMENT items belong to an
   * instructor, not a course. Every other type populates all four.
   */
  @Field({ nullable: true })
  courseCode?: string;

  @Field({ nullable: true })
  courseTitle?: string;

  /**
   * BUG-014: the course's own id, for building `/courses/{courseId}/section/
   * {sectionId}/...` deep-links. Before this field existed the frontend put
   * sectionId in the courseId slot, producing dead course back-links.
   */
  @Field({ nullable: true })
  courseId?: string;

  @Field({ nullable: true })
  sectionId?: string;

  @Field({ nullable: true })
  assignmentId?: string;

  /** Deadline for DEADLINE items; appointment start for APPOINTMENT items. */
  @Field({ nullable: true })
  dueAt?: Date;

  /** FEAT-020: where an APPOINTMENT happens — room string or "Zoom". */
  @Field({ nullable: true })
  location?: string;

  @Field(() => Float, { nullable: true })
  score?: number;

  @Field(() => Float, { nullable: true })
  pointsPossible?: number;

  @Field()
  timestamp: Date;
}

// ─── Instructor Feed ──────────────────────────────────────────────────────

export enum InstructorFeedItemType {
  UNGRADED = 'ungraded',
  UPCOMING_DEADLINE = 'upcoming_deadline',
  ANNOUNCEMENT = 'announcement',
  /** FEAT-020: booked office-hours appointment (today/tomorrow). */
  APPOINTMENT = 'appointment',
}

registerEnumType(InstructorFeedItemType, { name: 'InstructorFeedItemType' });

@ObjectType()
export class InstructorFeedItem {
  @Field(() => InstructorFeedItemType)
  type: InstructorFeedItemType;

  @Field()
  id: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  subtitle?: string;

  /** FEAT-020: nullable — APPOINTMENT items are not course-scoped. */
  @Field({ nullable: true })
  courseCode?: string;

  @Field({ nullable: true })
  courseTitle?: string;

  /** BUG-014: course id for deep-links (see FeedItem.courseId). */
  @Field({ nullable: true })
  courseId?: string;

  @Field({ nullable: true })
  sectionId?: string;

  @Field({ nullable: true })
  assignmentId?: string;

  @Field({ nullable: true })
  ungradedCount?: number;

  /** Deadline, or appointment start for APPOINTMENT items. */
  @Field({ nullable: true })
  dueAt?: Date;

  /** FEAT-020: where an APPOINTMENT happens — room string or "Zoom". */
  @Field({ nullable: true })
  location?: string;

  @Field()
  timestamp: Date;
}

// ─── Grades Summary ──────────────────────────────────────────────────────

/**
 * WHY: Separate types for the grades summary page rather than reusing FeedItem.
 * The grades view groups by course section and needs totals/percentages —
 * a different shape than the feed's flat list.
 */

@ObjectType()
export class GradedAssignment {
  @Field()
  assignmentId: string;

  @Field()
  assignmentTitle: string;

  @Field()
  assignmentType: string;

  @Field(() => Float)
  pointsPossible: number;

  @Field(() => Float)
  score: number;

  @Field(() => Float)
  percentage: number;

  @Field()
  gradedAt: Date;

  @Field({ nullable: true })
  feedback?: string;
}

@ObjectType()
export class CourseSectionGrades {
  @Field()
  sectionId: string;

  @Field()
  courseId: string;

  @Field()
  courseCode: string;

  @Field()
  courseTitle: string;

  @Field({ nullable: true })
  sectionInstructor?: string;

  @Field(() => Float)
  totalPointsEarned: number;

  @Field(() => Float)
  totalPointsPossible: number;

  @Field(() => Float)
  overallPercentage: number;

  @Field(() => [GradedAssignment])
  assignments: GradedAssignment[];
}
