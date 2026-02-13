import { InputType, ObjectType, Field, Float, Int } from '@nestjs/graphql';
import { EngagementEventType } from '../entities/feed-engagement.entity';

@InputType()
export class RecordEngagementInput {
  @Field(() => EngagementEventType)
  eventType: EngagementEventType;

  @Field()
  feedItemType: string;

  @Field()
  feedItemId: string;

  @Field({ nullable: true })
  courseCode?: string;

  @Field({ nullable: true })
  sectionId?: string;

  @Field(() => Int, { nullable: true })
  dwellTimeMs?: number;
}

@InputType()
export class RecordEngagementBatchInput {
  @Field(() => [RecordEngagementInput])
  events: RecordEngagementInput[];
}

@ObjectType()
export class TopClickedType {
  @Field()
  type: string;

  @Field(() => Int)
  clicks: number;
}

@ObjectType()
export class FeedEngagementStats {
  @Field(() => Int)
  totalEvents: number;

  @Field(() => Int)
  totalClicks: number;

  @Field(() => Int)
  totalImpressions: number;

  @Field(() => Int)
  totalDismissals: number;

  @Field(() => Float)
  avgClickRate: number;

  @Field(() => [TopClickedType])
  topClickedTypes: TopClickedType[];
}
