import { InputType, ObjectType, Field, Float, Int } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { EnrollmentStatus } from '../../../database/entities/enrollment.entity';
import { ReportCardStatus } from '../../../database/entities/report-card.entity';
import { ParentRelationship } from '../../../database/entities/parent-student.entity';

@InputType()
export class LinkStudentInput {
  @Field()
  @IsUUID()
  parentId: string;

  @Field()
  @IsUUID()
  studentId: string;

  @Field(() => ParentRelationship, { nullable: true })
  @IsOptional()
  @IsEnum(ParentRelationship)
  relationship?: ParentRelationship;
}

@ObjectType()
export class LinkedStudent {
  @Field()
  id: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field()
  email: string;

  @Field()
  linkId: string;
}

@ObjectType()
export class ParentEnrollmentItem {
  @Field()
  enrollmentId: string;

  @Field()
  sectionId: string;

  @Field()
  courseCode: string;

  @Field()
  courseTitle: string;

  @Field({ nullable: true })
  location?: string;

  @Field({ nullable: true })
  instructorName?: string;

  @Field(() => EnrollmentStatus)
  status: EnrollmentStatus;

  @Field({ nullable: true })
  termName?: string;
}

@ObjectType()
export class ParentGradeItem {
  @Field()
  assignmentId: string;

  @Field()
  assignmentTitle: string;

  @Field()
  courseCode: string;

  @Field(() => Float)
  pointsPossible: number;

  @Field(() => Float, { nullable: true })
  score?: number;

  @Field({ nullable: true })
  gradedAt?: Date;

  @Field({ nullable: true })
  dueAt?: Date;
}

@ObjectType()
export class ParentReportCard {
  @Field()
  id: string;

  @Field()
  courseCode: string;

  @Field()
  courseTitle: string;

  @Field()
  termName: string;

  @Field(() => ReportCardStatus)
  status: ReportCardStatus;

  @Field({ nullable: true })
  finalGrade?: string;

  @Field({ nullable: true })
  teacherComment?: string;

  @Field({ nullable: true })
  gradeSummary?: string;

  @Field({ nullable: true })
  attendanceSummary?: string;

  @Field({ nullable: true })
  publishedAt?: Date;
}

@ObjectType()
export class ParentStudentOverview {
  @Field()
  studentId: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field(() => Int)
  activeEnrollments: number;

  @Field(() => Float, { nullable: true })
  overallGradePct?: number;
}
