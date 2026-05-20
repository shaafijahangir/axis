import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import { TenantScopedEntity } from './base.entity';
import { User } from './user.entity';
import { CourseSection } from './course-section.entity';

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
}

registerEnumType(AttendanceStatus, { name: 'AttendanceStatus' });

@ObjectType()
@Entity('attendance')
@Index(['tenantId'])
@Index(['sectionId', 'date'])
@Index(['userId', 'tenantId'])
@Index(['sectionId', 'userId', 'date'], { unique: true })
export class Attendance extends TenantScopedEntity {
  @Field()
  @Column()
  sectionId: string;

  @ManyToOne(() => CourseSection)
  @JoinColumn({ name: 'sectionId' })
  section: CourseSection;

  @Field()
  @Column()
  userId: string;

  @Field(() => User)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Field()
  @Column({ type: 'date' })
  date: string;

  @Field(() => AttendanceStatus)
  @Column({ type: 'enum', enum: AttendanceStatus })
  status: AttendanceStatus;

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  notes: string | null;
}
