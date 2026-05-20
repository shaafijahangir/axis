import { InputType, ObjectType, Field } from '@nestjs/graphql';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ReportCardStatus } from '../../../database/entities/report-card.entity';

@InputType()
export class UpdateReportCardInput {
  @Field()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  teacherComment?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  finalGrade?: string;
}

@ObjectType()
export class ReportCardSummary {
  @Field()
  id: string;

  @Field()
  studentId: string;

  @Field()
  studentFirstName: string;

  @Field()
  studentLastName: string;

  @Field()
  studentEmail: string;

  @Field()
  sectionId: string;

  @Field()
  courseCode: string;

  @Field()
  courseTitle: string;

  @Field()
  termId: string;

  @Field()
  termName: string;

  @Field(() => ReportCardStatus)
  status: ReportCardStatus;

  @Field({ nullable: true })
  teacherComment?: string;

  @Field({ nullable: true })
  finalGrade?: string;

  @Field({ nullable: true })
  gradeSummary?: string;

  @Field({ nullable: true })
  attendanceSummary?: string;

  @Field({ nullable: true })
  publishedAt?: Date;

  @Field()
  createdAt: Date;
}
