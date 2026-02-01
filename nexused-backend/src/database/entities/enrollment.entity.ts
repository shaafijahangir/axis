import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import { User } from './user.entity';
import { CourseSection } from './course-section.entity';

export enum EnrollmentRole {
  STUDENT = 'student',
  TA = 'ta',
  OBSERVER = 'observer',
}

export enum EnrollmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  DROPPED = 'dropped',
  WITHDRAWN = 'withdrawn',
}

registerEnumType(EnrollmentRole, { name: 'EnrollmentRole' });
registerEnumType(EnrollmentStatus, { name: 'EnrollmentStatus' });

@ObjectType()
@Entity('enrollments')
export class Enrollment {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  userId: string;

  @Field(() => User)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Field()
  @Column()
  sectionId: string;

  @Field(() => CourseSection)
  @ManyToOne(() => CourseSection)
  @JoinColumn({ name: 'sectionId' })
  section: CourseSection;

  @Field(() => EnrollmentRole)
  @Column({
    type: 'enum',
    enum: EnrollmentRole,
    default: EnrollmentRole.STUDENT,
  })
  role: EnrollmentRole;

  @Field(() => EnrollmentStatus)
  @Column({
    type: 'enum',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.ACTIVE,
  })
  status: EnrollmentStatus;

  @Field()
  @Column({ type: 'timestamp' })
  enrolledAt: Date;

  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 2, nullable: true })
  finalGrade: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
