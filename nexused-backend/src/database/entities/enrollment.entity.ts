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
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import { Tenant } from './tenant.entity';
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
export class Enrollment {
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
