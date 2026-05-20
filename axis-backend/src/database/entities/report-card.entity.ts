import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import { TenantScopedEntity } from './base.entity';
import { User } from './user.entity';
import { CourseSection } from './course-section.entity';
import { AcademicTerm } from './academic-term.entity';

export enum ReportCardStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

registerEnumType(ReportCardStatus, { name: 'ReportCardStatus' });

@ObjectType()
@Entity('report_cards')
@Index(['tenantId'])
@Index(['sectionId', 'status'])
@Index(['studentId', 'tenantId'])
@Index(['studentId', 'sectionId', 'termId'], { unique: true })
export class ReportCard extends TenantScopedEntity {
  @Field()
  @Column()
  studentId: string;

  @Field(() => User)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Field()
  @Column()
  sectionId: string;

  @Field(() => CourseSection)
  @ManyToOne(() => CourseSection)
  @JoinColumn({ name: 'sectionId' })
  section: CourseSection;

  @Field()
  @Column()
  termId: string;

  @Field(() => AcademicTerm)
  @ManyToOne(() => AcademicTerm)
  @JoinColumn({ name: 'termId' })
  term: AcademicTerm;

  @Field(() => ReportCardStatus)
  @Column({
    type: 'enum',
    enum: ReportCardStatus,
    default: ReportCardStatus.DRAFT,
  })
  status: ReportCardStatus;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  teacherComment: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 2, nullable: true })
  finalGrade: string | null;

  // JSONB columns — not exposed directly via GraphQL; returned through
  // ReportCardSummary DTO with JSON.stringify().
  @Column({ type: 'jsonb', nullable: true })
  gradeSummary: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  attendanceSummary: Record<string, unknown> | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date | null;
}
