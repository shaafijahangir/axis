import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field, Int, registerEnumType } from '@nestjs/graphql';
import { TenantScopedEntity } from './base.entity';

export enum UserRole {
  STUDENT = 'student',
  INSTRUCTOR = 'instructor',
  ADMIN = 'admin',
  PARENT = 'parent',
  TA = 'ta',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

registerEnumType(UserRole, { name: 'UserRole' });
registerEnumType(UserStatus, { name: 'UserStatus' });

/**
 * SEC-004: Database indexes for performance.
 * WHY: Without indexes, every query is a sequential scan.
 * DATA-002: Email unique per tenant, not globally.
 */
@ObjectType()
@Entity('users')
@Index(['tenantId'])
@Index(['email', 'tenantId'], { unique: true })
@Index(['gradeLevel'])
@Index(['homeroomTeacherId'])
export class User extends TenantScopedEntity {
  @Field()
  @Column()
  email: string;

  @Column({ nullable: true })
  passwordHash: string;

  @Field()
  @Column()
  firstName: string;

  @Field()
  @Column()
  lastName: string;

  @Field(() => [UserRole])
  @Column({
    type: 'enum',
    enum: UserRole,
    array: true,
    default: [UserRole.STUDENT],
  })
  roles: UserRole[];

  @Field(() => String, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  profile: Record<string, any>;

  @Field(() => String, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  preferences: Record<string, any>;

  @Field(() => UserStatus)
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Field({ nullable: true })
  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  googleId: string;

  @Column({ nullable: true, select: false })
  resetToken: string;

  @Column({ type: 'timestamptz', nullable: true, select: false })
  resetTokenExpiry: Date;

  /**
   * SPRINT-3: K-12 grade level (1–12). Null for non-student users.
   * Used by grade-targeted announcements and admin reporting.
   */
  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  gradeLevel: number | null;

  /**
   * SPRINT-3: Homeroom teacher (INSTRUCTOR role in the same tenant).
   * Null for non-student users. Set to null when the teacher leaves —
   * no FK cascade to avoid breaking historical records.
   */
  @Field(() => String, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  homeroomTeacherId: string | null;

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'homeroomTeacherId' })
  homeroomTeacher: User | null;
}
