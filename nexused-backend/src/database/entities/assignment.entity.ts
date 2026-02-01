import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ObjectType, Field, Float, registerEnumType } from '@nestjs/graphql';
import { CourseSection } from './course-section.entity';

export enum AssignmentType {
  ASSIGNMENT = 'assignment',
  QUIZ = 'quiz',
  EXAM = 'exam',
  DISCUSSION = 'discussion',
  PROJECT = 'project',
}

registerEnumType(AssignmentType, { name: 'AssignmentType' });

@ObjectType()
@Entity('assignments')
export class Assignment {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  id: string;

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
