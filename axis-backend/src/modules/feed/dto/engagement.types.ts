import { InputType, ObjectType, Field, Float, Int } from '@nestjs/graphql';
import {
  IsEnum,
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EngagementEventType } from '../entities/feed-engagement.entity';

@InputType()
export class RecordEngagementInput {
  @Field(() => EngagementEventType)
  @IsEnum(EngagementEventType)
  eventType: EngagementEventType;

  @Field()
  @IsString()
  feedItemType: string;

  @Field()
  @IsString()
  feedItemId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  courseCode?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sectionId?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  dwellTimeMs?: number;
}

@InputType()
export class RecordEngagementBatchInput {
  @Field(() => [RecordEngagementInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecordEngagementInput)
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
