import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Column,
} from 'typeorm';
import { Field, ObjectType } from '@nestjs/graphql';
import { Tenant } from './tenant.entity';

/**
 * ARCH-001: Base entity with common fields.
 * WHY: Eliminates duplication of id, createdAt, updatedAt across all entities.
 * PATTERN: Abstract class inheritance - TypeORM supports this natively.
 *
 * All entities should extend either BaseEntity or TenantScopedEntity.
 */
@ObjectType({ isAbstract: true })
export abstract class BaseEntity {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * ARCH-001: Base entity for tenant-scoped data.
 * WHY: Most entities belong to a tenant. This enforces the pattern.
 * PATTERN: Every query on tenant-scoped data MUST filter by tenantId.
 *
 * Entities that don't have a direct tenantId (e.g., CourseSection gets it
 * through Course, DirectMessage gets it through Conversation) should
 * extend BaseEntity instead.
 */
@ObjectType({ isAbstract: true })
export abstract class TenantScopedEntity extends BaseEntity {
  @Field()
  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}
