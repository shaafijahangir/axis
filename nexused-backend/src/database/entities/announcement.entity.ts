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
import { CourseSection } from './course-section.entity';
import { User } from './user.entity';

export enum AnnouncementPriority {
  NORMAL = 'normal',
  URGENT = 'urgent',
}

registerEnumType(AnnouncementPriority, { name: 'AnnouncementPriority' });

/**
 * DATA-001: Added tenantId for direct tenant filtering without joins.
 * WHY: Previously required joining section → course to get tenantId.
 */
@ObjectType()
@Entity('announcements')
@Index(['tenantId'])
@Index(['sectionId'])
@Index(['createdAt'])
export class Announcement {
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

  @Field(() => CourseSection)
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

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
