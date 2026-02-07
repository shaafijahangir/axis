import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ObjectType, Field, Float, registerEnumType } from '@nestjs/graphql';
import { Tenant } from './tenant.entity';
import { CourseSection } from './course-section.entity';

export enum AssignmentType {
  ASSIGNMENT = 'assignment',
  QUIZ = 'quiz',
  EXAM = 'exam',
  DISCUSSION = 'discussion',
  PROJECT = 'project',
}

registerEnumType(AssignmentType, { name: 'AssignmentType' });

/**
 * DATA-001: Added tenantId for direct tenant filtering without joins.
 * WHY: Previously required joining section → course to get tenantId.
 */
@ObjectType()
@Entity('assignments')
@Index(['tenantId'])
@Index(['sectionId'])
@Index(['dueAt'])
export class Assignment {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Field()
  @Column()
  sectionId: string;

  @ManyToOne(() => CourseSection)
  @JoinColumn({ name: 'sectionId' })
  section: CourseSection;

  @Field({ nullable: true })
  @Column({ nullable: true })
  moduleId: string;

  @Field()
  @Column()
  title: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  description: string;

  @Field(() => AssignmentType)
  @Column({
    type: 'enum',
    enum: AssignmentType,
    default: AssignmentType.ASSIGNMENT,
  })
  type: AssignmentType;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  pointsPossible: number;

  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  dueAt: Date;

  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  unlockAt: Date;

  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  lockAt: Date;

  @Field(() => String, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  rubric: Record<string, any>;

  @Field(() => String, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any>;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
