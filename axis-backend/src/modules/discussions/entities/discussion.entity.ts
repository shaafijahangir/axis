import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field, Int } from '@nestjs/graphql';
import { TenantScopedEntity } from '../../../database/entities/base.entity';
import { User } from '../../../database/entities/user.entity';

@ObjectType()
@Entity('discussions')
@Index(['tenantId'])
@Index(['sectionId'])
@Index(['sectionId', 'createdAt'])
@Index(['authorId'])
export class Discussion extends TenantScopedEntity {
  @Field()
  @Column()
  sectionId: string;

  @Field()
  @Column()
  authorId: string;

  @Field()
  @Column()
  title: string;

  @Field()
  @Column({ type: 'text' })
  body: string;

  @Field()
  @Column({ default: false })
  isPinned: boolean;

  @Field()
  @Column({ default: false })
  isLocked: boolean;

  @Field()
  @Column({ default: false })
  isAnswered: boolean;

  @Field(() => Int)
  @Column({ default: 0 })
  replyCount: number;

  @Field(() => User)
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'authorId' })
  author: User;
}
