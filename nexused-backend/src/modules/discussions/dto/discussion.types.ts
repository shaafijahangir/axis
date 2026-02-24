import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

@InputType()
export class CreateDiscussionInput {
  @Field()
  @IsUUID()
  sectionId: string;

  @Field()
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  title: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  body: string;
}

@InputType()
export class CreateDiscussionReplyInput {
  @Field()
  @IsUUID()
  discussionId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  body: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  parentReplyId?: string;
}

@InputType()
export class PaginationInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  page?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  limit?: number;
}
