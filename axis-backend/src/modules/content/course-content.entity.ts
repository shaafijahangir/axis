import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ObjectType, Field, Int } from '@nestjs/graphql';
import { TenantScopedEntity } from '../../database/entities/base.entity';
import { CourseSection } from '../../database/entities/course-section.entity';
import { User } from '../../database/entities/user.entity';

/**
 * WHY HTML storage: Tiptap outputs HTML natively. No custom serialization
 * layer needed. The viewer renders it directly with Tailwind prose styling.
 *
 * WHY publishedAt nullable: null means draft (not visible to students).
 * Setting it to a date publishes it. Simple state machine without an enum.
 *
 * WHY position field: Allows instructors to reorder content within the
 * timeline. Default 0 means chronological ordering by createdAt.
 */
@ObjectType()
@Entity('course_contents')
@Index(['sectionId'])
@Index(['tenantId'])
export class CourseContent extends TenantScopedEntity {
  @Field()
  @Column()
  sectionId: string;

  @ManyToOne(() => CourseSection)
  @JoinColumn({ name: 'sectionId' })
  section: CourseSection;

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

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date | null;

  @Field(() => Int)
  @Column({ type: 'int', default: 0 })
  position: number;
}
