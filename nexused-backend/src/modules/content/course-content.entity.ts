import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ObjectType, Field, Int } from '@nestjs/graphql';
import { CourseSection } from '../../database/entities/course-section.entity';
import { User } from '../../database/entities/user.entity';
import { Tenant } from '../../database/entities/tenant.entity';

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
export class CourseContent {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  sectionId: string;

  @ManyToOne(() => CourseSection)
  @JoinColumn({ name: 'sectionId' })
  section: CourseSection;

  @Field()
  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

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

  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date | null;

  @Field(() => Int)
  @Column({ type: 'int', default: 0 })
  position: number;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
