import { InputType, Field } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { AnnouncementPriority } from '../../../database/entities/announcement.entity';

@InputType()
export class CreateAnnouncementInput {
  @Field()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  sectionId: string;

  @Field()
  @IsString()
  @MaxLength(255)
  title: string;

  @Field()
  @IsString()
  body: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;
}
