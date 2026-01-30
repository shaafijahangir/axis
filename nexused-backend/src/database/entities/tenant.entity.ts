import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';

export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export enum BillingStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

registerEnumType(SubscriptionPlan, {
  name: 'SubscriptionPlan',
});

registerEnumType(BillingStatus, {
  name: 'BillingStatus',
});

@ObjectType()
@Entity('tenants')
export class Tenant {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ unique: true })
  name: string;

  @Field()
  @Column({ unique: true })
  domain: string;

  @Field()
  @Column({ unique: true })
  subdomain: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any>;

  @Field(() => SubscriptionPlan, { nullable: true })
  @Column({
    type: 'enum',
    enum: SubscriptionPlan,
    default: SubscriptionPlan.FREE,
  })
  subscriptionPlan: SubscriptionPlan;

  @Field(() => BillingStatus, { nullable: true })
  @Column({
    type: 'enum',
    enum: BillingStatus,
    default: BillingStatus.ACTIVE,
  })
  billingStatus: BillingStatus;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
