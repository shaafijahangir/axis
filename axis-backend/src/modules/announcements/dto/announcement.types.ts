import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  AnnouncementPriority,
  AnnouncementScope,
} from '../../../database/entities/announcement.entity';

@InputType()
export class CreateAnnouncementInput {
  @Field({ nullable: true })
  @IsOptional()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  sectionId?: string;

  @Field(() => AnnouncementScope, { nullable: true })
  @IsOptional()
  @IsEnum(AnnouncementScope)
  scope?: AnnouncementScope;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(13)
  targetGrade?: number;

  @Field()
  @IsString()
  @MaxLength(255)
  title: string;

  @Field()
  @IsString()
  body: string;

  @Field(() => AnnouncementPriority, { nullable: true })
  @IsOptional()
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;
}
