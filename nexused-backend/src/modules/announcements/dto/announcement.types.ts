import { InputType, Field } from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { AnnouncementPriority } from '../../../database/entities/announcement.entity';

@InputType()
export class CreateAnnouncementInput {
  @Field()
  @IsUUID()
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
