import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ObjectType, Field, Int, registerEnumType } from '@nestjs/graphql';
import { TenantScopedEntity } from './base.entity';
import { CourseSection } from './course-section.entity';
import { User } from './user.entity';

export enum AnnouncementPriority {
  NORMAL = 'normal',
  URGENT = 'urgent',
}

export enum AnnouncementScope {
  SECTION = 'section',
  GRADE = 'grade',
  SCHOOL_WIDE = 'school_wide',
}

registerEnumType(AnnouncementPriority, { name: 'AnnouncementPriority' });
registerEnumType(AnnouncementScope, { name: 'AnnouncementScope' });

/**
 * DATA-001: Added tenantId for direct tenant filtering without joins.
 * Scope added for school-wide and per-grade announcements.
 */
@ObjectType()
@Entity('announcements')
@Index(['tenantId'])
@Index(['sectionId'])
@Index(['scope'])
@Index(['createdAt'])
export class Announcement extends TenantScopedEntity {
  @Field({ nullable: true })
  @Column({ nullable: true })
  sectionId: string;

  @Field(() => CourseSection, { nullable: true })
  @ManyToOne(() => CourseSection, { nullable: true })
  @JoinColumn({ name: 'sectionId' })
  section: CourseSection;

  @Field(() => AnnouncementScope)
  @Column({
    type: 'enum',
    enum: AnnouncementScope,
    default: AnnouncementScope.SECTION,
  })
  scope: AnnouncementScope;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  targetGrade: number;

  @Field()
  @Column()
  authorId: string;

  @Field(() => User)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Field()
  @Column()
  title: string;

  @Field()
  @Column({ type: 'text' })
  body: string;

  @Field(() => AnnouncementPriority)
  @Column({
    type: 'enum',
    enum: AnnouncementPriority,
    default: AnnouncementPriority.NORMAL,
  })
  priority: AnnouncementPriority;

  @Field()
  @Column({ default: false })
  pinned: boolean;
}
