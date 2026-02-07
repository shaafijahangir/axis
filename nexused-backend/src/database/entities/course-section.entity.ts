import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ObjectType, Field, Int, registerEnumType } from '@nestjs/graphql';
import { BaseEntity } from './base.entity';
import { Course } from './course.entity';
import { AcademicTerm } from './academic-term.entity';
import { User } from './user.entity';

export enum SectionStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

registerEnumType(SectionStatus, { name: 'SectionStatus' });

@ObjectType()
@Entity('course_sections')
@Index(['courseId'])
@Index(['instructorId'])
@Index(['termId'])
export class CourseSection extends BaseEntity {
  @Field()
  @Column()
  courseId: string;

  @Field(() => Course)
  @ManyToOne(() => Course)
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Field()
  @Column()
  termId: string;

  @ManyToOne(() => AcademicTerm)
  @JoinColumn({ name: 'termId' })
  term: AcademicTerm;

  @Field()
  @Column()
  instructorId: string;

  @Field(() => User)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'instructorId' })
  instructor: User;

  @Field(() => String, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  schedule: Record<string, any>;

  @Field({ nullable: true })
  @Column({ nullable: true })
  location: string;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  capacity: number;

  @Field(() => SectionStatus)
  @Column({
    type: 'enum',
    enum: SectionStatus,
    default: SectionStatus.DRAFT,
  })
  status: SectionStatus;
}
