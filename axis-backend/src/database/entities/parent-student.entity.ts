import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import { TenantScopedEntity } from './base.entity';
import { User } from './user.entity';

/**
 * SPRINT-3: How the parent account relates to the student. Defaults to
 * PARENT so existing link rows stay consistent after the migration.
 */
export enum ParentRelationship {
  PARENT = 'parent',
  GUARDIAN = 'guardian',
  OTHER = 'other',
}

registerEnumType(ParentRelationship, { name: 'ParentRelationship' });

@ObjectType()
@Entity('parent_students')
@Index(['tenantId'])
@Index(['parentId'])
@Index(['studentId'])
@Index(['parentId', 'studentId'], { unique: true })
export class ParentStudent extends TenantScopedEntity {
  @Field()
  @Column()
  parentId: string;

  @Field(() => User)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'parentId' })
  parent: User;

  @Field()
  @Column()
  studentId: string;

  @Field(() => User)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Field(() => ParentRelationship)
  @Column({
    type: 'enum',
    enum: ParentRelationship,
    default: ParentRelationship.PARENT,
  })
  relationship: ParentRelationship;
}
