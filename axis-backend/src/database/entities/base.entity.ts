import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Column,
} from 'typeorm';
import { Field, ObjectType } from '@nestjs/graphql';

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

  // Use string reference to avoid circular import with Tenant entity
  @ManyToOne('Tenant')
  @JoinColumn({ name: 'tenantId' })
  tenant: any;
}

/**
 * ARCH-001 (extended): Base for append-only log entities.
 * WHY: Logs (Ai messages, usage logs, direct messages) are written once and
 * never updated, so they have `id` + `createdAt` but deliberately NO
 * `updatedAt`. They still duplicated those two columns; this removes that
 * duplication without forcing the meaningless `updatedAt` that BaseEntity
 * mandates. Extend this instead of BaseEntity for write-once records.
 */
@ObjectType({ isAbstract: true })
export abstract class LogEntity {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;
}

/**
 * Tenant-scoped variant of LogEntity (e.g. AiUsageLog): write-once, but
 * still belongs to a tenant and must be filtered by tenantId.
 */
@ObjectType({ isAbstract: true })
export abstract class TenantScopedLogEntity extends LogEntity {
  @Field()
  @Column()
  tenantId: string;

  @ManyToOne('Tenant')
  @JoinColumn({ name: 'tenantId' })
  tenant: any;
}
