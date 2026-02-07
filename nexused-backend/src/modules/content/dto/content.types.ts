import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  MaxLength,
  Min,
} from 'class-validator';

@InputType()
export class CreateContentInput {
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
}

@InputType()
export class UpdateContentInput {
  @Field()
  @IsUUID()
  id: string;

  @Field()
  @IsUUID()
  sectionId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  body?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
