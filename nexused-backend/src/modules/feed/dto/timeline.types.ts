import {
  ObjectType,
  Field,
  Float,
  Int,
  registerEnumType,
} from '@nestjs/graphql';

export enum TimelineEntryType {
  ASSIGNMENT = 'assignment',
  ANNOUNCEMENT = 'announcement',
  CONTENT = 'content',
  DISCUSSION = 'discussion',
}

registerEnumType(TimelineEntryType, { name: 'TimelineEntryType' });

@ObjectType()
export class TimelineEntry {
  @Field(() => TimelineEntryType)
  type: TimelineEntryType;

  @Field()
  id: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  body?: string;

  @Field({ nullable: true })
  authorName?: string;

  @Field({ nullable: true })
  assignmentType?: string;

  @Field(() => Float, { nullable: true })
  pointsPossible?: number;

  @Field({ nullable: true })
  dueAt?: Date;

  @Field({ nullable: true })
  priority?: string;

  @Field()
  pinned: boolean;

  @Field()
  timestamp: Date;

  // ── Content fields ──

  @Field({ nullable: true })
  publishedAt?: Date;

  // ── Grade fields (populated for assignment entries when userId is provided) ──

  @Field(() => Float, { nullable: true })
  score?: number;

  @Field({ nullable: true })
  gradedAt?: Date;

  @Field({ nullable: true })
  feedback?: string;

  // ── Discussion fields ──

  @Field(() => Int, { nullable: true })
  replyCount?: number;

  @Field({ nullable: true })
  isLocked?: boolean;

  @Field({ nullable: true })
  isAnswered?: boolean;
}
