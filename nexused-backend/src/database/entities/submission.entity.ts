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
import { ObjectType, Field, Float, Int } from '@nestjs/graphql';
import { Tenant } from './tenant.entity';
import { Assignment } from './assignment.entity';
import { User } from './user.entity';

/**
 * DATA-001: Added tenantId for direct tenant filtering without joins.
 * WHY: Previously required joining assignment → section → course to get tenantId.
 */
@ObjectType()
@Entity('submissions')
@Index(['tenantId'])
@Index(['assignmentId'])
@Index(['userId'])
@Index(['assignmentId', 'userId'])
export class Submission {
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
  assignmentId: string;

  @ManyToOne(() => Assignment)
  @JoinColumn({ name: 'assignmentId' })
  assignment: Assignment;

  @Field()
  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Field(() => Int)
  @Column({ type: 'int', default: 1 })
  attempt: number;

  @Field(() => String, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  content: Record<string, any>;

  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  score: number;

  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  gradedAt: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  gradedBy: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  feedback: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
