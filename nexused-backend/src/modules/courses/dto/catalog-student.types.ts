import {
  InputType,
  Field,
  Float,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { CourseCategory } from '../../../database/entities/course.entity';
import { EnrollmentMode } from '../../../database/entities/course-section.entity';

/**
 * ENROLL-001: Student-facing catalog types.
 *
 * WHY separate from CatalogFilterInput/CatalogPage?
 * - Admin catalog (ONBOARD-002) returns Course entities directly.
 * - Student catalog returns section-centric cards with live seat counts,
 *   instructor names, and schedule — computed fields that don't exist on
 *   the raw entity.
 * - Mixing them would either over-expose admin fields to students or
 *   force awkward nullable optional fields on both paths.
 *
 * PATTERN: Each view surface gets its own DTO. Types are cheap.
 */

@ObjectType()
export class CatalogInstructor {
  @Field()
  id: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;
}

@ObjectType()
export class CatalogSection {
  @Field()
  id: string;

  /** JSONB schedule serialized to string. Frontend parses with JSON.parse(). */
  @Field(() => String, { nullable: true })
  schedule: string | null;

  @Field({ nullable: true })
  location: string;

  /** Total seats in this section (null = unlimited). */
  @Field(() => Int, { nullable: true })
  capacity: number | null;

  /** Active + pending + waitlisted enrollments. */
  @Field(() => Int)
  enrolledCount: number;

  /** capacity - enrolledCount. Null if capacity is not set. */
  @Field(() => Int, { nullable: true })
  seatsAvailable: number | null;

  @Field(() => EnrollmentMode)
  enrollmentMode: EnrollmentMode;

  @Field(() => CatalogInstructor)
  instructor: CatalogInstructor;

  @Field()
  termId: string;

  @Field()
  termName: string;
}

@ObjectType()
export class CatalogCourse {
  @Field()
  id: string;

  @Field()
  code: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  description: string;

  @Field(() => Float, { nullable: true })
  credits: number;

  /** departmentId stored as the department string identifier. */
  @Field({ nullable: true })
  department: string;

  @Field(() => CourseCategory, { nullable: true })
  category: CourseCategory;

  @Field(() => Int, { nullable: true })
  courseLevel: number;

  @Field(() => [String], { nullable: true })
  prerequisiteCourseIds: string[];

  @Field(() => [CatalogSection])
  sections: CatalogSection[];
}

@ObjectType()
export class StudentCatalogPage {
  @Field(() => [CatalogCourse])
  items: CatalogCourse[];

  /** Total matching courses (before pagination). */
  @Field(() => Int)
  total: number;
}

@InputType()
export class StudentCatalogFilter {
  /** Full-text search on course code, title, or instructor name (ILIKE). */
  @Field({ nullable: true })
  search?: string;

  /** Filter by specific term. Defaults to the current academic term. */
  @Field({ nullable: true })
  termId?: string;

  /** Filter by department identifier. */
  @Field({ nullable: true })
  department?: string;

  @Field(() => CourseCategory, { nullable: true })
  category?: CourseCategory;

  /** Filter by course level (100, 200, 300, 400…). */
  @Field(() => Int, { nullable: true })
  courseLevel?: number;

  /** When true, only return sections with at least one seat available. */
  @Field(() => Boolean, { nullable: true })
  hasSeats?: boolean;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  limit?: number;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  offset?: number;
}
