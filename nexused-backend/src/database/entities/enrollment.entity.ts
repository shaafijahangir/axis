import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import { TenantScopedEntity } from './base.entity';
import { User } from './user.entity';
import { CourseSection } from './course-section.entity';

export enum EnrollmentRole {
  STUDENT = 'student',
  TA = 'ta',
  OBSERVER = 'observer',
}

export enum EnrollmentStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  DROPPED = 'dropped',
  WITHDRAWN = 'withdrawn',
  WAITLISTED = 'waitlisted',
  REJECTED = 'rejected',
}

registerEnumType(EnrollmentRole, { name: 'EnrollmentRole' });
registerEnumType(EnrollmentStatus, { name: 'EnrollmentStatus' });

/**
 * DATA-001: Added tenantId for direct tenant filtering without joins.
 * WHY: Previously required joining section → course to get tenantId.
 */
@ObjectType()
@Entity('enrollments')
@Index(['tenantId'])
@Index(['userId'])
@Index(['sectionId'])
@Index(['userId', 'sectionId'], { unique: true })
@Index(['status'])
export class Enrollment extends TenantScopedEntity {
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
}
