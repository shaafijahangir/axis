import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { TenantScopedEntity } from './base.entity';
import { User } from './user.entity';

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
}
