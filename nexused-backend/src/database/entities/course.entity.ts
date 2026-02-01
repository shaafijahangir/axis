import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ObjectType, Field, Float } from '@nestjs/graphql';
import { Tenant } from './tenant.entity';

@ObjectType()
@Entity('courses')
export class Course {
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
  code: string;

  @Field()
  @Column()
  title: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  description: string;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  credits: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  departmentId: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  prerequisites: Record<string, any>;

  @Field(() => String, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any>;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
