import { Entity, Column, Index } from 'typeorm';
import { ObjectType, Field, Float } from '@nestjs/graphql';
import { TenantScopedEntity } from './base.entity';

@ObjectType()
@Entity('courses')
@Index(['tenantId'])
export class Course extends TenantScopedEntity {
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
}
