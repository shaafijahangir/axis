import { Entity, Column, Index } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { TenantScopedEntity } from './base.entity';

@ObjectType()
@Entity('academic_terms')
@Index(['tenantId'])
@Index(['tenantId', 'isCurrent'])
export class AcademicTerm extends TenantScopedEntity {
  @Field()
  @Column()
  name: string;

  @Field()
  @Column({ type: 'date' })
  startDate: Date;

  @Field()
  @Column({ type: 'date' })
  endDate: Date;

  @Field()
  @Column({ default: false })
  isCurrent: boolean;

  @Field(() => String, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any>;
}
