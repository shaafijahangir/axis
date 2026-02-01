import { ObjectType, Field, Float, registerEnumType } from '@nestjs/graphql';

export enum TimelineEntryType {
  ASSIGNMENT = 'assignment',
  ANNOUNCEMENT = 'announcement',
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

  // ── Grade fields (populated for assignment entries when userId is provided) ──

  @Field(() => Float, { nullable: true })
  score?: number;

  @Field({ nullable: true })
  gradedAt?: Date;

  @Field({ nullable: true })
  feedback?: string;
}
